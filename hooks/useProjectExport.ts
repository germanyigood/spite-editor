
import { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { createProjectBundle, blobToBase64 } from '../utils';
import { collectGraphData } from '../components/NodeEditor/graphExport';
import JSZip from 'jszip';

export const useProjectExport = () => {
    const { state } = useProject();
    const { animations, projectName, activeAnimationId } = state;
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (type: 'download' | 'clipboard' | 'json' | 'ts' | 'project' | 'zip-ts' | 'images') => {
        setIsExporting(true);
        try {
            const safeProjectName = projectName.replace(/[^a-zA-Z0-9\-_]/g, '_') || 'Project';
            
            // 1. Project Source File (.sforge)
            if (type === 'project') {
                const blob = await createProjectBundle(state);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); 
                a.href = url; 
                a.download = `${safeProjectName}.sforge`; 
                a.click();
                URL.revokeObjectURL(url);
                return;
            }

            // 2. Visual Output (PNG/ZIP)
            if (type === 'images') {
                const currentAnim = animations.find(a => a.id === activeAnimationId);
                if (!currentAnim) return;

                const data = await collectGraphData(currentAnim);
                if (!data || !data.outputs) {
                    alert("No active outputs found in the node graph.");
                    return;
                }

                const outputKeys = Object.keys(data.outputs);
                
                if (outputKeys.length === 1) {
                    // Single Output: Direct PNG download
                    const key = outputKeys[0];
                    const blob = data.outputs[key];
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${safeProjectName}_${key}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                } else {
                    // Multiple Outputs: Wrap in ZIP
                    const zip = new JSZip();
                    for (const key of outputKeys) {
                        zip.file(`${key}.png`, data.outputs[key]);
                    }
                    const zipBlob = await zip.generateAsync({ type: 'blob' });
                    const url = URL.createObjectURL(zipBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${safeProjectName}_outputs.zip`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
                return;
            }

            // 3. TypeScript Code Integration
            if (type === 'ts') {
                const entries: string[] = [];
                for (const anim of animations) {
                    const data = await collectGraphData(anim);
                    if (!data) continue;
                    let imageValue = "";
                    const outputKeys = Object.keys(data.outputs);
                    
                    if (outputKeys.length === 1 && outputKeys[0] === 'default') {
                        const base64 = await blobToBase64(data.outputs['default']);
                        imageValue = `"${base64}"`;
                    } else {
                        const parts: string[] = [];
                        for (const key of outputKeys) {
                            const base64 = await blobToBase64(data.outputs[key]);
                            parts.push(`"${key}": "${base64}"`);
                        }
                        imageValue = `{\n      ${parts.join(',\n      ')}\n    }`;
                    }
                    
                    const framesJson = JSON.stringify(data.meta.frames, null, 6)
                        .replace(/"([^"]+)":/g, '$1:')
                        .replace(/\n\s{6}/g, '\n        ');

                    const layoutElements = (anim.layout?.elements || []).map(({ locked, ...rest }) => rest);
                    const layoutObj = { elements: layoutElements };

                    const layoutJson = JSON.stringify(layoutObj, null, 6)
                        .replace(/"([^"]+)":/g, '$1:')
                        .replace(/\n\s{6}/g, '\n        ');
                        
                    entries.push(`    "${data.name}": {\n      fps: ${data.meta.fps},\n      loop: ${data.meta.loop},\n      frames: ${framesJson},\n      layout: ${layoutJson},\n      image: ${imageValue}\n    }`);
                }
                const tsContent = `export default {\n  meta: { version: "1.0" },\n  animations: {\n${entries.join(',\n')}\n  }\n};\n`;
                const blob = new Blob([tsContent], { type: 'application/typescript' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); 
                a.href = url; 
                a.download = `${safeProjectName}.ts`; 
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error("Export failed", e);
            alert("Export failed. See console for details.");
        } finally {
            setIsExporting(false);
        }
    };

    return { handleExport, isExporting };
};
