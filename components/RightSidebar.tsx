
import React, { useMemo, useState, useEffect } from 'react';
import AnimationPreview from './AnimationPreview';
import { MonitorUp, SlidersHorizontal, Pin, PinOff, Power, ChevronDown, ChevronRight, LayoutTemplate } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { NodePreviewData, TimelineNode, NodePayload, NodeData, OutputNode } from '../types';
import { NODE_REGISTRY, RegisteredNodeType, applyNodeUpdates } from './NodeEditor/nodes2';
import LayoutPropertiesPanel from './panels/LayoutPropertiesPanel';

interface RightSidebarProps {
  width: number;
  previewData?: NodePreviewData | null;
  nodeOutputs?: Record<string, NodePayload | null>;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ 
    width, 
    previewData, // Legacy global preview
    nodeOutputs
}) => {
  const { state, dispatch } = useProject();
  const { activeAnimationId, animations, toolMode, selectedLayoutElementId, selectedNodeId } = state;
  const currentAnim = animations.find(a => a.id === activeAnimationId);

  // --- OUTPUT SELECTION LOGIC ---
  const allOutputs = useMemo(() => {
      return (currentAnim?.nodeGraph?.nodes?.filter(n => n.type === 'output') as OutputNode[]) || [];
  }, [currentAnim?.nodeGraph?.nodes]);

  const [localActiveOutputId, setLocalActiveOutputId] = useState<string | null>(null);

  const activeOutputNode = useMemo(() => {
      // 1. If global selection is an output node
      const globalSel = allOutputs.find(n => n.id === selectedNodeId);
      if (globalSel) return globalSel;
      
      // 2. Local state
      const localSel = allOutputs.find(n => n.id === localActiveOutputId);
      if (localSel) return localSel;

      // 3. First available
      return allOutputs[0];
  }, [allOutputs, selectedNodeId, localActiveOutputId]);

  // Sync local state
  useEffect(() => {
      if (activeOutputNode && activeOutputNode.id !== localActiveOutputId) {
          setLocalActiveOutputId(activeOutputNode.id);
      }
  }, [activeOutputNode?.id]);

  // Derive Preview Data for THIS specific output node
  const activePreviewData: NodePreviewData | null = useMemo(() => {
      if (!activeOutputNode || !nodeOutputs) return null;
      const payload = nodeOutputs[activeOutputNode.id];
      if (!payload) return { type: 'empty', data: '' };

      if (payload.type === 'TIMELINE') {
          return { type: 'animation', data: payload.frames };
      } else if (payload.type === 'IMAGE' || payload.type === 'IMAGE_SEQUENCE') {
          return { type: 'static', data: payload.image };
      }
      return { type: 'empty', data: '' };
  }, [activeOutputNode, nodeOutputs]);

  // Find the timeline node that FEEDS into this output (if any) to control playback
  // This is tricky because the OutputNode just receives an Image/Timeline payload.
  // We'll trust the payload's metadata if available, or fallback to the main timeline node logic.
  // Actually, AnimationPreview takes `timelineSettings`. We need to extract them from the payload if possible.
  
  const timelineSettings = useMemo(() => {
      // Default
      let settings = { fps: 12, loop: true, isPlaying: true, currentFrame: 0 };
      
      if (!nodeOutputs || !activeOutputNode) return settings;
      const payload = nodeOutputs[activeOutputNode.id];

      if (payload && payload.type === 'TIMELINE') {
          settings = {
              fps: payload.fps,
              loop: payload.isLoop,
              isPlaying: payload.isPlaying,
              currentFrame: payload.currentFrameIndex
          };
      } else {
          // Fallback to searching for the first timeline node in graph to control global playback
          // if we are viewing a static image derived from a timeline
          const tNode = currentAnim?.nodeGraph?.nodes?.find(n => n.type === 'timeline') as TimelineNode;
          if (tNode) {
              settings = {
                  fps: tNode.data.fps,
                  loop: tNode.data.loop,
                  isPlaying: tNode.data.isPlaying,
                  currentFrame: tNode.data.currentFrame
              };
          }
      }
      return settings;
  }, [nodeOutputs, activeOutputNode, currentAnim]);

  const handleUpdateTimeline = (updates: any) => {
      if (currentAnim) {
          const tNodes = currentAnim.nodeGraph.nodes.filter(n => n.type === 'timeline') as TimelineNode[];
          
          let mappedUpdates = { ...updates };
          if (mappedUpdates.currentFrame !== undefined) {
              const payload = activeOutputNode && nodeOutputs?.[activeOutputNode.id];
              if (payload && payload.type === 'TIMELINE' && payload.unmutedMap) {
                 const actualIndex = payload.unmutedMap[mappedUpdates.currentFrame];
                 if (actualIndex !== undefined) {
                     mappedUpdates.currentFrame = actualIndex;
                 }
              }
          }

          const newNodes = (currentAnim.nodeGraph?.nodes || []).map(n => {
              if (n.type === 'timeline') {
                  return { ...n, data: { ...n.data, ...mappedUpdates } };
              }
              return n;
          });
          
          if (tNodes.length > 0) {
              dispatch({ 
                  type: 'UPDATE_NODE_GRAPH', 
                  payload: { animId: currentAnim.id, graph: { ...currentAnim.nodeGraph, nodes: newNodes } } 
              });
          }
      }
  };

  // --- PINNED NODES LOGIC ---
  const pinnedNodes = currentAnim?.nodeGraph?.nodes?.filter(n => n.pinnedAt !== undefined) || [];
  
  const sortedPinnedNodes = [...pinnedNodes].sort((a, b) => {
      const ta = a.pinnedAt || 0;
      const tb = b.pinnedAt || 0;
      if (ta === tb) return a.y - b.y;
      return ta - tb;
  });

  const handleNodeUpdate = (id: string, updates: Partial<NodeData>) => {
      if (!currentAnim) return;
      const updatedNodes = applyNodeUpdates(currentAnim.nodeGraph.nodes, currentAnim.nodeGraph.connections, id, updates);
      dispatch({
          type: 'UPDATE_NODE_GRAPH',
          payload: { animId: currentAnim.id, graph: { ...currentAnim.nodeGraph, nodes: updatedNodes } }
      });
  };

  const handleUnpin = (id: string) => {
      handleNodeUpdate(id, { pinnedAt: undefined });
  };

  // --- LAYOUT LOGIC ---
  const selectedElement = currentAnim?.layout.elements.find(e => e.id === selectedLayoutElementId);

  const handleAddElement = () => {
      if (!currentAnim) return;
      const newEl = {
          id: `el_${Date.now()}`,
          name: 'New Box',
          type: 'box' as const,
          x: 100, y: 100, width: 100, height: 100,
          visible: true, locked: false, data: {}
      };
      dispatch({ type: 'ADD_LAYOUT_ELEMENT', payload: { animId: currentAnim.id, element: newEl } });
  };

  return (
    <aside className="h-full bg-panel/60 backdrop-blur-2xl border-l border-border-base/10 flex flex-col shrink-0 z-20 shadow-2xl relative" style={{ width }}>
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />

        {toolMode === 'layout' ? (
            <div className="flex-1 flex flex-col min-h-0">
                <div className="px-5 py-3 border-b border-border-base/10 text-[10px] font-bold text-txt-muted uppercase tracking-widest bg-panel/20 backdrop-blur-md shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-2"><LayoutTemplate size={12} /> Layout Properties</div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    <LayoutPropertiesPanel 
                        element={selectedElement}
                        onUpdate={(updates) => currentAnim && selectedLayoutElementId && dispatch({ type: 'UPDATE_LAYOUT_ELEMENT', payload: { animId: currentAnim.id, elementId: selectedLayoutElementId, updates } })}
                        onDelete={() => currentAnim && selectedLayoutElementId && dispatch({ type: 'REMOVE_LAYOUT_ELEMENT', payload: { animId: currentAnim.id, elementId: selectedLayoutElementId } })}
                        onAdd={handleAddElement}
                    />
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* 1. Animation Preview (Always Visible) */}
                <div className="shrink-0 bg-panel/10 p-5 border-b border-border-base/10 relative z-10 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-txt-muted text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            <MonitorUp size={12} className="text-indigo-400"/> Preview
                        </h3>
                        
                        {/* Output Node Selector */}
                        <div className="relative group">
                            <div className="flex items-center gap-1 bg-surface/50 px-2 py-0.5 rounded border border-border-base/10 hover:border-indigo-500/30 cursor-pointer">
                                <select 
                                    value={activeOutputNode?.id || ''}
                                    onChange={(e) => {
                                        setLocalActiveOutputId(e.target.value);
                                        dispatch({ type: 'SELECT_NODE', payload: e.target.value });
                                    }}
                                    className="bg-transparent border-none outline-none text-[9px] font-bold text-txt-primary appearance-none cursor-pointer absolute inset-0 opacity-0 w-full"
                                >
                                    {allOutputs.map(node => (
                                        <option key={node.id} value={node.id} className="bg-panel text-txt-primary">
                                            {node.data.name || 'Output'}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-[9px] font-bold text-txt-secondary truncate max-w-[80px]">
                                    {activeOutputNode?.data.name || 'Output'}
                                </span>
                                <ChevronDown size={8} className="text-txt-muted" />
                            </div>
                        </div>
                    </div>

                    {currentAnim ? (
                        <AnimationPreview 
                            currentAnim={currentAnim}
                            previewData={activePreviewData}
                            timelineSettings={timelineSettings}
                            onUpdateTimeline={handleUpdateTimeline}
                        />
                    ) : <div className="h-40 flex items-center justify-center text-txt-muted text-xs italic bg-surface/20 rounded-2xl border border-border-base/5">No Selection</div>}
                </div>

                {/* 2. Pinned Nodes Stack */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative z-10">
                    <div className="px-5 py-3 border-b border-border-base/10 text-[10px] font-bold text-txt-muted uppercase tracking-widest bg-panel/20 backdrop-blur-md shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2"><SlidersHorizontal size={12} /> Properties</div>
                        <div className="flex items-center gap-1 text-[9px] opacity-50"><Pin size={10} /> {pinnedNodes.length}</div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                        {currentAnim && sortedPinnedNodes.length > 0 ? (
                            sortedPinnedNodes.map(node => {
                                const Bundle = NODE_REGISTRY[node.type as RegisteredNodeType];
                                if (!Bundle) return null;
                                const NodeComponent = Bundle.component as React.ComponentType<any>;
                                
                                const isDisabled = !!node.disabled;
                                const isCollapsed = !!node.collapsed;
                                const canDisable = node.type !== 'source' && node.type !== 'output';

                                const inputs: Record<string, NodePayload> = {};
                                currentAnim.nodeGraph.connections
                                    .filter(c => c.target === node.id)
                                    .forEach(c => {
                                        if (nodeOutputs && nodeOutputs[c.source]) {
                                            inputs[c.targetHandle || 'input'] = nodeOutputs[c.source]!;
                                        }
                                    });

                                return (
                                    <div key={node.id} className={`bg-white/80 dark:bg-gray-900/80 rounded-xl border border-border-base/10 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md animate-in slide-in-from-right-2 fade-in duration-300 ${isDisabled ? 'opacity-70 border-gray-500/30' : ''}`}>
                                        <div className={`flex items-center justify-between px-3 py-2 border-b border-border-base/10 bg-gradient-to-r from-${Bundle.colorClass}-500/10 to-transparent`}>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleNodeUpdate(node.id, { collapsed: !isCollapsed })}
                                                    className="text-txt-secondary hover:text-txt-primary p-0.5 rounded transition-colors"
                                                >
                                                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                                <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-${Bundle.colorClass}-600 dark:text-${Bundle.colorClass}-400`}>
                                                    <Bundle.icon size={12} /> {Bundle.title}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1">
                                                {canDisable && (
                                                    <button 
                                                        onClick={() => handleNodeUpdate(node.id, { disabled: !isDisabled })}
                                                        className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${isDisabled ? 'text-gray-500' : 'text-green-600 dark:text-green-400'}`}
                                                        title={isDisabled ? "Enable Node" : "Disable Node (Bypass)"}
                                                    >
                                                        <Power size={12} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleUnpin(node.id)}
                                                    className="text-txt-muted hover:text-txt-primary hover:bg-black/5 dark:hover:bg-white/10 p-1 rounded transition-colors"
                                                    title="Unpin from Sidebar"
                                                >
                                                    <PinOff size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {!isCollapsed && (
                                            <div className={`h-80 relative ${isDisabled ? 'pointer-events-none grayscale' : ''}`}>
                                                <NodeComponent 
                                                    node={node}
                                                    onUpdate={handleNodeUpdate}
                                                    inputs={inputs}
                                                    input={inputs['input'] || inputs['main'] || Object.values(inputs)[0]}
                                                    output={nodeOutputs ? nodeOutputs[node.id] : undefined}
                                                />
                                                {isDisabled && (
                                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/20 dark:bg-black/20 backdrop-blur-[1px]">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500/80 bg-white/80 dark:bg-black/80 px-2 py-1 rounded border border-border-base/20">Bypassed</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center p-8 text-center opacity-50 space-y-2 border-2 border-dashed border-border-base/10 rounded-2xl">
                                <MonitorUp size={24} className="text-txt-muted" />
                                <div className="text-xs text-txt-muted">
                                    Pin nodes in the <b>Node Graph</b> <br/> to see them here.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </aside>
  );
};

export default RightSidebar;
