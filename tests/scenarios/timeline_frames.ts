import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const timeline_frames_workflow: E2EScenario = {
    id: 'timeline_frames_workflow',
    name: 'Timeline Frame Management',
    description: 'Verify adding and deleting frames from the timeline functions correctly.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject Test Asset', action: async () => await Simulator.injectTestImage('TIMELINE_MAN_TEST.png', '#222222', '#FFFFFF') }
    ],
    steps: [
        {
            name: 'Check Initial Frames',
            action: async () => {
                // Wait for frames to propagate. Initially grid might take a few moments.
                const firstFrame = await Simulator.waitFor('[data-testid="timeline-frame-item-0"]');
                if (!firstFrame) {
                     throw new Error("Initial frame not found");
                }
            }
        },
        {
            name: 'Delete Frame via Context Menu',
            action: async () => {
                const state = window.__getGlobalState?.();
                if (!state) throw new Error("Could not access global state");
                
                const anim = state.animations.find(a => a.id === state.currentAnimId);
                const timelineNode = anim?.nodeGraph.nodes.find(n => n.type === 'timeline');
                
                if (!timelineNode) throw new Error("No timeline node found");
                const frameCountBefore = timelineNode.data.frames.length;
                if (frameCountBefore === 0) throw new Error("Timeline has 0 frames before test");

                // Right click the first frame
                const frameEl = await Simulator.waitFor('[data-testid="timeline-frame-item-0"]');
                Simulator.fireEvent(frameEl, 'contextmenu', { 
                    clientX: frameEl.getBoundingClientRect().x + 10, 
                    clientY: frameEl.getBoundingClientRect().y + 10 
                });

                // Wait for context menu to appear and click "Remove"
                const removeBtn = await Simulator.waitFor('[data-testid="context-menu-item-delete"]');
                await Simulator.click(removeBtn);
                
                // Allow state updates to settle
                await new Promise(r => setTimeout(r, 600));
                
                const stateAfter = window.__getGlobalState?.();
                const animAfter = stateAfter.animations.find(a => a.id === stateAfter.currentAnimId);
                const timelineNodeAfter = animAfter?.nodeGraph.nodes.find(n => n.type === 'timeline');
                
                if (timelineNodeAfter.data.frames.length !== frameCountBefore - 1) {
                    throw new Error(`Expected ${frameCountBefore - 1} frames after deletion, got ${timelineNodeAfter.data.frames.length}`);
                }
            }
        }
    ]
};
