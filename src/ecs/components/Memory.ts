/**
 * Memory Component
 *
 * Tracks which cells an entity has explored/seen over time.
 * Unlike Viewshed which tracks what is currently visible, Memory
 * accumulates all cells that have ever been visible to create a
 * "fog of war" effect with remembered/explored areas.
 */

export const Memory = 'Memory';

/**
 * Memory component stores exploration history for an entity
 *
 * @property exploredCells - Set of all cell coordinates ever seen as "x,y" strings
 */
export interface Memory {
  /**
   * All cells that have ever been visible to this entity
   * Stored as "x,y" string keys
   * Use cellKey(x, y) from fov/types to create keys
   */
  exploredCells: Set<string>;
}

/**
 * Create a new Memory component
 *
 * @returns New Memory component with empty exploration set
 *
 * @example
 * ```typescript
 * // Add memory to an entity
 * world.addComponent(entity, Memory, createMemory());
 *
 * // Check if a cell has been explored
 * const memory = world.getComponent(entity, Memory);
 * if (memory.exploredCells.has(cellKey(x, y))) {
 *   console.log('Entity has seen this cell before');
 * }
 * ```
 */
export function createMemory(): Memory {
  return {
    exploredCells: new Set(),
  };
}
