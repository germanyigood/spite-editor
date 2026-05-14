
/**
 * Generates a Normal Map from an HTMLCanvasElement source.
 * Uses a Sobel filter to detect gradients in luminance.
 */
export const generateNormalMap = async (
    sourceCanvas: HTMLCanvasElement,
    strength: number = 1.0
): Promise<ImageBitmap> => {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;

    const ctx = sourceCanvas.getContext('2d');
    if (!ctx) throw new Error("Could not get context");

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    
    // Create new buffer for normal map
    const output = ctx.createImageData(w, h);
    const outData = output.data;

    // Helper to get grayscale value of a pixel
    const getVal = (x: number, y: number) => {
        // Clamp coords
        const cx = Math.max(0, Math.min(w - 1, x));
        const cy = Math.max(0, Math.min(h - 1, y));
        const idx = (cy * w + cx) * 4;
        // Simple luminance (R+G+B)/3 or standard Rec. 709
        return (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255.0;
    };
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const alpha = data[idx + 3];

            if (alpha < 10) {
                // Transparent background -> Neutral normal (128, 128, 255)
                outData[idx] = 128;
                outData[idx + 1] = 128;
                outData[idx + 2] = 255;
                outData[idx + 3] = 0; // Keep transparent
                continue;
            }

            // Sobel Kernel
            const tl = getVal(x - 1, y - 1);
            const t  = getVal(x,     y - 1);
            const tr = getVal(x + 1, y - 1);
            const l  = getVal(x - 1, y);
            const r  = getVal(x + 1, y);
            const bl = getVal(x - 1, y + 1);
            const b  = getVal(x,     y + 1);
            const br = getVal(x + 1, y + 1);

            // dx = (TR + 2R + BR) - (TL + 2L + BL)
            const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
            
            // dy = (BL + 2B + BR) - (TL + 2T + TR)
            const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);
            
            // dz is inversely proportional to strength
            const dz = 1.0 / Math.max(0.01, strength);

            // Normalize vector (dx, dy, dz)
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            // Standard Sobel
            const nx = dx / len;
            const ny = dy / len;
            const nz = dz / len;

            // Map -1..1 to 0..255
            outData[idx] = (nx + 1) * 127.5;     // R -> X
            outData[idx + 1] = (ny + 1) * 127.5; // G -> Y
            outData[idx + 2] = (nz + 1) * 127.5; // B -> Z
            outData[idx + 3] = alpha;            // Alpha
        }
    }

    return createImageBitmap(output);
};