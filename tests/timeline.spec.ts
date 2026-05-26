
import { projectReducer, initialState, createDefaultAnimation } from '../context/ProjectContext';
import { TimelineNode, NodePayload } from '../types';
import { processTimeline } from '../components/NodeEditor/nodes2/TimelineNode/timeline';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineTimelineSpecs = () => {
  describe('Timeline Logic', () => {
      
      it('Updates graph properly when frames are modified via reducer', () => {
          // Setup
          const anim = createDefaultAnimation('anim1');
          const tNode = anim.nodeGraph.nodes.find(n => n.type === 'timeline') as TimelineNode;
          // Inject mock frames
          tNode.data.frames = [0, 1, 2];
          
          const state = { ...initialState, animations: [anim], activeAnimationId: 'anim1' };
          
          // Action: Update Node Graph (Simulating removeFrame's dispatch)
          const newFrames = [0, 2]; // Removed index 1
          const updatedNode = { ...tNode, data: { ...tNode.data, frames: newFrames } };
          const newGraph = { ...anim.nodeGraph, nodes: anim.nodeGraph.nodes.map(n => n.id === tNode.id ? updatedNode : n) };
          
          const newState = projectReducer(state, {
              type: 'UPDATE_NODE_GRAPH',
              payload: { animId: 'anim1', graph: newGraph }
          });
          
          const newTNode = newState.animations[0].nodeGraph.nodes.find(n => n.type === 'timeline') as TimelineNode;
          expect(newTNode.data.frames.length).toBe(2);
          expect(newTNode.data.frames).toEqual([0, 2]);
      });

      it('Default Timeline Node is present in new animation', () => {
          const anim = createDefaultAnimation('test');
          const tNode = anim.nodeGraph.nodes.find(n => n.type === 'timeline');
          expect(tNode).toBeDefined();
          expect((tNode as any).data.frames).toBeDefined();
          expect(Array.isArray((tNode as any).data.frames)).toBe(true);
      });

      describe('Processor Integration', () => {
          // Mock Context
          const mockCtx = { loadBitmap: async () => ({} as ImageBitmap), isCancelled: () => false };

          it('Aggregates frames from multiple inputs correctly', async () => {
              // Simulating 2 Grids feeding into 1 Timeline
              // Grid A: Frames 0-2 (3 frames)
              // Grid B: Frames 3-5 (3 frames)
              // Timeline Data: [0, 1, 2, 3, 4, 5]
              
              const node: TimelineNode = {
                  id: 'timeline', type: 'timeline', x:0, y:0, width:100, height:100,
                  data: { 
                      frames: [0, 1, 2, 3, 4, 5], 
                      fps: 12, loop: true, isPlaying: false, currentFrame: 0 
                  }
              };

              const inputA: NodePayload = {
                  type: 'IMAGE_SEQUENCE',
                  image: 'atlas_A' as any,
                  frameWidth: 10, frameHeight: 10,
                  frames: {},
                  previewFrames: ['A1', 'A2', 'A3'] as any
              };

              const inputB: NodePayload = {
                  type: 'IMAGE_SEQUENCE',
                  image: 'atlas_B' as any,
                  frameWidth: 10, frameHeight: 10,
                  frames: {},
                  previewFrames: ['B1', 'B2', 'B3'] as any
              };

              // Note: Insertion order matters for Object.values in most engines. 
              // We simulate the order in which connections were processed.
              const inputs = {
                  'c_1': inputA,
                  'c_2': inputB
              };

              const result = await processTimeline(node, inputs, mockCtx);

              expect(result).not.toBeNull();
              if (result && result.type === 'TIMELINE') {
                  expect(result.frames.length).toBe(6);
                  // Verify order: First A, then B
                  expect(result.frames[0]).toBe('A1');
                  expect(result.frames[2]).toBe('A3');
                  expect(result.frames[3]).toBe('B1');
                  expect(result.frames[5]).toBe('B3');
              }
          });

          it('Normalizes frame indices when input is offset (e.g. only 2nd layer connected)', async () => {
              // Scenario: Timeline thinks it has frames [10, 11, 12] (from global calc)
              // But only the relevant input (3 frames) is passed to processor.
              // The processor must map Global 10 -> Local 0.
              
              const node: TimelineNode = {
                  id: 'timeline', type: 'timeline', x:0, y:0, width:100, height:100,
                  data: { 
                      frames: [10, 11, 12], 
                      fps: 12, loop: true, isPlaying: false, currentFrame: 1 // Cursor at middle frame
                  }
              };

              const inputB: NodePayload = {
                  type: 'IMAGE_SEQUENCE',
                  image: 'atlas_B' as any,
                  frameWidth: 10, frameHeight: 10,
                  frames: {},
                  previewFrames: ['B1', 'B2', 'B3'] as any 
              };

              const result = await processTimeline(node, { 'c_1': inputB }, mockCtx);
              
              expect(result).not.toBeNull();
              if (result && result.type === 'TIMELINE') {
                  expect(result.frames.length).toBe(3);
                  expect(result.frames[0]).toBe('B1');
                  // Check cursor normalization: Global 11 -> Local 1
                  expect(result.currentFrameIndex).toBe(1); 
                  expect(result.image).toBe('B2'); // Should point to the frame at local index 1
              }
          });
      });
  });
};
