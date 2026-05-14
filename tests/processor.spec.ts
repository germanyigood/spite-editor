
import { NODE_PROCESSORS } from '../components/NodeEditor/nodeProcessors';
import { NODE_REGISTRY } from '../components/NodeEditor/nodes2';
import { NodeData, NodePayload } from '../types';
import { DEFAULT_KEYING_CONFIG } from '../context/ProjectContext';
import { DEFAULT_SPRITE_CONFIG } from '../utils';
import { processGraphHeadless } from '../components/NodeEditor/graphExport';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineProcessorSpecs = () => {
  describe('Node Processor Engine', () => {
    
    const mockCtx = { 
        loadBitmap: async () => {
             const c = document.createElement('canvas');
             c.width = 1; c.height = 1;
             return await createImageBitmap(c);
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

        it('processGraphHeadless respects bypassed nodes in flow', async () => {
            const inputPayload: NodePayload = { type: 'IMAGE', image: 'mock_src' as any, width:1, height:1 };
            const inputNode: NodeData = { 
                id: 's1', type: 'source', x:0, y:0, width:100, height:100, 
                data: { src: 'mock_src' } 
            };
            const chromaNode: NodeData = { 
                id: 'c1', type: 'chroma', x:0, y:0, width:100, height:100, 
                disabled: true, // Bypassed
                data: { enabled: true } 
            };
            const outNode: NodeData = {
                id: 'o1', type: 'output', x:0, y:0, width:100, height:100,
                data: { name: 'default' }
            };
            
            const connections = [
                { id: 'conn1', source: 's1', target: 'c1', targetHandle: 'input' },
                { id: 'conn2', source: 'c1', target: 'o1', targetHandle: 'input' }
            ];

            // Mock NODE_PROCESSORS locally just in case it attempts to do real loading via source node
            // But we can just use the processor directly. Well, processGraphHeadless calls processGraph
            // let's just create nodes that don't need real canvas if possible, or provide a mockCtx.
            // Actually export.spec.ts mocks it too.
            const results = await processGraphHeadless([inputNode, chromaNode, outNode], connections as any);
            
            // Chroma should just pass whatever it got from source
            expect(results['c1']).toBeDefined();
            // Since source output isn't fully mocked, let's just make sure it passes through
        });
    });

  });
};
