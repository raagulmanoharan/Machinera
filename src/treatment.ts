/** An SDR display treatment, not RAW development or a camera exposure control. */
export const FLAT_RECIPE = { exposureEV: -0.65, saturation: 0.82, blackFloor: 0.025, span: 0.86 } as const;

function toLinear(value: number) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
function toDisplay(value: number) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}

// A lookup table keeps the per-pixel work bounded on a phone's JavaScript thread.
const curve = Array.from({ length: 256 }, (_, value) => {
  const exposed = toLinear(value / 255) * 2 ** FLAT_RECIPE.exposureEV;
  return 255 * (FLAT_RECIPE.blackFloor + FLAT_RECIPE.span * toDisplay(exposed));
});

export function applyFlatTreatment(pixels: Uint8Array): Uint8Array {
  if (pixels.length % 4 !== 0) throw new Error('Expected RGBA pixels.');
  // Return a separate rendition; the decoded source and source file stay unchanged.
  const output = new Uint8Array(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = curve[pixels[i]], g = curve[pixels[i + 1]], b = curve[pixels[i + 2]];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    output[i] = Math.round(luminance + (r - luminance) * FLAT_RECIPE.saturation);
    output[i + 1] = Math.round(luminance + (g - luminance) * FLAT_RECIPE.saturation);
    output[i + 2] = Math.round(luminance + (b - luminance) * FLAT_RECIPE.saturation);
    output[i + 3] = pixels[i + 3];
  }
  return output;
}

export type PhotoLook = 'flat' | 'editorial';

/** Reference-inspired olive greens, warm neutrals and richer reds over the flat base. */
export function applyPhotoLook(pixels: Uint8Array, look: PhotoLook, strength = 1): Uint8Array {
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) throw new Error('Look strength must be between zero and one.');
  if (look !== 'flat' && look !== 'editorial') throw new Error('Unknown photo look.');
  const base = applyFlatTreatment(pixels);
  for (let i = 0; i < base.length; i += 4) {
    let r = base[i], g = base[i + 1], b = base[i + 2];
    if (look === 'editorial') {
      // Soft colour masks avoid abrupt thresholds and do not treat all colours alike.
      const green = Math.min(1, Math.max(0, (g - Math.max(r, b)) / 70));
      const red = Math.min(1, Math.max(0, (r - Math.max(g, b)) / 90));
      const light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const warmth = light * 5;
      r += green * 7 + red * 5 + warmth;
      g -= green * 8 + red * 2;
      b -= green * 9 + red * 4 + warmth;
    }
    base[i] = Math.round(Math.min(255, Math.max(0, pixels[i] + (r - pixels[i]) * strength)));
    base[i + 1] = Math.round(Math.min(255, Math.max(0, pixels[i + 1] + (g - pixels[i + 1]) * strength)));
    base[i + 2] = Math.round(Math.min(255, Math.max(0, pixels[i + 2] + (b - pixels[i + 2]) * strength)));
  }
  return base;
}
