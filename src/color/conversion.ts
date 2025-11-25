import type { RGB, RGBA, HSL, HSLA } from './types';

/**
 * Convert HSL to RGB
 * @param hsl - HSL color [h: 0-360, s: 0-100, l: 0-100]
 * @returns RGB color [r: 0-255, g: 0-255, b: 0-255]
 */
export function hslToRgb(hsl: HSL): RGB {
  const [h, s, l] = hsl;
  const hNorm = h / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;

  let r: number, g: number, b: number;

  if (sNorm === 0) {
    r = g = b = lNorm; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Convert RGB to HSL
 * @param rgb - RGB color [r: 0-255, g: 0-255, b: 0-255]
 * @returns HSL color [h: 0-360, s: 0-100, l: 0-100]
 */
export function rgbToHsl(rgb: RGB): HSL {
  const [r, g, b] = rgb.map(v => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: number = 0;
  let s: number = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Add alpha channel to RGB color
 * @param rgb - RGB color
 * @param alpha - Alpha value (0-255, default: 255)
 * @returns RGBA color
 */
export function rgbToRgba(rgb: RGB, alpha: number = 255): RGBA {
  return [...rgb, alpha];
}

/**
 * Add alpha channel to HSL color
 * @param hsl - HSL color
 * @param alpha - Alpha value (0-255, default: 255)
 * @returns HSLA color
 */
export function hslToHsla(hsl: HSL, alpha: number = 255): HSLA {
  return [...hsl, alpha];
}

/**
 * Remove alpha channel from RGBA color
 * @param rgba - RGBA color
 * @returns RGB color
 */
export function rgbaToRgb(rgba: RGBA): RGB {
  return [rgba[0], rgba[1], rgba[2]];
}

/**
 * Remove alpha channel from HSLA color
 * @param hsla - HSLA color
 * @returns HSL color
 */
export function hslaToHsl(hsla: HSLA): HSL {
  return [hsla[0], hsla[1], hsla[2]];
}

/**
 * Lighten an RGB color by a percentage
 * @param rgb - RGB color
 * @param percent - Percentage to lighten (0-100)
 * @returns Lightened RGB color
 */
export function lighten(rgb: RGB, percent: number): RGB {
  const hsl = rgbToHsl(rgb);
  hsl[2] = Math.min(100, hsl[2] + percent);
  return hslToRgb(hsl);
}

/**
 * Darken an RGB color by a percentage
 * @param rgb - RGB color
 * @param percent - Percentage to darken (0-100)
 * @returns Darkened RGB color
 */
export function darken(rgb: RGB, percent: number): RGB {
  const hsl = rgbToHsl(rgb);
  hsl[2] = Math.max(0, hsl[2] - percent);
  return hslToRgb(hsl);
}

/**
 * Saturate an RGB color by a percentage
 * @param rgb - RGB color
 * @param percent - Percentage to saturate (0-100)
 * @returns Saturated RGB color
 */
export function saturate(rgb: RGB, percent: number): RGB {
  const hsl = rgbToHsl(rgb);
  hsl[1] = Math.min(100, hsl[1] + percent);
  return hslToRgb(hsl);
}

/**
 * Desaturate an RGB color by a percentage
 * @param rgb - RGB color
 * @param percent - Percentage to desaturate (0-100)
 * @returns Desaturated RGB color
 */
export function desaturate(rgb: RGB, percent: number): RGB {
  const hsl = rgbToHsl(rgb);
  hsl[1] = Math.max(0, hsl[1] - percent);
  return hslToRgb(hsl);
}

/**
 * Get the grayscale version of an RGB color
 * @param rgb - RGB color
 * @returns Grayscale RGB color
 */
export function grayscale(rgb: RGB): RGB {
  // Using luminosity method (weighted average)
  const gray = Math.round(0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]);
  return [gray, gray, gray];
}

/**
 * Invert an RGB color
 * @param rgb - RGB color
 * @returns Inverted RGB color
 */
export function invert(rgb: RGB): RGB {
  return [255 - rgb[0], 255 - rgb[1], 255 - rgb[2]];
}
