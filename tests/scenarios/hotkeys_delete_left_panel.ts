import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const hotkeys_delete_left_panel: E2EScenario = {
    id: 'hotkeys_delete_left_panel',
    name: 'Hotkey: Delete in Left Panel',
    description: 'Verify hitting Delete in the left panel deletes selected frame/layer',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject Test Image', action: async () => await Simulator.injectTestImage('test.png', '#FFFFFF', '#0000FF') }
    ],
    steps: [
        {
            name: 'Ensure Left Panel is mounted and frame is selected',
            action: async () => {
                const imgNode = await Simulator.waitForText('test.png');
                await Simulator.click(imgNode);
            }
        },
        {
            name: 'Select Frame 0',
            action: async () => {
                const frames = document.querySelectorAll('[data-testid="frame-item"]');
                if (frames.length > 0) {
                    await Simulator.click(frames[0] as HTMLElement);
                } else {
                    throw new Error("No frames found");
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
                const frames = document.querySelectorAll('[data-testid="frame-item"]');
                if (frames.length > 0) {
                    throw new Error("Frame 0 was not deleted!");
                }
            }
        }
    ]
};
