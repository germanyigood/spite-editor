
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { getGraphLayers, getGraphTimeline, findModifierByType, findLastModifier, loadBitmap, DEFAULT_SPRITE_CONFIG, generateGridFrames } from '../utils';
import { NodePayload, PaintNode, PaintConfig, ViewportTransform, WarpNode, SourceNode } from '../types';

import { LayerRenderer } from './sprite-editor/LayerRenderer';
import { FrameOverlay } from './sprite-editor/FrameOverlay';
import { useSpriteInteraction } from './sprite-editor/useSpriteInteraction';
import { SelectionOverlay } from './sprite-editor/SelectionOverlay';
import { InfiniteCanvas } from './common/InfiniteCanvas';

// Icons
import { Brush, Eraser, BoxSelect, PaintBucket, Square, Circle, PenTool, MousePointer2, Plus, Minus, CornerUpRight } from 'lucide-react';
import { ColorPicker, Slider } from './common/DesignSystem';

interface SpriteEditorProps {
    nodeOutputs?: Record<string, NodePayload | null>;
    style?: React.CSSProperties;
    className?: string;
}

const SpriteEditor: React.FC<SpriteEditorProps> = ({ nodeOutputs = {}, style, className }) => {
  const { state, dispatch } = useProject();
  const { animations, activeAnimationId, activeLayerId, toolMode } = state;
  const entry = animations.find(a => a.id === activeAnimationId);

  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  const paintNode = useMemo(() => {
      if (!entry || !activeLayerId) return undefined;
      return findModifierByType(entry.nodeGraph, activeLayerId, 'paint') as PaintNode | undefined;
  }, [entry?.nodeGraph, activeLayerId]);

  const vectorNode = useMemo(() => {
    if (!entry || !activeLayerId) return undefined;
    return findModifierByType(entry.nodeGraph, activeLayerId, 'vector') as any | undefined;
  }, [entry?.nodeGraph, activeLayerId]);

  const warpNode = useMemo(() => {
      if (!entry || !activeLayerId) return undefined;
      return findModifierByType(entry.nodeGraph, activeLayerId, 'warp') as WarpNode | undefined;
  }, [entry?.nodeGraph, activeLayerId]);

  const [drawTool, setDrawTool] = useState<'brush' | 'eraser' | 'select' | 'bucket' | 'rect' | 'ellipse' | 'path' | 'path-select' | 'path-add' | 'path-delete' | 'path-convert'>('brush');
  const [selectionRect, setSelectionRect] = useState<{x:number, y:number, w:number, h:number} | null>(null);

  const [brushSettings, setBrushSettings] = useState<PaintConfig>({
      brushSize: 20, brushColor: '#000000', brushOpacity: 1.0, brushHardness: 0.8, isEraser: false, drawTool: 'brush'
  });

  // Синхронизация локального состояния инструмента с данными ноды
  useEffect(() => {
      if(paintNode) {
          setBrushSettings(prev => ({ ...prev, ...paintNode.data }));
          if (paintNode.data.drawTool && paintNode.data.drawTool !== drawTool) {
              setDrawTool(paintNode.data.drawTool);
          } else if (paintNode.data.isEraser && drawTool !== 'eraser') {
              setDrawTool('eraser');
          }
      }
  }, [paintNode?.id, paintNode?.data.isEraser, paintNode?.data.drawTool]);

  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);
  const [isHoveringEditor, setIsHoveringEditor] = useState(false);

  useEffect(() => {
      if (entry?.editorTransform) setTransform(entry.editorTransform);
  }, [entry?.editorTransform, entry?.id]);

  if (!entry) return null;

  const layers = getGraphLayers(entry.nodeGraph);
  const activeTimelineFrames = getGraphTimeline(entry.nodeGraph);
  const activePair = layers.find(p => p.source.id === activeLayerId);
  const activeSource = activePair?.source;
  const activeConfig = activePair?.slice?.data;

  const { handleMouseDown, handleSelectionMouseDown, handleFrameMouseDown, handleWarpPinMouseDown, isPanning, visualFrame, visualLayerPos, visualPins } = useSpriteInteraction(
      containerRef, transform, setTransform, entry, activeLayerId, activeSource, activeConfig, layers, warpNode, selectionRect,
      toolMode === 'draw' && drawTool === 'select' ? setSelectionRect : undefined
  );

  const handleTransformChange = (newTransform: ViewportTransform) => {
      setTransform(newTransform);
      dispatch({ type: 'UPDATE_EDITOR_TRANSFORM', payload: { animId: entry.id, transform: newTransform } });
  };

  const updatePaintNode = (updates: Partial<PaintConfig>) => {
      if (!paintNode) return;
      const newData = { ...brushSettings, ...updates };
      setBrushSettings(newData);
      dispatch({ type: 'UPDATE_NODE_DATA', payload: { animId: entry.id, nodeId: paintNode.id, data: updates } });
  };

  const setLocalDrawTool = (tool: 'brush' | 'eraser' | 'select' | 'bucket' | 'rect' | 'ellipse' | 'path' | 'path-select' | 'path-add' | 'path-delete' | 'path-convert') => {
      setDrawTool(tool);
      if (tool !== 'select') {
          updatePaintNode({ isEraser: tool === 'eraser', drawTool: tool as any });
      }

      if (tool === 'path' && !vectorNode && paintNode && activeLayerId && entry) {
          const ts = Date.now();
          const vectorId = `vector_${ts}`;
          const newVectorNode = {
              id: vectorId, type: 'vector', isDefault: true,
              x: paintNode.x + 220, y: paintNode.y, width: 220, height: 280,
              data: { paths: [] }
          };
          
          let newGraph = { ...entry.nodeGraph };
          newGraph.nodes = [...newGraph.nodes, newVectorNode as any];
          
          const outConnIndex = newGraph.connections.findIndex(c => c.source === paintNode.id);
          if (outConnIndex !== -1) {
              const oldTarget = newGraph.connections[outConnIndex].target;
              newGraph.connections = [...newGraph.connections];
              newGraph.connections[outConnIndex] = { ...newGraph.connections[outConnIndex], target: vectorId };
              newGraph.connections.push({ id: `c_${vectorId}_${oldTarget}`, source: vectorId, target: oldTarget });
          }
          
          dispatch({ type: 'UPDATE_NODE_GRAPH', payload: { animId: entry.id, graph: newGraph }});
      }
  };

  const performExtraction = useCallback(async (isCut: boolean) => {
      if (!selectionRect || !activeSource || !entry || !paintNode) return;
      
      const payload = nodeOutputs[paintNode.id] || nodeOutputs[activeSource.id];
      if (!payload || payload.type !== 'IMAGE') return;

      try {
          const bmp = await loadBitmap(payload.image || payload.src!);
          const layerX = activeSource.data.x || 0;
          const layerY = activeSource.data.y || 0;
          const relX = selectionRect.x - layerX;
          const relY = selectionRect.y - layerY;

          const safeX = Math.max(0, Math.min(relX, bmp.width));
          const safeY = Math.max(0, Math.min(relY, bmp.height));
          const safeW = Math.min(selectionRect.w, bmp.width - safeX);
          const safeH = Math.min(selectionRect.h, bmp.height - safeY);

          if (safeW < 2 || safeH < 2) return;

          const fragmentCanvas = document.createElement('canvas');
          fragmentCanvas.width = safeW;
          fragmentCanvas.height = safeH;
          const fCtx = fragmentCanvas.getContext('2d')!;
          fCtx.drawImage(bmp, safeX, safeY, safeW, safeH, 0, 0, safeW, safeH);
          const extractedDataUrl = fragmentCanvas.toDataURL();

          dispatch({
              type: 'ADD_LAYER',
              payload: {
                  animId: entry.id,
                  layer: {
                      name: `${activeSource.data.name}_extracted`,
                      imageSrc: extractedDataUrl,
                      width: safeW, height: safeH,
                      x: selectionRect.x, y: selectionRect.y,
                      spriteConfig: { ...DEFAULT_SPRITE_CONFIG, width: safeW, height: safeH, frames: generateGridFrames(1, 1, safeW, safeH, 0, 0, 0) }
                  }
              }
          });

          if (isCut) {
              const pCanvas = document.createElement('canvas');
              pCanvas.width = activeSource.data.width;
              pCanvas.height = activeSource.data.height;
              const pCtx = pCanvas.getContext('2d')!;
              
              if (paintNode.data.paintData) {
                  const baseBmp = await loadBitmap(paintNode.data.paintData);
                  pCtx.drawImage(baseBmp, 0, 0);
              } else {
                  // Find the input to Paint node to cut from instead of the raw original source
                  const paintInputNodeId = (() => {
                      const conn = entry.nodeGraph.connections.find(c => c.target === paintNode.id);
                      return conn ? conn.source : activeSource.id;
                  })();
                  const paintInputPayload = nodeOutputs[paintInputNodeId] || nodeOutputs[activeSource.id];
                  
                  if (paintInputPayload && paintInputPayload.type === 'IMAGE') {
                      if (paintInputPayload.image instanceof ImageBitmap || paintInputPayload.image instanceof HTMLImageElement || paintInputPayload.image instanceof HTMLCanvasElement) {
                          pCtx.drawImage(paintInputPayload.image, 0, 0);
                      } else if (paintInputPayload.src) {
                          const baseBmp = await loadBitmap(paintInputPayload.src);
                          pCtx.drawImage(baseBmp, 0, 0);
                      }
                  } else if (activeSource.data.src) {
                      const baseBmp = await loadBitmap(activeSource.data.src);
                      pCtx.drawImage(baseBmp, 0, 0);
                  }
              }
              
              pCtx.clearRect(safeX, safeY, safeW, safeH);
              
              pCanvas.toBlob((blob) => {
                  if (blob) {
                      const url = URL.createObjectURL(blob);
                      dispatch({
                          type: 'UPDATE_NODE_DATA',
                          payload: { animId: entry.id, nodeId: paintNode.id, data: { paintData: url } }
                      });
                  }
              }, 'image/png');
          }

          setSelectionRect(null);
      } catch (e) {
          console.error("Extraction failed", e);
      }
  }, [selectionRect, activeSource, entry, nodeOutputs, paintNode, dispatch]);

  const cursorStyle = isPanning ? 'cursor-grabbing' : (toolMode === 'draw' && (drawTool === 'brush' || drawTool === 'eraser' || drawTool === 'bucket' || drawTool === 'rect' || drawTool === 'ellipse' || (drawTool && drawTool.startsWith('path'))) ? 'cursor-none' : 'cursor-default');

  return (
    <div className={`w-full h-full relative ${className || ''}`} style={style}>
        <InfiniteCanvas
            ref={containerRef}
            className={cursorStyle}
            transform={transform}
            onChange={handleTransformChange}
            onMouseDown={handleMouseDown}
            onMouseMove={(e) => {
                const rect = containerRef.current?.getBoundingClientRect();
                if(rect) setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}
            onMouseEnter={() => setIsHoveringEditor(true)}
            onMouseLeave={() => setIsHoveringEditor(false)}
        >
            {layers.map(({source}) => {
                const isDraggingThis = visualLayerPos && visualLayerPos.id === source.id;
                const override = isDraggingThis ? visualLayerPos : undefined;
                const isActive = activeLayerId === source.id;

                return (
                    <LayerRenderer 
                        key={source.id}
                        layer={source} 
                        graph={entry.nodeGraph} 
                        isSelected={isActive}
                        toolMode={toolMode}
                        drawTool={drawTool}
                        nodeOutputs={nodeOutputs}
                        overridePos={override}
                        scale={transform.scale}
                    />
                );
            })}

            {toolMode === 'draw' && selectionRect && (
                <SelectionOverlay 
                    rect={selectionRect} scale={transform.scale}
                    onCopy={() => performExtraction(false)} 
                    onCut={() => performExtraction(true)} 
                    onClear={() => setSelectionRect(null)}
                    onMouseDown={handleSelectionMouseDown}
                />
            )}

            {activeSource && activeConfig && activeConfig.frames && toolMode === 'select' && (
                <FrameOverlay 
                    activeSource={activeSource} activeConfig={activeConfig}
                    selectedFrameIndex={state.selectedFrameIndex} toolMode={toolMode}
                    visualFrame={visualFrame} visualLayerPos={visualLayerPos}
                    entry={entry} layers={layers} timelineCounts={{}}
                    onFrameMouseDown={handleFrameMouseDown}
                />
            )}
        </InfiniteCanvas>

        {toolMode === 'draw' && isHoveringEditor && (drawTool === 'brush' || drawTool === 'eraser') && cursorPos && (
            <div 
                className={`absolute pointer-events-none z-[1000] border rounded-full mix-blend-difference ${drawTool === 'eraser' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-white/50'}`}
                style={{ 
                    left: cursorPos.x, top: cursorPos.y, 
                    width: (brushSettings.brushSize || 20) * transform.scale, 
                    height: (brushSettings.brushSize || 20) * transform.scale, 
                    transform: 'translate(-50%, -50%)' 
                }}
            />
        )}
        
        {toolMode === 'draw' && isHoveringEditor && (drawTool === 'bucket' || drawTool === 'rect' || drawTool === 'ellipse' || (drawTool && drawTool.startsWith('path'))) && cursorPos && (
            <div 
                className={`absolute pointer-events-none z-[1000]`}
                style={{ 
                    left: cursorPos.x, top: cursorPos.y, 
                    transform: 'translate(4px, 4px)' 
                }}
            >
                {drawTool === 'bucket' && <PaintBucket size={16} className="text-white drop-shadow-md" />}
                {drawTool === 'rect' && <Square size={16} className="text-white drop-shadow-md" />}
                {drawTool === 'ellipse' && <Circle size={16} className="text-white drop-shadow-md" />}
                {drawTool && drawTool.startsWith('path') && <PenTool size={16} className="text-white drop-shadow-md" />}
            </div>
        )}

        {toolMode === 'draw' && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-panel/90 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-[100] animate-in slide-in-from-bottom-5">
                <div className="flex bg-surface/50 p-1 rounded-xl gap-1">
                    <button data-testid="draw-tool-brush" onClick={() => setLocalDrawTool('brush')} className={`p-2 rounded-lg transition-all ${drawTool === 'brush' ? 'bg-pink-600 text-white shadow-lg' : 'text-txt-secondary hover:text-white'}`} title="Brush Tool (B)"><Brush size={18} /></button>
                    <button data-testid="draw-tool-eraser" onClick={() => setLocalDrawTool('eraser')} className={`p-2 rounded-lg transition-all ${drawTool === 'eraser' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-txt-secondary hover:text-white'}`} title="Eraser Tool (E)"><Eraser size={18} /></button>
                    <button data-testid="draw-tool-bucket" onClick={() => setLocalDrawTool('bucket')} className={`p-2 rounded-lg transition-all ${drawTool === 'bucket' ? 'bg-pink-600 text-white shadow-lg' : 'text-txt-secondary hover:text-white'}`} title="Paint Bucket (G)"><PaintBucket size={18} /></button>
                    <button data-testid="draw-tool-rect" onClick={() => setLocalDrawTool('rect')} className={`p-2 rounded-lg transition-all ${drawTool === 'rect' ? 'bg-pink-600 text-white shadow-lg' : 'text-txt-secondary hover:text-white'}`} title="Rectangle Tool (U)"><Square size={18} /></button>
                    <button data-testid="draw-tool-ellipse" onClick={() => setLocalDrawTool('ellipse')} className={`p-2 rounded-lg transition-all ${drawTool === 'ellipse' ? 'bg-pink-600 text-white shadow-lg' : 'text-txt-secondary hover:text-white'}`} title="Ellipse Tool (O)"><Circle size={18} /></button>
                    <button data-testid="draw-tool-path" onClick={() => setLocalDrawTool('path')} className={`p-2 rounded-lg transition-all ${drawTool.startsWith('path') && drawTool !== 'path-select' ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-txt-secondary hover:text-white'}`} title="Path Tool (P)"><PenTool size={18} /></button>
                    <button data-testid="draw-tool-select" onClick={() => setLocalDrawTool('select')} className={`p-2 rounded-lg transition-all ${drawTool === 'select' ? 'bg-indigo-600 text-white shadow-lg' : 'text-txt-secondary hover:text-white'}`} title="Selection Tool (S)"><BoxSelect size={18} /></button>
                </div>
                
                {drawTool.startsWith('path') && (
                    <>
                        <div className="w-px h-6 bg-white/10 mx-2" />
                        <div className="flex items-center gap-1">
                            <button data-testid="path-tool-draw" onClick={() => setLocalDrawTool('path')} className={`p-2 rounded-lg transition-all ${drawTool === 'path' ? 'bg-fuchsia-800 text-white shadow-lg' : 'text-txt-secondary hover:text-white'}`} title="Pen Tool"><PenTool size={14} /></button>
                            <button data-testid="path-tool-add" onClick={() => setLocalDrawTool('path-add')} className={`p-2 rounded-lg transition-all ${drawTool === 'path-add' ? 'bg-fuchsia-800 text-white shadow-lg' : 'text-txt-secondary hover:text-white'}`} title="Add Anchor Point"><Plus size={14} /></button>
                            <button data-testid="path-tool-delete" onClick={() => setLocalDrawTool('path-delete')} className={`p-2 rounded-lg transition-all ${drawTool === 'path-delete' ? 'bg-fuchsia-800 text-white shadow-lg' : 'text-txt-secondary hover:text-white'}`} title="Delete Anchor Point"><Minus size={14} /></button>
                            <button data-testid="path-tool-convert" onClick={() => setLocalDrawTool('path-convert')} className={`p-2 rounded-lg transition-all ${drawTool === 'path-convert' ? 'bg-fuchsia-800 text-white shadow-lg' : 'text-txt-secondary hover:text-white'}`} title="Convert Point"><CornerUpRight size={14} /></button>
                            <button data-testid="path-tool-select" onClick={() => setLocalDrawTool('path-select')} className={`p-2 rounded-lg transition-all ${drawTool === 'path-select' ? 'bg-indigo-700 text-white shadow-lg' : 'text-txt-secondary hover:text-white'}`} title="Direct Selection Tool (A)"><MousePointer2 size={14} /></button>
                        </div>
                    </>
                )}
                
                {drawTool !== 'select' && !drawTool.startsWith('path-') && drawTool !== 'path' && (
                    <>
                        <div className="w-px h-8 bg-white/5 mx-2" />
                        <div className="w-32 px-2">
                             <Slider min={1} max={100} value={brushSettings.brushSize} onChange={(v) => updatePaintNode({brushSize: v})} accent={drawTool === 'eraser' ? "red" : "pink" as any} disabled={drawTool === 'bucket'} />
                        </div>
                        {drawTool !== 'eraser' && (
                            <ColorPicker value={brushSettings.brushColor} onChange={(v) => updatePaintNode({brushColor: v})} accent="pink" className="bg-transparent border-none p-0 w-24" />
                        )}
                    </>
                )}
            </div>
        )}
    </div>
  );
};

export default SpriteEditor;
