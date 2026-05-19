import { processAdvancedKeying } from '../utils/keying';

declare const describe: any;
declare const it: any;
declare const expect: any;

export const defineKeyingSpecs = () => {
  describe('Keying Utility', () => {
    it('applies blur contrast correctly', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 1;
        const ctx = canvas.getContext('2d')!;
        
        const imgData = ctx.createImageData(4, 1);
        
        imgData.data.set([
            0, 255, 0, 255, 
            255, 0, 0, 255, 
            0, 255, 0, 255, 
            0, 0, 255, 255  
        ]);
        
        ctx.putImageData(imgData, 0, 0);

        processAdvancedKeying(ctx, 4, 1, {
             enabled: true,
             keyColor: '#00ff00',
             similarity: 0.1,
             smoothness: 0,
             spill: 0,
             clipBlack: 0,
             clipWhite: 0,
             blur: 1, 
             blurContrast: 50
        });

        const outData = ctx.getImageData(0, 0, 4, 1);
        expect(outData.data[3]).toBe(0); 
    });
  });
};
