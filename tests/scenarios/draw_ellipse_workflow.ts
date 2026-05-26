import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const draw_ellipse_workflow: E2EScenario = {
    id: 'draw_ellipse_workflow',
    name: 'Ellipse Tool Workflow',
    description: 'Verify ellipse tool logic.',
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
            name: 'Select Ellipse Tool',
            action: async () => {
                await Simulator.click('[data-testid="draw-tool-ellipse"]');
            }
        },
        {
            name: 'Draw Ellipse on Canvas',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                await Simulator.drag(canvas, -100, -100);
            }
        }
    ]
};
