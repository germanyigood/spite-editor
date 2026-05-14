
import JSZip from 'jszip';
import * as yup from 'yup';
import { AnimationEntry, NodeData, NodeGraphData, SourceNode, GridNode, Frame, ProjectState, PaintNode } from "../types";
import { loadImage } from './io';

// --- YUP SCHEMA DEFINITIONS ---

const frameSchema = yup.object({
    id: yup.mixed().required(), 
    x: yup.number().required(),
    y: yup.number().required(),
    width: yup.number().required(),
    height: yup.number().required(),
    name: yup.string().optional()
});

const nodeSchema = yup.object({
    id: yup.string().required(),
    type: yup.string().required(),
    x: yup.number().default(0),
    y: yup.number().default(0),
    width: yup.number().default(100),
    height: yup.number().default(100),
    // CRITICAL FIX: Use mixed() instead of object() to prevent stripping unknown keys.
    // Node data contains arbitrary properties (src, frames, etc.) that must be preserved.
    data: yup.mixed().default({})
});

const connectionSchema = yup.object({
    id: yup.string().required(),
    source: yup.string().required(),
    target: yup.string().required(),
    sourceHandle: yup.string().optional(),
    targetHandle: yup.string().optional()
});

const nodeGraphSchema = yup.object({
    nodes: yup.array().of(nodeSchema).default([]),
    connections: yup.array().of(connectionSchema).default([]),
    viewport: yup.object({
        x: yup.number().default(0),
        y: yup.number().default(0),
        scale: yup.number().default(1)
    }).default({x:0, y:0, scale:1})
});

const animationEntrySchema = yup.object({
    id: yup.string().required(),
    name: yup.string().required(),
    nodeGraph: nodeGraphSchema.required(),
    editorTransform: yup.object({
        x: yup.number(), y: yup.number(), scale: yup.number()
    }).optional(),
    layoutCamera: yup.object({
        x: yup.number(), y: yup.number(), scale: yup.number()
    }).optional(),
    layout: yup.object({
        elements: yup.array().default([])
    }).default({ elements: [] })
});

const projectSchema = yup.object({
    version: yup.mixed().optional(),
    projectName: yup.string().default('Project'),
    // Make animations optional to support older project formats or empty wrappers
    animations: yup.array().of(animationEntrySchema).default([]),
    uiState: yup.object({
        rightSidebarWidth: yup.number().default(320),
        timelineHeight: yup.number().default(240)
    }).optional(),
    // New optional fields for session restoration
    activeAnimationId: yup.string().optional(),
    activeLayerId: yup.string().nullable().optional(),
    selectedFrameIndex: yup.number().nullable().optional(),
    selectedLayoutElementId: yup.string().nullable().optional()
});

export const createProjectBundle = async (state: ProjectState) => {
    const zip = new JSZip();
    
    // Process animations to handle blobs/assets
    // We must use Promise.all to handle async fetches for Blob URLs
    const metaAnimations = await Promise.all(state.animations.map(async (anim) => {
        const nodes = await Promise.all(anim.nodeGraph.nodes.map(async (n) => {
            // 1. Handle Source Images (Base64)
            if(n.type === 'source' && n.data.src && n.data.src.startsWith('data:')) {
                const fName = `assets/${anim.id}_${n.id}.png`;
                zip.file(fName, n.data.src.split(',')[1], {base64:true});
                return {...n, data: { ...n.data, src: fName }};
            }
            
            // 2. Handle Paint Data (Drawings)
            if (n.type === 'paint' && n.data.paintData) {
                const fName = `assets/${anim.id}_${n.id}_paint.png`;
                
                // Case A: Base64 (Legacy or loaded from file previously)
                if (n.data.paintData.startsWith('data:')) {
                    zip.file(fName, n.data.paintData.split(',')[1], {base64:true});
                    return {...n, data: { ...n.data, paintData: fName }};
                }
                
                // Case B: Blob URL (Runtime created)
                if (n.data.paintData.startsWith('blob:')) {
                    try {
                        const response = await fetch(n.data.paintData);
                        const blob = await response.blob();
                        zip.file(fName, blob); // JSZip supports adding Blobs directly
                        return {...n, data: { ...n.data, paintData: fName }};
                    } catch (e) {
                        console.error("Failed to bundle paint asset", e);
                        // Fallback: keep original (likely broken in next load if it's a blob url)
                        return n;
                    }
                }
            }

            return n;
        }));
        return { ...anim, nodeGraph: { ...anim.nodeGraph, nodes } };
    }));
    
    const projectData = { 
        version: 8, 
        projectName: state.projectName, 
        animations: metaAnimations,
        uiState: state.uiState,
        // Save Selection State
        activeAnimationId: state.activeAnimationId,
        activeLayerId: state.activeLayerId,
        selectedFrameIndex: state.selectedFrameIndex,
        selectedLayoutElementId: state.selectedLayoutElementId
    };
    
    zip.file("project.json", JSON.stringify(projectData, null, 2));
    return await zip.generateAsync({type: "blob"});
};

export const loadProjectBundle = async (file: File): Promise<{ 
    animations: AnimationEntry[], 
    projectName: string, 
    uiState?: ProjectState['uiState'],
    activeAnimationId?: string,
    activeLayerId?: string | null,
    selectedFrameIndex?: number | null,
    selectedLayoutElementId?: string | null
}> => {
    try {
        const zip = new JSZip();
        let loadedZip;
        try {
            loadedZip = await zip.loadAsync(file);
        } catch(e) {
            throw new Error("Failed to unzip file. It might be corrupted.");
        }

        const metaFile = loadedZip.file("project.json");
        if (!metaFile) throw new Error("Invalid project format: 'project.json' missing.");
        
        let rawMeta: any;
        try {
            rawMeta = JSON.parse(await metaFile.async("string"));
        } catch (e) {
            throw new Error("Project metadata (project.json) is corrupted.");
        }
        
        let validatedMeta;
        try {
            validatedMeta = await projectSchema.validate(rawMeta, { stripUnknown: true, abortEarly: false });
        } catch (validationError: any) {
            // Suppress console.error here as we throw it
            throw new Error(`Project validation failed: ${validationError.message}`);
        }

        const resolve = async (p: string) => {
            if(!p || typeof p !== 'string' || p.startsWith('data:') || p.startsWith('blob:')) return p;
            const f = loadedZip.file(p);
            return f ? `data:image/png;base64,${await f.async("base64")}` : p;
        };

        const animations: AnimationEntry[] = [];
        
        if (validatedMeta.animations) {
            for (const a of validatedMeta.animations) {
                 const nodes: NodeData[] = [];
                 
                 if (a.nodeGraph && a.nodeGraph.nodes) {
                     const processedNodes = await Promise.all(a.nodeGraph.nodes.map(async (n: any) => {
                         // Type safety cast for validation result
                         const node = n as NodeData;
                         
                         // Resolve assets for Source Nodes
                         if (node.type === 'source' && node.data && node.data.src) {
                             const resolvedSrc = await resolve(node.data.src);
                             return { ...node, data: { ...node.data, src: resolvedSrc } };
                         }

                         // Resolve assets for Paint Nodes
                         if (node.type === 'paint' && node.data && node.data.paintData) {
                             const resolvedPaint = await resolve(node.data.paintData);
                             return { ...node, data: { ...node.data, paintData: resolvedPaint } };
                         }

                         return node;
                     }));
                     nodes.push(...processedNodes);
                 }

                 const graph: NodeGraphData = {
                     nodes: nodes,
                     connections: (a.nodeGraph.connections || []) as any[],
                     viewport: a.nodeGraph.viewport || { x:0, y:0, scale:1 }
                 };

                 animations.push({ 
                     id: a.id,
                     name: a.name,
                     nodeGraph: graph,
                     editorTransform: a.editorTransform,
                     layoutCamera: a.layoutCamera || { x: 100, y: 100, scale: 1 },
                     layout: (a as any).layout || { elements: [] }
                 });
            }
        }
        
        return { 
            animations, 
            projectName: validatedMeta.projectName,
            uiState: validatedMeta.uiState,
            activeAnimationId: validatedMeta.activeAnimationId,
            activeLayerId: validatedMeta.activeLayerId,
            selectedFrameIndex: validatedMeta.selectedFrameIndex,
            selectedLayoutElementId: validatedMeta.selectedLayoutElementId
        };
    } catch (err) {
        throw err;
    }
};

export const sliceFrames = async (graph: NodeGraphData | undefined): Promise<string[]> => {
    if (!graph || !graph.nodes) return [];
    
    const allFrames: string[] = [];
    const sourceNodes = graph.nodes.filter(n => n.type === 'source') as SourceNode[];

    for (const source of sourceNodes) {
        if (!source.data.src) continue;

        const q = [source.id];
        const v = new Set();
        let gridNode: GridNode | undefined;

        while(q.length > 0) {
            const curr = q.shift()!;
            if(v.has(curr)) continue;
            v.add(curr);
            const n = graph.nodes.find(no => no.id === curr);
            if(n && n.type === 'grid') { gridNode = n as GridNode; break; }
            const out = graph.connections.filter(c => c.source === curr);
            out.forEach(c => q.push(c.target));
        }

        if (gridNode && gridNode.data) {
            const config = gridNode.data;
            const frames = config.frames || [];
            
            try {
                const img = await loadImage(source.data.src);
                for (const frame of frames) {
                     const c = document.createElement('canvas');
                     c.width = frame.width; c.height = frame.height;
                     const ctx = c.getContext('2d');
                     if (ctx) {
                         ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
                         allFrames.push(c.toDataURL());
                     }
                }
            } catch (e) {
                console.error("Failed to slice frame", e);
            }
        }
    }

    return allFrames;
};
