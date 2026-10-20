export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
}

// Callers append a two-digit alpha suffix directly (e.g. `${palette.primary}66`),
// which is only valid CSS on a 6-digit hex color — an `rgb(r, g, b)` string
// would produce an invalid `rgb(...)66` color that the browser silently
// drops, so every extracted palette must be hex, matching the hex fallback
// colors below. Covered by src/tests/ambient.test.ts.
export const rgbToHex = (r: number, g: number, b: number): string => {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export async function extractPalette(imageUrl: string): Promise<ColorPalette> {
  return new Promise((resolve) => {
    const fallback: ColorPalette = {
      primary: '#3a2f1f',
      secondary: '#0e0c11',
      accent: '#e8b06b'
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
          primary: rgbToHex(pr1, pg1, pb1),
          secondary: rgbToHex(pr2, pg2, pb2),
          accent: rgbToHex(pr1 + 30, pg1 + 30, pb1 + 30)
        });
      } catch {
        resolve(fallback);
      }
    };

    img.onerror = () => resolve(fallback);
    img.src = imageUrl;
  });
}

/** Side of the square bitmap the ambient wash is rendered at. Stretched to
 * full-window by the browser's bilinear scaling, which is itself a blur, so
 * a small pre-blurred source reads the same as a CSS `blur(64px)` layer. */
export const WASH_SIZE = 48;
const WASH_BLUR_RADIUS = 3;
const WASH_BLUR_PASSES = 3;
const WASH_SATURATE = 1.65;
const DEFAULT_WASH_BRIGHTNESS = 0.55;

/** One horizontal + vertical box-blur pass over RGBA pixels, in place.
 * Three passes approximate a gaussian. Pure, so it's unit-tested. */
export function boxBlurRGBA(data: Uint8ClampedArray, w: number, h: number, r: number): void {
  const tmp = new Float32Array(data.length);
  const pass = (src: ArrayLike<number>, dst: { [i: number]: number }, horizontal: boolean) => {
    const lines = horizontal ? h : w;
    const len = horizontal ? w : h;
    for (let line = 0; line < lines; line++) {
      for (let c = 0; c < 4; c++) {
        for (let i = 0; i < len; i++) {
          let sum = 0;
          let n = 0;
          for (let k = Math.max(0, i - r); k <= Math.min(len - 1, i + r); k++) {
            const idx = horizontal ? (line * w + k) * 4 + c : (k * w + line) * 4 + c;
            sum += src[idx];
            n++;
          }
          const out = horizontal ? (line * w + i) * 4 + c : (i * w + line) * 4 + c;
          dst[out] = sum / n;
        }
      }
    }
  };
  pass(data, tmp, true);
  pass(tmp, data, false);
}

/** Same look the old CSS `saturate(165%) brightness(0.55)` filter gave. */
export function gradeRGBA(data: Uint8ClampedArray, saturate: number, brightness: number): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    data[i] = (lum + (r - lum) * saturate) * brightness;
    data[i + 1] = (lum + (g - lum) * saturate) * brightness;
    data[i + 2] = (lum + (b - lum) * saturate) * brightness;
  }
}

/** Renders `imageUrl` once into a small blurred, graded bitmap (data URL).
 * Replaces a live CSS `filter: blur(64px)` on a full-window layer, which
 * WebKit recomposites on every frame anything on the page repaints — the
 * main source of scroll/playback stutter with ambient lighting on. */
export async function renderAmbientWash(
  imageUrl: string,
  brightness = DEFAULT_WASH_BRIGHTNESS
): Promise<string | null> {
  if (!imageUrl) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = WASH_SIZE;
        canvas.height = WASH_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, WASH_SIZE, WASH_SIZE);
        const imageData = ctx.getImageData(0, 0, WASH_SIZE, WASH_SIZE);
        for (let i = 0; i < WASH_BLUR_PASSES; i++) {
          boxBlurRGBA(imageData.data, WASH_SIZE, WASH_SIZE, WASH_BLUR_RADIUS);
        }
        gradeRGBA(imageData.data, WASH_SATURATE, brightness);
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}
