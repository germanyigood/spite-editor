import React from 'react';
import { Loader2, Wand2 } from 'lucide-react';

interface MagicDetectPanelProps {
  isProcessing: boolean;
  disabled: boolean;
  onDetect: () => void;
}

const MagicDetectPanel: React.FC<MagicDetectPanelProps> = ({ isProcessing, disabled, onDetect }) => {
  return (
    <div className="p-1 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-white/10 shadow-lg">
      <button 
        onClick={onDetect}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wide border border-white/10 group relative overflow-hidden backdrop-blur-sm"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <span className="relative flex items-center gap-2">
            {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
            {isProcessing ? "Analyzing..." : "Auto Detect Grid"}
        </span>
      </button>
    </div>
  );
};

export default MagicDetectPanel;