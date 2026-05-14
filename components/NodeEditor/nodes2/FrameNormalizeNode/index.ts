
import { Scaling } from 'lucide-react';
import { FrameNormalizeNode } from './FrameNormalizeNode';
import { processFrameNormalize } from './frameNormalize';
import { NodeIOSchema } from '../../../../types';

export const FrameNormalizeBundle = {
    type: 'frame_normalize',
    title: 'Frame Size',
    component: FrameNormalizeNode,
    processor: processFrameNormalize,
    icon: Scaling,
    colorClass: 'cyan',
    io: { 
        inputs: { input: ['IMAGE_SEQUENCE', 'TIMELINE', 'IMAGE'] }, 
        outputs: { output: ['IMAGE_SEQUENCE', 'TIMELINE', 'IMAGE'] } 
    } as NodeIOSchema
} as const;
