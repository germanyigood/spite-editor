
import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { PixelizeNode as PixelizeNodeType, NodePayload, ImageSource } from '../../../../types';
import { Slider, Section } from '../../../common/DesignSystem';
import { BitmapView } from '../../../common/BitmapView';

interface PixelizeNodeProps {
    node: PixelizeNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload;
    output?: NodePayload;
}

export const PixelizeNode = React.memo(({ node, onUpdate, input, output }: PixelizeNodeProps) => {
    // Defaults
    const { pixelSize = 4, mergeThreshold = 0, cleanup = 0, sampling = 'dominant' } = node.data;
    
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
    
    const getImage = (payload: NodePayload | null | undefined) => {
        if (!payload || payload.type === 'OPTIMIZATION') return null;
        return payload.image;
    };
    const previewSrc = getImage(output) || getImage(input);

    const imgDims = useMemo(() => {
        if (!input) return { w: 0, h: 0 };
        if (input.type === 'IMAGE') return { w: input.width, h: input.height };
        if (input.type === 'IMAGE_SEQUENCE') return { w: input.frameWidth, h: input.frameHeight };
        if (input.type === 'TIMELINE' && input.framesMetadata && input.framesMetadata[0]) {
             return { w: input.framesMetadata[0].width, h: input.framesMetadata[0].height };
        }
        if (input.type !== 'OPTIMIZATION' && input.image instanceof ImageBitmap) {
             return { w: input.image.width, h: input.image.height };
        }
        return { w: 0, h: 0 };
    }, [input]);

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver(entries => {
            for (const entry of entries) {
                setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
            }
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    const update = (updates: any) => {
        onUpdate(node.id, { data: { ...node.data, ...updates } });
    };

    const getGridStyle = () => {
        if (!imgDims.w || !imgDims.h || !containerSize.w || !containerSize.h || pixelSize < 2) return { display: 'none' };

        const scaleX = containerSize.w / imgDims.w;
        const scaleY = containerSize.h / imgDims.h;
        const scale = Math.min(scaleX, scaleY);

        const renderW = imgDims.w * scale;
        const renderH = imgDims.h * scale;
        const left = (containerSize.w - renderW) / 2;
        const top = (containerSize.h - renderH) / 2;

        const cssPixelSize = pixelSize * scale;

        if (cssPixelSize < 4) return { display: 'none' };

        return {
            position: 'absolute' as const,
            left: left,
            top: top,
            width: renderW,
            height: renderH,
            backgroundImage: `
                repeating-linear-gradient(90deg, rgba(0,255,255,0.2) 0, rgba(0,255,255,0.2) 1px, transparent 1px, transparent ${cssPixelSize}px),
                repeating-linear-gradient(0deg, rgba(0,255,255,0.2) 0, rgba(0,255,255,0.2) 1px, transparent 1px, transparent ${cssPixelSize}px)
            `,
            backgroundPosition: '0 0',
            pointerEvents: 'none' as const,
            zIndex: 10
        };
    };

    return (
        <div className="flex flex-col h-full">
             {/* Preview */}
             <div ref={containerRef} className="flex-1 bg-black/5 dark:bg-black/50 relative overflow-hidden min-h-0 flex items-center justify-center checkerboard">
                {previewSrc ? (
                    <>
                        <BitmapView image={previewSrc} className="w-full h-full object-contain" />
                        <div style={getGridStyle()} />
                    </>
                ) : (
                    <div className="text-txt-muted text-xs italic">Waiting for Input</div>
                )}
             </div>

             {/* Controls */}
             <div className="p-3 border-t border-border-base/10 space-y-3 shrink-0 bg-surface/30 overflow-y-auto custom-scrollbar max-h-[60%]">
                 <Section title="Downsampling" defaultOpen={true}>
                     
                     <div className="flex gap-2 mb-2">
                         <button 
                            onClick={() => update({ sampling: 'dominant' })}
                            className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase border ${sampling !== 'average' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-600 dark:text-cyan-300' : 'bg-surface/50 border-transparent text-txt-muted hover:bg-surface/80'}`}
                            title="Center Sampling: Preserves details and edges"
                         >
                             Crisp
                         </button>
                         <button 
                            onClick={() => update({ sampling: 'average' })}
                            className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase border ${sampling === 'average' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-600 dark:text-cyan-300' : 'bg-surface/50 border-transparent text-txt-muted hover:bg-surface/80'}`}
                            title="Average Sampling: Blends colors"
                         >
                             Average
                         </button>
                     </div>

                     <Slider 
                        label="Pixel Size" 
                        min={1} max={32} step={1}
                        value={pixelSize} 
                        onChange={(v) => update({ pixelSize: v })} 
                        accent="cyan"
                     />
                 </Section>

                 <Section title="Cleanup" defaultOpen={true}>
                     <Slider 
                        label="Merge Neighbors" 
                        min={0} max={50} step={1}
                        value={mergeThreshold} 
                        onChange={(v) => update({ mergeThreshold: v })} 
                        accent="pink"
                     />
                     <div className="text-[9px] text-txt-muted text-right -mt-2 mb-2">
                         Flattens nearby similar colors
                     </div>

                     <Slider 
                        label="Remove Noise" 
                        min={0} max={10} step={1}
                        value={cleanup} 
                        onChange={(v) => update({ cleanup: v })} 
                        accent="green"
                     />
                     <div className="text-[9px] text-txt-muted text-right -mt-2">
                         Removes orphan pixels
                     </div>
                 </Section>
             </div>
        </div>
    );
});
