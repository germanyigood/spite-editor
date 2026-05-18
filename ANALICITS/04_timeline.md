# User Story: Timeline & Automation

## 1. Playback Controls
**As a** user,
**I want to** use standard media controls to preview my animation sequence,
**So that** I can evaluate timing and frame flow.

### Acceptance Criteria & Steps
**Scenario 1: Playing animation**
1. **Given** the user has a Timeline populated with at least 2 frames.
2. **When** the user clicks the "Play" button.
3. **Then** the Playhead begins advancing across the timeline frames automatically based on the FPS setting.
4. **And** the main Sprite Editor view updates to show the visual frame matching the playhead.

**Scenario 2: Changing FPS**
1. **Given** the timeline is playing at 12 FPS.
2. **When** the user modifies the FPS input to 24.
3. **Then** the playhead speed immediately doubles without stopping.

### Corner Cases
- Setting FPS to extreme values (0, negative, or alphanumeric text).
- Triggering playback when the timeline has 0 frames or 1 frame.
- Scrubber dragging while timeline is playing.

## 2. Timeline Frame Management
**As a** user,
**I want to** explicitly duplicate or remove frames from the sequence,
**So that** I can design custom timing loops (e.g., holding a frame longer).

### Acceptance Criteria & Steps
**Scenario 1: Duplicating a Frame**
1. **Given** a timeline sequence: Frame A, Frame B.
2. **When** the user right-clicks Frame A and selects "Duplicate" from the context menu.
3. **Then** a new Frame A is spawned immediately to the right.
4. **And** the sequence becomes: Frame A, Frame A, Frame B.

**Scenario 2: Removing a Frame**
1. **Given** a timeline sequence: Frame A, Frame B.
2. **When** the user right-clicks Frame A and selects "Remove".
3. **Then** Frame A is removed.
4. **And** Frame B shifts to the left, taking index 0.

**Scenario 3: Removing final frame / Selection Bounds**
1. **Given** a timeline has only 1 frame, and the playhead is currently selecting it.
2. **When** the user right-clicks and Deletes it.
3. **Then** the timeline becomes empty.
4. **And** the Playhead index automatically adjusts to index 0, rather than pointing to out-of-bounds data or staying at an invalid index.

### Corner Cases
- Deleting the very last frame while the playhead is on it (must correctly wrap/clamp the playhead).
- Right clicking while dragging a frame.

## 3. Timeline Node Selection
**As a** user,
**I want to** switch which timeline node I am previewing,
**So that** I can build multiple isolated animations within the same scene.

### Acceptance Criteria & Steps
**Scenario 1: Viewing alternate timeline outputs**
1. **Given** the node graph has two Timeline Nodes: "Timeline 1" and "Timeline 2".
2. **When** the user clicks the dropdown in the Timeline Panel toolbar.
3. **And** selects "Timeline 2".
4. **Then** the track UI completely repaints to display the frames belonging strictly to "Timeline 2".
5. **And** scrubbing this timeline does not affect the cursor state of "Timeline 1".

### Corner Cases
- What happens if the selected Timeline node is deleted from the graph? The panel should fall back to another existing Timeline node or clear.
- Re-ordering frames in Timeline A shouldn't mutate referenced frames in Timeline B.
