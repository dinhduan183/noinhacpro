import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'

// Fix __dirname for CJS context (vite-plugin-electron compiles to CJS)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const __dirname: string = (() => {
  try {
    // ESM: use import.meta.url if available
    return path.dirname(new URL((import.meta as any).url).pathname)
  } catch {
    // CJS fallback
    return path.dirname(__filename)
  }
})()

// Set ffmpeg path (replace app.asar for packaged app)
const resolvedFfmpegPath = ffmpegPath.path.includes('app.asar')
  ? ffmpegPath.path.replace('app.asar', 'app.asar.unpacked')
  : ffmpegPath.path
ffmpeg.setFfmpegPath(resolvedFfmpegPath)

// The built directory structure
process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Nối nhạc Pro',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

// IPC Handlers

ipcMain.handle('dialog:openDirectory', async () => {
  if (!win) return null
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  })
  if (canceled) {
    return null
  } else {
    return filePaths[0]
  }
})

ipcMain.handle('fs:readMp3Files', async (_, dirPath: string) => {
  try {
    const files = fs.readdirSync(dirPath)
    const mp3Names = files.filter(f => f.toLowerCase().endsWith('.mp3'))
    // Lấy duration song song cho tất cả file
    const mp3Files = await Promise.all(
      mp3Names.map(async (f) => {
        const filePath = path.join(dirPath, f)
        const duration = await getAudioDuration(filePath)
        return { name: f, path: filePath, duration }
      })
    )
    return mp3Files
  } catch (error) {
    console.error('Lỗi khi đọc thư mục: ', error)
    return []
  }
})

// TODO: Thêm hàm xử lý FFmpeg (mergeAudio) sau.
// Helper: lấy duration (giây) của 1 file MP3 via ffprobe
function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err || !metadata?.format?.duration) {
        resolve(0) // fallback nếu lỗi
      } else {
        resolve(metadata.format.duration)
      }
    })
  })
}

// Helper: chuyển giây sang định dạng HH:MM:SS
function secondsToTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ].join(':')
}

ipcMain.handle('dialog:saveFile', async (_, defaultPath: string) => {
  if (!win) return null
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath,
    filters: [{ name: 'MP3 Audio', extensions: ['mp3'] }]
  })
  if (canceled) {
    return null
  }
  return filePath
})

ipcMain.handle('ffmpeg:mergeAudio', async (event, { files, fileNames, savePath }: { files: string[], fileNames: string[], savePath: string }) => {
  // 1. Lấy duration từng file (song song để nhanh)
  const durations = await Promise.all(files.map(f => getAudioDuration(f)))

  // 2. Tính timestamp tích lũy và tạo tracklist content
  let cumulative = 0
  const tracklistLines: string[] = []
  for (let i = 0; i < files.length; i++) {
    const ts = secondsToTimestamp(cumulative)
    // Bỏ phần mở rộng .mp3 khỏi tên bài
    const name = (fileNames[i] || path.basename(files[i])).replace(/\.mp3$/i, '')
    tracklistLines.push(`${ts} ${name}`)
    cumulative += durations[i]
  }
  const tracklistContent = tracklistLines.join('\n')

  // 3. Gộp file MP3 bằng filter_complex concat (hỗ trợ codec/sample rate khác nhau)
  await new Promise<void>((resolve, reject) => {
    const command = ffmpeg()
    files.forEach(file => command.input(file))

    // Tạo filter_complex: [0:a][1:a]...[n:a]concat=n=X:v=0:a=1[out]
    const inputLabels = files.map((_, i) => `[${i}:a]`).join('')
    const filterComplex = `${inputLabels}concat=n=${files.length}:v=0:a=1[out]`

    command
      .outputOptions([
        '-filter_complex', filterComplex,
        '-map', '[out]',
        '-acodec', 'libmp3lame',
        '-q:a', '2',           // VBR ~190kbps - chất lượng cao
      ])
      .output(savePath)
      .on('error', (err) => {
        console.error('FFmpeg error:', err)
        reject(err)
      })
      .on('progress', (progress) => {
        if (win) {
          const percent = Math.min(Math.round(progress.percent ?? 0), 99)
          win.webContents.send('ffmpeg:progress', percent)
        }
      })
      .on('end', () => {
        if (win) win.webContents.send('ffmpeg:progress', 100)
        resolve()
      })
      .run()
  })

  // 4. Ghi file tracklist .txt cạnh file MP3
  const tracklistPath = savePath.replace(/\.mp3$/i, '_tracklist.txt')
  fs.writeFileSync(tracklistPath, tracklistContent, 'utf-8')

  return { savePath, tracklistPath }
})

