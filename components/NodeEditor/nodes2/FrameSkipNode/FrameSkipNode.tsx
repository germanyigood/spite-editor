import React from 'react';
import { NodeData } from '../../../../types';
import { Section, NumberInput } from '../../../common/DesignSystem';

interface FrameSkipNodeProps {
    node: NodeData;
    onUpdate: (id: string, updates: any) => void;
}

export const FrameSkipNode: React.FC<FrameSkipNodeProps> = ({ node, onUpdate }) => {
    const config = node.data || {};
    const safeConfig = {
        keepEvery: 2,
        offset: 0,
        ...config
    };

    const update = (patch: any) => {
        onUpdate(node.id, { data: { ...safeConfig, ...patch } });
    };

    return (
        <div className="p-3 w-56 flex flex-col gap-3">
            <Section title="Settings" className="mb-0">
                <div className="grid grid-cols-2 gap-2">
                    <NumberInput 
                        label="Keep Every N" 
                        min={1} 
                        max={60} 
                        value={safeConfig.keepEvery} 
                        onChange={(v) => update({ keepEvery: v })} 
                    />
                    <NumberInput 
                        label="Offset" 
                        min={0} 
                        max={safeConfig.keepEvery - 1} 
                        value={safeConfig.offset} 
                        onChange={(v) => update({ offset: Math.min(v, safeConfig.keepEvery - 1) })} 
                    />
                </div>
                <div className="text-xs text-gray-500 italic mt-2 text-center leading-tight">
                    Reduces total length by dropping frames.
                </div>
            </Section>
        </div>
    );
};
