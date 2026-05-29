export type ActionId = 
    | 'core.undo'
    | 'core.redo'
    | 'core.save'
    | 'core.delete'
    | 'tool.select'
    | 'tool.move'
    | 'tool.nodes'
    | 'tool.layout'
    | 'tool.draw'
    | 'canvas.pan.start'
    | 'canvas.pan.end';

export interface KeyBinding {
    key: string;
    action: ActionId;
    scope: string;
}

export const defaultKeymap: KeyBinding[] = [
    // Global Commands
    { key: "Mod+Z", action: "core.undo", scope: "global" },
    { key: "Mod+Y", action: "core.redo", scope: "global" }, // Windows Redo
    { key: "Mod+Shift+Z", action: "core.redo", scope: "global" }, // Mac Redo
    { key: "Mod+S", action: "core.save", scope: "global" },
    
    // Tools
    { key: "V", action: "tool.select", scope: "global" },
    { key: "M", action: "tool.move", scope: "global" },
    { key: "N", action: "tool.nodes", scope: "global" },
    { key: "L", action: "tool.layout", scope: "global" },
    { key: "B", action: "tool.draw", scope: "global" },

    // Contextual Overrides Sprite Editor
    { key: "Space:down", action: "canvas.pan.start", scope: "sprite-editor" },
    { key: "Space:up", action: "canvas.pan.end", scope: "sprite-editor" },

    // Polymorphic keys (Delete acts differently based on scope)
    { key: "Delete", action: "core.delete", scope: "global" }, 
    { key: "Backspace", action: "core.delete", scope: "global" }
];
