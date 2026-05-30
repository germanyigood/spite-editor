import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { ActionId, KeyBinding } from './keymap';
import { actionRegistry } from './ActionRegistry';
import { normalizeKey, shouldIgnoreEvent } from './utils';

interface HotkeyEngineContextType {
    activeScope: string;
    setActiveScope: (scope: string) => void;
}

const HotkeyEngineContext = createContext<HotkeyEngineContextType | undefined>(undefined);

export const useHotkeyEngine = () => {
    const context = useContext(HotkeyEngineContext);
    if (!context) {
        throw new Error('useHotkeyEngine must be used within HotkeyEngineProvider');
    }
    return context;
};

export const HotkeyEngineProvider: React.FC<{ children: ReactNode; defaultKeymap: KeyBinding[] }> = ({ children, defaultKeymap }) => {
    const [activeScope, setActiveScopeState] = useState<string>('global');
    const activeScopeRef = useRef('global'); // For inside event listeners

    const setActiveScope = (scope: string) => {
        activeScopeRef.current = scope;
        setActiveScopeState(scope);
    };

    useEffect(() => {
        const handleKeyEvent = (e: KeyboardEvent, isKeyUp: boolean) => {
            if (shouldIgnoreEvent(e)) return;

            const combination = normalizeKey(e, isKeyUp);
            if (!combination) return;

            // 1. Find ActionId for combination
            // Check active scope bindings first
            let binding = defaultKeymap.find(b => b.key === combination && b.scope === activeScopeRef.current);
            if (!binding) {
                // Fallback to global bindings
                binding = defaultKeymap.find(b => b.key === combination && b.scope === 'global');
            }

            if (binding) {
                // 2. We have an ActionId. Now try to execute it.
                // Try active scope handler
                let handler = actionRegistry.getHandler(activeScopeRef.current, binding.action);
                if (!handler && activeScopeRef.current !== 'global') {
                    // Fallback to global handler
                    handler = actionRegistry.getHandler('global', binding.action);
                }

                if (handler) {
                    handler();
                    e.preventDefault();
                    e.stopPropagation();
                } else if (e.key === 'Backspace' || e.key === 'Delete') {
                    // Prevent Backspace navigating back even if no handler is registered
                    e.preventDefault();
                }
            }
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.repeat && e.key !== 'Space') return; 
            handleKeyEvent(e, false);
        };
        const onKeyUp = (e: KeyboardEvent) => {
            // Only handle keyUp if the key normally produces a different combo, like Space:up
            if (e.key === ' ') {
                handleKeyEvent(e, true);
            }
        };

        window.addEventListener('keydown', onKeyDown, { capture: true });
        window.addEventListener('keyup', onKeyUp, { capture: true });

        return () => {
            window.removeEventListener('keydown', onKeyDown, { capture: true });
            window.removeEventListener('keyup', onKeyUp, { capture: true });
        };
    }, [defaultKeymap]);

    return (
        <HotkeyEngineContext.Provider value={{ activeScope, setActiveScope }}>
            {children}
        </HotkeyEngineContext.Provider>
    );
};

// The generic hook to register an action listener
export function useActionHandler(scope: string, actionId: ActionId, handler: () => void, deps: React.DependencyList = []) {
    useEffect(() => {
        const unregister = actionRegistry.register(scope, actionId, handler);
        return () => unregister();
    }, deps); // Re-bind when deps change
}
