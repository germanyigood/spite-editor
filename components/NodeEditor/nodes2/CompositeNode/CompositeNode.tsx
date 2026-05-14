
import React from 'react';
import { CompositeNode as CompositeNodeType, NodePayload } from '../../../../types';
import { Slider, Section, Toggle } from '../../../common/DesignSystem';
import { BitmapView } from '../../../common/BitmapView';
import { Image as ImageIcon, BoxSelect } from 'lucide-react';

interface CompositeNodeProps {
    node: CompositeNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload; // Not used directly, inputs accessed via prop if passed, but Wrapper standardizes props
    output?: NodePayload;
}

export const CompositeNode = React.memo(({ node, onUpdate, output }: CompositeNodeProps) => {
    const { opacity = 1.0, fit = 'cover' } = node.data;
    
    const update = (updates: any) => {
        onUpdate(node.id, { data: { ...node.data, ...updates } });
    };

    const previewSrc = output?.type === 'IMAGE' ? output.image : null;

    return (
        <div className="flex flex-col h-full">
             {/* Preview */}
             <div className="flex-1 bg-black/5 dark:bg-black/50 relative overflow-hidden min-h-0 flex items-center justify-center checkerboard">
                {previewSrc ? (
                    <BitmapView image={previewSrc} className="w-full h-full object-contain" />
                ) : (
                    <div className="flex flex-col items-center justify-center text-txt-muted opacity-60 gap-2">
                        <ImageIcon size={24} />
                        <span className="text-[10px] uppercase font-bold">Connect Front & Back</span>
                    </div>
                )}
             </div>

             {/* Controls */}
             <div className="p-3 border-t border-border-base/10 space-y-3 shrink-0 bg-surface/30">
                 <Section title="Background Settings" defaultOpen={true}>
                     <div className="flex items-center gap-2 mb-2">
                         {['cover', 'contain', 'stretch'].map((m) => (
                             <button
                                key={m}
                                onClick={() => update({ fit: m })}
                                className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase border transition-all ${
                                    fit === m 
                                    ? 'bg-blue-500/20 text-blue-500 border-blue-500/30'
                                    : 'bg-surface/50 text-txt-muted border-transparent hover:bg-surface-hover/10'
                                }`}
                             >
                                {m}
                             </button>
                         ))}
                     </div>

                     <Slider 
                        label="BG Opacity" 
                        min={0} max={1} step={0.05} 
                        value={opacity} 
                        onChange={(v) => update({ opacity: v })} 
                        accent="blue"
                     />
                 </Section>
             </div>
        </div>
    );
});
