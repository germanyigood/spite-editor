
import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const selection_extract_workflow: E2EScenario = {
    id: 'selection_extract_workflow',
    name: 'Selection & Extract',
    description: 'Verify the ability to select a region and extract it into a new layer.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject Test Asset', action: async () => await Simulator.injectTestImage('EXTRACT_ME.png', '#222222', '#FFFFFF') }
    ],
    steps: [
        {
            name: 'Switch to Draw Mode',
            action: async () => {
                await Simulator.click('[data-testid="tool-draw"]');
            }
        },
        {
            name: 'Select "Selection" Tool',
            action: async () => {
                await Simulator.click('[data-testid="draw-tool-select"]');
            }
        },
        {
            name: 'Draw Selection Rectangle',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="infinite-canvas"]');
                // Drag from centerish to create a box
                await Simulator.drag(canvas, 150, 150);
            }
        },
        {
            name: 'Verify Toolbar and Click Copy',
            action: async () => {
                await Simulator.click('[data-testid="selection-copy"]');
            }
        },
        {
            name: 'Verify New Layer Created',
            action: async () => {
                // ADD_LAYER logic creates a name like ORIGINAL_extracted
                await Simulator.waitForText('EXTRACT_ME.png_extracted');
            }
        }
    ]
};
