import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const chroma_key_workflow: E2EScenario = {
    id: 'chroma_key_workflow',
    name: 'Chroma Key Workflow',
    description: 'Verify Chroma Node properties can be adjusted and applied.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject Test Asset', action: async () => await Simulator.injectTestImage('CHROMA_TEST.png', '#FF00FF', '#000000') }
    ],
    steps: [
        {
            name: 'Switch to Nodes Tool',
            action: async () => {
                await Simulator.click('[data-testid="tool-nodes"]');
            }
        },
        {
            name: 'Select Chroma Node',
            action: async () => {
                await Simulator.waitFor('[data-testid="node-graph-bg"]'); 
                // Right click, add chroma, connect: wait, injectTestImage adds a default graph! (Source, Paint, Chroma, Grid).
                // Let's click the chroma node which has class `border-purple-500` or maybe text "Chroma Key".
                const node = await Simulator.waitForText('Chroma Key');
                await Simulator.click(node);
            }
        },
        {
            name: 'Set Chroma Hex Color',
            action: async () => {
                await Simulator.setValue('[data-testid="color-hex-input"]', '#FF0000');
            }
        },
        {
            name: 'Adjust Threshold Slider',
            action: async () => {
                await Simulator.setValue('[data-testid="slider-threshold"]', '45');
            }
        },
        {
            name: 'Toggle Invert',
            action: async () => {
                const el = await Simulator.waitForText('Remove Color (Standard)');
                await Simulator.click(el);
            }
        }
    ]
};
