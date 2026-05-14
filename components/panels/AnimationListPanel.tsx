
import React, { useState } from 'react';
import { Plus, X, ChevronDown, ChevronRight, Image as ImageIcon, ScanLine, Trash2, BoxSelect, LayoutTemplate } from 'lucide-react';
import { AnimationEntry, ToolMode } from '../../types';
import { getGraphLayers } from '../../utils';
import { DrawModifierPanel } from './DrawModifierPanel';

interface AnimationListPanelProps {
  animations: AnimationEntry[];
  activeId: string;
  activeLayerId: string | null;
  selectedFrameIndex: number | null;
  selectedLayoutElementId?: string | null;
  toolMode: ToolMode;
  onSelect: (id: string) => void;
  onSelectLayer: (id: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onAddFrame: () => void;
  onDeleteFrame: (index: number) => void;
  onSelectFrame: (index: number) => void;
  onUpdateFrameName: (index: number, name: string) => void;
  onImportFile: (file: File) => void;
  onRemoveLayer: (id: string) => void;
  onSelectLayoutElement?: (id: string | null) => void;
}

const AnimationListPanel: React.FC<AnimationListPanelProps> = ({
  animations, activeId, activeLayerId, selectedFrameIndex, selectedLayoutElementId, toolMode,
  onSelect, onSelectLayer, onUpdateName, onAdd, onRemove, onAddFrame, onDeleteFrame, onSelectFrame, onUpdateFrameName, onImportFile, onRemoveLayer, onSelectLayoutElement
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});

  const toggleLayer = (layerId: string) => {
      setExpandedLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const isDrawMode = toolMode === 'draw';

  return (
    <div className="space-y-3 pb-10">
      <div className="flex items-center justify-between text-txt-muted text-[10px] uppercase tracking-wider font-bold px-1 mb-2">
        <div className="flex items-center gap-2">Animations</div>
        <button onClick={onAdd} title="Add Animation" className="text-indigo-400 hover:text-indigo-300 p-1.5 hover:bg-surface/20 rounded-md transition-colors"><Plus size={14} /></button>
      </div>
      
      <div className="space-y-1">
        {animations.map((anim) => {
          const isActive = activeId === anim.id;
          const layoutElements = anim.layout?.elements || [];
          const sourceLayers = getGraphLayers(anim.nodeGraph);
          
          return (
            <div key={anim.id} className="space-y-1">
              <div onClick={() => onSelect(anim.id)} onDoubleClick={() => setRenamingId(anim.id)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all duration-300 group select-none ${
                  isActive ? 'bg-indigo-600/20 border-indigo-500/30 text-txt-primary' : 'bg-transparent border-transparent hover:bg-surface/30 text-txt-secondary'
                }`}>
                 <div className="flex-1 min-w-0 flex items-center gap-2">
                    {isActive ? <ChevronDown size={14} className="text-indigo-500 shrink-0"/> : <ChevronRight size={14} className="text-txt-muted shrink-0"/>}
                    {renamingId === anim.id ? (
                        <input autoFocus defaultValue={anim.name} onBlur={(e) => { onUpdateName(anim.id, e.target.value); setRenamingId(null); }}
                          onKeyDown={(e) => { if(e.key === 'Enter') { onUpdateName(anim.id, (e.target as any).value); setRenamingId(null); } }}
                          className="bg-surface/80 text-xs w-full border border-indigo-500 rounded px-1.5 py-0.5 outline-none text-txt-primary"
                        />
                    ) : (
                        <span className="text-xs font-semibold truncate">{anim.name}</span>
                    )}
                 </div>
                 <button onClick={(e) => { e.stopPropagation(); onRemove(anim.id); }} className="text-txt-muted hover:text-red-500 p-1 opacity-0 group-hover:opacity-100"><X size={12} /></button>
              </div>

              {isActive && (
                <div className="ml-2 pl-2 border-l border-border-base/10 mt-1 space-y-1">
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs text-txt-muted hover:text-cyan-500 hover:bg-surface/30 border border-dashed border-border-base/10 transition-all mb-2">
                        <Plus size={12} /> Add Layer
                        <input type="file" className="hidden" onChange={(e) => e.target.files && onImportFile(e.target.files[0])} />
                    </label>

                    {layoutElements.map(el => (
                        <div key={el.id} onClick={(e) => { e.stopPropagation(); onSelectLayoutElement?.(el.id); }}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${selectedLayoutElementId === el.id ? 'bg-amber-500/20 text-amber-600 dark:text-amber-200' : 'text-txt-secondary hover:bg-surface/30'}`}>
                            <div className="w-3.5" />
                            {el.type === 'box' && <BoxSelect size={12} className="opacity-50" />}
                            {el.type === 'slice9' && <LayoutTemplate size={12} className="opacity-50" />}
                            <span className="truncate flex-1">{el.name}</span>
                        </div>
                    ))}

                    {sourceLayers.map(({source, slice}) => {
                        const layerId = source.id;
                        const frames = slice?.data?.frames || [];
                        const isLayerActive = activeLayerId === layerId;
                        const isExpanded = expandedLayers[layerId] ?? isLayerActive;

                        return (
                            <div key={layerId}>
                                <div onClick={(e) => { e.stopPropagation(); onSelectLayer(layerId); }}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors group/layer ${isLayerActive ? 'bg-surface/50 text-cyan-600 dark:text-cyan-200 font-medium' : 'text-txt-secondary hover:bg-surface/30'}`}>
                                    <div className="w-3.5 flex justify-center cursor-pointer hover:text-white text-txt-muted" onClick={(e) => { e.stopPropagation(); toggleLayer(layerId); }}>
                                        {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                    </div>
                                    <ImageIcon size={12} className={isLayerActive ? 'text-cyan-500' : 'opacity-50'} />
                                    <span className="truncate flex-1">{source.data.name || 'Layer'}</span>
                                    <button onClick={(e) => { e.stopPropagation(); onRemoveLayer(layerId); }} className="opacity-0 group-hover/layer:opacity-100 text-red-400 hover:bg-red-500/20 p-1 rounded"><Trash2 size={10} /></button>
                                </div>

                                {isExpanded && (
                                    <div className="flex flex-col pl-6 pr-1 py-1 mb-1 border-l border-border-base/10 ml-2">
                                        {isDrawMode && isLayerActive ? (
                                            <DrawModifierPanel layerId={layerId} />
                                        ) : (
                                            <>
                                                {frames.map((frame, idx) => (
                                                    <div key={idx} onClick={(e) => { e.stopPropagation(); onSelectFrame(idx); }}
                                                        className={`group/frame flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-[11px] border ${selectedFrameIndex === idx ? 'bg-indigo-500/20 border-indigo-500/30 text-white' : 'bg-transparent border-transparent text-txt-muted hover:text-txt-secondary'}`}>
                                                        <ScanLine size={10} className="opacity-30"/>
                                                        <span className="truncate flex-1">{frame.name || `Frame ${idx}`}</span>
                                                    </div>
                                                ))}
                                                <button onClick={(e) => { e.stopPropagation(); onAddFrame(); }} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] text-txt-muted hover:text-indigo-500 transition-all">
                                                    <Plus size={10} /> Add Frame
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnimationListPanel;
