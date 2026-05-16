import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const node_bypass_workflow: E2EScenario = {
    id: 'node_bypass_workflow',
    name: 'Node Bypass Test',
    description: 'Ensure disabling a node visually bypasses it and shows bypass overlay.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject Initial Asset', action: async () => await Simulator.injectTestImage() }
    ],
    steps: [
        {
            name: 'Open Node Graph',
            action: async () => {
                await Simulator.click('[data-testid="tool-nodes"]');
            }
        },
        {
            name: 'Add Chroma Node',
            action: async () => {
                // Right click on the canvas to open Context Menu
                const graphContainer = await Simulator.waitFor('[data-testid="node-graph-bg"]');
                await Simulator.rightClick(document.body, 400, 400); // Trigger graph background context menu
                // Need to find the menu item
                const chromaOption = await Simulator.waitForText('Chroma Key');
                await Simulator.click(chromaOption);
            }
        },
        {
            name: 'Click Bypass Button',
            action: async () => {
                // Wait for the bypass button on the new Chroma node
                const bypassBtns = Array.from(document.querySelectorAll('button[title="Disable Node (Bypass)"]')) as HTMLElement[];
                if (bypassBtns.length > 0) {
                     await Simulator.click(bypassBtns[bypassBtns.length - 1]);
                } else {
                     throw new Error('Bypass button not found');
                }
                
                // Expect the Bypassed overlay to show up
                const bypassedText = Array.from(document.querySelectorAll('span')).find(el => el.textContent?.includes('Bypassed'));
                if (!bypassedText) throw new Error("Bypassed overlay did not appear");
            }
        }
    ]
};
