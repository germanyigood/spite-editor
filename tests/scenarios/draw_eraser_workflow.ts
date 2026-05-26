import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const draw_eraser_workflow: E2EScenario = {
    id: 'draw_eraser_workflow',
    name: 'Eraser Tool Workflow',
    description: 'Verify eraser tool logic across the sprite editor canvas.',
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
            name: 'Select Eraser Tool',
            action: async () => {
                await Simulator.click('[data-testid="draw-tool-eraser"]');
            }
        },
        {
            name: 'Erase on Canvas',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                await Simulator.drag(canvas, -50, -50);
            }
        }
    ]
};
