
import { Scaling } from 'lucide-react';
import { ResizeNode } from './ResizeNode';
import { processResize } from './resize';
import { NodeIOSchema } from '../../../../types';

export const ResizeBundle = {
    type: 'resize',
    title: 'Resize Output',
    component: ResizeNode,
    processor: processResize,
    icon: Scaling,
    colorClass: 'cyan',
    io: { 
        inputs: { input: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] }, 
        outputs: { output: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] } 
    } as NodeIOSchema
} as const;
