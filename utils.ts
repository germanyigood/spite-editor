
import { BackgroundRemovalConfig, SpriteConfig, AnimationConfig, AnimationEntry, SourceLayer } from "./types";
import JSZip from 'jszip';

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

export const sliceFrames = async (
  layers: SourceLayer[],
  config: SpriteConfig,
  bgConfig: BackgroundRemovalConfig
): Promise<string[]> => {
  const frames: string[] = [];

  // 1. Create a Master Canvas that composites all layers
  const loadedImages = await Promise.all(layers.map(layer => {
      return new Promise<{img: HTMLImageElement, layer: SourceLayer}>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ img, layer });
          img.onerror = reject;
          img.src = layer.imageSrc;
      });
  }));

  // Determine needed size (Grid area + Layer areas)
  let maxX = 0; 
  let maxY = 0;

  // Check Grid Extents
  const gridW = config.offsetX + (config.cols * (config.width + config.margin));
  const gridH = config.offsetY + (config.rows * (config.height + config.margin));
  maxX = Math.max(maxX, gridW);
  maxY = Math.max(maxY, gridH);

  // Check Layer Extents
  loadedImages.forEach(({img, layer}) => {
      maxX = Math.max(maxX, layer.x + img.naturalWidth);
      maxY = Math.max(maxY, layer.y + img.naturalHeight);
  });
  
  // Buffer for manual frames that might be outside
  maxX += 4000; 
  maxY += 4000;

  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = maxX;
  masterCanvas.height = maxY;
  const masterCtx = masterCanvas.getContext('2d', { willReadFrequently: true });
  if (!masterCtx) return [];

  // Draw Layers
  loadedImages.forEach(({img, layer}) => {
      if (!layer.visible) return;
      masterCtx.globalAlpha = layer.opacity;
      masterCtx.drawImage(img, layer.x, layer.y);
  });
  masterCtx.globalAlpha = 1.0;

  // 2. Slice from Master Canvas
  
  // Pre-calculate RGB values for all target colors
  const targetColors = bgConfig.colors.map(c => ({
    rgb: hexToRgb(c.color),
    toleranceThreshold: c.tolerance * 2.5 // Scale 0-100 to approx distance
  }));
  
  const tintColor = hexToRgb(bgConfig.edgeTint);
  const radius = Math.floor(bgConfig.edgeRadius); 
  const edgeOpacityFactor = bgConfig.edgeOpacity / 100;
  const tintIntensity = bgConfig.edgeTintIntensity / 100;

  // Iterate up to totalFrames, allowing for manual frames outside grid logic
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
          // Manual frames default to 0,0 base, relying entirely on offsets
          sx = 0; 
          sy = 0;
      }

      // Apply individual frame offset
      sx += offset.x;
      sy += offset.y;

      // Create Canvas for this frame
      const canvas = document.createElement('canvas');
      canvas.width = frameW;
      canvas.height = frameH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) continue;

      // Draw slice from MASTER
      ctx.drawImage(
        masterCanvas,
        sx, sy, frameW, frameH, // Source
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
            data[idx + 3] = 0; // Immediate removal
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

      frames.push(canvas.toDataURL('image/png'));
  }

  return frames;
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

// Helper to generate sprite sheet metadata for export
export const generateSpriteSheetData = async (frames: string[], animName: string) => {
    const loadImg = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = src;
        });
    };
    
    const images = await Promise.all(frames.map(loadImg));
    
    let currentX = 0;
    let maxHeight = 0;
    const spriteFrames = [];

    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        spriteFrames.push({
            name: `${animName}_${i}`,
            frame: { x: currentX, y: 0, w: img.naturalWidth, h: img.naturalHeight },
            sourceSize: { w: img.naturalWidth, h: img.naturalHeight },
            spriteSourceSize: { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight }
        });
        currentX += img.naturalWidth;
        maxHeight = Math.max(maxHeight, img.naturalHeight);
    }

    return {
        frames: spriteFrames,
        meta: {
            app: "SpriteForge AI",
            version: "1.0",
            image: `${animName}.png`,
            format: "RGBA8888",
            size: { w: currentX, h: maxHeight },
            scale: "1"
        }
    };
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
            const base64Data = anim.imageSrc.split(',')[1];
            const fileName = `assets/${anim.id}_main.png`;
            zip.file(fileName, base64Data, { base64: true });
            processedLayers.push({
                id: 'legacy_layer',
                imageSrc: fileName,
                x: 0, y: 0, opacity: 1, visible: true, name: 'Main'
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

    metaAnimations.push({
      ...anim,
      layers: processedLayers,
      imageSrc: null // Clear legacy field in export
    });
  }

  const meta = {
      version: 3,
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

  // Helper to migrate V1/V2 to V3 layers
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
                   layers.push({ ...l, imageSrc: src });
               }
           }
       } else if (animMeta.imageSrc) {
           const src = await resolveImage(animMeta.imageSrc);
           if (src) {
               layers.push({
                   id: 'imported_layer',
                   name: 'Main Image',
                   imageSrc: src,
                   x: 0, y: 0, opacity: 1, visible: true
               });
           }
       }

       return {
           ...animMeta,
           bgConfig: migrateBgConfig(animMeta.bgConfig),
           layers,
           imageSrc: layers.length > 0 ? layers[0].imageSrc : null
       };
  };

  if (meta.version === 1 || !meta.animations) {
    const imgFile = loadedZip.file("source.png");
    let imageSrc = null;
    const layers: SourceLayer[] = [];

    if (imgFile) {
        const imgBase64 = await imgFile.async("base64");
        imageSrc = `data:image/png;base64,${imgBase64}`;
        layers.push({
            id: 'legacy', name: 'Layer 1', imageSrc, x: 0, y: 0, opacity: 1, visible: true
        });
    }

    const totalFrames = meta.spriteConfig.totalFrames || (meta.spriteConfig.rows * meta.spriteConfig.cols) || 1;
    const defaultFrames = Array.from({length: totalFrames}, (_, i) => i);

    return [{
        id: 'imported_legacy',
        name: 'Imported Project',
        imageSrc,
        layers,
        spriteConfig: meta.spriteConfig,
        bgConfig: migrateBgConfig(meta.bgConfig),
        animConfig: meta.animConfig,
        frames: meta.frames || defaultFrames
    }];
  }

  if ((meta.version === 2 || meta.version === 3) && Array.isArray(meta.animations)) {
     const entries: AnimationEntry[] = [];
     for (const animMeta of meta.animations) {
         entries.push(await processAnimationImport(animMeta));
     }
     return entries;
  }

  throw new Error("Unknown project version");
}
