
import { NodeProcessor, NodeType } from '../../types';
import { NODE_REGISTRY, RegisteredNodeType } from './nodes2';

// --- HIGHER ORDER FUNCTION FOR BYPASS ---
// If node is disabled, we try to pass input directly to output if types match.
// If types mismatch (e.g. Grid Node: Image -> Sequence), we must return NULL to prevent downstream crashes.
const withBypass = (processor: NodeProcessor): NodeProcessor => {
    return async (node, inputs, ctx) => {
        if (node.disabled) {
            // Get Primary Input
            const input = inputs['input'] || inputs['main'] || Object.values(inputs)[0];
            if (!input) return null;

            // Check Schema Compatibility
            const bundle = NODE_REGISTRY[node.type as RegisteredNodeType];
            if (!bundle) return null;

            // We assume standard 'input' and 'output' handles for flow
            // If the node has multiple output types, we check if input type is contained in output types
            const outputTypes = bundle.io.outputs['output'];
            
            // If output is not defined (e.g. OutputNode), we can't bypass flow through it usually, 
            // but OutputNode shouldn't be disabled in a way that continues flow anyway.
            if (!outputTypes) return null;

            const allowedOutputs = Array.isArray(outputTypes) ? outputTypes : [outputTypes];
            
            // If output accepts ANY or specific type match
            if (allowedOutputs.includes('ANY') || allowedOutputs.includes(input.type)) {
                return input; // Safe pass-through
            } else {
                return null; // Logic break (e.g. Grid disabled cannot produce Sequence from Image)
            }
        }
        return processor(node, inputs, ctx);
    };
};

// --- REGISTRY GENERATION ---
// We dynamically build the processor map from the Source of Truth (NODE_REGISTRY).
// This ensures that the Graph Logic (Export) and the UI Logic (Preview) always use the exact same code.

export const NODE_PROCESSORS = Object.keys(NODE_REGISTRY).reduce((acc, key) => {
    const type = key as NodeType;
    const bundle = NODE_REGISTRY[type as RegisteredNodeType];
    
    if (bundle && bundle.processor) {
        acc[type] = withBypass(bundle.processor);
    }
    
    return acc;
}, {} as Record<NodeType, NodeProcessor>);
