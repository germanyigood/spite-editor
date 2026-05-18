# User Story: Import and Assets Handling

## 1. Drag and Drop Import
**As a** user,
**I want to** drag and drop image files into the application,
**So that** I can quickly load assets into my node pipeline.

### Acceptance Criteria & Steps
**Scenario 1: Importing a valid image**
1. **Given** the user has the browser window open to the AI Studio app.
2. **When** the user drags a PNG file from their local OS.
3. **And** drops it anywhere onto the application window workspace.
4. **Then** the file is processed and added to the project's internal asset library.
5. **And** a new "Source" node is automatically spawned in the active Node Graph containing the imported image.

**Scenario 2: Invalid file type**
1. **Given** the user has the browser window open.
2. **When** the user drops a PDF or ZIP file.
3. **Then** the application rejects the file without crashing.

### Corner Cases
- Dropping multiple large files simultaneously (should handle asynchronously, queue properly, and spawn multiple nodes).
- Dropping an image while in Layout or Draw mode (Should insert a layout element or handle state change gracefully without losing the drag event).
- Replacing an image in an existing Node pipeline vs spawning a new one.

## 2. Live Preview
**As a** user,
**I want to** see the immediate visual result of my assets interacting with nodes,
**So that** I can visually debug my processing pipeline.

### Acceptance Criteria & Steps
**Scenario 1: Automatic Render Update**
1. **Given** an image is loaded into a Source node.
2. **When** the system completes processing the image in the node.
3. **Then** the central Sprite Editor viewport immediately renders that image pixel-perfectly on the canvas.

### Corner Cases
- Extremely large images causing significant rendering bottlenecks.
- Alpha transparency pre-multiplication bugs making transparent edges look dark.

## Observed Bugs & Behavioral Quirks
- Sometimes when injecting an image, a default graph (Source -> Paint -> Chroma -> Grid) is constructed automatically, which might override or heavily modify the user's intent if they drag-and-drop into an already existing complex graph.
