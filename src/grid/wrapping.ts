/**
 * Coordinate wrapping utilities for grid-based systems
 */

import type { EdgeBehavior } from '../map/types';

/**
 * Wrap a single coordinate value to be within [0, max)
 * Handles negative values correctly
 *
 * @example
 * wrapCoordinate(-1, 10) // => 9
 * wrapCoordinate(10, 10) // => 0
 * wrapCoordinate(5, 10)  // => 5
 *
 * @param value - The coordinate value to wrap
 * @param max - The maximum value (exclusive upper bound)
 * @returns Wrapped coordinate in range [0, max)
 */
export function wrapCoordinate(value: number, max: number): number {
  return ((value % max) + max) % max;
}

/**
 * Normalize coordinates based on edge behavior
 *
 * For 'wrap': wraps coordinates to valid range using modulo
 * For 'block': returns coordinates unchanged
 *
 * @example
 * normalizeCoordinates(-1, 5, 10, 10, 'wrap')  // => {x: 9, y: 5}
 * normalizeCoordinates(-1, 5, 10, 10, 'block') // => {x: -1, y: 5}
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param width - Grid width
 * @param height - Grid height
 * @param behavior - Edge behavior ('wrap' or 'block')
 * @returns Normalized coordinates
 */
export function normalizeCoordinates(
  x: number,
  y: number,
  width: number,
  height: number,
  behavior: EdgeBehavior
): { x: number; y: number } {
  if (behavior === 'wrap') {
    return {
      x: wrapCoordinate(x, width),
      y: wrapCoordinate(y, height),
    };
  }
  return { x, y };
}

