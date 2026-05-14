
import { projectReducer, initialState, createDefaultAnimation } from '../context/ProjectContext';
import { TimelineNode, NodeData, GridNode, Connection } from '../types';
import { syncTimelineToGrid } from '../utils/graph';
import { DEFAULT_SPRITE_CONFIG } from '../utils';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineSyncSpecs = () => {
  describe('Node Graph Synchronization', () => {
      
      it('UPDATE_NODE_DATA preserves referential integrity of other nodes', () => {
          const anim = createDefaultAnimation('anim1');
          const tNode = anim.nodeGraph.nodes.find(n => n.type === 'timeline') as TimelineNode;
          
          const nodeA: any = { 
              id: 'nodeA', type: 'test', x: 100, y: 100, width: 100, height: 100, data: {}
          };
          
          anim.nodeGraph.nodes.push(nodeA as NodeData);
          const state = { ...initialState, animations: [anim], activeAnimationId: 'anim1' };

          const newState = projectReducer(state, {
              type: 'UPDATE_NODE_DATA',
              payload: { animId: 'anim1', nodeId: tNode.id, data: { currentFrame: 5 } }
          });

          const newAnim = newState.animations[0];
          const newTNode = newAnim.nodeGraph.nodes.find(n => n.id === tNode.id);
          const newNodeA = newAnim.nodeGraph.nodes.find(n => n.id === 'nodeA');

          expect(newTNode).not.toBe(tNode);
          expect((newTNode as any).data.currentFrame).toBe(5);
          expect(newNodeA).toBe(nodeA as any);
      });

      it('UPDATE_NODE_DATA handles non-existent nodes gracefully', () => {
          const anim = createDefaultAnimation('anim1');
          const state = { ...initialState, animations: [anim], activeAnimationId: 'anim1' };
          const newState = projectReducer(state, {
              type: 'UPDATE_NODE_DATA',
              payload: { animId: 'anim1', nodeId: 'ghost_node', data: { foo: 'bar' } }
          });
          expect(newState.animations[0].nodeGraph.nodes.length).toBe(anim.nodeGraph.nodes.length);
      });

      describe('Non-destructive synchronization', () => {
          // Helper to create basic graph
          const createGraph = (gridFrames: number, existingTimelineFrames: number[]) => {
              const grid: GridNode = { 
                  id: 'grid1', type: 'grid', x:0, y:0, width:100, height:100, 
                  data: { ...DEFAULT_SPRITE_CONFIG, totalFrames: gridFrames } 
              };
              const timeline: TimelineNode = {
                  id: 'tl1', type: 'timeline', x:0, y:0, width:100, height:100,
                  data: { frames: existingTimelineFrames, fps:12, loop:true, isPlaying:false, currentFrame:0 }
              };
              // Need a source node for getGraphLayers to work
              const source: NodeData = { 
                  id: 'src1', type: 'source', x:0, y:0, width:100, height:100, data: { name: 'S1', width:100, height:100 } as any 
              };
              const nodes = [source, grid, timeline];
              const connections: Connection[] = [
                  { id: 'c1', source: 'src1', target: 'grid1' },
                  { id: 'c2', source: 'grid1', target: 'tl1' }
              ];
              return { nodes, connections };
          };

          it('Does NOT update timeline if frame count matches (Preserves Sort)', () => {
              // Grid has 3 frames [0, 1, 2].
              // Timeline has [2, 0, 1] (User reordered).
              // Sync shouldn't revert it to [0, 1, 2].
              const { nodes, connections } = createGraph(3, [2, 0, 1]);
              
              const updatedNodes = syncTimelineToGrid(nodes, connections);
              const tNode = updatedNodes.find(n => n.id === 'tl1') as TimelineNode;
              
              // Should be exactly same array instance (optimization) or same content
              expect(tNode.data.frames).toEqual([2, 0, 1]);
          });

          it('Adds ONLY new frames to the end when Grid grows', () => {
              // Grid grows to 4 frames [0, 1, 2, 3].
              // Timeline had [2, 0, 1].
              // Expect: [2, 0, 1, 3].
              const { nodes, connections } = createGraph(4, [2, 0, 1]);
              
              const updatedNodes = syncTimelineToGrid(nodes, connections);
              const tNode = updatedNodes.find(n => n.id === 'tl1') as TimelineNode;
              
              expect(tNode.data.frames).toEqual([2, 0, 1, 3]);
          });

          it('Removes ONLY dead frames when Grid shrinks', () => {
              // Grid shrinks to 2 frames [0, 1].
              // Timeline had [2, 0, 1].
              // Frame 2 is now dead.
              // Expect: [0, 1].
              const { nodes, connections } = createGraph(2, [2, 0, 1]);
              
              const updatedNodes = syncTimelineToGrid(nodes, connections);
              const tNode = updatedNodes.find(n => n.id === 'tl1') as TimelineNode;
              
              expect(tNode.data.frames).toEqual([0, 1]);
          });
      });
  });
};
