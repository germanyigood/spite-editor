import { NODE_PROCESSORS } from '../components/NodeEditor/nodeProcessors';
import { NodeData, NodePayload } from '../types';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineFrameSkipSpecs = () => {
    describe('FrameSkip Node Logic', () => {
        const mockCtx = { 
            loadBitmap: async () => document.createElement('canvas') as any,
            isCancelled: () => false 
        };

        it('FrameSkip reduces final number of frames for TIMELINE', async () => {
            const skipNode: NodeData = { 
                id: 'fs1', type: 'frame_skip', x:0, y:0, width:100, height:100, 
                data: { keepEvery: 2, offset: 0 } 
            };
            const inputPayload: NodePayload = { 
                type: 'TIMELINE', 
                frames: ['img1', 'img2', 'img3', 'img4', 'img5'] as any[], 
                framesMetadata: [
                    { id: '1', width: 10, height: 10, x: 0, y: 0 } as any,
                    { id: '2', width: 10, height: 10, x: 0, y: 0 } as any,
                    { id: '3', width: 10, height: 10, x: 0, y: 0 } as any,
                    { id: '4', width: 10, height: 10, x: 0, y: 0 } as any,
                    { id: '5', width: 10, height: 10, x: 0, y: 0 } as any
                ],
                fps: 12,
                isLoop: true,
                isPlaying: false,
                currentFrameIndex: 0,
                image: 'img1' as any
            };
            
            const result = await NODE_PROCESSORS['frame_skip'](skipNode, { input: inputPayload }, mockCtx);
            expect(result).not.toBeNull();
            expect(result!.type).toBe('TIMELINE');
            if (result && result.type === 'TIMELINE') {
                expect(result.frames.length).toBe(3); 
                expect(result.frames[0]).toBe('img1');
                expect(result.frames[1]).toBe('img3');
                expect(result.frames[2]).toBe('img5');
            }
        });

        it('FrameSkip reduces final number of frames for IMAGE_SEQUENCE', async () => {
            const skipNode: NodeData = { 
                id: 'fs2', type: 'frame_skip', x:0, y:0, width:100, height:100, 
                data: { keepEvery: 2, offset: 0 } 
            };
            const inputPayload: NodePayload = { 
                type: 'IMAGE_SEQUENCE', 
                frames: {
                    0: { id: '0', width: 10, height: 10, x: 0, y: 0 } as any,
                    1: { id: '1', width: 10, height: 10, x: 0, y: 0 } as any,
                    2: { id: '2', width: 10, height: 10, x: 0, y: 0 } as any,
                    3: { id: '3', width: 10, height: 10, x: 0, y: 0 } as any,
                    4: { id: '4', width: 10, height: 10, x: 0, y: 0 } as any
                }, 
                previewFrames: ['img1', 'img2', 'img3', 'img4', 'img5'] as any[],
                image: 'img' as any,
                frameWidth: 10,
                frameHeight: 10
            };
            
            const result = await NODE_PROCESSORS['frame_skip'](skipNode, { input: inputPayload }, mockCtx);
            expect(result).not.toBeNull();
            expect(result!.type).toBe('IMAGE_SEQUENCE');
            if (result && result.type === 'IMAGE_SEQUENCE') {
                expect(Object.keys(result.frames).length).toBe(3); 
                expect(result.frames[0].id).toBe('0');
                expect(result.frames[2].id).toBe('2');
                expect(result.frames[4].id).toBe('4');
                expect(result.previewFrames!.length).toBe(3);
                expect(result.previewFrames![1]).toBe('img3');
            }
        });
    });
};
