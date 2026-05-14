import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const basic_workflow: E2EScenario = {
    id: 'basic_workflow',
    name: 'Chroma Key Pipeline',
    description: 'Verify image import and node graph integration.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject White Image w/ Blue Square', action: async () => await Simulator.injectTestImage('WHITE_BLUE.png', '#FFFFFF', '#0000FF') }
    ],
    steps: [
        {
            name: 'Switch to Node Graph Editor',
            action: async () => {
                await Simulator.click('[data-testid="tool-nodes"]');
            }
        },
        {
            name: 'Locate and Select Chroma Node',
            action: async () => {
                const chromaLabel = await Simulator.waitForText('CHROMA KEY');
                await Simulator.click(chromaLabel);
            }
        },
        {
            name: 'Change Key Color to White',
            action: async () => {
                await Simulator.type('[data-testid="color-hex-input"]', '#ffffff');
            }
        },
        {
            name: 'Verify Color Change',
            action: async () => {
                const colorInput = await Simulator.waitFor('[data-testid="color-input"]') as HTMLInputElement;
                if (colorInput.value.toLowerCase() !== '#ffffff') {
                    throw new Error(`Expected color #ffffff but found ${colorInput.value}`);
                }
            }
        }
    ]
};