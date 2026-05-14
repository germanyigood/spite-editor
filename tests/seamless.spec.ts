

import { generateSeamlessTexture } from '../utils/seamless';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineSeamlessSpecs = () => {
  describe('Seamless Texture Generator', () => {
    
    it('generates a bitmap in patch mode', async () => {
       // Create dummy image bitmap
       const canvas = document.createElement('canvas');
       canvas.width = 100;
       canvas.height = 100;
       const ctx = canvas.getContext('2d')!;
       ctx.fillStyle = 'red';
       ctx.fillRect(0,0,50,50);
       
       const bmp = await createImageBitmap(canvas);
       const result = await generateSeamlessTexture(bmp, { mode: 'patch', overlap: 0.5, chaos: 0 });
       
       expect(result).toBeDefined();
       expect(result instanceof ImageBitmap).toBe(true);
       expect(result.width).toBe(100);
       expect(result.height).toBe(100);
    });

    it('generates a bitmap in mirror mode', async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 100; canvas.height = 100;
        const bmp = await createImageBitmap(canvas);
        
        const result = await generateSeamlessTexture(bmp, { mode: 'mirror', overlap: 0, chaos: 0 });
        
        expect(result).toBeDefined();
        expect(result.width).toBe(100);
        expect(result.height).toBe(100);
    });
  });
};