
import { NodeProcessor, ImageSource } from '../../../../types';

export const processCrop: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    const input = inputs['input'] || Object.values(inputs)[0];
    if (node.type !== 'crop' || !input) return null;

    const config = {
        x: 0, y: 0, width: 1, height: 1,
        resize: false, finalWidth: 0, finalHeight: 0,
        ...(node.data || {})
    };
    
    const cropSingle = async (src: ImageSource) => {
        if (!src) return null;
        try {
            const bmp = await loadBitmap(src);
            if (isCancelled()) return null;

            // Strict boundary clamping
            const safeX = Math.max(0, Math.min(config.x, bmp.width - 1));
            const safeY = Math.max(0, Math.min(config.y, bmp.height - 1));
            const safeW = Math.max(1, Math.min(config.width || 1, bmp.width - safeX));
            const safeH = Math.max(1, Math.min(config.height || 1, bmp.height - safeY));

            const targetW = (config.resize && config.finalWidth) ? config.finalWidth : safeW;
            const targetH = (config.resize && config.finalHeight) ? config.finalHeight : safeH;

            // Use ImageBitmap crop
            const cropped = await createImageBitmap(bmp, safeX, safeY, safeW, safeH);
            
            // Resize if needed
            if (targetW !== safeW || targetH !== safeH) {
                const c = document.createElement('canvas');
                c.width = targetW; c.height = targetH;
                const ctx = c.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = false; 
                    ctx.drawImage(cropped, 0, 0, targetW, targetH);
                    return await createImageBitmap(c);
                }
            }
            return cropped;
        } catch (e) {
            return null;
        }
    };

    if (input.type === 'IMAGE') {
        const result = await cropSingle(input.image);
        if (result) return { type: 'IMAGE', image: result, width: result.width, height: result.height };
    } 
    else if (input.type === 'TIMELINE') {
        const croppedFrames = await Promise.all(input.frames.map(cropSingle));
        const validFrames = croppedFrames.filter(Boolean) as ImageBitmap[];
        if (validFrames.length > 0) {
            return { ...input, frames: validFrames, image: validFrames[0] };
        }
    } else if (input.type === 'IMAGE_SEQUENCE') {
         if (input.previewFrames) {
             const croppedFrames = await Promise.all(input.previewFrames.map(cropSingle));
             const validFrames = croppedFrames.filter(Boolean) as ImageBitmap[];
             return { ...input, previewFrames: validFrames, image: validFrames[0] || input.image };
         } else if (input.image) {
             const result = await cropSingle(input.image);
             if (result) return { ...input, image: result };
         }
    }

    return null;
};
