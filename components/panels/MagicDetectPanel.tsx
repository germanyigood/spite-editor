import React from 'react';
import { Loader2, Wand2 } from 'lucide-react';

interface MagicDetectPanelProps {
  isProcessing: boolean;
  disabled: boolean;
  onDetect: () => void;
}

const MagicDetectPanel: React.FC<MagicDetectPanelProps> = ({ isProcessing, disabled, onDetect }) => {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30">
      <button 
        onClick={onDetect}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
      >
        {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
        {isProcessing ? "Analyzing..." : "Magic Detect"}
      </button>
    </div>
  );
};

export default MagicDetectPanel;
