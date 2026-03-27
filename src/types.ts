export interface Mp3File {
  id: string;
  name: string;
  path: string;
  duration: number; // seconds
}

export interface PanelState {
  id: number;
  dirPath: string | null;
  files: Mp3File[];
  originalFiles: Mp3File[]; // To restore when Reset
  selectedCount: number;
}
