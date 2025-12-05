
import React, { useRef, useState } from 'react';
import { Plus, Trash2, Copy, GripVertical, Play, ArrowRight, ArrowLeft } from 'lucide-react';

interface TimelineProps {
  frames: number[]; // Array of indices pointing to generatedFrames
  generatedFrames: string[]; // Actual image data
  onUpdateFrames: (newFrames: number[]) => void;
  selectedFrameIndex: number | null; // Currently selected index in the timeline (time cursor)
  onSelectTimelineFrame: (index: number) => void;
  onAddNewFrame: () => void;
}

const Timeline: React.FC<TimelineProps> = ({ 
  frames, 
  generatedFrames, 
  onUpdateFrames, 
  selectedFrameIndex, 
  onSelectTimelineFrame,
  onAddNewFrame
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    const newFrames = [...frames];
    const [movedItem] = newFrames.splice(draggedIndex, 1);
    newFrames.splice(dropIndex, 0, movedItem);
    
    onUpdateFrames(newFrames);
    setDraggedIndex(null);
    onSelectTimelineFrame(dropIndex);
  };

  const removeFrame = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const newFrames = frames.filter((_, i) => i !== index);
    onUpdateFrames(newFrames);
  };

  const duplicateFrame = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const newFrames = [...frames];
    // Insert copy after current
    newFrames.splice(index + 1, 0, frames[index]);
    onUpdateFrames(newFrames);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-t border-gray-800">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
          <Play size={14} /> Timeline
        </div>
        <button 
          onClick={onAddNewFrame}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
        >
          <Plus size={14} /> Add Frame
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar p-4 flex items-center gap-2">
        {frames.length === 0 && (
           <div className="text-gray-600 text-sm italic w-full text-center">Drag frames from the canvas or click "Add Frame"</div>
        )}
        
        {frames.map((sourceFrameIdx, timelineIndex) => {
          const imgSrc = generatedFrames[sourceFrameIdx];
          const isActive = timelineIndex === selectedFrameIndex;

          return (
            <div
              key={`${timelineIndex}-${sourceFrameIdx}`}
              draggable
              onDragStart={(e) => handleDragStart(e, timelineIndex)}
              onDragOver={(e) => handleDragOver(e, timelineIndex)}
              onDrop={(e) => handleDrop(e, timelineIndex)}
              onClick={() => onSelectTimelineFrame(timelineIndex)}
              className={`
                group relative flex-shrink-0 w-24 h-24 rounded-lg border-2 transition-all cursor-pointer
                flex flex-col bg-gray-950 select-none
                ${isActive ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-gray-700 hover:border-gray-500'}
                ${draggedIndex === timelineIndex ? 'opacity-50' : 'opacity-100'}
              `}
            >
              {/* Header: Index */}
              <div className="absolute top-0 left-0 bg-black/60 text-[10px] text-white px-1.5 rounded-br z-10 font-mono">
                {timelineIndex + 1}
              </div>

              {/* Source Ref */}
              <div className="absolute bottom-0 right-0 bg-black/60 text-[9px] text-gray-400 px-1.5 rounded-tl z-10 font-mono">
                 Src: {sourceFrameIdx + 1}
              </div>

              {/* Image Thumbnail */}
              <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden p-1 checkerboard rounded-md">
                 {imgSrc ? (
                   <img src={imgSrc} className="max-w-full max-h-full object-contain pixelated" draggable={false} />
                 ) : (
                   <span className="text-[10px] text-red-500">Error</span>
                 )}
              </div>

              {/* Hover Controls */}
              <div className={`
                 absolute -top-3 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20
                 ${isActive ? 'opacity-100' : ''}
              `}>
                <button 
                  onClick={(e) => duplicateFrame(e, timelineIndex)}
                  title="Duplicate"
                  className="p-1 bg-gray-800 border border-gray-600 rounded text-gray-300 hover:text-white hover:border-white shadow-md"
                >
                  <Copy size={12} />
                </button>
                <button 
                  onClick={(e) => removeFrame(e, timelineIndex)}
                  title="Remove"
                  className="p-1 bg-gray-800 border border-gray-600 rounded text-red-400 hover:text-red-200 hover:border-red-400 shadow-md"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
