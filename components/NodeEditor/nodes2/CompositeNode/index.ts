
import { Layers } from 'lucide-react';
import { CompositeNode } from './CompositeNode';
import { processComposite } from './composite';
import { NodeIOSchema } from '../../../../types';

export const CompositeBundle = {
    type: 'composite',
    title: 'Composite (BG)',
    component: CompositeNode,
    processor: processComposite,
    icon: Layers,
    colorClass: 'blue',
    io: { 
        inputs: { front: 'IMAGE', back: 'IMAGE' }, 
        outputs: { output: 'IMAGE' } 
    } as NodeIOSchema
} as const;
