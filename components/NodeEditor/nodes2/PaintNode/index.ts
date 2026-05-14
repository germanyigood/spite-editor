
import { Brush } from 'lucide-react';
import { PaintNode } from './PaintNode';
import { processPaint } from './paint';
import { NodeIOSchema } from '../../../../types';

export const PaintBundle = {
    type: 'paint',
    title: 'Paint',
    component: PaintNode,
    processor: processPaint,
    icon: Brush,
    colorClass: 'purple',
    io: { 
        inputs: { input: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] }, 
        outputs: { output: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] } 
    } as NodeIOSchema
} as const;
