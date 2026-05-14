
import { processTimeline } from '../components/NodeEditor/nodes2/TimelineNode/timeline';
import { processResize } from '../components/NodeEditor/nodes2/ResizeNode/resize';
import { NodeData, NodePayload, Frame, NodeGraphData, OutputNode, SourceNode } from '../types';
import { collectGraphData } from '../components/NodeEditor/graphExport';
import { createDefaultAnimation } from '../context/ProjectContext';

declare const describe: any;
declare const it: any;
declare const expect: any;

// Tiny valid PNG base64 (1x1 red pixel)
const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export const defineExportSpecs = () => {
  describe('Export Data Integrity', () => {
    
    it('Resize Logic scales X/Y coordinates preserving original layout', async () => {
        // Mock Graph
        const frame0: Frame = { id: 0, x: 0, y: 0, width: 32, height: 32, name: 'F0' };
        const frame1: Frame = { id: 1, x: 32, y: 0, width: 32, height: 32, name: 'F1' };

        // Mock Payloads
        const timelinePayload: NodePayload = {
            type: 'TIMELINE',
            fps: 12, isLoop: true, isPlaying: false, currentFrameIndex: 0,
            image: 'mock_atlas' as any,
            // 2 Mock Frames
            frames: ['bmp0', 'bmp1'] as any[], 
            // Original Metadata from Grid (Horizontal in Atlas)
            framesMetadata: [frame0, frame1] 
        };
        
        // Mock Resize Node (Target 64x64, from 32x32 = 2x scale)
        const resizeNode: NodeData = { 
            id: 'r1', type: 'resize', x:0, y:0, width:0, height:0, 
            data: { width: 64, height: 64, scale: 1, useScale: false } 
        };

        const ctx = { 
            loadBitmap: async () => {
                const c = document.createElement('canvas');
                c.width = 32; c.height = 32;
                return await createImageBitmap(c);
            }, 
            isCancelled: () => false 
        };
        
        const resizeResult = await processResize(resizeNode, { input: timelinePayload }, ctx);
        
        if (resizeResult && resizeResult.type === 'TIMELINE') {
            expect(resizeResult.framesMetadata).toBeDefined();
            // Should be scaled by 2 (64 / 32 = 2)
            // frame1 was x=32. Scaled x should be 64.
            expect(resizeResult.framesMetadata![1].x).toBe(64); 
            expect(resizeResult.framesMetadata![1].y).toBe(0); 
            expect(resizeResult.framesMetadata![1].width).toBe(64);
        } else {
            throw new Error("Resize failed");
        }
    });

    it('Timeline Node passes through Source Atlas as image property', async () => {
        const gridPayload: NodePayload = {
            type: 'IMAGE_SEQUENCE',
            image: 'ATLAS_SOURCE' as any,
            frameWidth: 32, frameHeight: 32,
            frames: {}, previewFrames: []
        };

        const timelineNode: NodeData = {
            id: 't1', type: 'timeline', x:0,y:0,width:0,height:0,
            data: { frames: [], fps: 12, loop: true, isPlaying: false, currentFrame: 0 }
        };

        const result = await processTimeline(timelineNode, { input: gridPayload }, {} as any);
        
        expect(result?.type).toBe('TIMELINE');
        if (result && result.type === 'TIMELINE') {
            expect(result.image).toBe('ATLAS_SOURCE');
        }
    });

    it('Full Export Pipeline produces valid non-empty Blob', async () => {
        // This integration test verifies that:
        // 1. Graph processing works
        // 2. Output is collected
        // 3. Canvas -> Blob conversion (via UPNG or fallback) actually works
        
        const anim = createDefaultAnimation('test_export');
        
        // Define simple Source -> Output graph
        const sourceNode: SourceNode = { 
            id: 'src', type: 'source', x:0, y:0, width:100, height:100,
            data: { src: TINY_PNG, name: 'Test', width: 1, height: 1, opacity: 1, visible: true, x: 0, y: 0 }
        };
        const outputNode: OutputNode = {
            id: 'out', type: 'output', x:200, y:0, width:100, height:100,
            data: { name: 'final' }
        };
        
        anim.nodeGraph = {
            nodes: [sourceNode, outputNode],
            connections: [{ id: 'c1', source: 'src', target: 'out' }],
            viewport: { x: 0, y: 0, scale: 1 }
        };

        const result = await collectGraphData(anim);
        
        expect(result).toBeDefined();
        expect(result?.outputs['final']).toBeDefined();
        
        const blob = result?.outputs['final'];
        expect(blob).toBeDefined();
        if (blob) {
            expect(blob.size).toBeGreaterThan(0);
            expect(blob.type).toBe('image/png');
        }
    });
  });
};
