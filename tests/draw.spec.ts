
import { findModifierByType } from '../utils/graph';
import { NodeGraphData, NodeData, Connection } from '../types';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineDrawSpecs = () => {
    describe('Drawing & Modifier Logic', () => {
        
        it('findModifierByType finds the specific Paint node downstream from a layer', () => {
            // Setup: 
            // Layer A -> Paint A -> Chroma
            // Layer B -> Paint B
            const nodes: NodeData[] = [
                { id: 'src_a', type: 'source', x:0, y:0, width:10, height:10, data: {} as any },
                { id: 'paint_a', type: 'paint', x:0, y:0, width:10, height:10, data: {} as any },
                { id: 'chroma', type: 'chroma', x:0, y:0, width:10, height:10, data: {} as any },
                { id: 'src_b', type: 'source', x:0, y:0, width:10, height:10, data: {} as any },
                { id: 'paint_b', type: 'paint', x:0, y:0, width:10, height:10, data: {} as any }
            ];

            const connections: Connection[] = [
                { id: 'c1', source: 'src_a', target: 'paint_a' },
                { id: 'c2', source: 'paint_a', target: 'chroma' },
                { id: 'c3', source: 'src_b', target: 'paint_b' }
            ];

            const graph: NodeGraphData = {
                nodes, connections, viewport: { x: 0, y: 0, scale: 1 }
            };

            // Test 1: Search from Layer A
            const foundA = findModifierByType(graph, 'src_a', 'paint');
            expect(foundA).toBeDefined();
            expect(foundA?.id).toBe('paint_a');

            // Test 2: Search from Layer B
            const foundB = findModifierByType(graph, 'src_b', 'paint');
            expect(foundB).toBeDefined();
            expect(foundB?.id).toBe('paint_b');

            // Test 3: Search for non-existent modifier downstream
            const foundC = findModifierByType(graph, 'src_b', 'chroma');
            expect(foundC).toBeUndefined();
        });

        it('findModifierByType respects multiple connections (BFS logic)', () => {
            const nodes: NodeData[] = [
                { id: 'src', type: 'source', x:0, y:0, width:10, height:10, data: {} as any },
                { id: 'm1', type: 'chroma', x:0, y:0, width:10, height:10, data: {} as any },
                { id: 'm2', type: 'paint', x:0, y:0, width:10, height:10, data: {} as any }
            ];
            const connections: Connection[] = [
                { id: 'c1', source: 'src', target: 'm1' },
                { id: 'c2', source: 'm1', target: 'm2' }
            ];
            const graph: NodeGraphData = { nodes, connections, viewport: { x: 0, y: 0, scale: 1 } };

            const found = findModifierByType(graph, 'src', 'paint');
            expect(found?.id).toBe('m2');
        });
    });
};
