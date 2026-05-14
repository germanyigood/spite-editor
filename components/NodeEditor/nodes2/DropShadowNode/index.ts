
import { Layers } from 'lucide-react';
import { DropShadowNode } from './DropShadowNode';
import { processDropShadow } from './dropShadow';
import { NodeIOSchema } from '../../../../types';

export const DropShadowBundle = {
    type: 'drop_shadow',
    title: 'Drop Shadow',
    component: DropShadowNode,
    processor: processDropShadow,
    icon: Layers,
    colorClass: 'gray',
    io: { 
        inputs: { input: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] }, 
        outputs: { output: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] } 
    } as NodeIOSchema
} as const;
