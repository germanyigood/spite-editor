import { NodeProcessor } from '../../../../types';

export const processFrameSkip: NodeProcessor = async (node, inputs) => {
    const input = inputs['input'] || inputs['main'] || Object.values(inputs)[0];
    if (!input) return null;

    if (input.type === 'IMAGE') {
        return input; 
    }

    const config = (node as any).data || {};
    const keepEvery = Math.max(1, typeof config.keepEvery === 'number' ? config.keepEvery : 2);
    let offset = typeof config.offset === 'number' ? config.offset : 0;
    
    // Bounds check offset
    if (offset >= keepEvery) offset = keepEvery - 1;
    if (offset < 0) offset = 0;

    if (input.type === 'TIMELINE') {
        const originalFrames = input.frames || [];
        const originalMeta = input.framesMetadata || [];

        const newFrames = originalFrames.filter((_, idx) => (idx % keepEvery) === offset);
        const newMeta = originalMeta.length > 0 ? originalMeta.filter((_, idx) => (idx % keepEvery) === offset) : [];

        return {
            ...input,
            frames: newFrames,
            framesMetadata: newMeta,
            image: newFrames[0] || input.image
        };
    } 
    else if (input.type === 'IMAGE_SEQUENCE') {
        // IMAGE_SEQUENCE frames are defined in the `frames` object, which is a Record<number, Frame>
        // It often represents a grid slice. We'll drop metadata and previewFrames that don't match the keep pattern.

        const originalFramesDict = input.frames || {};
        
        // Convert to array of frames to filter sequentially
        const frameKeys = Object.keys(originalFramesDict).map(Number).sort((a, b) => a - b);
        
        let newFramesDict: Record<number, any> = {};
        const keptKeys: number[] = [];

        frameKeys.forEach((key, arrayIdx) => {
            if ((arrayIdx % keepEvery) === offset) {
                newFramesDict[key] = originalFramesDict[key];
                keptKeys.push(key);
            }
        });

        // Filter previewFrames if they exist
        let newPreviewFrames;
        if (input.previewFrames && input.previewFrames.length === frameKeys.length) {
             newPreviewFrames = input.previewFrames.filter((_, idx) => (idx % keepEvery) === offset);
        }

        return {
            ...input,
            frames: newFramesDict,
            previewFrames: newPreviewFrames || input.previewFrames
        };
    }

    return input;
};
