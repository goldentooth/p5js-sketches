import type { RGB, HSL } from './types';
import type { xoroshiro128plus } from '../rng';
import { hslToRgb, rgbToHsl } from './conversion';
import { randomHsl } from './random';

/**
 * Generate an analogous color palette
 * Colors adjacent on the color wheel
 * @param baseColor - Base RGB color
 * @param count - Number of colors to generate (default: 5)
 * @param angle - Angle step in degrees (default: 30)
 * @returns Array of RGB colors
 */
export function analogousPalette(baseColor: RGB, count: number = 5, angle: number = 30): RGB[] {
  const hsl = rgbToHsl(baseColor);
  const palette: RGB[] = [];

  for (let i = 0; i < count; i++) {
    const offset = (i - Math.floor(count / 2)) * angle;
    const newHue = (hsl[0] + offset + 360) % 360;
    palette.push(hslToRgb([newHue, hsl[1], hsl[2]]));
  }

  return palette;
}

/**
 * Generate a complementary color palette
 * Colors opposite on the color wheel
 * @param baseColor - Base RGB color
 * @returns Array of 2 RGB colors [base, complement]
 */
export function complementaryPalette(baseColor: RGB): [RGB, RGB] {
  const hsl = rgbToHsl(baseColor);
  const complementHue = (hsl[0] + 180) % 360;
  return [baseColor, hslToRgb([complementHue, hsl[1], hsl[2]])];
}

/**
 * Generate a triadic color palette
 * Three colors evenly spaced on the color wheel
 * @param baseColor - Base RGB color
 * @returns Array of 3 RGB colors
 */
export function triadicPalette(baseColor: RGB): [RGB, RGB, RGB] {
  const hsl = rgbToHsl(baseColor);
  return [
    baseColor,
    hslToRgb([(hsl[0] + 120) % 360, hsl[1], hsl[2]]),
    hslToRgb([(hsl[0] + 240) % 360, hsl[1], hsl[2]])
  ];
}

/**
 * Generate a tetradic (square) color palette
 * Four colors evenly spaced on the color wheel
 * @param baseColor - Base RGB color
 * @returns Array of 4 RGB colors
 */
export function tetradicPalette(baseColor: RGB): [RGB, RGB, RGB, RGB] {
  const hsl = rgbToHsl(baseColor);
  return [
    baseColor,
    hslToRgb([(hsl[0] + 90) % 360, hsl[1], hsl[2]]),
    hslToRgb([(hsl[0] + 180) % 360, hsl[1], hsl[2]]),
    hslToRgb([(hsl[0] + 270) % 360, hsl[1], hsl[2]])
  ];
}

/**
 * Generate a split-complementary color palette
 * Base color plus two colors adjacent to its complement
 * @param baseColor - Base RGB color
 * @param angle - Angle offset from complement (default: 30)
 * @returns Array of 3 RGB colors
 */
export function splitComplementaryPalette(baseColor: RGB, angle: number = 30): [RGB, RGB, RGB] {
  const hsl = rgbToHsl(baseColor);
  const complementHue = (hsl[0] + 180) % 360;
  return [
    baseColor,
    hslToRgb([(complementHue - angle + 360) % 360, hsl[1], hsl[2]]),
    hslToRgb([(complementHue + angle) % 360, hsl[1], hsl[2]])
  ];
}

/**
 * Generate a monochromatic color palette
 * Different shades of the same hue
 * @param baseColor - Base RGB color
 * @param count - Number of colors to generate (default: 5)
 * @returns Array of RGB colors
 */
export function monochromaticPalette(baseColor: RGB, count: number = 5): RGB[] {
  const hsl = rgbToHsl(baseColor);
  const palette: RGB[] = [];

  for (let i = 0; i < count; i++) {
    const lightness = Math.round((100 / (count + 1)) * (i + 1));
    palette.push(hslToRgb([hsl[0], hsl[1], lightness]));
  }

  return palette;
}

/**
 * Generate a random palette of colors
 * @param count - Number of colors to generate
 * @param rng - Random number generator (if not provided, uses Math.random)
 * @param satMin - Minimum saturation (default: 50)
 * @param satMax - Maximum saturation (default: 100)
 * @param lightMin - Minimum lightness (default: 40)
 * @param lightMax - Maximum lightness (default: 70)
 * @returns Array of RGB colors
 */
export function randomPalette(
  count: number,
  rng?: ReturnType<typeof xoroshiro128plus>,
  satMin: number = 50,
  satMax: number = 100,
  lightMin: number = 40,
  lightMax: number = 70
): RGB[] {
  const palette: RGB[] = [];

  for (let i = 0; i < count; i++) {
    const hsl = randomHsl(rng, 0, 360, satMin, satMax, lightMin, lightMax);
    palette.push(hslToRgb(hsl));
  }

  return palette;
}

/**
 * Generate a palette with evenly distributed hues
 * @param count - Number of colors to generate
 * @param saturation - Saturation (0-100, default: 70)
 * @param lightness - Lightness (0-100, default: 50)
 * @param startHue - Starting hue (0-360, default: 0)
 * @returns Array of RGB colors
 */
export function distributedHuePalette(
  count: number,
  saturation: number = 70,
  lightness: number = 50,
  startHue: number = 0
): RGB[] {
  const palette: RGB[] = [];
  const step = 360 / count;

  for (let i = 0; i < count; i++) {
    const hue = (startHue + step * i) % 360;
    palette.push(hslToRgb([hue, saturation, lightness]));
  }

  return palette;
}

/**
 * Generate a grayscale gradient
 * @param count - Number of colors to generate
 * @param minValue - Minimum value (default: 0)
 * @param maxValue - Maximum value (default: 255)
 * @returns Array of RGB colors
 */
export function grayscaleGradient(count: number, minValue: number = 0, maxValue: number = 255): RGB[] {
  const palette: RGB[] = [];
  const step = (maxValue - minValue) / (count - 1);

  for (let i = 0; i < count; i++) {
    const value = Math.round(minValue + step * i);
    palette.push([value, value, value]);
  }

  return palette;
}

/**
 * ColorPalette class for managing and storing color collections
 */
export class ColorPalette {
  private colors: RGB[] = [];
  private names: Map<string, number> = new Map();

  constructor(colors: RGB[] = []) {
    this.colors = [...colors];
  }

  /**
   * Add a color to the palette
   * @param color - RGB color
   * @param name - Optional name for the color
   */
  add(color: RGB, name?: string): void {
    const index = this.colors.length;
    this.colors.push(color);
    if (name) {
      this.names.set(name, index);
    }
  }

  /**
   * Get a color by index
   * @param index - Color index
   * @returns RGB color or undefined if not found
   */
  get(index: number): RGB | undefined {
    return this.colors[index];
  }

  /**
   * Get a color by name
   * @param name - Color name
   * @returns RGB color or undefined if not found
   */
  getByName(name: string): RGB | undefined {
    const index = this.names.get(name);
    return index !== undefined ? this.colors[index] : undefined;
  }

  /**
   * Get a random color from the palette
   * @param rng - Random number generator (if not provided, uses Math.random)
   * @returns RGB color
   */
  random(rng?: ReturnType<typeof xoroshiro128plus>): RGB | undefined {
    if (this.colors.length === 0) return undefined;
    const index = rng
      ? rng.nextRange(0, this.colors.length)
      : Math.floor(Math.random() * this.colors.length);
    return this.colors[index];
  }

  /**
   * Get all colors in the palette
   * @returns Array of RGB colors
   */
  all(): RGB[] {
    return [...this.colors];
  }

  /**
   * Get the number of colors in the palette
   * @returns Number of colors
   */
  size(): number {
    return this.colors.length;
  }

  /**
   * Clear all colors from the palette
   */
  clear(): void {
    this.colors = [];
    this.names.clear();
  }
}
