# User Story: Project & Workspace Management

## 1. Global Undo / Redo
**As a** user,
**I want to** use undo and redo commands,
**So that** I can safely revert mistakes and experiment without losing my work.

### Acceptance Criteria & Steps
**Scenario 1: Reverting an action**
1. **Given** the user has an active project workspace.
2. **When** the user connects two nodes in the node graph.
3. **And** the user clicks the "Undo" button (or presses Ctrl+Z).
4. **Then** the connection between the nodes is removed.

**Scenario 2: Redoing an action**
1. **Given** the user has just undone a node connection.
2. **When** the user clicks the "Redo" button (or presses Ctrl+Shift+Z).
3. **Then** the node connection is restored.

### Corner Cases
- Triggering undo when the history stack is empty (button should be disabled/unresponsive).
- Rapidly pressing Undo/Redo during computationally heavy operations.
- Undoing the creation of a new animation sheet (should fall back to a valid active animation).

## 2. Animation (Scene) Management
**As a** user,
**I want to** create, rename, switch between, and delete animation scenes,
**So that** I can work on multiple related assets/pipelines independently.

### Acceptance Criteria & Steps
**Scenario 1: Creating and switching animations**
1. **Given** the user is viewing the "Animations" panel.
2. **When** the user clicks "Add Animation".
3. **Then** a new animation entry appears in the list containing an empty default node graph.
4. **When** the user clicks on a different animation in the list.
5. **Then** the workspace (Node Graph, Timeline, Viewer) immediately updates to reflect the selected animation's state.

**Scenario 2: Renaming an animation**
1. **Given** the user has created "Animation 1".
2. **When** the user selects the text input for the name.
3. **And** types "Player_Run" and presses Enter.
4. **Then** the animation list displays "Player_Run".

**Scenario 3: Deleting an animation**
1. **Given** the user has multiple animations.
2. **When** the user clicks the Delete (Trash) button next to one animation.
3. **Then** it is permanently removed from the project.

### Corner Cases
- Renaming an animation to an empty string (should retain previous or default name).
- Deleting the currently active animation (should fall back to another existing one or create a default if it's the last).
- Concurrency/State mixing: Swapping animations quickly should not bleed state or node processing from the previous animation.

## 3. Tool Switching & UI Panels
**As a** user,
**I want to** switch between different main tool modes (Nodes, Select, Draw, Layout),
**So that** I can focus the main viewport on specific tasks.

### Acceptance Criteria & Steps
**Scenario 1: Switching Modes**
1. **Given** the user is currently in the "Nodes" tool mode.
2. **When** the user clicks the "Layout" button in the left sidebar.
3. **Then** the central viewport switches to the Layout artboard canvas.
4. **And** the view transform (pan/zoom) is loaded specific for Layout mode, independent of Node or Sprite Editor modes.

### Corner Cases
- Maintaining the correct viewport/camera scale and position independently for Layout vs Sprite Editor modes.
- Sidebar sizing limits: Ensuring left/right sidebars have min/max widths.
