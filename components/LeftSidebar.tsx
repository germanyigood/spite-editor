
import React from 'react';
import MagicDetectPanel from './panels/MagicDetectPanel';
import AnimationListPanel from './panels/AnimationListPanel';
import LayerListPanel from './panels/LayerListPanel';
import SpriteConfigPanel from './panels/SpriteConfigPanel';
import BackgroundConfigPanel from './panels/BackgroundConfigPanel';
import ExportPanel from './panels/ExportPanel';
import { AnimationEntry, BackgroundRemovalConfig, SourceLayer, SpriteConfig } from '../types';

interface LeftSidebarProps {
  // Global / Processing
  isProcessing: boolean;
  
  // Animation List Props
  animations: AnimationEntry[];
  activeAnimationId: string;
  onSelectAnim: (id: string) => void;
  onRenameAnim: (id: string, name: string) => void;
  onAddAnim: () => void;
  onRemoveAnim: (id: string) => void;

  // Current Animation Props
  currentAnim: AnimationEntry | undefined;
  
  // Layer Props
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  
  // Handlers
  onDetect: () => void;
  onImportFile: (file: File) => void;
  onUpdateLayers: (layers: SourceLayer[]) => void;
  onRemoveLayer: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<SourceLayer>) => void;
  
  // Configs
  selectedFrameIndex: number | null;
  // onUpdateSpriteConfig: (cfg: SpriteConfig) => void; // Deprecated, use onUpdateLayer
  onUpdateGrid: (key: keyof SpriteConfig, value: number) => void;
  onUpdateBgConfig: (cfg: BackgroundRemovalConfig) => void;

  // Exports
  onExport: (type: 'download' | 'clipboard' | 'json' | 'ts' | 'project') => void;
  copySuccess: boolean;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isProcessing,
  animations,
  activeAnimationId,
  onSelectAnim,
  onRenameAnim,
  onAddAnim,
  onRemoveAnim,
  currentAnim,
  activeLayerId,
  onSelectLayer,
  onDetect,
  onImportFile,
  onUpdateLayers,
  onRemoveLayer,
  onUpdateLayer,
  selectedFrameIndex,
  onUpdateGrid,
  onUpdateBgConfig,
  onExport,
  copySuccess
}) => {
  
  const hasLayers = (currentAnim?.layers.length || 0) > 0;
  
  // Determine active config based on selected layer
  const activeLayer = currentAnim?.layers.find(l => l.id === activeLayerId);
  const activeSpriteConfig = activeLayer?.spriteConfig;

  return (
    <aside className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto shrink-0 custom-scrollbar z-10 pb-10">
      <div className="p-4 space-y-6">
        
        <MagicDetectPanel 
            isProcessing={isProcessing} 
            disabled={!hasLayers || !activeLayerId} 
            onDetect={onDetect} 
        />

        <AnimationListPanel 
            animations={animations}
            activeId={activeAnimationId}
            onSelect={onSelectAnim}
            onUpdateName={onRenameAnim}
            onAdd={onAddAnim}
            onRemove={onRemoveAnim}
        />

        <LayerListPanel 
            layers={currentAnim?.layers || []}
            activeLayerId={activeLayerId}
            onSelectLayer={onSelectLayer}
            onImportFile={onImportFile}
            onRemoveLayer={onRemoveLayer}
        />
        
        <hr className="border-gray-800" />

        {activeLayer && activeSpriteConfig ? (
            <>
                <div className="text-xs text-cyan-500 font-semibold uppercase px-2 mb-2">
                    Editing: {activeLayer.name}
                </div>
                <SpriteConfigPanel 
                    config={activeSpriteConfig}
                    selectedFrameIndex={selectedFrameIndex}
                    onUpdateConfig={(newConfig) => onUpdateLayer(activeLayer.id, { spriteConfig: newConfig })}
                    onUpdateGrid={onUpdateGrid}
                />
            </>
        ) : (
            <div className="p-4 text-center text-gray-500 text-sm border border-dashed border-gray-800 rounded-xl bg-gray-900/50">
                <p>{hasLayers ? "Select a layer to edit grid." : "No images loaded."}</p>
            </div>
        )}
        
        {hasLayers && (
            <>
                <hr className="border-gray-800" />
                <BackgroundConfigPanel 
                    config={currentAnim!.bgConfig}
                    onUpdateConfig={onUpdateBgConfig}
                />
            </>
        )}
        
        <hr className="border-gray-800" />

        <ExportPanel 
            onExport={onExport}
            copySuccess={copySuccess}
            disabled={!hasLayers}
        />

      </div>
    </aside>
  );
};

export default LeftSidebar;
