
import { Target } from 'lucide-react';
import { WarpNode } from './WarpNode';
import { processWarp } from './warp';
import { NodeIOSchema } from '../../../../types';

export const WarpBundle = {
    type: 'warp',
    title: 'Perspective Warp',
    component: WarpNode,
    processor: processWarp,
    icon: Target,
    colorClass: 'amber',
    io: { 
        inputs: { input: 'IMAGE' }, 
        outputs: { output: 'IMAGE' } 
    } as NodeIOSchema
} as const;
