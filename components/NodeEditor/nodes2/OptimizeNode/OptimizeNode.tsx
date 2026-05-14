
import React from 'react';
import { OptimizeNode as OptimizeNodeType } from '../../../../types';
import { Slider, Toggle, Section } from '../../../common/DesignSystem';
import { Palette, Zap } from 'lucide-react';

interface OptimizeNodeProps {
    node: OptimizeNodeType;
    onUpdate: (id: string, updates: any) => void;
}

export const OptimizeNode = React.memo(({ node, onUpdate }: OptimizeNodeProps) => {
    const config = node.data;
    
    const update = (updates: any) => {
        onUpdate(node.id, { data: { ...config, ...updates } });
    };

    return (
        <div className="flex flex-col h-full bg-transparent p-3 space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-lg text-[10px] text-yellow-600 dark:text-yellow-200 leading-tight">
                Connect to <b>Output Node</b> to enable advanced PNG compression (Quantization).
            </div>
            
            <Section title="Quality Settings" defaultOpen={true}>
                <Slider 
                    label="Colors (Palette)" 
                    min={2} max={256} step={1}
                    value={config.cnum || 256} 
                    onChange={(v) => update({ cnum: v })} 
                    accent="yellow"
                />
                <div className="text-[9px] text-txt-muted text-right">
                    {(config.cnum || 256) === 256 ? '8-bit (256 Colors)' : `${config.cnum} Colors`}
                </div>

                <div className="pt-2">
                    <Toggle 
                        label="Dithering" 
                        value={!!config.dither} 
                        onChange={(v) => update({ dither: v })} 
                        icon={Zap}
                        accent="yellow"
                    />
                </div>
            </Section>
            
            <div className="flex items-center justify-center p-2">
                <Palette size={48} className="text-yellow-500/20" />
            </div>
        </div>
    );
});
