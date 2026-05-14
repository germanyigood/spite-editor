
import React from 'react';
import { FillNode as FillNodeType, NodePayload } from '../../../../types';
import { Section, ColorPicker } from '../../../common/DesignSystem';
import { BitmapView } from '../../../common/BitmapView';

interface FillNodeProps {
    node: FillNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload;
    output?: NodePayload;
}

export const FillNode = React.memo(({ node, onUpdate, input, output }: FillNodeProps) => {
    const { color = '#000000' } = node.data;
    
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
             <div className="p-3 border-t border-border-base/10 space-y-3 shrink-0 bg-surface/30">
                 <Section title="Background" defaultOpen={true}>
                     <ColorPicker 
                        label="Solid Color" 
                        value={color} 
                        onChange={(v) => update({ color: v })}
                        accent="blue" 
                     />
                 </Section>
             </div>
        </div>
    );
});
