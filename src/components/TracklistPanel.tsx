import React, { useState } from 'react';
import { ListMusic, Clock, Copy, Check } from 'lucide-react';

interface TrackEntry {
  timestamp: string;
  name: string;
}

interface TracklistPanelProps {
  tracks: TrackEntry[];
  totalDuration: string; // HH:MM:SS
  totalSongs: number;
}

function secondsToTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ].join(':');
}

export function computeTracklist(selectedFiles: { name: string; duration: number }[]): {
  tracks: TrackEntry[];
  totalDuration: string;
} {
  let cumulative = 0;
  const tracks: TrackEntry[] = selectedFiles.map((f) => {
    const ts = secondsToTimestamp(cumulative);
    cumulative += f.duration;
    return {
      timestamp: ts,
      name: f.name.replace(/\.mp3$/i, ''),
    };
  });
  return { tracks, totalDuration: secondsToTimestamp(cumulative) };
}

export const TracklistPanel: React.FC<TracklistPanelProps> = ({ tracks, totalDuration, totalSongs }) => {
  const [copied, setCopied] = useState(false);

  if (tracks.length === 0) return null;

  const handleCopy = () => {
    const text = tracks.map(t => `${t.timestamp} ${t.name}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mx-6 mb-3 bg-slate-800/60 border border-slate-700/40 rounded-2xl overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/40 bg-slate-800/80">
        <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
          <ListMusic size={16} className="text-indigo-400" />
          Tracklist xem trước
          <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">
            {totalSongs} bài
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-mono text-emerald-400 font-bold">
            <Clock size={14} />
            {totalDuration}
          </div>
          <button
            onClick={handleCopy}
            className="interactive flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all
              bg-slate-700 hover:bg-slate-600 border border-slate-600
              text-slate-300 hover:text-white"
            title="Copy tracklist ra clipboard"
          >
            {copied ? (
              <><Check size={13} className="text-emerald-400" /> <span className="text-emerald-400">Đã copy!</span></>
            ) : (
              <><Copy size={13} /> Copy</>
            )}
          </button>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="max-h-40 overflow-y-auto px-4 py-2 interactive">
        <div className="columns-2 gap-4">
          {tracks.map((track, i) => (
            <div
              key={i}
              className="flex items-baseline gap-3 py-1 border-b border-slate-700/20 last:border-0 break-inside-avoid"
            >
              <span className="font-mono text-xs text-slate-500 shrink-0 min-w-[60px]">
                {track.timestamp}
              </span>
              <span className="text-xs text-slate-300 truncate" title={track.name}>
                {i + 1}. {track.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

