
import React, { useState, useMemo } from 'react';
import { ResizeNode as ResizeNodeType, NodePayload } from '../../../../types';
import { NumberInput, Section } from '../../../common/DesignSystem';
import { BitmapView } from '../../../common/BitmapView';
import { Link, Unlink } from 'lucide-react';

interface ResizeNodeProps {
    node: ResizeNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload;
    output?: NodePayload;
}

export const ResizeNode = React.memo(({ node, onUpdate, input, output }: ResizeNodeProps) => {
    // We only care about explicit width/height now.
    const { width, height } = node.data;
    const [lockAspect, setLockAspect] = useState(true);
    
    // Determine Source Dimensions (from Input Atlas/Image)
    const sourceDims = useMemo(() => {
        if (!input) return null;
        if (input.type === 'OPTIMIZATION') return null;
        
        let w = 0, h = 0;
        
        // Priority 1: TIMELINE (Frame Size)
        // If we are resizing a timeline, we usually care about the frame size, not the full atlas
        if (input.type === 'TIMELINE') {
            if (input.frames && input.frames.length > 0 && input.frames[0] instanceof ImageBitmap) {
                w = input.frames[0].width;
                h = input.frames[0].height;
            } else if (input.framesMetadata && input.framesMetadata[0]) {
                w = input.framesMetadata[0].width;
                h = input.framesMetadata[0].height;
            }
        }
        // Priority 2: The Image Bitmap (Atlas)
        else if (input.image instanceof ImageBitmap) {
            w = input.image.width;
            h = input.image.height;
        } 
        // Priority 3: Payload Metadata
        else if (input.type === 'IMAGE') { 
            w = input.width; h = input.height; 
        }
        else if (input.type === 'IMAGE_SEQUENCE') { 
            // If sequence has no atlas loaded yet, fallback to frame size
            w = input.frameWidth; h = input.frameHeight; 
        }

        if (w > 0 && h > 0) return { w, h, ratio: w / h };
        return null;
    }, [input]);

    const update = (updates: any) => {
        onUpdate(node.id, { data: { ...node.data, ...updates } });
    };

    const handleWidthChange = (val: number) => {
        const newW = Math.max(1, val);
        let newH = height;
        
        // If height is not set yet, assume source height
        const currentH = height || (sourceDims ? sourceDims.h : 100);

        if (lockAspect && sourceDims) {
            newH = Math.max(1, Math.round(newW / sourceDims.ratio));
        }
        
        update({ width: newW, height: newH });
    };

    const handleHeightChange = (val: number) => {
        const newH = Math.max(1, val);
        let newW = width;
        
        // If width is not set yet, assume source width
        const currentW = width || (sourceDims ? sourceDims.w : 100);

        if (lockAspect && sourceDims) {
            newW = Math.max(1, Math.round(newH * sourceDims.ratio));
        }
        
        update({ width: newW, height: newH });
    };

    // Determine preview source
    const getPreview = (p?: NodePayload) => {
        if (!p || p.type === 'OPTIMIZATION') return null;
        if (p.type === 'TIMELINE' && p.frames.length > 0) return p.frames[0]; // Show first frame for resize check
        return p.image;
    };
    
    // We prefer output to show the result, but fall back to input frame 0 to show what we are working with
    const previewSrc = getPreview(output) || getPreview(input);

    return (
        <div className="flex flex-col h-full">
             {/* Preview Area - Uses transparency from Wrapper */}
             <div className="flex-1 relative overflow-hidden min-h-0 flex flex-col p-2">
                 <div className="flex-1 bg-black/5 dark:bg-black/50 rounded-lg border border-border-base/10 flex items-center justify-center checkerboard overflow-hidden relative shadow-inner">
                     {previewSrc ? (
                         <BitmapView image={previewSrc} className="max-w-full max-h-full object-contain pixelated" style={{width:'100%', height:'100%', objectFit:'contain'}} />
                     ) : (
                         <span className="text-[9px] text-txt-muted font-medium uppercase tracking-wider">No Preview</span>
                     )}
                     <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-white/90 dark:bg-black/60 text-[8px] text-txt-primary dark:text-gray-400 rounded backdrop-blur-md font-mono pointer-events-none border border-border-base/10 shadow-sm">
                        {width || (sourceDims?.w || 0)}x{height || (sourceDims?.h || 0)}
                     </div>
                 </div>
             </div>

             {/* Controls Area */}
             <div className="p-3 border-t border-border-base/10 space-y-3 shrink-0 bg-surface/30 overflow-y-auto custom-scrollbar">
                 <Section title="Target Dimensions" defaultOpen={true}>
                     <div className="flex items-end gap-2">
                         <div className="flex-1">
                             <NumberInput 
                                label="Width" min={0} 
                                value={width || (sourceDims ? sourceDims.w : 0)} 
                                onChange={handleWidthChange} 
                                accent="cyan"
                            />
                         </div>
                         
                         <button 
                            onClick={() => setLockAspect(!lockAspect)}
                            className={`mb-1 p-1.5 rounded-md transition-all border ${lockAspect ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' : 'bg-surface hover:bg-surface-hover/10 text-txt-muted hover:text-txt-primary border-transparent'}`}
                            title={lockAspect ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
                         >
                             {lockAspect ? <Link size={14} /> : <Unlink size={14} />}
                         </button>

                         <div className="flex-1">
                             <NumberInput 
                                label="Height" min={0} 
                                value={height || (sourceDims ? sourceDims.h : 0)} 
                                onChange={handleHeightChange} 
                                accent="cyan"
                            />
                         </div>
                     </div>
                     
                     {sourceDims && (
                         <div className="text-[9px] text-txt-muted text-center mt-1 font-mono">
                             Original: {sourceDims.w}x{sourceDims.h}
                         </div>
                     )}
                 </Section>
             </div>
        </div>
    );
});
