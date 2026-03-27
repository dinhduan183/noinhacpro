import React from 'react';
import { Play, Pause, GripVertical, X } from 'lucide-react';
import type { Mp3File } from '../types';

interface AudioItemProps {
  file: Mp3File;
  index: number;
  onRemove: (id: string) => void;
  isPlaying: boolean;
  onPlayToggle: (path: string) => void;
  provided: any; // Draggable provided from react-beautiful-dnd
}

export const AudioItem: React.FC<AudioItemProps> = ({ file, index, onRemove, isPlaying, onPlayToggle, provided }) => {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`flex items-center gap-3 p-3 rounded-xl mb-2 interactive transition-all ${isPlaying ? 'bg-indigo-500/20 border border-indigo-500/50' : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'}`}
    >
      <div {...provided.dragHandleProps} className="text-slate-500 hover:text-slate-300 cursor-grab">
        <GripVertical size={18} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate" title={file.name}>
          <span className="text-slate-500 mr-2">{index + 1}.</span>
          {file.name}
        </p>
      </div>

      <button
        onClick={() => onPlayToggle(file.path)}
        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-full transition-colors"
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>

      <button
        onClick={() => onRemove(file.id)}
        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};
