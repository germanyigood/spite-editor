
import React from 'react';
import { ColorCorrectNode as ColorCorrectNodeType, ColorCorrectionConfig, NodePayload } from '../../../../types';
import { Slider, Section } from '../../../common/DesignSystem';
import { BitmapView } from '../../../common/BitmapView';

interface ColorCorrectNodeProps {
    node: ColorCorrectNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload;
    output?: NodePayload;
}

export const ColorCorrectNode = React.memo(({ node, onUpdate, input, output }: ColorCorrectNodeProps) => {
    const config = node.data;
    
    // Safety Merge
    const safeConfig: ColorCorrectionConfig = {
        brightness: 0, 
        contrast: 0, 
        saturation: 0, 
        temperature: 0,
        ...config
    };

    const update = (updates: Partial<ColorCorrectionConfig>) => onUpdate(node.id, { data: { ...safeConfig, ...updates } });

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
                 <Section title="Color Correction" defaultOpen={true}>
                     <Slider label="Brightness" min={-100} max={100} value={safeConfig.brightness} onChange={(v) => update({brightness:v})} accent="blue" />
                     <div className="grid grid-cols-2 gap-3">
                         <Slider label="Contrast" min={-100} max={100} value={safeConfig.contrast} onChange={(v) => update({contrast:v})} accent="blue" />
                         <Slider label="Saturation" min={-100} max={100} value={safeConfig.saturation} onChange={(v) => update({saturation:v})} accent="blue" />
                     </div>
                     <Slider label="Temperature" min={-100} max={100} value={safeConfig.temperature} onChange={(v) => update({temperature:v})} accent="blue" />
                 </Section>
             </div>
        </div>
    );
});
