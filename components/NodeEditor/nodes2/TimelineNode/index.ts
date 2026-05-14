
import { Film } from 'lucide-react';
import { TimelineNode } from './TimelineNode';
import { processTimeline } from './timeline';
import { NodeIOSchema } from '../../../../types';

export const TimelineBundle = {
    type: 'timeline',
    title: 'Timeline',
    component: TimelineNode,
    processor: processTimeline,
    icon: Film,
    colorClass: 'green',
    io: { 
        inputs: { 
            input: { type: ['IMAGE_SEQUENCE', 'IMAGE'], maxConnections: -1 } 
        }, 
        outputs: { output: 'TIMELINE' } 
    } as NodeIOSchema
} as const;
