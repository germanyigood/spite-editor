
import React from 'react';
import { GridNode as GridNodeType, NodePayload } from '../../../../types';
import { NumberInput, Section, Label, Toggle } from '../../../common/DesignSystem';
import { generateGridFrames } from '../../../../utils';
import { RefreshCw } from 'lucide-react';

interface GridNodeProps {
    node: GridNodeType;
    onUpdate: (id: string, updates: any) => void;
    inputs?: Record<string, NodePayload>; // Add inputs prop
    input?: NodePayload; // Legacy support if needed
}

export const GridNode: React.FC<GridNodeProps> = React.memo(({ node, onUpdate, inputs, input }) => {
    const config = node.data;
    
    // Resolve Input Payload
    // This allows us to know the Total Sheet Size coming into the grid
    const inputPayload = inputs ? (inputs['input'] || Object.values(inputs)[0]) : input;

    const updateConfig = (newConfig: any) => {
        onUpdate(node.id, { data: newConfig });
    }

    const handleGridChange = (key: 'rows' | 'cols', val: number) => {
        const newConfig = { ...config, [key]: val };
        
        // Slicing Logic:
        // If we have an input image, assume we are slicing it evenly.
        // Recalculate frame width/height based on input dimensions.
        if (inputPayload) {
            let totalW = 0;
            let totalH = 0;
            
            if (inputPayload.type === 'IMAGE') {
                totalW = inputPayload.width;
                totalH = inputPayload.height;
            } else if (inputPayload.type === 'IMAGE_SEQUENCE' && inputPayload.image instanceof ImageBitmap) {
                totalW = inputPayload.image.width;
                totalH = inputPayload.image.height;
            }

            if (totalW > 0 && totalH > 0) {
                // IMPORTANT: Always recalculate BOTH dimensions when grid structure changes.
                // This ensures we snap to the CURRENT input size (which might have been cropped upstream).
                newConfig.width = Math.floor(totalW / newConfig.cols);
                newConfig.height = Math.floor(totalH / newConfig.rows);
            }
        }

        newConfig.totalFrames = newConfig.rows * newConfig.cols;
        newConfig.frames = generateGridFrames(
            newConfig.rows, newConfig.cols,
            newConfig.width, newConfig.height,
            newConfig.offsetX, newConfig.offsetY,
            newConfig.margin
        );
        updateConfig(newConfig);
    };

    const handleConfigChange = (key: 'offsetX' | 'offsetY' | 'margin', val: number) => {
        const newConfig = { ...config, [key]: val };
        newConfig.frames = generateGridFrames(
            newConfig.rows, newConfig.cols,
            newConfig.width, newConfig.height,
            newConfig.offsetX, newConfig.offsetY,
            newConfig.margin
        );
        updateConfig(newConfig);
    };

    return (
        <div 
            className="p-3 h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar"
        >
            <Section title="Grid Dimensions" defaultOpen={true}>
                <div className="grid grid-cols-2 gap-2">
                    <NumberInput 
                        label="Rows" min={1} 
                        value={config.rows} 
                        onChange={(v) => handleGridChange('rows', Math.max(1, v))} 
                        accent="pink"
                    />
                    <NumberInput 
                        label="Cols" min={1} 
                        value={config.cols} 
                        onChange={(v) => handleGridChange('cols', Math.max(1, v))} 
                        accent="pink"
                    />
                </div>
            </Section>

            <Section title="Global Adjustments">
                <div className="grid grid-cols-3 gap-2">
                     <NumberInput 
                        label="Offset X" 
                        value={config.offsetX} 
                        onChange={(v) => handleConfigChange('offsetX', v)} 
                        accent="pink"
                    />
                    <NumberInput 
                        label="Offset Y" 
                        value={config.offsetY} 
                        onChange={(v) => handleConfigChange('offsetY', v)} 
                        accent="pink"
                    />
                    <NumberInput 
                        label="Margin" 
                        value={config.margin} 
                        onChange={(v) => handleConfigChange('margin', v)} 
                        accent="pink"
                    />
                </div>
                
                <Toggle 
                    label="Auto-Sync Timeline"
                    value={config.autoUpdateTimeline !== false}
                    onChange={(v) => updateConfig({ ...config, autoUpdateTimeline: v })}
                    accent="pink"
                    icon={RefreshCw}
                />
            </Section>
            
            <div className="flex-1 flex flex-col items-center justify-center border-t border-border-base/10 pt-2 min-h-[40px] mt-2">
                <div className="text-center group cursor-default">
                    <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-pink-400 to-purple-400 group-hover:from-pink-300 group-hover:to-purple-300 transition-all">
                        {config.totalFrames}
                    </span>
                    <Label className="justify-center mt-1 text-pink-500/50">Total Frames</Label>
                </div>
            </div>
        </div>
    );
});
