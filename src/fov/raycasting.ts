/**
 * Basic Raycasting Field of View Algorithm
 *
 * Casts rays in all directions from the origin and traces them outward
 * until they hit an obstacle or reach the maximum range.
 *
 * Characteristics:
 * - Simple and intuitive
 * - Fast on outdoor/open maps
 * - May have minor symmetry issues
 * - Good general-purpose algorithm
 */

import type { GridX, GridY } from '../grid/types.js';
import type { FovMap, FovResult, VisibleCell } from './types.js';
import { cellKey } from './types.js';
import { bresenhamLine, chebyshevDistance } from './line.js';

/**
 * Cast a ray from origin in a specific direction
 *
 * Traces the ray until it hits a blocking tile or exceeds range.
 * All cells along the ray (including the blocking cell) are marked visible.
 *
 * @param map - Map to cast ray on
 * @param originX - Starting X coordinate
 * @param originY - Starting Y coordinate
 * @param targetX - Ray direction target X
 * @param targetY - Ray direction target Y
 * @param range - Maximum ray distance
 * @param visibleCells - Set to add visible cells to
 * @param cellsArray - Array to add visible cells to
 */
function castRay(
  map: FovMap,
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  range: number,
  visibleCells: Set<string>,
  cellsArray: VisibleCell[]
): void {
  const line = bresenhamLine(originX, originY, targetX, targetY);

  for (const point of line) {
    let { x, y } = point;

    // Check range using Chebyshev distance
    if (chebyshevDistance(originX, originY, x, y) > range) {
      break;
    }

    // Handle wrapping
    if (map.edgeBehavior === 'wrap') {
      x = (((x % map.width) + map.width) % map.width) as GridX;
      y = (((y % map.height) + map.height) % map.height) as GridY;
    } else if (!map.isInBounds(x, y)) {
      break;
    }

    // Mark as visible (avoid duplicates)
    const key = cellKey(x, y);
    if (!visibleCells.has(key)) {
      visibleCells.add(key);
      cellsArray.push({ x, y });
    }

    // Stop if we hit a blocking tile
    if (map.blocksVision(x, y)) {
      break;
    }
  }
}

/**
 * Calculate field of view using basic raycasting
 *
 * Casts rays in a circular pattern around the origin. The number of rays
 * is proportional to the range to ensure good coverage.
 *
 * @param map - Map to compute FOV on
 * @param originX - X coordinate of viewer
 * @param originY - Y coordinate of viewer
 * @param range - Maximum visibility range in tiles
 * @returns Set of visible cells and array for iteration
 *
 * @example
 * ```typescript
 * const map = createMap(80, 50);
 * const fov = raycasting(map, 40, 25, 10);
 *
 * if (fov.visibleCells.has(cellKey(42, 27))) {
 *   console.log('Cell is visible!');
 * }
 * ```
 */
export function raycasting(
  map: FovMap,
  originX: number,
  originY: number,
  range: number
): FovResult {
  const visibleCells = new Set<string>();
  const cells: VisibleCell[] = [];

  // Origin is always visible
  visibleCells.add(cellKey(originX, originY));
  cells.push({ x: originX as GridX, y: originY as GridY });

  // Cast rays in a circle
  // Number of rays scales with range to maintain coverage
  const numRays = Math.max(360, range * 16);

  for (let i = 0; i < numRays; i++) {
    const angle = (i * 2 * Math.PI) / numRays;

    // Calculate target point at maximum range
    const targetX = Math.round(originX + range * Math.cos(angle));
    const targetY = Math.round(originY + range * Math.sin(angle));

    castRay(
      map,
      originX,
      originY,
      targetX,
      targetY,
      range,
      visibleCells,
      cells
    );
  }

  return { visibleCells, cells };
}
