


import { NodeProcessor } from '../../../../types';

export const processOutput: NodeProcessor = async (_node, inputs) => {
    // Inputs is a map now
    const main = inputs['input'] || inputs['main'] || Object.values(inputs)[0];
    const settings = inputs['settings'];

    if (!main) return null;

    // Attach optimization settings to the payload if present
    // We create a shallow copy/wrapper to avoid mutating upstream
    // Note: We are hacking the type system slightly here by attaching 'optimization' property
    // to any payload, but for export logic it works.
    if (settings && settings.type === 'OPTIMIZATION') {
        return {
            ...main,
            optimization: settings.config
        } as any;
    }

    return main;
};