import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const timeline_advanced_workflow: E2EScenario = {
    id: 'timeline_advanced_workflow',
    name: 'Advanced Timeline Operations',
    description: 'Verify advanced timeline operations: multiple selection, muting, duplicating, deleting and reversing selected frames.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject Test Asset', action: async () => {
            await Simulator.injectTestImage('TIMELINE_ADV_TEST.png');
            // slice it
            await Simulator.type('[data-testid="num-input-cols"]', '2');
            await Simulator.type('[data-testid="num-input-rows"]', '2');
            await new Promise(r => setTimeout(r, 500));
        } }
    ],
    steps: [
        {
            name: 'Wait for App Load and add Frames',
            timeoutMs: 8000,
            action: async () => {
                await Simulator.waitFor('.custom-scrollbar');
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
                const rect = f2.getBoundingClientRect();
                const evConfig = {
                    bubbles: true,
                    cancelable: true,
                    shiftKey: true,
                    button: 0,
                    buttons: 1,
                    pointerId: 1,
                    isPrimary: true,
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2,
                };
                f2.dispatchEvent(new PointerEvent('pointerdown', evConfig));
                await new Promise(r => setTimeout(r, 50));
                window.dispatchEvent(new PointerEvent('pointerup', {
                    ...evConfig,
                    buttons: 0
                }));
                await new Promise(r => setTimeout(r, 50));
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
                const eyeOffIcons = document.querySelectorAll('.text-red-500.bg-panel\\/85');
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
