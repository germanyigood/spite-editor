# Design Document: Timeline Advanced Features

## Overview
The Timeline system currently supports basic playback, frame reordering, and single-frame operations. To improve the animation workflow, we need to introduce advanced frame management capabilities: 
- Frame Muting
- Multiple Frame Selection (Marquee/Bounding Box)
- Multiple Frame Moving
- Frame Copying / Duplication
- Frame Reversing (Inverting order of selected frames)

## 1. Frame Muting (Отключение кадров без удаления)

**Concept:** 
Allow users to temporarily disable a frame from playback and export without losing its position in the timeline.

**State Representation:**
Currently, `TimelineNodeData.frames` is a `number[]` representing global source indices. To support muting without breaking existing data structures, we can introduce an additional array, `mutedIndices: number[]`, parallel to the frames logic.

*Proposed change in `TimelineNodeData`:*
```typescript
interface TimelineNodeData {
    frames: number[];
    mutedIndices?: number[]; // Array of local indices currently muted in this timeline
    // ... existing properties
}
```

**Behavior:**
- **Playback:** When the playhead advances, it skips any index present in `mutedIndices`.
- **Export:** The exported GIF/sprite sheet ignores muted frames.
- **UI:** Muted frames in the `Timeline.tsx` are rendered with lower opacity and a crossed-out eye icon or "M" badge.

## 2. Multiple Frame Selection (Множественное выделение через рамку)

**Concept:**
Users can select multiple frames by clicking and dragging a selection box (marquee), or by shift-clicking/ctrl-clicking.

**State Representation:**
- Add `selectedIndices: Set<number>` to the local state of the `Timeline` component. This handles transient UI state without spamming the global reducer.

**Behavior:**
- **Mouse Events:** Implement a dragging state `isSelecting: boolean` and `selectionBox: { startX, endX }` on the timeline container.
- **Intersection:** Any frame whose visual center (or bounds) intersects the `selectionBox` becomes part of `selectedIndices`.
- **Keyboard Modifiers:** 
  - `Shift+Click`: Add contiguous range to selection.
  - `Ctrl/Cmd+Click`: Toggle individual frame selection.

## 3. Multiple Frame Moving (Массовое перемещение кадров)

**Concept:**
Allow dragging all currently selected frames as a contiguous block to a new position in the timeline.

**Behavior:**
- **Drag Start:** If the user starts dragging a frame that belongs to `selectedIndices`, the entire selection is considered the drag payload.
- **Drag Over/Drop:** Calculate the insertion index. Remove the selected frames from their original positions and splice them in at the chosen drop index. 
- **Action Extension:** Make the existing drag-and-drop logic support arrays of indices rather than a single `dragSourceIndex`.

## 4. Copying Frames (Копирование кадров)

**Concept:**
Duplicate the selected frames without affecting the source frames. 

**Behavior:**
- **UI & Shortcuts:** Add a "Duplicate" button and support Keyboard Shortcuts (`Ctrl+D` or `Ctrl+C/V` / `Alt+Drag`).
- **Insertion:** Copied frames are typically inserted immediately after the last selected frame, moving subsequent frames to the right. 

## 5. Inverting Selected Frames (Инвертирование/Реверс выбранных кадров)

**Concept:**
Reverse the chronological order of the selected frames. Very useful for "ping-pong" animation loops (e.g., an arm swinging outwards, then we copy the frames and reverse them to swing it back inwards seamlessly).

**Behavior:**
- **UI Action:** A new button in the timeline toolbar: "Reverse Selected".
- **Logic:** 
  - Extract the frames at the `selectedIndices`.
  - Reverse the extracted array.
  - Insert them back either at their original contiguous block position, or if they were non-contiguous, place them contiguously at the start of the selection block (or map them exactly back to their original slots reversed).

## Implementation Roadmap

1. **Core Data Structure:** Expand `TimelineNodeData` and types.
2. **Timeline Toolbar:** Add new UI buttons (Mute, Duplicate, Reverse, Delete Selected) that activate when `selectedIndices.size > 0`.
3. **Selection Logic:** Implement Marquee selection dragging (`onMouseDown`, `onMouseMove` over the timeline container).
4. **Drag & Drop Refactor:** Upgrade the HTML5 Drag-and-Drop in `Timeline.tsx` to handle a payload of multiple indices instead of just one.
5. **Playback/Export Update:** Adjust the interval hook and node logic to "jump over" `mutedIndices` gracefully without breaking loop conditions.
