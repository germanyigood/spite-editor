
import { NodeProcessor, Frame } from '../../../../types';

export const processGrid: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    const input = inputs['input'] || Object.values(inputs)[0];
    if (node.type !== 'grid' || !input || input.type !== 'IMAGE') return null;

    const config = node.data;
    const frames: Record<number, Frame> = {};
    const previewFrames: ImageBitmap[] = [];
    const bmp = await loadBitmap(input.image);
    
    if (isCancelled()) return null;

    if (config.frames && config.frames.length > 0) {
        let idx = 0;
        for (const frame of config.frames) {
            if (isCancelled()) return null;
            try {
                // Efficient clipping using ImageBitmap API
                const sprite = await createImageBitmap(bmp, frame.x, frame.y, frame.width, frame.height);
                previewFrames.push(sprite);
                // Use sequential index as key so Timeline can look it up by array index
                frames[idx] = { ...frame };
                idx++;
            } catch (e) {
                console.warn("Frame out of bounds", frame);
            }
        }
    }

    return {
        type: 'IMAGE_SEQUENCE',
        image: input.image, // Pass original full-sheet for reference if needed
        frameWidth: config.width,
        frameHeight: config.height,
        frames,
        previewFrames
    };
};
