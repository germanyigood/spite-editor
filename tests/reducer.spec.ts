
import { projectReducer, initialState, createDefaultAnimation } from '../context/ProjectContext';
import { ProjectState, GridNode, TimelineNode, SourceNode, NodeData, Connection } from '../types';
import { DEFAULT_SPRITE_CONFIG } from '../utils';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineReducerSpecs = () => {
  describe('Project Reducer', () => {
    
    it('initializes with default state', () => {
      expect(initialState.animations.length).toBeGreaterThan(0);
      expect(initialState.projectName).toBe('MySpriteProject');
    });

    it('SET_PROJECT_NAME updates the name', () => {
      const newState = projectReducer(initialState, { 
        type: 'SET_PROJECT_NAME', 
        payload: 'Test Project' 
      });
      expect(newState.projectName).toBe('Test Project');
    });

    it('ADD_ANIMATION increases animation count', () => {
      const initialCount = initialState.animations.length;
      const newAnim = createDefaultAnimation('test_anim_id');
      
      const newState = projectReducer(initialState, {
        type: 'ADD_ANIMATION',
        payload: newAnim
      });

      expect(newState.animations.length).toBe(initialCount + 1);
      expect(newState.activeAnimationId).toBe('test_anim_id');
    });

    it('SELECT_ANIMATION changes active ID', () => {
      const anim1 = createDefaultAnimation('a1');
      const anim2 = createDefaultAnimation('a2');
      
      let state: ProjectState = {
        ...initialState,
        animations: [anim1, anim2],
        activeAnimationId: 'a1'
      };

      state = projectReducer(state, {
        type: 'SELECT_ANIMATION',
        payload: 'a2'
      });

      expect(state.activeAnimationId).toBe('a2');
    });

    it('REMOVE_ANIMATION does not remove the last animation', () => {
      const anim1 = createDefaultAnimation('a1');
      const state: ProjectState = {
        ...initialState,
        animations: [anim1], 
        activeAnimationId: 'a1'
      };

      const newState = projectReducer(state, {
        type: 'REMOVE_ANIMATION',
        payload: 'a1'
      });

      expect(newState.animations.length).toBe(1);
    });

    it('NEW_PROJECT correctly resets state and ensures active ID consistency', () => {
        const dirtyState: ProjectState = {
            ...initialState,
            projectName: 'Dirty Project',
            activeLayerId: 'dirty_layer',
            animations: [],
            activeAnimationId: 'invalid'
        };

        const result = projectReducer(dirtyState, { type: 'NEW_PROJECT' });

        expect(result.projectName).toBe('New Project');
        expect(result.animations.length).toBe(1);
        expect(result.activeLayerId).toBeNull();
        const activeAnim = result.animations.find(a => a.id === result.activeAnimationId);
        expect(activeAnim).toBeDefined();
    });

    describe('Graph Logic & Edge Cases', () => {
        
        it('UPDATE_LAYER finds Grid node even through intermediate nodes (BFS Fix)', () => {
            // Setup: Source -> Crop -> Grid -> Timeline
            const src: SourceNode = { id: 'src1', type: 'source', x:0, y:0, width:100, height:100, data: { src:'', name:'L1', width:100, height:100, opacity:1, visible:true, x:0, y:0 } };
            const crop: NodeData = { id: 'crop1', type: 'crop', x:0, y:0, width:100, height:100, data: { x:0, y:0, width:50, height:50 } };
            const grid: GridNode = { id: 'grid1', type: 'grid', x:0, y:0, width:100, height:100, data: { ...DEFAULT_SPRITE_CONFIG, rows: 2 } };
            const timeline: TimelineNode = { id: 'tl1', type: 'timeline', x:0, y:0, width:100, height:100, data: { frames: [], fps:12, loop:true, isPlaying:false, currentFrame:0 } };

            const connections: Connection[] = [
                { id: 'c1', source: 'src1', target: 'crop1' },
                { id: 'c2', source: 'crop1', target: 'grid1' },
                { id: 'c3', source: 'grid1', target: 'tl1' }
            ];

            const anim = {
                id: 'anim_bfs',
                name: 'BFS Test',
                nodeGraph: { nodes: [src, crop, grid, timeline], connections, viewport: {x:0,y:0,scale:1} },
                layout: { elements: [] }
            };

            const state = { ...initialState, animations: [anim], activeAnimationId: 'anim_bfs' };

            // Act: Update Layer (Targeting Source ID) with Sprite Config (Targeting Grid Data)
            const newState = projectReducer(state, {
                type: 'UPDATE_LAYER',
                payload: {
                    animId: 'anim_bfs',
                    layerId: 'src1',
                    updates: { spriteConfig: { rows: 5 } }, // Should propagate to grid1
                    resetTimeline: false
                }
            });

            // Assert
            const newAnim = newState.animations.find(a => a.id === 'anim_bfs');
            const newGrid = newAnim?.nodeGraph.nodes.find(n => n.id === 'grid1') as GridNode;
            
            expect(newGrid).toBeDefined();
            expect(newGrid.data.rows).toBe(5); // Verify BFS found the node and updated it
        });

        it('UPDATE_LAYER handles partial updates safely without NaN corruption', () => {
            // Setup: Standard Grid
            const grid: GridNode = { 
                id: 'grid1', type: 'grid', x:0,y:0,width:100,height:100, 
                data: { ...DEFAULT_SPRITE_CONFIG, totalFrames: 10 } 
            };
            const timeline: TimelineNode = {
                id: 'tl1', type: 'timeline', x:0,y:0,width:100,height:100,
                data: { frames: [0,1,2], fps:12, loop:true, isPlaying:false, currentFrame:0 }
            };
            
            // Source connected directly for simplicity
            const src: SourceNode = { id: 'src1', type: 'source', x:0, y:0, width:100, height:100, data: { src:'', name:'L1', width:100, height:100, opacity:1, visible:true, x:0, y:0 } };
            
            const connections = [
                { id: 'c1', source: 'src1', target: 'grid1' },
                { id: 'c2', source: 'grid1', target: 'tl1' }
            ];

            const anim = {
                id: 'anim_nan',
                name: 'NaN Test',
                nodeGraph: { nodes: [src, grid, timeline], connections, viewport: {x:0,y:0,scale:1} },
                layout: { elements: [] }
            };

            const state = { ...initialState, animations: [anim], activeAnimationId: 'anim_nan' };

            // Act: Update JUST the 'showCrosshair' boolean. 
            // Crucially: 'totalFrames' is undefined in the update payload.
            const newState = projectReducer(state, {
                type: 'UPDATE_LAYER',
                payload: {
                    animId: 'anim_nan',
                    layerId: 'src1',
                    updates: { spriteConfig: { showCrosshair: true } },
                    resetTimeline: true // Trigger recalculation logic
                }
            });

            // Assert
            const newAnim = newState.animations.find(a => a.id === 'anim_nan');
            const newTl = newAnim?.nodeGraph.nodes.find(n => n.id === 'tl1') as TimelineNode;
            
            // If logic was broken, totalFrames would be NaN (undefined + number)
            expect(newTl.data.frames.length).toBe(10); 
            expect(newTl.data.frames[0]).not.toBeNaN();
        });

        it('REMOVE_LAYER recalculates timeline to prevent phantom frames', () => {
            // Setup: 2 Layers. 
            // Grid 1: 5 Frames. Grid 2: 5 Frames. Total = 10.
            const grid1: GridNode = { id: 'g1', type: 'grid', x:0,y:0,width:100,height:100, data: { ...DEFAULT_SPRITE_CONFIG, totalFrames: 5 } };
            const grid2: GridNode = { id: 'g2', type: 'grid', x:0,y:0,width:100,height:100, data: { ...DEFAULT_SPRITE_CONFIG, totalFrames: 5 } };
            const src1: SourceNode = { id: 's1', type: 'source', x:0,y:0,width:100,height:100, data: {src:'', name:'1', width:100,height:100,opacity:1,visible:true,x:0,y:0} };
            const src2: SourceNode = { id: 's2', type: 'source', x:0,y:0,width:100,height:100, data: {src:'', name:'2', width:100,height:100,opacity:1,visible:true,x:0,y:0} };
            
            const timeline: TimelineNode = {
                id: 'tl', type: 'timeline', x:0,y:0,width:100,height:100,
                // Initial timeline has indices 0-9
                data: { frames: [0,1,2,3,4,5,6,7,8,9], fps:12, loop:true, isPlaying:false, currentFrame:0 }
            };

            const anim = {
                id: 'anim_del',
                name: 'Del Test',
                nodeGraph: { 
                    nodes: [src1, grid1, src2, grid2, timeline], 
                    connections: [
                        { id:'c1', source:'s1', target:'g1' },
                        { id:'c2', source:'s2', target:'g2' },
                        // FIX: Explicitly connect grids to timeline so syncTimelineToGrid (topology-based) works
                        { id:'c3', source:'g1', target:'tl' },
                        { id:'c4', source:'g2', target:'tl' },
                    ], 
                    viewport: {x:0,y:0,scale:1} 
                },
                layout: { elements: [] }
            };

            const state = { ...initialState, animations: [anim], activeAnimationId: 'anim_del' };

            // Act: Remove Layer 1 (5 frames)
            const newState = projectReducer(state, {
                type: 'REMOVE_LAYER',
                payload: { animId: 'anim_del', layerId: 's1' }
            });

            // Assert
            const newAnim = newState.animations[0];
            const newTl = newAnim.nodeGraph.nodes.find(n => n.id === 'tl') as TimelineNode;
            
            // Total frames should now be 5. Indices should be 0-4.
            // If logic failed, it might keep 0-9, where 5-9 refer to nothing or wrong data.
            expect(newTl.data.frames.length).toBe(5);
            expect(newTl.data.frames).toEqual([0, 1, 2, 3, 4]);
        });
    });
  });
};
