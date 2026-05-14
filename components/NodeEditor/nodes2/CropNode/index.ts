
import { Crop } from 'lucide-react';
import { CropNode } from './CropNode';
import { processCrop } from './crop';
import { NodeIOSchema } from '../../../../types';

export const CropBundle = {
    type: 'crop',
    title: 'Crop / Resize',
    component: CropNode,
    processor: processCrop,
    icon: Crop,
    colorClass: 'amber',
    io: { 
        inputs: { input: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] }, 
        outputs: { output: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] } 
    } as NodeIOSchema
} as const;
