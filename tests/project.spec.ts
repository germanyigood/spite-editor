
import { createProjectBundle, loadProjectBundle } from '../utils/project';
import { AnimationEntry } from '../types';
import JSZip from 'jszip';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineProjectSpecs = () => {
  describe('Project I/O', () => {
    
    it('Persists arbitrary node data in JSON bundle', async () => {
        // Create a mock animation with custom data properties in a node
        const mockAnim: AnimationEntry = {
            id: 'anim_test',
            name: 'Test Anim',
            nodeGraph: {
                nodes: [
                    { 
                        id: 'src1', 
                        type: 'source', 
                        x: 10, y: 10, width: 100, height: 100,
                        pinnedAt: 123456789,
                        // This complex object mimics real node data
                        data: { 
                            src: 'data:image/png;base64,fake',
                            name: 'mock', width: 100, height: 100, opacity: 1, visible: true, x: 0, y: 0,
                            customProp: 999,
                            nested: { foo: 'bar' } 
                        } as any
                    }
                ],
                connections: [],
                viewport: { x: 0, y: 0, scale: 1 }
            },
            layout: { elements: [] }
        };

        // 1. Export
        const blob = await createProjectBundle({
            projectName: 'Test Project',
            animations: [mockAnim],
            activeAnimationId: mockAnim.id,
            activeLayerId: null,
            // Fixed: Added missing selectedNodeId property required by ProjectState
            selectedNodeId: null,
            selectedFrameIndex: null,
            selectedTimelineIndex: null,
            selectedLayoutElementId: null,
            toolMode: 'select',
            uiState: { rightSidebarWidth: 320, timelineHeight: 240 }
        });
        expect(blob).toBeDefined();
        expect(blob.size).toBeGreaterThan(0);

        // 2. Import
        const file = new File([blob], 'test.sforge');
        const loaded = await loadProjectBundle(file);

        expect(loaded.projectName).toBe('Test Project');
        expect(loaded.animations.length).toBe(1);
        
        const node = loaded.animations[0].nodeGraph.nodes[0];
        
        // 3. Verify Data Persistence
        expect(node.data).toBeDefined();
        expect(node.pinnedAt).toBe(123456789);
        const data = node.data as any;
        expect(data.customProp).toBe(999);
        expect(data.nested.foo).toBe('bar');
        expect(data.src).toBeDefined(); 
    }, 8000);

    it('Validates project structure correctly', async () => {
        // Mock invalid file content - animations is malformed (string instead of array)
        // Note: Missing 'animations' is now valid (defaults to []), so we test malformed input.
        const invalidMeta = JSON.stringify({ version: 1, animations: "invalid_type" }); 
        const zip = new JSZip();
        zip.file("project.json", invalidMeta);
        const blob = await zip.generateAsync({type:"blob"});
        const file = new File([blob], "bad.zip");

        let error;
        try {
            await loadProjectBundle(file);
        } catch(e) {
            error = e;
        }
        expect(error).toBeDefined();
    }, 8000);

  });
};
