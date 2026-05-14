import React from 'react';
import { Monitor } from 'lucide-react';
import { ExportConfig } from '../../types';

interface ExportSettingsPanelProps {
  config: ExportConfig | undefined;
  onUpdate: (cfg: ExportConfig) => void;
}

const ExportSettingsPanel: React.FC<ExportSettingsPanelProps> = ({ config, onUpdate }) => {
  // Default values if config is missing (fallback)
  const cfg = config || { width: 512, height: 512, x: 0, y: 0, scale: 1, enabled: false };

  const handleChange = (key: keyof ExportConfig, val: number | string) => {
    let numVal = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(numVal)) numVal = 0;
    
    // Always force enable when editing values
    onUpdate({ ...cfg, [key]: numVal, enabled: true });
  };

  const toggleEnabled = () => {
    onUpdate({ ...cfg, enabled: !cfg.enabled });
  };

  const safeVal = (v: number) => isNaN(v) ? 0 : v;

  return (
    <div className="bg-white/5 rounded-2xl p-4 space-y-3 border border-white/5">
       <div className="flex items-center justify-between">
           <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase">
               <Monitor size={14} className="text-green-400" /> Final Output Crop
           </div>
           <button 
             onClick={toggleEnabled}
             className={`w-10 h-5 rounded-full relative transition-colors border border-transparent ${cfg.enabled ? 'bg-green-500/20 border-green-500/50' : 'bg-gray-800'}`}
           >
               <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm ${cfg.enabled ? 'left-5' : 'left-0.5'}`} style={{ backgroundColor: cfg.enabled ? '#4ade80' : '#6b7280' }} />
           </button>
       </div>

       {cfg.enabled ? (
           <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
               <div className="text-[10px] text-gray-400 leading-tight bg-black/20 p-3 rounded-xl border border-white/5 shadow-inner">
                   Resize the <strong>blue box</strong> in the Preview window to crop your final animation.
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                       <label className="text-[9px] text-gray-500 font-bold uppercase">Width</label>
                       <input 
                           type="number" 
                           value={safeVal(cfg.width)} 
                           onChange={(e) => handleChange('width', e.target.value)}
                           className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs font-mono text-gray-200 outline-none focus:border-green-500/50"
                       />
                   </div>
                   <div className="space-y-1">
                       <label className="text-[9px] text-gray-500 font-bold uppercase">Height</label>
                       <input 
                           type="number" 
                           value={safeVal(cfg.height)} 
                           onChange={(e) => handleChange('height', e.target.value)}
                           className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs font-mono text-gray-200 outline-none focus:border-green-500/50"
                       />
                   </div>
                   <div className="space-y-1">
                       <label className="text-[9px] text-gray-500 font-bold uppercase">Cam X</label>
                       <input 
                           type="number" 
                           value={safeVal(cfg.x)} 
                           onChange={(e) => handleChange('x', e.target.value)}
                           className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs font-mono text-gray-200 outline-none focus:border-green-500/50"
                       />
                   </div>
                   <div className="space-y-1">
                       <label className="text-[9px] text-gray-500 font-bold uppercase">Cam Y</label>
                       <input 
                           type="number" 
                           value={safeVal(cfg.y)} 
                           onChange={(e) => handleChange('y', e.target.value)}
                           className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs font-mono text-gray-200 outline-none focus:border-green-500/50"
                       />
                   </div>
               </div>
               
               <div className="space-y-1 bg-black/20 p-2 rounded-xl border border-white/5">
                    <div className="flex justify-between text-[9px] text-gray-500 font-bold uppercase mb-1">
                        <span>Output Scale</span>
                        <span className="font-mono text-green-300">{cfg.scale || 1}x</span>
                    </div>
                    <input 
                        type="range" 
                        min="0.1" 
                        max="8" 
                        step="0.1"
                        value={cfg.scale || 1} 
                        onChange={(e) => handleChange('scale', e.target.value)}
                        className="w-full h-1 bg-gray-700 rounded appearance-none accent-green-500"
                    />
                    <div className="text-[9px] text-gray-500 text-right font-mono mt-1">
                        {Math.ceil(cfg.width * (cfg.scale||1))}x{Math.ceil(cfg.height * (cfg.scale||1))} px
                    </div>
               </div>
           </div>
       ) : (
           <div className="text-[10px] text-gray-500 italic px-1 opacity-60">
               Enable to crop/resize output.
           </div>
       )}
    </div>
  );
};

export default ExportSettingsPanel;