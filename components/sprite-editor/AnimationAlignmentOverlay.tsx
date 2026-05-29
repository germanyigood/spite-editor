import React, { useRef, useState, useEffect } from 'react';
import { BaseNode, SourceNode, SpriteConfig, ImageSource } from '../../types';
import { useProject } from '../../context/ProjectContext';
import { loadBitmap } from '../../utils';

const FrameCanvas: React.FC<{
    imageSource: ImageSource;
    frame: { x: number, y: number, width: number, height: number };
    draftOffset?: { x: number, y: number };
    style?: React.CSSProperties;
    onPointerDown?: (e: React.PointerEvent) => void;
    onPointerMove?: (e: React.PointerEvent) => void;
    onPointerUp?: (e: React.PointerEvent) => void;
    onPointerCancel?: (e: React.PointerEvent) => void;
}> = ({ imageSource, frame, draftOffset, style, ...props }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let isMounted = true;
        
        const render = async () => {
            let img: CanvasImageSource;
            if (typeof imageSource === 'string') {
                img = await loadBitmap(imageSource);
            } else {
                img = imageSource;
            }
            if (!isMounted) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const x = frame.x + (draftOffset ? draftOffset.x : 0);
            const y = frame.y + (draftOffset ? draftOffset.y : 0);
            ctx.drawImage(img, x, y, frame.width, frame.height, 0, 0, frame.width, frame.height);
        };
        render();

        return () => { isMounted = false; };
    }, [imageSource, frame.x, frame.y, frame.width, frame.height, draftOffset?.x, draftOffset?.y]);

    return (
        <canvas 
            ref={canvasRef}
            width={frame.width}
            height={frame.height}
            style={{ ...style, imageRendering: 'pixelated' }}
            {...props}
        />
    );
};

interface AnimationAlignmentOverlayProps {
    activeSource: SourceNode;
    sliceNode: BaseNode;
    activeConfig: SpriteConfig;
    selectedFrameIndex: number | null;
    scale: number;
    processedImageSource?: ImageSource | null;
}

export const AnimationAlignmentOverlay: React.FC<AnimationAlignmentOverlayProps> = ({ 
    activeSource, 
    sliceNode,
    activeConfig, 
    selectedFrameIndex, 
    scale,
    processedImageSource
}) => {
    const { state, dispatch } = useProject();
    const [dragging, setDragging] = useState(false);
    const [draftOffset, setDraftOffset] = useState({ x: 0, y: 0 });
    const lastPos = useRef({ x: 0, y: 0 });
    const logicalPos = useRef({ x: 0, y: 0 });

    const activeAnimation = state.animations.find(a => a.id === state.activeAnimationId);
    const activeTimelineNode = activeAnimation?.nodeGraph.nodes.find(n => n.type === 'timeline') as any;

    let safeSelectedIndex = selectedFrameIndex;
    if (safeSelectedIndex === null && activeConfig.frames.length > 0) {
        safeSelectedIndex = 0;
    }

    const currentFrame = safeSelectedIndex !== null && activeConfig?.frames[safeSelectedIndex] ? activeConfig.frames[safeSelectedIndex] : null;

    let prevFrameIndex: number | null = null;
    
    // Attempt to use Timeline for previous context
    if (activeTimelineNode?.data?.frames && activeTimelineNode.data.frames.length > 0) {
        const tFrames = activeTimelineNode.data.frames as number[];
        let foundTIndex = tFrames.indexOf(safeSelectedIndex!);
        const currentTIndex = activeTimelineNode.data.currentFrame ?? 0;
        
        if (foundTIndex !== -1 && foundTIndex > 0) {
            prevFrameIndex = tFrames[foundTIndex - 1];
        } else if (foundTIndex !== -1 && foundTIndex === 0) {
            prevFrameIndex = tFrames[tFrames.length - 1];
        } else if (foundTIndex === -1 && currentTIndex >= 0 && currentTIndex < tFrames.length && tFrames[currentTIndex] === safeSelectedIndex && currentTIndex > 0 ) {
             prevFrameIndex = tFrames[currentTIndex - 1];
        } else if (foundTIndex === -1 && currentTIndex === 0 && tFrames.length > 0 && tFrames[0] === safeSelectedIndex) {
             prevFrameIndex = tFrames[tFrames.length - 1];
        }
    }

    if (prevFrameIndex === null && safeSelectedIndex !== null && safeSelectedIndex > 0) {
        prevFrameIndex = safeSelectedIndex - 1;
    } else if (prevFrameIndex === null && safeSelectedIndex !== null && safeSelectedIndex === 0 && activeConfig.frames.length > 0) {
        prevFrameIndex = activeConfig.frames.length - 1;
    }

    const prevFrame = prevFrameIndex !== null && activeConfig?.frames[prevFrameIndex] ? activeConfig.frames[prevFrameIndex] : null;

    if (!currentFrame) return null;

    let imgSrc: ImageSource | null = null;
    if (processedImageSource) {
        imgSrc = processedImageSource;
    }
    if (!imgSrc && activeSource.data?.src) {
        imgSrc = activeSource.data.src;
    }
    if (!imgSrc) return null;

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0 || !currentFrame) return;
        setDragging(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
        logicalPos.current = { x: currentFrame.x + draftOffset.x, y: currentFrame.y + draftOffset.y };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        e.stopPropagation();
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragging || !currentFrame || safeSelectedIndex === null) return;
        
        const dx = (e.clientX - lastPos.current.x) / scale;
        const dy = (e.clientY - lastPos.current.y) / scale;
        
        lastPos.current = { x: e.clientX, y: e.clientY };

        logicalPos.current.x -= dx;
        logicalPos.current.y -= dy;

        const newX = Math.round(logicalPos.current.x);
        const newY = Math.round(logicalPos.current.y);

        setDraftOffset({ x: newX - currentFrame.x, y: newY - currentFrame.y });
        
        e.stopPropagation();
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        
        if (draftOffset.x !== 0 || draftOffset.y !== 0) {
            const updatedFrames = activeConfig.frames.map((f, i) => i === safeSelectedIndex ? { ...f, x: f.x + draftOffset.x, y: f.y + draftOffset.y } : f);

            dispatch({ 
                type: 'UPDATE_NODE_DATA', 
                payload: { 
                    animId: state.activeAnimationId!, 
                    nodeId: sliceNode.id, 
                    data: { ...activeConfig, frames: updatedFrames } 
                } 
            });
            setDraftOffset({ x: 0, y: 0 });
        }
        
        e.stopPropagation();
    };

    return (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }}>
            {/* Ghost Frame */}
            {prevFrame && (
                <FrameCanvas 
                    imageSource={imgSrc}
                    frame={prevFrame}
                    style={{
                        position: 'absolute',
                        left: -prevFrame.width / 2,
                        top: -prevFrame.height / 2,
                        opacity: 0.4,
                        pointerEvents: 'none'
                    }}
                />
            )}
            
            {/* Current Frame with Border */}
            <div
                style={{
                    position: 'absolute',
                    left: -currentFrame.width / 2,
                    top: -currentFrame.height / 2,
                    width: currentFrame.width,
                    height: currentFrame.height,
                    border: '1px solid #3b82f6',
                    cursor: dragging ? 'grabbing' : 'grab',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <FrameCanvas 
                    imageSource={imgSrc}
                    frame={currentFrame}
                    draftOffset={draftOffset}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0
                    }}
                />
                
                {activeConfig.showCrosshair && (
                    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50, mixBlendMode: 'difference' }}>
                        <line x1={currentFrame.width / 3} y1={0} x2={currentFrame.width / 3} y2={currentFrame.height} stroke="#ef4444" strokeWidth="1" opacity={0.8} />
                        <line x1={(currentFrame.width / 3) * 2} y1={0} x2={(currentFrame.width / 3) * 2} y2={currentFrame.height} stroke="#ef4444" strokeWidth="1" opacity={0.8} />
                        <line x1={0} y1={currentFrame.height / 3} x2={currentFrame.width} y2={currentFrame.height / 3} stroke="#ef4444" strokeWidth="1" opacity={0.8} />
                        <line x1={0} y1={(currentFrame.height / 3) * 2} x2={currentFrame.width} y2={(currentFrame.height / 3) * 2} stroke="#ef4444" strokeWidth="1" opacity={0.8} />
                        
                        <line x1={currentFrame.width / 2} y1={(currentFrame.height / 2) - 10} x2={currentFrame.width / 2} y2={(currentFrame.height / 2) + 10} stroke="#ef4444" strokeWidth="1.5" opacity={1} />
                        <line x1={(currentFrame.width / 2) - 10} y1={currentFrame.height / 2} x2={(currentFrame.width / 2) + 10} y2={currentFrame.height / 2} stroke="#ef4444" strokeWidth="1.5" opacity={1} />
                        <circle cx={currentFrame.width / 2} cy={currentFrame.height / 2} r="1.5" fill="#ef4444" />
                    </svg>
                )}
            </div>
        </div>
    );
};
