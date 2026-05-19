
import React, { useState } from 'react';
import { Download, Save, FileCode, ImageIcon, FileJson, Archive, FileStack } from 'lucide-react';
import { Toggle } from '../common/design-system/Toggle';

export type ExportType = 'download' | 'clipboard' | 'json' | 'ts' | 'project' | 'zip-ts' | 'images' | 'sfts' | 'sfa';

interface ExportPanelProps {
  onExport: (type: ExportType, packAsArchive?: boolean) => void;
  copySuccess: boolean;
  disabled: boolean;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ onExport, disabled }) => {
  const [packAsArchive, setPackAsArchive] = useState(true);

  return (
    <div className="space-y-4">
       {/* Save Project (distinct action) */}
       <button onClick={() => onExport('project')} className="w-full flex justify-center items-center p-3 bg-surface hover:bg-surface-hover/10 rounded-xl border border-indigo-500/30 text-xs text-indigo-300 hover:text-indigo-200 gap-2 transition-all font-bold hover:scale-[1.02]">
           <Save size={16} /><span>Save Project (.sforge)</span>
       </button>
       
       <div className="h-px w-full bg-border-base/10 my-4" />

       <div className="flex items-center gap-2 text-txt-muted text-[10px] uppercase tracking-wider font-bold">
          <Download size={12} /> Export Assets
       </div>
       
       <div className="flex items-center justify-between mb-2">
         <span className="text-xs text-txt-secondary">Pack as Archive (.zip / .sfts / .sfa)</span>
         <Toggle value={packAsArchive} onChange={setPackAsArchive} />
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
          <button onClick={() => onExport('ts')} disabled={disabled} className="disabled:opacity-40 flex flex-col items-center justify-center p-4 bg-surface hover:bg-surface-hover/10 rounded-2xl border border-border-base/10 hover:border-border-base/30 text-xs text-txt-secondary hover:text-txt-primary gap-2 transition-all hover:scale-[1.02]">
              <FileCode size={18} className="text-blue-400" /><span>TS (Base64)</span>
          </button>
          
          <button onClick={() => onExport('sfts', packAsArchive)} disabled={disabled} className="disabled:opacity-40 flex flex-col items-center justify-center p-4 bg-surface hover:bg-surface-hover/10 rounded-2xl border border-border-base/10 hover:border-border-base/30 text-xs text-txt-secondary hover:text-txt-primary gap-2 transition-all hover:scale-[1.02]">
              <FileCode size={18} className="text-green-400" /><span>TS Linked (SFTS)</span>
          </button>

          <button onClick={() => onExport('sfa', packAsArchive)} disabled={disabled} className="disabled:opacity-40 flex flex-col items-center justify-center p-4 bg-surface hover:bg-surface-hover/10 rounded-2xl border border-border-base/10 hover:border-border-base/30 text-xs text-txt-secondary hover:text-txt-primary gap-2 transition-all hover:scale-[1.02]">
              <FileJson size={18} className="text-yellow-400" /><span>JSON (SFA)</span>
          </button>
       </div>
    </div>
  );
};

export default ExportPanel;
