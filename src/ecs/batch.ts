import type { Entity, World } from './types';

/**
 * Apply an update function to multiple entities
 *
 * @param world - The ECS world
 * @param entities - Iterable of entities to update
 * @param updater - Function to apply to each entity
 *
 * @example
 * ```typescript
 * // Move all enemies north
 * const enemies = world.query(['Position', 'Enemy']);
 * batchUpdate(world, enemies, (entity, world) => {
 *   const pos = world.getComponent(entity, 'Position');
 *   if (pos) pos.y -= 1;
 * });
 * ```
 */
export function batchUpdate(
  world: World,
  entities: Iterable<Entity>,
  updater: (entity: Entity, world: World) => void
): void {
  for (const entity of entities) {
    updater(entity, world);
  }
}

/**
 * Destroy all entities matching the given component query
 *
 * @param world - The ECS world
 * @param componentKeys - Component keys to match (entities must have ALL)
 * @returns Number of entities destroyed
 *
 * @example
 * ```typescript
 * // Remove all temporary expired entities
 * const removed = destroyWhere(world, ['Temporary', 'Expired']);
 * console.log(`Cleaned up ${removed} entities`);
 * ```
 */
export function destroyWhere(
  world: World,
  componentKeys: string[]
): number {
  const entities = Array.from(world.query(componentKeys));
  entities.forEach(e => world.destroyEntity(e));
  return entities.length;
}

/**
 * Count entities matching the given component query
 *
 * @param world - The ECS world
 * @param componentKeys - Component keys to match (entities must have ALL)
 * @returns Number of matching entities
 *
 * @example
 * ```typescript
 * const enemyCount = countWhere(world, ['Position', 'Enemy']);
 * const playerCount = countWhere(world, ['Position', 'PlayerControlled']);
 * ```
 */
export function countWhere(
  world: World,
  componentKeys: string[]
): number {
  let count = 0;
  for (const _ of world.query(componentKeys)) {
    count++;
  }
  return count;
}

/**
 * Collect all entities matching a query into an array
 *
 * @param world - The ECS world
 * @param componentKeys - Component keys to match
 * @returns Array of matching entity IDs
 *
 * @example
 * ```typescript
 * const allEnemies = collectWhere(world, ['Enemy']);
 * const visibleEnemies = allEnemies.filter(e => {
 *   const pos = world.getComponent(e, 'Position');
 *   return pos && isInViewport(pos.x, pos.y);
 * });
 * ```
 */
export function collectWhere(
  world: World,
  componentKeys: string[]
): Entity[] {
  return Array.from(world.query(componentKeys));
}

/**
 * Find the first entity matching a predicate
 *
 * @param world - The ECS world
 * @param componentKeys - Component keys to match
 * @param predicate - Function to test each entity
 * @returns First matching entity or undefined
 *
 * @example
 * ```typescript
 * const playerAt = findWhere(world, ['Position'], (entity, world) => {
 *   const pos = world.getComponent(entity, 'Position');
 *   return pos && pos.x === 10 && pos.y === 10;
 * });
 * ```
 */
export function findWhere(
  world: World,
  componentKeys: string[],
  predicate: (entity: Entity, world: World) => boolean
): Entity | undefined {
  for (const entity of world.query(componentKeys)) {
    if (predicate(entity, world)) {
      return entity;
    }
  }
  return undefined;
}

/**
 * Check if any entity matches a predicate
 *
 * @param world - The ECS world
 * @param componentKeys - Component keys to match
 * @param predicate - Function to test each entity
 * @returns True if any entity matches
 *
 * @example
 * ```typescript
 * const hasEnemyNearby = someWhere(world, ['Position', 'Enemy'], (e, world) => {
 *   const pos = world.getComponent(e, 'Position');
 *   return pos && distance(playerPos, pos) < 5;
 * });
 * ```
 */
export function someWhere(
  world: World,
  componentKeys: string[],
  predicate: (entity: Entity, world: World) => boolean
): boolean {
  for (const entity of world.query(componentKeys)) {
    if (predicate(entity, world)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if all entities match a predicate
 *
 * @param world - The ECS world
 * @param componentKeys - Component keys to match
 * @param predicate - Function to test each entity
 * @returns True if all entities match (or if there are no entities)
 *
 * @example
 * ```typescript
 * const allEnemiesDefeated = everyWhere(world, ['Enemy'], (e, world) => {
 *   const health = world.getComponent(e, 'Health');
 *   return health && health.current <= 0;
 * });
 * ```
 */
export function everyWhere(
  world: World,
  componentKeys: string[],
  predicate: (entity: Entity, world: World) => boolean
): boolean {
  for (const entity of world.query(componentKeys)) {
    if (!predicate(entity, world)) {
      return false;
    }
  }
  return true;
}
