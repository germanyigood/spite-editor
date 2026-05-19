
import React from 'react';
import AnimationListPanel from './panels/AnimationListPanel';
import ExportPanel from './panels/ExportPanel';
import SpriteConfigPanel from './panels/SpriteConfigPanel';
import { useProject } from '../context/ProjectContext';
import { createDefaultGraph } from '../context/ProjectContext';
import { Frame, SpriteConfig } from '../types';
import { getGraphLayers, generateGridFrames } from '../utils';
import { ExportType } from './panels/ExportPanel';

interface LeftSidebarProps {
  onImportFile: (file: File) => void;
  onExport: (type: ExportType, packAsArchive?: boolean) => void;
  copySuccess: boolean;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ onImportFile, onExport, copySuccess }) => {
  const { state, dispatch } = useProject();
  const { animations, activeAnimationId, activeLayerId, selectedFrameIndex, selectedLayoutElementId, toolMode } = state;
  const currentAnim = animations.find(a => a.id === activeAnimationId);
  
  const layers = currentAnim ? getGraphLayers(currentAnim.nodeGraph) : [];
  const activePair = layers.find(p => p.source.id === activeLayerId);
  const activeSpriteConfig = activePair?.slice?.data;

  const handleAddAnim = () => {
      const id = `anim_${Date.now()}`;
      dispatch({ type: 'ADD_ANIMATION', payload: { id, name: 'New Anim', nodeGraph: createDefaultGraph(), layout: { elements: [] } } });
  };

  const handleAddFrame = () => {
    if (!currentAnim || !activeLayerId || !activeSpriteConfig) { alert("Select a layer first"); return; }
    const newTotal = activeSpriteConfig.totalFrames + 1;
    const w = activeSpriteConfig.width || 64;
    const h = activeSpriteConfig.height || 64;
    const newFrame: Frame = { id: Date.now(), x: 0, y: 0, width: w, height: h, name: `Frame ${newTotal - 1}` };
    const newFrames = [...(activeSpriteConfig.frames || []), newFrame];
    dispatch({ type: 'UPDATE_LAYER', payload: { animId: currentAnim.id, layerId: activeLayerId, updates: { spriteConfig: { ...activeSpriteConfig, totalFrames: newTotal, frames: newFrames } }, resetTimeline: true } });
    dispatch({ type: 'SELECT_FRAME', payload: newFrames.length - 1 });
  };

  const handleDeleteFrame = (index: number) => {
    if (!currentAnim || !activeLayerId || !activeSpriteConfig) return;
    const newFrames = [...(activeSpriteConfig.frames || [])];
    if (index >= 0 && index < newFrames.length) {
        newFrames.splice(index, 1);
        dispatch({ type: 'UPDATE_LAYER', payload: { animId: currentAnim.id, layerId: activeLayerId, updates: { spriteConfig: { ...activeSpriteConfig, totalFrames: newFrames.length, frames: newFrames } }, resetTimeline: true } });
        dispatch({ type: 'SELECT_FRAME', payload: null });
    }
  };

  const handleUpdateFrameName = (index: number, name: string) => {
      if (!currentAnim || !activeLayerId || !activeSpriteConfig) return;
      const newFrames = [...(activeSpriteConfig.frames || [])];
      if (newFrames[index]) {
          newFrames[index] = { ...newFrames[index], name };
          dispatch({ type: 'UPDATE_LAYER', payload: { animId: currentAnim.id, layerId: activeLayerId, updates: { spriteConfig: { ...activeSpriteConfig, frames: newFrames } }, resetTimeline: false } });
      }
  };

  const handleUpdateConfig = (newConfig: SpriteConfig) => {
      if (!currentAnim || !activeLayerId) return;
      dispatch({ type: 'UPDATE_LAYER', payload: { animId: currentAnim.id, layerId: activeLayerId, updates: { spriteConfig: newConfig }, resetTimeline: false } });
  };

  const handleUpdateGrid = (key: keyof SpriteConfig, value: number) => {
      if (!activeSpriteConfig) return;
      const nc = { ...activeSpriteConfig, [key]: value };
      if (['rows', 'cols', 'offsetX', 'offsetY', 'margin'].includes(key)) {
          nc.frames = generateGridFrames(nc.rows, nc.cols, nc.width, nc.height, nc.offsetX, nc.offsetY, nc.margin);
          nc.totalFrames = nc.rows * nc.cols;
      }
      handleUpdateConfig(nc);
  };

  return (
    <aside className="w-80 bg-panel/60 backdrop-blur-2xl border-r border-border-base/10 flex flex-col shrink-0 z-20 shadow-[10px_0_30px_rgba(0,0,0,0.05)] relative transition-colors duration-300">
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
            <AnimationListPanel 
                animations={animations}
                activeId={activeAnimationId}
                activeLayerId={activeLayerId}
                selectedFrameIndex={selectedFrameIndex}
                selectedLayoutElementId={selectedLayoutElementId}
                toolMode={toolMode}
                onSelect={(id) => dispatch({ type: 'SELECT_ANIMATION', payload: id })}
                onSelectLayer={(id) => dispatch({ type: 'SELECT_LAYER', payload: id })}
                onSelectLayoutElement={(id) => dispatch({ type: 'SELECT_LAYOUT_ELEMENT', payload: id })}
                onUpdateName={(id, name) => dispatch({ type: 'UPDATE_ANIMATION', payload: { id, updates: { name } } })}
                onAdd={handleAddAnim}
                onRemove={(id) => dispatch({ type: 'REMOVE_ANIMATION', payload: id })}
                onAddFrame={handleAddFrame}
                onDeleteFrame={handleDeleteFrame}
                onSelectFrame={(idx) => dispatch({ type: 'SELECT_FRAME', payload: idx })}
                onUpdateFrameName={handleUpdateFrameName}
                onImportFile={onImportFile}
                onRemoveLayer={(id) => currentAnim && dispatch({ type: 'REMOVE_LAYER', payload: { animId: currentAnim.id, layerId: id } })}
            />

            {toolMode !== 'draw' && activeSpriteConfig && (
                <div className="pt-2 border-t border-border-base/10">
                    <SpriteConfigPanel 
                        config={activeSpriteConfig}
                        selectedFrameIndex={selectedFrameIndex}
                        onUpdateConfig={handleUpdateConfig}
                        onUpdateGrid={handleUpdateGrid}
                    />
                </div>
            )}
        </div>
      </div>

      <div className="shrink-0 p-5 border-t border-border-base/10 bg-panel/40 relative z-10">
            <ExportPanel onExport={onExport} copySuccess={copySuccess} disabled={layers.length === 0} />
      </div>
    </aside>
  );
};

export default LeftSidebar;
