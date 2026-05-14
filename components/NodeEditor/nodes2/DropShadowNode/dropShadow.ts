
import { NodeProcessor, ImageSource } from '../../../../types';
import { hexToRgb } from '../../../../utils';

export const processDropShadow: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    const input = inputs['input'] || Object.values(inputs)[0];
    if (node.type !== 'drop_shadow' || !input) return null;

    const { color = '#000000', alpha = 0.5, blur = 0, x = 5, y = 5 } = node.data;

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

        // Convert hex color to rgba for shadowColor
        const rgb = hexToRgb(color);
        const shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;

        ctx.save();
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = blur;
        ctx.shadowOffsetX = x;
        ctx.shadowOffsetY = y;
        
        // Draw the image. The shadow will be drawn behind it automatically by canvas engine
        ctx.drawImage(bmp, 0, 0);
        ctx.restore();

        // Note: Canvas shadow operation draws source image + shadow.
        // If the shadow offset pushes it out of bounds, it's clipped.
        // We keep original dimensions to maintain grid alignment. 
        // User should use CropNode/Padding if they need more space.

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
