
import { useState, useEffect } from 'react';
import { AnimationEntry, NodePreviewData, ImageSource } from '../types';
import { getGraphLayers } from '../utils';

export const usePreviewState = (
    currentAnim: AnimationEntry | undefined, 
    nodeOutputs: any
) => {
    const [nodePreviewData, setNodePreviewData] = useState<NodePreviewData | null>(null);
    const [generatedFrames, setGeneratedFrames] = useState<ImageSource[]>([]);

    // 1. Sidebar Preview (Output Node)
    useEffect(() => {
        if (!currentAnim) {
            setNodePreviewData(null);
            return;
        }
        const outputNode = currentAnim.nodeGraph.nodes.find(n => n.type === 'output');
        if (outputNode && nodeOutputs[outputNode.id]) {
            const data = nodeOutputs[outputNode.id];
            if (data?.type === 'TIMELINE') {
                setNodePreviewData({ type: 'animation', data: data.frames });
            } else if (data?.type === 'IMAGE' || data?.type === 'IMAGE_SEQUENCE') {
                setNodePreviewData({ type: 'static', data: data.image });
            } else {
                setNodePreviewData({ type: 'empty', data: '' });
            }
        } else {
            setNodePreviewData(null);
        }
    }, [nodeOutputs, currentAnim]);

    // 2. Timeline Strip Generation
    useEffect(() => {
        if (!currentAnim) {
            setGeneratedFrames([]);
            return;
        }
        const layers = getGraphLayers(currentAnim.nodeGraph);
        const newFrames: ImageSource[] = [];
        layers.forEach(({ slice }) => {
            if (slice && nodeOutputs[slice.id]) {
                const payload = nodeOutputs[slice.id];
                if (payload?.type === 'IMAGE_SEQUENCE' && payload.previewFrames) {
                    newFrames.push(...payload.previewFrames);
                }
            }
        });
        setGeneratedFrames(newFrames);
    }, [currentAnim?.nodeGraph, nodeOutputs]);

    return { nodePreviewData, generatedFrames };
};
