# SpriteForge History System (Undo/Redo) Design Doc

## 1. Architecture: The Memento Pattern
We utilize a **Higher-Order Reducer** approach. The application state is encapsulated within a `HistoryState` wrapper.

```typescript
interface HistoryState<T> {
  past: T[];    // Stack of previous states
  present: T;   // The current active state (ProjectState)
  future: T[];  // Stack of undone states (for Redo)
}
```

## 2. State Segregation
Not all actions should trigger a history snapshot. We categorize actions into two types:

### A. Undoable Actions (Structural Changes)
These actions modify the project data and MUST create a history entry.
- `ADD_LAYER`, `REMOVE_LAYER`
- `UPDATE_NODE_GRAPH` (Node editing, moving, connecting)
- `ADD_ANIMATION`, `REMOVE_ANIMATION`
- `UPDATE_ANIMATION` (Renaming)
- `NEW_PROJECT` (Clears history)

### B. Ephemeral Actions (UI State)
These actions only affect the workspace view or temporary selections and should NOT be undone.
- `SET_TOOL_MODE`
- `SELECT_LAYER`, `SELECT_FRAME`
- `SELECT_ANIMATION`
- `UPDATE_EDITOR_TRANSFORM` (Panning/Zooming)
- `SET_UI_PANEL_SIZE`

## 3. Implementation Strategy

### Context Layer
The `ProjectContext` will:
1. Initialize with `HistoryState`.
2. Provide `state.present` to the application, so components don't need to know about the history wrapper.
3. Intercept `dispatch`. If an action is `undoable`, it pushes `present` to `past` before executing.

### Debouncing
The Node Graph already uses a debounced update mechanism (`UPDATE_NODE_GRAPH` is dispatched 300ms after user stops dragging). This serves as a perfect natural breakpoint for history steps, preventing "one pixel drag = one history step" issues.

### Constraints
- **Max History Depth**: Limited to 50 steps to prevent memory bloat (especially with Base64 images).
