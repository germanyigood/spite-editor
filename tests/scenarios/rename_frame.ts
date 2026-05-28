import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const rename_frame_workflow: E2EScenario = {
    id: 'rename_frame_workflow',
    name: 'Rename Frame',
    description: 'Verify double clicking a frame allows it to be renamed and updates UI.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject Test Asset', action: async () => { await Simulator.injectTestImage('TEST.png', '#FFFFFF', '#000000', 64, 64); await new Promise(r => setTimeout(r, 500)); } }
    ],
    steps: [
        {
            name: 'Wait for Default Frame',
            action: async () => {
                await Simulator.waitForText('Frame 0');
            }
        },
        {
            name: 'Double Click to Rename Frame',
            action: async () => {
                await Simulator.dblClick('[data-testid="frame-item"]');
            }
        },
        {
            name: 'Input Name "IDLE_1"',
            action: async () => {
                await Simulator.type('[data-testid="frame-rename-input"]', 'IDLE_1');
                await Simulator.waitForText('IDLE_1');
            }
        }
    ]
};
