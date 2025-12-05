
import { BackgroundRemovalConfig, SpriteConfig, AnimationConfig, AnimationEntry, SourceLayer } from "./types";
import JSZip from 'jszip';

export const DEFAULT_SPRITE_CONFIG: SpriteConfig = {
  rows: 1, cols: 1, width: 0, height: 0,
  offsetX: 0, offsetY: 0, margin: 0,
  totalFrames: 1, frameOffsets: {}, showCrosshair: false
};

// Convert Hex to RGB
export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Calculate Euclidean distance between two colors
const getColorDistance = (
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
) => {
  return Math.sqrt(
    (r1 - r2) ** 2 +
    (g1 - g2) ** 2 +
    (b1 - b2) ** 2
  );
};

/**
 * Slices frames from ALL layers based on their individual configurations.
 * Returns a flat array of dataURLs.
 * The order of frames corresponds to: Layer 0 frames, Layer 1 frames, etc.
 */
export const sliceFrames = async (
  layers: SourceLayer[],
  bgConfig: BackgroundRemovalConfig
): Promise<string[]> => {
  const allFrames: string[] = [];

  // Pre-calculate RGB values for all target colors (Global BG settings for now)
  const targetColors = bgConfig.colors.map(c => ({
    rgb: hexToRgb(c.color),
    toleranceThreshold: c.tolerance * 2.5 
  }));
  const tintColor = hexToRgb(bgConfig.edgeTint);
  const radius = Math.floor(bgConfig.edgeRadius); 
  const edgeOpacityFactor = bgConfig.edgeOpacity / 100;
  const tintIntensity = bgConfig.edgeTintIntensity / 100;

  for (const layer of layers) {
      if (!layer.visible) continue;

      const img = new Image();
      img.src = layer.imageSrc;
      await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
      });

      const config = layer.spriteConfig;

      // Iterate up to totalFrames for THIS layer
      for (let i = 0; i < config.totalFrames; i++) {
          const offset = config.frameOffsets[i] || { x: 0, y: 0 };
          const frameW = offset.w !== undefined ? offset.w : config.width;
          const frameH = offset.h !== undefined ? offset.h : config.height;

          // Base calculated position (if within grid bounds)
          let sx = 0;
          let sy = 0;
          
          const gridLimit = config.rows * config.cols;
          
          if (i < gridLimit) {
              const r = Math.floor(i / config.cols);
              const c = i % config.cols;
              sx = config.offsetX + c * (config.width + config.margin);
              sy = config.offsetY + r * (config.height + config.margin);
          } else {
              // Manual frames default to 0,0 base
              sx = 0; 
              sy = 0;
          }

          sx += offset.x;
          sy += offset.y;

          // Create Canvas for this frame
          const canvas = document.createElement('canvas');
          canvas.width = frameW;
          canvas.height = frameH;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) continue;

          // Draw slice from Source Image
          ctx.drawImage(
            img,
            sx, sy, frameW, frameH, // Source from Layer Image
            0, 0, frameW, frameH    // Destination
          );

          // Apply Background Removal
          if (bgConfig.enabled && targetColors.length > 0) {
            const imageData = ctx.getImageData(0, 0, frameW, frameH);
            const data = imageData.data;
            const width = frameW;
            const height = frameH;
            
            // Pass 1: Identification
            const isBackground = new Uint8Array(width * height);
            
            for (let idx = 0; idx < data.length; idx += 4) {
              const pxIndex = idx / 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];

              if (a === 0) {
                isBackground[pxIndex] = 1;
                continue;
              }

              let isMatch = false;
              for (const target of targetColors) {
                const dist = getColorDistance(r, g, b, target.rgb.r, target.rgb.g, target.rgb.b);
                if (dist <= target.toleranceThreshold) {
                  isMatch = true;
                  break;
                }
              }

              if (isMatch) {
                isBackground[pxIndex] = 1;
                data[idx + 3] = 0; 
              } else {
                isBackground[pxIndex] = 0;
              }
            }

            // Pass 2: Spatial Softness & Tinting
            if (radius > 0) {
              for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                  const pxIndex = y * width + x;
                  if (isBackground[pxIndex]) continue;

                  let minBgDist = radius + 1;
                  for (let ky = -radius; ky <= radius; ky++) {
                    const ny = y + ky;
                    if (ny < 0 || ny >= height) continue;
                    for (let kx = -radius; kx <= radius; kx++) {
                      const nx = x + kx;
                      if (nx < 0 || nx >= width) continue;

                      const nIndex = ny * width + nx;
                      if (isBackground[nIndex]) {
                        const dist = Math.sqrt(kx*kx + ky*ky);
                        if (dist < minBgDist) minBgDist = dist;
                      }
                    }
                  }

                  if (minBgDist <= radius) {
                    const alphaIndex = pxIndex * 4 + 3;
                    const effectStrength = 1 - (minBgDist / radius);
                    const alphaMod = 1 - (effectStrength * (1 - edgeOpacityFactor));
                    data[alphaIndex] = Math.floor(data[alphaIndex] * alphaMod);

                    if (tintIntensity > 0) {
                      const rIdx = pxIndex * 4;
                      const gIdx = pxIndex * 4 + 1;
                      const bIdx = pxIndex * 4 + 2;
                      const mix = tintIntensity * effectStrength; 
                      data[rIdx] = data[rIdx] * (1 - mix) + tintColor.r * mix;
                      data[gIdx] = data[gIdx] * (1 - mix) + tintColor.g * mix;
                      data[bIdx] = data[bIdx] * (1 - mix) + tintColor.b * mix;
                    }
                  }
                }
              }
            }
            ctx.putImageData(imageData, 0, 0);
          }

          allFrames.push(canvas.toDataURL('image/png'));
      }
  }

  return allFrames;
};

// Stitch frames into a single strip for export
export const stitchFrames = async (frames: string[]): Promise<Blob | null> => {
  if (frames.length === 0) return null;

  const loadImg = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });
  };

  const images = await Promise.all(frames.map(loadImg));
  
  let totalWidth = 0;
  let maxHeight = 0;
  
  for (const img of images) {
    totalWidth += img.naturalWidth;
    maxHeight = Math.max(maxHeight, img.naturalHeight);
  }

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = maxHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return null;

  let currentX = 0;
  for (const img of images) {
    ctx.drawImage(img, currentX, 0);
    currentX += img.naturalWidth;
  }

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
};

// --- Project Import/Export ---

export const createProjectBundle = async (animations: AnimationEntry[]): Promise<Blob> => {
  const zip = new JSZip();
  const metaAnimations: any[] = [];

  for (const anim of animations) {
    // Process layers for this animation
    const processedLayers = [];
    
    if (!anim.layers || anim.layers.length === 0) {
        if (anim.imageSrc) {
            // Legacy fallback
            const base64Data = anim.imageSrc.split(',')[1];
            const fileName = `assets/${anim.id}_main.png`;
            zip.file(fileName, base64Data, { base64: true });
            processedLayers.push({
                id: 'legacy_layer',
                imageSrc: fileName,
                x: 0, y: 0, opacity: 1, visible: true, name: 'Main',
                spriteConfig: (anim as any).spriteConfig || DEFAULT_SPRITE_CONFIG
            });
        }
    } else {
        for (const layer of anim.layers) {
            const base64Data = layer.imageSrc.split(',')[1];
            const fileName = `assets/${anim.id}_${layer.id}.png`;
            zip.file(fileName, base64Data, { base64: true });
            processedLayers.push({
                ...layer,
                imageSrc: fileName
            });
        }
    }

    // Clean animation object for export (remove runtime images)
    const { imageSrc, ...animRest } = anim as any; // remove legacy imageSrc
    // We also don't export 'spriteConfig' on the root anim anymore, 
    // but we need to ensure it's not lurking if we pass the whole object.
    const { spriteConfig, ...finalAnim } = animRest; 

    metaAnimations.push({
      ...finalAnim,
      layers: processedLayers
    });
  }

  const meta = {
      version: 4,
      animations: metaAnimations
  };
  zip.file("project.json", JSON.stringify(meta, null, 2));

  return await zip.generateAsync({type: "blob"});
}

export const loadProjectBundle = async (file: File): Promise<AnimationEntry[]> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  
  const metaFile = loadedZip.file("project.json");
  if (!metaFile) throw new Error("Invalid project file: missing project.json");

  const metaText = await metaFile.async("string");
  const meta = JSON.parse(metaText);

  const resolveImage = async (pathOrUrl: string) => {
      if (!pathOrUrl) return null;
      if (pathOrUrl.startsWith('data:')) return pathOrUrl;
      const f = loadedZip.file(pathOrUrl);
      if (f) {
          const b64 = await f.async("base64");
          return `data:image/png;base64,${b64}`;
      }
      return null;
  };

  const migrateBgConfig = (bgConfig: any) => {
    if (!bgConfig) return bgConfig;
    if (Array.isArray(bgConfig.colors) && bgConfig.colors.length > 0 && typeof bgConfig.colors[0] === 'string') {
        const globalTolerance = bgConfig.tolerance || 10;
        return {
            ...bgConfig,
            colors: bgConfig.colors.map((c: string) => ({ color: c, tolerance: globalTolerance }))
        };
    }
    return bgConfig;
  };

  const processAnimationImport = async (animMeta: any): Promise<AnimationEntry> => {
       const layers: SourceLayer[] = [];
       
       if (animMeta.layers && Array.isArray(animMeta.layers)) {
           for (const l of animMeta.layers) {
               const src = await resolveImage(l.imageSrc);
               if (src) {
                   layers.push({ 
                     ...l, 
                     imageSrc: src,
                     // Ensure spriteConfig exists for V4 migration
                     spriteConfig: l.spriteConfig || DEFAULT_SPRITE_CONFIG 
                    });
               }
           }
       } else if (animMeta.imageSrc) {
           // V3 migration: Move animation root spriteConfig to the single layer
           const src = await resolveImage(animMeta.imageSrc);
           if (src) {
               layers.push({
                   id: 'imported_layer',
                   name: 'Main Image',
                   imageSrc: src,
                   x: 0, y: 0, opacity: 1, visible: true,
                   spriteConfig: animMeta.spriteConfig || DEFAULT_SPRITE_CONFIG
               });
           }
       }

       return {
           id: animMeta.id,
           name: animMeta.name,
           imageSrc: null, // Legacy cleared
           layers,
           bgConfig: migrateBgConfig(animMeta.bgConfig),
           animConfig: animMeta.animConfig,
           frames: animMeta.frames || []
       };
  };

  // V1 Import
  if (meta.version === 1 || !meta.animations) {
    const imgFile = loadedZip.file("source.png");
    let imageSrc = "";
    if (imgFile) {
        const imgBase64 = await imgFile.async("base64");
        imageSrc = `data:image/png;base64,${imgBase64}`;
    }

    const layers: SourceLayer[] = [{
        id: 'legacy', name: 'Layer 1', imageSrc, x: 0, y: 0, opacity: 1, visible: true,
        spriteConfig: meta.spriteConfig || DEFAULT_SPRITE_CONFIG
    }];

    const totalFrames = meta.spriteConfig.totalFrames || (meta.spriteConfig.rows * meta.spriteConfig.cols) || 1;
    const defaultFrames = Array.from({length: totalFrames}, (_, i) => i);

    return [{
        id: 'imported_legacy',
        name: 'Imported Project',
        imageSrc: null,
        layers,
        bgConfig: migrateBgConfig(meta.bgConfig),
        animConfig: meta.animConfig,
        frames: meta.frames || defaultFrames
    }];
  }

  if (Array.isArray(meta.animations)) {
     const entries: AnimationEntry[] = [];
     for (const animMeta of meta.animations) {
         entries.push(await processAnimationImport(animMeta));
     }
     return entries;
  }

  throw new Error("Unknown project version");
}
    