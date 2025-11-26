/**
 * Visibility Utilities Tests
 *
 * Tests for fog of war and visibility helper functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from '../src/ecs/world';
import { createMap, Tiles } from '../src/map';
import { ViewshedSystem } from '../src/ecs/systems/ViewshedSystem';
import { Components, createViewshed, createMemory } from '../src/ecs/components';
import {
  getVisibilityState,
  isVisible,
  isExplored,
  anyCellVisible,
  getVisibleEntities,
} from '../src/fov/visibility';
import { cellKey } from '../src/fov/types';

describe('Visibility Utilities', () => {
  let world;
  let map;
  let viewshedSystem;
  let entity;

  beforeEach(() => {
    map = createMap(20, 20, { defaultTile: Tiles.Floor, edgeBehavior: 'block' });
    world = createWorld();
    viewshedSystem = new ViewshedSystem(map);
    world.addSystem(viewshedSystem);

    // Create entity with viewshed and memory
    entity = world.createEntity();
    world.addComponent(entity, Components.Position, { x: 10, y: 10 });
    world.addComponent(entity, Components.Viewshed, createViewshed(5));
    world.addComponent(entity, Components.Memory, createMemory());

    // Calculate initial FOV
    world.tick(0);
  });

  describe('getVisibilityState', () => {
    it('should return "visible" for currently visible cells', () => {
      const state = getVisibilityState(world, entity, 10, 10);
      expect(state).toBe('visible');
    });

    it('should return "explored" for previously seen cells', () => {
      // Cell at (12, 10) is currently visible
      expect(getVisibilityState(world, entity, 12, 10)).toBe('visible');

      // Move entity far away (outside range of 5)
      const pos = world.getComponent(entity, Components.Position);
      pos.x = 1;
      pos.y = 1;

      const viewshed = world.getComponent(entity, Components.Viewshed);
      viewshed.dirty = true;

      // Recalculate FOV
      world.tick(0);

      // Old position (12, 10) should be explored but not visible
      const state = getVisibilityState(world, entity, 12, 10);
      expect(state).toBe('explored');
    });

    it('should return "hidden" for unseen cells', () => {
      // Cell far away that has never been seen
      const state = getVisibilityState(world, entity, 19, 19);
      expect(state).toBe('hidden');
    });

    it('should handle entity without memory component', () => {
      // Create entity without memory
      const entity2 = world.createEntity();
      world.addComponent(entity2, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity2, Components.Viewshed, createViewshed(5));
      world.tick(0);

      // Should be visible
      expect(getVisibilityState(world, entity2, 10, 10)).toBe('visible');

      // Cell at range 5 is still within viewshed, so check further away
      expect(getVisibilityState(world, entity2, 19, 19)).toBe('hidden');
    });

    it('should handle entity without viewshed component', () => {
      const entity2 = world.createEntity();
      world.addComponent(entity2, Components.Position, { x: 10, y: 10 });

      // Everything should be hidden
      expect(getVisibilityState(world, entity2, 10, 10)).toBe('hidden');
    });
  });

  describe('isVisible', () => {
    it('should return true for visible cells', () => {
      expect(isVisible(world, entity, 10, 10)).toBe(true);
      expect(isVisible(world, entity, 11, 10)).toBe(true);
    });

    it('should return false for non-visible cells', () => {
      expect(isVisible(world, entity, 19, 19)).toBe(false);
    });

    it('should return false when entity has no viewshed', () => {
      const entity2 = world.createEntity();
      world.addComponent(entity2, Components.Position, { x: 10, y: 10 });

      expect(isVisible(world, entity2, 10, 10)).toBe(false);
    });
  });

  describe('isExplored', () => {
    it('should return true for explored cells', () => {
      expect(isExplored(world, entity, 10, 10)).toBe(true);
    });

    it('should return false for unexplored cells', () => {
      expect(isExplored(world, entity, 19, 19)).toBe(false);
    });

    it('should return false when entity has no memory', () => {
      const entity2 = world.createEntity();
      world.addComponent(entity2, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity2, Components.Viewshed, createViewshed(5));
      world.tick(0);

      expect(isExplored(world, entity2, 10, 10)).toBe(false);
    });

    it('should persist after cell is no longer visible', () => {
      // Cell is currently visible and explored
      expect(isExplored(world, entity, 12, 10)).toBe(true);

      // Move away
      const pos = world.getComponent(entity, Components.Position);
      pos.x = 5;
      pos.y = 5;

      const viewshed = world.getComponent(entity, Components.Viewshed);
      viewshed.dirty = true;
      world.tick(0);

      // Should still be explored
      expect(isExplored(world, entity, 12, 10)).toBe(true);
      // But not visible
      expect(isVisible(world, entity, 12, 10)).toBe(false);
    });
  });

  describe('anyCellVisible', () => {
    it('should return true if any coordinate is visible', () => {
      const coords = [
        { x: 10, y: 10 }, // Visible
        { x: 19, y: 19 }, // Not visible
      ];

      expect(anyCellVisible(world, entity, coords)).toBe(true);
    });

    it('should return false if no coordinates are visible', () => {
      const coords = [
        { x: 19, y: 19 },
        { x: 18, y: 18 },
      ];

      expect(anyCellVisible(world, entity, coords)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(anyCellVisible(world, entity, [])).toBe(false);
    });

    it('should return false when entity has no viewshed', () => {
      const entity2 = world.createEntity();
      world.addComponent(entity2, Components.Position, { x: 10, y: 10 });

      const coords = [{ x: 10, y: 10 }];
      expect(anyCellVisible(world, entity2, coords)).toBe(false);
    });
  });

  describe('getVisibleEntities', () => {
    it('should return entities that are visible', () => {
      // Create another entity in visible range
      const entity2 = world.createEntity();
      world.addComponent(entity2, Components.Position, { x: 12, y: 10 });
      world.addComponent(entity2, Components.Glyph, { glyph: '@', fg: [255, 255, 255], bg: [0, 0, 0] });

      const visible = getVisibleEntities(world, entity, [Components.Glyph]);
      expect(visible).toContain(entity2);
    });

    it('should not return entities that are not visible', () => {
      // Create entity outside visible range
      const entity2 = world.createEntity();
      world.addComponent(entity2, Components.Position, { x: 19, y: 19 });
      world.addComponent(entity2, Components.Glyph, { glyph: '@', fg: [255, 255, 255], bg: [0, 0, 0] });

      const visible = getVisibleEntities(world, entity, [Components.Glyph]);
      expect(visible).not.toContain(entity2);
    });

    it('should not return entities without required components', () => {
      // Register Glyph component first
      world.registerComponent(Components.Glyph);

      // Create entity without Glyph component
      const entity2 = world.createEntity();
      world.addComponent(entity2, Components.Position, { x: 11, y: 10 });

      const visible = getVisibleEntities(world, entity, [Components.Glyph]);
      expect(visible).not.toContain(entity2);
    });

    it('should return empty array when viewer has no viewshed', () => {
      const entity2 = world.createEntity();
      world.addComponent(entity2, Components.Position, { x: 10, y: 10 });

      const visible = getVisibleEntities(world, entity2, [Components.Glyph]);
      expect(visible).toEqual([]);
    });

    it('should handle multiple visible entities', () => {
      // Create multiple entities in visible range
      const entity2 = world.createEntity();
      world.addComponent(entity2, Components.Position, { x: 11, y: 10 });
      world.addComponent(entity2, Components.Glyph, { glyph: '@', fg: [255, 255, 255], bg: [0, 0, 0] });

      const entity3 = world.createEntity();
      world.addComponent(entity3, Components.Position, { x: 12, y: 11 });
      world.addComponent(entity3, Components.Glyph, { glyph: '@', fg: [255, 255, 255], bg: [0, 0, 0] });

      const visible = getVisibleEntities(world, entity, [Components.Glyph]);
      expect(visible).toHaveLength(2);
      expect(visible).toContain(entity2);
      expect(visible).toContain(entity3);
    });
  });

  describe('Integration with FOV algorithms', () => {
    it('should work correctly after FOV recalculation', () => {
      // Initial state - entity at (10, 10) can see itself
      expect(isVisible(world, entity, 10, 10)).toBe(true);

      // Move entity far away (outside range 5 of old position)
      const pos = world.getComponent(entity, Components.Position);
      pos.x = 1;
      pos.y = 1;

      const viewshed = world.getComponent(entity, Components.Viewshed);
      viewshed.dirty = true;

      // Recalculate
      world.tick(0);

      // Old position (10, 10) should be explored but not visible (too far away)
      expect(isVisible(world, entity, 10, 10)).toBe(false);
      expect(isExplored(world, entity, 10, 10)).toBe(true);

      // New position should be visible
      expect(isVisible(world, entity, 1, 1)).toBe(true);
    });

    it('should handle walls blocking visibility', () => {
      // Add wall between entity and target
      map.setTile(12, 10, Tiles.Wall);

      // Recalculate FOV
      const viewshed = world.getComponent(entity, Components.Viewshed);
      viewshed.dirty = true;
      world.tick(0);

      // Wall should be visible
      expect(isVisible(world, entity, 12, 10)).toBe(true);

      // Cell behind wall should not be visible
      expect(isVisible(world, entity, 14, 10)).toBe(false);
    });
  });
});
