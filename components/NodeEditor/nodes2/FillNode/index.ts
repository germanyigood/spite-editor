
import { PaintBucket } from 'lucide-react';
import { FillNode } from './FillNode';
import { processFill } from './fill';
import { NodeIOSchema } from '../../../../types';

export const FillBundle = {
    type: 'fill_color',
    title: 'Background Color',
    component: FillNode,
    processor: processFill,
    icon: PaintBucket,
    colorClass: 'blue',
    io: { 
        inputs: { input: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] }, 
        outputs: { output: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] } 
    } as NodeIOSchema
} as const;
