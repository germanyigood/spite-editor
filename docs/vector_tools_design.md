# Vector Tools Interaction Design Document

## 1. Core Principles
- **Non-Destructive Dragging (Performance & History)**: Pointer dragging interactions MUST NOT flood the Redux/Reducer history with micro-steps. `UPDATE_NODE_DATA` must only be dispatched on `pointerup`. During `pointermove`, uncommitted modifications should apply to a transient state (`livePaths`) that takes rendering priority.
- **Implicit Sub-tools**: The overarching "Path Tool" uses modifier keys for quick tool-switching, avoiding hard switches. 
  - `Ctrl` / `Cmd`: Temporarily switch to Direct Selection Tool.
  - `Alt`: Temporarily switch to Convert Point Tool.

## 2. Tool Workflows & Edge Cases

### A. Pen Tool (Path Draw) `[P]`
- **Click**: Adds a corner point (no control handles, linear segment).
- **Click & Drag**: Adds a smooth bezier point. Handles are symmetric (`pt.cp2x` is cursor position, `pt.cp1x` is opposite).
- **Clicking First Point**: Closes the current path.
- **Clicking Outside Active Path**: Deselects the current path and starts a new one.
- **Edge Case**: If clicking very close to an unselected path's stroke, do not select it if drawing a new path, unless clicking exactly on an existing endpoint (not fully implemented yet, currently starts new path).

### B. Direct Selection Tool `[A]` (or Ctrl/Cmd)
- **Click Segment**: Selects the path, exposes control points.
- **Drag Point**: Displaces the anchor point location along with its dependent bezier handles without changing their relative distance.
- **Drag Handle**: Adjusts the bezier curve. 
  - If point is *smooth* (unbroken), opposite handle mimics movement symmetrically.
  - If point is *broken*, only dragged handle updates.
- **Corner Case**: Attempting to drag an invisible handle does nothing. Selection tool must expose handles of the *currently selected* path only.

### C. Add Anchor Point Tool `[+]`
- **Click Segment**: Computes the nearest point on the parametric curve and inserts a new anchor point without mutating the visual curvature. (Currently implemented as linear insertion closest point for performance).
- **Corner Case**: Attempting to click outside a segment does nothing.

### D. Delete Anchor Point Tool `[-]`
- **Click Point**: Removes point from path. Adjacent points connect via linear segment (or preserve bezier data of remaining points depending on path closure).
- **Corner Case**: Deleting a point on a 3-point closed path keeps it closed. Deleting point on a 2-point path leaves a single point.

### E. Convert Point Tool `[Shift+C / Alt]`
- **Drag Handle**: Instantly breaks symmetry. Moving one handle no longer affects the opposite handle.
- **Click Point**: Retracts all handles (removes `cp1` and `cp2`), turning it into a sharp corner. 
- **Drag from Corner Point**: Extracts brand new symmetric handles (`cp1`, `cp2`) from a sharp corner, turning it into a smooth curve.

## 3. History Management & Reducer Isolation
All tools must funnel mutations to `livePaths` while `intState.current !== idle`. Only upon `pointerup` resolving the interaction should `dispatch({ type: 'UPDATE_NODE_DATA' })` commit to Redux state. Note: Tools that execute via instantaneous clicks (Add Point, Delete Point) bypass `livePaths` and dispatch immediately since they do not produce a continuous stream of events.

## 4. Test Coverage Outline (E2E)
- **Scenario**: `vector_tools_workflow.ts`
  1. Creation of bezier splines (`Drag` on click).
  2. Sub-selection of points and handles, validating spatial offsets.
  3. Real-time topology conversion via Convert tool (symmetric -> corner -> broken).
  4. Segment disruption (`Add`/`Delete` anchors).
  5. Multi-path isolation (Deselecting and drawing anew).
  6. **Undo Fidelity**: Asserts that one entire curve trajectory drag results in *exactly one* undo state step, allowing the user to seamlessly rollback point by point.
