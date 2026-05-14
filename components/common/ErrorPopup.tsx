
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ErrorPopupProps {
  title?: string;
  message: string;
  onClose: () => void;
}

const ErrorPopup: React.FC<ErrorPopupProps> = ({ title = "Error", message, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-gray-900 border border-red-500/30 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.2)] max-w-md w-full overflow-hidden relative animate-in zoom-in-95 duration-200">
        <div className="p-5 flex gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed break-words whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>
        <div className="bg-black/40 p-3 flex justify-end border-t border-white/5">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Dismiss
          </button>
        </div>
        <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
        >
            <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default ErrorPopup;
