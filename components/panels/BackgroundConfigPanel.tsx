import React from 'react';
import { Settings2, X, Plus } from 'lucide-react';
import { BackgroundRemovalConfig } from '../../types';

interface BackgroundConfigPanelProps {
  config: BackgroundRemovalConfig;
  onUpdateConfig: (newConfig: BackgroundRemovalConfig) => void;
}

const BackgroundConfigPanel: React.FC<BackgroundConfigPanelProps> = ({ config, onUpdateConfig }) => {
  return (
    <div className="space-y-4">
       <div className="flex items-center justify-between text-gray-400 text-sm uppercase tracking-wider font-bold">
            <div className="flex items-center gap-2"><Settings2 size={14} /> Background</div>
            <button onClick={() => onUpdateConfig({ ...config, enabled: !config.enabled })} className={`w-10 h-5 rounded-full relative transition-colors ${config.enabled ? 'bg-blue-600' : 'bg-gray-700'}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${config.enabled ? 'left-6' : 'left-1'}`} />
            </button>
       </div>
       {config.enabled && (
           <div className="space-y-3 bg-gray-800/50 p-3 rounded-lg border border-gray-800">
               <div className="space-y-2">
                   {config.colors.map((c, i) => (
                       <div key={i} className="flex flex-col gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700 shadow-sm group hover:border-blue-500/50 transition-all">
                          <div className="flex items-center gap-2">
                             <input 
                                type="color" 
                                value={c.color} 
                                onChange={(e) => {
                                     const newColors = [...config.colors];
                                     newColors[i] = { ...newColors[i], color: e.target.value };
                                     onUpdateConfig({ ...config, colors: newColors });
                                }} 
                                className="h-10 w-10 rounded cursor-pointer bg-transparent border-none p-0 hover:border-2 hover:border-white/50"
                             />
                             <div className="flex-1">
                                 <label className="text-[10px] text-gray-500 font-mono uppercase">Color #{i+1}</label>
                             </div>
                             <button onClick={() => {
                                  const newColors = config.colors.filter((_, idx) => idx !== i);
                                  onUpdateConfig({ ...config, colors: newColors });
                             }} className="text-gray-500 hover:text-red-400 p-2"><X size={16}/></button>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 uppercase min-w-[30px]">Tol</span>
                              <input 
                                  type="range" 
                                  min="0" 
                                  max="100" 
                                  value={c.tolerance} 
                                  onChange={(e) => {
                                      const newColors = [...config.colors];
                                      newColors[i] = { ...newColors[i], tolerance: parseInt(e.target.value) };
                                      onUpdateConfig({ ...config, colors: newColors });
                                  }} 
                                  className="w-full h-1 bg-gray-700 rounded appearance-none accent-blue-500" 
                              />
                              <span className="text-[10px] text-gray-400 w-6 text-right">{c.tolerance}</span>
                          </div>
                       </div>
                   ))}
                   <button 
                      onClick={() => onUpdateConfig({ ...config, colors: [...config.colors, {color: '#000000', tolerance: 10}] })} 
                      className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-blue-500 hover:border-blue-500 flex items-center justify-center transition-colors text-xs gap-1"
                   >
                      <Plus size={14}/> Add Color
                   </button>
               </div>
               
               <hr className="border-gray-700/50" />

               <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-semibold uppercase">Edge Radius</label>
                        <input type="range" min="0" max="10" value={config.edgeRadius} onChange={(e) => onUpdateConfig({ ...config, edgeRadius: parseInt(e.target.value) })} className="w-full h-1 bg-gray-700 rounded appearance-none accent-blue-500" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-semibold uppercase">Edge Opacity</label>
                        <input type="range" min="0" max="100" value={config.edgeOpacity} onChange={(e) => onUpdateConfig({ ...config, edgeOpacity: parseInt(e.target.value) })} className="w-full h-1 bg-gray-700 rounded appearance-none accent-blue-500" />
                    </div>
               </div>
               <div className="flex items-center gap-3 pt-1 bg-gray-900/50 p-2 rounded border border-gray-700/50">
                    <label className="text-[10px] text-gray-500 font-semibold uppercase min-w-[30px]">Tint</label>
                    <input 
                      type="color" 
                      value={config.edgeTint} 
                      onChange={(e) => onUpdateConfig({ ...config, edgeTint: e.target.value })} 
                      className="h-8 w-10 rounded cursor-pointer bg-transparent border-none p-0" 
                    />
                    <input type="range" min="0" max="100" value={config.edgeTintIntensity} onChange={(e) => onUpdateConfig({ ...config, edgeTintIntensity: parseInt(e.target.value) })} className="flex-1 h-1 bg-gray-700 rounded appearance-none accent-blue-500" />
               </div>
           </div>
       )}
    </div>
  );
};

export default BackgroundConfigPanel;
