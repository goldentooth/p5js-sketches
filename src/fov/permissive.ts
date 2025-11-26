/**
 * Permissive Field of View Algorithm
 *
 * A highly configurable FOV algorithm that allows adjusting how "permissive"
 * the line-of-sight calculation is. Higher permissiveness allows seeing around
 * corners and obstacles more easily.
 *
 * Characteristics:
 * - Configurable permissiveness (0-8)
 * - Perfect symmetry at permissiveness level 8
 * - More complex than shadowcasting
 * - Good for tactical games where visibility precision matters
 * - Level 0 is most restrictive, level 8 is most permissive
 */

import type { GridX, GridY } from '../grid/types.js';
import type { FovMap, FovResult, VisibleCell } from './types.js';
import { cellKey } from './types.js';
import { bresenhamLine, chebyshevDistance } from './line.js';

/**
 * Check if a cell is "permissively" visible
 *
 * Higher permissiveness allows more rays to pass through,
 * making visibility more generous around corners.
 *
 * @param blockedRays - Number of rays blocked to this cell
 * @param totalRays - Total number of rays cast to this cell
 * @param permissiveness - Permissiveness level (0-8)
 * @returns Whether the cell should be considered visible
 */
function isPermissivelyVisible(
  blockedRays: number,
  totalRays: number,
  permissiveness: number
): boolean {
  // At permissiveness 0, all rays must succeed
  if (permissiveness === 0) {
    return blockedRays === 0;
  }

  // At permissiveness 8, only one ray needs to succeed
  if (permissiveness >= 8) {
    return blockedRays < totalRays;
  }

  // For intermediate levels, calculate threshold
  // Higher permissiveness = more tolerance for blocked rays
  const threshold = (permissiveness / 8) * totalRays;
  const successfulRays = totalRays - blockedRays;

  return successfulRays > threshold;
}

/**
 * Calculate field of view using permissive algorithm
 *
 * Casts multiple rays per cell and uses permissiveness threshold
 * to determine visibility. More permissive = see around corners more.
 *
 * @param map - Map to compute FOV on
 * @param originX - X coordinate of viewer
 * @param originY - Y coordinate of viewer
 * @param range - Maximum visibility range in tiles
 * @param permissiveness - Permissiveness level (0-8), default 4
 * @returns Set of visible cells and array for iteration
 *
 * @example
 * ```typescript
 * const map = createMap(80, 50);
 *
 * // Restrictive visibility
 * const restrictive = permissiveFov(map, 40, 25, 10, 0);
 *
 * // Balanced visibility
 * const balanced = permissiveFov(map, 40, 25, 10, 4);
 *
 * // Very permissive (perfect symmetry)
 * const permissive = permissiveFov(map, 40, 25, 10, 8);
 * ```
 */
export function permissiveFov(
  map: FovMap,
  originX: number,
  originY: number,
  range: number,
  permissiveness: number = 4
): FovResult {
  // Clamp permissiveness to valid range
  const perm = Math.max(0, Math.min(8, permissiveness));

  const visibleCells = new Set<string>();
  const cells: VisibleCell[] = [];

  // Origin is always visible
  visibleCells.add(cellKey(originX, originY));
  cells.push({ x: originX as GridX, y: originY as GridY });

  // Track ray results per cell
  const cellRayResults = new Map<string, { blocked: number; total: number }>();

  // Cast multiple rays per direction for permissiveness testing
  const raysPerCell = 4; // Cast 4 rays per target cell (corners)
  const numDirections = Math.max(360, range * 16);

  for (let i = 0; i < numDirections; i++) {
    const angle = (i * 2 * Math.PI) / numDirections;

    // Cast rays to cell corners for each direction
    for (let r = 0; r < raysPerCell; r++) {
      const cornerOffset = (r * 0.5 - 0.25) * 0.9; // Offset to target corners

      const targetX = Math.round(
        originX + range * Math.cos(angle) + cornerOffset * Math.sin(angle)
      );
      const targetY = Math.round(
        originY + range * Math.sin(angle) - cornerOffset * Math.cos(angle)
      );

      const line = bresenhamLine(originX, originY, targetX, targetY);
      let blocked = false;

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
          blocked = true;
          break;
        }

        const key = cellKey(x, y);

        // Track ray results for this cell
        if (!cellRayResults.has(key)) {
          cellRayResults.set(key, { blocked: 0, total: 0 });
        }

        const result = cellRayResults.get(key)!;
        result.total++;

        if (blocked) {
          result.blocked++;
        }

        // Check if this cell blocks vision
        if (map.blocksVision(x, y)) {
          blocked = true;
          // Don't break - continue to count rays for cells behind
        }
      }
    }
  }

  // Determine visibility based on permissiveness threshold
  for (const [key, result] of cellRayResults) {
    if (isPermissivelyVisible(result.blocked, result.total, perm)) {
      if (!visibleCells.has(key)) {
        const coords = key.split(',').map(Number);
        visibleCells.add(key);
        cells.push({ x: coords[0] as GridX, y: coords[1] as GridY });
      }
    }
  }

  return { visibleCells, cells };
}
