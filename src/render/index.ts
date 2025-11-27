export * from './types';
export * from './LayerManager';

import type { PixelX, PixelY, PixelHeight, PixelWidth } from './types';
import type { GridX, GridY } from '../grid';

/**
 * Converts grid X coordinate to pixel X coordinate
 *
 * @param gridX - Grid column coordinate
 * @param cellWidth - Width of each grid cell in pixels
 * @returns Pixel X coordinate for rendering
 *
 * @example
 * ```typescript
 * const pixelX = gridToPixelX(5 as GridX, 16 as PixelWidth);
 * // Returns 80 (5 * 16)
 * ```
 */
export function gridToPixelX(gridX: GridX, cellWidth: PixelWidth): PixelX {
  return Math.floor(gridX * cellWidth) as PixelX;
}

/**
 * Converts grid Y coordinate to pixel Y coordinate
 *
 * @param gridY - Grid row coordinate
 * @param cellHeight - Height of each grid cell in pixels
 * @returns Pixel Y coordinate for rendering
 *
 * @example
 * ```typescript
 * const pixelY = gridToPixelY(3 as GridY, 16 as PixelHeight);
 * // Returns 48 (3 * 16)
 * ```
 */
export function gridToPixelY(gridY: GridY, cellHeight: PixelHeight): PixelY {
  return Math.floor(gridY * cellHeight) as PixelY;
}

/**
 * Converts pixel X coordinate to grid X coordinate
 *
 * Useful for converting mouse/touch coordinates to grid positions.
 *
 * @param pixelX - Pixel X coordinate (e.g., from mouse position)
 * @param cellWidth - Width of each grid cell in pixels
 * @returns Grid column coordinate
 *
 * @example
 * ```typescript
 * const gridX = pixelToGridX(125 as PixelX, 16 as PixelWidth);
 * // Returns 7 (floor(125 / 16))
 * ```
 */
export function pixelToGridX(pixelX: PixelX, cellWidth: PixelWidth): GridX {
  return Math.floor(pixelX / cellWidth) as GridX;
}

/**
 * Converts pixel Y coordinate to grid Y coordinate
 *
 * Useful for converting mouse/touch coordinates to grid positions.
 *
 * @param pixelY - Pixel Y coordinate (e.g., from mouse position)
 * @param cellHeight - Height of each grid cell in pixels
 * @returns Grid row coordinate
 *
 * @example
 * ```typescript
 * const gridY = pixelToGridY(95 as PixelY, 16 as PixelHeight);
 * // Returns 5 (floor(95 / 16))
 * ```
 */
export function pixelToGridY(pixelY: PixelY, cellHeight: PixelHeight): GridY {
  return Math.floor(pixelY / cellHeight) as GridY;
}
