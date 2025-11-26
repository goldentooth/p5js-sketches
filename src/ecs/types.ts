import type p5 from 'p5';

// Entity is simply a unique identifier for an object in the ECS.
export type Entity = number;

// Phase represents the different stages in the ECS update cycle.
//
// 'early'   - Initial phase for setup before updates
// 'update'  - Main update phase for game logic
// 'late'    - Final adjustments after updates
// 'render'  - Phase for rendering to the screen
export type Phase = 'early' | 'update' | 'late' | 'render';
export const Early: Phase = 'early';
export const Update: Phase = 'update';
export const Late: Phase = 'late';
export const Render: Phase = 'render';

// System represents a processing unit that operates on entities with specific components.
export interface System {
  // The phase in which this system should run
  phase: Phase;
  // The function that runs the system logic
  run: (world: World, dt: number, p?: p5, layer?: p5.Graphics) => void;
}

// World represents the entire ECS world, managing entities, components, and systems.
export interface World {
  // Create an entity and return its unique identifier
  createEntity(): Entity;

  // Destroy an entity and remove all its components
  destroyEntity(e: Entity): void;

  // Register a component type and return its bit index
  registerComponent(key: string): number;

  // Add a component to an entity
  addComponent<T>(e: Entity, key: string, c: T): void;

  // Get a component from an entity
  getComponent<T>(e: Entity, key: string): T | undefined;

  // Remove a component from an entity
  removeComponent(e: Entity, key: string): void;

  // Query entities that match all of the specified component keys
  query(all: string[]): Iterable<Entity>;

  // Get a typed store accessor for a specific component type
  getStore<T>(key: string): Map<Entity, T>;

  // Add a system to the world
  addSystem(sys: System): void;

  // Add a resource to the world (global state not attached to entities)
  addResource<T>(key: string, resource: T): void;

  // Get a resource from the world
  getResource<T>(key: string): T | undefined;

  // Update the world
  tick(dt: number, p?: p5): void;
}