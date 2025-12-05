
import { BackgroundRemovalConfig, SpriteConfig, AnimationConfig, AnimationEntry } from "./types";
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

export const sliceFrames = (
  image: HTMLImageElement,
  config: SpriteConfig,
  bgConfig: BackgroundRemovalConfig
): string[] => {
  const frames: string[] = [];
  
  // Pre-calculate RGB values for all target colors
  const targetColors = bgConfig.colors.map(c => ({
    rgb: hexToRgb(c.color),
    toleranceThreshold: c.tolerance * 2.5 // Scale 0-100 to approx distance
  }));
  
  const tintColor = hexToRgb(bgConfig.edgeTint);
  const radius = Math.floor(bgConfig.edgeRadius); 
  const edgeOpacityFactor = bgConfig.edgeOpacity / 100;
  const tintIntensity = bgConfig.edgeTintIntensity / 100;

  for (let r = 0; r < config.rows; r++) {
    for (let c = 0; c < config.cols; c++) {
      if (frames.length >= config.totalFrames) break;

      const frameIndex = frames.length; // Current linear index
      const offset = config.frameOffsets[frameIndex] || { x: 0, y: 0 };

      // Determine Frame Dimensions (Default or Overridden)
      const frameW = offset.w !== undefined ? offset.w : config.width;
      const frameH = offset.h !== undefined ? offset.h : config.height;

      // Base calculated position
      let sx = config.offsetX + c * (config.width + config.margin);
      let sy = config.offsetY + r * (config.height + config.margin);

      // Apply individual frame offset
      sx += offset.x;
      sy += offset.y;

      // Create Canvas for this frame
      const canvas = document.createElement('canvas');
      canvas.width = frameW;
      canvas.height = frameH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) continue;

      // Draw slice (1:1 copy from source to dest)
      ctx.drawImage(
        image,
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
        
        for (let i = 0; i < data.length; i += 4) {
          const pxIndex = i / 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a === 0) {
            isBackground[pxIndex] = 1;
            continue;
          }

          let isMatch = false;
          // Check against all configured colors with their specific tolerances
          for (const target of targetColors) {
            const dist = getColorDistance(r, g, b, target.rgb.r, target.rgb.g, target.rgb.b);
            if (dist <= target.toleranceThreshold) {
              isMatch = true;
              break;
            }
          }

          if (isMatch) {
            isBackground[pxIndex] = 1;
            data[i + 3] = 0; // Immediate removal
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

              // Foreground: check distance to nearest bg
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
                    if (dist < minBgDist) {
                      minBgDist = dist;
                    }
                  }
                }
              }

              // It is an edge pixel
              if (minBgDist <= radius) {
                const alphaIndex = pxIndex * 4 + 3;
                
                // Normalized distance factor (0 = at edge, 1 = safe inside)
                const effectStrength = 1 - (minBgDist / radius);
                
                // 1. Edge Opacity
                const alphaMod = 1 - (effectStrength * (1 - edgeOpacityFactor));
                data[alphaIndex] = Math.floor(data[alphaIndex] * alphaMod);

                // 2. Edge Tint (Green suppression)
                if (tintIntensity > 0) {
                  const rIdx = pxIndex * 4;
                  const gIdx = pxIndex * 4 + 1;
                  const bIdx = pxIndex * 4 + 2;

                  const mix = tintIntensity * effectStrength; // How much to tint

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
  }

  return frames;
};

// Stitch frames into a single strip for export
// Supports variable frame widths
export const stitchFrames = async (frames: string[], defaultWidth: number, defaultHeight: number): Promise<Blob | null> => {
  if (frames.length === 0) return null;

  const loadImg = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });
  };

  const images = await Promise.all(frames.map(loadImg));
  
  // Calculate total dimensions
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
    // Center vertically if heights differ? Or align bottom? Align top for now.
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
    let imgRef = null;
    if (anim.imageSrc) {
      const base64Data = anim.imageSrc.split(',')[1];
      const fileName = `assets/${anim.id}.png`;
      zip.file(fileName, base64Data, { base64: true });
      imgRef = fileName;
    }

    metaAnimations.push({
      ...anim,
      imageSrc: imgRef 
    });
  }

  const meta = {
      version: 2,
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

  // Helper to migrate V1 bgConfig (string array) to V2 (object array)
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

  // --- Version 1: Legacy Import ---
  if (meta.version === 1 || !meta.animations) {
    const imgFile = loadedZip.file("source.png");
    let imageSrc = null;
    if (imgFile) {
        const imgBase64 = await imgFile.async("base64");
        imageSrc = `data:image/png;base64,${imgBase64}`;
    }

    const totalFrames = meta.spriteConfig.totalFrames || (meta.spriteConfig.rows * meta.spriteConfig.cols) || 1;
    const defaultFrames = Array.from({length: totalFrames}, (_, i) => i);

    const legacyEntry: AnimationEntry = {
        id: 'imported_legacy',
        name: 'Imported Project',
        imageSrc,
        spriteConfig: meta.spriteConfig,
        bgConfig: migrateBgConfig(meta.bgConfig),
        animConfig: meta.animConfig,
        frames: meta.frames || defaultFrames
    };

    return [legacyEntry];
  }

  // --- Version 2: Multi-Animation Import ---
  if (meta.version === 2 && Array.isArray(meta.animations)) {
     const entries: AnimationEntry[] = [];
     
     for (const animMeta of meta.animations) {
         let imageSrc = null;
         if (animMeta.imageSrc) {
             const imgFile = loadedZip.file(animMeta.imageSrc);
             if (imgFile) {
                 const b64 = await imgFile.async("base64");
                 imageSrc = `data:image/png;base64,${b64}`;
             }
         }

         entries.push({
             ...animMeta,
             bgConfig: migrateBgConfig(animMeta.bgConfig),
             imageSrc
         });
     }
     return entries;
  }

  throw new Error("Unknown project version");
}
