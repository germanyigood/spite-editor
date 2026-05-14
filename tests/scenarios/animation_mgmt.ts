import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const animation_management: E2EScenario = {
    id: 'animation_management',
    name: 'Multi-Animation Manager',
    description: 'Verify creation and renaming of multiple animation sheets.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } }
    ],
    steps: [
        {
            name: 'Click "Add Animation"',
            action: async () => {
                await Simulator.click('[data-testid="add-animation-btn"]');
            }
        },
        {
            name: 'Wait for "New Anim" entry',
            action: async () => {
                await Simulator.waitForText('New Anim');
            }
        },
        {
            name: 'Double Click to Rename',
            action: async () => {
                await Simulator.dblClick('[data-testid="anim-item-name"]');
            }
        },
        {
            name: 'Input Name "RUN_CYCLE"',
            action: async () => {
                await Simulator.type('[data-testid="anim-rename-input"]', 'RUN_CYCLE');
                await Simulator.waitForText('RUN_CYCLE');
            }
        }
    ]
};