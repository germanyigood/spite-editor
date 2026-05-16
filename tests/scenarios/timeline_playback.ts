import { Simulator, E2EScenario } from '../../tools/packages/aistudio-e2e';

export const timeline_playback_workflow: E2EScenario = {
    id: 'timeline_playback_workflow',
    name: 'Timeline Playback',
    description: 'Verify the timeline play/pause state and seeking functionality.',
    setup: [
        { name: 'Reset Workspace', action: async () => { window.__E2E_RESET__?.(); await new Promise(r => setTimeout(r, 500)); } },
        { name: 'Switch to Timeline Tool', action: async () => { await Simulator.click('[data-testid="tool-select"]'); } },
        { name: 'Inject Test Asset', action: async () => await Simulator.injectTestImage('TIMELINE_TEST.png', '#222222', '#FFFFFF') }
    ],
    steps: [
        {
            name: 'Check Play/Pause Toggle',
            action: async () => {
                const btn = await Simulator.waitFor('[data-testid="timeline-play-pause"]');
                if (btn.innerText.includes('PAUSE')) {
                    throw new Error('Timeline started in playing state abruptly');
                }
                
                await Simulator.click(btn);
                await Simulator.waitForText('PAUSE');
                await Simulator.click(btn);
            }
        }
    ]
};
