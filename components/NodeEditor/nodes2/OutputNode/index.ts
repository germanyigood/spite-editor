
import { MonitorUp } from 'lucide-react';
import { OutputNode } from './OutputNode';
import { processOutput } from './output';
import { NodeIOSchema } from '../../../../types';

export const OutputBundle = {
    type: 'output',
    title: 'Output',
    component: OutputNode,
    processor: processOutput,
    icon: MonitorUp,
    colorClass: 'blue',
    io: { 
        inputs: { input: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'], settings: 'SETTINGS' }, 
        outputs: {} 
    } as NodeIOSchema
} as const;
