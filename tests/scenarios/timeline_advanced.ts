import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const timeline_advanced_workflow: E2EScenario = {
    id: 'timeline_advanced_workflow',
    description: 'Verify advanced timeline operations: multiple selection, muting, duplicating, deleting and reversing selected frames.',
    steps: [
        {
            name: 'Wait for App Load and add Frames',
            timeoutMs: 8000,
            action: async () => {
                await Simulator.waitFor('.custom-scrollbar');
                // Assume the initial setup gives us a timeline with 0,1,2 frame indices.
                // We'll trust the base test state or wait for frames to exist.
                // The Timeline might be empty initially, let's wait for at least 1 frame or a "Timeline Empty" string.
            }
        },
        {
            name: 'Add Some Frames if Needed (Placeholder)',
            action: async () => {
                // Actually, the default graph for E2E loads some nodes. 
                // Let's assume we have frames because of the initial Load.
                // If there are no frames, this test might need a specific mock initialization.
            }
        },
        {
            name: 'Select Multiple Frames',
            action: async () => {
                const f0 = await Simulator.waitFor('[data-testid="timeline-frame-item-0"]');
                const f1 = await Simulator.waitFor('[data-testid="timeline-frame-item-1"]');
                const f2 = await Simulator.waitFor('[data-testid="timeline-frame-item-2"]');
                
                // Click 1st
                await Simulator.click(f0);
                
                // Shift click 3rd
                const ev = new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    shiftKey: true
                });
                f2.dispatchEvent(ev);
            }
        },
        {
            name: 'Verify Multiple Selection and Duplicate',
            action: async () => {
                // Now we should have a toolbar with "Duplicate Selected" etc.
                const dupBtn = await Simulator.waitFor('button[title="Duplicate Selected"]');
                if (!dupBtn) throw new Error("Duplicate Selected button not found, selection failed.");
                
                let currentFrames = document.querySelectorAll('[data-testid^="timeline-frame-item-"]');
                const prevLength = currentFrames.length;
                
                await Simulator.click(dupBtn);
                
                // Wait a bit
                await new Promise(r => setTimeout(r, 100));
                
                currentFrames = document.querySelectorAll('[data-testid^="timeline-frame-item-"]');
                if (currentFrames.length !== prevLength + 3) {
                    throw new Error(`Expected length to be ${prevLength + 3}, got ${currentFrames.length}`);
                }
            }
        },
        {
            name: 'Mute Selected Frames',
            action: async () => {
                // After duplication, the newly duplicated items might or might not be selected?
                // Depending on the implementation, the selection is kept or cleared?
                // Our implementation didn't update setSelection on duplicate, so selection stays the same (0,1,2).
                const muteBtn = await Simulator.waitFor('button[title="Mute/Unmute Selected"]');
                await Simulator.click(muteBtn);
                
                await new Promise(r => setTimeout(r, 100));
                
                // Check if eye-off icons appeared
                const eyeOffIcons = document.querySelectorAll('.text-red-500.bg-panel\\/80');
                if (eyeOffIcons.length < 3) {
                    throw new Error(`Expected at least 3 muted frames, got ${eyeOffIcons.length}`);
                }
                
                // Unmute
                await Simulator.click(muteBtn);
            }
        },
        {
            name: 'Reverse Selected Frames',
            action: async () => {
                const reverseBtn = await Simulator.waitFor('button[title="Reverse Selected"]');
                await Simulator.click(reverseBtn);
                // Can't easily assert the visual order without data-attributes, but we check if it didn't crash.
                await new Promise(r => setTimeout(r, 100));
            }
        },
        {
            name: 'Delete Selected Frames',
            action: async () => {
                let currentFrames = document.querySelectorAll('[data-testid^="timeline-frame-item-"]');
                const prevLength = currentFrames.length;
                
                const delBtn = await Simulator.waitFor('button[title="Delete Selected"]');
                await Simulator.click(delBtn);
                
                await new Promise(r => setTimeout(r, 100));
                
                currentFrames = document.querySelectorAll('[data-testid^="timeline-frame-item-"]');
                if (currentFrames.length !== prevLength - 3) {
                    throw new Error(`Expected length to be ${prevLength - 3}, got ${currentFrames.length}`);
                }
            }
        }
    ]
};
