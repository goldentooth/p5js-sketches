/**
 * Visibility and Fog of War Utilities
 *
 * Helper functions for rendering with visibility states (visible, explored, hidden).
 * These utilities can be used in sketches to implement fog of war effects.
 */

import type p5 from 'p5';
import type { World, Entity } from '../ecs/types.js';
import type { Viewshed } from '../ecs/components/Viewshed.js';
import type { Memory } from '../ecs/components/Memory.js';
import { Components } from '../ecs/components/index.js';
import { cellKey } from './types.js';

/**
 * Visibility state of a cell
 */
export type VisibilityState = 'visible' | 'explored' | 'hidden';

/**
 * Get the visibility state of a cell from an entity's perspective
 *
 * @param world - ECS world
 * @param entity - Entity to check visibility from (must have Viewshed component)
 * @param x - Cell X coordinate
 * @param y - Cell Y coordinate
 * @returns Visibility state: 'visible', 'explored', or 'hidden'
 *
 * @example
 * ```typescript
 * const state = getVisibilityState(world, playerEntity, 10, 5);
 * if (state === 'visible') {
 *   // Render at full brightness
 * } else if (state === 'explored') {
 *   // Render dimmed/grayscale
 * } else {
 *   // Don't render (hidden)
 * }
 * ```
 */
export function getVisibilityState(
  world: World,
  entity: Entity,
  x: number,
  y: number
): VisibilityState {
  const key = cellKey(x, y);

  // Check if currently visible
  const viewshed = world.getComponent<Viewshed>(entity, Components.Viewshed);
  if (viewshed && viewshed.visibleCells.has(key)) {
    return 'visible';
  }

  // Check if previously explored
  const memory = world.getComponent<Memory>(entity, Components.Memory);
  if (memory && memory.exploredCells.has(key)) {
    return 'explored';
  }

  // Not visible and not explored
  return 'hidden';
}

/**
 * Check if a cell is currently visible to an entity
 *
 * @param world - ECS world
 * @param entity - Entity to check visibility from
 * @param x - Cell X coordinate
 * @param y - Cell Y coordinate
 * @returns True if cell is currently visible
 */
export function isVisible(world: World, entity: Entity, x: number, y: number): boolean {
  const viewshed = world.getComponent<Viewshed>(entity, Components.Viewshed);
  if (!viewshed) return false;
  return viewshed.visibleCells.has(cellKey(x, y));
}

/**
 * Check if a cell has been explored by an entity
 *
 * @param world - ECS world
 * @param entity - Entity to check exploration from
 * @param x - Cell X coordinate
 * @param y - Cell Y coordinate
 * @returns True if cell has been explored (seen before)
 */
export function isExplored(world: World, entity: Entity, x: number, y: number): boolean {
  const memory = world.getComponent<Memory>(entity, Components.Memory);
  if (!memory) return false;
  return memory.exploredCells.has(cellKey(x, y));
}

/**
 * Apply fog of war coloring to a p5 color
 *
 * @param color - Original color
 * @param state - Visibility state
 * @param p - p5 instance
 * @returns Modified color for the given visibility state
 *
 * Visibility states are rendered as:
 * - visible: Full color (no modification)
 * - explored: 30% brightness, slightly desaturated
 * - hidden: Fully transparent / not rendered
 */
export function applyFogOfWar(color: p5.Color, state: VisibilityState, p: p5): p5.Color {
  if (state === 'visible') {
    return color;
  } else if (state === 'explored') {
    // Dim to 30% brightness and desaturate slightly
    const c = p.color(color);
    const r = p.red(c);
    const g = p.green(c);
    const b = p.blue(c);
    const a = p.alpha(c);

    // Reduce brightness
    const dimmed = p.color(r * 0.3, g * 0.3, b * 0.3, a);
    return dimmed;
  } else {
    // Hidden - return transparent
    return p.color(0, 0, 0, 0);
  }
}

/**
 * Check if any cell is visible in a set of coordinates
 *
 * @param world - ECS world
 * @param entity - Entity to check visibility from
 * @param coords - Array of {x, y} coordinates
 * @returns True if any of the coordinates are visible
 */
export function anyCellVisible(
  world: World,
  entity: Entity,
  coords: Array<{ x: number; y: number }>
): boolean {
  const viewshed = world.getComponent<Viewshed>(entity, Components.Viewshed);
  if (!viewshed) return false;

  for (const coord of coords) {
    if (viewshed.visibleCells.has(cellKey(coord.x, coord.y))) {
      return true;
    }
  }
  return false;
}

/**
 * Get all currently visible entities from a viewer's perspective
 *
 * @param world - ECS world
 * @param viewerEntity - Entity doing the viewing (must have Viewshed)
 * @param targetComponents - Components that target entities must have (e.g., [Components.Position, Components.Glyph])
 * @returns Array of entities that are visible to the viewer
 */
export function getVisibleEntities(
  world: World,
  viewerEntity: Entity,
  targetComponents: string[]
): Entity[] {
  const viewshed = world.getComponent<Viewshed>(viewerEntity, Components.Viewshed);
  if (!viewshed) return [];

  const visible: Entity[] = [];

  for (const entity of world.query([Components.Position, ...targetComponents])) {
    const pos = world.getComponent<any>(entity, Components.Position);
    if (pos && viewshed.visibleCells.has(cellKey(pos.x, pos.y))) {
      visible.push(entity);
    }
  }

  return visible;
}
