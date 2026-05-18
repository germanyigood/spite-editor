import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const node_context_menu_workflow: E2EScenario = {
    id: 'node_context_menu_workflow',
    name: 'Node Graph Context Menu',
    description: 'Verify adding nodes through the context menu works without crashing.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject Initial Asset', action: async () => await Simulator.injectTestImage() }
    ],
    steps: [
        {
            name: 'Open Node Graph',
            action: async () => {
                await Simulator.click('[data-testid="tool-nodes"]');
                await new Promise(r => setTimeout(r, 1000));
            }
        },
        {
            name: 'Add Chroma Node via Edge',
            action: async () => {
                // Find a connection path
                const bg = await Simulator.waitFor('[data-testid="node-graph-bg"]');
                // The edge path is drawn on SVG, let's find the first one
                const edge = await Simulator.waitFor('path.cursor-pointer');
                if (!edge) throw new Error("No edge found to click");
                
                // Right click the edge
                const rect = edge.getBoundingClientRect();
                await Simulator.rightClick(edge, rect.left + rect.width / 2, rect.top + rect.height / 2);
                
                await new Promise(r => setTimeout(r, 300));

                const addChromaBtn = await Simulator.waitFor('[data-testid="context-menu-item-chroma"]');
                await Simulator.click(addChromaBtn);

                await new Promise(r => setTimeout(r, 300));
                
                // Assert new node exists
                const nodes = document.querySelectorAll('[data-node-id^="chroma_"]');
                if (nodes.length === 0) {
                    throw new Error("Failed to add chroma node via edge context menu!");
                }
            }
        }
    ]
};
