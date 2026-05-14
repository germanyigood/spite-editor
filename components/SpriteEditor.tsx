
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
import { Brush, Eraser, BoxSelect } from 'lucide-react';
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

  const warpNode = useMemo(() => {
      if (!entry || !activeLayerId) return undefined;
      return findModifierByType(entry.nodeGraph, activeLayerId, 'warp') as WarpNode | undefined;
  }, [entry?.nodeGraph, activeLayerId]);

  const [drawTool, setDrawTool] = useState<'brush' | 'eraser' | 'select'>('brush');
  const [selectionRect, setSelectionRect] = useState<{x:number, y:number, w:number, h:number} | null>(null);

  const [brushSettings, setBrushSettings] = useState<PaintConfig>({
      brushSize: 20, brushColor: '#000000', brushOpacity: 1.0, brushHardness: 0.8, isEraser: false
  });

  // Синхронизация локального состояния инструмента с данными ноды
  useEffect(() => {
      if(paintNode) {
          setBrushSettings(prev => ({ ...prev, ...paintNode.data }));
          if (paintNode.data.isEraser) setDrawTool('eraser');
          else if (drawTool === 'eraser') setDrawTool('brush');
      }
  }, [paintNode?.id, paintNode?.data.isEraser]);

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

  const setLocalDrawTool = (tool: 'brush' | 'eraser' | 'select') => {
      setDrawTool(tool);
      if (tool !== 'select') {
          updatePaintNode({ isEraser: tool === 'eraser' });
      }
  };

  const performExtraction = useCallback(async (isCut: boolean) => {
      if (!selectionRect || !activeSource || !entry || !paintNode) return;
      
      const lastMod = findLastModifier(entry.nodeGraph, activeSource.id);
      const payload = nodeOutputs[lastMod?.id || activeSource.id];
      if (!payload || payload.type !== 'IMAGE') return;

      try {
          const bmp = await loadBitmap(payload.image);
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
              
              // FIX: If no paintData exists yet, load the ORIGINAL SOURCE first.
              // Otherwise we are cutting a hole in a transparent canvas, and the layer disappears.
              const baseSrc = paintNode.data.paintData || activeSource.data.src;
              
              if (baseSrc) {
                  const baseBmp = await loadBitmap(baseSrc);
                  pCtx.drawImage(baseBmp, 0, 0);
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

  const cursorStyle = isPanning ? 'cursor-grabbing' : (toolMode === 'draw' && (drawTool === 'brush' || drawTool === 'eraser') ? 'cursor-none' : 'cursor-default');

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

        {toolMode === 'draw' && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-panel/90 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-[100] animate-in slide-in-from-bottom-5">
                <div className="flex bg-surface/50 p-1 rounded-xl gap-1">
                    <button onClick={() => setLocalDrawTool('brush')} className={`p-2 rounded-lg transition-all ${drawTool === 'brush' ? 'bg-pink-600 text-white shadow-lg' : 'text-txt-secondary hover:text-white'}`} title="Brush Tool (B)"><Brush size={18} /></button>
                    <button onClick={() => setLocalDrawTool('eraser')} className={`p-2 rounded-lg transition-all ${drawTool === 'eraser' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-txt-secondary hover:text-white'}`} title="Eraser Tool (E)"><Eraser size={18} /></button>
                    <button onClick={() => setLocalDrawTool('select')} className={`p-2 rounded-lg transition-all ${drawTool === 'select' ? 'bg-indigo-600 text-white shadow-lg' : 'text-txt-secondary hover:text-white'}`} title="Selection Tool (S)"><BoxSelect size={18} /></button>
                </div>
                
                {drawTool !== 'select' && (
                    <>
                        <div className="w-px h-8 bg-white/5 mx-2" />
                        <div className="w-32 px-2">
                             <Slider min={1} max={100} value={brushSettings.brushSize} onChange={(v) => updatePaintNode({brushSize: v})} accent={drawTool === 'eraser' ? "red" as any : "pink"} />
                        </div>
                        {drawTool === 'brush' && (
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
