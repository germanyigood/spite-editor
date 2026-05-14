
import React from 'react';
import { X, AlertTriangle, HelpCircle, Info } from 'lucide-react';

// --- Base Dialog Component ---
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  danger?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, icon, danger }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4" 
        onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-panel border ${danger ? 'border-red-500/30' : 'border-border-base/20'} rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-md w-full overflow-hidden relative animate-in zoom-in-95 duration-200 text-left`}>
        <div className="p-6 flex gap-5">
          {icon && (
             <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${danger ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-surface border-border-base/10 text-txt-primary'}`}>
                {icon}
             </div>
          )}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-lg font-bold text-txt-primary mb-2">{title}</h3>
            <div className="text-txt-secondary text-sm leading-relaxed">
              {children}
            </div>
          </div>
        </div>
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-txt-muted hover:text-txt-primary transition-colors p-1"
        >
            <X size={18} />
        </button>
      </div>
    </div>
  );
};

// --- Ready-to-use Confirm Dialog ---
interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
    isOpen, title, description, onConfirm, onCancel, 
    confirmText = "Confirm", cancelText = "Cancel", danger = false 
}) => {
    return (
        <Dialog 
            isOpen={isOpen} 
            onClose={onCancel} 
            title={title} 
            danger={danger}
            icon={danger ? <AlertTriangle size={24}/> : <HelpCircle size={24} />}
        >
            <div className="mb-6">{description}</div>
            <div className="flex justify-end gap-3">
                <button 
                    onClick={onCancel}
                    className="px-4 py-2 bg-surface hover:bg-surface-hover/10 text-txt-secondary hover:text-txt-primary rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border border-border-base/10"
                >
                    {cancelText}
                </button>
                <button 
                    onClick={onConfirm}
                    className={`px-4 py-2 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 ${danger ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'}`}
                >
                    {confirmText}
                </button>
            </div>
        </Dialog>
    );
};

// --- Simple Alert Dialog ---
interface AlertDialogProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onClose: () => void;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({ isOpen, title, message, onClose }) => {
    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={title} icon={<Info size={24} className="text-blue-400"/>}>
             <div className="mb-6">{message}</div>
             <div className="flex justify-end">
                <button 
                    onClick={onClose} 
                    className="px-4 py-2 bg-surface hover:bg-surface-hover/10 text-txt-primary rounded-lg text-xs font-bold uppercase tracking-wider border border-border-base/10"
                >
                    OK
                </button>
             </div>
        </Dialog>
    );
};
