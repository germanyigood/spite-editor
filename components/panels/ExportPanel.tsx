
import React from 'react';
import { Download, Save, FileCode, ImageIcon } from 'lucide-react';

interface ExportPanelProps {
  onExport: (type: 'download' | 'clipboard' | 'json' | 'ts' | 'project' | 'zip-ts' | 'images') => void;
  copySuccess: boolean;
  disabled: boolean;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ onExport, disabled }) => {
  return (
    <div className="space-y-4">
       <div className="flex items-center gap-2 text-txt-muted text-[10px] uppercase tracking-wider font-bold">
          <Download size={12} /> Export Options
       </div>
       
       {/* Primary Action: Direct Image Export */}
       <button 
          onClick={() => onExport('images')} 
          disabled={disabled}
          className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 disabled:hover:scale-100 rounded-2xl border border-white/10 text-white shadow-xl shadow-indigo-900/20 transition-all font-bold hover:scale-[1.02] mb-1"
       >
          <ImageIcon size={20} />
          <div className="flex flex-col items-start">
             <span className="text-xs">Export Final Images</span>
             <span className="text-[9px] opacity-70 font-normal">PNG / Sprite Sheets</span>
          </div>
       </button>

       <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onExport('project')} className="flex flex-col items-center justify-center p-4 bg-surface hover:bg-surface-hover/10 rounded-2xl border border-border-base/10 text-xs text-txt-secondary hover:text-txt-primary gap-2 transition-all font-bold hover:scale-[1.02]">
              <Save size={18} className="text-indigo-400" /><span>Project File</span>
          </button>
          
          <button onClick={() => onExport('ts')} disabled={disabled} className="disabled:opacity-40 flex flex-col items-center justify-center p-4 bg-surface hover:bg-surface-hover/10 rounded-2xl border border-border-base/10 hover:border-border-base/30 text-xs text-txt-secondary hover:text-txt-primary gap-2 transition-all hover:scale-[1.02]">
              <FileCode size={18} className="text-blue-400" /><span>TS Code</span>
          </button>
       </div>
    </div>
  );
};

export default ExportPanel;
