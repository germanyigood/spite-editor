
import React, { useState } from 'react';
import { Save, FileCode, ImageIcon, Archive, FileStack, ChevronDown } from 'lucide-react';

export type ExportType = 'download' | 'clipboard' | 'json' | 'ts' | 'project' | 'zip-ts' | 'images' | 'sfts' | 'sfa';

interface ExportPanelProps {
  onExport: (type: ExportType, packAsArchive?: boolean) => void;
  copySuccess: boolean;
  disabled: boolean;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ onExport, disabled }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div className="w-full relative" ref={menuRef}>
       <div className="flex shadow-lg shadow-indigo-900/10 rounded-xl overflow-hidden border border-indigo-500/30 hover:border-indigo-400/50 transition-all font-bold relative z-10">
           
           {/* Primary Button: Save Project */}
           <button 
              onClick={() => onExport('project')} 
              className="flex-1 flex justify-center items-center py-3 bg-gradient-to-r from-surface to-surface hover:from-surface-hover/20 hover:to-surface-hover/10 text-xs text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 gap-2 transition-all w-full leading-none"
           >
               <Save size={16} /><span>Save Project</span>
           </button>
           
           {/* Secondary Button: Export Dropdown Menu */}
           <button 
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className={`px-3 border-l border-indigo-500/30 flex items-center justify-center transition-all ${menuOpen ? 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-200' : 'bg-surface hover:bg-surface-hover/40 text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200'}`}
              title="More Export Options"
           >
               <ChevronDown size={16} className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
           </button>
       </div>

       {/* Pop-up Menu */}
       {menuOpen && (
           <div className="absolute bottom-full mb-2 right-0 w-64 bg-panel border-2 border-border-base/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-lg py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-[100]">
                <div className="px-3 py-2 text-[10px] text-txt-muted font-bold uppercase tracking-widest border-b border-border-base/10 mb-1 bg-surface/30">
                    Export Assets Options
                </div>
                
                <DropdownItem icon={ImageIcon} label="Export Images (.zip)" disabled={disabled} onClick={() => { onExport('images', true); setMenuOpen(false); }} />
                <DropdownItem icon={ImageIcon} label="Export Images (Multi-file)" disabled={disabled} onClick={() => { onExport('images', false); setMenuOpen(false); }} />
                
                <div className="h-px w-full bg-border-base/10 my-1" />
                
                <DropdownItem icon={FileCode} colorClass="text-blue-400" label="TS Code (Base64)" disabled={disabled} onClick={() => { onExport('ts'); setMenuOpen(false); }} />
                
                <div className="h-px w-full bg-border-base/10 my-1" />
                
                <DropdownItem icon={Archive} colorClass="text-green-400" label="TS Linked (SFTS Archive)" disabled={disabled} onClick={() => { onExport('sfts', true); setMenuOpen(false); }} />
                <DropdownItem icon={FileStack} colorClass="text-green-400" label="TS Linked (Multi-file)" disabled={disabled} onClick={() => { onExport('sfts', false); setMenuOpen(false); }} />
                
                <div className="h-px w-full bg-border-base/10 my-1" />
                
                <DropdownItem icon={Archive} colorClass="text-yellow-400" label="JSON (SFA Archive)" disabled={disabled} onClick={() => { onExport('sfa', true); setMenuOpen(false); }} />
                <DropdownItem icon={FileStack} colorClass="text-yellow-400" label="JSON (Multi-file)" disabled={disabled} onClick={() => { onExport('sfa', false); setMenuOpen(false); }} />
           </div>
       )}
    </div>
  );
};

const DropdownItem = ({ icon: Icon, label, onClick, colorClass, disabled }: any) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors text-txt-secondary hover:bg-surface/50 hover:text-txt-primary disabled:opacity-40 disabled:hover:bg-transparent"
    >
        <Icon size={14} className={`shrink-0 ${disabled ? '' : colorClass || ''}`} />
        {label}
    </button>
);

export default ExportPanel;

