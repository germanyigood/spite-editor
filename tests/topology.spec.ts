
import { getTopologicalSort } from '../utils/topologicalSort';
import { NodeData, Connection } from '../types';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineTopologySpecs = () => {
  describe('Topological Sort', () => {
    
    const createNode = (id: string, type: string = 'test'): NodeData => ({ 
        id, type: type as any, x:0, y:0, width:0, height:0, data: {} as any 
    });

    it('sorts a linear chain correctly (A->B->C)', () => {
        const nodes = [createNode('C'), createNode('A'), createNode('B')];
        const connections: Connection[] = [
            { id: '1', source: 'A', target: 'B' },
            { id: '2', source: 'B', target: 'C' }
        ];
        
        const sorted = getTopologicalSort(nodes, connections);
        expect(sorted).toEqual(['A', 'B', 'C']);
    });

    it('sorts a branching graph (A->B, A->C, B->D, C->D)', () => {
        const nodes = [createNode('D'), createNode('C'), createNode('B'), createNode('A')];
        const connections: Connection[] = [
            { id: '1', source: 'A', target: 'B' },
            { id: '2', source: 'A', target: 'C' },
            { id: '3', source: 'B', target: 'D' },
            { id: '4', source: 'C', target: 'D' },
        ];
        
        const sorted = getTopologicalSort(nodes, connections);
        
        // A must be first. D must be last. B and C can be in any order in between.
        expect(sorted[0]).toBe('A');
        expect(sorted[3]).toBe('D');
        expect(sorted.includes('B')).toBeTrue();
        expect(sorted.includes('C')).toBeTrue();
    });

    it('handles disconnected islands (A->B, C->D)', () => {
        const nodes = [createNode('B'), createNode('A'), createNode('D'), createNode('C')];
        const connections: Connection[] = [
            { id: '1', source: 'A', target: 'B' },
            { id: '2', source: 'C', target: 'D' }
        ];
        
        const sorted = getTopologicalSort(nodes, connections);
        
        // Order of islands doesn't matter, but internal dependency must hold
        const idxA = sorted.indexOf('A');
        const idxB = sorted.indexOf('B');
        const idxC = sorted.indexOf('C');
        const idxD = sorted.indexOf('D');
        
        expect(idxA).toBeLessThan(idxB);
        expect(idxC).toBeLessThan(idxD);
        expect(sorted.length).toBe(4);
    });

    it('breaks cycles safely without crashing (A->B->A)', () => {
        const nodes = [createNode('A'), createNode('B')];
        const connections: Connection[] = [
            { id: '1', source: 'A', target: 'B' },
            { id: '2', source: 'B', target: 'A' }
        ];
        
        // Should return *some* list containing both nodes, without infinite loop
        const sorted = getTopologicalSort(nodes, connections);
        expect(sorted.length).toBe(2);
        expect(sorted.includes('A')).toBeTrue();
        expect(sorted.includes('B')).toBeTrue();
    });

  });
};
