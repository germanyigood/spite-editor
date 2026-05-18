import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const timeline_frames_workflow: E2EScenario = {
    id: 'timeline_frames_workflow',
    name: 'Timeline Frame Management',
    description: 'Comprehensively test timeline frame management: add, duplicate, delete, and edge cases, ensuring no lazy evaluation.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject Test Asset', action: async () => await Simulator.injectTestImage('TIMELINE_MAN_TEST.png', '#222222', '#FFFFFF') }
    ],
    steps: [
        {
            name: 'Check Initial Frames Propagation',
            action: async () => {
                const firstFrame = await Simulator.waitFor('[data-testid="timeline-frame-item-0"]');
                if (!firstFrame) {
                     throw new Error("Initial frame not found");
                }
                const frames = document.querySelectorAll('[data-testid^="timeline-frame-item-"]');
                if (frames.length === 0) throw new Error("Expected at least 1 frame to be rendered.");
            }
        },
        {
            name: 'Duplicate Frame (Index 0)',
            action: async () => {
                const initialFrames = document.querySelectorAll('[data-testid^="timeline-frame-item-"]');
                const initialCount = initialFrames.length;

                const frameEl = await Simulator.waitFor('[data-testid="timeline-frame-item-0"]');
                await Simulator.rightClick(frameEl, 10, 10);

                const duplicateBtn = await Simulator.waitFor('[data-testid="context-menu-item-duplicate"]');
                await Simulator.click(duplicateBtn);

                await new Promise(r => setTimeout(r, 300));
                
                const currentFrames = document.querySelectorAll('[data-testid^="timeline-frame-item-"]');
                if (currentFrames.length !== initialCount + 1) {
                    throw new Error(`Duplicate failed. Expected ${initialCount + 1} frames, got ${currentFrames.length}`);
                }
            }
        },
        {
            name: 'Delete Frame (Index 1)',
            action: async () => {
                const initialFrames = document.querySelectorAll('[data-testid^="timeline-frame-item-"]');
                const initialCount = initialFrames.length;

                // Delete the frame we just duplicated
                const frameEl = await Simulator.waitFor('[data-testid="timeline-frame-item-1"]');
                await Simulator.rightClick(frameEl, 10, 10);

                const deleteBtn = await Simulator.waitFor('[data-testid="context-menu-item-delete"]');
                await Simulator.click(deleteBtn);

                await new Promise(r => setTimeout(r, 300));

                const currentFrames = document.querySelectorAll('[data-testid^="timeline-frame-item-"]');
                if (currentFrames.length !== initialCount - 1) {
                    throw new Error(`Delete failed. Expected ${initialCount - 1} frames, got ${currentFrames.length}`);
                }
            }
        },
        {
            name: 'Verify Playhead Bounds after Last Frame Deletion',
            action: async () => {
                // First let's seek to the last frame
                let frames = document.querySelectorAll('[data-testid^="timeline-frame-item-"]');
                let count = frames.length;
                if (count < 1) throw new Error("Need frames to test bounds.");
                
                const lastFrameIndex = count - 1;
                const lastFrame = await Simulator.waitFor(`[data-testid="timeline-frame-item-${lastFrameIndex}"]`);
                await Simulator.click(lastFrame);
                
                // Now delete the last frame
                await Simulator.rightClick(lastFrame, 10, 10);
                const deleteBtn = await Simulator.waitFor('[data-testid="context-menu-item-delete"]');
                await Simulator.click(deleteBtn);
                
                await new Promise(r => setTimeout(r, 300));
                
                frames = document.querySelectorAll('[data-testid^="timeline-frame-item-"]');
                if (frames.length !== count - 1) {
                     throw new Error(`Failed to delete the last frame properly. Expected ${count - 1}, got ${frames.length}.`);
                }
                
                // The playhead text should display the new correct index + 1 (i.e. updated cursor)
                const playheadText = await Simulator.waitFor('[data-testid="timeline-playhead-index"]');
                const playheadIdx = parseInt(playheadText.innerText) - 1;
                
                // Cursor should never be out of bounds. Since we deleted the last frame and it was selected,
                // the cursor should ideally decrement by 1, wrapping to the new last frame, or 0 if empty.
                if (playheadIdx >= frames.length && frames.length !== 0) {
                     throw new Error(`Playhead index (${playheadIdx}) is out of bounds for frames length (${frames.length}).`);
                }
            }
        }
    ]
};

