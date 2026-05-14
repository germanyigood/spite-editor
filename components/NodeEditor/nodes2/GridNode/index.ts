
import { Scissors } from 'lucide-react';
import { GridNode } from './GridNode';
import { processGrid } from './grid';
import { NodeIOSchema } from '../../../../types';
import { syncTimelineToGrid } from '../../../../utils';

export const GridBundle = {
    type: 'grid',
    title: 'Slice Grid',
    component: GridNode,
    processor: processGrid,
    icon: Scissors,
    colorClass: 'pink',
    io: { 
        inputs: { input: 'IMAGE' }, 
        outputs: { output: 'IMAGE_SEQUENCE' } 
    } as NodeIOSchema,
    // The Node decides: When I change, sync the connected timeline.
    onGraphUpdate: (_node, allNodes, connections) => {
        return syncTimelineToGrid(allNodes, connections);
    }
} as const;
