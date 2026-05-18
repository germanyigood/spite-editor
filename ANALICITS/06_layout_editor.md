# User Story: Layout Editor

## 1. Artboard Interaction & Spawning
**As a** layout designer,
**I want to** create blocks, text elements, and slices on a predefined artboard,
**So that** I can prototype in-game UI structures overlaying my sprites.

### Acceptance Criteria & Steps
**Scenario 1: Creating a layout box**
1. **Given** the user switches to the "Layout" tool via the left sidebar.
2. **When** the user clicks and drags their mouse across the artboard canvas.
3. **Then** a new rectangular layout element is instantiated.
4. **And** it appears on screen with default styling indicating its selection.

**Scenario 2: Camera separation**
1. **Given** the user has zoomed in 500% in Sprite Editor mode.
2. **When** the user clicks "Layout" tool.
3. **Then** the Layout artboard is displayed at its own independent zoom level (e.g., 100%), preventing jarring snapping.

### Corner Cases
- Switching back and forth rapidly without saving state.
- Drawing a box starting from negative world coordinates yielding inverted dimensions if geometry math is flawed.

## 2. Properties Adjustment
**As a** layout designer,
**I want to** tweak geometry, names, and visual properties of my drawn layout elements,
**So that** they match required game engine specs.

### Acceptance Criteria & Steps
**Scenario 1: Modifying position and dimensions**
1. **Given** the user clicks to select a layout element they previously drew.
2. **When** the user opens the Properties sidebar on the right.
3. **And** they change the `width` from 100 to 200 via input field.
4. **Then** the layout element visually expands to 200 pixels wide on the canvas in real-time.

**Scenario 2: Toggling Visibility & Lock**
1. **Given** an element on the canvas.
2. **When** the user clicks the "Eye" (visibility) toggle in the properties/layer list.
3. **Then** the element disappears from the canvas.
4. **When** the user clicks the "Padlock" toggle.
5. **Then** the element cannot be selected, dragged, or modified via canvas clicks.

### Corner Cases
- Setting width/height to negative numbers or zero (engine must cap bounds).
- Locking an element making it un-selectable on canvas, but STILL allowing selection and unlocking via a dedicated layer tree panel.
