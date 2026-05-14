
import React from 'react';
import { NodePayload, OutputNode as OutputNodeType } from '../../../../types';
import { TextInput, Label } from '../../../common/DesignSystem';
import { OutputPreview } from '../../common/OutputPreview';

interface OutputNodeProps {
    node: OutputNodeType;
    onUpdate: (id: string, updates: any) => void;
    inputs: Record<string, NodePayload>;
}

export const OutputNode = React.memo(({ inputs, node, onUpdate }: OutputNodeProps) => {
    // We update local node data.
    const updateName = (name: string) => {
        onUpdate(node.id, { data: { ...node.data, name } });
    };

    // Main input is usually 'input' or 'main'
    const input = inputs['input'] || inputs['main'] || Object.values(inputs)[0];
    const settings = inputs['settings'];

    return (
        <div className="flex flex-col h-full p-3 gap-3">
            <TextInput 
                label="Output Alias" 
                value={node.data.name || ''} 
                onChange={updateName} 
                placeholder="default"
                accent="blue"
            />
            
            <div className="flex-1 min-h-0 flex flex-col">
                 <div className="flex justify-between items-center mb-1">
                     <Label>Result Preview</Label>
                     {settings && settings.type === 'OPTIMIZATION' && (
                         <span className="text-[9px] text-yellow-600 dark:text-yellow-400 font-bold bg-yellow-500/10 px-1 rounded border border-yellow-500/20">
                             OPT: {settings.config.cnum} Colors
                         </span>
                     )}
                 </div>
                 <div className="flex-1 min-h-0">
                    <OutputPreview input={input} label="Final Output" />
                 </div>
            </div>
        </div>
    );
});
