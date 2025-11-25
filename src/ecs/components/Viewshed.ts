/**
 * Viewshed Component
 *
 * Tracks which cells an entity can see from its current position.
 * The viewshed is recalculated when the dirty flag is true.
 */

import type { FovAlgorithm } from '../../fov/types.js';

export const Viewshed = 'viewshed';

/**
 * Viewshed component stores visibility information for an entity
 *
 * @property range - Maximum visibility distance in tiles
 * @property algorithm - Which FOV algorithm to use
 * @property visibleCells - Set of currently visible cell coordinates as "x,y" strings
 * @property dirty - If true, viewshed needs recalculation (set by movement, cleared by ViewshedSystem)
 */
export interface Viewshed {
  /** Maximum visibility range in tiles */
  range: number;

  /** FOV algorithm to use */
  algorithm: FovAlgorithm;

  /**
   * Currently visible cells as "x,y" string keys
   * Use cellKey(x, y) from fov/types to create keys
   */
  visibleCells: Set<string>;

  /**
   * Dirty flag - if true, viewshed needs recalculation
   * Set to true when entity moves, cleared by ViewshedSystem
   */
  dirty: boolean;
}

/**
 * Create a new Viewshed component with default values
 *
 * @param range - Maximum visibility range (default: 10)
 * @param algorithm - FOV algorithm to use (default: 'shadowcasting')
 * @returns New Viewshed component
 *
 * @example
 * ```typescript
 * world.addComponent(entity, Viewshed, createViewshed(15));
 * ```
 */
export function createViewshed(
  range: number = 10,
  algorithm: FovAlgorithm = 'shadowcasting'
): Viewshed {
  return {
    range,
    algorithm,
    visibleCells: new Set(),
    dirty: true, // Start dirty to trigger initial calculation
  };
}
