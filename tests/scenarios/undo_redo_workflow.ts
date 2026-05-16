import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const undo_redo_workflow: E2EScenario = {
    id: 'undo_redo_workflow',
    name: 'Undo / Redo System',
    description: 'Verify history management allows undoing and redoing actions.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } }
    ],
    steps: [
        {
            name: 'Create a new animation',
            action: async () => {
                await Simulator.click('[data-testid="add-animation-btn"]');
                await Simulator.waitForText('New Anim'); // The default name should end up like this
            }
        },
        {
            name: 'Undo Action',
            action: async () => {
                await Simulator.click('[data-testid="undo-btn"]');
                await new Promise(r => setTimeout(r, 1000));
            }
        },
        {
            name: 'Verify Undo',
            action: async () => {
                // Should not contain New Anim
                const hasAnim2 = document.body.innerText.includes('New Anim');
                if (hasAnim2) {
                    throw new Error('Animation should have been undone');
                }
            }
        },
        {
            name: 'Redo Action',
            action: async () => {
                await Simulator.click('[data-testid="redo-btn"]');
                await new Promise(r => setTimeout(r, 1000));
            }
        },
        {
            name: 'Verify Redo',
            action: async () => {
                await Simulator.waitForText('New Anim', 2000);
            }
        }
    ]
};
