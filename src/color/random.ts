import type { RGB, RGBA, HSL } from './types';
import type { xoroshiro128plus } from '../rng';
import { hslToRgb } from './conversion';

/**
 * Style presets for random color generation
 */
export type ColorStyle = 'bright' | 'pastel' | 'dark' | 'grayscale';

/**
 * Options for random RGB color generation
 */
export interface RandomRgbOptions {
  /** Random number generator (if not provided, uses Math.random) */
  rng?: ReturnType<typeof xoroshiro128plus>;
  /** Minimum value for each component (0-255, default: 0) */
  min?: number;
  /** Maximum value for each component (0-255, default: 255) */
  max?: number;
  /** Style preset that overrides min/max if provided */
  style?: ColorStyle;
  /** Alpha channel value (0-255). If provided, returns RGBA instead of RGB */
  alpha?: number;
}

/**
 * Apply style preset to determine min/max values
 */
function applyStylePreset(style: ColorStyle): { min: number; max: number } {
  switch (style) {
    case 'bright':
      return { min: 100, max: 255 };
    case 'pastel':
      return { min: 150, max: 255 };
    case 'dark':
      return { min: 0, max: 128 };
    case 'grayscale':
      return { min: 0, max: 255 };
  }
}

/**
 * Generate a random RGB color with flexible options
 * @param options - Configuration options for color generation
 * @returns Random RGB or RGBA color
 *
 * @example
 * // Basic usage
 * randomRgb()  // Full range color
 *
 * @example
 * // With style preset
 * randomRgb({ style: 'bright' })
 * randomRgb({ style: 'pastel' })
 *
 * @example
 * // Custom range
 * randomRgb({ min: 50, max: 200 })
 *
 * @example
 * // With alpha channel
 * randomRgb({ alpha: 128 })  // Returns RGBA
 *
 * @example
 * // Seeded random
 * const rng = xoroshiro128plus(12345n)
 * randomRgb({ rng })
 */
export function randomRgb(options?: RandomRgbOptions): RGB;
export function randomRgb(
  rng?: ReturnType<typeof xoroshiro128plus>,
  minValue?: number,
  maxValue?: number
): RGB;
export function randomRgb(
  optionsOrRng?: RandomRgbOptions | ReturnType<typeof xoroshiro128plus>,
  minValue: number = 0,
  maxValue: number = 255
): RGB {
  // Handle legacy function signature (rng, min, max)
  let options: RandomRgbOptions;
  if (optionsOrRng && typeof optionsOrRng === 'object' && 'nextFloat' in optionsOrRng) {
    // Legacy signature: (rng, minValue, maxValue)
    options = { rng: optionsOrRng, min: minValue, max: maxValue };
  } else {
    // New signature: (options)
    options = (optionsOrRng as RandomRgbOptions) || {};
  }

  const { rng, style, alpha } = options;
  let { min = 0, max = 255 } = options;

  // Apply style preset if provided (overrides min/max)
  if (style) {
    const preset = applyStylePreset(style);
    min = preset.min;
    max = preset.max;
  }

  const nextInt = rng
    ? () => rng.nextRange(min, max + 1)
    : () => Math.floor(Math.random() * (max - min + 1)) + min;

  // Handle grayscale style
  if (style === 'grayscale') {
    const value = nextInt();
    const rgb: RGB = [value, value, value];
    return alpha !== undefined ? [...rgb, alpha] as any : rgb;
  }

  const rgb: RGB = [nextInt(), nextInt(), nextInt()];
  return alpha !== undefined ? [...rgb, alpha] as any : rgb;
}

/**
 * Generate a random RGBA color
 * Convenience wrapper for randomRgb with alpha channel
 * @param rng - Random number generator (if not provided, uses Math.random)
 * @param minValue - Minimum value for RGB components (default: 0)
 * @param maxValue - Maximum value for RGB components (default: 255)
 * @param alpha - Alpha value (default: 255)
 * @returns Random RGBA color
 */
export function randomRgba(
  rng?: ReturnType<typeof xoroshiro128plus>,
  minValue: number = 0,
  maxValue: number = 255,
  alpha: number = 255
): RGBA {
  const rgb = randomRgb({ rng, min: minValue, max: maxValue });
  return [...rgb, alpha];
}

/**
 * Generate a random bright RGB color
 * Uses higher minimum values to ensure vibrant colors
 * Convenience wrapper for randomRgb({ style: 'bright' })
 * @param rng - Random number generator (if not provided, uses Math.random)
 * @param minBrightness - Minimum brightness (default: 100)
 * @returns Random bright RGB color
 */
export function randomBrightRgb(
  rng?: ReturnType<typeof xoroshiro128plus>,
  minBrightness: number = 100
): RGB {
  return randomRgb({ rng, min: minBrightness, max: 255 });
}

/**
 * Generate a random pastel RGB color
 * Uses a narrow range around mid-high values for soft colors
 * Convenience wrapper for randomRgb({ style: 'pastel' })
 * @param rng - Random number generator (if not provided, uses Math.random)
 * @returns Random pastel RGB color
 */
export function randomPastelRgb(rng?: ReturnType<typeof xoroshiro128plus>): RGB {
  return randomRgb({ rng, style: 'pastel' });
}

/**
 * Generate a random dark RGB color
 * Uses lower maximum values
 * Convenience wrapper for randomRgb({ style: 'dark' })
 * @param rng - Random number generator (if not provided, uses Math.random)
 * @param maxBrightness - Maximum brightness (default: 128)
 * @returns Random dark RGB color
 */
export function randomDarkRgb(
  rng?: ReturnType<typeof xoroshiro128plus>,
  maxBrightness: number = 128
): RGB {
  return randomRgb({ rng, min: 0, max: maxBrightness });
}

/**
 * Options for random HSL color generation
 */
export interface RandomHslOptions {
  /** Random number generator (if not provided, uses Math.random) */
  rng?: ReturnType<typeof xoroshiro128plus>;
  /** Minimum hue (0-360, default: 0) */
  hueMin?: number;
  /** Maximum hue (0-360, default: 360) */
  hueMax?: number;
  /** Minimum saturation (0-100, default: 0) */
  satMin?: number;
  /** Maximum saturation (0-100, default: 100) */
  satMax?: number;
  /** Minimum lightness (0-100, default: 0) */
  lightMin?: number;
  /** Maximum lightness (0-100, default: 100) */
  lightMax?: number;
  /** If true, convert to RGB. If false, return HSL */
  toRgb?: boolean;
}

/**
 * Generate a random HSL color
 * @param options - Configuration options for HSL color generation
 * @returns Random HSL color
 *
 * @example
 * // Basic usage
 * randomHsl()
 *
 * @example
 * // Custom ranges
 * randomHsl({ hueMin: 0, hueMax: 120, satMin: 50, satMax: 100 })
 *
 * @example
 * // Convert to RGB
 * randomHsl({ toRgb: true })
 */
export function randomHsl(options?: RandomHslOptions): HSL;
export function randomHsl(
  rng?: ReturnType<typeof xoroshiro128plus>,
  hueMin?: number,
  hueMax?: number,
  satMin?: number,
  satMax?: number,
  lightMin?: number,
  lightMax?: number
): HSL;
export function randomHsl(
  optionsOrRng?: RandomHslOptions | ReturnType<typeof xoroshiro128plus>,
  hueMin: number = 0,
  hueMax: number = 360,
  satMin: number = 0,
  satMax: number = 100,
  lightMin: number = 0,
  lightMax: number = 100
): HSL {
  // Handle legacy function signature
  let options: RandomHslOptions;
  if (optionsOrRng && typeof optionsOrRng === 'object' && 'nextFloat' in optionsOrRng) {
    // Legacy signature
    options = {
      rng: optionsOrRng,
      hueMin,
      hueMax,
      satMin,
      satMax,
      lightMin,
      lightMax,
    };
  } else {
    // New signature
    options = (optionsOrRng as RandomHslOptions) || {};
  }

  const {
    rng,
    hueMin: minH = 0,
    hueMax: maxH = 360,
    satMin: minS = 0,
    satMax: maxS = 100,
    lightMin: minL = 0,
    lightMax: maxL = 100,
  } = options;

  const nextInt = rng
    ? (min: number, max: number) => rng.nextRange(min, max + 1)
    : (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  return [nextInt(minH, maxH), nextInt(minS, maxS), nextInt(minL, maxL)];
}

/**
 * Generate a random HSL color and convert to RGB
 * Convenience wrapper for randomHsl with RGB conversion
 * @param rng - Random number generator (if not provided, uses Math.random)
 * @param hueMin - Minimum hue (default: 0)
 * @param hueMax - Maximum hue (default: 360)
 * @param satMin - Minimum saturation (default: 50)
 * @param satMax - Maximum saturation (default: 100)
 * @param lightMin - Minimum lightness (default: 50)
 * @param lightMax - Maximum lightness (default: 70)
 * @returns Random RGB color generated from HSL
 */
export function randomHslRgb(
  rng?: ReturnType<typeof xoroshiro128plus>,
  hueMin: number = 0,
  hueMax: number = 360,
  satMin: number = 50,
  satMax: number = 100,
  lightMin: number = 50,
  lightMax: number = 70
): RGB {
  const hsl = randomHsl({ rng, hueMin, hueMax, satMin, satMax, lightMin, lightMax });
  return hslToRgb(hsl);
}

/**
 * Generate a random grayscale color
 * Convenience wrapper for randomRgb({ style: 'grayscale' })
 * @param rng - Random number generator (if not provided, uses Math.random)
 * @param minValue - Minimum value (default: 0)
 * @param maxValue - Maximum value (default: 255)
 * @returns Random grayscale RGB color
 */
export function randomGrayscale(
  rng?: ReturnType<typeof xoroshiro128plus>,
  minValue: number = 0,
  maxValue: number = 255
): RGB {
  return randomRgb({ rng, min: minValue, max: maxValue, style: 'grayscale' });
}
