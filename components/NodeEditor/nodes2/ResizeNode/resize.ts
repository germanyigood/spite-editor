
import { NodeProcessor, ImageSource, Frame } from '../../../../types';

export const processResize: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    // Inputs is a Record<string, NodePayload>
    const input = inputs['input'] || inputs['main'] || Object.values(inputs)[0];
    if (node.type !== 'resize' || !input) return null;

    const { width, height } = node.data;
    
    // Helper to resize a single image
    const resizeSingle = async (src: ImageSource, targetW: number, targetH: number): Promise<ImageBitmap | null> => {
        try {
            if (!src) return null;
            const bmp = await loadBitmap(src);
            if (isCancelled()) return null;

            // Optimization: If no resize needed
            if (bmp.width === targetW && bmp.height === targetH) return bmp;

            const c = document.createElement('canvas');
            c.width = targetW;
            c.height = targetH;
            const ctx = c.getContext('2d');
            if (ctx) {
                ctx.imageSmoothingEnabled = false; // Pixel Art default
                ctx.drawImage(bmp, 0, 0, targetW, targetH);
                return await createImageBitmap(c);
            }
            return null;
        } catch (e) {
            console.warn("Resize failed", e);
            return null;
        }
    };

    // Calculate Target Logic
    // Returns { w, h, scaleX, scaleY } based on input source dimensions
    const getTarget = (srcW: number, srcH: number) => {
        // Fallback if node data is missing (e.g. newly created node before first render)
        const w = Math.max(1, width || srcW);
        const h = Math.max(1, height || srcH);
        return { w, h, sx: w / srcW, sy: h / srcH };
    };

    if (input.type === 'IMAGE') {
        const bmp = await loadBitmap(input.image);
        if (!bmp) return null;
        const { w, h } = getTarget(bmp.width, bmp.height);
        
        const resized = await resizeSingle(input.image, w, h);
        if (resized) return { type: 'IMAGE', image: resized, width: resized.width, height: resized.height };
    } 
    else if (input.type === 'TIMELINE') {
        if (input.frames.length === 0) return input;

        // 1. Determine Scale Factors based on the FIRST FRAME (The Sprite)
        // We do NOT use input.image (The Atlas) as the base, because the user wants to resize the character, not the sheet.
        const firstFrameBmp = await loadBitmap(input.frames[0]);
        const frameW = firstFrameBmp.width;
        const frameH = firstFrameBmp.height;

        const { w: targetFrameW, h: targetFrameH, sx, sy } = getTarget(frameW, frameH);

        // 2. Resize individual frames
        const resizedFramesResults = await Promise.all(input.frames.map(async (f) => {
            return resizeSingle(f, targetFrameW, targetFrameH);
        }));
        const validFrames = resizedFramesResults.filter(Boolean) as ImageBitmap[];
        
        // 3. Scale Metadata (Proportional scaling of original layout)
        let resizedMeta: Frame[] = [];
        if (input.framesMetadata && input.framesMetadata.length > 0) {
            resizedMeta = input.framesMetadata.map((m) => {
                return {
                    ...m,
                    x: Math.round(m.x * sx),
                    y: Math.round(m.y * sy),
                    width: targetFrameW,
                    height: targetFrameH
                };
            });
        } else {
            // Fallback metadata if missing
            resizedMeta = validFrames.map((_, i) => ({
                id: i,
                name: `Frame ${i}`,
                width: targetFrameW,
                height: targetFrameH,
                x: 0, 
                y: 0
            }));
        }

        // 4. Resize the "Whole Picture" (Atlas) for context consistency
        // If we scaled the frames by X%, we scale the atlas by X% too.
        let resizedAtlas: ImageBitmap | null = null;
        if (input.image) {
            const atlas = await loadBitmap(input.image);
            const atlasTargetW = Math.floor(atlas.width * sx);
            const atlasTargetH = Math.floor(atlas.height * sy);
            resizedAtlas = await resizeSingle(input.image, atlasTargetW, atlasTargetH);
        }

        return {
            ...input,
            frames: validFrames,
            framesMetadata: resizedMeta,
            // Pass the resized Atlas so preview shows the whole sheet correctly scaled
            image: resizedAtlas || validFrames[0]
        };
    } 
    else if (input.type === 'IMAGE_SEQUENCE') {
        // For Image Sequence (Grid output), we resize the ATLAS and the metadata.
        const bmp = await loadBitmap(input.image);
        
        // Strategy: We scale based on the Frame Size if known, otherwise Atlas size?
        // Usually Sequence implies Grid. If we resize a Grid output, we likely want to resize the whole sheet
        // but preserve the frame count. 
        // Actually, if we resize the grid output, we act like we are resizing the "Image" containing the grid.
        
        // However, if the user intended to resize "Each Sprite to 32x32", this node processes the WHOLE IMAGE.
        // To resize tiles, we should calculate scale based on Frame Width.
        
        let referenceW = bmp.width;
        let referenceH = bmp.height;
        
        // If we have frame data, we assume the user might be targeting frame size
        // But the input payload structure for SEQUENCE usually treats the `image` as the primary asset.
        
        // Let's stick to consistent logic: If we have frameWidth, we use that for aspect ratio lock?
        // No, `resizeSingle` takes explicit W/H.
        
        // If the user inputs 32x32, and the atlas is 100x100 (containing 10x10 sprites), 
        // resizing the atlas to 32x32 destroys the sprites.
        
        // NOTE: The current UI architecture for ResizeNode assumes "Target Dimensions".
        // If I connect a Grid (Sequence) -> Resize, and type 32x32...
        // It implies the FINAL IMAGE should be 32x32. 
        
        // If the user wants to resize "Each Cell", they should theoretically resize BEFORE the grid 
        // OR use a specific "Scale" mode. 
        
        // For now, standard behavior for IMAGE/SEQUENCE is "Resize the Canvas".
        // The fix above specifically targeted TIMELINE because TIMELINE is a collection of frames.
        
        const { w: atlasW, h: atlasH, sx, sy } = getTarget(referenceW, referenceH);
        
        const resizedAtlas = await resizeSingle(input.image, atlasW, atlasH);
        
        if (!resizedAtlas) return null;

        // Scale Frame Definitions proportionally
        const newFrameW = Math.round(input.frameWidth * sx);
        const newFrameH = Math.round(input.frameHeight * sy);

        const newFrames: Record<number, Frame> = {};
        if (input.frames) {
            Object.values(input.frames).forEach(f => {
                newFrames[f.id] = {
                    ...f,
                    x: Math.round(f.x * sx),
                    y: Math.round(f.y * sy),
                    width: Math.round(f.width * sx),
                    height: Math.round(f.height * sy)
                };
            });
        }
        
        // Resize preview frames if they exist
        let newPreviews: ImageBitmap[] = [];
        if (input.previewFrames) {
            const res = await Promise.all(input.previewFrames.map(f => resizeSingle(f, newFrameW, newFrameH)));
            newPreviews = res.filter(Boolean) as ImageBitmap[];
        }

        return {
            ...input,
            image: resizedAtlas,
            frameWidth: newFrameW,
            frameHeight: newFrameH,
            frames: newFrames,
            previewFrames: newPreviews
        };
    }

    return null;
};
