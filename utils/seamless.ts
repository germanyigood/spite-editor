

export interface SeamlessConfig {
    overlap: number;
    mode: 'patch' | 'mirror';
    chaos: number;
}

/**
 * Generates a seamless texture from a source bitmap.
 */
export const generateSeamlessTexture = async (
    source: ImageBitmap,
    config: SeamlessConfig
): Promise<ImageBitmap> => {
    const w = source.width;
    const h = source.height;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error("Context failed");

    // --- MODE 1: MIRROR (Kaleidoscope) ---
    // Zero seams, but creates symmetrical artifacts.
    if (config.mode === 'mirror') {
        // We shrink the image to 50% and tile it 2x2 with mirroring
        const hw = Math.ceil(w / 2);
        const hh = Math.ceil(h / 2);

        // Draw Top-Left (Normal)
        ctx.drawImage(source, 0, 0, w, h, 0, 0, hw, hh);

        // Draw Top-Right (Flip X)
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(source, 0, 0, w, h, 0, 0, hw, hh);
        ctx.restore();

        // Draw Bottom-Left (Flip Y)
        ctx.save();
        ctx.translate(0, h);
        ctx.scale(1, -1);
        ctx.drawImage(source, 0, 0, w, h, 0, 0, hw, hh);
        ctx.restore();

        // Draw Bottom-Right (Flip XY)
        ctx.save();
        ctx.translate(w, h);
        ctx.scale(-1, -1);
        ctx.drawImage(source, 0, 0, w, h, 0, 0, hw, hh);
        ctx.restore();

        return createImageBitmap(canvas);
    }

    // --- MODE 2: PATCH (Offset + Blend + Chaos) ---
    
    // 1. Draw Offset Background (The Tiling Base)
    // We draw the image 4 times to wrap the edges around to the center.
    // The "Cross Seam" is now at (w/2, h/2).
    const hx = w / 2;
    const hy = h / 2;

    // TL -> BR
    ctx.drawImage(source, 0, 0, hx, hy, hx, hy, hx, hy);
    // TR -> BL
    ctx.drawImage(source, hx, 0, hx, hy, 0, hy, hx, hy);
    // BL -> TR
    ctx.drawImage(source, 0, hy, hx, hy, hx, 0, hx, hy);
    // BR -> TL
    ctx.drawImage(source, hx, hy, hx, hy, 0, 0, hx, hy);

    // 2. Prepare Center Patch Mask
    // This blends the original image into the center to cover the main intersection.
    const overlap = config.overlap ?? 0.5;
    const radius = Math.min(w, h) * 0.5 * Math.max(0.1, overlap);
    
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mCtx = maskCanvas.getContext('2d');
    if (mCtx) {
        const g = mCtx.createRadialGradient(hx, hy, radius * 0.3, hx, hy, radius);
        g.addColorStop(0, 'rgba(0,0,0,1)');   
        g.addColorStop(1, 'rgba(0,0,0,0)');
        mCtx.fillStyle = g;
        mCtx.fillRect(0, 0, w, h);
    }

    // 3. Composite Center Patch
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = w;
    patchCanvas.height = h;
    const pCtx = patchCanvas.getContext('2d');
    if (pCtx) {
        pCtx.drawImage(source, 0, 0);
        pCtx.globalCompositeOperation = 'destination-in';
        pCtx.drawImage(maskCanvas, 0, 0);
    }
    ctx.drawImage(patchCanvas, 0, 0);

    // 4. Chaos Splatting (Hide Seams)
    // We randomly copy patches from the source and splat them along the seams (w/2 and h/2).
    const chaos = config.chaos ?? 0;
    
    if (chaos > 0.05) {
        const splatCount = Math.floor(chaos * 40); // Up to 40 splats
        const seamWidth = w * 0.2; // Width of the seam area to target
        
        // Reusable buffer for splats
        const splatSize = Math.min(w, h) * (0.15 + chaos * 0.1); // 15% to 25% of image size
        const sCan = document.createElement('canvas');
        sCan.width = splatSize;
        sCan.height = splatSize;
        const sCtx = sCan.getContext('2d');
        
        if (sCtx) {
            // Create Splat Mask (Soft Circle)
            sCtx.globalCompositeOperation = 'source-over';
            const sg = sCtx.createRadialGradient(splatSize/2, splatSize/2, splatSize*0.1, splatSize/2, splatSize/2, splatSize/2);
            sg.addColorStop(0, 'rgba(0,0,0,1)');
            sg.addColorStop(1, 'rgba(0,0,0,0)');
            
            for (let i = 0; i < splatCount; i++) {
                // Random Source Rect
                const srcX = Math.random() * (w - splatSize);
                const srcY = Math.random() * (h - splatSize);

                // Target Position: Target the cross seam
                let dstX, dstY;
                
                // 50% chance to target Vertical Seam, 50% Horizontal
                if (Math.random() > 0.5) {
                    // Vertical Seam (x = w/2)
                    dstX = (w/2) - (splatSize/2) + (Math.random() - 0.5) * seamWidth;
                    dstY = Math.random() * (h + splatSize) - splatSize;
                } else {
                    // Horizontal Seam (y = h/2)
                    dstX = Math.random() * (w + splatSize) - splatSize;
                    dstY = (h/2) - (splatSize/2) + (Math.random() - 0.5) * seamWidth;
                }

                // 1. Clear Splat Buffer
                sCtx.globalCompositeOperation = 'source-over';
                sCtx.clearRect(0, 0, splatSize, splatSize);
                
                // 2. Draw Source Image Chunk
                sCtx.drawImage(source, srcX, srcY, splatSize, splatSize, 0, 0, splatSize, splatSize);
                
                // 3. Apply Mask
                sCtx.globalCompositeOperation = 'destination-in';
                sCtx.fillStyle = sg;
                sCtx.fillRect(0, 0, splatSize, splatSize);

                // 4. Draw to Main
                ctx.drawImage(sCan, dstX, dstY);
            }
        }
    }

    return createImageBitmap(canvas);
};