
import { projectReducer, initialState, createDefaultAnimation } from '../context/ProjectContext';
import { ProjectState } from '../types';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineLayoutSpecs = () => {
  describe('Layout Persistence', () => {
      
      it('Initializes with default layoutCamera', () => {
          const anim = createDefaultAnimation('layout_test');
          expect(anim.layoutCamera).toBeDefined();
          expect(anim.layoutCamera?.scale).toBe(1);
      });

      it('UPDATE_LAYOUT_CAMERA updates only the layout camera', () => {
          const anim = createDefaultAnimation('anim_cam');
          const state: ProjectState = { 
              ...initialState, 
              animations: [anim],
              activeAnimationId: 'anim_cam'
          };

          const newTransform = { x: 500, y: 500, scale: 2 };
          
          const newState = projectReducer(state, {
              type: 'UPDATE_LAYOUT_CAMERA',
              payload: { animId: 'anim_cam', transform: newTransform }
          });

          const updatedAnim = newState.animations[0];
          
          // Should update layoutCamera
          expect(updatedAnim.layoutCamera).toEqual(newTransform);
          
          // Should NOT affect editorTransform (Sprite Editor)
          expect(updatedAnim.editorTransform).not.toEqual(newTransform);
          expect(updatedAnim.editorTransform).toEqual({ x: 0, y: 0, scale: 1 });
      });

      it('ADD_LAYOUT_ELEMENT persists element data', () => {
          const anim = createDefaultAnimation('anim_el');
          const state: ProjectState = { 
              ...initialState, 
              animations: [anim],
              activeAnimationId: 'anim_el'
          };

          const element = {
              id: 'el_1', name: 'Box', type: 'box' as const,
              x: 10, y: 10, width: 50, height: 50,
              visible: true, locked: false, data: {}
          };

          const newState = projectReducer(state, {
              type: 'ADD_LAYOUT_ELEMENT',
              payload: { animId: 'anim_el', element }
          });

          const updatedAnim = newState.animations[0];
          expect(updatedAnim.layout.elements.length).toBe(1);
          expect(updatedAnim.layout.elements[0].id).toBe('el_1');
          
          // Check global selection update
          expect(newState.selectedLayoutElementId).toBe('el_1');
      });
  });
};
