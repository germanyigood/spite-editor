
import { KeyingConfig, ImageSource } from "../types";
import { processAdvancedKeying } from "./keying";

export const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((r, rej) => { 
    const i=new Image(); 
    i.crossOrigin = "anonymous";
    i.onload=()=>r(i); 
    i.onerror=(e) => rej(new Error(`Failed to load image URL`)); 
    i.src=src; 
});

export const loadBitmap = async (src: ImageSource): Promise<ImageBitmap> => {
    if (src instanceof ImageBitmap) return src;
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(createImageBitmap(img));
        img.onerror = () => {
            const preview = typeof src === 'string' ? (src.length > 50 ? src.substring(0, 50) + '...' : src) : 'Binary/Blob';
            reject(new Error(`Failed to load bitmap from source: ${preview}`));
        };
        img.src = src;
    });
};

export const processCanvasBuffer = (ctx: CanvasRenderingContext2D, width: number, height: number, bgConfig: KeyingConfig) => {
    processAdvancedKeying(ctx, width, height, bgConfig);
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const createCanvas = (w: number, h: number) => { const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };

export const stitchFrames = async (frames: string[]): Promise<Blob | null> => {
  const validFrames = frames.filter(f => !!f);
  if (validFrames.length === 0) return null;
  const images = await Promise.all(validFrames.map(loadImage));
  let totalWidth = 0, maxHeight = 0;
  images.forEach(img => { totalWidth += img.naturalWidth; maxHeight = Math.max(maxHeight, img.naturalHeight); });
  const c = createCanvas(totalWidth, maxHeight);
  const ctx = c.getContext('2d')!;
  let x = 0;
  images.forEach(img => { ctx.drawImage(img, x, 0); x += img.naturalWidth; });
  return new Promise(r => c.toBlob(r, 'image/png'));
};
