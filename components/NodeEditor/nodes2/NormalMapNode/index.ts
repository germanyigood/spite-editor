
import { Lightbulb } from 'lucide-react';
import { NormalMapNode } from './NormalMapNode';
import { processNormalMap } from './normalMap';
import { NodeIOSchema } from '../../../../types';

export const NormalMapBundle = {
    type: 'normal_map',
    title: 'Normal Map',
    component: NormalMapNode,
    processor: processNormalMap,
    icon: Lightbulb,
    colorClass: 'amber',
    io: { 
        inputs: { input: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] }, 
        outputs: { output: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] } 
    } as NodeIOSchema
} as const;
