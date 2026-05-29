export function normalizeKey(e: KeyboardEvent, isKeyUp: boolean = false): string {
    const parts: string[] = [];
    
    if (e.ctrlKey || e.metaKey) parts.push("Mod");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");

    // Check specific keys
    let key = e.key;

    // Normalizing the character
    if (key === ' ') {
        key = 'Space';
    } else if (key.length === 1) {
        key = key.toUpperCase();
    } else if (key === 'Delete') {
        key = 'Delete';
    } else if (key === 'Backspace') {
        key = 'Backspace';
    } else if (key === 'Enter') {
        key = 'Enter';
    } else if (key === 'Escape') {
        key = 'Escape';
    }

    // Ignore standalone modifier keys to avoid tracking "Mod" or "Shift" alone
    const isStandaloneModifier = ['Control', 'Shift', 'Alt', 'Meta'].includes(key);
    if (!isStandaloneModifier) {
        parts.push(key);
    }
    
    let combination = parts.join("+");
    
    // Add down/up suffix if it's Space (or others later)
    if (key === 'Space') {
        combination += isKeyUp ? ':up' : ':down';
    }

    return combination;
}

export function shouldIgnoreEvent(e: KeyboardEvent, isFormFriendlyKey: boolean = false): boolean {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    if (isInput) {
        // Exclude Escape and Enter maybe? If it's a form action?
        // Let's be strict: if it's an input, only execute if explicitly flagged, but we can return true for now unless it's Escape
        if (e.key === 'Escape') return false; 
        return true;
    }
    return false;
}
