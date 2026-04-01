import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Music, PlayCircle, Loader2, FolderPlus, Zap, Settings2 } from 'lucide-react';
import { DirectoryPanel } from './components/DirectoryPanel';
import { TracklistPanel, computeTracklist } from './components/TracklistPanel';
import { Notification } from './components/Notification';
import type { PanelState, MergedEntry } from './types';

function App() {
  const [nextId, setNextId] = useState(4);
  const [panels, setPanels] = useState<PanelState[]>([
    { id: 1, dirPath: null, files: [], originalFiles: [], selectedCount: 0 },
    { id: 2, dirPath: null, files: [], originalFiles: [], selectedCount: 0 },
    { id: 3, dirPath: null, files: [], originalFiles: [], selectedCount: 0 },
  ]);

  // Flat reorderable list — the single source of truth for what gets merged
  const [mergedList, setMergedList] = useState<MergedEntry[]>([]);

  const [mergeMode, setMergeMode] = useState<'copy' | 'convert'>('copy');
  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    detail?: string;
    savePath?: string;
  } | null>(null);

  const { totalDuration } = computeTracklist(mergedList);
  const totalSongs = mergedList.length;
  const hasSelection = totalSongs > 0;

  // Count active entries per panel (derived from mergedList)
  const activeCounts = new Map<number, number>();
  mergedList.forEach(e => activeCounts.set(e.panelId, (activeCounts.get(e.panelId) ?? 0) + 1));

  // ── Select directory ──
  const handleSelectDirectory = async (panelId: number) => {
    try {
      const dirPath = await window.ipcRenderer.openDirectory();
      if (!dirPath) return;
      const mp3Files = await window.ipcRenderer.readMp3Files(dirPath);

      const filesWithId = mp3Files.map((f) => ({
        ...f,
        id: `p${panelId}-${Math.random().toString(36).substr(2, 9)}`,
      }));

      setPanels(prev => prev.map(p =>
        p.id === panelId
          ? { ...p, dirPath, files: filesWithId, originalFiles: [...filesWithId], selectedCount: filesWithId.length }
          : p
      ));

      // Replace all entries for this panel with new files, appended at end
      const newEntries: MergedEntry[] = filesWithId.map((f: any) => ({
        fileId: f.id,
        name: f.name,
        path: f.path,
        duration: f.duration,
        bitrate: f.bitrate,
        sampleRate: f.sampleRate,
        panelId,
      }));
      setMergedList(prev => [...prev.filter(e => e.panelId !== panelId), ...newEntries]);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Count change — smart sync: keep existing positions, add/remove from tail ──


  // ── Randomize single panel (from sidebar) ──
  const handleRandomize = (panelId: number) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    const shuffled = [...panel.files].sort(() => Math.random() - 0.5);
    const shuffledIds = shuffled.slice(0, panel.selectedCount).map(f => f.id);
    const newPosMap = new Map(shuffledIds.map((id, i) => [id, i]));

    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, files: shuffled } : p));

    // Reorder this panel's entries IN-PLACE — keep all other entries at their positions
    setMergedList(prev => {
      // Collect index positions where this panel's entries sit
      const positions: number[] = [];
      prev.forEach((e, i) => { if (e.panelId === panelId) positions.push(i); });

      // Sort this panel's entries by new shuffle order
      const panelEntries = prev.filter(e => e.panelId === panelId);
      const sortedPanel = [...panelEntries].sort((a, b) =>
        (newPosMap.get(a.fileId) ?? 999) - (newPosMap.get(b.fileId) ?? 999)
      );

      // Write sorted entries back into the SAME positions — nothing else moves
      const result = [...prev];
      positions.forEach((pos, i) => {
        if (sortedPanel[i]) result[pos] = sortedPanel[i];
      });
      return result;
    });
  };

  // ── Reset single panel ──
  const handleReset = (panelId: number) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    const restored = [...panel.originalFiles];
    const newEntries: MergedEntry[] = restored.map(f => ({
      fileId: f.id, name: f.name, path: f.path, duration: f.duration, bitrate: f.bitrate, sampleRate: f.sampleRate, panelId,
    }));
    setPanels(prev => prev.map(p =>
      p.id === panelId ? { ...p, files: restored, selectedCount: restored.length } : p
    ));
    setMergedList(prev => [...prev.filter(e => e.panelId !== panelId), ...newEntries]);
  };

  // ── Add / Remove panels ──
  const handleAddPanel = () => {
    setPanels(prev => [...prev, { id: nextId, dirPath: null, files: [], originalFiles: [], selectedCount: 0 }]);
    setNextId(prev => prev + 1);
  };

  const handleRemovePanel = (panelId: number) => {
    if (panels.length <= 1) return;
    setPanels(prev => prev.filter(p => p.id !== panelId));
    setMergedList(prev => prev.filter(e => e.panelId !== panelId));
  };

  const handleDuplicatePanel = (panelId: number) => {
    const src = panels.find(p => p.id === panelId);
    if (!src || !src.dirPath) return;

    const newId = nextId;
    const prefix = `p${newId}-`;

    // Build old->new fileId mapping
    const idMap = new Map<string, string>();
    src.files.forEach(f => {
      idMap.set(f.id, prefix + Math.random().toString(36).substr(2, 9));
    });

    // Clone files with new IDs
    const newFiles = src.files.map(f => ({ ...f, id: idMap.get(f.id)! }));
    const newOriginals = src.originalFiles.map(f => ({
      ...f,
      id: idMap.get(f.id) ?? prefix + Math.random().toString(36).substr(2, 9),
    }));

    // Clone only the entries currently in mergedList for this panel
    const srcEntries = mergedList.filter(e => e.panelId === panelId);
    const newEntries: MergedEntry[] = srcEntries
      .filter(e => idMap.has(e.fileId))
      .map(e => ({ ...e, fileId: idMap.get(e.fileId)!, panelId: newId }));

    setPanels(prev => [...prev, {
      id: newId,
      dirPath: src.dirPath,
      files: newFiles,
      originalFiles: newOriginals,
      selectedCount: newEntries.length,
    }]);
    setMergedList(prev => [...prev, ...newEntries]);
    setNextId(prev => prev + 1);
  };

  const handlePanelReorder = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const from = result.source.index;
    const to = result.destination.index;

    // Compute new panels order
    const newPanels = [...panels];
    const [moved] = newPanels.splice(from, 1);
    newPanels.splice(to, 0, moved);
    const newOrder = newPanels.map(p => p.id);

    setPanels(newPanels);

    // Regroup mergedList to match new panel order (preserving per-panel internal order)
    setMergedList(prev => {
      const groups = new Map<number, MergedEntry[]>();
      newOrder.forEach(id => groups.set(id, []));
      prev.forEach(e => {
        const g = groups.get(e.panelId);
        if (g) g.push(e); else groups.set(e.panelId, [e]);
      });
      const reordered: MergedEntry[] = [];
      newOrder.forEach(id => reordered.push(...(groups.get(id) ?? [])));
      return reordered;
    });
  };

  // ── Tracklist operations ──
  const handleReorder = (from: number, to: number) => {
    setMergedList(prev => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const handleRemoveEntry = (fileId: string) => {
    setMergedList(prev => prev.filter(e => e.fileId !== fileId));
  };

  const handleRandomizeAll = () => {
    setMergedList(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const handleRandomizeByFolder = () => {
    const panelOrder = panels.map(p => p.id);
    const groups = new Map<number, MergedEntry[]>();
    panelOrder.forEach(id => groups.set(id, []));
    mergedList.forEach(e => {
      const g = groups.get(e.panelId);
      if (g) g.push(e); else groups.set(e.panelId, [e]);
    });
    const result: MergedEntry[] = [];
    panelOrder.forEach(id => {
      const g = groups.get(id) ?? [];
      result.push(...g.sort(() => Math.random() - 0.5));
    });
    setMergedList(result);
  };

  const handleResetAll = () => {
    const newList: MergedEntry[] = [];
    panels.forEach(p => {
      p.originalFiles.forEach(f => {
        newList.push({ fileId: f.id, name: f.name, path: f.path, duration: f.duration, bitrate: f.bitrate, sampleRate: f.sampleRate, panelId: p.id });
      });
    });
    setMergedList(newList);
    setPanels(prev => prev.map(p => ({ ...p, files: [...p.originalFiles], selectedCount: p.originalFiles.length })));
  };

  // ── Merge ──
  const handleMerge = async () => {
    if (mergedList.length === 0) return;
    try {
      const savePath = await window.ipcRenderer.saveFile('thanh_pham.mp3');
      if (!savePath) return;

      setIsMerging(true);
      setProgress(0);

      window.ipcRenderer.onProgress((p: number) => setProgress(Math.round(p)));

      const orderedFiles = mergedList.map(e => e.path);
      const orderedNames = mergedList.map(e => e.name);

      const result = await window.ipcRenderer.mergeAudio({ 
        files: orderedFiles, 
        fileNames: orderedNames, 
        savePath,
        mergeMode 
      });

      setNotification({
        type: 'success',
        message: 'Gộp file MP3 thành công!',
        detail: `File MP3:       ${result.savePath}\nFile Tracklist: ${result.tracklistPath}`,
        savePath: result.savePath,
      });
    } catch (error: any) {
      setNotification({ type: 'error', message: 'Gộp file thất bại — FFmpeg báo lỗi:', detail: error.message });
    } finally {
      setIsMerging(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 2000);
      window.ipcRenderer.offProgress();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0f172a] text-slate-50 overflow-hidden font-sans">

      {/* ── Header ── */}
      <header className="shrink-0 px-5 pt-4 pb-3 flex items-center gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3 interactive shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Music size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Nối Nhạc Pro
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Trình gộp MP3 thông minh</p>
            <p className="text-[10px] text-slate-600 select-none">© {new Date().getFullYear()} Đình Duẩn · NEXTGEN MEDIA</p>
          </div>
        </div>

        {/* Notification — shows inline, right-aligned */}
        <div className="flex-1 flex justify-end">
          {notification && (
            <Notification
              type={notification.type}
              message={notification.message}
              detail={notification.detail}
              savePath={notification.savePath}
              onClose={() => setNotification(null)}
            />
          )}
        </div>
      </header>

      {/* ── Body: Sidebar + Tracklist ── */}
      <div className="flex-1 flex min-h-0">

        {/* Sidebar — compact panel cards */}
        <aside className="w-80 shrink-0 flex flex-col border-r border-slate-800 bg-slate-900/50">
          <div className="px-3 pt-3 pb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Thư mục ({panels.length})
            </p>
          </div>
          <DragDropContext onDragEnd={handlePanelReorder}>
            <Droppable droppableId="sidebar-panels">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-1 overflow-y-auto px-3 pb-2 space-y-2 interactive"
                >
                  {panels.map((panel, index) => (
                    <Draggable key={panel.id} draggableId={`sidebar-${panel.id}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <DirectoryPanel
                            panel={panel}
                            activeCount={activeCounts.get(panel.id) ?? 0}
                            canRemove={panels.length > 1}
                            isDragging={snapshot.isDragging}
                            dragHandleProps={provided.dragHandleProps}
                            onSelectDirectory={handleSelectDirectory}
                            onDuplicate={handleDuplicatePanel}
                            onRandomize={handleRandomize}
                            onReset={handleReset}
                            onRemovePanel={handleRemovePanel}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <div className="shrink-0 px-3 pb-3 pt-1">
            <button
              onClick={handleAddPanel}
              className="interactive w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium border border-dashed border-slate-600 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all"
            >
              <FolderPlus size={14} />
              Thêm thư mục
            </button>
          </div>
        </aside>

        {/* Main — Tracklist */}
        <main className="flex-1 min-w-0 flex flex-col">
          <TracklistPanel
            entries={mergedList}
            panels={panels}
            onReorder={handleReorder}
            onRemoveEntry={handleRemoveEntry}
            onRandomizeAll={handleRandomizeAll}
            onRandomizeByFolder={handleRandomizeByFolder}
            onResetAll={handleResetAll}
          />
        </main>
      </div>

      {/* ── Notification ── */}

      {/* ── Footer ── */}
      <footer className="shrink-0 px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-slate-300">
            Tổng bài hát: <span className="text-indigo-400 font-bold">{totalSongs}</span>
          </p>
          {hasSelection ? (
            <p className="text-[11px] text-slate-400">
              Tổng thời lượng: <span className="text-emerald-400 font-mono font-semibold">{totalDuration}</span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-600">Chọn thư mục MP3 để bắt đầu</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
            <button
              onClick={() => setMergeMode('copy')}
              disabled={isMerging}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mergeMode === 'copy' 
                  ? 'bg-indigo-500 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              } ${isMerging ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Sử dụng '-c copy'. Tốc độ cực nhanh, nhưng yêu cầu tất cả bài hát cùng độ phân giải (Codec, Bitrate, Sample Rate)."
            >
              <Zap size={14} /> Nhanh (Cùng Codec)
            </button>
            <button
              onClick={() => setMergeMode('convert')}
              disabled={isMerging}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mergeMode === 'convert' 
                  ? 'bg-purple-500 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              } ${isMerging ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Sử dụng '-acodec libmp3lame'. Tốc độ chậm, nhưng an toàn nếu các bài hát khác định dạng."
            >
              <Settings2 size={14} /> Chuẩn Hóa (Chậm)
            </button>
          </div>

          {isMerging && (
            <div className="flex items-center gap-3">
              <div className="w-40 h-1.5 bg-slate-800 rounded-full overflow-hidden">
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
            className={`interactive flex items-center gap-2 px-7 py-2.5 rounded-xl font-bold transition-all shadow-lg text-white text-sm
              ${isMerging || !hasSelection
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5'
              }`}
          >
            {isMerging
              ? <><Loader2 size={18} className="animate-spin" /> Đang Xử Lý...</>
              : <><PlayCircle size={18} /> Bắt Đầu</>
            }
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
