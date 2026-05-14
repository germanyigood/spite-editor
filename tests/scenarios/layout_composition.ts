import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const layout_composition: E2EScenario = {
    id: 'layout_composition',
    name: 'UI Layout Designer',
    description: 'Test layout element creation and tool switching.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Load Layout Background', action: async () => await Simulator.injectTestImage('UI_BG.png', '#222222', '#000000') }
    ],
    steps: [
        {
            name: 'Open Layout Editor',
            action: async () => {
                await Simulator.click('[data-testid="tool-layout"]');
            }
        },
        {
            name: 'Activate "Draw Box" Tool',
            action: async () => {
                await Simulator.click('[data-testid="layout-tool-create"]');
            }
        },
        {
            name: 'Draw Element on Canvas',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="infinite-canvas"]');
                await Simulator.drag(canvas, 100, 100);
            }
        },
        {
            name: 'Verify Layout Properties Panel',
            action: async () => {
                await Simulator.waitForText('Layout Properties');
                await Simulator.waitForText('New Box');
            }
        }
    ]
};