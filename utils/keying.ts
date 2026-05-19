
import { KeyingConfig, ColorCorrectionConfig } from "../types";
import { hexToRgb } from "../utils";

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

// Separable Box Blur for Alpha Channel
const applyMatteBlur = (data: Uint8ClampedArray, width: number, height: number, radius: number) => {
    if (radius < 1) return;
    
    // We only want to blur channel 3 (Alpha)
    // To do this efficiently, we'll extract alpha to a Float32Array, blur it, and write back.
    const size = width * height;
    const alpha = new Float32Array(size);
    
    for (let i = 0; i < size; i++) {
        alpha[i] = data[i * 4 + 3];
    }

    const temp = new Float32Array(size);
    const r = Math.floor(radius);

    // Horizontal Pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let count = 0;
            for (let k = -r; k <= r; k++) {
                const px = Math.min(width - 1, Math.max(0, x + k));
                sum += alpha[y * width + px];
                count++;
            }
            temp[y * width + x] = sum / count;
        }
    }

    // Vertical Pass
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let sum = 0;
            let count = 0;
            for (let k = -r; k <= r; k++) {
                const py = Math.min(height - 1, Math.max(0, y + k));
                sum += temp[py * width + x];
                count++;
            }
            // Write back to original data
            const idx = (y * width + x) * 4;
            data[idx + 3] = sum / count;
        }
    }
};

export const processAdvancedKeying = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    config: KeyingConfig
) => {
    // Legacy support wrapper
    processKeying(ctx, width, height, config);
    if (config.colorCorrection) {
        processColorCorrection(ctx, width, height, config.colorCorrection);
    }
};

export const processKeying = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    config: KeyingConfig
) => {
    if (!config || !config.enabled) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const len = data.length;

    // 1. Prepare Key Color in YCbCr
    const keyRgb = hexToRgb(config.keyColor);
    
    // YCbCr conversion constants (Rec. 601)
    // Y  = 0.299R + 0.587G + 0.114B
    // Cb = 128 - 0.168736R - 0.331264G + 0.5B
    // Cr = 128 + 0.5R - 0.418688G - 0.081312B
    
    const keyY = 0.299 * keyRgb.r + 0.587 * keyRgb.g + 0.114 * keyRgb.b;
    const keyCb = 128 - 0.168736 * keyRgb.r - 0.331264 * keyRgb.g + 0.5 * keyRgb.b;
    const keyCr = 128 + 0.5 * keyRgb.r - 0.418688 * keyRgb.g - 0.081312 * keyRgb.b;

    // Determine if Key is Neutral (Black/White/Grey) or Saturated (Green/Blue/etc)
    // Calculate distance from neutral grey (128, 128) in chroma space
    const keySaturation = Math.sqrt((keyCb - 128) ** 2 + (keyCr - 128) ** 2);
    
    // If saturation is low (< 25), we assume the user is trying to key out Black or White.
    // In this case, we MUST consider Luminance (Y) distance.
    // If saturation is high, we ignore Luminance (standard Chroma Key behavior) to allow for shadows.
    const isNeutralKey = keySaturation < 25;

    // Normalizing parameters (0-1 range for math)
    const similarity = (config.similarity ?? 35) / 100; 
    const smoothness = (config.smoothness ?? 10) / 100; 
    const spill = (config.spill ?? 60) / 100;
    const clipBlack = (config.clipBlack ?? 0) / 100;
    const clipWhite = (config.clipWhite ?? 0) / 100;
    const invert = !!config.invert;
    
    const isGreenKey = keyRgb.g > keyRgb.r && keyRgb.g > keyRgb.b;
    const isBlueKey = keyRgb.b > keyRgb.r && keyRgb.b > keyRgb.g;

    for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i+1];
        let b = data[i+2];
        let a = data[i+3];

        if (a === 0) continue;

        // --- 1. Matte Generation ---
        
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        // Euclidean distance in Chroma plane (Cb, Cr)
        const distChroma = Math.sqrt((cb - keyCb) ** 2 + (cr - keyCr) ** 2);
        
        let dist = distChroma;

        // Hybrid Luma Check for Neutral Keys
        if (isNeutralKey) {
            const distLuma = Math.abs(y - keyY);
            // Blend Chroma and Luma distance based on how neutral the key is.
            // If totally neutral (Sat=0), 50/50 mix gives good results for B&W.
            // Adjust weights: Luma is more important for black/white keying.
            dist = (distChroma * 0.3) + (distLuma * 0.7); 
        }

        // Thresholding
        // We scale threshold based on the mode because Luma ranges (0-255) vs Chroma ranges differ slightly visually
        const threshold = similarity * (isNeutralKey ? 150 : 100); 
        const falloff = smoothness * 80 + 1;

        let alphaFactor = (dist - threshold) / falloff;
        alphaFactor = clamp(alphaFactor, 0, 1);

        // --- INVERT LOGIC ---
        if (invert) {
            alphaFactor = 1 - alphaFactor;
        }

        // --- 2. Matte Clip ---
        if (alphaFactor < clipBlack) alphaFactor = 0;
        else if (alphaFactor > (1 - clipWhite)) alphaFactor = 1;
        else {
            const range = (1 - clipWhite) - clipBlack;
            if (range > 0) {
                 alphaFactor = (alphaFactor - clipBlack) / range;
            }
        }
        alphaFactor = clamp(alphaFactor, 0, 1);

        // --- 3. Despill (Only for Color Keys) ---
        // Despill logic ruins Black/White images by shifting their color balance. 
        // Only apply if we are NOT using a neutral key.
        if (!invert && !isNeutralKey && spill > 0 && alphaFactor < 1.0) { 
            if (isGreenKey) {
                 const limit = Math.max(r, b);
                 if (g > limit) {
                     const oldG = g;
                     g = g * (1 - spill) + limit * spill;
                     const lumaDiff = (oldG - g) * 0.587;
                     r += lumaDiff;
                     b += lumaDiff;
                 }
            } else if (isBlueKey) {
                const limit = Math.max(r, g);
                if (b > limit) {
                    const oldB = b;
                    b = b * (1 - spill) + limit * spill;
                    const lumaDiff = (oldB - b) * 0.114;
                    r += lumaDiff;
                    g += lumaDiff;
                }
            }
        }

        // --- Final Write ---
        data[i] = clamp(r, 0, 255);
        data[i+1] = clamp(g, 0, 255);
        data[i+2] = clamp(b, 0, 255);
        data[i+3] = a * alphaFactor;
    }

    // --- 4. Post-Process: Matte Blur ---
    if (config.blur && config.blur > 0) {
        applyMatteBlur(data, width, height, config.blur);
        
        if (config.blurContrast && config.blurContrast > 0) {
            const cutoff = (config.blurContrast / 100) * 255;
            for (let i = 0; i < len; i += 4) {
                if (data[i + 3] < 255 && data[i + 3] <= cutoff) {
                    data[i + 3] = 0;
                }
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
};

export const processColorCorrection = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    config: ColorCorrectionConfig
) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const len = data.length;

    const brightness = (config.brightness || 0) / 100; 
    const contrast = 1 + (config.contrast || 0) / 100; 
    const saturation = 1 + (config.saturation || 0) / 100; 
    const temperature = config.temperature || 0;
    
    const tempR = temperature > 0 ? temperature : 0;
    const tempB = temperature < 0 ? -temperature : 0;

    for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i+1];
        let b = data[i+2];
        const a = data[i+3];

        if (a === 0) continue;

        // Brightness
        r += brightness * 255;
        g += brightness * 255;
        b += brightness * 255;

        // Contrast
        r = ((r - 128) * contrast) + 128;
        g = ((g - 128) * contrast) + 128;
        b = ((b - 128) * contrast) + 128;

        // Saturation
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * saturation;
        g = gray + (g - gray) * saturation;
        b = gray + (b - gray) * saturation;

        // Temperature
        r += tempR;
        b += tempB;

        data[i] = clamp(r, 0, 255);
        data[i+1] = clamp(g, 0, 255);
        data[i+2] = clamp(b, 0, 255);
    }

    ctx.putImageData(imageData, 0, 0);
};
