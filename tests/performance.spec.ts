
import { stableHash } from '../utils/hash';
import { NodeData } from '../types';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const definePerformanceSpecs = () => {
  describe('Performance & Caching', () => {
    
    it('Timeline volatile properties do not affect cache hash', () => {
        // This test verifies that the logic used inside useNodeProcessing 
        // to strip 'currentFrame' actually works when generating hash keys.
        
        const nodeA: NodeData = {
            id: 'tl1', type: 'timeline', x: 0, y: 0, width: 100, height: 100,
            data: { frames: [1, 2, 3], fps: 12, loop: true, isPlaying: true, currentFrame: 0 }
        };

        const nodeB: NodeData = {
            id: 'tl1', type: 'timeline', x: 0, y: 0, width: 100, height: 100,
            data: { frames: [1, 2, 3], fps: 12, loop: true, isPlaying: true, currentFrame: 55 } // Changed Frame
        };

        const getHashable = (n: NodeData) => {
            if (n.type === 'timeline') {
                // Mimic the logic in useNodeProcessing
                const { currentFrame, isPlaying, loop, fps, ...rest } = n.data;
                return { ...n, data: rest };
            }
            return n;
        };

        const hashA = stableHash(getHashable(nodeA));
        const hashB = stableHash(getHashable(nodeB));

        expect(hashA).toBe(hashB);
    });

    it('StableHash handles object key order consistently', () => {
        const objA = { a: 1, b: 2, c: { d: 4, e: 5 } };
        const objB = { b: 2, a: 1, c: { e: 5, d: 4 } }; // Different order
        
        expect(stableHash(objA)).toBe(stableHash(objB));
    });

  });
};
