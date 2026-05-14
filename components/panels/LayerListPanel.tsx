
import React from 'react';
import { Layers, ImagePlus, Trash2 } from 'lucide-react';
import { SourceLayer } from '../../types';

interface LayerListPanelProps {
  layers: SourceLayer[];
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onImportFile: (file: File) => void;
  onRemoveLayer: (id: string) => void;
}

const LayerListPanel: React.FC<LayerListPanelProps> = ({ 
    layers, 
    activeLayerId,
    onSelectLayer, 
    onImportFile, 
    onRemoveLayer 
}) => {
  return (
    <div className="space-y-3">
        <div className="flex items-center justify-between text-txt-muted text-[10px] uppercase tracking-wider font-bold px-1 mb-2">
            <div className="flex items-center gap-2">Images</div>
            <label className="cursor-pointer text-cyan-500 hover:text-cyan-400 hover:bg-surface/20 p-1.5 rounded-md transition-colors">
                <ImagePlus size={14}/>
                <input type="file" className="hidden" onChange={(e) => e.target.files && onImportFile(e.target.files[0])} />
            </label>
        </div>
        <div className="space-y-2">
            {layers.map((layer) => (
                <div 
                    key={layer.id} 
                    onClick={() => onSelectLayer(layer.id)}
                    className={`flex items-center gap-3 p-2 rounded-xl text-xs group border cursor-pointer transition-all duration-300
                        ${activeLayerId === layer.id 
                            ? 'bg-gradient-to-r from-cyan-600/20 to-cyan-600/5 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
                            : 'bg-surface/30 border-border-base/5 hover:border-border-base/20 hover:bg-surface/50'
                        }
                    `}
                >
                    <div className="w-10 h-10 rounded-lg bg-black/10 dark:bg-black/50 border border-border-base/10 overflow-hidden shrink-0 flex items-center justify-center checkerboard shadow-inner">
                        <img src={layer.imageSrc} className="w-full h-full object-contain" alt="layer" />
                    </div>
                    <span className={`truncate flex-1 font-medium text-xs ${activeLayerId === layer.id ? 'text-txt-primary' : 'text-txt-secondary group-hover:text-txt-primary'}`}>{layer.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                      className="opacity-0 group-hover:opacity-100 text-txt-muted hover:text-red-500 p-1.5 hover:bg-surface/50 rounded-md transition-all"
                    >
                        <Trash2 size={12}/>
                    </button>
                </div>
            ))}
            {layers.length === 0 && (
                <div className="text-txt-muted text-[10px] italic px-6 py-6 text-center border-2 border-dashed border-border-base/10 rounded-2xl bg-surface/10">
                    <div className="mb-1">No images</div>
                    <span className="opacity-50">Drag & drop or click +</span>
                </div>
            )}
        </div>
    </div>
  );
};

export default LayerListPanel;
