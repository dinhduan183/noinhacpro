import React from 'react';
import { CheckCircle2, XCircle, X, FolderOpen } from 'lucide-react';

interface NotificationProps {
  type: 'success' | 'error';
  message: string;
  detail?: string;
  savePath?: string;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ type, message, detail, savePath, onClose }) => {
  const isError = type === 'error';

  const handleShowInFolder = () => {
    if (savePath) {
      // @ts-ignore
      window.ipcRenderer.showInFolder(savePath);
    }
  };

  const lines = detail ? detail.trim().split('\n').filter(Boolean) : [];

  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border interactive max-w-lg
        ${isError
          ? 'bg-red-950/80 border-red-500/30 text-red-200'
          : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
        }`}
    >
      {/* Status icon */}
      {isError
        ? <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
        : <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
      }

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">{message}</p>
        {lines.map((line, i) => (
          <p key={i} className="text-[10px] opacity-60 truncate font-mono mt-0.5">{line}</p>
        ))}
      </div>

      {/* Right actions: open folder + close */}
      <div className="flex items-center gap-1 shrink-0">
        {!isError && savePath && (
          <button
            onClick={handleShowInFolder}
            title="Mở thư mục chứa"
            className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
          >
            <FolderOpen size={11} /> Mở thư mục
          </button>
        )}
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-white/10 transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
