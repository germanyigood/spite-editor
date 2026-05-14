
import { NodeProcessor, ImageSource } from '../../../../types';

export const processComposite: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    const front = inputs['front'];
    const back = inputs['back'];
    
    if (node.type !== 'composite' || (!front && !back)) return null;

    const { opacity = 1.0, fit = 'cover' } = node.data;

    // Helper to get image source from payload
    const getImage = (p: any): ImageSource | null => {
        if (!p) return null;
        return (p.type === 'IMAGE' || p.type === 'IMAGE_SEQUENCE') ? p.image : (p.type === 'TIMELINE' ? p.image : null);
    };

    const frontSrc = getImage(front);
    const backSrc = getImage(back);

    if (!frontSrc && !backSrc) return null;

    // If only one exists, return it (simple passthrough logic)
    if (!backSrc && frontSrc) return { ...front, type: 'IMAGE' } as any; 
    if (!frontSrc && backSrc) return { ...back, type: 'IMAGE' } as any;

    try {
        const fBitmap = frontSrc ? await loadBitmap(frontSrc) : null;
        const bBitmap = backSrc ? await loadBitmap(backSrc) : null;
        if (isCancelled()) return null;

        if (!fBitmap || !bBitmap) return null;

        // Use Front dimensions as the master canvas size
        const w = fBitmap.width;
        const h = fBitmap.height;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // 1. Draw Background (Back)
        const bw = bBitmap.width;
        const bh = bBitmap.height;
        let bx = 0, by = 0, bDrawW = w, bDrawH = h;

        if (fit === 'cover' || fit === 'contain') {
            const scaleX = w / bw;
            const scaleY = h / bh;
            let scale = fit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
            
            bDrawW = bw * scale;
            bDrawH = bh * scale;
            bx = (w - bDrawW) / 2;
            by = (h - bDrawH) / 2;
        } 

        ctx.globalAlpha = opacity;
        ctx.drawImage(bBitmap, bx, by, bDrawW, bDrawH);
        
        // 2. Draw Foreground (Front)
        ctx.globalAlpha = 1.0;
        ctx.drawImage(fBitmap, 0, 0);

        const result = await createImageBitmap(canvas);
        
        return {
            type: 'IMAGE',
            image: result,
            width: w,
            height: h
        };

    } catch (e) {
        console.error("Composite failed", e);
        return null;
    }
};
