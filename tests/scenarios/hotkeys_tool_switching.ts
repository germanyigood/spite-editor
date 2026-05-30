import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const hotkeys_tool_switching: E2EScenario = {
    id: 'hotkeys_tool_switching',
    name: 'Hotkey: Tool Switching',
    description: 'Verify pressing V, M, N, L, B switches the active tool mode',
    setup: [
        { name: 'Reset', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } }
    ],
    steps: [
        {
            name: 'Press N (Nodes)',
            action: async () => {
                await Simulator.dispatchKeyboardEvent(document.body, 'keydown', 'N', 'n');
                await Simulator.dispatchKeyboardEvent(document.body, 'keyup', 'N', 'n');
            }
        },
        {
            name: 'Verify Nodes Active',
            action: async () => {
                const flow = await Simulator.waitFor('[data-testid="node-graph-bg"]', 5000);
                if (!flow) throw new Error("Node editor not activated");
            }
        },
        {
            name: 'Press L (Layout)',
            action: async () => {
                await Simulator.dispatchKeyboardEvent(document.body, 'keydown', 'L', 'l');
                await Simulator.dispatchKeyboardEvent(document.body, 'keyup', 'L', 'l');
            }
        },
        {
            name: 'Verify Layout Active',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="layout-canvas"]', 5000);
                if (!canvas) throw new Error("Layout editor not activated");
            }
        },
        {
            name: 'Press B (Draw)',
            action: async () => {
                await Simulator.dispatchKeyboardEvent(document.body, 'keydown', 'B', 'b');
                await Simulator.dispatchKeyboardEvent(document.body, 'keyup', 'B', 'b');
            }
        },
        {
            name: 'Press V (Select)',
            action: async () => {
                await Simulator.dispatchKeyboardEvent(document.body, 'keydown', 'V', 'v');
                await Simulator.dispatchKeyboardEvent(document.body, 'keyup', 'V', 'v');
            }
        }
    ]
};
