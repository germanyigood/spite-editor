
import { CircleDashed } from 'lucide-react';
import { OutlineNode } from './OutlineNode';
import { processOutline } from './outline';
import { NodeIOSchema } from '../../../../types';

export const OutlineBundle = {
    type: 'outline',
    title: 'Outline',
    component: OutlineNode,
    processor: processOutline,
    icon: CircleDashed,
    colorClass: 'gray',
    io: { 
        inputs: { input: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] }, 
        outputs: { output: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] } 
    } as NodeIOSchema
} as const;
