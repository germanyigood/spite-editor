
/**
 * Fast and Stable Object Hashing
 * 
 * 1. Canonical Stringify: Recursively sorts object keys to ensure {a:1, b:2} === {b:2, a:1}
 * 2. FNV-1a Hash: Fast non-cryptographic hash to convert the string into a short signature.
 */

// FNV-1a 32-bit constants
const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

const stableStringify = (val: any): string => {
    // Primitives
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val !== 'object') {
        // Ensure consistent float formatting if needed, but JSON.stringify usually handles it well enough for this
        return JSON.stringify(val);
    }

    // Arrays
    if (Array.isArray(val)) {
        // We do NOT sort arrays by default as order usually matters in arrays (e.g. coordinates, frames)
        // Unless specifically needed, we map recursively.
        return '[' + val.map(stableStringify).join(',') + ']';
    }

    // Objects (The important part: Sort keys)
    const keys = Object.keys(val).sort();
    const parts: string[] = [];
    
    for (const key of keys) {
        // Skip undefined values to match JSON behavior (optional, but cleaner)
        if (val[key] === undefined) continue; 
        parts.push(JSON.stringify(key) + ':' + stableStringify(val[key]));
    }
    
    return '{' + parts.join(',') + '}';
};

export const fastHash = (str: string): string => {
    let hash = FNV_OFFSET_BASIS;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        // Math.imul provides C-like 32-bit multiplication semantics
        hash = Math.imul(hash, FNV_PRIME);
    }
    // Force unsigned 32-bit integer
    return (hash >>> 0).toString(16);
};

export const stableHash = (value: any): string => {
    const canonical = stableStringify(value);
    return fastHash(canonical);
};
