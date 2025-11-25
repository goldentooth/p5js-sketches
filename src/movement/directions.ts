import type { GridX, GridY } from '../grid/types';

/**
 * A direction vector representing movement in grid space
 */
export interface Direction {
  dx: number;
  dy: number;
}

/**
 * Named cardinal directions (4-way movement)
 */
export const Cardinal = {
  NORTH: { dx: 0, dy: -1 } as Direction,
  SOUTH: { dx: 0, dy: 1 } as Direction,
  EAST: { dx: 1, dy: 0 } as Direction,
  WEST: { dx: -1, dy: 0 } as Direction,
} as const;

/**
 * Named diagonal directions
 */
export const Diagonal = {
  NORTHEAST: { dx: 1, dy: -1 } as Direction,
  NORTHWEST: { dx: -1, dy: -1 } as Direction,
  SOUTHEAST: { dx: 1, dy: 1 } as Direction,
  SOUTHWEST: { dx: -1, dy: 1 } as Direction,
} as const;

/**
 * All cardinal directions as an array
 */
export const CARDINAL_DIRECTIONS: Direction[] = [
  Cardinal.NORTH,
  Cardinal.SOUTH,
  Cardinal.EAST,
  Cardinal.WEST,
];

/**
 * All diagonal directions as an array
 */
export const DIAGONAL_DIRECTIONS: Direction[] = [
  Diagonal.NORTHEAST,
  Diagonal.NORTHWEST,
  Diagonal.SOUTHEAST,
  Diagonal.SOUTHWEST,
];

/**
 * All 8 directions (cardinal + diagonal)
 */
export const ALL_DIRECTIONS: Direction[] = [
  ...CARDINAL_DIRECTIONS,
  ...DIAGONAL_DIRECTIONS,
];

/**
 * Apply a direction vector to a position
 */
export function applyDirection(
  x: GridX,
  y: GridY,
  direction: Direction
): { x: GridX; y: GridY } {
  return {
    x: (x + direction.dx) as GridX,
    y: (y + direction.dy) as GridY,
  };
}

/**
 * Get the opposite direction
 */
export function oppositeDirection(direction: Direction): Direction {
  return { dx: -direction.dx, dy: -direction.dy };
}

/**
 * Check if a direction is cardinal (not diagonal)
 */
export function isCardinal(direction: Direction): boolean {
  return direction.dx === 0 || direction.dy === 0;
}

/**
 * Check if a direction is diagonal
 */
export function isDiagonal(direction: Direction): boolean {
  return direction.dx !== 0 && direction.dy !== 0;
}
