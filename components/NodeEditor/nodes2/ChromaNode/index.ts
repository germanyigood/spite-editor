
import { CircuitBoard } from 'lucide-react';
import { ChromaNode } from './ChromaNode';
import { processChroma } from './chroma';
import { NodeIOSchema } from '../../../../types';

export const ChromaBundle = {
    type: 'chroma',
    title: 'Chroma Key',
    component: ChromaNode,
    processor: processChroma,
    icon: CircuitBoard,
    colorClass: 'purple',
    io: { 
        inputs: { input: 'IMAGE' }, 
        outputs: { output: 'IMAGE' } 
    } as NodeIOSchema
} as const;
