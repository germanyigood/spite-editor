import React from 'react';
import { Download, Save, Copy, FileJson, FileCode } from 'lucide-react';

interface ExportPanelProps {
  onExport: (type: 'download' | 'clipboard' | 'json' | 'ts' | 'project') => void;
  copySuccess: boolean;
  disabled: boolean;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ onExport, copySuccess, disabled }) => {
  return (
    <div className="space-y-4">
       <div className="flex items-center gap-2 text-gray-400 text-sm uppercase tracking-wider font-bold">
          <Download size={14} /> Export Options
       </div>
       <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onExport('project')} className="flex flex-col items-center justify-center p-3 bg-indigo-900/40 hover:bg-indigo-900/60 rounded-lg border border-indigo-700/50 text-xs text-indigo-200 gap-1"><Save size={16} /><span>Save Project</span></button>
          <button onClick={() => onExport('download')} disabled={disabled} className="disabled:opacity-50 flex flex-col items-center justify-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-xs text-gray-300 gap-1"><Download size={16} /><span>Strip (Active)</span></button>
          <button onClick={() => onExport('clipboard')} disabled={disabled} className="disabled:opacity-50 flex flex-col items-center justify-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-xs text-gray-300 gap-1"><Copy size={16} /><span>{copySuccess ? 'Copied' : 'Copy'}</span></button>
          <button onClick={() => onExport('json')} disabled={disabled} className="disabled:opacity-50 flex flex-col items-center justify-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-xs text-gray-300 gap-1"><FileJson size={16} /><span>JSON (All)</span></button>
          <button onClick={() => onExport('ts')} disabled={disabled} className="disabled:opacity-50 flex flex-col items-center justify-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-xs text-gray-300 gap-1"><FileCode size={16} /><span>TS (All)</span></button>
       </div>
    </div>
  );
};

export default ExportPanel;
