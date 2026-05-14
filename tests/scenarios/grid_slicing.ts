import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const grid_slicing_workflow: E2EScenario = {
    id: 'grid_slicing_workflow',
    name: 'Grid Slicing (2x2)',
    description: 'Verify the ability to slice an image into a 2x2 grid and check frame count.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject 2x2 Number Atlas', action: async () => await Simulator.injectTestImage('NUMBERS_2x2.png') }
    ],
    steps: [
        {
            name: 'Switch to Node Graph',
            action: async () => {
                await Simulator.click('[data-testid="tool-nodes"]');
            }
        },
        {
            name: 'Select Slice Grid Node',
            action: async () => {
                const gridLabel = await Simulator.waitForText('SLICE GRID');
                await Simulator.click(gridLabel);
            }
        },
        {
            name: 'Set Rows to 2',
            action: async () => {
                await Simulator.type('[data-testid="num-input-rows"]', '2');
            }
        },
        {
            name: 'Set Cols to 2',
            action: async () => {
                await Simulator.type('[data-testid="num-input-cols"]', '2');
            }
        },
        {
            name: 'Verify "Total Frames" is 4',
            action: async () => {
                await Simulator.waitForText('4'); 
            }
        },
        {
            name: 'Verify Timeline Sync',
            action: async () => {
                await Simulator.waitForText('3'); 
                await Simulator.waitForText('/ 4');
            }
        }
    ]
};