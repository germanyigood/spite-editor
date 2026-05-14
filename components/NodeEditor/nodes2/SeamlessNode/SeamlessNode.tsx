
import React, { useState, useEffect } from 'react';
import { SeamlessNode as SeamlessNodeType, NodePayload, ImageSource } from '../../../../types';
import { Slider, Section, Toggle } from '../../../common/DesignSystem';
import { BitmapView } from '../../../common/BitmapView';
import { Grid3X3, Dna } from 'lucide-react';

interface SeamlessNodeProps {
    node: SeamlessNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload;
    output?: NodePayload;
}

export const SeamlessNode = React.memo(({ node, onUpdate, input, output }: SeamlessNodeProps) => {
    const { overlap = 0.5, mode = 'patch', chaos = 0.0 } = node.data;
    const [previewSrc, setPreviewSrc] = useState<ImageSource | null>(null);

    useEffect(() => {
        const payload = output || input;
        if (payload) {
             if (payload.type === 'IMAGE') {
                 setPreviewSrc(payload.image);
             } else if ((payload.type === 'TIMELINE' || payload.type === 'IMAGE_SEQUENCE') && payload.image) {
                 setPreviewSrc(payload.image);
             }
        } else {
            setPreviewSrc(null);
        }
    }, [input, output]);

    const update = (updates: any) => {
        onUpdate(node.id, { data: { ...node.data, ...updates } });
    };

    const toggleMode = (isMirror: boolean) => {
        update({ mode: isMirror ? 'mirror' : 'patch' });
    };

    return (
        <div className="flex flex-col h-full">
             {/* Preview */}
             <div className="flex-1 bg-black/5 dark:bg-black/50 relative overflow-hidden min-h-0 flex items-center justify-center checkerboard">
                {previewSrc ? (
                    <div className="w-full h-full p-2">
                        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden relative">
                             <BitmapView image={previewSrc} className="w-full h-full object-fill" />
                             <BitmapView image={previewSrc} className="w-full h-full object-fill" />
                             <BitmapView image={previewSrc} className="w-full h-full object-fill" />
                             <BitmapView image={previewSrc} className="w-full h-full object-fill" />
                             <div className="absolute inset-0 border-2 border-white/20 pointer-events-none rounded-lg" />
                             <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1 rounded backdrop-blur">2x2 Tile Preview</div>
                        </div>
                    </div>
                ) : (
                    <div className="text-txt-muted text-xs italic">Waiting for Input</div>
                )}
             </div>

             {/* Controls */}
             <div className="p-3 border-t border-border-base/10 space-y-3 shrink-0 bg-surface/30 overflow-y-auto custom-scrollbar max-h-[50%]">
                 <div className="flex items-center gap-2 mb-2">
                     <button 
                        onClick={() => toggleMode(false)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all border ${
                            mode === 'patch' 
                            ? 'bg-pink-500/20 text-pink-600 dark:text-pink-300 border-pink-500/30' 
                            : 'bg-surface/50 text-txt-muted border-border-base/10 hover:bg-surface-hover/10'
                        }`}
                     >
                        <Grid3X3 size={12} /> Patch
                     </button>
                     <button 
                        onClick={() => toggleMode(true)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all border ${
                            mode === 'mirror' 
                            ? 'bg-pink-500/20 text-pink-600 dark:text-pink-300 border-pink-500/30' 
                            : 'bg-surface/50 text-txt-muted border-border-base/10 hover:bg-surface-hover/10'
                        }`}
                     >
                        <Dna size={12} /> Mirror
                     </button>
                 </div>

                 {mode === 'patch' && (
                     <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                         <Slider 
                            label="Center Blend" 
                            min={0.1} max={1.5} step={0.1} 
                            value={overlap} 
                            onChange={(v) => update({ overlap: v })} 
                            accent="pink"
                         />
                         
                         <Slider 
                            label="Chaos (Hide Seams)" 
                            min={0} max={1} step={0.05} 
                            value={chaos} 
                            onChange={(v) => update({ chaos: v })} 
                            accent="pink"
                         />
                         
                         <p className="text-[9px] text-txt-muted leading-tight">
                            "Chaos" randomly splats parts of the texture over the seams to hide the cross.
                         </p>
                     </div>
                 )}

                 {mode === 'mirror' && (
                     <p className="text-[9px] text-txt-muted leading-tight p-2 bg-surface/20 rounded">
                         Mirror mode shrinks the image and tiles it 2x2 with mirroring. This guarantees perfect seamlessness but creates a kaleidoscope effect.
                     </p>
                 )}
             </div>
        </div>
    );
});
