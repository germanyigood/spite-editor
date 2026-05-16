
import { NODE_PROCESSORS } from '../components/NodeEditor/nodeProcessors';
import { NODE_REGISTRY } from '../components/NodeEditor/nodes2';
import { NodeData, NodePayload } from '../types';
import { DEFAULT_KEYING_CONFIG } from '../context/ProjectContext';
import { DEFAULT_SPRITE_CONFIG } from '../utils';
import { processGraphHeadless } from '../components/NodeEditor/graphExport';

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeAll: any;
declare const afterAll: any;

export const defineProcessorSpecs = () => {
  describe('Node Processor Engine', () => {
    
    const mockCtx = { 
        loadBitmap: async () => {
             const c = document.createElement('canvas');
             c.width = 1; c.height = 1;
             return c as any;
        }, 
        isCancelled: () => false 
    };

    describe('Registry Consistency', () => {
        it('Export Processors match UI Registry', () => {
            const registryKeys = Object.keys(NODE_REGISTRY);
            const processorKeys = Object.keys(NODE_PROCESSORS);

            registryKeys.forEach(key => {
                if (key === 'source' || key === 'generate') return;
                const bundle = NODE_REGISTRY[key];
                if (bundle && bundle.processor) {
                    expect(processorKeys).toContain(key);
                }
            });
        });
    });

    describe('Processor Logic', () => {
        let originalCreateImageBitmap: any;
        
        beforeAll(() => {
            originalCreateImageBitmap = window.createImageBitmap;
            window.createImageBitmap = async (source: any) => {
                // If it's a mock canvas or throws, just return a dummy object
                return { width: source.width || 1, height: source.height || 1 } as any;
            };
        });

        afterAll(() => {
            window.createImageBitmap = originalCreateImageBitmap;
        });

        it('Chroma Bypass returns input when disabled', async () => {
            const chromaNode: NodeData = { 
                id: 'c1', type: 'chroma', x:0, y:0, width:100, height:100, 
                disabled: true,
                data: { ...DEFAULT_KEYING_CONFIG, enabled: true } 
            };
            const inputPayload: NodePayload = { type: 'IMAGE', image: 'mock' as any, width:1, height:1 };
            // We use the wrapped processor from nodeProcessors
            const result = await NODE_PROCESSORS['chroma'](chromaNode, { input: inputPayload }, mockCtx);
            expect(result).toBe(inputPayload); 
        });
    });

  });
};
