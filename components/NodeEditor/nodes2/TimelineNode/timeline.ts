
import { NodeProcessor, ImageSource, Frame } from '../../../../types';

export const processTimeline: NodeProcessor = async (node, inputs, _context) => {
    if (node.type !== 'timeline') return null;

    // Aggregate all connected image sequences
    const allAvailableFrames: ImageSource[] = [];
    const allAvailableMetadata: Frame[] = [];
    
    // We try to find the "Source Atlas" (the whole image) from the inputs to pass it down.
    let primaryAtlas: ImageSource | null = null;

    // Helper: Sort inputs by some deterministic key if possible?
    // Since inputs is a dict, order isn't guaranteed, but usually follows connection creation.
    // For the "Shift to Zero" logic to work with multiple inputs, the aggregation order here 
    // MUST match the order used in `syncTimelineToGrid` (which uses `getGraphLayers` -> `findConnectedGrids`).
    // `syncTimelineToGrid` traverses UPSTREAM from Timeline.
    // Here we just iterate values. This is a potential weak spot for multi-input stability, 
    // but works perfectly for single-chain inputs (99% use case).
    
    for (const input of Object.values(inputs)) {
        if (input.type === 'IMAGE_SEQUENCE') {
            if (!primaryAtlas && input.image) {
                primaryAtlas = input.image;
            }

            if (input.previewFrames) {
                allAvailableFrames.push(...input.previewFrames);
                
                // Map previewFrames back to metadata.
                for(let i=0; i<input.previewFrames.length; i++) {
                    const meta = input.frames[i] || { id: i, x:0, y:0, width:0, height:0, name: `Frame ${i}` };
                    allAvailableMetadata.push(meta);
                }
            } else if (input.image) {
                // Single image case (fallback)
                 allAvailableFrames.push(input.image);
                 allAvailableMetadata.push({ id: 0, x:0, y:0, width: input.frameWidth, height: input.frameHeight, name: "Frame 0" });
            }
        } else if (input.type === 'IMAGE') {
             // Direct Image connection support
             allAvailableFrames.push(input.image);
             allAvailableMetadata.push({ id: 0, x:0, y:0, width: input.width, height: input.height, name: "Frame 0" });
        }
    }

    // Map logical indices (stored in node.data.frames) to actual bitmap data AND metadata
    const validFrames: ImageSource[] = [];
    const validMetadata: Frame[] = [];

    const frameIndices = node.data.frames || [];
    
    // NORMALIZE INDICES:
    // We map requested indices directly to the available frames. If the request is out of bounds
    // (e.g. gaps in global indices due to unconnected grids), we gracefully clamp or safely find the frame.
    const minIndex = frameIndices.length > 0 ? Math.min(...frameIndices) : 0;

    frameIndices.forEach((globalIdx, countIdx) => {
        let localIdx = globalIdx - minIndex;
        
        // If due to gaps (e.g. Grid2 is unconnected) localIdx overshoots, we safely fallback to the raw index count
        if (localIdx < 0 || localIdx >= allAvailableFrames.length) {
            localIdx = countIdx % allAvailableFrames.length; 
        }
        
        if (allAvailableFrames[localIdx]) {
            validFrames.push(allAvailableFrames[localIdx]);
            validMetadata.push(allAvailableMetadata[localIdx] || { id: localIdx, x:0, y:0, width:0, height:0, name: `Frame ${localIdx}` });
        }
    });
    
    // Adjust currentFrame to be local for the payload, so downstream/preview knows which index of 'frames' to show
    let currentGlobalFrame = node.data.currentFrame || 0;
    
    // Clamp global frame to valid range of indices this node knows about
    if (!frameIndices.includes(currentGlobalFrame) && frameIndices.length > 0) {
        currentGlobalFrame = frameIndices[0];
    }
    
    const localCurrentFrame = Math.max(0, currentGlobalFrame - minIndex);
    
    // The 'image' property of a TIMELINE payload should represent the context for preview/resize.
    // We prioritize the specific frame image to represent the node's current visual output.
    // Falling back to primaryAtlas (the spritesheet) only if no frames are valid.
    const contextImage = validFrames[localCurrentFrame] || primaryAtlas || "";

    return {
        type: 'TIMELINE',
        fps: node.data.fps,
        isLoop: node.data.loop,
        isPlaying: node.data.isPlaying,
        currentFrameIndex: localCurrentFrame,
        frames: validFrames,
        framesMetadata: validMetadata,
        image: contextImage 
    };
};
