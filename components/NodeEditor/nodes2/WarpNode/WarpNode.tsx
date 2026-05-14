
import React from 'react';
import { WarpNode as WarpNodeType, NodePayload } from '../../../../types';
import { Section, NumberInput, Toggle } from '../../../common/DesignSystem';
import { useProject } from '../../../../context/ProjectContext';
import { Target, RotateCcw } from 'lucide-react';

interface WarpNodeProps {
    node: WarpNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload;
}

export const WarpNode = React.memo(({ node, onUpdate, input }: WarpNodeProps) => {
    const { pins, targetWidth, targetHeight } = node.data;
    const { dispatch } = useProject();

    const handleReset = () => {
        if (!input || input.type !== 'IMAGE') return;
        const w = input.width;
        const h = input.height;
        onUpdate(node.id, {
            data: {
                ...node.data,
                targetWidth: w,
                targetHeight: h,
                pins: [
                    { x: 0, y: 0 },
                    { x: w, y: 0 },
                    { x: w, y: h },
                    { x: 0, y: h }
                ]
            }
        });
    };

    const updateSize = (updates: any) => {
        onUpdate(node.id, { data: { ...node.data, ...updates } });
    };

    return (
        <div className="flex flex-col h-full p-3 gap-4">
            <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-[10px] text-amber-600 dark:text-amber-200 leading-tight">
                Adjust the <b>4 Corners</b> in the Sprite Editor to rectify perspective.
            </div>

            <Section title="Output Resolution" defaultOpen={true}>
                <div className="grid grid-cols-2 gap-2">
                    <NumberInput 
                        label="Width" min={1} 
                        value={targetWidth || 0} 
                        onChange={(v) => updateSize({ targetWidth: v })} 
                        accent="amber"
                    />
                    <NumberInput 
                        label="Height" min={1} 
                        value={targetHeight || 0} 
                        onChange={(v) => updateSize({ targetHeight: v })} 
                        accent="amber"
                    />
                </div>
                <button 
                    onClick={handleReset}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-1.5 bg-surface hover:bg-surface-hover/10 text-txt-muted hover:text-txt-primary border border-border-base/10 rounded-lg text-[10px] font-bold uppercase transition-all"
                >
                    <RotateCcw size={12} /> Reset Pins
                </button>
            </Section>

            <div className="flex-1 flex flex-col items-center justify-center opacity-20 pointer-events-none">
                <Target size={48} />
            </div>
        </div>
    );
});
