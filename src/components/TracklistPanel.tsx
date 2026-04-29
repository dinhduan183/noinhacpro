import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import {
  ListMusic, Copy, Check, GripVertical,
  X, Shuffle, RotateCcw, ListFilter,
} from 'lucide-react';
import type { MergedEntry, PanelState } from '../types';
import { PANEL_COLORS } from '../types';

interface TracklistPanelProps {
  entries: MergedEntry[];
  panels: PanelState[];
  onReorder: (from: number, to: number) => void;
  onRemoveEntry: (fileId: string) => void;
  onRandomizeAll: () => void;
  onRandomizeByFolder: () => void;
  onResetAll: () => void;
}

function secondsToTimestamp(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
}

function formatMM(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function computeTracklist(entries: MergedEntry[]): {
  tracks: { timestamp: string; name: string }[];
  totalDuration: string;
} {
  let cum = 0;
  const tracks = entries.map(e => {
    const ts = secondsToTimestamp(cum);
    cum += e.duration;
    return { timestamp: ts, name: e.name.replace(/\.mp3$/i, '') };
  });
  return { tracks, totalDuration: secondsToTimestamp(cum) };
}

export const TracklistPanel: React.FC<TracklistPanelProps> = ({
  entries, panels,
  onReorder, onRemoveEntry,
  onRandomizeAll, onRandomizeByFolder, onResetAll,
}) => {
  const [copied, setCopied] = useState(false);

  // Build panel color map: panelId → color (fixed to panel.id, not position)
  const colorMap = new Map<number, { dot: string; bg: string }>();
  const indexMap = new Map<number, number>();
  panels.forEach((p, i) => {
    colorMap.set(p.id, PANEL_COLORS[(p.id - 1) % PANEL_COLORS.length]);
    indexMap.set(p.id, i);
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    // Map visible index back to full mergedList index
    const enabledPanelIds = new Set(panels.filter(p => p.enabled !== false).map(p => p.id));
    const visibleEntries = entries.filter(e => enabledPanelIds.has(e.panelId));
    const fromEntry = visibleEntries[result.source.index];
    const toEntry = visibleEntries[result.destination.index];
    const fromIdx = entries.indexOf(fromEntry);
    const toIdx = entries.indexOf(toEntry);
    if (fromIdx !== -1 && toIdx !== -1) onReorder(fromIdx, toIdx);
  };

  const handleCopy = () => {
    const enabledPanelIds = new Set(panels.filter(p => p.enabled !== false).map(p => p.id));
    const visibleEntries = entries.filter(e => enabledPanelIds.has(e.panelId));
    const { tracks } = computeTracklist(visibleEntries);
    const text = tracks.map(t => `${t.timestamp} ${t.name}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Compute cumulative timestamps — only for enabled panels
  const enabledPanelIds = new Set(panels.filter(p => p.enabled !== false).map(p => p.id));
  const visibleEntries = entries.filter(e => enabledPanelIds.has(e.panelId));
  let cum = 0;
  const withTs = visibleEntries.map(e => {
    const ts = secondsToTimestamp(cum);
    cum += e.duration;
    return { ...e, timestamp: ts };
  });

  return (
    <div className="flex flex-col h-full">

      {/* ── Header bar ── */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-slate-800/50 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <ListMusic size={15} className="text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">Tracklist</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Random all */}
          <button
            onClick={onRandomizeAll}
            title="Xáo trộn tất cả bài"
            className="interactive flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/70 hover:bg-slate-600/70 text-slate-300 border border-slate-600/50 transition-colors"
          >
            <Shuffle size={13} /> Xáo trộn tất cả
          </button>

          {/* Random by folder */}
          <button
            onClick={onRandomizeByFolder}
            title="Xáo trộn trong từng thư mục, giữ thứ tự thư mục"
            className="interactive flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/70 hover:bg-slate-600/70 text-slate-300 border border-slate-600/50 transition-colors"
          >
            <ListFilter size={13} /> Xáo từng thư mục
          </button>

          {/* Reset */}
          <button
            onClick={onResetAll}
            title="Hoàn tác tất cả về thứ tự gốc"
            className="interactive flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/70 hover:bg-slate-600/70 text-slate-400 hover:text-slate-200 border border-slate-600/50 transition-colors"
          >
            <RotateCcw size={13} /> Reset
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="interactive flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white transition-colors"
          >
            {copied
              ? <><Check size={13} className="text-emerald-400" /><span className="text-emerald-400">OK!</span></>
              : <><Copy size={13} /> Copy</>
            }
          </button>
        </div>
      </div>

      {/* ── Folder legend ── */}
      {panels.some(p => p.dirPath) && (
        <div className="shrink-0 flex flex-wrap gap-x-4 gap-y-1 px-5 py-2 bg-slate-900/40 border-b border-slate-800/60">
          {panels.map((p) => {
            if (!p.dirPath) return null;
            const c = PANEL_COLORS[(p.id - 1) % PANEL_COLORS.length];
            const active = p.enabled !== false;
            return (
              <span key={p.id} className={`flex items-center gap-1.5 text-[11px] transition-opacity ${active ? 'text-slate-400' : 'text-slate-600 opacity-40'}`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: active ? c.dot : '#475569' }} />
                {p.dirPath.split(/[/\\]/).pop()}
                {!active && <span className="text-[9px] text-slate-600">(ẩn)</span>}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Empty state ── */}
      {visibleEntries.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-3">
          <ListMusic size={40} className="opacity-30" />
          <p className="text-sm">{entries.length > 0 ? 'Tất cả thư mục đang bị ẩn.' : 'Chưa có bài nào. Hãy chọn thư mục ở bên trái.'}</p>
        </div>
      )}

      {/* ── DnD list ── */}
      {visibleEntries.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="main-tracklist">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex-1 overflow-y-auto px-3 py-2 interactive"
              >
                {withTs.map((entry, index) => {
                  const color = colorMap.get(entry.panelId) ?? PANEL_COLORS[0];
                  const pIdx = indexMap.get(entry.panelId) ?? 0;

                  return (
                    <Draggable key={entry.fileId} draggableId={entry.fileId} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-1 group transition-all border
                            ${snapshot.isDragging
                              ? 'bg-slate-700 shadow-xl shadow-black/40 scale-[1.01] border-slate-600'
                              : 'border-transparent hover:bg-slate-800/50'
                            }`}
                          style={provided.draggableProps.style}
                        >
                          {/* Drag handle */}
                          <div {...provided.dragHandleProps} className="text-slate-600 hover:text-slate-400 cursor-grab shrink-0">
                            <GripVertical size={14} />
                          </div>

                          {/* Panel color dot */}
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: color.dot }}
                            title={`Thư mục ${pIdx + 1}`}
                          />

                          {/* Timestamp */}
                          <span className="font-mono text-[10px] text-slate-500 shrink-0 w-14 text-right">
                            {entry.timestamp}
                          </span>

                          {/* Index + Name */}
                          <span className="flex-1 text-xs text-slate-200 truncate min-w-0" title={entry.name}>
                            <span className="text-slate-500 mr-1.5">{index + 1}.</span>
                            {entry.name.replace(/\.mp3$/i, '')}
                          </span>

                          {/* Metadata (Bitrate + SampleRate) */}
                          <div className="flex gap-1.5 shrink-0 opacity-70">
                            {entry.bitrate > 0 && (
                              <span className="px-1.5 py-0.5 roundedbg-slate-800 text-[9px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                                {entry.bitrate}kbps
                              </span>
                            )}
                            {entry.sampleRate > 0 && (
                              <span className="px-1.5 py-0.5 roundedbg-slate-800 text-[9px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                                {Math.round(entry.sampleRate / 1000)}kHz
                              </span>
                            )}
                          </div>

                          {/* Duration */}
                          <span className="font-mono text-[10px] text-slate-500 shrink-0 mx-2">
                            {formatMM(entry.duration)}
                          </span>

                          {/* Actions (visible on hover) */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => onRemoveEntry(entry.fileId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
};
