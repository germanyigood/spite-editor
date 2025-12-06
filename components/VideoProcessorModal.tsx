
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, Plus, Trash2, Film, Loader2, AlertCircle, Crop as CropIcon, MousePointer2, RotateCcw } from 'lucide-react';

interface VideoProcessorModalProps {
  file: File;
  onConfirm: (imageSrc: string, config: { rows: number, cols: number, totalFrames: number, frameWidth: number, frameHeight: number }) => void;
  onCancel: () => void;
}

interface TimeSegment {
  id: string;
  start: number;
  end: number;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const VideoProcessorModal: React.FC<VideoProcessorModalProps> = ({ file, onConfirm, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });
  
  // Settings
  const [segments, setSegments] = useState<TimeSegment[]>([]);
  const [captureFps, setCaptureFps] = useState(10);
  const [scale, setScale] = useState(0.5); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [estimatedFrames, setEstimatedFrames] = useState(0);

  // Crop State
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 }); // In native video pixels

  // Interaction State
  const [dragging, setDragging] = useState<{
    type: 'playhead' | 'segment_start' | 'segment_end' | 'crop_move' | 'crop_resize_br' | 'crop_resize_tl';
    id?: string;
    startX?: number;
    startY?: number;
    initialVal?: number; // Time
    initialRect?: CropRect; // Crop
  } | null>(null);

  // Initialize
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      setDuration(dur);
      setVideoDims({ w: vw, h: vh });
      
      // Default: First 5 seconds or full video if shorter
      setSegments([{ id: Date.now().toString(), start: 0, end: Math.min(dur, 5) }]);
      
      // Default Crop: Full Video if not already set
      if (crop.w === 0 || crop.h === 0) {
          setCrop({ x: 0, y: 0, w: vw, h: vh });
      }
    }
  };

  // Sync Video Time
  const handleTimeUpdate = () => {
    if (videoRef.current && !dragging) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Estimate Frames
  useEffect(() => {
    let totalSeconds = 0;
    segments.forEach(s => totalSeconds += Math.max(0, s.end - s.start));
    setEstimatedFrames(Math.floor(totalSeconds * captureFps));
  }, [segments, captureFps]);


  // --- Logic ---

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const addSegment = () => {
    // Add a 2s segment at current playhead
    const start = currentTime;
    const end = Math.min(duration, currentTime + 2);
    setSegments([...segments, { id: Date.now().toString(), start, end }]);
  };

  const removeSegment = (id: string) => {
    if (segments.length > 1) {
      setSegments(segments.filter(s => s.id !== id));
    }
  };

  const updateSegment = (id: string, key: 'start' | 'end', value: number) => {
    setSegments(prev => prev.map(s => {
        if (s.id !== id) return s;
        const updates = { [key]: Math.min(Math.max(0, value), duration) };
        // Validation to prevent crossing
        if (key === 'start' && updates.start > s.end) updates.start = s.end;
        if (key === 'end' && updates.end < s.start) updates.end = s.start;
        return { ...s, ...updates };
    }));
  };

  const updateCrop = (key: keyof CropRect, value: number) => {
      setCrop(prev => {
          let val = Math.round(value); // Force integer
          if (isNaN(val)) val = 0;
          
          const next = { ...prev, [key]: val };
          // Basic validation
          if (next.x < 0) next.x = 0;
          if (next.y < 0) next.y = 0;
          if (next.w < 1) next.w = 1;
          if (next.h < 1) next.h = 1;
          
          if (next.x + next.w > videoDims.w) {
              if (key === 'x') next.x = videoDims.w - next.w;
              if (key === 'w') next.w = videoDims.w - next.x;
          }
          if (next.y + next.h > videoDims.h) {
              if (key === 'y') next.y = videoDims.h - next.h;
              if (key === 'h') next.h = videoDims.h - next.y;
          }
          return next;
      });
  };

  const resetCrop = () => {
      setCrop({ x: 0, y: 0, w: videoDims.w, h: videoDims.h });
  };

  // --- Helpers for Coordinates ---
  
  // Calculates the actual rect of the video content on screen
  const getVideoContentRect = () => {
     if (!videoRef.current || !videoContainerRef.current) return null;
     const vid = videoRef.current;
     if (vid.videoWidth === 0 || vid.videoHeight === 0) return null;

     // 1. Get the bounding box of the <video> element
     const vidRect = vid.getBoundingClientRect();

     // 2. Account for 'object-fit: contain' letterboxing INSIDE the <video> element.
     //    (Even if we use max-w-full, flexbox might stretch it in some scenarios, or min-dims might apply)
     const rectRatio = vidRect.width / vidRect.height;
     const sourceRatio = vid.videoWidth / vid.videoHeight;

     let renderW = vidRect.width;
     let renderH = vidRect.height;
     let renderX = vidRect.left;
     let renderY = vidRect.top;

     // Threshold for float comparison (detect internal letterboxing)
     if (Math.abs(rectRatio - sourceRatio) > 0.01) {
         if (rectRatio > sourceRatio) {
             // Element is wider than content -> Pillars (left/right black bars)
             renderW = renderH * sourceRatio;
             renderX = vidRect.left + (vidRect.width - renderW) / 2;
         } else {
             // Element is taller than content -> Letterbox (top/bottom black bars)
             renderH = renderW / sourceRatio;
             renderY = vidRect.top + (vidRect.height - renderH) / 2;
         }
     }

     return { 
         x: renderX, // Global Screen X of content
         y: renderY, // Global Screen Y of content
         w: renderW, // Screen Width of content
         h: renderH, // Screen Height of content
         scale: vid.videoWidth / renderW // Multiplier to convert Screen px -> Video source px
     };
  };

  // --- Mouse / Drag Logic ---

  const getTimelineTime = (e: MouseEvent | React.MouseEvent) => {
    if (!timelineRef.current || duration === 0) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  };

  const handleMouseDown = (e: React.MouseEvent, type: typeof dragging.type, id?: string) => {
    e.stopPropagation();
    e.preventDefault(); 
    
    // Video Area Interaction (Crop)
    if (type.startsWith('crop_')) {
        setDragging({ type, startX: e.clientX, startY: e.clientY, initialRect: { ...crop } });
        return;
    }

    // Timeline Interaction
    const time = getTimelineTime(e);
    if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
    }

    setDragging({ type, id });
    
    if (type === 'playhead') {
        setCurrentTime(time);
        if (videoRef.current) videoRef.current.currentTime = time;
    }
  };

  const handleGlobalMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;

    // --- Crop Dragging ---
    if (dragging.type.startsWith('crop_') && dragging.initialRect && videoRef.current) {
        const vidRect = getVideoContentRect();
        if (!vidRect) return;

        // Delta in Screen Pixels
        const dx = e.clientX - (dragging.startX || 0);
        const dy = e.clientY - (dragging.startY || 0);

        // Convert to Video Pixels
        const vDx = dx * vidRect.scale;
        const vDy = dy * vidRect.scale;

        const maxW = videoRef.current.videoWidth;
        const maxH = videoRef.current.videoHeight;

        if (dragging.type === 'crop_move') {
            let nx = dragging.initialRect.x + vDx;
            let ny = dragging.initialRect.y + vDy;
            
            // Constrain
            nx = Math.max(0, Math.min(nx, maxW - dragging.initialRect.w));
            ny = Math.max(0, Math.min(ny, maxH - dragging.initialRect.h));
            
            // Round for strict integer pixels
            setCrop({ ...dragging.initialRect, x: Math.round(nx), y: Math.round(ny) });
        }
        else if (dragging.type === 'crop_resize_br') {
             // Bottom Right Resize
             let nw = dragging.initialRect.w + vDx;
             let nh = dragging.initialRect.h + vDy;
             
             // Min Size 10x10
             nw = Math.max(10, Math.min(nw, maxW - dragging.initialRect.x));
             nh = Math.max(10, Math.min(nh, maxH - dragging.initialRect.y));

             setCrop({ ...dragging.initialRect, w: Math.round(nw), h: Math.round(nh) });
        }
        else if (dragging.type === 'crop_resize_tl') {
             // Top Left Resize
             let dXVal = Math.min(vDx, dragging.initialRect.w - 10);
             let dYVal = Math.min(vDy, dragging.initialRect.h - 10);

             let nx = dragging.initialRect.x + dXVal;
             let ny = dragging.initialRect.y + dYVal;
             let nw = dragging.initialRect.w - dXVal;
             let nh = dragging.initialRect.h - dYVal;

             // Boundary Check
             if (nx < 0) { nw += nx; nx = 0; }
             if (ny < 0) { nh += ny; ny = 0; }

             setCrop({ x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) });
        }
        return;
    }

    // --- Timeline Dragging ---
    if (!timelineRef.current || duration === 0) return;
    const time = getTimelineTime(e);

    if (dragging.type === 'playhead') {
        setCurrentTime(time);
        if (videoRef.current) videoRef.current.currentTime = time;
    } 
    else if (dragging.id) {
        setSegments(prev => prev.map(s => {
            if (s.id !== dragging.id) return s;
            
            if (dragging.type === 'segment_start') {
                const newStart = Math.min(time, s.end - 0.1); 
                return { ...s, start: newStart };
            }
            if (dragging.type === 'segment_end') {
                const newEnd = Math.max(time, s.start + 0.1);
                return { ...s, end: newEnd };
            }
            return s;
        }));
    }
  }, [dragging, duration]);

  const handleGlobalUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [dragging, handleGlobalMove, handleGlobalUp]);


  // --- Render Helpers ---

  // Renders the visual box over the video element
  const renderCropOverlay = () => {
      if (!isCropping) return null;
      const vidRect = getVideoContentRect();
      if (!vidRect) return null;

      // Map video pixel coords to screen css coords
      const cssX = crop.x / vidRect.scale;
      const cssY = crop.y / vidRect.scale;
      const cssW = crop.w / vidRect.scale;
      const cssH = crop.h / vidRect.scale;

      const containerRect = videoContainerRef.current?.getBoundingClientRect();
      const offsetX = vidRect.x - (containerRect?.left || 0);
      const offsetY = vidRect.y - (containerRect?.top || 0);

      return (
          <div 
             className="absolute border-2 border-yellow-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move box-content z-10"
             style={{
                 left: offsetX + cssX,
                 top: offsetY + cssY,
                 width: cssW,
                 height: cssH
             }}
             onMouseDown={(e) => handleMouseDown(e, 'crop_move')}
          >
              {/* Handles */}
              <div 
                  className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-yellow-400 border border-black cursor-nwse-resize"
                  onMouseDown={(e) => handleMouseDown(e, 'crop_resize_tl')}
              />
              <div 
                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-yellow-400 border border-black cursor-nwse-resize"
                  onMouseDown={(e) => handleMouseDown(e, 'crop_resize_br')}
              />
              <div className="absolute top-0 left-0 bg-yellow-400 text-black text-[9px] px-1 font-bold">
                  {Math.round(crop.w)}x{Math.round(crop.h)}
              </div>
          </div>
      );
  };


  const processVideo = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    setProgress(0);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Strict Integer Clamping for Source
    // We strictly use integer coordinates to avoid sub-pixel blurring or off-by-one errors.
    const sX = Math.round(Math.max(0, crop.x));
    const sY = Math.round(Math.max(0, crop.y));
    const sW = Math.round(Math.min(crop.w, video.videoWidth - sX));
    const sH = Math.round(Math.min(crop.h, video.videoHeight - sY));

    if (sW <= 0 || sH <= 0) {
        alert("Invalid Crop Area");
        setIsProcessing(false);
        return;
    }

    // Output Dimensions depend on Crop Size * Scale
    const targetW = Math.floor(sW * scale);
    const targetH = Math.floor(sH * scale);
    
    const totalFrames = estimatedFrames || 1;
    const cols = Math.ceil(Math.sqrt(totalFrames));
    const rows = Math.ceil(totalFrames / cols);

    canvas.width = cols * targetW;
    canvas.height = rows * targetH;

    video.pause();
    let frameCount = 0;
    const interval = 1 / captureFps;

    // Sort segments by start time
    const sortedSegments = [...segments].sort((a, b) => a.start - b.start);

    for (const seg of sortedSegments) {
        let t = seg.start;
        // Small buffer to ensure we catch the end frame
        while (t < seg.end + 0.01) {
            video.currentTime = t;
            await new Promise<void>(resolve => {
                const onSeek = () => {
                    video.removeEventListener('seeked', onSeek);
                    resolve();
                };
                video.addEventListener('seeked', onSeek);
            });

            const c = frameCount % cols;
            const r = Math.floor(frameCount / cols);
            
            // Draw cropped region
            ctx.drawImage(
                video, 
                sX, sY, sW, sH, // Source (Clamped & Rounded)
                c * targetW, r * targetH, targetW, targetH // Dest (Scaled)
            );
            
            frameCount++;
            t += interval;
            
            setProgress(Math.round((frameCount / totalFrames) * 100));
            await new Promise(r => setTimeout(r, 0));
        }
    }

    const dataUrl = canvas.toDataURL('image/png');
    // Pass EXACT dimensions to parent to avoid re-calculation errors
    onConfirm(dataUrl, { 
        rows, 
        cols, 
        totalFrames: frameCount, 
        frameWidth: targetW, 
        frameHeight: targetH 
    });
    setIsProcessing(false);
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 select-none">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[90vw] h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-800/50">
           <div className="flex items-center gap-2 text-gray-100 font-semibold">
               <Film className="text-blue-500" />
               <span>Import Video Sequence</span>
           </div>
           <button onClick={onCancel} className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"><X size={20}/></button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
           
           {/* LEFT: Video & Timeline */}
           <div className="flex-1 flex flex-col bg-black relative min-h-0">
               
               {/* Video Area */}
               <div ref={videoContainerRef} className="flex-1 relative bg-gray-950 flex items-center justify-center overflow-hidden">
                   <video 
                      ref={videoRef}
                      src={videoUrl}
                      onLoadedMetadata={handleMetadata}
                      onTimeUpdate={handleTimeUpdate}
                      className="max-w-full max-h-full object-contain"
                      onEnded={() => setIsPlaying(false)}
                      muted
                   />
                   {/* Crop Overlay */}
                   {renderCropOverlay()}
               </div>

               {/* Timeline Area */}
               <div className="h-32 bg-gray-900 border-t border-gray-800 shrink-0 flex flex-col">
                  
                  {/* Controls Toolbar */}
                  <div className="h-10 border-b border-gray-800 flex items-center px-4 gap-4 bg-gray-800/30">
                      <button onClick={togglePlay} className="text-white hover:text-blue-400">
                         {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                      </button>
                      <div className="text-sm font-mono text-blue-200 w-24">
                          {formatTime(currentTime)}
                      </div>
                      
                      <div className="h-4 w-px bg-gray-700 mx-2" />
                      
                      <button 
                         onClick={() => setIsCropping(!isCropping)}
                         className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
                             isCropping ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white'
                         }`}
                      >
                          {isCropping ? <MousePointer2 size={12}/> : <CropIcon size={12} />}
                          {isCropping ? 'Finish Crop' : 'Crop Video'}
                      </button>

                      <div className="h-4 w-px bg-gray-700 mx-2" />

                      <button onClick={addSegment} className="flex items-center gap-1 text-xs text-gray-300 hover:text-white bg-gray-800 px-2 py-1 rounded border border-gray-700">
                          <Plus size={12} /> New Cut
                      </button>
                      
                      <div className="flex-1" />
                      <div className="text-xs text-gray-500">Duration: {formatTime(duration)}</div>
                  </div>

                  {/* The Track */}
                  <div className="flex-1 relative px-4 py-4 cursor-text group" 
                       ref={timelineRef}
                       onMouseDown={(e) => handleMouseDown(e, 'playhead')}
                  >
                      {/* Background Ruler */}
                      <div className="absolute inset-x-4 top-4 h-8 bg-gray-800 rounded overflow-hidden pointer-events-none">
                         <div className="w-full h-full opacity-10" 
                              style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 19px, #fff 20px)' }} 
                         />
                      </div>

                      {/* Segments */}
                      {segments.map(seg => {
                          const leftPct = (seg.start / duration) * 100;
                          const widthPct = ((seg.end - seg.start) / duration) * 100;
                          
                          return (
                              <div 
                                key={seg.id}
                                className="absolute top-4 h-8 bg-blue-600/60 border border-blue-400 rounded cursor-move group/segment"
                                style={{ 
                                    left: `calc(${leftPct}% + 16px)`, // 16px padding offset
                                    width: `calc(${widthPct}% - 2px)` 
                                }}
                                onMouseDown={(e) => {
                                   // Simple segment select/move intent could go here
                                }}
                              >
                                  {/* Left Handle */}
                                  <div 
                                    className="absolute top-0 bottom-0 left-0 w-3 bg-blue-400 hover:bg-white cursor-ew-resize flex items-center justify-center z-10"
                                    onMouseDown={(e) => handleMouseDown(e, 'segment_start', seg.id)}
                                  >
                                      <div className="w-0.5 h-3 bg-black/30" />
                                  </div>

                                  {/* Label */}
                                  <div className="absolute top-0 left-0 right-0 -mt-5 text-[10px] text-blue-400 text-center opacity-0 group-hover/segment:opacity-100 whitespace-nowrap pointer-events-none">
                                      {formatTime(seg.start)} - {formatTime(seg.end)}
                                  </div>

                                  {/* Right Handle */}
                                  <div 
                                    className="absolute top-0 bottom-0 right-0 w-3 bg-blue-400 hover:bg-white cursor-ew-resize flex items-center justify-center z-10"
                                    onMouseDown={(e) => handleMouseDown(e, 'segment_end', seg.id)}
                                  >
                                      <div className="w-0.5 h-3 bg-black/30" />
                                  </div>
                              </div>
                          );
                      })}

                      {/* Playhead */}
                      <div 
                        className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
                        style={{ left: `calc(${(currentTime / duration) * 100}% + 16px)` }}
                      >
                          <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rotate-45" />
                      </div>

                  </div>
               </div>
           </div>

           {/* RIGHT: Settings Panel */}
           <div className="w-full lg:w-72 bg-gray-900 border-l border-gray-700 flex flex-col shrink-0">
               
               <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                   
                   {/* 1. Time Segments List */}
                   <div className="space-y-3">
                       <div className="text-xs font-bold text-gray-400 uppercase flex justify-between">
                           <span>Active Cuts</span>
                           <span className="text-gray-600">{segments.length}</span>
                       </div>
                       <div className="space-y-2">
                           {segments.map((seg, i) => (
                               <div key={seg.id} className="bg-gray-800 p-2 rounded border border-gray-700 space-y-1">
                                   <div className="flex items-center justify-between mb-1">
                                       <span className="text-xs text-blue-200 font-mono font-bold">Cut {i+1}</span>
                                       {segments.length > 1 && (
                                           <button onClick={() => removeSegment(seg.id)} className="text-gray-500 hover:text-red-400">
                                               <Trash2 size={12} />
                                           </button>
                                       )}
                                   </div>
                                   <div className="flex items-center gap-1">
                                       <span className="text-[10px] text-gray-500 w-6">In</span>
                                       <input 
                                          type="number" step="0.1" value={Number(seg.start).toFixed(2)}
                                          onChange={(e) => updateSegment(seg.id, 'start', parseFloat(e.target.value))}
                                          className="flex-1 bg-black/20 border border-gray-600 rounded px-1 text-xs py-0.5 font-mono"
                                       />
                                   </div>
                                   <div className="flex items-center gap-1">
                                       <span className="text-[10px] text-gray-500 w-6">Out</span>
                                       <input 
                                          type="number" step="0.1" value={Number(seg.end).toFixed(2)}
                                          onChange={(e) => updateSegment(seg.id, 'end', parseFloat(e.target.value))}
                                          className="flex-1 bg-black/20 border border-gray-600 rounded px-1 text-xs py-0.5 font-mono"
                                       />
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>

                   <hr className="border-gray-800" />

                   {/* 2. Crop Settings (Conditional) */}
                   {isCropping && (
                       <div className="space-y-3 bg-yellow-900/10 p-2 rounded border border-yellow-800/30">
                           <div className="flex items-center justify-between">
                                <div className="text-xs font-bold text-yellow-500 uppercase flex items-center gap-2">
                                    <CropIcon size={12} /> Crop Dimensions
                                </div>
                                <button onClick={resetCrop} className="text-[10px] text-yellow-400 hover:text-white flex items-center gap-1 bg-yellow-900/40 px-1.5 py-0.5 rounded border border-yellow-800">
                                    <RotateCcw size={10} /> Reset
                                </button>
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500">X</label>
                                    <input type="number" value={Math.round(crop.x)} onChange={(e) => updateCrop('x', parseInt(e.target.value))} className="w-full bg-black/30 border border-gray-700 rounded p-1 text-xs font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500">Y</label>
                                    <input type="number" value={Math.round(crop.y)} onChange={(e) => updateCrop('y', parseInt(e.target.value))} className="w-full bg-black/30 border border-gray-700 rounded p-1 text-xs font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500">Width</label>
                                    <input type="number" value={Math.round(crop.w)} onChange={(e) => updateCrop('w', parseInt(e.target.value))} className="w-full bg-black/30 border border-gray-700 rounded p-1 text-xs font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500">Height</label>
                                    <input type="number" value={Math.round(crop.h)} onChange={(e) => updateCrop('h', parseInt(e.target.value))} className="w-full bg-black/30 border border-gray-700 rounded p-1 text-xs font-mono" />
                                </div>
                           </div>
                           <p className="text-[9px] text-gray-500 text-right">Source: {videoDims.w}x{videoDims.h}</p>
                       </div>
                   )}
                   
                   {/* 3. Output Settings */}
                   <div className="space-y-4">
                       <div className="text-xs font-bold text-gray-400 uppercase">Export Settings</div>
                       
                       <div className="space-y-1">
                           <div className="flex justify-between text-xs text-gray-300">
                               <span>Capture FPS</span>
                               <span className="font-mono text-blue-300">{captureFps}</span>
                           </div>
                           <input 
                              type="range" min="1" max="60" value={captureFps} 
                              onChange={(e) => setCaptureFps(parseInt(e.target.value))}
                              className="w-full h-1 bg-gray-700 rounded appearance-none accent-blue-500"
                           />
                       </div>

                       <div className="space-y-1">
                           <div className="flex justify-between text-xs text-gray-300">
                               <span>Scale Size</span>
                               <span className="font-mono text-blue-300">{Math.round(scale * 100)}%</span>
                           </div>
                           <input 
                              type="range" min="0.1" max="1" step="0.1" value={scale} 
                              onChange={(e) => setScale(parseFloat(e.target.value))}
                              className="w-full h-1 bg-gray-700 rounded appearance-none accent-blue-500"
                           />
                           {/* Display Final Frame Size estimate */}
                           <p className="text-[10px] text-gray-500 text-right">
                               Sprite Size: {Math.floor(crop.w * scale)}x{Math.floor(crop.h * scale)}px
                           </p>
                       </div>
                   </div>

                   {estimatedFrames > 300 && (
                       <div className="bg-orange-900/20 border border-orange-700/50 p-2 rounded flex gap-2 items-start">
                           <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={14} />
                           <p className="text-[11px] text-orange-200 leading-tight">
                               <strong>{estimatedFrames} frames.</strong> This might crash the browser. Try reducing FPS or cutting shorter segments.
                           </p>
                       </div>
                   )}
               </div>

               {/* Footer Action */}
               <div className="p-4 border-t border-gray-800 bg-gray-800/30">
                    <button 
                        onClick={processVideo}
                        disabled={isProcessing}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait transition-all"
                    >
                        {isProcessing ? (
                            <><Loader2 className="animate-spin" size={18}/> Processing {progress}%</>
                        ) : (
                            <><Film size={18} /> Import {estimatedFrames} Frames</>
                        )}
                    </button>
               </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default VideoProcessorModal;
