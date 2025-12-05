import React from 'react';
import { Move, RotateCcw, Grid } from 'lucide-react';
import { SpriteConfig } from '../../types';

interface SpriteConfigPanelProps {
  config: SpriteConfig;
  selectedFrameIndex: number | null;
  onUpdateConfig: (newConfig: SpriteConfig) => void;
  onUpdateGrid: (key: keyof SpriteConfig, value: number) => void;
}

const SpriteConfigPanel: React.FC<SpriteConfigPanelProps> = ({ 
  config, 
  selectedFrameIndex, 
  onUpdateConfig, 
  onUpdateGrid 
}) => {
  
  const updateOffset = (idx: number, key: 'x' | 'y' | 'w' | 'h', value: number) => {
      const newOffsets = { ...config.frameOffsets };
      const cur = newOffsets[idx] || { x: 0, y: 0 };
      newOffsets[idx] = { ...cur, [key]: value };
      onUpdateConfig({ ...config, frameOffsets: newOffsets });
  };

  const resetOffset = (idx: number) => {
      const newOffsets = { ...config.frameOffsets };
      delete newOffsets[idx];
      onUpdateConfig({ ...config, frameOffsets: newOffsets });
  };

  return (
    <>
        {/* Frame Properties */}
        {selectedFrameIndex !== null && (
            <div className="p-3 bg-cyan-900/10 border border-cyan-500/30 rounded-lg space-y-3 animate-in fade-in slide-in-from-left-2 mb-4">
                <div className="flex items-center justify-between text-cyan-400 text-xs font-bold uppercase">
                    <div className="flex items-center gap-1"><Move size={12}/> Frame #{selectedFrameIndex + 1}</div>
                    <button 
                        onClick={() => resetOffset(selectedFrameIndex)}
                        className="p-1 hover:bg-cyan-900/40 rounded text-cyan-300"
                        title="Reset Offset"
                    >
                        <RotateCcw size={12} />
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {/* Offsets */}
                    <div className="space-y-1">
                        <label className="text-[10px] text-cyan-200/70 block">Offset X</label>
                        <input 
                            type="number" 
                            value={config.frameOffsets[selectedFrameIndex]?.x || 0}
                            onChange={(e) => updateOffset(selectedFrameIndex, 'x', parseFloat(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs focus:border-cyan-500 outline-none font-mono"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-cyan-200/70 block">Offset Y</label>
                        <input 
                            type="number" 
                            value={config.frameOffsets[selectedFrameIndex]?.y || 0}
                            onChange={(e) => updateOffset(selectedFrameIndex, 'y', parseFloat(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs focus:border-cyan-500 outline-none font-mono"
                        />
                    </div>

                    {/* Dimensions */}
                    <div className="space-y-1">
                        <label className="text-[10px] text-cyan-200/70 block">Width (px)</label>
                        <input 
                            type="number" 
                            min="1"
                            value={config.frameOffsets[selectedFrameIndex]?.w ?? config.width}
                            onChange={(e) => updateOffset(selectedFrameIndex, 'w', Math.max(1, parseFloat(e.target.value)))}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs focus:border-cyan-500 outline-none font-mono"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-cyan-200/70 block">Height (px)</label>
                        <input 
                            type="number" 
                            min="1"
                            value={config.frameOffsets[selectedFrameIndex]?.h ?? config.height}
                            onChange={(e) => updateOffset(selectedFrameIndex, 'h', Math.max(1, parseFloat(e.target.value)))}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs focus:border-cyan-500 outline-none font-mono"
                        />
                    </div>
                </div>
            </div>
        )}
        
        {/* Grid Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm uppercase tracking-wider font-bold"><Grid size={14} /> Grid Layout</div>
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                  <label className="text-xs text-gray-500">Rows</label>
                  <input type="number" min="1" value={config.rows} onChange={(e) => onUpdateGrid('rows', parseInt(e.target.value)||1)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm outline-none" />
              </div>
              <div className="space-y-1">
                  <label className="text-xs text-gray-500">Cols</label>
                  <input type="number" min="1" value={config.cols} onChange={(e) => onUpdateGrid('cols', parseInt(e.target.value)||1)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm outline-none" />
              </div>
          </div>
           <div className="space-y-1 pt-2">
                <label className="text-xs text-gray-500">Offset (X / Y) & Margin</label>
                <div className="flex gap-2">
                <input type="number" value={config.offsetX} onChange={(e) => onUpdateConfig({...config, offsetX: parseInt(e.target.value)||0})} className="w-1/3 bg-gray-800 border border-gray-700 rounded p-2 text-sm outline-none" placeholder="X" />
                <input type="number" value={config.offsetY} onChange={(e) => onUpdateConfig({...config, offsetY: parseInt(e.target.value)||0})} className="w-1/3 bg-gray-800 border border-gray-700 rounded p-2 text-sm outline-none" placeholder="Y" />
                <input type="number" value={config.margin} onChange={(e) => onUpdateConfig({...config, margin: parseInt(e.target.value)||0})} className="w-1/3 bg-gray-800 border border-gray-700 rounded p-2 text-sm outline-none" placeholder="Gap" />
                </div>
            </div>
        </div>
    </>
  );
};

export default SpriteConfigPanel;
