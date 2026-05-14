
import { useState, useRef, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';

export const usePanelResizer = () => {
    const { state, dispatch } = useProject();
    const { uiState } = state;

    // Local state for smooth dragging (syncs to global on mouse up)
    const [rightPanelWidth, setRightPanelWidth] = useState(uiState.rightSidebarWidth);
    const [timelineHeight, setTimelineHeight] = useState(uiState.timelineHeight);

    const isResizingRight = useRef(false);
    const isResizingTimeline = useRef(false);

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (isResizingRight.current) {
                const newW = document.body.clientWidth - e.clientX;
                if (newW > 280 && newW < 600) setRightPanelWidth(newW);
            }
            if (isResizingTimeline.current) {
                const newH = document.body.clientHeight - e.clientY;
                if (newH > 120 && newH < 600) setTimelineHeight(newH);
            }
        };

        const handleUp = () => {
            if (isResizingRight.current) {
                isResizingRight.current = false;
                dispatch({ type: 'SET_UI_PANEL_SIZE', payload: { rightSidebarWidth: rightPanelWidth } });
            }
            if (isResizingTimeline.current) {
                isResizingTimeline.current = false;
                dispatch({ type: 'SET_UI_PANEL_SIZE', payload: { timelineHeight: timelineHeight } });
            }
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        return () => { 
            document.removeEventListener('mousemove', handleMove); 
            document.removeEventListener('mouseup', handleUp); 
        };
    }, [rightPanelWidth, timelineHeight, dispatch]);

    return {
        rightPanelWidth,
        timelineHeight,
        startResizeRight: () => { isResizingRight.current = true; document.body.style.cursor = 'col-resize'; },
        startResizeTimeline: () => { isResizingTimeline.current = true; document.body.style.cursor = 'row-resize'; }
    };
};
