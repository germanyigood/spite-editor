
import { Gauge } from 'lucide-react';
import { OptimizeNode } from './OptimizeNode';
import { processOptimize } from './optimize';
import { NodeIOSchema } from '../../../../types';

export const OptimizeBundle = {
    type: 'optimize',
    title: 'Optimization',
    component: OptimizeNode,
    processor: processOptimize,
    icon: Gauge,
    colorClass: 'yellow',
    io: { 
        inputs: {}, 
        outputs: { output: 'SETTINGS' } 
    } as NodeIOSchema
} as const;
