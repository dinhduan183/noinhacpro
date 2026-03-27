import React from 'react';
import { FolderOpen, Shuffle, RotateCcw } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { AudioItem } from './AudioItem';
import type { PanelState } from '../types';

interface DirectoryPanelProps {
  panel: PanelState;
  onSelectDirectory: (id: number) => void;
  onCountChange: (id: number, count: number) => void;
  onRandomize: (id: number) => void;
  onReset: (id: number) => void;
  onRemoveFile: (panelId: number, fileId: string) => void;
  playingPath: string | null;
  onPlayToggle: (path: string) => void;
}

export const DirectoryPanel: React.FC<DirectoryPanelProps> = ({
  panel,
  onSelectDirectory,
  onCountChange,
  onRandomize,
  onReset,
  onRemoveFile,
  playingPath,
  onPlayToggle,
}) => {
  // We determine how many files to display out of the files array based on selectedCount
  // If selectedCount is empty or invalid, we default to full list or 0
  const displayedFiles = panel.files.slice(0, panel.selectedCount || panel.files.length);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
      {/* Header section */}
      <div className="p-5 bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700/50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs">
              {panel.id}
            </span>
            Thư mục {panel.id}
          </h2>
        </div>

        <button
          onClick={() => onSelectDirectory(panel.id)}
          className="w-full interactive flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm font-medium transition-colors"
        >
          <FolderOpen size={18} className="text-indigo-400" />
          <span className="truncate max-w-[200px]">
            {panel.dirPath ? panel.dirPath.split('/').pop() : 'Chọn thư mục MP3...'}
          </span>
        </button>

        {panel.dirPath && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-400">Số lượng ({panel.files.length} bài)</span>
              <input
                type="number"
                min="0"
                max={panel.files.length}
                value={panel.selectedCount}
                onChange={(e) => onCountChange(panel.id, parseInt(e.target.value) || 0)}
                className="interactive w-20 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-center focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onRandomize(panel.id)}
                className="interactive flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-medium transition-colors border border-indigo-500/20"
              >
                <Shuffle size={14} /> Xáo trộn
              </button>
              <button
                onClick={() => onReset(panel.id)}
                className="interactive flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-700"
              >
                <RotateCcw size={14} /> Hoàn tác
              </button>
            </div>
          </div>
        )}
      </div>

      {/* List section */}
      <div className="flex-1 p-3 overflow-y-auto interactive min-h-0">
        {!panel.dirPath ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
            <FolderOpen size={32} className="mb-3 opacity-20" />
            <p>Chưa chọn thư mục</p>
          </div>
        ) : displayedFiles.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Không có file để hiển thị
          </div>
        ) : (
          <Droppable droppableId={`panel-${panel.id}`}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="min-h-[100px]"
              >
                {displayedFiles.map((file, index) => (
                  <Draggable key={file.id} draggableId={file.id} index={index}>
                    {(provided) => (
                      <AudioItem
                        file={file}
                        index={index}
                        onRemove={(fileId) => onRemoveFile(panel.id, fileId)}
                        isPlaying={playingPath === file.path}
                        onPlayToggle={onPlayToggle}
                        provided={provided}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </div>
    </div>
  );
};
