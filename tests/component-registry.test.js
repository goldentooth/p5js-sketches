import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, Components } from '../src';

describe('Component Registry', () => {
  describe('Components constant', () => {
    it('should export all component keys', () => {
      expect(Components.Position).toBe('Position');
      expect(Components.PlayerControlled).toBe('PlayerControlled');
      expect(Components.BlocksMovement).toBe('BlocksMovement');
      expect(Components.Glyph).toBe('Glyph');
    });

    it('should provide all expected component keys', () => {
      const keys = Object.keys(Components);
      expect(keys).toContain('Position');
      expect(keys).toContain('PlayerControlled');
      expect(keys).toContain('BlocksMovement');
      expect(keys).toContain('Glyph');
      expect(keys.length).toBe(4);
    });
  });

  describe('Using Components with World', () => {
    let world;

    beforeEach(() => {
      world = createWorld();
    });

    it('should work with addComponent', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 5, y: 10 });

      const pos = world.getComponent(entity, Components.Position);
      expect(pos).toBeDefined();
      expect(pos.x).toBe(5);
      expect(pos.y).toBe(10);
    });

    it('should work with getComponent', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.PlayerControlled, {});

      const component = world.getComponent(entity, Components.PlayerControlled);
      expect(component).toBeDefined();
    });

    it('should work with query', () => {
      const entity1 = world.createEntity();
      world.addComponent(entity1, Components.Position, { x: 1, y: 1 });
      world.addComponent(entity1, Components.PlayerControlled, {});

      const entity2 = world.createEntity();
      world.addComponent(entity2, Components.Position, { x: 2, y: 2 });

      const results = Array.from(world.query([Components.Position, Components.PlayerControlled]));
      expect(results).toHaveLength(1);
      expect(results[0]).toBe(entity1);
    });

    it('should work with removeComponent', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 5, y: 5 });

      let pos = world.getComponent(entity, Components.Position);
      expect(pos).toBeDefined();

      world.removeComponent(entity, Components.Position);

      pos = world.getComponent(entity, Components.Position);
      expect(pos).toBeUndefined();
    });

    it('should work with registerComponent', () => {
      const idx = world.registerComponent(Components.BlocksMovement);
      expect(typeof idx).toBe('number');
      expect(idx).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Consistency with string literals', () => {
    let world;

    beforeEach(() => {
      world = createWorld();
    });

    it('should be equivalent to using string literals', () => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      // Add component using string literal
      world.addComponent(entity1, 'Position', { x: 1, y: 1 });

      // Add component using Components constant (same value)
      world.addComponent(entity2, Components.Position, { x: 2, y: 2 });

      // Query with Components constant should find both
      const results = Array.from(world.query([Components.Position]));
      expect(results).toHaveLength(2);
      expect(results).toContain(entity1);
      expect(results).toContain(entity2);

      // Should be able to retrieve with Components constant
      const pos1 = world.getComponent(entity1, Components.Position);
      const pos2 = world.getComponent(entity2, Components.Position);

      expect(pos1).toBeDefined();
      expect(pos1.x).toBe(1);
      expect(pos2).toBeDefined();
      expect(pos2.x).toBe(2);
    });
  });
});
