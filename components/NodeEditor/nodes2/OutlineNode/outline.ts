
import { NodeProcessor, ImageSource } from '../../../../types';

export const processOutline: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    const input = inputs['input'] || Object.values(inputs)[0];
    if (node.type !== 'outline' || !input) return null;

    const { color = '#ffffff', thickness = 1, opacity = 1.0, position = 1.0 } = node.data;

    // Helper to process a single bitmap
    const generate = async (src: ImageSource) => {
        if (!src) return null;
        const bmp = await loadBitmap(src);
        if (isCancelled()) return null;

        const w = bmp.width;
        const h = bmp.height;
        const t = Math.max(0, thickness);

        // Calculate Morphological Radii based on Position (-1 to 1)
        // Position 1 (Outer):  Dilate = T,   Erode = 0
        // Position -1 (Inner): Dilate = 0,   Erode = T
        // Position 0 (Center): Dilate = T/2, Erode = T/2
        const outR = Math.max(0, (position + 1) * t / 2);
        const inR  = Math.max(0, (1 - position) * t / 2);

        // 1. Create Silhouette (Alpha Mask filled with Color)
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = w; baseCanvas.height = h;
        const bCtx = baseCanvas.getContext('2d');
        if (!bCtx) return null;

        bCtx.drawImage(bmp, 0, 0);
        bCtx.globalCompositeOperation = 'source-in';
        bCtx.fillStyle = color;
        bCtx.fillRect(0, 0, w, h);

        // 2. Generate Dilated Mask (Expanded)
        const dilatedCanvas = document.createElement('canvas');
        dilatedCanvas.width = w; dilatedCanvas.height = h;
        const dCtx = dilatedCanvas.getContext('2d');
        if (!dCtx) return null;

        dCtx.drawImage(baseCanvas, 0, 0); // Start with base

        if (outR > 0) {
            // Dilate by drawing offsets
            const passes = Math.ceil(outR);
            for (let x = -passes; x <= passes; x++) {
                for (let y = -passes; y <= passes; y++) {
                    if (x === 0 && y === 0) continue;
                    // Circular kernel
                    if (x*x + y*y <= outR*outR) {
                        dCtx.drawImage(baseCanvas, x, y);
                    }
                }
            }
        }

        // 3. Generate Eroded Mask (Shrunk)
        const erodedCanvas = document.createElement('canvas');
        erodedCanvas.width = w; erodedCanvas.height = h;
        const eCtx = erodedCanvas.getContext('2d');
        if (!eCtx) return null;

        if (inR > 0) {
            // Erosion Simulation:
            // We use 'destination-in' (AND operation).
            // We start with the base, and keep intersecting it with itself shifted.
            // If a pixel is only 1px wide, shifting it 1px and ANDing results in transparency (erosion).
            
            eCtx.drawImage(baseCanvas, 0, 0);
            eCtx.globalCompositeOperation = 'destination-in';

            const passes = Math.ceil(inR);
            for (let x = -passes; x <= passes; x++) {
                for (let y = -passes; y <= passes; y++) {
                    if (x === 0 && y === 0) continue;
                    if (x*x + y*y <= inR*inR) {
                        eCtx.drawImage(baseCanvas, x, y);
                    }
                }
            }
        } else {
            // No erosion -> Inner boundary is the original shape
            eCtx.drawImage(baseCanvas, 0, 0);
        }

        // 4. Generate Stroke (Dilated MINUS Eroded)
        const strokeCanvas = document.createElement('canvas');
        strokeCanvas.width = w; strokeCanvas.height = h;
        const sCtx = strokeCanvas.getContext('2d');
        if (!sCtx) return null;

        sCtx.globalAlpha = opacity;
        sCtx.drawImage(dilatedCanvas, 0, 0); // Draw Outer shape
        
        sCtx.globalCompositeOperation = 'destination-out';
        sCtx.globalAlpha = 1.0; 
        sCtx.drawImage(erodedCanvas, 0, 0); // Cut out Inner shape

        // 5. Final Composite
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = w; finalCanvas.height = h;
        const fCtx = finalCanvas.getContext('2d');
        if (!fCtx) return null;

        // Layering Logic:
        // If strictly Outer (pos ~ 1), draw Stroke BEHIND Image to preserve original anti-aliasing.
        // If Inner or Center, Stroke MUST be ON TOP to cover the original.
        if (position >= 0.95) {
            fCtx.drawImage(strokeCanvas, 0, 0);
            fCtx.drawImage(bmp, 0, 0);
        } else {
            fCtx.drawImage(bmp, 0, 0);
            fCtx.drawImage(strokeCanvas, 0, 0);
        }

        return await createImageBitmap(finalCanvas);
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
