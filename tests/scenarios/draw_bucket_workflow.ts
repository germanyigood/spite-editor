import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const draw_bucket_workflow: E2EScenario = {
    id: 'draw_bucket_workflow',
    name: 'Bucket Tool Workflow',
    description: 'Verify bucket tool logic.',
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
            name: 'Select Bucket Tool',
            action: async () => {
                await Simulator.click('[data-testid="draw-tool-bucket"]');
            }
        },
        {
            name: 'Fill on Canvas',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                await Simulator.click(canvas);
            }
        }
    ]
};
