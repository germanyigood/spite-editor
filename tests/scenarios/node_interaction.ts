import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const node_graph_interaction: E2EScenario = {
    id: 'node_graph_interaction',
    name: 'Node Movement Test',
    description: 'Ensure nodes in the graph can be dragged to new positions.',
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
            name: 'Grab and Drag Source Node',
            action: async () => {
                const sourceNode = await Simulator.waitFor('[data-node-id^="src_"]');
                const header = sourceNode.querySelector('[data-testid="node-header"]') as HTMLElement;
                if (!header) throw new Error("Node header handle not found");
                const initialRect = sourceNode.getBoundingClientRect();
                await Simulator.drag(header, 200, 100);
                const finalRect = sourceNode.getBoundingClientRect();
                const actualDeltaX = Math.round(finalRect.left - initialRect.left);
                const actualDeltaY = Math.round(finalRect.top - initialRect.top);
                if (actualDeltaX === 0 && actualDeltaY === 0) {
                    throw new Error("Node did not move at all (Delta 0x0).");
                }
            }
        }
    ]
};