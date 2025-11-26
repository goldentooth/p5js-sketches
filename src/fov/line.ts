/**
 * Line drawing utilities for raycasting FOV algorithms
 *
 * Provides Bresenham's line algorithm and related utilities for
 * tracing rays from origin to target cells.
 */

import type { GridX, GridY } from '../grid/types.js';
import type { VisibleCell } from './types.js';

/**
 * Generate points along a line using Bresenham's line algorithm
 *
 * Returns all points from (x0, y0) to (x1, y1) inclusive.
 * This is a classic computer graphics algorithm for rasterizing lines.
 *
 * @param x0 - Starting X coordinate
 * @param y0 - Starting Y coordinate
 * @param x1 - Ending X coordinate
 * @param y1 - Ending Y coordinate
 * @returns Array of points along the line
 *
 * @example
 * ```typescript
 * // Draw line from (0, 0) to (5, 3)
 * const points = bresenhamLine(0, 0, 5, 3);
 * // Returns: [{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 1}, ...]
 * ```
 */
export function bresenhamLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): VisibleCell[] {
  const points: VisibleCell[] = [];

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    points.push({ x: x as GridX, y: y as GridY });

    if (x === x1 && y === y1) {
      break;
    }

    const e2 = 2 * err;

    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }

    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return points;
}

/**
 * Calculate Chebyshev distance (chess/king distance) between two points
 *
 * Chebyshev distance is the maximum of the absolute differences of coordinates.
 * It represents the minimum number of king moves in chess to go from one point to another.
 *
 * @param x0 - First point X
 * @param y0 - First point Y
 * @param x1 - Second point X
 * @param y1 - Second point Y
 * @returns The Chebyshev distance
 *
 * @example
 * ```typescript
 * chebyshevDistance(0, 0, 3, 4); // Returns 4
 * chebyshevDistance(0, 0, 5, 5); // Returns 5
 * ```
 */
export function chebyshevDistance(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): number {
  return Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
}

/**
 * Calculate Euclidean distance between two points
 *
 * Standard geometric distance formula: sqrt((x1-x0)² + (y1-y0)²)
 *
 * @param x0 - First point X
 * @param y0 - First point Y
 * @param x1 - Second point X
 * @param y1 - Second point Y
 * @returns The Euclidean distance
 *
 * @example
 * ```typescript
 * euclideanDistance(0, 0, 3, 4); // Returns 5.0
 * euclideanDistance(0, 0, 1, 1); // Returns ~1.414
 * ```
 */
export function euclideanDistance(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate Manhattan distance (taxicab distance) between two points
 *
 * Manhattan distance is the sum of absolute differences of coordinates.
 * It represents movement restricted to horizontal and vertical only.
 *
 * @param x0 - First point X
 * @param y0 - First point Y
 * @param x1 - Second point X
 * @param y1 - Second point Y
 * @returns The Manhattan distance
 *
 * @example
 * ```typescript
 * manhattanDistance(0, 0, 3, 4); // Returns 7
 * manhattanDistance(0, 0, 5, 5); // Returns 10
 * ```
 */
export function manhattanDistance(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): number {
  return Math.abs(x1 - x0) + Math.abs(y1 - y0);
}
