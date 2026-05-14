
import React from 'react';
import { OutlineNode as OutlineNodeType, NodePayload } from '../../../../types';
import { Slider, Section, ColorPicker } from '../../../common/DesignSystem';
import { BitmapView } from '../../../common/BitmapView';

interface OutlineNodeProps {
    node: OutlineNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload;
    output?: NodePayload;
}

export const OutlineNode = React.memo(({ node, onUpdate, input, output }: OutlineNodeProps) => {
    const { color = '#ffffff', thickness = 1, opacity = 1.0, position = 1.0 } = node.data;
    
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
                 <Section title="Outline Settings" defaultOpen={true}>
                     <ColorPicker 
                        label="Color" 
                        value={color} 
                        onChange={(v) => update({ color: v })}
                        accent="gray" 
                     />
                     
                     <Slider 
                        label="Thickness" 
                        min={1} max={20} step={1}
                        value={thickness} 
                        onChange={(v) => update({ thickness: v })} 
                        accent="gray"
                     />
                     
                     <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[9px] text-txt-muted font-medium uppercase">
                            <span>Inner</span>
                            <span>Center</span>
                            <span>Outer</span>
                        </div>
                        <Slider 
                            label="Position" 
                            min={-1} max={1} step={0.1}
                            value={position !== undefined ? position : 1} 
                            onChange={(v) => update({ position: v })} 
                            accent="gray"
                        />
                     </div>

                     <Slider 
                        label="Opacity" 
                        min={0} max={1} step={0.05}
                        value={opacity} 
                        onChange={(v) => update({ opacity: v })} 
                        accent="gray"
                     />
                 </Section>
             </div>
        </div>
    );
});
