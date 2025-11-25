/**
 * Shadowcasting Field of View Algorithm
 *
 * This implementation is based on recursive shadowcasting, which is simpler
 * and more reliable than the slope-based approach.
 *
 * The algorithm divides the field into 4 quadrants and processes each
 * by tracking start and end slopes as we scan outward from the origin.
 */

import type { GridX, GridY } from '../grid/types.js';
import type { FovMap, FovResult, VisibleCell } from './types.js';
import { cellKey } from './types.js';

/**
 * Octant multipliers for transforming coordinates
 * Each octant represents a 45° sector around the origin
 * Format: [xx, xy, yx, yy] for transforming (col, row) to (x, y)
 */
const MULT = [
  [1, 0, 0, 1],   // Octant 0: East
  [0, 1, 1, 0],   // Octant 1: Northeast
  [0, -1, 1, 0],  // Octant 2: North
  [-1, 0, 0, 1],  // Octant 3: Northwest
  [-1, 0, 0, -1], // Octant 4: West
  [0, -1, -1, 0], // Octant 5: Southwest
  [0, 1, -1, 0],  // Octant 6: South
  [1, 0, 0, -1],  // Octant 7: Southeast
];

/**
 * Cast shadows in a single octant/quadrant slice
 */
function castLight(
  map: FovMap,
  originX: number,
  originY: number,
  range: number,
  row: number,
  startSlope: number,
  endSlope: number,
  xx: number,
  xy: number,
  yx: number,
  yy: number,
  visibleCells: Set<string>,
  cellsArray: VisibleCell[]
): void {
  if (startSlope < endSlope) {
    return;
  }

  let nextStartSlope = startSlope;

  for (let i = row; i <= range; i++) {
    let blocked = false;

    for (let dx = -i; dx <= 0; dx++) {
      const dy = -i;

      const l_slope = (dx - 0.5) / (dy + 0.5);
      const r_slope = (dx + 0.5) / (dy - 0.5);

      if (startSlope < r_slope) {
        continue;
      }
      if (endSlope > l_slope) {
        break;
      }

      // Transform coordinates
      const ax = dx * xx + dy * xy;
      const ay = dx * yx + dy * yy;
      const x = originX + ax;
      const y = originY + ay;

      // Check range (Chebyshev distance)
      if (Math.abs(ax) > range || Math.abs(ay) > range) {
        continue;
      }

      // Handle map edges
      let actualX = x;
      let actualY = y;

      if (map.edgeBehavior === 'wrap') {
        actualX = ((x % map.width) + map.width) % map.width;
        actualY = ((y % map.height) + map.height) % map.height;
      } else if (!map.isInBounds(x, y)) {
        continue;
      }

      // Mark as visible
      const key = cellKey(actualX, actualY);
      if (!visibleCells.has(key)) {
        visibleCells.add(key);
        cellsArray.push({ x: actualX as GridX, y: actualY as GridY });
      }

      // Check if tile blocks vision
      if (map.blocksVision(actualX, actualY)) {
        if (blocked) {
          // Previous tile was blocking, adjust slope
          nextStartSlope = r_slope;
          continue;
        } else {
          // This is a new blocking tile
          blocked = true;
          nextStartSlope = r_slope;
          castLight(
            map,
            originX,
            originY,
            range,
            i + 1,
            startSlope,
            l_slope,
            xx,
            xy,
            yx,
            yy,
            visibleCells,
            cellsArray
          );
        }
      } else {
        if (blocked) {
          // Just passed a blocking tile
          blocked = false;
          startSlope = nextStartSlope;
        }
      }
    }

    if (blocked) {
      break;
    }
  }
}

/**
 * Calculate field of view using shadowcasting algorithm
 *
 * Computes which cells are visible from a given position, up to a maximum range.
 * Cells are blocked by opaque tiles (determined by map.blocksVision()).
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
 * const fov = shadowcasting(map, 40, 25, 10);
 *
 * // Check if a cell is visible
 * if (fov.visibleCells.has(cellKey(42, 27))) {
 *   console.log('Cell is visible!');
 * }
 *
 * // Iterate over visible cells
 * for (const cell of fov.cells) {
 *   console.log(`Visible: ${cell.x}, ${cell.y}`);
 * }
 * ```
 */
export function shadowcasting(
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

  // Process each of the 8 octants
  for (let oct = 0; oct < 8; oct++) {
    castLight(
      map,
      originX,
      originY,
      range,
      1,
      1.0,
      0.0,
      MULT[oct][0],
      MULT[oct][1],
      MULT[oct][2],
      MULT[oct][3],
      visibleCells,
      cells
    );
  }

  return { visibleCells, cells };
}
