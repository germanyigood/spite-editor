# Design Document: World-Class Hotkey Engine

## 1. Executive Summary
To graduate from an MVP to a professional-grade creative tool, the application requires a robust, deterministic, and highly extensible Keyboard Shortcut Management System. The current global event hooks are fragile, prone to collisions, and lack spatial awareness. 

This document outlines a "World-Class" Hotkey Architecture inspired by industry standards (VS Code, Figma, Blender), separating **Key Combinations** from **Semantic Actions**, and introducing **Positional Scopes**.

## 2. Core Architectural Pillars

### A. Decoupling: Keybindings vs. Actions
We must stop hardcoding keyboard keys directly to callbacks inline.
*   **Actions (Commands):** Abstract semantic identifiers. (e.g., `core.undo`, `canvas.pan.start`, `timeline.frame.delete`).
*   **Keybindings:** The bridge mapping a physical keystroke combination to an Action. (e.g., `Mod+Z` -> `core.undo`).
*   **Handlers:** The React components that currently mount/unmount and *listen* for an Action to execute their local state closures.

### B. Positional Scoping (Contexts & Layers)
Instead of all hotkeys firing globally, hotkeys are evaluated conditionally based on the "Active Focus Scope".
*   **Focus Tracking:** Clicking into a specific UI region (e.g., Timeline, Canvas, Left Panel) flags that string (e.g., `"timeline"`) as the currently active scope.
*   **Hierarchical Resolution:** When a key is pressed:
    1. Check if the *Active Scope* has a binding for this key. If yes, map to Action.
    2. If not, bubble to the *Global Scope*. If yes, map to Action.
    3. Determine which mounted component handles this Action. Execute it.
    4. If no bindings exist, allow native browser behavior.

### C. Standardized Syntax & Modifiers
*   `Mod`: Universally translates to `Cmd` on macOS and `Ctrl` on Windows/Linux.
*   Support for `keyup` vs `keydown` via suffixes: e.g., `Space:down`, `Space:up` (crucial for "Hold-to-Pan").
*   Format: `[Modifiers+...]Name[:Event]`. Examples: `Mod+Shift+Z`, `Alt+Click`, `Space:down`.

### D. Input Element Safeguards (Forms)
If the browser focus (`document.activeElement`) is within an interactive text field (`<input>`, `<textarea>`, `contenteditable`):
*   By default, all hotkeys are **ignored**, letting the user type naturally.
*   *Exception:* Hard overrides (e.g., `Escape` to blur the input, or `Enter` to submit) can explicitly bypass this check if their Action is flagged with `{ ignoreForms: false }`.

## 3. Abstract API Design (React Implementation)

### 3.1. The Central Provider
A single root provider orchestrates the global keyboard event listeners and maintains the active scope state.

```tsx
<HotkeyEngineProvider defaultKeymap={defaultKeymap}>
  {/* The rest of the app */}
</HotkeyEngineProvider>
```

### 3.2. Scope Definition Bounds
A component wrapper that visually defines structural boundaries. When interacted with (onMouseDownCapture / onFocusCapture), it claims the scope context.

```tsx
<HotkeyScope scope="sprite-editor">
  <CanvasWorkspace />
</HotkeyScope>

<HotkeyScope scope="node-editor">
  <NodeGraphEditor />
</HotkeyScope>
```

### 3.3. Registering Handlers (The Hook)
Components bind to semantic actions using a dedicated custom hook. These handlers are only triggered if the event bubbled properly to their matching scope context.

```tsx
// Inside SpriteEditor.tsx (which lives inside <HotkeyScope scope="sprite-editor">)
useActionHandler('canvas.pan.start', () => {
    setIsPanActive(true);
});

useActionHandler('canvas.pan.end', () => {
    setIsPanActive(false);
});

useActionHandler('core.delete', () => {
   // Since this hook is registered inside the sprite-editor scope, 
   // this "core.delete" action will delete exactly what is selected in the canvas.
   deleteSelectedSprites();
});
```

### 3.4. Keymap Definition (JSON / Object)
A central configuration dictionary determining what sequence invokes what action. This allows user-customizability in the future.

```typescript
const defaultKeymap = [
    // Global Commands
    { key: "Mod+Z", action: "core.undo", scope: "global" },
    { key: "Mod+Shift+Z", action: "core.redo", scope: "global" },
    { key: "V", action: "tool.select", scope: "global" },
    { key: "B", action: "tool.draw", scope: "global" },
    
    // Contextual Overrides
    { key: "Space:down", action: "canvas.pan.start", scope: "sprite-editor" },
    { key: "Space:up", action: "canvas.pan.end", scope: "sprite-editor" },
    
    // Polymorphic keys (Delete acts differently based on scope)
    { key: "Delete", action: "core.delete", scope: "global" }, 
    { key: "Backspace", action: "core.delete", scope: "global" }
];
```

*Note on Polymorphism:* `core.delete` is globally registered to `Delete` / `Backspace`.
- If the Timeline is active, the Timeline's `useActionHandler('core.delete')` handles it.
- If the Node Editor is active, the Node Editor's `useActionHandler('core.delete')` handles it.
No collisions. No race conditions. Strict deterministic hierarchy.

## 4. Advanced Flow & Edge Cases

### A. The "Hold to Tool" feature (Spacebar Panning)
Creative apps require temporary state switches.
1. `keydown` fires "Space". 
2. Engine translates to `Space:down`. Maps to `canvas.pan.start`. Handler fires, sets `tool = PAN`.
3. `keyup` fires "Space".
4. Engine translates to `Space:up`. Maps to `canvas.pan.end`. Handler fires, reverts tool.

### B. Intercepting Default Browser Behaviors
The engine evaluates the binding *before* the browser acts. If an action handler executes, the internal engine automatically calls `event.preventDefault()` to stop unwanted browser scrolls (e.g., Spacebar scrolling the page down) or saves (e.g., `Cmd+S` trying to save the webpage).

## 5. Development Map & Feature Checklist
Migrating the current application requires a methodical process:

### Phase 1: Engine Foundation
- [x] Create `ActionRegistry.ts` / `keymap.ts` (store global mappings).
- [x] Create `HotkeyEngineContext.tsx` with a single `useEffect` attaching `keydown` and `keyup` to `window`.
- [x] Implement robust `normalizeKey(event)` (Handles Mod/Ctrl/Shift + Key).
- [x] Implement `shouldIgnoreEvent(event)` (Form focus logic).

### Phase 2: Scope & Boundaries
- [x] Create `<HotkeyScope scope="...">` wrapper component using native DOM `onMouseDownCapture` / `onFocusCapture` to aggressively set global `activeScope` state.
- [x] Expose `useActionHandler(actionId, callback)` hook that registers into a central dispatcher tree.

### Phase 3: Migration & Replacement
- [x] Port overarching `useKeyboardShortcuts.ts` to `defaultKeymap` + `useActionHandler` in `Header.tsx` / `App.tsx`.
- [x] Port `useSpriteInteraction.ts` (Space pan logic) to use `canvas.pan.start`.
- [x] Port Timeline `Delete` logics to use `core.delete`.
- [x] Port NodeEditor `Delete` logics to use `core.delete`.
- [x] Remove all raw `window.addEventListener('keydown')` scattered throughout components.

## 6. Conclusion
This architecture transforms hotkeys from "reactive event listeners" to a "managed command dispatcher". By scoping commands and separating triggers from actions, the application matches the robust mental models found in the world's most stable desktop software applications.
