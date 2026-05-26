import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const draw_path_workflow: E2EScenario = {
    id: 'draw_path_workflow',
    name: 'Path Tool Workflow',
    description: 'Verify path tool logic.',
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
            name: 'Select Path Tool',
            action: async () => {
                await Simulator.click('[data-testid="draw-tool-path"]');
            }
        },
        {
            name: 'Draw Path on Canvas',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                await Simulator.clickAt(canvas, 150, 150);
                await Simulator.clickAt(canvas, 300, 300);
                await Simulator.clickAt(canvas, 200, 300);
                
                // Close the path
                await Simulator.rightClick(canvas);
            }
        }
    ]
};
