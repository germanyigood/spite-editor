import { ActionId, defaultKeymap } from './keymap';

type ActionHandler = () => void | boolean;

class ActionRegistry {
    private handlers = new Map<string, Map<ActionId, ActionHandler>>();

    register(scope: string, actionId: ActionId, handler: ActionHandler) {
        if (!this.handlers.has(scope)) {
            this.handlers.set(scope, new Map());
        }
        this.handlers.get(scope)!.set(actionId, handler);
        
        return () => {
            const scopeHandlers = this.handlers.get(scope);
            if (scopeHandlers) {
                scopeHandlers.delete(actionId);
                if (scopeHandlers.size === 0) {
                    this.handlers.delete(scope);
                }
            }
        };
    }

    getHandler(scope: string, actionId: ActionId): ActionHandler | undefined {
        return this.handlers.get(scope)?.get(actionId);
    }
}

export const actionRegistry = new ActionRegistry();
