
import React, { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';
import { AnimationEntry, KeyingConfig, SpriteConfig, ToolMode, NodeGraphData, ViewportTransform, NodeData, Connection, SourceNode, ChromaNode, GridNode, TimelineNode, OutputNode, Action, ProjectState, ResizeNode, PaintNode, PaintConfig, HistoryState, LayoutElement } from '../types';
import { syncTimelineToGrid } from '../utils/graph';
import { loadBitmap, DEFAULT_SPRITE_CONFIG, generateGridFrames } from '../utils';

// --- Initial State ---

export const DEFAULT_KEYING_CONFIG: KeyingConfig = {
  enabled: false, 
  keyColor: '#00ff00', 
  similarity: 35, 
  smoothness: 10, 
  spill: 60,
  clipBlack: 0,
  clipWhite: 0,
  colorCorrection: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0
  }
};

export const DEFAULT_PAINT_CONFIG: PaintConfig = {
    brushSize: 20,
    brushColor: '#000000', // Default Black
    brushOpacity: 1.0,
    brushHardness: 0.8,
    isEraser: false
};

export const createDefaultGraph = (): NodeGraphData => {
    return {
        nodes: [
            { id: 'timeline', type: 'timeline', x: 1000, y: 150, width: 300, height: 220, data: { frames: [], fps: 12, loop: true, isPlaying: true, currentFrame: 0 }, isDefault: true, pinnedAt: undefined } as TimelineNode,
            { id: 'resize', type: 'resize', x: 1350, y: 150, width: 220, height: 220, data: { width: 0, height: 0, scale: 1, useScale: false }, isDefault: true, pinnedAt: undefined } as ResizeNode,
            { id: 'output', type: 'output', x: 1620, y: 150, width: 220, height: 220, data: { name: 'default' }, isDefault: true, pinnedAt: undefined } as OutputNode
        ],
        connections: [
            { id: 'c_timeline_resize', source: 'timeline', target: 'resize' },
            { id: 'c_resize_output', source: 'resize', target: 'output' }
        ],
        viewport: { x: 0, y: 0, scale: 1 }
    };
};

export const createDefaultAnimation = (id: string): AnimationEntry => ({
  id,
  name: 'Main', 
  nodeGraph: createDefaultGraph(),
  layout: { elements: [] },
  editorTransform: { x: 0, y: 0, scale: 1 },
  layoutCamera: { x: 100, y: 100, scale: 1 }
});

export const initialState: ProjectState = {
  projectName: 'MySpriteProject',
  animations: [createDefaultAnimation('anim_default')],
  activeAnimationId: 'anim_default',
  activeLayerId: null,
  selectedNodeId: null,
  selectedFrameIndex: null,
  selectedTimelineIndex: null,
  selectedLayoutElementId: null,
  toolMode: 'select',
  uiState: { rightSidebarWidth: 320, timelineHeight: 240 }
};

// --- Helper to manage graph nodes ---
const updateNodeInGraph = (graph: NodeGraphData, nodeId: string, dataUpdate: any): NodeGraphData => {
    return {
        ...graph,
        nodes: graph.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...dataUpdate } } : n) as NodeData[]
    };
};

// --- Inner Project Reducer (Pure Data) ---

export const projectReducer = (state: ProjectState, action: Action): ProjectState => {
  switch (action.type) {
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.payload };

    case 'LOAD_PROJECT':
      const { animations, projectName, uiState, activeAnimationId, activeLayerId, selectedFrameIndex, selectedLayoutElementId } = action.payload;
      if (animations.length === 0) return state;
      
      const safeActiveAnimId = activeAnimationId && animations.find(a => a.id === activeAnimationId) 
          ? activeAnimationId 
          : animations[0].id;

      let safeActiveLayerId = activeLayerId;
      if (!safeActiveLayerId) {
          const anim = animations.find(a => a.id === safeActiveAnimId);
          safeActiveLayerId = anim?.nodeGraph.nodes.find(n => n.type === 'source')?.id || null;
      } else {
          const anim = animations.find(a => a.id === safeActiveAnimId);
          if (anim && !anim.nodeGraph.nodes.find(n => n.id === safeActiveLayerId)) {
              safeActiveLayerId = anim.nodeGraph.nodes.find(n => n.type === 'source')?.id || null;
          }
      }

      return {
        ...state,
        projectName: projectName,
        animations,
        activeAnimationId: safeActiveAnimId,
        activeLayerId: safeActiveLayerId,
        selectedNodeId: null,
        selectedFrameIndex: selectedFrameIndex || null,
        selectedTimelineIndex: null,
        selectedLayoutElementId: selectedLayoutElementId || null,
        uiState: uiState || { rightSidebarWidth: 320, timelineHeight: 240 }
      };

    case 'NEW_PROJECT': {
      const newAnimId = `anim_${Date.now()}`;
      return { 
          projectName: 'New Project',
          animations: [createDefaultAnimation(newAnimId)], 
          activeAnimationId: newAnimId,
          activeLayerId: null,
          selectedNodeId: null,
          selectedFrameIndex: null,
          selectedTimelineIndex: null,
          selectedLayoutElementId: null,
          toolMode: 'select',
          uiState: { rightSidebarWidth: 320, timelineHeight: 240 }
      };
    }

    case 'ADD_ANIMATION':
      return {
        ...state,
        animations: [...state.animations, action.payload],
        activeAnimationId: action.payload.id,
        activeLayerId: null,
        selectedNodeId: null,
        selectedFrameIndex: null
      };

    case 'REMOVE_ANIMATION': {
      if (state.animations.length <= 1) return state;
      const newAnims = state.animations.filter(a => a.id !== action.payload);
      const nextAnimId = state.activeAnimationId === action.payload ? newAnims[0].id : state.activeAnimationId;
      return {
        ...state,
        animations: newAnims,
        activeAnimationId: nextAnimId,
        activeLayerId: null,
        selectedNodeId: null
      };
    }

    case 'SELECT_ANIMATION': {
      const anim = state.animations.find(a => a.id === action.payload);
      const firstSource = anim?.nodeGraph.nodes.find(n => n.type === 'source');
      return {
        ...state,
        activeAnimationId: action.payload,
        activeLayerId: firstSource ? firstSource.id : null,
        selectedNodeId: null,
        selectedFrameIndex: null,
        selectedTimelineIndex: null,
        selectedLayoutElementId: null
      };
    }

    case 'UPDATE_ANIMATION':
      return {
        ...state,
        animations: state.animations.map(a => a.id === action.payload.id ? { ...a, ...action.payload.updates } : a)
      };

    case 'ADD_LAYER': {
      const { animId, layer } = action.payload;
      const ts = Date.now();
      const sourceId = `src_${ts}`;
      const paintId = `paint_${ts}`;
      const vectorId = `vector_${ts}`;
      const chromaId = `chroma_${ts}`;
      const gridId = `grid_${ts}`;
      
      const targetAnim = state.animations.find(a => a.id === animId);
      if (!targetAnim) return state;

      const graph = targetAnim.nodeGraph || createDefaultGraph();
      const existingSources = graph.nodes.filter(n => n.type === 'source');
      const count = existingSources.length;
      
      const safeW = layer.width > 0 ? layer.width : 100;
      const safeH = layer.height > 0 ? layer.height : 100;
      const aspectRatio = safeW / safeH;
      const nodeW = 250;
      const nodeH = nodeW / aspectRatio;

      const newSourceNode: SourceNode = {
          id: sourceId, type: 'source', isDefault: true,
          x: 50, y: 50 + count * 450, width: nodeW, height: nodeH,
          data: {
              src: layer.imageSrc, name: layer.name,
              width: layer.width, height: layer.height,
              opacity: 1, visible: true, 
              x: layer.x ?? 0, 
              y: layer.y ?? 0
          },
          pinnedAt: undefined
      };

      const newPaintNode: PaintNode = {
          id: paintId, type: 'paint', isDefault: true,
          x: 350, y: newSourceNode.y, width: 200, height: 280,
          data: DEFAULT_PAINT_CONFIG,
          pinnedAt: undefined
      };

      const newVectorNode = {
          id: vectorId, type: 'vector', isDefault: true,
          x: 580, y: newSourceNode.y, width: 220, height: 280,
          data: { paths: [] },
          pinnedAt: undefined
      };

      const newChromaNode: ChromaNode = {
          id: chromaId, type: 'chroma', isDefault: true,
          x: 830, y: newSourceNode.y, width: 280, height: 420,
          data: DEFAULT_KEYING_CONFIG,
          pinnedAt: Date.now() 
      };

      const newGridNode: GridNode = {
          id: gridId, type: 'grid', isDefault: true,
          x: 1140, y: newSourceNode.y, width: 240, height: 280,
          data: layer.spriteConfig,
          pinnedAt: Date.now() + 1 
      };

      let timelineNode = graph.nodes.find(n => n.type === 'timeline') as TimelineNode;
      let outputNode = graph.nodes.find(n => n.type === 'output') as OutputNode;
      let resizeNode = graph.nodes.find(n => n.type === 'resize') as ResizeNode;
      
      const newNodes = [...(graph.nodes || [])] as NodeData[];
      
      if (!timelineNode) {
          timelineNode = { id: 'timeline', type: 'timeline', x: 1000, y: 150, width: 300, height: 220, data: { frames: [], fps: 12, loop: true, isPlaying: true, currentFrame: 0 }, isDefault: true };
          newNodes.push(timelineNode);
      }
      if (!outputNode) {
          outputNode = { id: 'output', type: 'output', x: 1620, y: 150, width: 220, height: 220, data: { name: 'default' }, isDefault: true };
          newNodes.push(outputNode);
      }
      if (!resizeNode) {
          resizeNode = { id: 'resize', type: 'resize', x: 1350, y: 150, width: 220, height: 220, data: { width: 0, height: 0, scale: 1, useScale: false }, isDefault: true };
          newNodes.push(resizeNode);
      }

      const newConns = [...(graph.connections || [])];
      
      if (!newConns.find(c => c.source === timelineNode.id && c.target === resizeNode.id)) {
          newConns.push({ id: 'c_timeline_resize', source: timelineNode.id, target: resizeNode.id });
      }
      if (!newConns.find(c => c.source === resizeNode.id && c.target === outputNode.id)) {
          newConns.push({ id: 'c_resize_output', source: resizeNode.id, target: outputNode.id });
      }

      newConns.push({ id: `c_${sourceId}_${paintId}`, source: sourceId, target: paintId });
      newConns.push({ id: `c_${paintId}_${vectorId}`, source: paintId, target: vectorId });
      newConns.push({ id: `c_${vectorId}_${chromaId}`, source: vectorId, target: chromaId });
      newConns.push({ id: `c_${chromaId}_${gridId}`, source: chromaId, target: gridId });
      newConns.push({ id: `c_${gridId}_${timelineNode.id}`, source: gridId, target: timelineNode.id });

      const currentGrids = newNodes.filter(n => n.type === 'grid') as GridNode[];
      let totalExistingFrames = 0;
      currentGrids.forEach(s => { totalExistingFrames += s.data.totalFrames; });
      
      const newFrameIndices: number[] = [];
      for(let i=0; i < layer.spriteConfig.totalFrames; i++) {
          newFrameIndices.push(totalExistingFrames + i);
      }

      const updatedNodes = [...newNodes, newSourceNode, newPaintNode, newVectorNode, newChromaNode, newGridNode].map(n => {
          if (n.id === timelineNode.id && n.type === 'timeline') {
              return { ...n, data: { ...n.data, frames: [...n.data.frames, ...newFrameIndices] } };
          }
          return n;
      }) as NodeData[];

      const newGraph = {
          ...graph,
          nodes: updatedNodes,
          connections: newConns
      };

      return {
          ...state,
          animations: state.animations.map(a => a.id === animId ? { ...a, nodeGraph: newGraph } : a),
          activeLayerId: sourceId,
          selectedNodeId: sourceId
      };
    }

    case 'REMOVE_LAYER':
      return {
        ...state,
        animations: state.animations.map(a => {
          if (a.id !== action.payload.animId) return a;
          
          let graph = a.nodeGraph;
          const layerId = action.payload.layerId; 
          
          const nodesToRemove = new Set<string>();
          nodesToRemove.add(layerId);
          
          const q = [layerId];
          while(q.length > 0) {
              const curr = q.shift()!;
              const outgoing = graph.connections.filter(c => c.source === curr);
              outgoing.forEach(c => {
                  const targetNode = graph.nodes.find(n => n.id === c.target);
                  if (targetNode && targetNode.type !== 'timeline' && targetNode.type !== 'output' && targetNode.type !== 'resize') {
                      nodesToRemove.add(c.target);
                      q.push(c.target);
                  }
              });
          }
          
          const cleanedNodes = graph.nodes.filter(n => !nodesToRemove.has(n.id));
          const cleanedConnections = graph.connections.filter(c => !nodesToRemove.has(c.source) && !nodesToRemove.has(c.target));
          
          // Removal always triggers a full sync to cleanup dead frames
          const finalNodes = syncTimelineToGrid(cleanedNodes, cleanedConnections);

          const cleanedGraph = {
              ...graph,
              nodes: finalNodes,
              connections: cleanedConnections
          };

          return {
              ...a,
              nodeGraph: cleanedGraph
          };
        }),
        activeLayerId: state.activeLayerId === action.payload.layerId ? null : state.activeLayerId,
        selectedNodeId: state.selectedNodeId === action.payload.layerId ? null : state.selectedNodeId
      };

    case 'UPDATE_LAYER':
      return {
        ...state,
        animations: state.animations.map(a => {
          if (a.id !== action.payload.animId) return a;
          
          let graph = a.nodeGraph;
          const { updates, layerId, resetTimeline } = action.payload;

          if (updates.name || updates.src || updates.x || updates.opacity) {
             const dataUpdates: any = {};
             if(updates.name) dataUpdates.name = updates.name;
             if(updates.src) dataUpdates.src = updates.src;
             if(updates.x !== undefined) dataUpdates.x = updates.x;
             if(updates.y !== undefined) dataUpdates.y = updates.y;
             if(updates.opacity !== undefined) dataUpdates.opacity = updates.opacity;
             
             graph = updateNodeInGraph(graph, layerId, dataUpdates);
          }

          const findDownstreamNode = (startId: string, targetType: string): string | undefined => {
              const q = [startId];
              const visited = new Set<string>();
              while(q.length > 0) {
                  const curr = q.shift()!;
                  if(visited.has(curr)) continue;
                  visited.add(curr);
                  
                  const n = graph.nodes.find(no => no.id === curr);
                  if (n && n.type === targetType) return n.id;
                  
                  const outgoing = graph.connections.filter(c => c.source === curr);
                  outgoing.forEach(c => q.push(c.target));
              }
              return undefined;
          };

          if (updates.bgConfig) {
              const chromaId = findDownstreamNode(layerId, 'chroma');
              if (chromaId) {
                  graph = updateNodeInGraph(graph, chromaId, updates.bgConfig);
              }
          }

          if (updates.spriteConfig) {
             const gridId = findDownstreamNode(layerId, 'grid');

             if (gridId) {
                 // --- STRICT SYNC TRIGGER LOGIC ---
                 // Only sync timeline if rows or cols specifically changed.
                 // This prevents frame coordinate changes (drag/drop) from resetting the timeline.
                 
                 const oldNode = graph.nodes.find(n => n.id === gridId) as GridNode;
                 const oldRows = oldNode?.data.rows;
                 const oldCols = oldNode?.data.cols;
                 
                 graph = updateNodeInGraph(graph, gridId, updates.spriteConfig);
                 
                 const newRows = updates.spriteConfig.rows;
                 const newCols = updates.spriteConfig.cols;
                 
                 const isStructuralChange = (newRows !== undefined && newRows !== oldRows) || 
                                            (newCols !== undefined && newCols !== oldCols);

                 if (isStructuralChange || resetTimeline) {
                     graph.nodes = syncTimelineToGrid(graph.nodes, graph.connections, true);
                 }
             }
          }
          
          return { ...a, nodeGraph: graph };
        })
      };

    case 'SELECT_LAYER':
      return { ...state, activeLayerId: action.payload, selectedNodeId: action.payload };

    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.payload };

    case 'SELECT_FRAME':
      return { ...state, selectedFrameIndex: action.payload };

    case 'SELECT_TIMELINE_FRAME':
        return { ...state, selectedTimelineIndex: action.payload };

    case 'SET_TOOL_MODE':
      return { ...state, toolMode: action.payload };

    case 'UPDATE_NODE_GRAPH':
      return {
          ...state,
          animations: state.animations.map(a => a.id === action.payload.animId ? { ...a, nodeGraph: action.payload.graph } : a)
      };

    case 'UPDATE_NODE_DATA': {
        const { animId, nodeId, data } = action.payload;
        return {
            ...state,
            animations: state.animations.map(a => {
                if (a.id !== animId) return a;
                return {
                    ...a,
                    nodeGraph: {
                        ...a.nodeGraph,
                        nodes: a.nodeGraph.nodes.map(n => 
                            n.id === nodeId 
                            ? { ...n, data: { ...n.data, ...data } } 
                            : n
                        )
                    }
                };
            })
        };
    }

    case 'UPDATE_EDITOR_TRANSFORM':
      return {
          ...state,
          animations: state.animations.map(a => a.id === action.payload.animId ? { ...a, editorTransform: action.payload.transform } : a)
      };

    case 'UPDATE_LAYOUT_CAMERA':
      return {
          ...state,
          animations: state.animations.map(a => a.id === action.payload.animId ? { ...a, layoutCamera: action.payload.transform } : a)
      };

    case 'SET_UI_PANEL_SIZE':
        return { ...state, uiState: { ...state.uiState, ...action.payload } };

    // --- Layout Actions ---
    case 'ADD_LAYOUT_ELEMENT':
        return {
            ...state,
            animations: state.animations.map(a => 
                a.id === action.payload.animId 
                ? { ...a, layout: { ...a.layout, elements: [...a.layout.elements, action.payload.element] } } 
                : a
            ),
            selectedLayoutElementId: action.payload.element.id
        };

    case 'UPDATE_LAYOUT_ELEMENT':
        return {
            ...state,
            animations: state.animations.map(a => 
                a.id === action.payload.animId 
                ? { 
                    ...a, 
                    layout: { 
                        ...a.layout, 
                        elements: a.layout.elements.map(e => e.id === action.payload.elementId ? { ...e, ...action.payload.updates } : e) 
                    } 
                  } 
                : a
            )
        };

    case 'REMOVE_LAYOUT_ELEMENT':
        return {
            ...state,
            animations: state.animations.map(a => 
                a.id === action.payload.animId 
                ? { ...a, layout: { ...a.layout, elements: a.layout.elements.filter(e => e.id !== action.payload.elementId) } } 
                : a
            ),
            selectedLayoutElementId: null
        };

    case 'SELECT_LAYOUT_ELEMENT':
        return { ...state, selectedLayoutElementId: action.payload };

    case 'EXTRACT_REGION': {
        // This is a complex action. We'll handle the UI part in a hook,
        // and the state update (adding new layer and potentially clearing old one) here.
        // For simplicity, we assume the UI provides a ready-to-use extracted dataURL.
        // Actually, the reducer should ideally handle pure state. 
        // But since we need to mutate existing layer's PaintNode if it's a CUT,
        // we'll expect the payload to contain the updatedPaintData if available.
        return state; // Placeholder: handled via existing ADD_LAYER + UPDATE_LAYER logic usually
    }

    default:
      return state;
  }
};

// --- History Reducer (Higher Order) ---

const MAX_HISTORY = 50;

const UNDOABLE_ACTIONS = new Set([
    'SET_PROJECT_NAME',
    'ADD_ANIMATION',
    'REMOVE_ANIMATION',
    'UPDATE_ANIMATION',
    'ADD_LAYER',
    'REMOVE_LAYER',
    'UPDATE_LAYER',
    'UPDATE_NODE_GRAPH',
    'UPDATE_NODE_DATA',
    'ADD_LAYOUT_ELEMENT',
    'REMOVE_LAYOUT_ELEMENT',
    'UPDATE_LAYOUT_ELEMENT'
]);

const historyReducer = (state: HistoryState<ProjectState>, action: Action): HistoryState<ProjectState> => {
    switch(action.type) {
        case 'UNDO': {
            if (state.past.length === 0) return state;
            const previous = state.past[state.past.length - 1];
            const newPast = state.past.slice(0, state.past.length - 1);
            return {
                past: newPast,
                present: previous,
                future: [state.present, ...state.future]
            };
        }
        case 'REDO': {
            if (state.future.length === 0) return state;
            const next = state.future[0];
            const newFuture = state.future.slice(1);
            return {
                past: [...state.past, state.present],
                present: next,
                future: newFuture
            };
        }
        case 'NEW_PROJECT': {
            const freshState = projectReducer(state.present, action);
            return {
                past: [],
                present: freshState,
                future: []
            };
        }
        case 'LOAD_PROJECT': {
            const loadedState = projectReducer(state.present, action);
            return {
                past: [],
                present: loadedState,
                future: []
            };
        }
        default: {
            const newPresent = projectReducer(state.present, action);
            if (newPresent === state.present) return state;
            if (UNDOABLE_ACTIONS.has(action.type)) {
                return {
                    past: [...state.past, state.present].slice(-MAX_HISTORY),
                    present: newPresent,
                    future: [] 
                };
            }
            return { ...state, present: newPresent };
        }
    }
};

// --- Context ---

interface ProjectContextValue {
    state: ProjectState;
    dispatch: Dispatch<Action>;
    history: {
        canUndo: boolean;
        canRedo: boolean;
        undo: () => void;
        redo: () => void;
    };
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [historyState, dispatch] = useReducer(historyReducer, {
      past: [],
      present: initialState,
      future: []
  });

  const value: ProjectContextValue = {
      state: historyState.present,
      dispatch,
      history: {
          canUndo: historyState.past.length > 0,
          canRedo: historyState.future.length > 0,
          undo: () => dispatch({ type: 'UNDO' }),
          redo: () => dispatch({ type: 'REDO' })
      }
  };

  return (
    <ProjectContext.Provider value={value}>
        {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
