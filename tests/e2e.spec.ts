
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
import { paint_node_workflow } from './scenarios/paint_node_workflow';
import { chroma_key_workflow } from './scenarios/chroma_key_workflow';
import { undo_redo_workflow } from './scenarios/undo_redo_workflow';
import { node_context_menu_workflow } from './scenarios/node_context_menu';

export const E2E_SCENARIOS: E2EScenario[] = [
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
    paint_node_workflow,
    chroma_key_workflow,
    undo_redo_workflow
];
