
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { SourceNode, NodeGraphData, NodePayload, PaintNode, WarpNode, VectorNode } from '../../types';
import { findModifierByType, findLastModifier, loadBitmap } from '../../utils';
import { useProject } from '../../context/ProjectContext';
import { useDrawingEngine } from './useDrawingEngine';
import { useVectorEngine } from './useVectorEngine';

interface LayerRendererProps {
    layer: SourceNode;
    graph: NodeGraphData;
    isSelected: boolean;
    toolMode: string;
    drawTool?: 'brush' | 'eraser' | 'select' | 'bucket' | 'rect' | 'ellipse' | 'path';
    nodeOutputs: Record<string, NodePayload | null>;
    overridePos?: { x: number, y: number };
    scale?: number;
}

export const LayerRenderer = React.memo(({ 
    layer, 
    graph, 
    isSelected, 
    toolMode,
    drawTool = 'brush',
    nodeOutputs,
    overridePos,
    scale = 1
}: LayerRendererProps) => {
    const { state, dispatch } = useProject();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const paintNode = useMemo(() => findModifierByType(graph, layer.id, 'paint') as PaintNode | undefined, [graph, layer.id]);
    const warpNode = useMemo(() => findModifierByType(graph, layer.id, 'warp') as WarpNode | undefined, [graph, layer.id]);
    const vectorNode = useMemo(() => findModifierByType(graph, layer.id, 'vector') as VectorNode | undefined, [graph, layer.id]);
    const lastModifier = useMemo(() => findLastModifier(graph, layer.id), [graph, layer.id]);
    
    const paintInputNodeId = useMemo(() => {
        if (!paintNode || !graph.connections) return layer.id;
        const conn = graph.connections.find(c => c.target === paintNode.id);
        return conn ? conn.source : layer.id;
    }, [graph.connections, paintNode, layer.id]);

    const finalPayload = useMemo(() => {
        if (toolMode === 'draw') {
             if (paintNode) return nodeOutputs[paintNode.id] || nodeOutputs[paintInputNodeId] || nodeOutputs[layer.id];
             return nodeOutputs[paintInputNodeId] || nodeOutputs[layer.id];
        }
        return lastModifier ? nodeOutputs[lastModifier.id] : nodeOutputs[layer.id];
    }, [toolMode, paintNode, paintInputNodeId, nodeOutputs, layer.id, lastModifier]);
    
    const canInteractWithBrush = toolMode === 'draw' && isSelected && (drawTool === 'brush' || drawTool === 'eraser' || drawTool === 'bucket' || drawTool === 'rect' || drawTool === 'ellipse') && paintNode && !paintNode.disabled;
    const canInteractWithVector = toolMode === 'draw' && isSelected && drawTool && drawTool.startsWith('path') && vectorNode && !vectorNode.disabled;

    const paintInputPayload = nodeOutputs[paintInputNodeId] || nodeOutputs[layer.id];

    const { 
        isPointerDown, 
        handlePointerDown: paintPointerDown, 
        handlePointerMove: paintPointerMove, 
        handlePointerUp: paintPointerUp,
        paintCanvasRef,
        drawTrigger
    } = useDrawingEngine({
        layer,
        paintNode,
        warpNode,
        paintInputPayload,
        canvasRef,
        dispatch,
        animId: state.activeAnimationId || '',
        currentDrawTool: drawTool
    });

    const { 
        handlePointerDown: vectorPointerDown,
        handlePointerMove: vectorPointerMove,
        handlePointerUp: vectorPointerUp,
        handleContextMenu: vectorContextMenu,
        selectedPathId,
        selectedPointIndex,
        livePaths
    } = useVectorEngine({
        vectorNode,
        dispatch,
        animId: state.activeAnimationId || '',
        currentDrawTool: drawTool,
        scale
    });

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Если идет активное рисование, мы НЕ затираем холст через React-апдейты,
        // так как движок сам управляет отрисовкой кругов в реальном времени.
        const shouldShowPaintCanvas = toolMode === 'draw' && isSelected && paintNode && !paintNode.disabled;
        if (isPointerDown && shouldShowPaintCanvas) return;

        const displayW = finalPayload?.type === 'IMAGE' ? finalPayload.width : layer.data.width;
        const displayH = finalPayload?.type === 'IMAGE' ? finalPayload.height : layer.data.height;

        if (canvas.width !== displayW || canvas.height !== displayH) {
            canvas.width = displayW;
            canvas.height = displayH;
        }

        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'copy';

        let didDraw = false;

        if (shouldShowPaintCanvas && paintCanvasRef.current) {
            ctx.drawImage(paintCanvasRef.current, 0, 0);
            didDraw = true;
        }

        if (!didDraw && finalPayload && (finalPayload.type === 'IMAGE' || finalPayload.type === 'IMAGE_SEQUENCE') && finalPayload.image && (finalPayload.image instanceof ImageBitmap || finalPayload.image instanceof HTMLCanvasElement || finalPayload.image instanceof HTMLImageElement)) {
            ctx.drawImage(finalPayload.image, 0, 0);
            didDraw = true;
        } 
        
        if (!didDraw) {
            loadBitmap((finalPayload as any)?.src || layer.data.src).then(bmp => {
                if (!canInteractWithBrush && !shouldShowPaintCanvas) ctx.drawImage(bmp, 0, 0);
            }).catch(() => {});
        }
    }, [finalPayload, layer.data.src, layer.data.width, layer.data.height, canInteractWithBrush, paintCanvasRef, isPointerDown, toolMode, isSelected, paintNode, drawTrigger]);

    useEffect(() => {
        redraw();
    }, [redraw, finalPayload, drawTrigger]);

    const finalX = overridePos ? overridePos.x : (layer.data?.x || 0);
    const finalY = overridePos ? overridePos.y : (layer.data?.y || 0);

    const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (e.currentTarget.width / rect.width),
            y: (e.clientY - rect.top) * (e.currentTarget.height / rect.height)
        };
    };

    const handleContainerPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (canInteractWithBrush) return paintPointerDown(e);
        if (canInteractWithVector) {
            const { x, y } = getCoords(e);
            return vectorPointerDown(e, x, y);
        }
    };

    const handleContainerPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (canInteractWithBrush) return paintPointerMove(e);
        if (canInteractWithVector) {
            const { x, y } = getCoords(e);
            return vectorPointerMove(e, x, y);
        }
    };

    const handleContainerPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (canInteractWithBrush) return paintPointerUp(e);
        if (canInteractWithVector) return vectorPointerUp(e);
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (canInteractWithVector) return vectorContextMenu(e);
    };

    const logicalW = finalPayload?.type === 'IMAGE' ? finalPayload.width : layer.data.width;
    const logicalH = finalPayload?.type === 'IMAGE' ? finalPayload.height : layer.data.height;

    return (
        <div 
            className={`absolute origin-top-left ${(canInteractWithBrush || canInteractWithVector) ? 'z-50 ring-2 ring-pink-500 shadow-2xl' : ''}`}
            style={{ 
                left: finalX, top: finalY, 
                opacity: layer.data?.opacity || 1, 
                zIndex: isSelected ? 10 : 1,
                width: logicalW,
                height: logicalH,
            }}
        >
            <canvas 
                ref={canvasRef}
                data-testid="interactive-layer-canvas"
                className={`w-full h-full block checkerboard pixelated ${(canInteractWithBrush || canInteractWithVector) ? 'touch-none pointer-events-auto' : 'pointer-events-none'} ${canInteractWithBrush ? 'cursor-none' : (canInteractWithVector ? 'cursor-crosshair' : '')}`}
                onPointerDown={handleContainerPointerDown}
                onPointerMove={handleContainerPointerMove}
                onPointerUp={handleContainerPointerUp}
                onContextMenu={handleContextMenu}
                onMouseDown={(canInteractWithBrush || canInteractWithVector) ? (e) => e.stopPropagation() : undefined}
            />
            {canInteractWithVector && vectorNode && (livePaths || vectorNode.data.paths) && (
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox={`0 0 ${logicalW} ${logicalH}`}>
                    {(livePaths || vectorNode.data.paths).map(path => (
                        <g key={path.id}>
                            {/* Path outlines in UI (so you see it even without stroke) */}
                            <path 
                                d={path.points.length > 0 ? `M ${path.points[0].x} ${path.points[0].y} ` + 
                                    path.points.slice(1).map((pt, i) => {
                                        const prev = path.points[i];
                                        const cp1x = prev.cp2x ?? prev.x;
                                        const cp1y = prev.cp2y ?? prev.y;
                                        const cp2x = pt.cp1x ?? pt.x;
                                        const cp2y = pt.cp1y ?? pt.y;
                                        return `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
                                    }).join(' ') + (path.closed && path.points.length > 2 ? ` C ${path.points[path.points.length-1].cp2x ?? path.points[path.points.length-1].x} ${path.points[path.points.length-1].cp2y ?? path.points[path.points.length-1].y}, ${path.points[0].cp1x ?? path.points[0].x} ${path.points[0].cp1y ?? path.points[0].y}, ${path.points[0].x} ${path.points[0].y} Z` : '')
                                    : ''
                                } 
                                fill="none" 
                                stroke={path.id === selectedPathId ? "#00ffff" : "#0088ff"} 
                                strokeWidth={1.5}
                                vectorEffect="non-scaling-stroke"
                            />
                            
                            {/* Points and Handles only for selected path */}
                            {path.id === selectedPathId && path.points.map((pt, i) => (
                                <g key={i}>
                                    {/* Handle lines */}
                                    {pt.cp1x !== undefined && (
                                        <line x1={pt.x} y1={pt.y} x2={pt.cp1x} y2={pt.cp1y} stroke="#888" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                    )}
                                    {pt.cp2x !== undefined && (
                                        <line x1={pt.x} y1={pt.y} x2={pt.cp2x} y2={pt.cp2y} stroke="#888" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                    )}
                                    
                                    {/* Handle grips */}
                                    {pt.cp1x !== undefined && (
                                        <circle cx={pt.cp1x} cy={pt.cp1y} r={3/scale} fill="#fff" stroke="#888" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                    )}
                                    {pt.cp2x !== undefined && (
                                        <circle cx={pt.cp2x} cy={pt.cp2y} r={3/scale} fill="#fff" stroke="#888" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                    )}
                                    
                                    {/* Anchor point */}
                                    <rect 
                                        x={pt.x - 3/scale} 
                                        y={pt.y - 3/scale} 
                                        width={6/scale} 
                                        height={6/scale} 
                                        fill={selectedPointIndex === i ? "#00ffff" : "#fff"} 
                                        stroke="#000" 
                                        strokeWidth={1}
                                        vectorEffect="non-scaling-stroke" 
                                    />
                                </g>
                            ))}
                        </g>
                    ))}
                </svg>
            )}
        </div>
    );
});
