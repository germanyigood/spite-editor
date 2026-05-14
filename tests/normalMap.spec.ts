
import { processNormalMap } from '../components/NodeEditor/nodes2/NormalMapNode/normalMap';
import { NormalMapNode, NodePayload } from '../types';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineNormalMapSpecs = () => {
  describe('NormalMap Processor', () => {
    
    // Mock Context
    const mockCtx = { 
        loadBitmap: async () => {
            const c = document.createElement('canvas');
            c.width=10; c.height=10;
            return await createImageBitmap(c);
        }, 
        isCancelled: () => false 
    };

    const node: NormalMapNode = {
        id: 'nm1', type: 'normal_map', x:0, y:0, width:100, height:100,
        data: { strength: 1, lightIntensity: 1, lightZ: 1 }
    };

    it('processes IMAGE_SEQUENCE input correctly', async () => {
        const input: NodePayload = {
            type: 'IMAGE_SEQUENCE',
            image: 'mock_atlas' as any,
            frameWidth: 10, frameHeight: 10,
            frames: {},
            previewFrames: ['mock_frame_1' as any]
        };

        const result = await processNormalMap(node, { input }, mockCtx);

        expect(result).not.toBeNull();
        expect(result?.type).toBe('IMAGE_SEQUENCE');
        
        if(result?.type === 'IMAGE_SEQUENCE') {
             // It should return a new bitmap for the atlas
             expect(result.image).toBeDefined(); 
             // It should return processed preview frames
             expect(result.previewFrames?.length).toBe(1);
        }
    });

    it('preserves metadata when processing sequences', async () => {
        const framesMeta = { 0: { id: 0, x:0, y:0, width:10, height:10 } };
        const input: NodePayload = {
            type: 'IMAGE_SEQUENCE',
            image: 'mock_atlas' as any,
            frameWidth: 10, frameHeight: 10,
            frames: framesMeta,
            previewFrames: []
        };

        const result = await processNormalMap(node, { input }, mockCtx);
        
        if (result?.type === 'IMAGE_SEQUENCE') {
            expect(result.frames).toBe(framesMeta); // Reference equality or deep equal expected
            expect(result.frameWidth).toBe(10);
        }
    });
  });
};
