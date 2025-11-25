import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, createEntityBuilder, EntityBuilder } from '../src';

describe('EntityBuilder', () => {
  let world;

  beforeEach(() => {
    world = createWorld();
  });

  describe('Basic Construction', () => {
    it('should create an entity builder', () => {
      const builder = createEntityBuilder(world);
      expect(builder).toBeInstanceOf(EntityBuilder);
    });

    it('should create a valid entity ID', () => {
      const builder = createEntityBuilder(world);
      const entity = builder.build();
      expect(typeof entity).toBe('number');
      expect(entity).toBeGreaterThan(0);
    });

    it('should create entity in the world', () => {
      const builder = createEntityBuilder(world);
      const entity = builder.build();

      // Entity should exist (adding component shouldn't throw)
      expect(() => {
        world.addComponent(entity, 'Test', {});
      }).not.toThrow();
    });
  });

  describe('Fluent API', () => {
    it('should chain with() calls', () => {
      const entity = createEntityBuilder(world)
        .with('Position', { x: 10, y: 10 })
        .with('PlayerControlled', {})
        .build();

      const pos = world.getComponent(entity, 'Position');
      const controlled = world.getComponent(entity, 'PlayerControlled');

      expect(pos).toEqual({ x: 10, y: 10 });
      expect(controlled).toEqual({});
    });

    it('should allow multiple components of different types', () => {
      const entity = createEntityBuilder(world)
        .with('Position', { x: 5, y: 7 })
        .with('Glyph', { char: '@', color: [255, 255, 255] })
        .with('BlocksMovement', {})
        .build();

      expect(world.getComponent(entity, 'Position')).toBeDefined();
      expect(world.getComponent(entity, 'Glyph')).toBeDefined();
      expect(world.getComponent(entity, 'BlocksMovement')).toBeDefined();
    });

    it('should preserve component data integrity', () => {
      const posData = { x: 42, y: 73 };
      const glyphData = { char: '#', color: [128, 128, 128] };

      const entity = createEntityBuilder(world)
        .with('Position', posData)
        .with('Glyph', glyphData)
        .build();

      expect(world.getComponent(entity, 'Position')).toEqual(posData);
      expect(world.getComponent(entity, 'Glyph')).toEqual(glyphData);
    });
  });

  describe('Empty Entities', () => {
    it('should allow building entity with no components', () => {
      const entity = createEntityBuilder(world).build();

      expect(typeof entity).toBe('number');
      // Entity exists but has no components
      world.registerComponent('TestComponent');
      const results = Array.from(world.query(['TestComponent']));
      expect(results).not.toContain(entity);
    });

    it('should allow adding components after building', () => {
      const builder = createEntityBuilder(world);
      const entity = builder.build();

      world.addComponent(entity, 'Position', { x: 1, y: 1 });
      expect(world.getComponent(entity, 'Position')).toEqual({ x: 1, y: 1 });
    });
  });

  describe('Integration with World', () => {
    it('should create entities queryable by world', () => {
      const entity1 = createEntityBuilder(world)
        .with('Position', { x: 1, y: 1 })
        .with('Enemy', {})
        .build();

      const entity2 = createEntityBuilder(world)
        .with('Position', { x: 2, y: 2 })
        .with('Enemy', {})
        .build();

      const enemies = Array.from(world.query(['Enemy']));
      expect(enemies).toContain(entity1);
      expect(enemies).toContain(entity2);
      expect(enemies.length).toBe(2);
    });

    it('should create entities with correct component signatures', () => {
      const player = createEntityBuilder(world)
        .with('Position', { x: 5, y: 5 })
        .with('PlayerControlled', {})
        .build();

      const enemy = createEntityBuilder(world)
        .with('Position', { x: 10, y: 10 })
        .with('Enemy', {})
        .build();

      // Player should only match PlayerControlled query
      const players = Array.from(world.query(['PlayerControlled']));
      expect(players).toContain(player);
      expect(players).not.toContain(enemy);

      // Enemy should only match Enemy query
      const enemies = Array.from(world.query(['Enemy']));
      expect(enemies).toContain(enemy);
      expect(enemies).not.toContain(player);
    });

    it('should work with multiple builders on same world', () => {
      const builder1 = createEntityBuilder(world);
      const builder2 = createEntityBuilder(world);

      const entity1 = builder1.with('Position', { x: 1, y: 1 }).build();
      const entity2 = builder2.with('Position', { x: 2, y: 2 }).build();

      expect(entity1).not.toBe(entity2);
      expect(world.getComponent(entity1, 'Position')).toEqual({ x: 1, y: 1 });
      expect(world.getComponent(entity2, 'Position')).toEqual({ x: 2, y: 2 });
    });
  });

  describe('Advanced Usage', () => {
    it('should expose world through getWorld()', () => {
      const builder = createEntityBuilder(world);
      expect(builder.getWorld()).toBe(world);
    });

    it('should expose entity ID through getEntity()', () => {
      const builder = createEntityBuilder(world);
      const entityFromGetter = builder.getEntity();
      const entityFromBuild = builder.build();

      expect(entityFromGetter).toBe(entityFromBuild);
    });

    it('should allow accessing entity before build()', () => {
      const builder = createEntityBuilder(world);
      builder.with('Position', { x: 5, y: 5 });

      const entity = builder.getEntity();
      const pos = world.getComponent(entity, 'Position');

      expect(pos).toEqual({ x: 5, y: 5 });
    });

    it('should support conditional component addition', () => {
      const hasShield = true;

      const builder = createEntityBuilder(world)
        .with('Position', { x: 0, y: 0 });

      if (hasShield) {
        builder.with('Shield', { strength: 100 });
      }

      const entity = builder.build();
      expect(world.getComponent(entity, 'Shield')).toEqual({ strength: 100 });
    });

    it('should support builder reuse pattern', () => {
      // Create a factory function using the builder
      const createEnemy = (x, y, health) => {
        return createEntityBuilder(world)
          .with('Position', { x, y })
          .with('Enemy', {})
          .with('Health', { current: health, max: health })
          .build();
      };

      const enemy1 = createEnemy(5, 5, 10);
      const enemy2 = createEnemy(10, 10, 20);

      expect(world.getComponent(enemy1, 'Health')).toEqual({ current: 10, max: 10 });
      expect(world.getComponent(enemy2, 'Health')).toEqual({ current: 20, max: 20 });
    });
  });

  describe('Complex Scenarios', () => {
    it('should build a fully-featured player entity', () => {
      const player = createEntityBuilder(world)
        .with('Position', { x: 10, y: 10 })
        .with('PlayerControlled', {})
        .with('Glyph', { char: '@', color: [255, 255, 255] })
        .with('Health', { current: 100, max: 100 })
        .with('Inventory', { items: [] })
        .with('BlocksMovement', {})
        .build();

      // Verify all components
      expect(world.getComponent(player, 'Position')).toBeDefined();
      expect(world.getComponent(player, 'PlayerControlled')).toBeDefined();
      expect(world.getComponent(player, 'Glyph')).toBeDefined();
      expect(world.getComponent(player, 'Health')).toBeDefined();
      expect(world.getComponent(player, 'Inventory')).toBeDefined();
      expect(world.getComponent(player, 'BlocksMovement')).toBeDefined();

      // Verify it matches complex queries
      const results = Array.from(world.query(['Position', 'PlayerControlled', 'Health']));
      expect(results).toContain(player);
    });

    it('should create multiple different entity types', () => {
      const player = createEntityBuilder(world)
        .with('Position', { x: 5, y: 5 })
        .with('PlayerControlled', {})
        .build();

      const wall = createEntityBuilder(world)
        .with('Position', { x: 6, y: 5 })
        .with('BlocksMovement', {})
        .build();

      const item = createEntityBuilder(world)
        .with('Position', { x: 7, y: 5 })
        .with('Collectible', {})
        .build();

      const allEntities = [player, wall, item];
      expect(new Set(allEntities).size).toBe(3); // All unique
    });
  });
});
