import React, { useState } from 'react';
import { PlayCircle, Plus, X } from 'lucide-react';
import { AnimationEntry } from '../../types';

interface AnimationListPanelProps {
  animations: AnimationEntry[];
  activeId: string;
  onSelect: (id: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

const AnimationListPanel: React.FC<AnimationListPanelProps> = ({
  animations,
  activeId,
  onSelect,
  onUpdateName,
  onAdd,
  onRemove
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-gray-400 text-sm uppercase tracking-wider font-bold">
        <div className="flex items-center gap-2"><PlayCircle size={14} /> Animations</div>
        <button onClick={onAdd} className="text-blue-400 hover:text-blue-300"><Plus size={16} /></button>
      </div>
      
      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {animations.map((anim) => (
          <div 
            key={anim.id}
            onClick={() => onSelect(anim.id)}
            onDoubleClick={() => setRenamingId(anim.id)}
            className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-all ${
              activeId === anim.id 
              ? 'bg-blue-900/40 border-blue-500/50' 
              : 'bg-gray-800 border-transparent hover:border-gray-700'
            }`}
          >
             <div className="flex-1 min-w-0">
                {renamingId === anim.id ? (
                    <input 
                      autoFocus
                      defaultValue={anim.name}
                      onBlur={(e) => { onUpdateName(anim.id, e.target.value); setRenamingId(null); }}
                      onKeyDown={(e) => { if(e.key === 'Enter') { onUpdateName(anim.id, (e.target as any).value); setRenamingId(null); } }}
                      className="bg-gray-900 text-sm w-full border border-blue-500 rounded px-1 outline-none"
                    />
                ) : (
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${anim.layers.length > 0 ? 'bg-green-500' : 'bg-gray-600'}`} />
                        <span className="text-sm font-medium text-gray-200 truncate">{anim.name}</span>
                    </div>
                )}
             </div>
             <button onClick={(e) => { e.stopPropagation(); onRemove(anim.id); }} className="text-gray-500 hover:text-red-400 p-1"><X size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnimationListPanel;
