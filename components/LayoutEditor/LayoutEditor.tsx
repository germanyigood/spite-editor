
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { InfiniteCanvas } from '../common/InfiniteCanvas';
import { useProject } from '../../context/ProjectContext';
import { BitmapView } from '../common/BitmapView';
import { NodePayload, PayloadTimeline, ImageSource } from '../../types';
import { TransformBox, TransformRect } from '../common/TransformBox';
import { BoxSelect, Square, Maximize } from 'lucide-react';

interface LayoutEditorProps {
    nodeOutputs: Record<string, NodePayload | null>;
}

type LocalTool = 'select' | 'create';

interface DragState {
    mode: 'move' | 'resize' | 'create' | 'pan';
    targetId?: string;
    handle?: string;
    startX: number;
    startY: number;
    initialRect?: TransformRect;
    initialCursor?: { x: number, y: number };
}

const LayoutEditor: React.FC<LayoutEditorProps> = ({ nodeOutputs }) => {
    const { state, dispatch } = useProject();
    const { activeAnimationId, animations, selectedLayoutElementId } = state;
    const currentAnim = animations.find(a => a.id === activeAnimationId);
    
    const [transform, setTransform] = useState({ x: 100, y: 100, scale: 1 });
    const transformRef = useRef(transform);
    useEffect(() => { transformRef.current = transform; }, [transform]);
    const animIdRef = useRef<string | null>(null);

    // Sync state
    useEffect(() => {
        if (currentAnim) {
            const isNewAnim = currentAnim.id !== animIdRef.current;
            if (isNewAnim) animIdRef.current = currentAnim.id;

            if (currentAnim.layoutCamera) {
                setTransform(currentAnim.layoutCamera);
            } else if (isNewAnim) {
                setTransform({ x: 100, y: 100, scale: 1 });
            }
        }
    }, [currentAnim?.layoutCamera, currentAnim?.id]);

    const containerRef = useRef<HTMLDivElement>(null);
    const [localTool, setLocalTool] = useState<LocalTool>('select');

    const [visualRect, setVisualRect] = useState<TransformRect | null>(null);
    const [tempCreateRect, setTempCreateRect] = useState<TransformRect | null>(null);
    
    const dragRef = useRef<DragState | null>(null);
    const [playbackIndex, setPlaybackIndex] = useState(0);

    const outputInfo = useMemo(() => {
        const outputNode = currentAnim?.nodeGraph?.nodes?.find(n => n.type === 'output');
        const payload = outputNode ? nodeOutputs[outputNode.id] : null;
        
        let width = 800;
        let height = 600;
        let image: ImageSource | null = null;
        let isPlaying = false;
        let fps = 12;
        let totalFrames = 1;
        
        if (payload) {
            if (payload.type === 'IMAGE') {
                width = payload.width || width;
                height = payload.height || height;
                image = payload.image;
            } else if (payload.type === 'IMAGE_SEQUENCE') {
                image = payload.image;
                if (image instanceof ImageBitmap) {
                    width = image.width;
                    height = image.height;
                }
            } else if (payload.type === 'TIMELINE') {
                isPlaying = payload.isPlaying;
                fps = payload.fps;
                totalFrames = payload.frames.length;
                
                if (payload.frames.length > 0 && payload.frames[0] instanceof ImageBitmap) {
                    width = payload.frames[0].width;
                    height = payload.frames[0].height;
                } else if (payload.image instanceof ImageBitmap) {
                    width = payload.image.width;
                    height = payload.image.height;
                }
                
                const idx = isPlaying ? playbackIndex : payload.currentFrameIndex;
                image = payload.frames[idx] || payload.frames[0];
            }
        }

        return { width, height, image, isPlaying, fps, totalFrames };
    }, [currentAnim, nodeOutputs, playbackIndex]);

    useEffect(() => {
        if (outputInfo.isPlaying && outputInfo.totalFrames > 0) {
            const interval = 1000 / (outputInfo.fps || 12);
            const timer = setInterval(() => {
                setPlaybackIndex(prev => (prev + 1) % outputInfo.totalFrames);
            }, interval);
            return () => clearInterval(timer);
        } else {
            setPlaybackIndex(0);
        }
    }, [outputInfo.isPlaying, outputInfo.fps, outputInfo.totalFrames]);

    const handleTransformChange = (newT: any) => {
        setTransform(newT);
        if (!dragRef.current && currentAnim) {
             dispatch({ type: 'UPDATE_LAYOUT_CAMERA', payload: { animId: currentAnim.id, transform: newT } });
        }
    };

    const handleRecenter = () => {
        if (containerRef.current) {
            const vw = containerRef.current.clientWidth;
            const vh = containerRef.current.clientHeight;
            const x = Math.floor((vw - outputInfo.width) / 2);
            const y = Math.floor((vh - outputInfo.height) / 2);
            const newT = { x, y, scale: 1 };
            setTransform(newT);
            if (currentAnim) {
                dispatch({ type: 'UPDATE_LAYOUT_CAMERA', payload: { animId: currentAnim.id, transform: newT } });
            }
        }
    };

    const getWorldPos = (e: React.MouseEvent | MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if(!rect) return {x:0, y:0};
        const currentTransform = transformRef.current;
        return {
            x: (e.clientX - rect.left - currentTransform.x) / currentTransform.scale,
            y: (e.clientY - rect.top - currentTransform.y) / currentTransform.scale
        };
    };

    const handleBoxDown = useCallback((e: React.MouseEvent, id: string | number, handle?: string) => {
        if (e.button === 1 || e.ctrlKey || (e.button === 0 && e.shiftKey) || (e.button === 2 && e.ctrlKey)) {
            dragRef.current = { mode: 'pan', startX: e.clientX, startY: e.clientY };
            return;
        }
        e.stopPropagation();
        if (localTool !== 'select') return;
        
        dispatch({ type: 'SELECT_LAYOUT_ELEMENT', payload: String(id) });
        
        const element = currentAnim?.layout.elements.find(el => el.id === id);
        if (!element || element.locked) return;

        dragRef.current = {
            mode: handle ? 'resize' : 'move',
            targetId: String(id),
            handle,
            startX: e.clientX,
            startY: e.clientY,
            initialRect: { x: element.x, y: element.y, w: element.width, h: element.height }
        };
        
        setVisualRect({ x: element.x, y: element.y, w: element.width, h: element.height });
    }, [localTool, currentAnim, dispatch]);

    const handleCanvasDown = (e: React.MouseEvent) => {
        const isBackgroundFormClick = e.target === e.currentTarget || (e.target as HTMLElement).closest('.checkerboard');
        const isPanClick = e.button === 1 || e.ctrlKey || (e.button === 0 && e.shiftKey) || (e.button === 2 && e.ctrlKey);
        
        if (isPanClick) {
            dragRef.current = { mode: 'pan', startX: e.clientX, startY: e.clientY };
            dispatch({ type: 'SELECT_LAYOUT_ELEMENT', payload: null });
            return;
        }

        if (localTool === 'create') {
            const pos = getWorldPos(e);
            dragRef.current = { mode: 'create', startX: e.clientX, startY: e.clientY, initialCursor: pos };
            setTempCreateRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
            dispatch({ type: 'SELECT_LAYOUT_ELEMENT', payload: null }); 
        } else if (isBackgroundFormClick || (e.target as HTMLElement).closest('[data-testid="infinite-canvas"]')) {
            dispatch({ type: 'SELECT_LAYOUT_ELEMENT', payload: null });
            
            // Allow panning by spacebar/middle click, but not pure left click on background anymore. 
            // We removed pure left click panning so it matches user expectations (only middle click/ctrl+click).
        }
    };

    const handleWindowMove = useCallback((e: MouseEvent) => {
        if (!dragRef.current) return;
        const { mode, startX, startY, initialRect, initialCursor } = dragRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        if (mode === 'pan') {
            setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            dragRef.current.startX = e.clientX;
            dragRef.current.startY = e.clientY;
            return;
        }

        const wDx = dx / transformRef.current.scale;
        const wDy = dy / transformRef.current.scale;

        if (mode === 'move' && initialRect) {
            setVisualRect({ x: Math.round(initialRect.x + wDx), y: Math.round(initialRect.y + wDy), w: initialRect.w, h: initialRect.h });
        }
        else if (mode === 'resize' && initialRect && dragRef.current.handle) {
            const h = dragRef.current.handle;
            let { x, y, w, h: height } = initialRect;
            if (h.includes('e')) w += wDx;
            if (h.includes('s')) height += wDy;
            if (h.includes('w')) { x += wDx; w -= wDx; }
            if (h.includes('n')) { y += wDy; height -= wDy; }
            if (w < 1) w = 1;
            if (height < 1) height = 1;
            setVisualRect({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(height) });
        }
        else if (mode === 'create' && initialCursor) {
            const currentPos = getWorldPos(e);
            const x = Math.min(initialCursor.x, currentPos.x);
            const y = Math.min(initialCursor.y, currentPos.y);
            const w = Math.abs(currentPos.x - initialCursor.x);
            const h = Math.abs(currentPos.y - initialCursor.y);
            setTempCreateRect({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
        }
    }, []);

    const handleWindowUp = useCallback(() => {
        if (!dragRef.current || !currentAnim) { dragRef.current = null; return; }
        const { mode, targetId } = dragRef.current;

        if ((mode === 'move' || mode === 'resize') && targetId && visualRect) {
            dispatch({ type: 'UPDATE_LAYOUT_ELEMENT', payload: { animId: currentAnim.id, elementId: targetId, updates: { x: visualRect.x, y: visualRect.y, width: visualRect.w, height: visualRect.h } } });
        }
        else if (mode === 'create' && tempCreateRect) {
            if (tempCreateRect.w > 5 && tempCreateRect.h > 5) {
                const newEl = { id: `el_${Date.now()}`, name: 'New Box', type: 'box' as const, x: tempCreateRect.x, y: tempCreateRect.y, width: tempCreateRect.w, height: tempCreateRect.h, visible: true, locked: false, data: {} };
                dispatch({ type: 'ADD_LAYOUT_ELEMENT', payload: { animId: currentAnim.id, element: newEl } });
                setLocalTool('select'); 
            }
        }
        else if (mode === 'pan') {
            dispatch({ type: 'UPDATE_LAYOUT_CAMERA', payload: { animId: currentAnim.id, transform: transformRef.current } });
        }

        dragRef.current = null;
        setVisualRect(null);
        setTempCreateRect(null);
    }, [currentAnim, visualRect, tempCreateRect, dispatch]);

    useEffect(() => {
        window.addEventListener('mousemove', handleWindowMove);
        window.addEventListener('mouseup', handleWindowUp);
        return () => {
            window.removeEventListener('mousemove', handleWindowMove);
            window.removeEventListener('mouseup', handleWindowUp);
        };
    }, [handleWindowMove, handleWindowUp]);

    return (
        <div className="w-full h-full relative bg-app/50 group" data-testid="layout-editor-container">
            <InfiniteCanvas
                ref={containerRef}
                transform={transform}
                onChange={handleTransformChange}
                onMouseDown={handleCanvasDown}
                className={localTool === 'create' ? 'cursor-crosshair' : 'cursor-default'}
            >
                {/* Visual Artboard: Using Natural mode to match (0,0) exactly */}
                <div className="absolute top-0 left-0 border-2 border-dashed border-indigo-500/20 shadow-2xl transition-all pointer-events-none" style={{ width: outputInfo.width, height: outputInfo.height }}>
                    {outputInfo.image && <BitmapView image={outputInfo.image} mode="natural" className="w-full h-full select-none pixelated" />}
                </div>

                {(currentAnim?.layout?.elements || []).map(el => {
                    if (!el.visible) return null;
                    const isSelected = selectedLayoutElementId === el.id;
                    const isDragging = dragRef.current?.targetId === el.id;
                    const rect = (isDragging && visualRect) ? visualRect : { x: el.x, y: el.y, w: el.width, h: el.height };
                    return (
                        <TransformBox key={el.id} id={el.id} rect={rect} isSelected={isSelected} locked={el.locked} color="amber" onMouseDown={handleBoxDown}>
                            {el.type === 'text' && <div className="w-full h-full bg-amber-500/10 flex items-center justify-center text-[8px] text-amber-500 overflow-hidden break-words p-1 opacity-50 pointer-events-none">{el.data.text || "Text"}</div>}
                            {el.type === 'slice9' && <div className="absolute inset-0 border border-dashed border-amber-500/30 opacity-50 pointer-events-none"><div className="absolute inset-[25%] border border-dashed border-amber-500/30" /></div>}
                        </TransformBox>
                    );
                })}

                {tempCreateRect && <div className="absolute border-2 border-amber-400 bg-amber-400/20 pointer-events-none z-50" style={{ left: tempCreateRect.x, top: tempCreateRect.y, width: tempCreateRect.w, height: tempCreateRect.h }} />}
            </InfiniteCanvas>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-panel/90 backdrop-blur-xl border border-border-base/10 p-1.5 rounded-xl shadow-2xl flex items-center gap-1 z-[50] select-none">
                <button data-testid="layout-tool-select" onClick={() => setLocalTool('select')} className={`p-2 rounded-lg transition-all ${localTool === 'select' ? 'bg-amber-500/20 text-amber-500 shadow-lg' : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover/10'}`} title="Select & Edit (V)"><BoxSelect size={18} /></button>
                <div className="w-px h-6 bg-border-base/10 mx-1" />
                <button data-testid="layout-tool-create" onClick={() => setLocalTool('create')} className={`p-2 rounded-lg transition-all ${localTool === 'create' ? 'bg-amber-500 text-white shadow-lg' : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover/10'}`} title="Draw Box (R)"><Square size={18} /></button>
                <div className="w-px h-6 bg-border-base/10 mx-1" />
                <button data-testid="layout-recenter" onClick={handleRecenter} className={`p-2 rounded-lg text-txt-secondary hover:text-txt-primary hover:bg-surface-hover/10 transition-all`} title="Center Artboard"><Maximize size={18} /></button>
            </div>
        </div>
    );
};

export default LayoutEditor;
