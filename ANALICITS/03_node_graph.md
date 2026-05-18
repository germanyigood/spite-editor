# User Story: Node Graph Engine

## 1. Visual Node Pipeline & Workspace
**As a** user,
**I want to** construct and organize visual node-based image processing pipelines,
**So that** I can non-destructively edit, slice, and sequence sprite sheets.

### Acceptance Criteria & Steps
**Scenario 1: Organizing nodes**
1. **Given** the user has multiple nodes spawned in the Node Graph panel.
2. **When** the user clicks and holds the title bar of a node.
3. **And** drags the mouse cursor.
4. **Then** the node moves visually across the graph.
5. **And** any connected wires fluidly update their paths to follow the node.

### Corner Cases
- Dragging nodes extremely far outside the visible area, causing them to get "lost".
- Negative coordinates in standard viewport bounds calculation.

## 2. Spawning & Connecting Nodes
**As a** user,
**I want to** spawn new nodes and connect them with wires,
**So that** I can build logic from Source to Output.

### Acceptance Criteria & Steps
**Scenario 1: Context Menu Spawning**
1. **Given** the user is viewing the Node Graph.
2. **When** the user right-clicks an empty area of the graph.
3. **Then** a context menu appears with a list of available nodes.
4. **When** the user selects "Chroma Key".
5. **Then** a new Chroma Key node is spawned exactly at the mouse cursor position.

**Scenario 2: Connecting Nodes**
1. **Given** the user has a "Source" node and a "Chroma Key" node.
2. **When** the user clicks and drags from the output socket of the Source node.
3. **And** drops the wire onto the input socket of the Chroma Key node.
4. **Then** a visual wire connects them permanently.
5. **And** the data flows from Source to Chroma Key, updating the output buffer.

### Corner Cases
- Connecting an output of type 'IMAGE' to an input expecting 'IMAGE_SEQUENCE' should throw a type validation error visually.
- Attempting cyclic connections (A -> B -> A). The engine should reject the connection drop or prevent infinite loops.
- Unplugging the connection to the final Output or Timeline node (should handle null render states gracefully, defaulting to black or checkerboard).

## 3. Node Bypassing
**As a** user,
**I want to** temporarily disable a node without destroying connections,
**So that** I can A/B test pipeline changes easily.

### Acceptance Criteria & Steps
**Scenario 1: Bypassing an effect filter**
1. **Given** the user has Source -> Chroma Key -> Output connected.
2. **When** the user clicks the "Bypass" (or power) icon on the Chroma Key node.
3. **Then** the node visually dims to indicate it's inactive.
4. **And** the data passes straight through from Source to Output unchanged.

### Corner Cases
- Bypassing a Source Node (what does it output? Nothing? Black?).
- Bypassing a structural node (e.g., Grid) that changes payload type from IMAGE to IMAGE_SEQUENCE. If bypassed, downstream nodes expecting a sequence might receive a single flat image, causing data pipeline crashes.

## 4. Properties Editing
**As a** user,
**I want to** modify specific properties for each active node,
**So that** I can fine-tune image effects.

### Acceptance Criteria & Steps
**Scenario 1: Adjusting a filter slider**
1. **Given** the user has selected a "Chroma Key" node.
2. **When** the user looks at the Properties Sidebar.
3. **And** the user adjusts the "Threshold" slider from 0.1 to 0.5.
4. **Then** the node re-evaluates its output buffer using the new threshold and updates the main viewer.

### Corner Cases
- Assigning negative values or out-of-bounds text input in threshold number fields.
- Rapidly sliding values while the engine processes heavy effects can freeze the UI if not debounced.

## Observed Bugs & Behavioral Quirks
- Bypassing structural nodes (like Grid) that morph the schema type can cause failures in downstream Timeline nodes expecting `frames` arrays.
