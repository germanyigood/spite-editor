import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFloating, offset, flip, shift, autoUpdate, useInteractions, useDismiss, useRole, FloatingPortal } from '@floating-ui/react';
import { LucideIcon } from 'lucide-react';

export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: LucideIcon;
    colorClass?: string;
    onClick: () => void;
    danger?: boolean;
}

export interface ContextMenuSeparator {
    id: string;
    separator: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

interface ContextMenuConfig {
    x: number;
    y: number;
    items: ContextMenuEntry[];
    header?: React.ReactNode;
}

interface ContextMenuProps {
    config: ContextMenuConfig | null;
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ config, onClose }) => {
    const { refs, floatingStyles, context } = useFloating({
        open: config !== null,
        onOpenChange: (open) => {
            if (!open) onClose();
        },
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [
            shift({ padding: 10 }),
            flip()
        ],
        whileElementsMounted: autoUpdate,
    });

    const dismiss = useDismiss(context);
    const role = useRole(context, { role: 'menu' });

    const { getFloatingProps } = useInteractions([
        dismiss,
        role,
    ]);

    useEffect(() => {
        if (config) {
            refs.setPositionReference({
                getBoundingClientRect() {
                    return {
                        width: 0,
                        height: 0,
                        x: config.x,
                        y: config.y,
                        left: config.x,
                        top: config.y,
                        right: config.x,
                        bottom: config.y,
                    };
                },
            });
        }
    }, [config, refs]);

    if (!config) return null;

    return (
        <FloatingPortal>
            <div
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
                className="z-[200] bg-panel border-2 border-border-base/10 shadow-[0_10px_40px_rgba(0,0,0,0.3)] rounded-lg py-1 min-w-[160px] flex flex-col max-h-[80vh] overflow-y-auto"
                onContextMenu={(e) => e.preventDefault()}
            >
                {config.header && (
                    <div className="px-3 py-1.5 text-[10px] text-txt-muted font-bold uppercase tracking-widest border-b border-border-base/10 mb-1 flex items-center justify-between sticky top-0 bg-panel z-10">
                        {config.header}
                    </div>
                )}
                {config.items.map((item, index) => {
                    if ('separator' in item) {
                        return <div key={item.id || `sep-${index}`} className="my-1 h-px bg-border-base/10 mx-3" />;
                    }

                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                item.onClick();
                                onClose();
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                                item.danger 
                                    ? 'text-red-500 hover:bg-red-500/10' 
                                    : 'text-txt-secondary hover:bg-surface/50 hover:text-txt-primary'
                            }`}
                        >
                            {item.icon && <item.icon size={14} className={`shrink-0 ${item.colorClass || (item.danger ? 'text-red-500' : '')}`}/>}
                            {item.label}
                        </button>
                    );
                })}
            </div>
        </FloatingPortal>
    );
};
