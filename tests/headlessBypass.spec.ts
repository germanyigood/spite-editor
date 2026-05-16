import { NodeData, NodePayload } from '../types';
import { DEFAULT_SPRITE_CONFIG } from '../utils';
import { processGraphHeadless } from '../components/NodeEditor/graphExport';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeAll: any;
declare const afterAll: any;

export const defineHeadlessBypassSpecs = () => {
    describe('Headless Graph Export Bypass Logic', () => {
        let originalCreateImageBitmap: any;
        
        beforeAll(() => {
            originalCreateImageBitmap = window.createImageBitmap;
            window.createImageBitmap = async (source: any) => {
                return { width: source.width || 1, height: source.height || 1 } as any;
            };
        });

        afterAll(() => {
            window.createImageBitmap = originalCreateImageBitmap;
        });

        const mockCtx = { 
            loadBitmap: async () => {
                const c = document.createElement('canvas');
                c.width = 1; c.height = 1;
                return c as any;
            }, 
            isCancelled: () => false 
        };

        it('processGraphHeadless constructs valid flow with bypassed nodes', async () => {
            const inputNode: NodeData = { 
                id: 's1', type: 'source', x:0, y:0, width:100, height:100, 
                data: { src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+BwAEDgAIBw5xMOAAAAABJRU5ErkJggg==', width: 1, height:1 } as any
            };
            const chromaNode: NodeData = { 
                id: 'c1', type: 'chroma', x:0, y:0, width:100, height:100, 
                disabled: true, // Bypassed
                data: { enabled: true } as any
            };
            const gridNode: NodeData = {
                id: 'g1', type: 'grid', x:0, y:0, width:100, height:100,
                data: { ...DEFAULT_SPRITE_CONFIG, frames: [{ id: 1, x:0, y:0, width:1, height:1 }] }
            };
            
            const connections = [
                { id: 'conn1', source: 's1', target: 'c1' },
                { id: 'conn2', source: 'c1', target: 'g1' },
            ];

            const results = await processGraphHeadless([inputNode, chromaNode, gridNode], connections as any, mockCtx);
            
            expect(results['c1']).toBeDefined();
            expect(results['c1']).toBe(results['s1']);

            expect(results['g1']).toBeDefined();
            expect(results['g1'].type).toBe('IMAGE_SEQUENCE');
            
            const enabledChromaNode = { ...chromaNode, disabled: false };
            const resultsEnabled = await processGraphHeadless([inputNode, enabledChromaNode, gridNode], connections as any, mockCtx);
            
            expect(resultsEnabled['c1']).not.toBe(resultsEnabled['s1']); 
        });
    });
};
