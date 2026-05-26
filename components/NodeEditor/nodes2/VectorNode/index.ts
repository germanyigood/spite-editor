import { VectorNodeComponent } from './VectorNode';
import { processVector } from './vector';
import { NodeBundle } from '../index';
import { PenTool } from 'lucide-react';

export const VectorBundle: NodeBundle = {
    type: 'vector',
    title: 'Vector Path',
    component: VectorNodeComponent,
    processor: processVector,
    icon: PenTool,
    colorClass: 'bg-fuchsia-500',
    io: {
        inputs: {
            background: ['IMAGE'] // Optional background to composite over later, though for now it just ignores it unless we add compositing
        },
        outputs: {
            output: ['IMAGE']
        }
    }
};
