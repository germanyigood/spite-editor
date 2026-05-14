
import { NodeProcessor, ImageSource } from '../../../../types';

export const processFrameNormalize: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    const input = inputs['input'] || Object.values(inputs)[0];
    // This node primarily works on IMAGE_SEQUENCE, but can handle single IMAGE or TIMELINE too.
    if (node.type !== 'frame_normalize' || !input) return null;

    const { width = 64, height = 64, fit = 'center' } = node.data;
    const targetW = Math.max(1, width);
    const targetH = Math.max(1, height);

    const normalizeSingle = async (src: ImageSource): Promise<ImageBitmap | null> => {
        if (!src) return null;
        try {
            const bmp = await loadBitmap(src);
            if (isCancelled()) return null;

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            ctx.imageSmoothingEnabled = false;

            const srcW = bmp.width;
            const srcH = bmp.height;
            let drawX = 0, drawY = 0, drawW = srcW, drawH = srcH;

            // Strategy Logic
            if (fit === 'center') {
                // No scaling, just center
                drawX = Math.floor((targetW - srcW) / 2);
                drawY = Math.floor((targetH - srcH) / 2);
            } else if (fit === 'stretch') {
                drawX = 0; drawY = 0;
                drawW = targetW; drawH = targetH;
            } else if (fit === 'contain' || fit === 'cover') {
                const scaleX = targetW / srcW;
                const scaleY = targetH / srcH;
                const scale = fit === 'contain' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);
                
                drawW = Math.floor(srcW * scale);
                drawH = Math.floor(srcH * scale);
                drawX = Math.floor((targetW - drawW) / 2);
                drawY = Math.floor((targetH - drawH) / 2);
            }

            ctx.drawImage(bmp, drawX, drawY, drawW, drawH);
            return await createImageBitmap(canvas);
        } catch (e) {
            return null;
        }
    };

    // --- Sequence Processing ---
    if (input.type === 'IMAGE_SEQUENCE') {
        let newPreviews: ImageBitmap[] = [];
        
        // If we have existing preview frames (sprites), normalize them
        if (input.previewFrames && input.previewFrames.length > 0) {
            const promises = input.previewFrames.map(normalizeSingle);
            const results = await Promise.all(promises);
            newPreviews = results.filter(Boolean) as ImageBitmap[];
        } 
        // Fallback: If we only have the Atlas but no preview frames (rare in Grid flow),
        // we essentially treat the whole atlas as one frame? 
        // No, typically FrameNormalize is placed after Grid. Grid *always* produces previewFrames.
        // If connected directly to Source, treat source as 1 frame.
        else if (input.image) {
            const res = await normalizeSingle(input.image);
            if (res) newPreviews.push(res);
        }

        // We update frame width/height to the standardized size
        // We pass the FIRST valid frame as the "image" (Atlas representative) because 
        // the original atlas is no longer spatially valid for these new frames if sizes changed wildly.
        return {
            ...input,
            frameWidth: targetW,
            frameHeight: targetH,
            previewFrames: newPreviews,
            // If we have frames, use the first one as the display image for downstream nodes
            image: newPreviews.length > 0 ? newPreviews[0] : input.image
        };
    }
    
    // --- Timeline Processing (e.g. normalizing a timeline from mixed sources) ---
    else if (input.type === 'TIMELINE') {
        const promises = input.frames.map(normalizeSingle);
        const results = await Promise.all(promises);
        const validFrames = results.filter(Boolean) as ImageBitmap[];
        
        return {
            ...input,
            frames: validFrames,
            image: validFrames[0] || input.image
        };
    }

    // --- Single Image Processing ---
    else if (input.type === 'IMAGE') {
        const res = await normalizeSingle(input.image);
        if (res) {
            return {
                type: 'IMAGE',
                image: res,
                width: targetW,
                height: targetH
            };
        }
    }

    return null;
};
