import type { Entity, World } from './types';

/**
 * EntityBuilder provides a fluent API for creating entities with components
 *
 * @example
 * ```typescript
 * const player = createEntityBuilder(world)
 *   .with('Position', { x: 10, y: 10 })
 *   .with('PlayerControlled', {})
 *   .with('Glyph', { char: '@', color: [255, 255, 255] })
 *   .build();
 * ```
 */
export class EntityBuilder {
  constructor(private world: World, private entity: Entity) {}

  /**
   * Add a component to the entity being built
   * @param key - Component key
   * @param component - Component data
   * @returns this builder for chaining
   */
  with<T>(key: string, component: T): EntityBuilder {
    this.world.addComponent(this.entity, key, component);
    return this;
  }

  /**
   * Complete the entity and return its ID
   * @returns The entity ID
   */
  build(): Entity {
    return this.entity;
  }

  /**
   * Get the world this builder is attached to
   * Useful for advanced operations during building
   */
  getWorld(): World {
    return this.world;
  }

  /**
   * Get the entity ID being built
   * Useful for referencing the entity before completion
   */
  getEntity(): Entity {
    return this.entity;
  }
}

/**
 * Create a new entity builder for the given world
 * @param world - The ECS world to create the entity in
 * @returns A new EntityBuilder instance
 *
 * @example
 * ```typescript
 * const enemy = createEntityBuilder(world)
 *   .with('Position', { x: 5, y: 5 })
 *   .with('BlocksMovement', {})
 *   .build();
 * ```
 */
export function createEntityBuilder(world: World): EntityBuilder {
  return new EntityBuilder(world, world.createEntity());
}
