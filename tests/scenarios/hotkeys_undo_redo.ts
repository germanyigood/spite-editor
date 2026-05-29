import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const hotkeys_undo_redo: E2EScenario = {
    id: 'hotkeys_undo_redo',
    name: 'Hotkey: Undo / Redo',
    description: 'Verify Mod+Z and Mod+Y correctly undo and redo actions.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } }
    ],
    steps: [
        {
            name: 'Create a new animation',
            action: async () => {
                await Simulator.click('[data-testid="add-animation-btn"]');
                await Simulator.waitForText('New Anim');
            }
        },
        {
            name: 'Undo Action with Mod+Z',
            action: async () => {
                // Modifier usually represents Ctrl on Windows, Meta on Mac. In Simulator we can just pass both to be safe or map it.
                // The HotkeyEngine treats 'Mod' as e.ctrlKey || e.metaKey.
                await Simulator.dispatchKeyboardEvent(document.body, 'keydown', 'z', 'z', { ctrlKey: true });
                await Simulator.dispatchKeyboardEvent(document.body, 'keyup', 'z', 'z', { ctrlKey: true });
                await new Promise(r => setTimeout(r, 500));
            }
        },
        {
            name: 'Verify Undo',
            action: async () => {
                const hasAnim2 = document.body.innerText.includes('New Anim');
                if (hasAnim2) {
                    throw new Error('Animation should have been undone');
                }
            }
        },
        {
            name: 'Redo Action with Mod+Y',
            action: async () => {
                await Simulator.dispatchKeyboardEvent(document.body, 'keydown', 'y', 'y', { ctrlKey: true });
                await Simulator.dispatchKeyboardEvent(document.body, 'keyup', 'y', 'y', { ctrlKey: true });
                await new Promise(r => setTimeout(r, 500));
            }
        },
        {
            name: 'Verify Redo',
            action: async () => {
                await Simulator.waitForText('New Anim', 2000);
            }
        }
    ]
};
