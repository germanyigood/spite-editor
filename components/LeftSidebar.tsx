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
  
  // Handlers
  onDetect: () => void;
  onImportFile: (file: File) => void;
  onUpdateLayers: (layers: SourceLayer[]) => void;
  onRemoveLayer: (id: string) => void;
  
  // Configs
  selectedFrameIndex: number | null;
  onUpdateSpriteConfig: (cfg: SpriteConfig) => void;
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
  onDetect,
  onImportFile,
  onUpdateLayers,
  onRemoveLayer,
  selectedFrameIndex,
  onUpdateSpriteConfig,
  onUpdateGrid,
  onUpdateBgConfig,
  onExport,
  copySuccess
}) => {
  
  const hasLayers = (currentAnim?.layers.length || 0) > 0;

  return (
    <aside className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto shrink-0 custom-scrollbar z-10 pb-10">
      <div className="p-4 space-y-6">
        
        <MagicDetectPanel 
            isProcessing={isProcessing} 
            disabled={!hasLayers} 
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
            onImportFile={onImportFile}
            onRemoveLayer={onRemoveLayer}
        />
        
        <hr className="border-gray-800" />

        {hasLayers ? (
            <>
                <SpriteConfigPanel 
                    config={currentAnim!.spriteConfig}
                    selectedFrameIndex={selectedFrameIndex}
                    onUpdateConfig={onUpdateSpriteConfig}
                    onUpdateGrid={onUpdateGrid}
                />
                
                <hr className="border-gray-800" />

                <BackgroundConfigPanel 
                    config={currentAnim!.bgConfig}
                    onUpdateConfig={onUpdateBgConfig}
                />
            </>
        ) : (
            <div className="p-4 text-center text-gray-500 text-sm border border-dashed border-gray-800 rounded-xl bg-gray-900/50">
                <p>No images loaded.</p>
            </div>
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
