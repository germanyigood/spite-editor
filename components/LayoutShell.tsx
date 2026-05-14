
import React, { useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface LayoutShellProps {
    // Slots
    leftPanel?: React.ReactNode;
    rightPanel?: React.ReactNode;
    bottomPanel?: React.ReactNode;
    mainPanel: React.ReactNode;
    
    // Configuration
    showLeft: boolean;
    showRight: boolean;
    showTimeline: boolean;
    
    // Dimensions & Resizing
    rightPanelWidth: number;
    timelineHeight: number;
    onResizePanel: (panel: 'right' | 'timeline', size: number) => void;
    
    // Refs
    viewportRef: React.RefObject<HTMLDivElement>;
}

export const LayoutShell: React.FC<LayoutShellProps> = ({
    leftPanel,
    rightPanel,
    bottomPanel,
    mainPanel,
    showLeft,
    showRight,
    showTimeline,
    rightPanelWidth,
    timelineHeight,
    onResizePanel,
    viewportRef
}) => {
    // --- RESIZE LOGIC ---
    const isResizingRight = useRef(false);
    const isResizingTimeline = useRef(false);

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (isResizingRight.current) {
                const newW = document.body.clientWidth - e.clientX;
                if (newW > 280 && newW < 600) onResizePanel('right', newW);
            }
            if (isResizingTimeline.current) {
                const newH = document.body.clientHeight - e.clientY;
                if (newH > 120 && newH < 600) onResizePanel('timeline', newH);
            }
        };
        const handleUp = () => {
            isResizingRight.current = false;
            isResizingTimeline.current = false;
            document.body.style.cursor = 'default';
        };
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        return () => { 
            document.removeEventListener('mousemove', handleMove); 
            document.removeEventListener('mouseup', handleUp); 
        };
    }, [onResizePanel]);

    return (
        <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT SIDEBAR */}
            {showLeft && leftPanel}

            {/* CENTER COLUMN (Main + Bottom) */}
            <section className="flex-1 flex flex-col min-w-0 bg-transparent relative">
                
                {/* VIEWPORT AREA */}
                <div 
                    ref={viewportRef} 
                    className="flex-1 relative overflow-hidden bg-transparent"
                >
                    {mainPanel}
                </div>

                {/* TIMELINE RESIZER & PANEL */}
                {showTimeline && (
                    <>
                        <div
                            className="h-1 bg-border-base/5 border-t border-border-base/5 cursor-row-resize hover:bg-violet-500 z-20 w-full transition-colors"
                            onMouseDown={() => { isResizingTimeline.current = true; document.body.style.cursor = 'row-resize'; }}
                        />
                        <div className="shrink-0 relative z-10" style={{ height: timelineHeight }}>
                            {bottomPanel}
                        </div>
                    </>
                )}
                
            </section>

            {/* RIGHT RESIZER & SIDEBAR */}
            {showRight && (
                <>
                    <div
                        className="w-1 bg-border-base/5 border-l border-r border-border-base/5 cursor-col-resize hover:bg-violet-500 hover:border-violet-500 z-30 flex items-center justify-center transition-colors"
                        onMouseDown={() => { isResizingRight.current = true; document.body.style.cursor = 'col-resize'; }}
                    >
                        <GripVertical size={10} className="text-gray-600" />
                    </div>
                    <div style={{ width: rightPanelWidth }} className="shrink-0 h-full">
                        {rightPanel}
                    </div>
                </>
            )}

        </div>
    );
};
