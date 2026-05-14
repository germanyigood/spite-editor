
import { Palette } from 'lucide-react';
import { ColorCorrectNode } from './ColorCorrectNode';
import { processColorCorrect } from './colorCorrect';
import { NodeIOSchema } from '../../../../types';

export const ColorCorrectBundle = {
    type: 'color_correct',
    title: 'Color Correct',
    component: ColorCorrectNode,
    processor: processColorCorrect,
    icon: Palette,
    colorClass: 'blue',
    io: { 
        inputs: { input: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] }, 
        outputs: { output: ['IMAGE', 'TIMELINE', 'IMAGE_SEQUENCE'] } 
    } as NodeIOSchema
} as const;
