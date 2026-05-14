
export interface TimeSegment {
  id: string;
  start: number;
  end: number;
}

/**
 * Moves a time segment while keeping its duration constant and clamping it within bounds.
 */
export const moveSegment = (
    segment: TimeSegment, 
    targetTime: number, 
    startOffset: number, 
    maxDuration: number
): TimeSegment => {
    if (!segment) return segment;
    const duration = segment.end - segment.start;
    let newStart = targetTime - startOffset;
    
    // Clamp Start to [0, maxDuration - duration] to keep duration consistent
    newStart = Math.max(0, Math.min(newStart, maxDuration - duration));
    const newEnd = newStart + duration;

    return { ...segment, start: newStart, end: newEnd };
};

/**
 * Resizes the start point of a segment, enforcing min duration and bounds.
 */
export const resizeSegmentStart = (
    segment: TimeSegment, 
    newStart: number, 
    minDuration: number = 0.1
): TimeSegment => {
    if (!segment) return segment;
    // Must be >= 0 and <= end - minDuration
    const s = Math.max(0, Math.min(newStart, segment.end - minDuration));
    return { ...segment, start: s };
};

/**
 * Resizes the end point of a segment, enforcing min duration and bounds.
 */
export const resizeSegmentEnd = (
    segment: TimeSegment, 
    newEnd: number, 
    maxDuration: number,
    minDuration: number = 0.1
): TimeSegment => {
    if (!segment) return segment;
    // Must be <= maxDuration and >= start + minDuration
    const e = Math.min(maxDuration, Math.max(newEnd, segment.start + minDuration));
    return { ...segment, end: e };
};

/**
 * Calculates total estimated frames across all segments.
 */
export const calculateEstimatedFrames = (segments: TimeSegment[] | null | undefined, fps: number): number => {
    if (!segments || !Array.isArray(segments) || segments.length === 0) return 0;
    let totalSeconds = 0;
    segments.forEach(s => {
        if (s && typeof s.start === 'number' && typeof s.end === 'number') {
            const dur = s.end - s.start;
            if (dur > 0) totalSeconds += dur;
        }
    });
    // Round to avoid floating point issues during frame estimation
    return Math.max(0, Math.round(totalSeconds * fps));
};
