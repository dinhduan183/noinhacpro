import { useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Music, Settings2, PlayCircle, Loader2 } from 'lucide-react';
import { DirectoryPanel } from './components/DirectoryPanel';
import { TracklistPanel, computeTracklist } from './components/TracklistPanel';
import { Notification } from './components/Notification';
import type { PanelState } from './types';

function App() {
  const [panels, setPanels] = useState<PanelState[]>([
    { id: 1, dirPath: null, files: [], originalFiles: [], selectedCount: 0 },
    { id: 2, dirPath: null, files: [], originalFiles: [], selectedCount: 0 },
    { id: 3, dirPath: null, files: [], originalFiles: [], selectedCount: 0 },
  ]);

  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const [audioItem, setAudioItem] = useState<HTMLAudioElement | null>(null);

  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    detail?: string;
  } | null>(null);

  // Computed: flat list of selected files across all panels in order
  const selectedFiles = panels.flatMap(p => p.files.slice(0, p.selectedCount));
  const { tracks, totalDuration } = computeTracklist(selectedFiles);

  // Play/Pause audio preview
  const handlePlayToggle = (path: string) => {
    if (playingPath === path) {
      audioItem?.pause();
      setPlayingPath(null);
    } else {
      audioItem?.pause();
      const newAudio = new Audio('file://' + path);
      newAudio.play();
      newAudio.onended = () => setPlayingPath(null);
      setAudioItem(newAudio);
      setPlayingPath(path);
    }
  };

  // IPC Calls to Electron Main
  const handleSelectDirectory = async (panelId: number) => {
    try {
      // @ts-ignore
      const dirPath = await window.ipcRenderer.openDirectory();
      if (dirPath) {
        // @ts-ignore
        const mp3Files = await window.ipcRenderer.readMp3Files(dirPath);

        // Add random id for DnD to work correctly
        const filesWithId = mp3Files.map((f: any) => ({
          ...f,
          id: `panel${panelId}-${Math.random().toString(36).substr(2, 9)}`,
        }));

        setPanels(prev => prev.map(p =>
          p.id === panelId
            ? { ...p, dirPath, files: filesWithId, originalFiles: [...filesWithId], selectedCount: filesWithId.length }
            : p
        ));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCountChange = (panelId: number, count: number) => {
    setPanels(prev => prev.map(p => {
      if (p.id === panelId) {
        const max = p.files.length;
        return { ...p, selectedCount: Math.min(Math.max(0, count), max) };
      }
      return p;
    }));
  };

  const handleRandomize = (panelId: number) => {
    setPanels(prev => prev.map(p => {
      if (p.id === panelId) {
        const shuffled = [...p.files].sort(() => Math.random() - 0.5);
        return { ...p, files: shuffled };
      }
      return p;
    }));
  };

  const handleReset = (panelId: number) => {
    setPanels(prev => prev.map(p => {
      if (p.id === panelId) {
        return {
          ...p,
          files: [...p.originalFiles],
          selectedCount: p.originalFiles.length
        };
      }
      return p;
    }));
  };

  const handleRemoveFile = (panelId: number, fileId: string) => {
    setPanels(prev => prev.map(p => {
      if (p.id === panelId) {
        const filtered = p.files.filter(f => f.id !== fileId);
        const newCount = Math.min(p.selectedCount, filtered.length);
        return { ...p, files: filtered, selectedCount: newCount };
      }
      return p;
    }));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const panelId = parseInt(result.source.droppableId.split('-')[1]);
    setPanels(prev => prev.map(p => {
      if (p.id === panelId) {
        const newFiles = Array.from(p.files);
        const [reorderedItem] = newFiles.splice(result.source.index, 1);
        newFiles.splice(result.destination!.index, 0, reorderedItem);
        return { ...p, files: newFiles };
      }
      return p;
    }));
  };

  const handleMerge = async () => {
    if (selectedFiles.length === 0) return;

    const orderedFiles = selectedFiles.map(f => f.path);
    const orderedNames = selectedFiles.map(f => f.name);

    try {
      // @ts-ignore
      const savePath = await window.ipcRenderer.saveFile('thanh_pham.mp3');
      if (!savePath) return;

      setIsMerging(true);
      setProgress(0);

      // @ts-ignore
      window.ipcRenderer.onProgress((p: number) => setProgress(Math.round(p)));

      // @ts-ignore
      const result = await window.ipcRenderer.mergeAudio({ files: orderedFiles, fileNames: orderedNames, savePath });

      setNotification({
        type: 'success',
        message: 'Gộp file MP3 thành công!',
        detail: `File MP3:       ${result.savePath}\nFile Tracklist: ${result.tracklistPath}`,
      });
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: 'Gộp file thất bại — FFmpeg báo lỗi:',
        detail: error.message,
      });
    } finally {
      setIsMerging(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 2000);
      // @ts-ignore
      window.ipcRenderer.offProgress();
    }
  };

  const totalSongs = selectedFiles.length;
  const hasSelection = totalSongs > 0;

  return (
    <div className="h-screen flex flex-col pt-4 bg-[#0f172a] text-slate-50 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="px-6 pb-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3 interactive">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Music size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Nối Nhạc Pro
            </h1>
            <p className="text-xs text-slate-400 font-medium">Trình gộp MP3 thông minh</p>
          </div>
        </div>
        <button className="interactive p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
          <Settings2 size={20} />
        </button>
      </header>

      {/* Main 3 Columns */}
      <main className="flex-1 grid grid-cols-3 gap-4 p-6 min-h-0">
        <DragDropContext onDragEnd={onDragEnd}>
          {panels.map(panel => (
            <DirectoryPanel
              key={panel.id}
              panel={panel}
              onSelectDirectory={handleSelectDirectory}
              onCountChange={handleCountChange}
              onRandomize={handleRandomize}
              onReset={handleReset}
              onRemoveFile={handleRemoveFile}
              playingPath={playingPath}
              onPlayToggle={handlePlayToggle}
            />
          ))}
        </DragDropContext>
      </main>

      {/* Realtime Tracklist Panel */}
      {hasSelection && (
        <TracklistPanel
          tracks={tracks}
          totalDuration={totalDuration}
          totalSongs={totalSongs}
        />
      )}

      {/* In-app Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          detail={notification.detail}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Footer Controls */}
      <footer className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-slate-300">
            Tổng bài hát:{' '}
            <span className="text-indigo-400 font-bold">{totalSongs}</span>
            {hasSelection && (
              <>
                {' '}·{' '}
                <span className="text-emerald-400 font-bold font-mono">{totalDuration}</span>
              </>
            )}
          </p>
          <p className="text-xs text-slate-500">
            Thứ tự kết hợp: Cửa sổ 1 ➔ Cửa sổ 2 ➔ Cửa sổ 3
          </p>
        </div>

        <div className="flex items-center gap-4">
          {isMerging && (
            <div className="flex items-center gap-3">
              <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-mono text-indigo-400 w-10">{progress}%</span>
            </div>
          )}

          <button
            onClick={handleMerge}
            disabled={isMerging || !hasSelection}
            className={`interactive flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg text-white
              ${isMerging || !hasSelection
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5'
              }`}
          >
            {isMerging ? (
              <><Loader2 size={20} className="animate-spin" /> Đang Xử Lý...</>
            ) : (
              <><PlayCircle size={20} /> Bắt Đầu</>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
