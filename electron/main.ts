import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import ffmpeg from 'fluent-ffmpeg'

// Fix __dirname for CJS/ESM context - works correctly on both Windows and macOS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const __dirname: string = (() => {
  try {
    // ESM: use import.meta.url with fileURLToPath (handles paths correctly)
    return path.dirname(fileURLToPath((import.meta as any).url))
  } catch {
    // CJS fallback
    return path.dirname(__filename)
  }
})()

// Dynamic FFMpeg path depending on environment
// Priority: bin/ folder (production or manual placement) → @ffmpeg-installer fallback (dev on Mac)
const binPath = app.isPackaged 
  ? path.join(process.resourcesPath, 'bin') // Khi đã Packaged -> trượt ra ngoài resources/bin
  : path.join(process.cwd(), 'bin');        // Khi đang Dev -> đọc từ mục bin ở gốc project

const ffmpegBinary = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
const ffprobeBinary = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
const ffmpegInBin = path.join(binPath, ffmpegBinary);
const ffprobeInBin = path.join(binPath, ffprobeBinary);

// ── FFMPEG ──
let ffmpegExecutable: string;
if (fs.existsSync(ffmpegInBin)) {
  ffmpegExecutable = ffmpegInBin;
} else {
  // Bỏ qua Vite bundler bằng require qua một biến chuỗi
  const reqPath = '@ffmpeg-installer/ffmpeg';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffmpegInstaller = require(reqPath);
  ffmpegExecutable = ffmpegInstaller.path.includes('app.asar')
    ? ffmpegInstaller.path.replace('app.asar', 'app.asar.unpacked')
    : ffmpegInstaller.path;
}
ffmpeg.setFfmpegPath(ffmpegExecutable);

// ── FFPROBE ──
let ffprobeExecutable: string;
if (fs.existsSync(ffprobeInBin)) {
  ffprobeExecutable = ffprobeInBin;
} else {
  // Bỏ qua Vite bundler
  const reqPath = '@ffprobe-installer/ffprobe';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffprobeInstaller = require(reqPath);
  ffprobeExecutable = ffprobeInstaller.path.includes('app.asar')
    ? ffprobeInstaller.path.replace('app.asar', 'app.asar.unpacked')
    : ffprobeInstaller.path;
}
ffmpeg.setFfprobePath(ffprobeExecutable);


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
    autoHideMenuBar: true, // Tự động ẩn Menu Bar
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
    // Lấy metadata song song cho tất cả file
    const mp3Files = await Promise.all(
      mp3Names.map(async (f) => {
        const filePath = path.join(dirPath, f)
        const meta = await getAudioMetadata(filePath)
        return { name: f, path: filePath, ...meta }
      })
    )
    return mp3Files
  } catch (error) {
    console.error('Lỗi khi đọc thư mục: ', error)
    return []
  }
})

// Helper: lấy metadata (duration, bitrate, sampleRate) của 1 file MP3 via ffprobe
function getAudioMetadata(filePath: string): Promise<{ duration: number; bitrate: number; sampleRate: number }> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err || !metadata) {
        resolve({ duration: 0, bitrate: 0, sampleRate: 0 })
      } else {
        const duration = metadata.format?.duration ?? 0
        const bitrate = Math.round((metadata.format?.bit_rate ?? 0) / 1000) // kbps
        const sampleRate = metadata.streams?.[0]?.sample_rate ?? 0           // Hz
        resolve({ duration, bitrate, sampleRate })
      }
    })
  })
}

// Helper: getAudioDuration (dùng nội bộ để tính tracklist khi merge)
function getAudioDuration(filePath: string): Promise<number> {
  return getAudioMetadata(filePath).then(m => m.duration)
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

ipcMain.handle('ffmpeg:mergeAudio', async (event, { files, fileNames, savePath, mergeMode = 'copy' }: { files: string[], fileNames: string[], savePath: string, mergeMode: 'copy' | 'convert' }) => {
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

  // 3. Ghi file list cho FFmpeg Concat Demuxer
  const totalSecs = durations.reduce((sum, d) => sum + d, 0); // tổng duration để tính %
  
  const tempConcatFile = path.join(app.getPath('temp'), `concat_list_${Date.now()}.txt`);
  // Chuẩn hóa path cho FFmpeg (thoát ký tự nháy đơn)
  const concatLines = files.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(tempConcatFile, concatLines, 'utf-8');

  // Helper: parse timemark "HH:MM:SS.xx" → giây
  const parseTimemark = (timemark: string): number => {
    const parts = timemark.split(':')
    if (parts.length !== 3) return 0
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2])
  }

  await new Promise<void>((resolve, reject) => {
    const command = ffmpeg()
      .input(tempConcatFile)
      .inputOptions(['-f concat', '-safe 0']);

    if (mergeMode === 'copy') {
      command.outputOptions(['-c copy']);
    } else {
      command.outputOptions([
        '-acodec libmp3lame',
        '-q:a 2', // VBR ~190kbps
      ]);
    }

    command
      .output(savePath)
      .on('error', (err) => {
        console.error('FFmpeg error:', err)
        reject(err)
      })
      .on('progress', (progress) => {
        if (win && totalSecs > 0 && progress.timemark) {
          const processed = parseTimemark(progress.timemark)
          const percent = Math.min(Math.round((processed / totalSecs) * 100), 99)
          win.webContents.send('ffmpeg:progress', percent)
        }
      })
      .on('end', () => {
        if (win) win.webContents.send('ffmpeg:progress', 100)
        resolve()
      })
      .run()
  })

  // Xóa file tạm
  try {
    fs.unlinkSync(tempConcatFile);
  } catch (error) {
    console.warn('Không thể xóa file tạm: ', error);
  }

  // 4. Ghi file tracklist .txt cạnh file MP3
  const tracklistPath = savePath.replace(/\.mp3$/i, '_tracklist.txt')
  fs.writeFileSync(tracklistPath, tracklistContent, 'utf-8')

  return { savePath, tracklistPath }
})

ipcMain.handle('shell:showInFolder', (_, filePath: string) => {
  shell.showItemInFolder(filePath)
})
