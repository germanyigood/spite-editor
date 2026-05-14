
import React from 'react';
import { KeyingConfig, ChromaNode as ChromaNodeType, NodePayload } from '../../../../types';
import { Section, ColorPicker, Slider, Toggle } from '../../../common/DesignSystem';
import { RefreshCcw } from 'lucide-react';

interface ChromaNodeProps {
    node: ChromaNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload;
}

export const ChromaNode = React.memo(({ node, onUpdate, input }: ChromaNodeProps) => {
    const config = node.data;
    
    // Safety Merge
    const safeConfig: KeyingConfig = {
        enabled: true, // Logic enabled by default, node bypass controls flow
        keyColor: '#00ff00',
        similarity: 35,
        smoothness: 10,
        spill: 60,
        clipBlack: 0,
        clipWhite: 0,
        blur: 0,
        invert: false,
        ...config
    };

    const update = (updates: Partial<KeyingConfig>) => onUpdate(node.id, { data: { ...safeConfig, ...updates } });

    if (!input) return <div className="h-full flex items-center justify-center text-txt-muted text-xs italic">Waiting for Input...</div>;

    return (
        <div className="flex flex-col h-full">
            <div 
                className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4 bg-surface/10"
            >
                <Section title="Matte Extraction" defaultOpen={true}>
                    <ColorPicker 
                        label="Key Color"
                        value={safeConfig.keyColor} 
                        onChange={(v) => update({ keyColor: v })} 
                        accent="purple"
                    />
                    
                    <Toggle 
                        label={safeConfig.invert ? "Keep Color (Invert)" : "Remove Color (Standard)"}
                        value={!!safeConfig.invert}
                        onChange={(v) => update({ invert: v })}
                        accent="purple"
                        icon={RefreshCcw}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <Slider label="Threshold" min={0} max={100} value={safeConfig.similarity} onChange={(v) => update({similarity:v})} accent="purple" />
                        <Slider label="Softness" min={0} max={100} value={safeConfig.smoothness} onChange={(v) => update({smoothness:v})} accent="purple" />
                    </div>
                </Section>

                <div className="h-px bg-border-base/5" />

                <Section title="Cleanup">
                        <div className="grid grid-cols-2 gap-3">
                            <Slider label="Clip Black" min={0} max={100} value={safeConfig.clipBlack} onChange={(v) => update({clipBlack:v})} accent="purple" />
                            <Slider label="Clip White" min={0} max={100} value={safeConfig.clipWhite} onChange={(v) => update({clipWhite:v})} accent="purple" />
                        </div>
                        <Slider label="Edge Blur" min={0} max={10} step={0.5} value={safeConfig.blur || 0} onChange={(v) => update({blur:v})} accent="purple" />
                </Section>

                {!safeConfig.invert && (
                    <>
                        <div className="h-px bg-border-base/5" />
                        <Section title="Spill Correction">
                                <Slider label="Despill Amount" min={0} max={100} value={safeConfig.spill} onChange={(v) => update({spill:v})} accent="purple" />
                        </Section>
                    </>
                )}
            </div>
        </div>
    );
});
