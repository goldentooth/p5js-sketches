import type { Grid, GridCell, GridX, GridY } from './types';
import { CARDINAL_DIRECTIONS, DIAGONAL_DIRECTIONS } from '../movement/directions';

/**
 * Check if coordinates are within grid bounds
 * @param grid - The grid to check against
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns True if coordinates are within bounds
 */
export function gridContains(grid: Grid, x: number, y: number): boolean {
  return x >= 0 && x < grid.columns && y >= 0 && y < grid.rows;
}

/**
 * Get neighboring cells for a given position
 * @param grid - The grid to query
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param includeDiagonal - Whether to include diagonal neighbors (default: false)
 * @returns Array of neighboring cells that exist within bounds
 */
export function getNeighbors(
  grid: Grid,
  x: GridX,
  y: GridY,
  includeDiagonal: boolean = false
): GridCell[] {
  const neighbors: GridCell[] = [];
  const directions = includeDiagonal
    ? [...CARDINAL_DIRECTIONS, ...DIAGONAL_DIRECTIONS]
    : CARDINAL_DIRECTIONS;

  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;

    if (gridContains(grid, nx, ny)) {
      neighbors.push(grid.getCell(nx as GridX, ny as GridY));
    }
  }

  return neighbors;
}

/**
 * Find the first cell matching a predicate
 * @param grid - The grid to search
 * @param predicate - Function to test each cell
 * @returns First matching cell or undefined if none found
 */
export function findCell(
  grid: Grid,
  predicate: (cell: GridCell) => boolean
): GridCell | undefined {
  let found: GridCell | undefined;

  grid.forEachCell(cell => {
    if (!found && predicate(cell)) {
      found = cell;
    }
  });

  return found;
}

/**
 * Find all cells matching a predicate
 * @param grid - The grid to search
 * @param predicate - Function to test each cell
 * @returns Array of all matching cells
 */
export function filterCells(
  grid: Grid,
  predicate: (cell: GridCell) => boolean
): GridCell[] {
  const matches: GridCell[] = [];

  grid.forEachCell(cell => {
    if (predicate(cell)) {
      matches.push(cell);
    }
  });

  return matches;
}

/**
 * Count cells matching a predicate
 * @param grid - The grid to search
 * @param predicate - Function to test each cell
 * @returns Number of matching cells
 */
export function countCells(
  grid: Grid,
  predicate: (cell: GridCell) => boolean
): number {
  let count = 0;

  grid.forEachCell(cell => {
    if (predicate(cell)) {
      count++;
    }
  });

  return count;
}
