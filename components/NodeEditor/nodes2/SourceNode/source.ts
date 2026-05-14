
import { NodeProcessor } from '../../../../types';

export const processSource: NodeProcessor = async (node, _inputs, { loadBitmap, isCancelled }) => {
    if (node.type !== 'source' || !node.data.src) return null;
    
    try {
        const bmp = await loadBitmap(node.data.src);
        if (isCancelled()) return null;
        
        return {
            type: 'IMAGE',
            image: bmp,
            width: node.data.width,
            height: node.data.height,
            src: node.data.src // Included for validation/checking downstream
        };
    } catch (e) {
        console.error(`Failed to load source ${node.id}`, e);
        return null;
    }
};
