/**
 * ViewshedSystem Tests
 *
 * Tests for the ECS integration of FOV/viewshed functionality,
 * including dirty flag optimization and memory tracking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from '../src/ecs/world';
import { createMap, Tiles } from '../src/map';
import { ViewshedSystem } from '../src/ecs/systems/ViewshedSystem';
import { MovementSystem } from '../src/ecs/systems/MovementSystem';
import { Components, createViewshed, createMemory } from '../src/ecs/components';
import { Cardinal } from '../src/movement/directions';
import { cellKey } from '../src/fov/types';

describe('ViewshedSystem', () => {
  let world;
  let map;
  let viewshedSystem;

  beforeEach(() => {
    // Create a simple test map (20x20, all floors except edges)
    map = createMap(20, 20, { defaultTile: Tiles.Floor, edgeBehavior: 'block' });

    // Create ECS world and systems
    world = createWorld();
    viewshedSystem = new ViewshedSystem(map);
    world.addSystem(viewshedSystem);
  });

  describe('Basic FOV Calculation', () => {
    it('should calculate visible cells for an entity with viewshed', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Viewshed, createViewshed(5, 'shadowcasting'));

      // Run the system
      world.tick(0);

      const viewshed = world.getComponent(entity, Components.Viewshed);
      expect(viewshed.visibleCells.size).toBeGreaterThan(0);
      expect(viewshed.dirty).toBe(false); // Should be cleaned after processing
    });

    it('should include origin cell in visible cells', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Viewshed, createViewshed(5));

      world.tick(0);

      const viewshed = world.getComponent(entity, Components.Viewshed);
      expect(viewshed.visibleCells.has(cellKey(10, 10))).toBe(true);
    });

    it('should respect visibility range', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Viewshed, createViewshed(3));

      world.tick(0);

      const viewshed = world.getComponent(entity, Components.Viewshed);

      // Cell within range should be visible
      expect(viewshed.visibleCells.has(cellKey(12, 10))).toBe(true);

      // Cell outside range should not be visible
      expect(viewshed.visibleCells.has(cellKey(15, 10))).toBe(false);
    });

    it('should block vision through walls', () => {
      // Add a wall at (12, 10)
      map.setTile(12, 10, Tiles.Wall);

      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Viewshed, createViewshed(10));

      world.tick(0);

      const viewshed = world.getComponent(entity, Components.Viewshed);

      // Wall itself should be visible
      expect(viewshed.visibleCells.has(cellKey(12, 10))).toBe(true);

      // Cell behind wall should not be visible
      expect(viewshed.visibleCells.has(cellKey(14, 10))).toBe(false);
    });
  });

  describe('Dirty Flag Optimization', () => {
    it('should not recalculate when viewshed is not dirty', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Viewshed, createViewshed(5));

      // First tick calculates FOV
      world.tick(0);
      const viewshed = world.getComponent(entity, Components.Viewshed);
      const firstVisibleCount = viewshed.visibleCells.size;

      // Second tick should not recalculate (dirty = false)
      world.tick(0);
      expect(viewshed.visibleCells.size).toBe(firstVisibleCount);
      expect(viewshed.dirty).toBe(false);
    });

    it('should recalculate when viewshed is dirty', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Viewshed, createViewshed(5));

      world.tick(0);

      // Mark as dirty and change position
      const viewshed = world.getComponent(entity, Components.Viewshed);
      viewshed.dirty = true;

      const pos = world.getComponent(entity, Components.Position);
      pos.x = 11;
      pos.y = 11;

      // Should recalculate
      world.tick(0);
      expect(viewshed.dirty).toBe(false);
      expect(viewshed.visibleCells.has(cellKey(11, 11))).toBe(true);
    });
  });

  describe('Memory Integration', () => {
    it('should track explored cells when entity has memory', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Viewshed, createViewshed(5));
      world.addComponent(entity, Components.Memory, createMemory());

      world.tick(0);

      const memory = world.getComponent(entity, Components.Memory);
      expect(memory.exploredCells.size).toBeGreaterThan(0);
      expect(memory.exploredCells.has(cellKey(10, 10))).toBe(true);
    });

    it('should accumulate explored cells over time', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Viewshed, createViewshed(3));
      world.addComponent(entity, Components.Memory, createMemory());

      // First position
      world.tick(0);
      const memory = world.getComponent(entity, Components.Memory);
      const firstExploredCount = memory.exploredCells.size;

      // Move to new position
      const pos = world.getComponent(entity, Components.Position);
      pos.x = 15;
      pos.y = 15;

      const viewshed = world.getComponent(entity, Components.Viewshed);
      viewshed.dirty = true;

      // Second position
      world.tick(0);

      // Should have more explored cells
      expect(memory.exploredCells.size).toBeGreaterThanOrEqual(firstExploredCount);
      expect(memory.exploredCells.has(cellKey(10, 10))).toBe(true); // Still remembers old position
      expect(memory.exploredCells.has(cellKey(15, 15))).toBe(true); // Knows new position
    });

    it('should work without memory component', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Viewshed, createViewshed(5));
      // No memory component

      expect(() => world.tick(0)).not.toThrow();

      const viewshed = world.getComponent(entity, Components.Viewshed);
      expect(viewshed.visibleCells.size).toBeGreaterThan(0);
    });
  });

  describe('Multiple Algorithms', () => {
    it('should support shadowcasting algorithm', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Viewshed, createViewshed(5, 'shadowcasting'));

      world.tick(0);

      const viewshed = world.getComponent(entity, Components.Viewshed);
      expect(viewshed.visibleCells.size).toBeGreaterThan(0);
    });

    it('should support raycasting algorithm', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Viewshed, createViewshed(5, 'raycasting'));

      world.tick(0);

      const viewshed = world.getComponent(entity, Components.Viewshed);
      expect(viewshed.visibleCells.size).toBeGreaterThan(0);
    });

    it('should support diamond-raycasting algorithm', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Viewshed, createViewshed(5, 'diamond-raycasting'));

      world.tick(0);

      const viewshed = world.getComponent(entity, Components.Viewshed);
      expect(viewshed.visibleCells.size).toBeGreaterThan(0);
    });

    it('should support permissive algorithm', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      const viewshed = createViewshed(5, 'permissive');
      viewshed.permissiveness = 4;
      world.addComponent(entity, Components.Viewshed, viewshed);

      world.tick(0);

      const updatedViewshed = world.getComponent(entity, Components.Viewshed);
      expect(updatedViewshed.visibleCells.size).toBeGreaterThan(0);
    });
  });

  describe('Multiple Entities', () => {
    it('should handle multiple entities with viewsheds', () => {
      const entity1 = world.createEntity();
      world.addComponent(entity1, Components.Position, { x: 5, y: 5 });
      world.addComponent(entity1, Components.Viewshed, createViewshed(3));

      const entity2 = world.createEntity();
      world.addComponent(entity2, Components.Position, { x: 15, y: 15 });
      world.addComponent(entity2, Components.Viewshed, createViewshed(3));

      world.tick(0);

      const viewshed1 = world.getComponent(entity1, Components.Viewshed);
      const viewshed2 = world.getComponent(entity2, Components.Viewshed);

      expect(viewshed1.visibleCells.size).toBeGreaterThan(0);
      expect(viewshed2.visibleCells.size).toBeGreaterThan(0);
      expect(viewshed1.dirty).toBe(false);
      expect(viewshed2.dirty).toBe(false);
    });

    it('should not interfere between entity viewsheds', () => {
      const entity1 = world.createEntity();
      world.addComponent(entity1, Components.Position, { x: 5, y: 5 });
      world.addComponent(entity1, Components.Viewshed, createViewshed(3));

      const entity2 = world.createEntity();
      world.addComponent(entity2, Components.Position, { x: 15, y: 15 });
      world.addComponent(entity2, Components.Viewshed, createViewshed(3));

      world.tick(0);

      const viewshed1 = world.getComponent(entity1, Components.Viewshed);
      const viewshed2 = world.getComponent(entity2, Components.Viewshed);

      // They should not see each other's positions (too far apart)
      expect(viewshed1.visibleCells.has(cellKey(15, 15))).toBe(false);
      expect(viewshed2.visibleCells.has(cellKey(5, 5))).toBe(false);
    });
  });

  describe('Movement Integration', () => {
    it('should mark viewshed dirty when entity moves', () => {
      // Remove ViewshedSystem for this test to check dirty flag directly
      const world2 = createWorld();
      const movementSystem = new MovementSystem(map);
      world2.addSystem(movementSystem);

      const entity = world2.createEntity();
      world2.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world2.addComponent(entity, Components.PlayerControlled, {});
      world2.addComponent(entity, Components.Viewshed, createViewshed(5));

      // Queue movement
      movementSystem.queueCommand(entity, { type: 'move', direction: Cardinal.EAST });

      // Process movement (no ViewshedSystem, so dirty flag stays true)
      world2.tick(0);

      // Viewshed should be marked dirty after movement
      const viewshed = world2.getComponent(entity, Components.Viewshed);
      expect(viewshed.dirty).toBe(true);
    });

    it('should recalculate FOV after movement on next tick', () => {
      const movementSystem = new MovementSystem(map);
      world.addSystem(movementSystem);

      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.PlayerControlled, {});
      world.addComponent(entity, Components.Viewshed, createViewshed(3));

      // Initial calculation
      world.tick(0);
      const viewshed = world.getComponent(entity, Components.Viewshed);
      expect(viewshed.visibleCells.has(cellKey(10, 10))).toBe(true);

      // Move east
      movementSystem.queueCommand(entity, { type: 'move', direction: Cardinal.EAST });
      world.tick(0); // Movement happens, viewshed marked dirty
      world.tick(0); // ViewshedSystem recalculates

      // Should see new position
      const pos = world.getComponent(entity, Components.Position);
      expect(viewshed.visibleCells.has(cellKey(pos.x, pos.y))).toBe(true);
      expect(viewshed.dirty).toBe(false);
    });
  });
});
