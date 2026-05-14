import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const viewport_sync: E2EScenario = {
    id: 'viewport_sync',
    name: 'Centering & Viewport Sync',
    description: 'Ensure assets are correctly centered in Frames and Layout modes.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Inject 200x200 Image', action: async () => await Simulator.injectTestImage('CENTER_REF.png', '#FF00FF', '#000000', 200, 200) }
    ],
    steps: [
        {
            name: 'Check Sprite Editor Center',
            action: async () => {
                const canvas = await Simulator.waitFor('[data-testid="infinite-canvas"]');
                const asset = await Simulator.waitFor('.origin-top-left canvas, .origin-top-left img');
                const cRect = canvas.getBoundingClientRect();
                const aRect = asset.getBoundingClientRect();
                const cCenterX = cRect.left + cRect.width / 2;
                const aCenterX = aRect.left + aRect.width / 2;
                if (Math.abs(cCenterX - aCenterX) > 30) {
                    throw new Error(`Asset not centered in Sprite Editor. Diff: ${Math.abs(cCenterX - aCenterX)}px`);
                }
            }
        },
        {
            name: 'Switch to Layout and Check Center',
            action: async () => {
                await Simulator.click('[data-testid="tool-layout"]');
                const canvas = await Simulator.waitFor('[data-testid="infinite-canvas"]');
                const layoutArtboard = await Simulator.waitFor('.origin-top-left > div');
                const cRect = canvas.getBoundingClientRect();
                const aRect = layoutArtboard.getBoundingClientRect();
                const cCenterX = cRect.left + cRect.width / 2;
                const aCenterX = aRect.left + aRect.width / 2;
                if (Math.abs(cCenterX - aCenterX) > 30) {
                    throw new Error(`Artboard not centered in Layout Editor. Diff: ${Math.abs(cCenterX - aCenterX)}px`);
                }
            }
        }
    ]
};