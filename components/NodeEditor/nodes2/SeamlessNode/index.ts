
import { Grid3X3 } from 'lucide-react';
import { SeamlessNode } from './SeamlessNode';
import { processSeamless } from './seamless';
import { NodeIOSchema } from '../../../../types';

export const SeamlessBundle = {
    type: 'seamless',
    title: 'Make Seamless',
    component: SeamlessNode,
    processor: processSeamless,
    icon: Grid3X3,
    colorClass: 'pink',
    io: { 
        inputs: { input: ['IMAGE', 'TIMELINE'] }, 
        outputs: { output: ['IMAGE', 'TIMELINE'] } 
    } as NodeIOSchema
} as const;
