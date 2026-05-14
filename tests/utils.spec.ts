
import { hexToRgb, findUpstreamNode, getGraphLayers, DEFAULT_SPRITE_CONFIG } from '../utils';
import { NodeGraphData, NodeData } from '../types';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineUtilsSpecs = () => {
  describe('Utils Helper Functions', () => {
    
    describe('hexToRgb', () => {
      it('converts white hex #ffffff correctly', () => {
        const result = hexToRgb('#ffffff');
        expect(result).toEqual({ r: 255, g: 255, b: 255 });
      });

      it('converts black hex #000000 correctly', () => {
        const result = hexToRgb('#000000');
        expect(result).toEqual({ r: 0, g: 0, b: 0 });
      });

      it('handles invalid fallback to black', () => {
        const result = hexToRgb('invalid-color'); 
        expect(result).toEqual({ r: 0, g: 0, b: 0 });
      });
    });

    describe('Graph Traversal', () => {
      const mockNodes: NodeData[] = [
        { id: 'n1', type: 'source', x: 0, y: 0, width: 100, height: 100, data: { src: '', name: 'S1', width: 100, height: 100, opacity: 1, visible: true, x: 0, y: 0 } },
        { id: 'n2', type: 'chroma', x: 0, y: 0, width: 100, height: 100, data: { enabled: false, keyColor: '', similarity: 0, smoothness: 0, spill: 0, clipBlack: 0, clipWhite: 0, colorCorrection: { brightness: 0, contrast: 0, saturation: 0, temperature: 0 } } },
        { id: 'n3', type: 'grid', x: 0, y: 0, width: 100, height: 100, data: { ...DEFAULT_SPRITE_CONFIG, totalFrames: 1 } }
      ];

      const mockConnections = [
        { id: 'c1', source: 'n1', target: 'n2' },
        { id: 'c2', source: 'n2', target: 'n3' }
      ];

      const mockGraph: NodeGraphData = {
        nodes: mockNodes,
        connections: mockConnections,
        viewport: { x: 0, y: 0, scale: 1 }
      };

      it('findUpstreamNode finds source from slice via traversal', () => {
        const result = findUpstreamNode(mockGraph, 'n3', 'source');
        expect(result).toBeDefined();
        expect(result?.id).toBe('n1');
      });

      it('findUpstreamNode returns undefined if node type not in chain', () => {
        const result = findUpstreamNode(mockGraph, 'n3', 'output');
        expect(result).toBeUndefined();
      });

      it('getGraphLayers extracts valid source/slice pairs', () => {
        const layers = getGraphLayers(mockGraph);
        expect(layers.length).toBe(1);
        expect(layers[0].source.id).toBe('n1');
        expect(layers[0].slice?.id).toBe('n3');
      });
    });
  });
};
