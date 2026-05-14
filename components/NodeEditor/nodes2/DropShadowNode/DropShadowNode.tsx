
import React from 'react';
import { DropShadowNode as DropShadowNodeType, NodePayload } from '../../../../types';
import { Slider, Section, ColorPicker, NumberInput } from '../../../common/DesignSystem';
import { BitmapView } from '../../../common/BitmapView';

interface DropShadowNodeProps {
    node: DropShadowNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload;
    output?: NodePayload;
}

export const DropShadowNode = React.memo(({ node, onUpdate, input, output }: DropShadowNodeProps) => {
    const { color = '#000000', alpha = 0.5, blur = 0, x = 5, y = 5 } = node.data;
    
    const update = (updates: any) => {
        onUpdate(node.id, { data: { ...node.data, ...updates } });
    };

    const previewSrc = output 
        ? (output.type === 'IMAGE' ? output.image : (output.type === 'TIMELINE' ? output.image : null))
        : (input && (input.type === 'IMAGE' ? input.image : (input.type === 'TIMELINE' ? input.image : null)));

    return (
        <div className="flex flex-col h-full">
             {/* Preview */}
             <div className="flex-1 bg-black/5 dark:bg-black/50 relative overflow-hidden min-h-0 flex items-center justify-center checkerboard">
                {previewSrc ? (
                    <BitmapView image={previewSrc} className="w-full h-full object-contain" />
                ) : (
                    <div className="text-txt-muted text-xs italic">Waiting for Input</div>
                )}
             </div>

             {/* Controls */}
             <div className="p-3 border-t border-border-base/10 space-y-3 shrink-0 bg-surface/30 overflow-y-auto custom-scrollbar max-h-[60%]">
                 <Section title="Shadow Settings" defaultOpen={true}>
                     <ColorPicker 
                        label="Shadow Color" 
                        value={color} 
                        onChange={(v) => update({ color: v })}
                        accent="gray" 
                     />
                     
                     <Slider 
                        label="Opacity" 
                        min={0} max={1} step={0.05}
                        value={alpha} 
                        onChange={(v) => update({ alpha: v })} 
                        accent="gray"
                     />

                     <div className="grid grid-cols-2 gap-2">
                        <NumberInput 
                            label="Offset X" 
                            value={x} 
                            onChange={(v) => update({ x: v })} 
                            accent="gray"
                        />
                        <NumberInput 
                            label="Offset Y" 
                            value={y} 
                            onChange={(v) => update({ y: v })} 
                            accent="gray"
                        />
                     </div>

                     <Slider 
                        label="Blur Radius" 
                        min={0} max={20} step={1}
                        value={blur} 
                        onChange={(v) => update({ blur: v })} 
                        accent="gray"
                     />
                 </Section>
             </div>
        </div>
    );
});
