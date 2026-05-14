
import { Grid } from 'lucide-react';
import { PixelizeNode } from './PixelizeNode';
import { processPixelize } from './pixelize';
import { NodeIOSchema } from '../../../../types';

export const PixelizeBundle = {
    type: 'pixelize',
    title: 'Smart Pixelize',
    component: PixelizeNode,
    processor: processPixelize,
    icon: Grid,
    colorClass: 'cyan',
    io: { 
        inputs: { input: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] }, 
        outputs: { output: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] } 
    } as NodeIOSchema
} as const;
