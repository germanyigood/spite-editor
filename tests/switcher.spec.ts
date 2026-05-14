
import { projectReducer, initialState, createDefaultAnimation } from '../context/ProjectContext';
import { ProjectState, SourceNode } from '../types';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineSwitcherSpecs = () => {
  describe('Animation Switching Logic', () => {
      
      it('Switches Active Animation and resets selection correctly', () => {
          // Setup: 2 Animations
          const anim1 = createDefaultAnimation('anim1');
          const anim2 = createDefaultAnimation('anim2');
          
          // Add a source layer to Anim 2 to verify activeLayerId picking
          const src2: SourceNode = { 
              id: 'src_2', type: 'source', x:0, y:0, width:100, height:100, 
              data: { src: '', name: 'Layer 2', width:100, height:100, opacity:1, visible:true, x:0, y:0 } 
          };
          anim2.nodeGraph.nodes.push(src2);

          const startState: ProjectState = { 
              ...initialState, 
              animations: [anim1, anim2],
              activeAnimationId: 'anim1',
              activeLayerId: 'some_old_layer',
              selectedFrameIndex: 5
          };

          // Action: Select Anim 2
          const newState = projectReducer(startState, {
              type: 'SELECT_ANIMATION',
              payload: 'anim2'
          });

          // Assertions
          expect(newState.activeAnimationId).toBe('anim2');
          // Should select the first source of the new animation
          expect(newState.activeLayerId).toBe('src_2'); 
          // Should reset frame selection
          expect(newState.selectedFrameIndex).toBeNull();
      });

      it('Maintains graph integrity when switching back and forth', () => {
          // This simulates the reducer aspect. The "Flying Connections" visual bug 
          // is likely a React render cycle issue, but we verify data here.
          const anim1 = createDefaultAnimation('anim1');
          const anim2 = createDefaultAnimation('anim2');
          
          let state = { ...initialState, animations: [anim1, anim2], activeAnimationId: 'anim1' };
          
          // Switch to 2
          state = projectReducer(state, { type: 'SELECT_ANIMATION', payload: 'anim2' });
          expect(state.animations.find(a => a.id === 'anim2')?.nodeGraph).toBeDefined();
          
          // Switch to 1
          state = projectReducer(state, { type: 'SELECT_ANIMATION', payload: 'anim1' });
          expect(state.animations.find(a => a.id === 'anim1')?.nodeGraph).toBeDefined();
      });
  });
};
