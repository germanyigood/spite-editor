
import { NodeProcessor, ImageSource } from '../../../../types';
import { generateNormalMap } from '../../../../utils';

export const processNormalMap: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    const input = inputs['input'] || Object.values(inputs)[0];
    if (node.type !== 'normal_map' || !input) return null;

    // Helper to process a single bitmap
    const generate = async (src: ImageSource) => {
        if (!src) return null;
        const bmp = await loadBitmap(src);
        if (isCancelled()) return null;

        const c = document.createElement('canvas');
        c.width = bmp.width; c.height = bmp.height;
        const ctx = c.getContext('2d');
        if (ctx) {
            ctx.drawImage(bmp, 0, 0);
            return await generateNormalMap(c, node.data.strength || 1);
        }
        return null;
    };

    if (input.type === 'IMAGE') {
        const map = await generate(input.image);
        if (map) return { type: 'IMAGE', image: map, width: input.width, height: input.height };
    } 
    else if (input.type === 'TIMELINE') {
        // Map every frame in the timeline
        const maps = await Promise.all(input.frames.map(generate));
        const validMaps = maps.filter(Boolean) as ImageBitmap[];
        
        if (validMaps.length > 0) {
            return { 
                ...input, 
                frames: validMaps, 
                image: validMaps[0] 
            };
        }
    }
    else if (input.type === 'IMAGE_SEQUENCE') {
        // Process the Atlas (Main Image)
        let processedAtlas: ImageBitmap | null = null;
        if (input.image) {
            processedAtlas = await generate(input.image);
        }

        // Process Preview Frames (if they exist)
        let processedPreviews: ImageBitmap[] = [];
        if (input.previewFrames && input.previewFrames.length > 0) {
            const maps = await Promise.all(input.previewFrames.map(generate));
            processedPreviews = maps.filter(Boolean) as ImageBitmap[];
        }

        if (processedAtlas || processedPreviews.length > 0) {
            return {
                ...input,
                image: processedAtlas || input.image, // Replace atlas with normal map
                previewFrames: processedPreviews
            };
        }
    }

    return null;
};
