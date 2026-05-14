

import { NodeProcessor } from '../../../../types';

export const processOptimize: NodeProcessor = async (node, _inputs) => {
    // This node just generates a config payload
    if (node.type !== 'optimize') return null;

    return {
        type: 'OPTIMIZATION',
        config: {
            cnum: node.data.cnum ?? 256,
            dither: node.data.dither ?? false
        }
    };
};