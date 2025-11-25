import type { RGB, RGBA, HSL } from './types';
import type { xoroshiro128plus } from '../rng';
import { hslToRgb } from './conversion';

/**
 * Generate a random RGB color
 * @param rng - Random number generator (if not provided, uses Math.random)
 * @param minValue - Minimum value for each component (default: 0)
 * @param maxValue - Maximum value for each component (default: 255)
 * @returns Random RGB color
 */
export function randomRgb(
  rng?: ReturnType<typeof xoroshiro128plus>,
  minValue: number = 0,
  maxValue: number = 255
): RGB {
  const nextInt = rng
    ? () => rng.nextRange(minValue, maxValue + 1)
    : () => Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;

  return [nextInt(), nextInt(), nextInt()];
}

/**
 * Generate a random RGBA color
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
  const [r, g, b] = randomRgb(rng, minValue, maxValue);
  return [r, g, b, alpha];
}

/**
 * Generate a random bright RGB color
 * Uses higher minimum values to ensure vibrant colors
 * @param rng - Random number generator (if not provided, uses Math.random)
 * @param minBrightness - Minimum brightness (default: 100)
 * @returns Random bright RGB color
 */
export function randomBrightRgb(
  rng?: ReturnType<typeof xoroshiro128plus>,
  minBrightness: number = 100
): RGB {
  return randomRgb(rng, minBrightness, 255);
}

/**
 * Generate a random pastel RGB color
 * Uses a narrow range around mid-high values for soft colors
 * @param rng - Random number generator (if not provided, uses Math.random)
 * @returns Random pastel RGB color
 */
export function randomPastelRgb(rng?: ReturnType<typeof xoroshiro128plus>): RGB {
  return randomRgb(rng, 150, 255);
}

/**
 * Generate a random dark RGB color
 * Uses lower maximum values
 * @param rng - Random number generator (if not provided, uses Math.random)
 * @param maxBrightness - Maximum brightness (default: 128)
 * @returns Random dark RGB color
 */
export function randomDarkRgb(
  rng?: ReturnType<typeof xoroshiro128plus>,
  maxBrightness: number = 128
): RGB {
  return randomRgb(rng, 0, maxBrightness);
}

/**
 * Generate a random HSL color
 * @param rng - Random number generator (if not provided, uses Math.random)
 * @param hueMin - Minimum hue (default: 0)
 * @param hueMax - Maximum hue (default: 360)
 * @param satMin - Minimum saturation (default: 0)
 * @param satMax - Maximum saturation (default: 100)
 * @param lightMin - Minimum lightness (default: 0)
 * @param lightMax - Maximum lightness (default: 100)
 * @returns Random HSL color
 */
export function randomHsl(
  rng?: ReturnType<typeof xoroshiro128plus>,
  hueMin: number = 0,
  hueMax: number = 360,
  satMin: number = 0,
  satMax: number = 100,
  lightMin: number = 0,
  lightMax: number = 100
): HSL {
  const nextInt = rng
    ? (min: number, max: number) => rng.nextRange(min, max + 1)
    : (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  return [
    nextInt(hueMin, hueMax),
    nextInt(satMin, satMax),
    nextInt(lightMin, lightMax)
  ];
}

/**
 * Generate a random HSL color and convert to RGB
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
  const hsl = randomHsl(rng, hueMin, hueMax, satMin, satMax, lightMin, lightMax);
  return hslToRgb(hsl);
}

/**
 * Generate a random grayscale color
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
  const nextInt = rng
    ? () => rng.nextRange(minValue, maxValue + 1)
    : () => Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;

  const value = nextInt();
  return [value, value, value];
}
