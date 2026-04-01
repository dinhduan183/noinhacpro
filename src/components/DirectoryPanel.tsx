import React from 'react';
import { FolderOpen, Shuffle, RotateCcw, X, GripVertical, Copy } from 'lucide-react';
import type { PanelState } from '../types';
import { PANEL_COLORS } from '../types';

interface DirectoryPanelProps {
  panel: PanelState;
  activeCount: number; // songs currently in tracklist for this panel
  canRemove: boolean;
  isDragging?: boolean;
  dragHandleProps?: Record<string, any> | null;
  onSelectDirectory: (id: number) => void;
  onDuplicate: (id: number) => void;
  onRandomize: (id: number) => void;
  onReset: (id: number) => void;
  onRemovePanel: (id: number) => void;
}

export const DirectoryPanel: React.FC<DirectoryPanelProps> = ({
  panel,
  activeCount,
  canRemove,
  isDragging = false,
  dragHandleProps,
  onSelectDirectory,
  onDuplicate,
  onRandomize,
  onReset,
  onRemovePanel,
}) => {
  const color = PANEL_COLORS[(panel.id - 1) % PANEL_COLORS.length];

  return (
    <div className={`bg-slate-800/60 border rounded-xl px-3 py-2.5 interactive transition-shadow
      ${isDragging ? 'border-indigo-500/40 shadow-lg shadow-black/30' : 'border-slate-700/50'}`}>

      {/* Row 1: grip · dot · name · x */}
      <div className="flex items-center gap-2">
        <div
          {...(dragHandleProps ?? {})}
          className="text-slate-600 hover:text-slate-400 cursor-grab shrink-0 -ml-1"
        >
          <GripVertical size={14} />
        </div>

        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color.dot }} />

        {/* Folder name — clicking opens picker */}
        <button
          onClick={() => onSelectDirectory(panel.id)}
          className="flex-1 min-w-0 text-left"
          title={panel.dirPath ?? 'Chọn thư mục MP3'}
        >
          {panel.dirPath ? (
            <span className="text-sm font-semibold text-white truncate block hover:text-indigo-300 transition-colors">
              {panel.dirPath.split(/[/\\]/).pop()}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors">
              <FolderOpen size={13} style={{ color: color.dot }} />
              <span className="text-xs">Chọn thư mục...</span>
            </span>
          )}
        </button>

        {/* Duplicate button — only when folder selected */}
        {panel.dirPath && (
          <button
            onClick={() => onDuplicate(panel.id)}
            title="Nhân bản thư mục này"
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
          >
            <Copy size={12} />
          </button>
        )}

        {canRemove && (
          <button
            onClick={() => onRemovePanel(panel.id)}
            title="Xóa"
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Row 2 (only when folder selected): active count · shuffle · reset */}
      {panel.dirPath && (
        <div className="flex items-center gap-2 mt-2 pl-5">
          <span className="text-xs font-mono font-semibold text-slate-300">
            {activeCount}
          </span>
          <span className="text-xs text-slate-600 whitespace-nowrap">/ {panel.files.length} bài</span>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => onRandomize(panel.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
            >
              <Shuffle size={11} /> Random
            </button>
            <button
              onClick={() => onReset(panel.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <RotateCcw size={11} /> Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
