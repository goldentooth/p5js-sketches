/**
 * ViewshedSystem - Calculates field of view for entities
 *
 * This system runs in the 'late' phase (after movement, before rendering)
 * and recalculates the visible cells for any entity with a dirty Viewshed component.
 *
 * The dirty flag optimization ensures FOV is only recalculated when necessary
 * (e.g., after movement), avoiding expensive computation every frame.
 */

import type { System, World, Phase } from '../types.js';
import type { Map as GameMap } from '../../map/types.js';
import type { Viewshed } from '../components/Viewshed.js';
import type { Position } from '../components/Position.js';
import type { Memory } from '../components/Memory.js';
import { Components } from '../components/index.js';
import { shadowcasting } from '../../fov/shadowcasting.js';
import { raycasting } from '../../fov/raycasting.js';
import { diamondRaycasting } from '../../fov/diamond-raycasting.js';
import { permissiveFov } from '../../fov/permissive.js';
import type { FovResult, FovMap } from '../../fov/types.js';
import { cellKey } from '../../fov/types.js';

/**
 * System that updates viewsheds for entities that can see
 */
export class ViewshedSystem implements System {
  phase: Phase = 'late';

  constructor(private map: GameMap) {}

  /**
   * Compute FOV using the specified algorithm
   *
   * @param map - Map to compute FOV on
   * @param x - Origin X coordinate
   * @param y - Origin Y coordinate
   * @param range - Maximum visibility range
   * @param algorithm - Which FOV algorithm to use
   * @param permissiveness - Permissiveness level for permissive algorithm (0-8)
   * @returns FOV result with visible cells
   */
  private computeFov(
    map: FovMap,
    x: number,
    y: number,
    range: number,
    algorithm: string,
    permissiveness: number = 2
  ): FovResult {
    switch (algorithm) {
      case 'shadowcasting':
        return shadowcasting(map, x, y, range);
      case 'raycasting':
        return raycasting(map, x, y, range);
      case 'diamond-raycasting':
        return diamondRaycasting(map, x, y, range);
      case 'permissive':
        return permissiveFov(map, x, y, range, permissiveness);
      default:
        // Default to shadowcasting for unknown algorithms
        return shadowcasting(map, x, y, range);
    }
  }

  /**
   * Update viewsheds for all entities with dirty viewsheds
   */
  run(world: World): void {
    // Query entities that have both Position and Viewshed
    for (const entity of world.query([Components.Position, Components.Viewshed])) {
      const pos = world.getComponent<Position>(entity, Components.Position);
      const viewshed = world.getComponent<Viewshed>(entity, Components.Viewshed);

      if (!pos || !viewshed) continue;

      // Skip if viewshed is not dirty
      if (!viewshed.dirty) continue;

      // Clear previous visible cells
      viewshed.visibleCells.clear();

      // Compute new FOV
      const fov = this.computeFov(
        this.map,
        pos.x,
        pos.y,
        viewshed.range,
        viewshed.algorithm,
        (viewshed as any).permissiveness // Optional permissiveness level
      );

      // Update viewshed with new visible cells
      viewshed.visibleCells = fov.visibleCells;

      // Update memory if entity has Memory component
      const memory = world.getComponent<Memory>(entity, Components.Memory);
      if (memory) {
        // Add all visible cells to explored set
        for (const key of fov.visibleCells) {
          memory.exploredCells.add(key);
        }
      }

      // Mark viewshed as clean
      viewshed.dirty = false;
    }
  }
}
