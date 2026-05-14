
import { NodeProcessor } from '../../../../types';
import { processKeying } from '../../../../utils/keying';

export const processChroma: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    const input = inputs['input'] || Object.values(inputs)[0];
    if (node.type !== 'chroma' || !input || input.type !== 'IMAGE') return input || null;

    const bmp = await loadBitmap(input.image);
    if (isCancelled()) return null;

    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext('2d');
    
    if (ctx) {
        ctx.drawImage(bmp, 0, 0);
        
        const activeConfig = { ...node.data, enabled: true };
        processKeying(ctx, c.width, c.height, activeConfig);
        
        const outBmp = await createImageBitmap(c);
        
        return {
            type: 'IMAGE',
            image: outBmp,
            width: c.width,
            height: c.height
        };
    }
    
    return null;
};
