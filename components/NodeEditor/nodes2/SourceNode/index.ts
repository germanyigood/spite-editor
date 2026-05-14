
import { Image as ImageIcon } from 'lucide-react';
import { SourceNode } from './SourceNode';
import { processSource } from './source';
import { NodeIOSchema } from '../../../../types';

export const SourceBundle = {
    type: 'source',
    title: 'Source Layer',
    component: SourceNode,
    processor: processSource,
    icon: ImageIcon,
    colorClass: 'cyan',
    variant: 'clean',
    io: { 
        inputs: {}, 
        outputs: { output: 'IMAGE' } 
    } as NodeIOSchema
} as const;
