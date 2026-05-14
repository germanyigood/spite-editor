
import { NodeProcessor, ImageSource } from '../../../../types';
import { generateSeamlessTexture } from '../../../../utils/seamless';

export const processSeamless: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    const input = inputs['input'] || Object.values(inputs)[0];
    if (node.type !== 'seamless' || !input) return null;

    const overlap = node.data.overlap ?? 0.5;
    const mode = node.data.mode ?? 'patch';
    const chaos = node.data.chaos ?? 0.0;

    const config = { overlap, mode, chaos };

    // Helper to process a single bitmap
    const generate = async (src: ImageSource) => {
        if (!src) return null;
        const bmp = await loadBitmap(src);
        if (isCancelled()) return null;
        return await generateSeamlessTexture(bmp, config);
    };

    if (input.type === 'IMAGE') {
        const result = await generate(input.image);
        if (result) return { type: 'IMAGE', image: result, width: result.width, height: result.height };
    } 
    else if (input.type === 'TIMELINE') {
        // Process every frame in the timeline
        const results = await Promise.all(input.frames.map(generate));
        const validResults = results.filter(Boolean) as ImageBitmap[];
        
        if (validResults.length > 0) {
            return { 
                ...input, 
                frames: validResults, 
                image: validResults[0] 
            };
        }
    }

    return null;
};
