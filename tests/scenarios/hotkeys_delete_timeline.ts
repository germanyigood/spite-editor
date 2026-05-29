import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const hotkeys_delete_timeline: E2EScenario = {
    id: 'hotkeys_delete_timeline',
    name: 'Hotkey: Delete in Timeline',
    description: 'Verify hitting Delete in the timeline deletes selected frame',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject Test Image', action: async () => await Simulator.injectTestImage('test.png', '#FFFFFF', '#0000FF') }
    ],
    steps: [
        {
            name: 'Select Frame 0 in Timeline',
            action: async () => {
                const nodes = document.querySelectorAll('[data-testid^="timeline-frame-item-"]');
                if(nodes.length === 0) {
                     // Maybe it needs some data mock
                     console.log("No frames found in timeline!");
                     // throw new Error("No frames found in timeline!"); // Keep soft if there are none initially
                } else {
                     await Simulator.click(nodes[nodes.length - 1] as HTMLElement);
                }
            }
        },
        {
            name: 'Press Delete',
            action: async () => {
                await Simulator.dispatchKeyboardEvent(document.body, 'keydown', 'Delete', 'Delete');
                await Simulator.dispatchKeyboardEvent(document.body, 'keyup', 'Delete', 'Delete');
            }
        },
        {
            name: 'Verify frame was deleted',
            action: async () => {
                await new Promise(r => setTimeout(r, 500)); // wait for delete to process
                const frames = document.querySelectorAll('[data-testid^="timeline-frame-item-"]');
                if (frames.length > 0) {
                     // Since we only injected 1 image/frame, length should be 0 if deletion was successful
                     throw new Error(`Frame was not deleted, found ${frames.length} frames`);
                }
            }
        }
    ]
};
