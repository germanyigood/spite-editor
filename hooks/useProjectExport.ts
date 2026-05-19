
import { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { createProjectBundle, blobToBase64, downloadMultipleFilesSeq } from '../utils';
import { collectGraphData } from '../components/NodeEditor/graphExport';
import JSZip from 'jszip';
import { ExportType } from '../components/panels/ExportPanel';

export const useProjectExport = () => {
    const { state } = useProject();
    const { animations, projectName, activeAnimationId } = state;
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (type: ExportType, packAsArchive = true) => {
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

            // 2. Visual Output (PNG / ZIP / Multi-file)
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
                    // Single Output: Direct PNG download (archive setting doesn't matter for 1 file)
                    const key = outputKeys[0];
                    const blob = data.outputs[key];
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${safeProjectName}_${key}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                } else {
                    if (packAsArchive) {
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
                    } else {
                        // Unpacked: Multi-file sequential download
                        const filesToDownload = outputKeys.map(key => ({
                            filename: `${safeProjectName}_${key}.png`,
                            blob: data.outputs[key]
                        }));
                        await downloadMultipleFilesSeq(filesToDownload);
                    }
                }
                return;
            }

            // 3. TS Code / SFTS / SFA Integrations
            if (type === 'ts' || type === 'sfts' || type === 'sfa') {
                const sftsBlobs: Record<string, Blob> = {};
                const sfaData: any = { meta: { version: "1.0" }, animations: {} };
                const entries: string[] = [];
                const importStatements: string[] = [];
                
                for (const anim of animations) {
                    const data = await collectGraphData(anim);
                    if (!data) continue;
                    
                    const outputKeys = Object.keys(data.outputs);
                    let imageValueForTsCode = "";
                    let imageValueForSftsSfa: any;

                    if (type === 'ts') {
                        // Original base64 embedding
                        if (outputKeys.length === 1 && outputKeys[0] === 'default') {
                            const base64 = await blobToBase64(data.outputs['default']);
                            imageValueForTsCode = `"${base64}"`;
                        } else {
                            const parts: string[] = [];
                            for (const key of outputKeys) {
                                const base64 = await blobToBase64(data.outputs[key]);
                                parts.push(`"${key}": "${base64}"`);
                            }
                            imageValueForTsCode = `{\n      ${parts.join(',\n      ')}\n    }`;
                        }
                    } else {
                        // Linked files (SFTS / SFA)
                        const safeAnimName = anim.name.replace(/[^a-zA-Z0-9\-_]/g, '_');
                        if (outputKeys.length === 1 && outputKeys[0] === 'default') {
                            const filename = `${safeProjectName}_${safeAnimName}_default.png`;
                            sftsBlobs[filename] = data.outputs['default'];
                            
                            if (type === 'sfts') {
                                const importVarName = `${safeAnimName.toUpperCase()}_DEFAULT`;
                                importStatements.push(`import ${importVarName} from "./${filename}";`);
                                imageValueForSftsSfa = importVarName; // variable reference without quotes
                            } else {
                                imageValueForSftsSfa = `./${filename}`; // pure string for JSON
                            }
                        } else {
                            const tsParts: string[] = [];
                            const jsonParts: Record<string, string> = {};
                            for (const key of outputKeys) {
                                const filename = `${safeProjectName}_${safeAnimName}_${key}.png`;
                                sftsBlobs[filename] = data.outputs[key];
                                
                                if (type === 'sfts') {
                                    const importVarName = `${safeAnimName.toUpperCase()}_${key.toUpperCase()}`;
                                    importStatements.push(`import ${importVarName} from "./${filename}";`);
                                    tsParts.push(`"${key}": ${importVarName}`);
                                }
                                jsonParts[key] = `./${filename}`;
                            }
                            imageValueForSftsSfa = type === 'sfa' ? jsonParts : `{\n      ${tsParts.join(',\n      ')}\n    }`;
                        }
                    }
                    
                    const framesJson = JSON.stringify(data.meta.frames, null, 6)
                        .replace(/"([^"]+)":/g, '$1:')
                        .replace(/\n\s{6}/g, '\n        ');

                    const layoutElements = (anim.layout?.elements || []).map(({ locked, ...rest }) => rest);
                    const layoutObj = { elements: layoutElements };

                    const layoutJson = JSON.stringify(layoutObj, null, 6)
                        .replace(/"([^"]+)":/g, '$1:')
                        .replace(/\n\s{6}/g, '\n        ');
                        
                    if (type === 'ts' || type === 'sfts') {
                        const imgVal = type === 'ts' ? imageValueForTsCode : imageValueForSftsSfa;
                        entries.push(`    "${data.name}": {\n      fps: ${data.meta.fps},\n      loop: ${data.meta.loop},\n      frames: ${framesJson},\n      layout: ${layoutJson},\n      image: ${imgVal}\n    }`);
                    } else if (type === 'sfa') {
                        sfaData.animations[data.name] = {
                            fps: data.meta.fps,
                            loop: data.meta.loop,
                            frames: data.meta.frames,
                            layout: layoutObj,
                            image: imageValueForSftsSfa
                        };
                    }
                }
                
                // Finalize Text File Content
                let textContent = "";
                let textFilename = "";
                let archiveExt = "";
                
                if (type === 'ts') {
                    textContent = `export default {\n  meta: { version: "1.0" },\n  animations: {\n${entries.join(',\n')}\n  }\n};\n`;
                    textFilename = `${safeProjectName}.ts`;
                } else if (type === 'sfts') {
                    const importsContent = importStatements.length > 0 ? importStatements.join('\n') + '\n\n' : '';
                    textContent = `${importsContent}export default {\n  meta: { version: "1.0" },\n  animations: {\n${entries.join(',\n')}\n  }\n};\n`;
                    textFilename = `${safeProjectName}.ts`;
                    archiveExt = 'sfts';
                } else if (type === 'sfa') {
                    textContent = JSON.stringify(sfaData, null, 2);
                    textFilename = `${safeProjectName}.json`;
                    archiveExt = 'sfa';
                }

                const textBlob = new Blob([textContent], { type: (type === 'sfa' ? 'application/json' : 'application/typescript') });

                // Dispatch Download
                if (type === 'ts') {
                    // TS just downloads the text blob
                    const url = URL.createObjectURL(textBlob);
                    const a = document.createElement('a'); 
                    a.href = url; 
                    a.download = textFilename; 
                    a.click();
                    URL.revokeObjectURL(url);
                } else {
                    // SFTS and SFA handle multi file or archive
                    if (packAsArchive) {
                        const zip = new JSZip();
                        zip.file(textFilename, textBlob);
                        Object.entries(sftsBlobs).forEach(([name, blob]) => {
                            zip.file(name, blob);
                        });
                        const zipBlob = await zip.generateAsync({ type: 'blob' });
                        const url = URL.createObjectURL(zipBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${safeProjectName}.${archiveExt}`;
                        a.click();
                        URL.revokeObjectURL(url);
                    } else {
                        // Multi-file download sequentially unpacked
                        const filesToDownload: { filename: string, blob: Blob }[] = [
                            { filename: textFilename, blob: textBlob }
                        ];
                        Object.entries(sftsBlobs).forEach(([name, blob]) => {
                            filesToDownload.push({ filename: name, blob });
                        });
                        
                        await downloadMultipleFilesSeq(filesToDownload);
                    }
                }
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
