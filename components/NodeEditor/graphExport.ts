
import { AnimationEntry, NodeData, Connection, NodePayload, OutputNode, ImageSource, Frame, OptimizeConfig } from '../../types';
import { NODE_PROCESSORS } from './nodeProcessors';
import { loadBitmap, getTopologicalSort } from '../../utils';
import UPNG from 'upng-js';
import pako from 'pako';

// UPNG.js setup
if (typeof window !== 'undefined' && !(window as any).pako) {
    (window as any).pako = pako;
}

const createPngBlob = async (canvas: HTMLCanvasElement, optConfig?: OptimizeConfig): Promise<Blob | null> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const { width, height } = canvas;
    const imgData = ctx.getImageData(0, 0, width, height);
    const buffer = imgData.data.buffer; 

    try {
        if (!UPNG || !UPNG.encode) throw new Error("UPNG missing");
        const cnum = optConfig ? optConfig.cnum : 0; 
        const dither = optConfig?.dither ?? false;
        const pngBuffer = UPNG.encode([buffer], width, height, cnum, [dither]);
        if (!pngBuffer || pngBuffer.byteLength === 0) throw new Error("Empty buffer");
        return new Blob([pngBuffer], { type: 'image/png' });
    } catch (e) {
        console.warn("UPNG Optimization failed, falling back", e);
        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/png');
        });
    }
};

const bitmapToBlob = async (src: ImageSource, optConfig?: OptimizeConfig): Promise<Blob | null> => {
    try {
        const bmp = await loadBitmap(src);
        const c = document.createElement('canvas');
        c.width = bmp.width; c.height = bmp.height;
        const ctx = c.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(bmp, 0, 0);
        return await createPngBlob(c, optConfig);
    } catch(e) {
        console.error("Export Bitmap Error", e);
        return null;
    }
};

const MAX_ATLAS_SIZE = 4096;

export interface AtlasMeta {
    texture: string;
    startFrame: number;
    frameCount: number;
    width: number;
    height: number;
    columns: number;
    rows: number;
}

const packFramesToAtlases = async (frames: ImageSource[], optConfig?: OptimizeConfig): Promise<{blobs: Blob[], atlases: Omit<AtlasMeta, 'texture'>[]} | null> => {
    if (frames.length === 0) return null;
    const bitmaps = await Promise.all(frames.map(loadBitmap));
    const frameW = bitmaps[0].width;
    const frameH = bitmaps[0].height;
    
    const columns = Math.floor(MAX_ATLAS_SIZE / frameW);
    const rows = Math.floor(MAX_ATLAS_SIZE / frameH);
    const framesPerAtlas = columns * rows;
    
    if (framesPerAtlas === 0) {
        console.warn(`Frame size ${frameW}x${frameH} exceeds max atlas size ${MAX_ATLAS_SIZE}`);
        return null;
    }

    const atlases: Omit<AtlasMeta, 'texture'>[] = [];
    const blobs: Blob[] = [];

    for (let startFrame = 0; startFrame < frames.length; startFrame += framesPerAtlas) {
        const chunk = bitmaps.slice(startFrame, startFrame + framesPerAtlas);
        const chunkFramesCount = chunk.length;
        
        const chunkRows = Math.ceil(chunkFramesCount / columns);
        const atlasWidth = columns * frameW;
        const width = chunkFramesCount < columns ? chunkFramesCount * frameW : atlasWidth; // Trim width if fewer frames than max columns
        const height = chunkRows * frameH;
        
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        const ctx = c.getContext('2d');
        if (!ctx) continue;
        ctx.imageSmoothingEnabled = false;

        chunk.forEach((bmp, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);
            ctx.drawImage(bmp, col * frameW, row * frameH);
        });

        const blob = await createPngBlob(c, optConfig);
        if (blob) {
            blobs.push(blob);
            atlases.push({
                startFrame,
                frameCount: chunkFramesCount,
                width,
                height,
                columns,
                rows: chunkRows
            });
        }
    }
    
    return { blobs, atlases };
};

const stitchBitmapsToBlob = async (frames: ImageSource[], optConfig?: OptimizeConfig): Promise<Blob | null> => {
    if (frames.length === 0) return null;
    const bitmaps = await Promise.all(frames.map(loadBitmap));
    let frameW = bitmaps[0].width;
    let frameH = bitmaps[0].height;
    const totalW = frameW * bitmaps.length;
    
    const c = document.createElement('canvas');
    c.width = totalW; c.height = frameH;
    const ctx = c.getContext('2d');
    if(!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    bitmaps.forEach((f, i) => ctx.drawImage(f, i * frameW, 0));
    return await createPngBlob(c, optConfig);
};

export const processGraphHeadless = async (nodes: NodeData[], connections: Connection[], ctxMock?: any) => {
    const out: Record<string, NodePayload | null> = {};
    
    // 1. Deterministic Order
    const order = getTopologicalSort(nodes, connections);
    
    // 2. Maps for quick lookup
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const incomingMap = new Map<string, Connection[]>();
    connections.forEach(c => {
        if (!incomingMap.has(c.target)) incomingMap.set(c.target, []);
        incomingMap.get(c.target)?.push(c);
    });

    // 3. Execution Loop
    for (const nodeId of order) {
        const node = nodeMap.get(nodeId);
        if (!node) continue;

        // Gather Inputs
        const inputs: Record<string, NodePayload> = {};
        const incoming = incomingMap.get(nodeId) || [];
        
        for (const c of incoming) {
            const val = out[c.source];
            if (val) {
                let key = c.targetHandle || 'input';
                // Handle duplicate inputs (fan-in)
                if (inputs[key]) {
                    key = `${key}_${c.id}`;
                }
                inputs[key] = val;
            }
        }

        const processor = NODE_PROCESSORS[node.type as keyof typeof NODE_PROCESSORS];
        if (processor) {
            try {
                // Force sync if possible, but processors are async
                out[nodeId] = await processor(node, inputs, ctxMock || { loadBitmap, isCancelled: () => false });
            } catch (e) {
                console.error(`Export processing failed at ${nodeId}`, e);
                out[nodeId] = null;
            }
        }
    }
    
    return out;
};

export const collectGraphData = async (anim: AnimationEntry) => {
    const nodeOutputs = await processGraphHeadless(anim.nodeGraph.nodes, anim.nodeGraph.connections);
    const outputNodes = anim.nodeGraph.nodes.filter(n => n.type === 'output') as OutputNode[];
    
    if (outputNodes.length === 0) return null;

    const resultBlobs: Record<string, Blob> = {};
    const meta: any = { fps: 0, loop: false, width: 0, height: 0, totalFrames: 1, frames: [] as Frame[], atlases: {} };
    let metaSet = false;

    for (const outputNode of outputNodes) {
        const payload = nodeOutputs[outputNode.id];
        if (!payload) continue;

        const key = (outputNode.data && outputNode.data.name) || 'default';
        const optConfig = (payload as any).optimization as OptimizeConfig | undefined;

        if (payload.type === 'IMAGE') {
            let blob: Blob | null = await bitmapToBlob(payload.image, optConfig);
            if (blob) {
                resultBlobs[key] = blob;
                if (!metaSet || key === 'default') {
                    meta.width = payload.width;
                    meta.height = payload.height;
                    meta.totalFrames = 1;
                    meta.fps = 0;
                    metaSet = true;
                }
            }
        } else if (payload.type === 'TIMELINE') {
            if (!metaSet || key === 'default') {
                meta.fps = payload.fps;
                meta.loop = payload.isLoop;
                meta.totalFrames = payload.frames.length;
            }
            if (payload.frames.length > 0) {
                 const packResult = await packFramesToAtlases(payload.frames, optConfig);
                 if (packResult) {
                     packResult.blobs.forEach((blob, index) => {
                         const objKey = packResult.blobs.length > 1 ? `${key}_${index}` : key;
                         resultBlobs[objKey] = blob;
                     });

                     if (!metaSet || key === 'default') {
                        const firstFrame = await loadBitmap(payload.frames[0]);
                        meta.width = firstFrame.width;
                        meta.height = firstFrame.height;
                        meta.frames = payload.frames.map((_, i) => ({
                            id: payload.framesMetadata?.[i]?.id ?? i,
                            name: payload.framesMetadata?.[i]?.name ?? `Frame ${i}`,
                            width: meta.width,
                            height: meta.height,
                            x: 0, y: 0 // Will be handled by the client using atlas UVs
                        }));
                        metaSet = true;
                     }
                     
                     // Attach atlases to this key
                     meta.atlases[key] = packResult.atlases.map((a, index) => ({
                         texture: packResult.blobs.length > 1 ? `${key}_${index}` : key,
                         ...a
                     }));
                 }
            }
        } else if (payload.type === 'IMAGE_SEQUENCE') {
             if (payload.image) {
                 const blob = await bitmapToBlob(payload.image, optConfig);
                 if (blob) {
                     resultBlobs[key] = blob;
                     if (!metaSet || key === 'default') {
                        const atlas = await loadBitmap(payload.image);
                        meta.width = atlas.width;
                        meta.height = atlas.height;
                        const framesList = Object.values(payload.frames || {});
                        meta.totalFrames = framesList.length;
                        framesList.sort((a, b) => Number(a.id) - Number(b.id));
                        meta.frames = framesList.map(f => ({
                            id: f.id, name: f.name || `Frame ${f.id}`,
                            x: f.x, y: f.y, width: f.width, height: f.height
                        }));
                        metaSet = true;
                     }
                 }
             }
        }
    }
    
    if (Object.keys(resultBlobs).length === 0) return null;
    return { name: anim.name, meta, outputs: resultBlobs };
};
