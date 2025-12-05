
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
        <div className="flex items-center justify-between text-gray-400 text-sm uppercase tracking-wider font-bold">
            <div className="flex items-center gap-2"><Layers size={14} /> Layers</div>
            <label className="cursor-pointer hover:text-blue-400">
                <ImagePlus size={14}/>
                <input type="file" className="hidden" onChange={(e) => e.target.files && onImportFile(e.target.files[0])} />
            </label>
        </div>
        <div className="space-y-1">
            {layers.map((layer) => (
                <div 
                    key={layer.id} 
                    onClick={() => onSelectLayer(layer.id)}
                    className={`flex items-center gap-2 p-2 rounded text-xs group border cursor-pointer
                        ${activeLayerId === layer.id ? 'bg-blue-900/40 border-blue-500/50' : 'bg-gray-800 border-transparent hover:border-gray-600'}
                    `}
                >
                    <img src={layer.imageSrc} className="w-8 h-8 object-cover rounded bg-black/20" alt="layer" />
                    <span className="truncate flex-1 text-gray-300">{layer.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                    >
                        <Trash2 size={12}/>
                    </button>
                </div>
            ))}
            {layers.length === 0 && <div className="text-gray-600 text-xs italic px-2">No source images</div>}
        </div>
    </div>
  );
};

export default LayerListPanel;
