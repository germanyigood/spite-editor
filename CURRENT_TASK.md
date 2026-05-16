# E2E Testing Backlog

## Missing Coverage Areas

1. **Timeline Interactions (`timeline_playback.ts`)**
   - Play/Pause toggle state verification.
   - Adjusting FPS affects simulation (if testable).
   - Clicking on a specific frame index updates the selected frame for the active layer.

2. **Paint Node Workflow (`paint_node_workflow.ts`)**
   - Going to "Draw" tool mode.
   - Select brush, change thickness and color.
   - Dragging across the sprite editor canvas (simulating drawing).
   - Verifying the preview node or subsequent node output updates.

3. **Chroma Key Editing (`chroma_key_workflow.ts`)**
   - Select Chroma Node in graph.
   - Pick the target color to key out from the color picker in properties panel.
   - Adjust Tolerance and Spill.
   - Verify visually/programmatically that the output preview changes.

4. **Undo/Redo System (`undo_redo_workflow.ts`)**
   - Perform an action (e.g. creating a layer, adding a node, moving a node).
   - Trigger Undo (Ctrl+Z).
   - Verify state reverts.
   - Trigger Redo (Ctrl+Y/Shift+Ctrl+Z).
   - Verify state restores.

5. **Project Management / Export (`project_mgmt.ts`)**
   - Download the project configurations.
   - Testing updating project settings.

## Completion Status
- [x] Timeline Interactions (`tests/scenarios/timeline_playback.ts`)
- [x] Paint Node Workflow (`tests/scenarios/paint_node_workflow.ts`)
- [x] Chroma Key Editing (`tests/scenarios/chroma_key_workflow.ts`)
- [x] Undo/Redo System (`tests/scenarios/undo_redo_workflow.ts`)
