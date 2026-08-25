export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
}

export async function extractPalette(imageUrl: string): Promise<ColorPalette> {
  return new Promise((resolve) => {
    const fallback: ColorPalette = {
      primary: '#18181b',
      secondary: '#09090b',
      accent: '#dc2626'
    };

    if (!imageUrl) {
      resolve(fallback);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(fallback);
          return;
        }

        ctx.drawImage(img, 0, 0, 16, 16);
        const imgData = ctx.getImageData(0, 0, 16, 16).data;

        let r1 = 0, g1 = 0, b1 = 0, count1 = 0;
        let r2 = 0, g2 = 0, b2 = 0, count2 = 0;

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue;

          // Skip pure black and pure white
          const brightness = (r + g + b) / 3;
          if (brightness < 20 || brightness > 240) continue;

          // Split into top-half and bottom-half color clusters
          if (i < imgData.length / 2) {
            r1 += r; g1 += g; b1 += b; count1++;
          } else {
            r2 += r; g2 += g; b2 += b; count2++;
          }
        }

        if (count1 === 0 && count2 === 0) {
          resolve(fallback);
          return;
        }

        const pr1 = count1 > 0 ? Math.round(r1 / count1) : 220;
        const pg1 = count1 > 0 ? Math.round(g1 / count1) : 38;
        const pb1 = count1 > 0 ? Math.round(b1 / count1) : 38;

        const pr2 = count2 > 0 ? Math.round(r2 / count2) : 24;
        const pg2 = count2 > 0 ? Math.round(g2 / count2) : 24;
        const pb2 = count2 > 0 ? Math.round(b2 / count2) : 27;

        resolve({
          primary: `rgb(${pr1}, ${pg1}, ${pb1})`,
          secondary: `rgb(${pr2}, ${pg2}, ${pb2})`,
          accent: `rgb(${Math.min(255, pr1 + 30)}, ${Math.min(255, pg1 + 30)}, ${Math.min(255, pb1 + 30)})`
        });
      } catch {
        resolve(fallback);
      }
    };

    img.onerror = () => resolve(fallback);
    img.src = imageUrl;
  });
}
