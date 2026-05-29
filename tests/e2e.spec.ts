
import { E2EScenario } from '../tools/packages/aistudio-e2e';
import { basic_workflow } from './scenarios/basic_workflow';
import { node_graph_interaction } from './scenarios/node_interaction';
import { node_bypass_workflow } from './scenarios/node_bypass_workflow';
import { viewport_sync } from './scenarios/viewport_sync';
import { layout_composition } from './scenarios/layout_composition';
import { animation_management } from './scenarios/animation_mgmt';
import { grid_slicing_workflow } from './scenarios/grid_slicing';
import { selection_extract_workflow } from './scenarios/selection_extract';
import { timeline_playback_workflow } from './scenarios/timeline_playback';
import { timeline_frames_workflow } from './scenarios/timeline_frames';
import { timeline_advanced_workflow } from './scenarios/timeline_advanced';
import { node_context_menu_workflow } from './scenarios/node_context_menu';
import { draw_brush_workflow } from './scenarios/draw_brush_workflow';
import { draw_eraser_workflow } from './scenarios/draw_eraser_workflow';
import { draw_bucket_workflow } from './scenarios/draw_bucket_workflow';
import { draw_rect_workflow } from './scenarios/draw_rect_workflow';
import { draw_ellipse_workflow } from './scenarios/draw_ellipse_workflow';
import { draw_path_workflow } from './scenarios/draw_path_workflow';
import { vector_tools_workflow } from './scenarios/vector_tools_workflow';
import { chroma_key_workflow } from './scenarios/chroma_key_workflow';
import { undo_redo_workflow } from './scenarios/undo_redo_workflow';
import { rename_frame_workflow } from './scenarios/rename_frame';
import { hotkeys_delete_left_panel } from './scenarios/hotkeys_delete_left_panel';
import { hotkeys_delete_timeline } from './scenarios/hotkeys_delete_timeline';
import { hotkeys_delete_node_editor } from './scenarios/hotkeys_delete_node_editor';
import { hotkeys_tool_switching } from './scenarios/hotkeys_tool_switching';
import { hotkeys_undo_redo } from './scenarios/hotkeys_undo_redo';

export const E2E_SCENARIOS: E2EScenario[] = [
    hotkeys_delete_left_panel,
    hotkeys_delete_timeline,
    hotkeys_delete_node_editor,
    hotkeys_tool_switching,
    hotkeys_undo_redo,
    rename_frame_workflow,
    selection_extract_workflow,
    grid_slicing_workflow,
    basic_workflow,
    node_graph_interaction,
    node_bypass_workflow,
    node_context_menu_workflow,
    viewport_sync,
    layout_composition,
    animation_management,
    timeline_playback_workflow,
    timeline_frames_workflow,
    timeline_advanced_workflow,
    draw_brush_workflow,
    draw_eraser_workflow,
    draw_bucket_workflow,
    draw_rect_workflow,
    draw_ellipse_workflow,
    draw_path_workflow,
    vector_tools_workflow,
    chroma_key_workflow,
    undo_redo_workflow
];
