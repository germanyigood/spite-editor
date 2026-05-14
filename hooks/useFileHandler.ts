
import { useState, useCallback, RefObject } from 'react';
import { useProject } from '../context/ProjectContext';
import { loadProjectBundle, generateGridFrames, DEFAULT_SPRITE_CONFIG } from '../utils';
import { SpriteConfig, AnimationEntry } from '../types';

interface UseFileHandlerProps {
    currentAnim: AnimationEntry | undefined;
    layerCount: number;
    viewportRef: RefObject<HTMLDivElement>;
}

export const useFileHandler = ({ currentAnim, layerCount, viewportRef }: UseFileHandlerProps) => {
    const { dispatch } = useProject();
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);

    // --- CENTERING LOGIC ---
    const centerViewport = useCallback((imgW: number, imgH: number) => {
        // Only center if this is the first layer
        if (layerCount === 0 && viewportRef.current && currentAnim) {
            const vw = viewportRef.current.clientWidth;
            const vh = viewportRef.current.clientHeight;
            
            // Calculate center position
            const x = Math.floor((vw - imgW) / 2);
            const y = Math.floor((vh - imgH) / 2);
            
            // Dispatch to both cameras to ensure UI consistency across all tools
            setTimeout(() => {
                dispatch({ 
                    type: 'UPDATE_EDITOR_TRANSFORM', 
                    payload: { animId: currentAnim.id, transform: { x, y, scale: 1 } } 
                });
                dispatch({ 
                    type: 'UPDATE_LAYOUT_CAMERA', 
                    payload: { animId: currentAnim.id, transform: { x, y, scale: 1 } } 
                });
            }, 50);
        }
    }, [layerCount, currentAnim, viewportRef, dispatch]);

    const handleFileLoad = useCallback(async (file: File) => {
        // 1. Project File
        if (file.name.endsWith('.sforge') || file.type.includes('zip') || file.type.includes('compressed')) {
            try {
                setIsProcessing(true);
                const loadedData = await loadProjectBundle(file);
                if (loadedData.animations.length > 0) {
                    dispatch({ type: 'LOAD_PROJECT', payload: loadedData });
                } else {
                    setErrorMsg("Empty project file.");
                }
            } catch (e: any) {
                setErrorMsg(e.message);
            } finally {
                setIsProcessing(false);
            }
            return;
        }

        // 2. Video File
        if (file.type.startsWith('video/')) {
            setPendingVideoFile(file);
            return;
        }
        
        // 3. Image File
        if (file.type.startsWith('image/') && currentAnim) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    const src = e.target.result as string;
                    const img = new Image();
                    img.onload = () => {
                        const w = img.naturalWidth;
                        const h = img.naturalHeight;
                        
                        // Create Default Config
                        const initialFrames = generateGridFrames(1, 1, w, h, 0, 0, 0);
                        const config: SpriteConfig = { 
                            ...DEFAULT_SPRITE_CONFIG, 
                            cols: 1, rows: 1, 
                            width: w, height: h, 
                            totalFrames: 1, 
                            frames: initialFrames 
                        };
                        
                        dispatch({
                            type: 'ADD_LAYER',
                            payload: { 
                                animId: currentAnim.id, 
                                layer: { name: file.name, imageSrc: src, spriteConfig: config, width: w, height: h }
                            }
                        });

                        // Trigger Centering
                        centerViewport(w, h);
                    };
                    img.src = src;
                }
            };
            reader.readAsDataURL(file);
        }
    }, [currentAnim, dispatch, centerViewport]);

    const handleVideoConfirm = (imageSrc: string, config: any) => {
        if (!currentAnim || !pendingVideoFile) return;
        const totalW = config.frameWidth * config.cols;
        const totalH = config.frameHeight * config.rows;
        
        dispatch({ 
            type: 'ADD_LAYER', 
            payload: { 
                animId: currentAnim.id, 
                layer: { 
                    name: pendingVideoFile.name, 
                    imageSrc, 
                    spriteConfig: { ...DEFAULT_SPRITE_CONFIG, ...config, width: config.frameWidth, height: config.frameHeight }, 
                    width: totalW, height: totalH 
                }
            }
        });
        
        // Also center video imports
        centerViewport(totalW, totalH);
        setPendingVideoFile(null);
    };

    return {
        handleFileLoad,
        handleVideoConfirm,
        isProcessing,
        errorMsg,
        setErrorMsg,
        pendingVideoFile,
        setPendingVideoFile
    };
};
