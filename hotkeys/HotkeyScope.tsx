import React, { ReactNode } from 'react';
import { useHotkeyEngine } from './HotkeyEngineContext';

interface HotkeyScopeProps {
    scope: string;
    children: ReactNode;
    className?: string;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export const HotkeyScope: React.FC<HotkeyScopeProps> = ({ scope, children, className, onClick }) => {
    const { setActiveScope } = useHotkeyEngine();

    const handleFocus = (e: React.MouseEvent<HTMLDivElement> | React.FocusEvent<HTMLDivElement>) => {
        setActiveScope(scope);
    };

    return (
        <div 
            className={className} 
            onMouseDownCapture={handleFocus}
            onFocusCapture={handleFocus}
            onClick={onClick}
        >
            {children}
        </div>
    );
};
