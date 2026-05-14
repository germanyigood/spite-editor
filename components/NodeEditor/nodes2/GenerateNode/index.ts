
import { Sparkles } from 'lucide-react';
import { GenerateNode } from './GenerateNode';
import { processGenerate } from './generate';
import { NodeIOSchema } from '../../../../types';

export const GenerateBundle = {
    type: 'generate',
    title: 'AI Sprite Gen',
    component: GenerateNode,
    processor: processGenerate,
    icon: Sparkles,
    colorClass: 'purple',
    io: { 
        inputs: {}, 
        outputs: { output: 'IMAGE' } 
    } as NodeIOSchema
} as const;
