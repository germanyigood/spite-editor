
import React, { useMemo } from 'react';
import { FrameNormalizeNode as FrameNormalizeNodeType, NodePayload } from '../../../../types';
import { NumberInput, Section, Toggle } from '../../../common/DesignSystem';
import { BitmapView } from '../../../common/BitmapView';
import { Maximize, Minimize, Move, StretchHorizontal } from 'lucide-react';

interface FrameNormalizeNodeProps {
    node: FrameNormalizeNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload;
    output?: NodePayload;
}

export const FrameNormalizeNode = React.memo(({ node, onUpdate, input, output }: FrameNormalizeNodeProps) => {
    const { width = 64, height = 64, fit = 'center' } = node.data;

    const update = (updates: any) => {
        onUpdate(node.id, { data: { ...node.data, ...updates } });
    };

    // Helper to get a preview image
    const getPreview = (p?: NodePayload) => {
        if (!p || p.type === 'OPTIMIZATION') return null;
        // Priority: Preview Frames (Sequence) -> Frames (Timeline) -> Image
        if (p.type === 'IMAGE_SEQUENCE' && p.previewFrames && p.previewFrames.length > 0) return p.previewFrames[0];
        if (p.type === 'TIMELINE' && p.frames && p.frames.length > 0) return p.frames[0];
        return p.image;
    };

    const previewSrc = getPreview(output) || getPreview(input);

    return (
        <div className="flex flex-col h-full">
             {/* Preview */}
             <div className="flex-1 bg-black/5 dark:bg-black/50 relative overflow-hidden min-h-0 flex items-center justify-center checkerboard">
                {previewSrc ? (
                    <div className="relative border border-dashed border-cyan-500/30">
                        <BitmapView image={previewSrc} className="max-w-full max-h-full object-contain pixelated" style={{width: 'auto', height: 'auto'}} />
                        <div className="absolute top-0 right-0 bg-cyan-900/80 text-cyan-200 text-[8px] px-1 pointer-events-none">
                            {width}x{height}
                        </div>
                    </div>
                ) : (
                    <div className="text-txt-muted text-xs italic">Waiting for Input</div>
                )}
             </div>

             {/* Controls */}
             <div className="p-3 border-t border-border-base/10 space-y-3 shrink-0 bg-surface/30 overflow-y-auto custom-scrollbar max-h-[60%]">
                 <Section title="Target Size" defaultOpen={true}>
                     <div className="grid grid-cols-2 gap-2">
                        <NumberInput label="Width" min={1} value={width} onChange={(v) => update({ width: Math.max(1, v) })} accent="cyan" />
                        <NumberInput label="Height" min={1} value={height} onChange={(v) => update({ height: Math.max(1, v) })} accent="cyan" />
                     </div>
                 </Section>

                 <Section title="Fit Strategy" defaultOpen={true}>
                     <div className="grid grid-cols-2 gap-2">
                         <button 
                            onClick={() => update({ fit: 'center' })}
                            className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold uppercase border transition-all ${fit === 'center' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-500' : 'bg-surface/50 border-transparent text-txt-muted hover:bg-surface/80'}`}
                            title="Center: Original size, centered canvas"
                         >
                             <Move size={10}/> Center
                         </button>
                         <button 
                            onClick={() => update({ fit: 'contain' })}
                            className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold uppercase border transition-all ${fit === 'contain' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-500' : 'bg-surface/50 border-transparent text-txt-muted hover:bg-surface/80'}`}
                            title="Contain: Scale to fit inside"
                         >
                             <Minimize size={10}/> Contain
                         </button>
                         <button 
                            onClick={() => update({ fit: 'cover' })}
                            className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold uppercase border transition-all ${fit === 'cover' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-500' : 'bg-surface/50 border-transparent text-txt-muted hover:bg-surface/80'}`}
                            title="Cover: Scale to fill"
                         >
                             <Maximize size={10}/> Cover
                         </button>
                         <button 
                            onClick={() => update({ fit: 'stretch' })}
                            className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold uppercase border transition-all ${fit === 'stretch' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-500' : 'bg-surface/50 border-transparent text-txt-muted hover:bg-surface/80'}`}
                            title="Stretch: Distort to fill"
                         >
                             <StretchHorizontal size={10}/> Stretch
                         </button>
                     </div>
                 </Section>
             </div>
        </div>
    );
});
