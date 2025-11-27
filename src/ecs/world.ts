import type p5 from 'p5';
import type { Entity, World, System, Phase } from './types';

const PHASE_ORDER: Phase[] = ['early', 'update', 'late', 'render'];

/**
 * Creates a new ECS (Entity Component System) world
 *
 * The world is the core of the ECS architecture, managing entities, components, systems,
 * and resources. It uses bitmasking for efficient component queries (supports up to 31
 * component types with 32-bit signatures).
 *
 * **Architecture:**
 * - **Entities**: Unique numeric IDs
 * - **Components**: Data stored in per-type Maps keyed by entity ID
 * - **Systems**: Logic that runs in phases (early → update → late → render)
 * - **Resources**: Global singleton data (clock, input state, etc.)
 *
 * @returns World object with methods for entity/component/system management
 *
 * @example
 * ```typescript
 * const world = createWorld();
 *
 * // Register components (automatic on first use)
 * const player = world.createEntity();
 * world.addComponent(player, 'Position', { x: 0, y: 0 });
 * world.addComponent(player, 'Health', { current: 100, max: 100 });
 *
 * // Query entities with specific components
 * for (const entity of world.query(['Position', 'Health'])) {
 *   const pos = world.getComponent(entity, 'Position');
 *   const health = world.getComponent(entity, 'Health');
 *   console.log(`Entity at (${pos.x}, ${pos.y}) has ${health.current} HP`);
 * }
 *
 * // Add systems
 * world.addSystem({
 *   phase: 'update',
 *   run: (world, dt) => {
 *     // System logic runs each tick
 *   }
 * });
 *
 * // Add resources
 * world.addResource('GameClock', createGameClock());
 *
 * // Run one simulation tick (executes all systems in phase order)
 * world.tick(deltaTime);
 * ```
 */
export function createWorld(): World {
  let nextId = 1;
  const stores = new Map<string, Map<Entity, any>>();
  const registry = new Map<string, number>();
  const systemsByPhase = new Map<Phase, System[]>();
  PHASE_ORDER.forEach(ph => systemsByPhase.set(ph, []));
  const resources = new Map<string, any>();

  const signature = new Map<Entity, number>();

  function ensureStore<T>(key: string): Map<Entity, T> {
    if (!stores.has(key)) {
      stores.set(key, new Map());
    }
    return stores.get(key)! as Map<Entity, T>;
  }

  function registerComponent(key: string): number {
    if (registry.has(key)) {
      return registry.get(key)!;
    }
    const idx = registry.size;
    if (idx >= 31) {
      throw new Error('Component limit reached for 32-bit signature. Use BigInt or split worlds.');
    }
    registry.set(key, idx);
    ensureStore<any>(key);
    return idx;
  }

  function maskFor(keys: string[]): number {
    let m = 0;
    for (const k of keys) {
      const idx = registry.get(k);
      if (idx === undefined) {
        throw new Error(`Component "${k}" not registered`);
      }
      m |= (1 << idx);
    }
    return m;
  }

  function createEntity(): Entity {
    const e = nextId++;
    signature.set(e, 0);
    return e;
  }

  function destroyEntity(e: Entity): void {
    for (const store of stores.values()) {
      store.delete(e);
    }
    signature.delete(e);
  }

  function addComponent<T>(e: Entity, key: string, c: T): void {
    if (!signature.has(e)) {
      throw new Error('Unknown entity');
    }
    const idx = registerComponent(key);
    const store = ensureStore<T>(key);
    store.set(e, c);
    signature.set(e, signature.get(e)! | (1 << idx));
  }

  function removeComponent(e: Entity, key: string): void {
    const idx = registry.get(key);
    if (idx === undefined) {
      return;
    }
    const store = stores.get(key);
    store?.delete(e);
    const sig = signature.get(e);
    if (sig !== undefined) {
      signature.set(e, sig & ~(1 << idx));
    }
  }

  function getComponent<T>(e: Entity, key: string): T | undefined {
    const store = stores.get(key) as Map<Entity, T> | undefined;
    return store?.get(e);
  }

  function* query(all: string[]): Iterable<Entity> {
    const needed = maskFor(all);
    for (const [e, sig] of signature) {
      if ((sig & needed) === needed) yield e;
    }
  }

  function getStore<T>(key: string): Map<Entity, T> {
    return ensureStore<T>(key);
  }

  function addSystem(sys: System): void {
    systemsByPhase.get(sys.phase)!.push(sys);
  }

  function addResource<T>(key: string, resource: T): void {
    resources.set(key, resource);
  }

  function getResource<T>(key: string): T | undefined {
    return resources.get(key) as T | undefined;
  }

  function tick(dt: number, p?: p5, layer?: p5.Graphics): void {
    for (const phase of PHASE_ORDER) {
      for (const sys of systemsByPhase.get(phase)!) {
        sys.run(api, dt, phase === 'render' ? p : undefined, phase === 'render' ? layer : undefined);
      }
    }
  }

  const api: World = {
    createEntity,
    destroyEntity,
    registerComponent,
    addComponent,
    getComponent,
    removeComponent,
    query,
    getStore,
    addSystem,
    addResource,
    getResource,
    tick,
  };

  return api;
}
