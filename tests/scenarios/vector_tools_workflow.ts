import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const vector_tools_workflow: E2EScenario = {
    id: 'vector_tools_workflow',
    name: 'Vector Path Tools Comprehensive',
    description: 'Extensive test of vector path interactions: drawing with curves, handling bezier points, using add/delete/convert tools and modifier key usage.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject Test Asset', action: async () => await Simulator.injectTestImage('PAINT_TEST.png', '#FFFFFF', '#000000', 512, 512) }
    ],
    steps: [
        {
            name: 'Switch to Draw Mode',
            action: async () => {
                await Simulator.click('[data-testid="tool-draw"]');
            }
        },
        {
            name: 'Select Pen Tool',
            action: async () => {
                await Simulator.click('[data-testid="draw-tool-path"]'); // Over-arching vector tool
                await Simulator.waitFor('[data-testid="path-tool-draw"]', 1000);
            }
        },
        {
            name: 'Draw Curve (Drag new handle)',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                // Dragging immediately after click creates bezier handles
                await Simulator.dragFromTo(canvas, 100, 100, 100, 50, 12);
            }
        },
        {
            name: 'Add second point with handles',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                await Simulator.dragFromTo(canvas, 200, 100, 200, 150, 12);
            }
        },
        {
            name: 'Add third point (corner, no drag)',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                await Simulator.clickAt(canvas, 300, 100);
            }
        },
        {
            name: 'Close path by dragging back to start',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                await Simulator.dragFromTo(canvas, 100, 100, 50, 100, 12);
            }
        },
        {
            name: 'Direct Selection: Move Point',
            action: async () => {
                await Simulator.click('[data-testid="path-tool-select"]');
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                // Drag corner point
                await Simulator.dragFromTo(canvas, 300, 100, 350, 150, 12);
            }
        },
        {
            name: 'Direct Selection: Move Handle',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                // The first point was drawn by dragging to 100, 50, meaning cp2 is at 100, 50 and cp1 is at 100, 150.
                // Move cp1 handle
                await Simulator.dragFromTo(canvas, 100, 150, 50, 150, 12);
            }
        },
        {
            name: 'Add Point on curve segment',
            action: async () => {
                await Simulator.click('[data-testid="path-tool-add"]');
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                // Target somewhere between 2nd point (200,100) and 3rd point (now 350,150)
                await Simulator.clickAt(canvas, 275, 125);
            }
        },
        {
            name: 'Convert Point Tool: Break Handle Symmetry',
            action: async () => {
                await Simulator.click('[data-testid="path-tool-convert"]');
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                // Drag the cp2 handle of the second point (200, 150)
                await Simulator.dragFromTo(canvas, 200, 150, 250, 150, 12);
            }
        },
        {
            name: 'Convert Point Tool: Retract handles (make corner)',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                // Click the first point (100, 100)
                await Simulator.clickAt(canvas, 100, 100);
            }
        },
        {
            name: 'Convert Point Tool: Extract new handles',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                // Drag from 100, 100 again to create new symmetric handles
                await Simulator.dragFromTo(canvas, 100, 100, 150, 50, 12);
            }
        },
        {
            name: 'Delete Point',
            action: async () => {
                await Simulator.click('[data-testid="path-tool-delete"]');
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                // Delete the 3rd point we recently moved to 350, 150
                await Simulator.clickAt(canvas, 350, 150);
            }
        },
        {
            name: 'Select Pen Tool again to draw new open path',
            action: async () => {
                await Simulator.click('[data-testid="path-tool-draw"]');
                const canvas = await Simulator.waitFor('[data-testid="interactive-layer-canvas"]');
                // Click off path to trigger new path
                await Simulator.clickAt(canvas, 400, 400);
                await Simulator.clickAt(canvas, 450, 450);
            }
        },
        {
            name: 'Undo path interactions',
            action: async () => {
                await Simulator.click('[data-testid="btn-undo"]');
                await Simulator.click('[data-testid="btn-undo"]'); // undos 2nd point of open path, undos first point of open path
                await Simulator.click('[data-testid="btn-undo"]'); // undos delete point
            }
        }
    ]
};
