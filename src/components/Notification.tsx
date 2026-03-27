import React from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

interface NotificationProps {
  type: 'success' | 'error';
  message: string;
  detail?: string;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ type, message, detail, onClose }) => {
  const isError = type === 'error';
  return (
    <div
      className={`mx-6 mb-3 flex items-start gap-3 p-4 rounded-2xl border interactive
        ${isError
          ? 'bg-red-950/60 border-red-500/30 text-red-200'
          : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-200'
        }`}
    >
      <div className="shrink-0 mt-0.5">
        {isError
          ? <XCircle size={20} className="text-red-400" />
          : <CheckCircle2 size={20} className="text-emerald-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{message}</p>
        {detail && (
          <p className="text-xs mt-1 opacity-70 break-all font-mono whitespace-pre-wrap">{detail}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};
