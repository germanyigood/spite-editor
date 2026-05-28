
import React from 'react';
import { Move, RotateCcw, CopyPlus } from 'lucide-react';
import { SpriteConfig, Frame, AnimationEntry, SourceNode } from '../../types';
import { NumberInput } from '../common/DesignSystem';
import { useProject } from '../../context/ProjectContext';
import { loadBitmap } from '../../utils';

interface SpriteConfigPanelProps {
  config: SpriteConfig;
  selectedFrameIndex: number | null;
  onUpdateConfig: (newConfig: SpriteConfig) => void;
  onUpdateGrid: (key: keyof SpriteConfig, value: number) => void;
}

const SpriteConfigPanel: React.FC<SpriteConfigPanelProps> = ({ 
  config, 
  selectedFrameIndex, 
  onUpdateConfig
}) => {
  const { state, dispatch } = useProject();
  const { animations, activeAnimationId, activeLayerId } = state;
  const entry = animations.find(a => a.id === activeAnimationId);

  const updateFrame = (idx: number, key: keyof Frame, value: string | number) => {
      if (!config.frames) return;
      const newFrames = [...config.frames];
      if (newFrames[idx]) {
          newFrames[idx] = { ...newFrames[idx], [key]: value };
          onUpdateConfig({ ...config, frames: newFrames });
      }
  };

  const resetFrame = (idx: number) => {
      if (!config.frames) return;
      const r = Math.floor(idx / config.cols);
      const c = idx % config.cols;
      const x = config.offsetX + c * (config.width + config.margin);
      const y = config.offsetY + r * (config.height + config.margin);
      const newFrames = [...config.frames];
      if (newFrames[idx]) {
          newFrames[idx] = { ...newFrames[idx], x, y, width: config.width, height: config.height };
          onUpdateConfig({ ...config, frames: newFrames });
      }
  };

  const handleExtract = async () => {
    if (selectedFrameIndex === null || !entry || !activeLayerId) return;
    const layer = entry.nodeGraph.nodes.find(n => n.id === activeLayerId) as SourceNode;
    if (!layer || !layer.data.src) return;

    const frame = config.frames[selectedFrameIndex];
    try {
        const bmp = await loadBitmap(layer.data.src);
        const canvas = document.createElement('canvas');
        canvas.width = frame.width;
        canvas.height = frame.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(bmp, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
        
        const dataUrl = canvas.toDataURL();
        
        // Calculate World Coordinates
        const worldX = (layer.data.x || 0) + frame.x;
        const worldY = (layer.data.y || 0) + frame.y;

        dispatch({
            type: 'ADD_LAYER',
            payload: {
                animId: entry.id,
                layer: {
                    name: `${layer.data.name}_part`,
                    imageSrc: dataUrl,
                    width: frame.width,
                    height: frame.height,
                    x: worldX,
                    y: worldY,
                    spriteConfig: {
                        rows: 1, cols: 1, margin: 0, offsetX: 0, offsetY: 0,
                        totalFrames: 1, showCrosshair: false,
                        width: frame.width, height: frame.height,
                        frames: [{ id: 0, x: 0, y: 0, width: frame.width, height: frame.height, name: 'Frame 0' }]
                    }
                }
            }
        });
    } catch (e) {
        console.error("Extraction failed", e);
    }
  };

  const selectedFrame = selectedFrameIndex !== null && config.frames ? config.frames[selectedFrameIndex] : null;

  if (!selectedFrame) {
      return (
          <div className="p-6 text-center border-t border-border-base/10 bg-surface/5">
              <span className="text-[10px] text-txt-muted font-medium uppercase tracking-wide">Select a frame to edit</span>
          </div>
      );
  }

  return (
    <div className="p-4 bg-surface/30 border-t border-border-base/10 space-y-3 backdrop-blur-sm">
        <div className="flex items-center justify-between text-indigo-400 text-xs font-bold uppercase tracking-wider pb-2 border-b border-border-base/5">
            <div className="flex flex-1 items-center gap-2 truncate pr-2"><Move size={14} className="shrink-0"/> <span className="truncate uppercase">{selectedFrame.name || `Frame #${selectedFrameIndex}`}</span></div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleExtract}
                    className="p-1.5 hover:bg-surface rounded-lg text-cyan-400 hover:text-cyan-300 transition-colors"
                    title="Extract to New Layer"
                >
                    <CopyPlus size={14} />
                </button>
                <button 
                    onClick={() => resetFrame(selectedFrameIndex!)}
                    className="p-1.5 hover:bg-surface rounded-lg text-txt-muted hover:text-txt-primary transition-colors"
                    title="Reset to Grid Layout"
                >
                    <RotateCcw size={12} />
                </button>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Pos X" value={selectedFrame.x} onChange={(v) => updateFrame(selectedFrameIndex!, 'x', v)} accent="indigo" />
            <NumberInput label="Pos Y" value={selectedFrame.y} onChange={(v) => updateFrame(selectedFrameIndex!, 'y', v)} accent="indigo" />
            <NumberInput label="Width" min={1} value={selectedFrame.width} onChange={(v) => updateFrame(selectedFrameIndex!, 'width', Math.max(1, v))} accent="indigo" />
            <NumberInput label="Height" min={1} value={selectedFrame.height} onChange={(v) => updateFrame(selectedFrameIndex!, 'height', Math.max(1, v))} accent="indigo" />
        </div>
    </div>
  );
};

export default SpriteConfigPanel;
