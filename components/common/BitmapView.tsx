
import React, { useRef, useEffect, useState } from 'react';
import { ImageSource } from '../../types';

interface BitmapViewProps {
  image: ImageSource | null | undefined;
  className?: string;
  style?: React.CSSProperties;
  mode?: 'contain' | 'natural'; // 'cover' removed for simplicity, focused on pixel-perfect needs
}

export const BitmapView: React.FC<BitmapViewProps> = ({ 
    image, 
    className, 
    style, 
    mode = 'contain' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Need to track dimensions to trigger redraws on resize
  const [parentSize, setParentSize] = useState({ w: 0, h: 0 });

  // 1. Setup Resize Observer to track container size
  useEffect(() => {
      if (!containerRef.current) return;
      
      const observer = new ResizeObserver((entries) => {
          for (const entry of entries) {
              setParentSize({
                  w: entry.contentRect.width,
                  h: entry.contentRect.height
              });
          }
      });
      
      observer.observe(containerRef.current);
      return () => observer.disconnect();
  }, []);

  // 2. Drawing Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Helper to perform the draw
    const render = (img: HTMLImageElement | ImageBitmap) => {
        const imgW = (img instanceof ImageBitmap) ? img.width : img.naturalWidth;
        const imgH = (img instanceof ImageBitmap) ? img.height : img.naturalHeight;

        // Ensure crisp pixel art rendering
        ctx.imageSmoothingEnabled = false;

        if (mode === 'contain') {
            // Mode: Contain
            // Canvas fills the container exactly. We calculate draw coordinates.
            
            // If container has no size yet, skip (or use image size as fallback)
            const targetW = parentSize.w || imgW;
            const targetH = parentSize.h || imgH;

            // Resize internal buffer to match display size (1:1 pixels)
            if (canvas.width !== targetW || canvas.height !== targetH) {
                canvas.width = targetW;
                canvas.height = targetH;
                // Reset smoothing after resize reset context
                ctx.imageSmoothingEnabled = false; 
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            // Calculate 'object-fit: contain' manually
            const scale = Math.min(targetW / imgW, targetH / imgH);
            const w = Math.floor(imgW * scale);
            const h = Math.floor(imgH * scale);
            const x = Math.floor((targetW - w) / 2);
            const y = Math.floor((targetH - h) / 2);

            ctx.drawImage(img, 0, 0, imgW, imgH, x, y, w, h);

        } else {
            // Mode: Natural (for Zoom/Pan containers)
            // Canvas is exactly the size of the image.
            
            if (canvas.width !== imgW || canvas.height !== imgH) {
                canvas.width = imgW;
                canvas.height = imgH;
                ctx.imageSmoothingEnabled = false;
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            ctx.drawImage(img, 0, 0);
        }
    };

    if (!image) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    if (typeof image === 'string') {
        const img = new Image();
        img.onload = () => render(img);
        img.src = image;
    } else if (image instanceof ImageBitmap) {
        render(image);
    }

  }, [image, parentSize, mode]);

  // Styles based on mode
  const containerStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      ...style
  };

  const canvasStyle: React.CSSProperties = mode === 'contain' 
      ? { display: 'block' } // Canvas fits container exactly via JS logic
      : { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }; // Natural mode needs CSS constraint for initial view

  return (
      <div ref={containerRef} className={className} style={containerStyle}>
          <canvas ref={canvasRef} style={canvasStyle} />
      </div>
  );
};
