# User Story: Sprite Editor & Painting

## 1. Sprite Viewer Canvas
**As a** user,
**I want to** use mouse controls to navigate an infinite canvas displaying my images,
**So that** I can inspect fine pixel details.

### Acceptance Criteria & Steps
**Scenario 1: Panning the canvas**
1. **Given** an image is displayed in the Sprite Editor viewport.
2. **When** the user holds down the Middle Mouse Button (or Spacebar + Left Mouse Button) and drags.
3. **Then** the camera pans synchronously with the mouse movement.

**Scenario 2: Zooming the canvas**
1. **Given** the user is viewing the canvas.
2. **When** the user rotates the scroll wheel up.
3. **Then** the camera zooms into the pixel under the mouse cursor.

### Corner Cases
- Zooming out infinitely (viewport negative scale bugs).
- Pan limits ensuring the image cannot be lost permanently off-screen.

## 2. Selection & Extraction
**As a** user,
**I want to** use a marquee tool to isolate a region of the sprite,
**So that** I can slice a specific character out of a larger sheet.

### Acceptance Criteria & Steps
**Scenario 1: Making a Selection**
1. **Given** the user is in "Select" mode (marquee tool enabled).
2. **When** the user clicks and drags across the sprite.
3. **Then** a semi-transparent bounding box with marching ants (or dashed border) is drawn.
4. **When** the user releases the mouse.
5. **Then** the selection dimensions are finalized and displayed on screen in a tooltip or properties sidebar.

**Scenario 2: Extracting the Selection**
1. **Given** the user has drawn a selection box.
2. **When** the user clicks "Extract Selection" in the toolbar/context menu.
3. **Then** the specific region of pixels is read from the buffer and pushed as a brand new `ImageSource` asset to the project.

### Corner Cases
- Drawing a selection box outside the bounds of the actual image data.
- Creating a zero-width or zero-height selection box (should ignore or cancel selection).

## 3. Paint Overlay
**As a** user,
**I want to** use non-destructive paint tools to modify pixels on top of my sprite,
**So that** I can fix artifacts or block out elements without altering the core file.

### Acceptance Criteria & Steps
**Scenario 1: Painting over pixels**
1. **Given** the user activates "Draw" mode.
2. **When** the user selects a red Brush and drags across the sprite image.
3. **Then** red paint strokes logically appear over the sprite.
4. **And** behind the scenes, these strokes are written into the buffer of an active "Paint Node" connected to the pipeline.

**Scenario 2: Erasing modifications**
1. **Given** the user has heavily painted over an area.
2. **When** the user switches to the Eraser tool and drags over the strokes.
3. **Then** the paint is wiped away, restoring visibility of the original underlying sprite source pixels.

### Corner Cases
- Changing the sizing of the source image upstream AFTER painting over it (the paint bitmap might misalign with the new coordinates).
- Using extremely massive brush sizes causing lag on standard 2D context.
- Erasing on an area that was never painted (should do nothing or punch transparency if applicable).
