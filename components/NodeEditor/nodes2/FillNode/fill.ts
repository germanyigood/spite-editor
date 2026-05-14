
import { NodeProcessor, ImageSource } from '../../../../types';

export const processFill: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    const input = inputs['input'] || Object.values(inputs)[0];
    if (node.type !== 'fill_color' || !input) return null;

    const { color = '#000000' } = node.data;

    const generate = async (src: ImageSource) => {
        if (!src) return null;
        const bmp = await loadBitmap(src);
        if (isCancelled()) return null;

        const w = bmp.width;
        const h = bmp.height;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // 1. Fill Background
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
        
        // 2. Draw Image on top
        ctx.drawImage(bmp, 0, 0);

        return await createImageBitmap(canvas);
    };

    if (input.type === 'IMAGE') {
        const result = await generate(input.image);
        if (result) return { type: 'IMAGE', image: result, width: result.width, height: result.height };
    } 
    else if (input.type === 'TIMELINE') {
        const results = await Promise.all(input.frames.map(generate));
        const validResults = results.filter(Boolean) as ImageBitmap[];
        if (validResults.length > 0) {
            return { ...input, frames: validResults, image: validResults[0] };
        }
    } else if (input.type === 'IMAGE_SEQUENCE') {
        if (input.previewFrames) {
             const results = await Promise.all(input.previewFrames.map(generate));
             const validResults = results.filter(Boolean) as ImageBitmap[];
             if(validResults.length > 0) {
                 return { ...input, previewFrames: validResults, image: validResults[0] };
             }
        } else if (input.image) {
            const result = await generate(input.image);
            if (result) return { ...input, image: result };
        }
    }

    return null;
};
