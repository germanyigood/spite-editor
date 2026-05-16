import { NODE_PROCESSORS } from '../components/NodeEditor/nodeProcessors';
import { NodeData } from '../types';
import { DEFAULT_SPRITE_CONFIG } from '../utils';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineGridMissingSpecs = () => {
    describe('Missing Input Handling', () => {
        const mockCtx = { 
            loadBitmap: async () => ({ width: 1, height: 1 } as any), 
            isCancelled: () => false 
        };

        it('Grid Node returns null if input missing', async () => {
            const gridNode: NodeData = { id: 'g1', type: 'grid', x:0,y:0,width:100,height:100, data: DEFAULT_SPRITE_CONFIG };
            const result = await NODE_PROCESSORS['grid'](gridNode, {}, mockCtx);
            expect(result).toBeNull();
        });
    });
};
