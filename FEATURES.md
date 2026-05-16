# Project Features

## Core App Infrastructure
- **Global Drag and Drop**: Import assets (images/videos) directly by dropping them onto the window.
- **Project Context Management**: Redux-like centralized state with undo/redo capabilities (`ProjectContext`).
- **Layout Shell**: Resizable panels (Left, Right, Timeline) wrapping the main viewport.
- **Project Export**: Download generated sprite sheets or data.

## Animation & Resource Management (Left Sidebar)
- **Animation List Panel**: Create, rename, delete, and switch between different "Animations/Scenes".
- **Global Resources Panel**: Assets loaded into the project workspace.

## Node Graph Engine
- **Headless Node Computation**: A compute engine that correctly flows image bitmaps from sources up correctly mapped chains.
- **Node Types**:
    - **Source**: Outputs imported images/video frames.
    - **Paint**: Allows manual drawing/erasing over the source image.
    - **Chroma**: Keying out a specific background color with tolerance/spill controls.
    - **Grid**: Slicing the output of a node into a sequence of frames by configuring rows, cols, cell dimension, and margins.
- **Visual Node Graph Tool (`ToolMode = 'nodes'`)**: Draggable connections, right-click context menus to spawn nodes, bypassing nodes, visual layout of the pipeline.

## Settings & Properties (Right Sidebar)
- **Tool Selection**: Changing between `nodes`, `select`, `draw`, `layout`.
- **Node Properties Editing**: Inspector that updates attributes specific to the currently selected node type.
    - E.g., `GridNode` exposes rows and cols inputs, `ChromaNode` exposes color pickers.
- **Live Output Preview**: Mini-preview window showing the output payload of the currently selected node.

## Interactive Tools (Main Viewport Stack)
- **Sprite Editor / Viewer (`ToolMode = 'select' | 'draw'`)**: Allows inspecting individual imported layers. In `draw` mode, provides brush/eraser logic via an overlay canvas intersecting with the `PaintNode`.
- **Layout Editor (`ToolMode = 'layout'`)**: Allows placing animated layers freely on a unified canvas plane (scaling, moving). 

## Timeline
- **Animation Playback**: Play, pause, adjust FPS for the final output result of the graph.
- **Frame Selection**: Select specific frames outputted by the Grid Nodes across active layers to align animations.

## Diagnostics & Tests
- **Simulator (`E2EEngine`)**: Built-in test automation running directly against the Live DOM and Canvas elements. Allows step-by-step test execution and inspection.
