
import { moveSegment, calculateEstimatedFrames, TimeSegment, resizeSegmentStart, resizeSegmentEnd } from '../utils/video';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineVideoSpecs = () => {
  describe('Video Utility Logic', () => {
    
    describe('moveSegment', () => {
        const seg: TimeSegment = { id: '1', start: 5, end: 10 }; // Duration 5
        const maxDuration = 20;

        it('moves segment correctly within bounds', () => {
            // Target Time 8, offset 2.5 (middle) -> newStart = 5.5
            const result = moveSegment(seg, 8, 2.5, maxDuration);
            expect(result.start).toBeCloseTo(5.5);
            expect(result.end).toBeCloseTo(10.5);
        });

        it('clamps to start (0) if moved too far left', () => {
            // Target Time 1, offset 2.5 -> newStart = -1.5 -> Clamped to 0
            const result = moveSegment(seg, 1, 2.5, maxDuration);
            expect(result.start).toBe(0);
            expect(result.end).toBe(5);
        });

        it('clamps to end (maxDuration) if moved too far right', () => {
            // Target Time 19, offset 0 -> newStart = 19 -> newEnd = 24 -> Clamped
            // Should shift back so end = 20, start = 15
            const result = moveSegment(seg, 19, 0, maxDuration);
            expect(result.end).toBe(20);
            expect(result.start).toBe(15);
        });
    });

    describe('resizeSegment', () => {
        const seg: TimeSegment = { id: '1', start: 5, end: 10 }; 
        const maxDuration = 20;

        it('resizes start correctly', () => {
            const result = resizeSegmentStart(seg, 2);
            expect(result.start).toBe(2);
            expect(result.end).toBe(10);
        });

        it('prevents start from crossing end (min duration)', () => {
            const result = resizeSegmentStart(seg, 12);
            expect(result.start).toBeCloseTo(9.9); // 10 - 0.1
        });

        it('resizes end correctly', () => {
            const result = resizeSegmentEnd(seg, 15, maxDuration);
            expect(result.end).toBe(15);
        });

        it('prevents end from crossing start', () => {
            const result = resizeSegmentEnd(seg, 2, maxDuration);
            expect(result.end).toBeCloseTo(5.1); // 5 + 0.1
        });
    });

    describe('calculateEstimatedFrames', () => {
        it('calculates frames for single segment', () => {
            const frames = calculateEstimatedFrames([{ id:'1', start:0, end:2 }], 10);
            expect(frames).toBe(20);
        });

        it('sums multiple segments', () => {
            const segs = [
                { id:'1', start:0, end:1 }, // 1s
                { id:'2', start:5, end:7 }  // 2s
            ];
            // Total 3s * 10fps = 30
            const frames = calculateEstimatedFrames(segs, 10);
            expect(frames).toBe(30);
        });

        it('handles null segments gracefully', () => {
            // This test verifies the fix for "Cannot read properties of null (reading 'length')"
            const frames = calculateEstimatedFrames(null, 10);
            expect(frames).toBe(0);
        });
    });

  });
};
