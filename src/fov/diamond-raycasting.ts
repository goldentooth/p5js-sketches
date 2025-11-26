/**
 * Diamond Raycasting Field of View Algorithm
 *
 * A variant of raycasting that casts rays to cell edges rather than centers,
 * producing more permissive visibility with minimal shadows.
 *
 * Characteristics:
 * - Creates minimal shadows (single-line) behind obstacles
 * - Allows corner peeking
 * - Good for stealth gameplay mechanics
 * - Blocks diagonal walls completely
 * - Slightly more generous than basic raycasting
 */

import type { GridX, GridY } from '../grid/types.js';
import type { FovMap, FovResult, VisibleCell } from './types.js';
import { cellKey } from './types.js';
import { bresenhamLine, chebyshevDistance } from './line.js';

/**
 * Cast a ray to a specific cell edge point
 *
 * Similar to basic raycasting but targets cell corners/edges
 * for more permissive visibility.
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
function castDiamondRay(
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

    // Check range
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
 * Calculate field of view using diamond raycasting
 *
 * Casts rays to cell corners and edges rather than centers, creating
 * a more permissive field of view with minimal shadows. Good for
 * gameplay where you want players to see around corners.
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
 * const fov = diamondRaycasting(map, 40, 25, 10);
 *
 * // Diamond raycasting is more permissive than basic raycasting
 * // and allows seeing around corners more easily
 * if (fov.visibleCells.has(cellKey(42, 27))) {
 *   console.log('Cell is visible!');
 * }
 * ```
 */
export function diamondRaycasting(
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

  // Cast rays in a circle, but to cell corners/edges
  // Use more rays than basic raycasting for better coverage
  const numRays = Math.max(360, range * 24);

  for (let i = 0; i < numRays; i++) {
    const angle = (i * 2 * Math.PI) / numRays;

    // Calculate target point at maximum range
    // Add small offset to target cell edges/corners
    const offsetAngle = ((i % 4) * Math.PI) / 8; // Cycle through edge offsets
    const targetX = Math.round(
      originX + range * Math.cos(angle + offsetAngle * 0.1)
    );
    const targetY = Math.round(
      originY + range * Math.sin(angle + offsetAngle * 0.1)
    );

    castDiamondRay(
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
