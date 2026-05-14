
import { processPixelize } from '../components/NodeEditor/nodes2/PixelizeNode/pixelize';
import { PixelizeNode, NodePayload } from '../types';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const definePixelizeSpecs = () => {
  describe('Smart Pixelize Processor', () => {
    
    // Helper to create a canvas with specific data
    const createTestCanvas = (w: number, h: number, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d')!;
        drawFn(ctx);
        return c;
    };

    const mockCtx = {
        loadBitmap: async (src: any) => {
            // If src is already a canvas/bitmap, verify types, else assume it's valid for createImageBitmap
            return await createImageBitmap(src);
        },
        isCancelled: () => false
    };

    const countUniqueColors = (bmp: ImageBitmap): number => {
        const c = document.createElement('canvas');
        c.width = bmp.width; c.height = bmp.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(bmp, 0, 0);
        const data = ctx.getImageData(0,0,c.width,c.height).data;
        const colors = new Set<string>();
        for(let i=0; i<data.length; i+=4) {
            if(data[i+3] === 0) continue; // Ignore transparency
            const hex = `#${data[i].toString(16).padStart(2,'0')}${data[i+1].toString(16).padStart(2,'0')}${data[i+2].toString(16).padStart(2,'0')}`;
            colors.add(hex);
        }
        return colors.size;
    };

    it('Downsamples image by taking dominant color in block', async () => {
        // Setup: 10x10 image. 
        // Fill 90% with Red, 10% with Blue scattered away from center.
        // With pixelSize: 10 (whole image = 1 block), result should be RED (Center Sampling).
        // Center is at 5,5.
        
        const w = 10, h = 10;
        const canvas = createTestCanvas(w, h, (ctx) => {
            ctx.fillStyle = '#ff0000'; // Red
            ctx.fillRect(0,0,w,h);
            ctx.fillStyle = '#0000ff'; // Blue noise
            // Place noise at 0,0 so it doesn't affect center 5,5
            ctx.fillRect(0,0,2,2); 
        });

        const input: NodePayload = { type: 'IMAGE', image: canvas as any, width: w, height: h };
        
        const node: PixelizeNode = {
            id: 'pix1', type: 'pixelize', x:0, y:0, width:100, height:100,
            data: { pixelSize: 10, mergeThreshold: 0, cleanup: 0 } // Block covers whole image
        };

        const result = await processPixelize(node, { input }, mockCtx);
        
        expect(result).not.toBeNull();
        if (result?.type === 'IMAGE') {
            const colors = countUniqueColors(result.image as ImageBitmap);
            expect(colors).toBe(1); // Should be exactly 1 color
            
            // Verify it is Red (the center color)
            const c = document.createElement('canvas'); 
            c.width=10; c.height=10;
            const ctx = c.getContext('2d')!;
            ctx.drawImage(result.image as ImageBitmap, 0, 0);
            const p = ctx.getImageData(0,0,1,1).data;
            expect(p[0]).toBe(255); // R
            expect(p[2]).toBe(0);   // B (Blue should be gone)
        }
    });

    it('Reduces palette size (Clustering)', async () => {
        // Setup: 4 horizontal stripes of diff colors.
        // Config: mergeThreshold high enough to merge red variants and blue variants.
        
        const w = 4, h = 4;
        const canvas = createTestCanvas(w, h, (ctx) => {
            ctx.fillStyle = '#ff0000'; ctx.fillRect(0,0,4,1); // Red
            ctx.fillStyle = '#cc0000'; ctx.fillRect(0,1,4,1); // Dark Red (Should merge with Red)
            ctx.fillStyle = '#0000ff'; ctx.fillRect(0,2,4,1); // Blue
            ctx.fillStyle = '#0000cc'; ctx.fillRect(0,3,4,1); // Dark Blue (Should merge with Blue)
        });

        const input: NodePayload = { type: 'IMAGE', image: canvas as any, width: w, height: h };
        
        const node: PixelizeNode = {
            id: 'pix2', type: 'pixelize', x:0, y:0, width:100, height:100,
            data: { pixelSize: 1, mergeThreshold: 60, cleanup: 0 } // High threshold (~60/100) to force merge of shades
        };

        const result = await processPixelize(node, { input }, mockCtx);
        
        expect(result).not.toBeNull();
        if (result?.type === 'IMAGE') {
            const count = countUniqueColors(result.image as ImageBitmap);
            expect(count).toBeLessThanOrEqual(2);
        }
    });

    it('Removes orphan pixels (Cleanup)', async () => {
        // Setup: 3x3 Red grid with Blue center pixel
        const w = 3, h = 3;
        const canvas = createTestCanvas(w, h, (ctx) => {
            ctx.fillStyle = '#ff0000'; 
            ctx.fillRect(0,0,w,h);
            ctx.fillStyle = '#0000ff'; 
            ctx.fillRect(1,1,1,1); // The orphan at center (1,1)
        });

        const input: NodePayload = { type: 'IMAGE', image: canvas as any, width: w, height: h };
        
        const node: PixelizeNode = {
            id: 'pix3', type: 'pixelize', x:0, y:0, width:100, height:100,
            data: { pixelSize: 1, mergeThreshold: 0, cleanup: 5 } // High cleanup
        };

        const result = await processPixelize(node, { input }, mockCtx);
        
        expect(result).not.toBeNull();
        if (result?.type === 'IMAGE') {
            // Check center pixel
            const c = document.createElement('canvas'); 
            c.width=3; c.height=3;
            const ctx = c.getContext('2d')!;
            ctx.drawImage(result.image as ImageBitmap, 0, 0);
            
            const centerPixel = ctx.getImageData(1,1,1,1).data;
            
            // Check Red Channel. Should be 255.
            // If the cleanup logic failed, it would remain Blue (0, 0, 255).
            // If it succeeds, it adopts neighbors (Red: 255, 0, 0).
            expect(centerPixel[0]).toBe(255); 
            expect(centerPixel[2]).toBe(0); 
        }
    });

  });
};
