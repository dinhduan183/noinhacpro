export interface Mp3File {
  id: string;
  name: string;
  path: string;
  duration: number; // seconds
  bitrate: number;  // kbps (e.g. 320)
  sampleRate: number; // Hz (e.g. 44100)
}

export interface PanelState {
  id: number;
  dirPath: string | null;
  files: Mp3File[];
  originalFiles: Mp3File[];
  selectedCount: number;
  enabled: boolean; // true = visible & included in tracklist, false = hidden/disabled
}

// Flat entry in the merged tracklist (can be freely reordered)
export interface MergedEntry {
  fileId: string;   // original Mp3File.id — used as DnD key
  name: string;
  path: string;
  duration: number;
  bitrate: number;
  sampleRate: number;
  panelId: number;
}

export const PANEL_COLORS: { dot: string; bg: string }[] = [
  { dot: '#6366f1', bg: 'rgba(99,102,241,0.12)' },   // indigo
  { dot: '#10b981', bg: 'rgba(16,185,129,0.12)' },   // emerald
  { dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },   // amber
  { dot: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },    // rose
  { dot: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },    // cyan
  { dot: '#a855f7', bg: 'rgba(168,85,247,0.12)' },   // purple
  { dot: '#f97316', bg: 'rgba(249,115,22,0.12)' },   // orange
  { dot: '#14b8a6', bg: 'rgba(20,184,166,0.12)' },   // teal
];

declare global {
  interface Window {
    ipcRenderer: {
      openDirectory: () => Promise<string | null>;
      readMp3Files: (dir: string) => Promise<{name: string, path: string, duration: number, bitrate: number, sampleRate: number, id?: string}[]>;
      saveFile: (name: string) => Promise<string | null>;
      mergeAudio: (data: { files: string[], fileNames: string[], savePath: string, mergeMode: 'copy' | 'convert' }) => Promise<{savePath: string, tracklistPath: string}>;
      onProgress: (cb: (progress: number) => void) => void;
      offProgress: () => void;
    };
  }
}
