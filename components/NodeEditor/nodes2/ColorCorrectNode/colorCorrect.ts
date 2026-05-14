
import { NodeProcessor, ImageSource } from '../../../../types';
import { processColorCorrection } from '../../../../utils/keying';

export const processColorCorrect: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    const input = inputs['input'] || Object.values(inputs)[0];
    if (node.type !== 'color_correct' || !input) return null;

    const generate = async (src: ImageSource) => {
        if (!src) return null;
        const bmp = await loadBitmap(src);
        if (isCancelled()) return null;

        const c = document.createElement('canvas');
        c.width = bmp.width; 
        c.height = bmp.height;
        const ctx = c.getContext('2d');
        if (ctx) {
            ctx.drawImage(bmp, 0, 0);
            processColorCorrection(ctx, c.width, c.height, node.data);
            return await createImageBitmap(c);
        }
        return null;
    };

    if (input.type === 'IMAGE') {
        const result = await generate(input.image);
        if (result) return { 
            type: 'IMAGE', 
            image: result, 
            width: result.width, 
            height: result.height
        };
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
