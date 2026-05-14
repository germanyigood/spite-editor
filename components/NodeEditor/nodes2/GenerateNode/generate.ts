
import { NodeProcessor } from '../../../../types';

export const processGenerate: NodeProcessor = async (node, _inputs, { loadBitmap, isCancelled }) => {
    // Generate Node acts as a Source. It doesn't use inputs.
    // It provides the generated image stored in its data.
    if (node.type !== 'generate' || !node.data.generatedImage) return null;
    
    try {
        const bmp = await loadBitmap(node.data.generatedImage);
        if (isCancelled()) return null;
        
        return {
            type: 'IMAGE',
            image: bmp,
            width: bmp.width,
            height: bmp.height,
            src: node.data.generatedImage // Use base64 as unique ID for caching/stale checks
        };
    } catch (e) {
        console.error(`Failed to load generated image for node ${node.id}`, e);
        return null;
    }
};
