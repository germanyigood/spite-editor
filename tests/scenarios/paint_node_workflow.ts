import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const paint_node_workflow: E2EScenario = {
    id: 'paint_node_workflow',
    name: 'Paint Node Workflow',
    description: 'Verify drawing tools logic across the sprite editor canvas.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject Test Asset', action: async () => await Simulator.injectTestImage('PAINT_TEST.png', '#FF00FF', '#000000') }
    ],
    steps: [
        {
            name: 'Switch to Draw Mode',
            action: async () => {
                await Simulator.click('[data-testid="tool-draw"]');
            }
        },
        {
            name: 'Select Brush Tool',
            action: async () => {
                await Simulator.click('[data-testid="draw-tool-brush"]');
            }
        },
        {
            name: 'Draw on Canvas',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="infinite-canvas"]');
                await Simulator.drag(canvas, 100, 100);
            }
        },
        {
            name: 'Select Eraser Tool',
            action: async () => {
                await Simulator.click('[data-testid="draw-tool-eraser"]');
            }
        },
        {
            name: 'Erase on Canvas',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="infinite-canvas"]');
                await Simulator.drag(canvas, -50, -50);
            }
        }
    ]
};
