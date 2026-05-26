import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const draw_rect_workflow: E2EScenario = {
    id: 'draw_rect_workflow',
    name: 'Rect Tool Workflow',
    description: 'Verify rect tool logic.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject Test Asset', action: async () => await Simulator.injectTestImage('PAINT_TEST.png', '#FFFFFF', '#000000') }
    ],
    steps: [
        {
            name: 'Switch to Draw Mode',
            action: async () => {
                await Simulator.click('[data-testid="tool-draw"]');
            }
        },
        {
            name: 'Select Rectangle Tool',
            action: async () => {
                await Simulator.click('[data-testid="draw-tool-rect"]');
            }
        },
        {
            name: 'Draw Rectangle on Canvas',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                await Simulator.drag(canvas, 100, 100);
            }
        }
    ]
};
