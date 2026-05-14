
import { useEffect } from 'react';

export const useKeyboardShortcuts = (handlers: {
    onUndo?: () => void;
    onRedo?: () => void;
    onSave?: () => void;
    onSelectMode?: () => void;
    onMoveMode?: () => void;
    onNodesMode?: () => void;
    onDrawMode?: () => void;
    onLayoutMode?: () => void;
}) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for input focus to avoid triggering shortcuts while typing
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            // Undo: Ctrl+Z or Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
                e.preventDefault();
                handlers.onUndo?.();
            }

            // Redo: Ctrl+Y or Cmd+Shift+Z
            if (
                ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') || 
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ')
            ) {
                e.preventDefault();
                handlers.onRedo?.();
            }

            // Save: Ctrl+S
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
                e.preventDefault();
                handlers.onSave?.();
            }

            // Tools
            if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                switch(e.code) {
                    case 'KeyV': handlers.onSelectMode?.(); break;
                    case 'KeyM': handlers.onMoveMode?.(); break;
                    case 'KeyN': handlers.onNodesMode?.(); break;
                    case 'KeyB': handlers.onDrawMode?.(); break;
                    case 'KeyL': handlers.onLayoutMode?.(); break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlers]);
};
