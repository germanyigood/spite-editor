
import React, { useState, useEffect } from 'react';
import { NodePayload } from '../../../types';
import { Play, Pause } from 'lucide-react';
import { BitmapView } from '../../common/BitmapView';

export const OutputPreview = React.memo(({ input, label = "Preview" }: { input?: NodePayload, label?: string }) => {
    const isTimeline = input?.type === 'TIMELINE';
    const [idx, setIdx] = useState(0);

    const fps = (isTimeline && input?.fps) ? input.fps : 12;
    const isPlaying = (isTimeline && input?.isPlaying !== undefined) ? input.isPlaying : true;
    const initialFrame = (isTimeline && input?.currentFrameIndex !== undefined) ? input.currentFrameIndex : 0;
    const frames = (isTimeline && input?.frames) ? input.frames : [];

    // Reset index to match timeline cursor when it changes (or when playback stops)
    useEffect(() => {
        if (!isPlaying || !isTimeline) {
            setIdx(initialFrame);
        }
    }, [isPlaying, initialFrame, isTimeline]);

    useEffect(() => {
        if(isTimeline && frames.length > 0 && isPlaying) {
            const interval = 1000 / fps;
            const t = setInterval(() => setIdx(i => (i + 1) % frames.length), interval);
            return () => clearInterval(t);
        }
    }, [isTimeline, frames.length, isPlaying, fps]);

    const src = isTimeline 
        ? (frames[idx] || frames[0]) 
        : (input?.type === 'IMAGE' ? input.image : (input?.type === 'IMAGE_SEQUENCE' ? input.image : null));

    const hasData = !!src;
    
    // Calculate display dimensions if possible
    let dims = "";
    if (src && (src instanceof ImageBitmap)) {
        dims = `${src.width}x${src.height}`;
    }

    return (
        <div className="flex flex-col h-full gap-2">
            <div 
                className="flex-1 bg-black/5 dark:bg-black/50 rounded-lg border border-border-base/10 flex items-center justify-center checkerboard overflow-hidden relative cursor-pointer group shadow-inner"
            >
                {hasData ? (
                    <BitmapView image={src} className="max-w-full max-h-full object-contain pixelated" style={{width:'100%', height:'100%', objectFit:'contain'}} />
                ) : (
                    <span className="text-[9px] text-txt-muted font-medium uppercase tracking-wider">Empty</span>
                )}

                {isTimeline && hasData && (
                    <div className="absolute bottom-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white opacity-80 border border-white/10 pointer-events-none">
                        {isPlaying ? <Play size={10} fill="currentColor"/> : <Pause size={10} fill="currentColor"/>}
                    </div>
                )}
                
                {dims && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-white/90 dark:bg-black/60 text-[8px] text-txt-primary dark:text-gray-400 rounded backdrop-blur-md font-mono border border-border-base/10 shadow-sm">
                        {dims}
                    </div>
                )}
            </div>
            
            <div className="flex items-center justify-between px-1">
                <span className="text-[9px] text-txt-muted uppercase font-bold tracking-wider">
                    {label}
                </span>
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${hasData ? 'bg-blue-400 animate-pulse shadow-[0_0_5px_rgba(96,165,250,0.8)]' : 'bg-red-500'}`} />
                    <span className="text-[9px] text-blue-600 dark:text-blue-300 font-mono">
                        {isTimeline ? `${idx + 1}/${frames.length}` : (hasData ? 'Ready' : 'No Signal')}
                    </span>
                    {isTimeline && (
                        <span className="text-[9px] text-txt-secondary font-mono ml-1">{fps} FPS</span>
                    )}
                </div>
            </div>
        </div>
    );
});
