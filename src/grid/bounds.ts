import type { GridX, GridY, GridWidth, GridHeight } from './types';

export interface GridBounds {
  width: GridWidth;
  height: GridHeight;
}

/**
 * Check if grid coordinates are within bounds
 */
export function isInBounds(
  x: GridX,
  y: GridY,
  bounds: GridBounds
): boolean {
  return x >= 0 && x < bounds.width && y >= 0 && y < bounds.height;
}

/**
 * Clamp grid coordinates to stay within bounds
 */
export function clampToBounds(
  x: GridX,
  y: GridY,
  bounds: GridBounds
): { x: GridX; y: GridY } {
  return {
    x: Math.max(0, Math.min(x, bounds.width - 1)) as GridX,
    y: Math.max(0, Math.min(y, bounds.height - 1)) as GridY,
  };
}

/**
 * Wrap grid coordinates to create toroidal/wrapping behavior
 */
export function wrapToBounds(
  x: GridX,
  y: GridY,
  bounds: GridBounds
): { x: GridX; y: GridY } {
  const wrappedX = ((x % bounds.width) + bounds.width) % bounds.width;
  const wrappedY = ((y % bounds.height) + bounds.height) % bounds.height;
  return {
    x: wrappedX as GridX,
    y: wrappedY as GridY,
  };
}

/**
 * Check if coordinates would be out of bounds after a delta is applied
 */
export function wouldBeOutOfBounds(
  x: GridX,
  y: GridY,
  dx: number,
  dy: number,
  bounds: GridBounds
): boolean {
  const newX = x + dx;
  const newY = y + dy;
  return !isInBounds(newX as GridX, newY as GridY, bounds);
}

/**
 * Get all neighboring coordinates that are within bounds
 * @param includesDiagonal - if true, includes diagonal neighbors (8-way), otherwise cardinal only (4-way)
 */
export function getNeighborsInBounds(
  x: GridX,
  y: GridY,
  bounds: GridBounds,
  includeDiagonal: boolean = false
): Array<{ x: GridX; y: GridY }> {
  const neighbors: Array<{ x: GridX; y: GridY }> = [];

  const deltas = includeDiagonal
    ? [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
    : [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dx, dy] of deltas) {
    const nx = (x + dx) as GridX;
    const ny = (y + dy) as GridY;
    if (isInBounds(nx, ny, bounds)) {
      neighbors.push({ x: nx, y: ny });
    }
  }

  return neighbors;
}
