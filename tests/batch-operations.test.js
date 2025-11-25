import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorld,
  batchUpdate,
  destroyWhere,
  countWhere,
  collectWhere,
  findWhere,
  someWhere,
  everyWhere
} from '../src';

describe('Batch Operations', () => {
  let world;

  beforeEach(() => {
    world = createWorld();
  });

  describe('batchUpdate', () => {
    it('should update multiple entities', () => {
      // Create three entities with positions
      const e1 = world.createEntity();
      world.addComponent(e1, 'Position', { x: 0, y: 0 });

      const e2 = world.createEntity();
      world.addComponent(e2, 'Position', { x: 1, y: 1 });

      const e3 = world.createEntity();
      world.addComponent(e3, 'Position', { x: 2, y: 2 });

      // Move all positions north (y - 1)
      const entities = world.query(['Position']);
      batchUpdate(world, entities, (entity, world) => {
        const pos = world.getComponent(entity, 'Position');
        if (pos) pos.y -= 1;
      });

      expect(world.getComponent(e1, 'Position').y).toBe(-1);
      expect(world.getComponent(e2, 'Position').y).toBe(0);
      expect(world.getComponent(e3, 'Position').y).toBe(1);
    });

    it('should handle empty entity list', () => {
      // Create a registered component that no entities have
      world.registerComponent('Rare');
      const entities = world.query(['Rare']);

      let callCount = 0;
      batchUpdate(world, entities, () => {
        callCount++;
      });

      expect(callCount).toBe(0);
    });

    it('should provide world context to updater', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, 'Position', { x: 5, y: 5 });

      batchUpdate(world, [e1], (entity, worldContext) => {
        expect(worldContext).toBe(world);
        const pos = worldContext.getComponent(entity, 'Position');
        expect(pos).toEqual({ x: 5, y: 5 });
      });
    });

    it('should allow adding components during update', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, 'Position', { x: 0, y: 0 });

      batchUpdate(world, [e1], (entity, world) => {
        world.addComponent(entity, 'Marked', {});
      });

      expect(world.getComponent(e1, 'Marked')).toBeDefined();
    });

    it('should handle complex updates', () => {
      // Create entities with health
      const entities = [];
      for (let i = 0; i < 5; i++) {
        const e = world.createEntity();
        world.addComponent(e, 'Health', { current: 100, max: 100 });
        world.addComponent(e, 'Enemy', {});
        entities.push(e);
      }

      // Apply damage to all enemies
      batchUpdate(world, world.query(['Enemy', 'Health']), (entity, world) => {
        const health = world.getComponent(entity, 'Health');
        if (health) {
          health.current -= 25;
          if (health.current <= 0) {
            world.addComponent(entity, 'Dead', {});
          }
        }
      });

      // All should have 75 health
      entities.forEach(e => {
        expect(world.getComponent(e, 'Health').current).toBe(75);
      });
    });
  });

  describe('destroyWhere', () => {
    it('should destroy all matching entities', () => {
      // Create temporary entities
      const temp1 = world.createEntity();
      world.addComponent(temp1, 'Temporary', {});

      const temp2 = world.createEntity();
      world.addComponent(temp2, 'Temporary', {});

      // Create permanent entity
      const perm = world.createEntity();
      world.addComponent(perm, 'Position', { x: 0, y: 0 });

      const destroyed = destroyWhere(world, ['Temporary']);

      expect(destroyed).toBe(2);
      expect(Array.from(world.query(['Temporary'])).length).toBe(0);
      // Permanent entity should still exist
      expect(world.getComponent(perm, 'Position')).toBeDefined();
    });

    it('should return zero when no matches', () => {
      world.registerComponent('Rare');
      const count = destroyWhere(world, ['Rare']);
      expect(count).toBe(0);
    });

    it('should match ALL specified components', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, 'Temporary', {});

      const e2 = world.createEntity();
      world.addComponent(e2, 'Temporary', {});
      world.addComponent(e2, 'Expired', {});

      // Should only destroy e2 (has both)
      const destroyed = destroyWhere(world, ['Temporary', 'Expired']);

      expect(destroyed).toBe(1);
      expect(world.getComponent(e1, 'Temporary')).toBeDefined(); // Still exists
      expect(world.getComponent(e2, 'Temporary')).toBeUndefined(); // Destroyed
    });

    it('should clean up all components from destroyed entities', () => {
      const e = world.createEntity();
      world.addComponent(e, 'Position', { x: 5, y: 5 });
      world.addComponent(e, 'Enemy', {});
      world.addComponent(e, 'Dead', {});

      destroyWhere(world, ['Dead']);

      expect(world.getComponent(e, 'Position')).toBeUndefined();
      expect(world.getComponent(e, 'Enemy')).toBeUndefined();
      expect(world.getComponent(e, 'Dead')).toBeUndefined();
    });
  });

  describe('countWhere', () => {
    it('should count matching entities', () => {
      for (let i = 0; i < 5; i++) {
        const e = world.createEntity();
        world.addComponent(e, 'Enemy', {});
      }

      expect(countWhere(world, ['Enemy'])).toBe(5);
    });

    it('should return zero when no matches', () => {
      world.registerComponent('Rare');
      expect(countWhere(world, ['Rare'])).toBe(0);
    });

    it('should count entities with all specified components', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, 'Position', { x: 0, y: 0 });
      world.addComponent(e1, 'Enemy', {});

      const e2 = world.createEntity();
      world.addComponent(e2, 'Position', { x: 1, y: 1 });

      expect(countWhere(world, ['Position'])).toBe(2);
      expect(countWhere(world, ['Position', 'Enemy'])).toBe(1);
      expect(countWhere(world, ['Enemy'])).toBe(1);
    });
  });

  describe('collectWhere', () => {
    it('should collect all matching entities into array', () => {
      const created = [];
      for (let i = 0; i < 3; i++) {
        const e = world.createEntity();
        world.addComponent(e, 'Collectible', {});
        created.push(e);
      }

      const collected = collectWhere(world, ['Collectible']);

      expect(collected).toHaveLength(3);
      created.forEach(e => {
        expect(collected).toContain(e);
      });
    });

    it('should return empty array when no matches', () => {
      world.registerComponent('Rare');
      const result = collectWhere(world, ['Rare']);
      expect(result).toEqual([]);
    });

    it('should allow filtering collected results', () => {
      for (let i = 0; i < 5; i++) {
        const e = world.createEntity();
        world.addComponent(e, 'Position', { x: i, y: 0 });
      }

      const allPositions = collectWhere(world, ['Position']);
      const filtered = allPositions.filter(e => {
        const pos = world.getComponent(e, 'Position');
        return pos && pos.x > 2;
      });

      expect(filtered).toHaveLength(2); // x = 3, 4
    });
  });

  describe('findWhere', () => {
    it('should find first matching entity', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, 'Position', { x: 5, y: 5 });

      const e2 = world.createEntity();
      world.addComponent(e2, 'Position', { x: 10, y: 10 });

      const found = findWhere(world, ['Position'], (entity, world) => {
        const pos = world.getComponent(entity, 'Position');
        return pos && pos.x === 10;
      });

      expect(found).toBe(e2);
    });

    it('should return undefined when no match', () => {
      const e = world.createEntity();
      world.addComponent(e, 'Position', { x: 5, y: 5 });

      const found = findWhere(world, ['Position'], (entity, world) => {
        const pos = world.getComponent(entity, 'Position');
        return pos && pos.x === 100;
      });

      expect(found).toBeUndefined();
    });

    it('should return first match when multiple exist', () => {
      const entities = [];
      for (let i = 0; i < 5; i++) {
        const e = world.createEntity();
        world.addComponent(e, 'Health', { current: 50, max: 100 });
        entities.push(e);
      }

      const found = findWhere(world, ['Health'], (entity, world) => {
        const health = world.getComponent(entity, 'Health');
        return health && health.current < 100;
      });

      expect(entities).toContain(found);
    });

    it('should work with complex predicates', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, 'Position', { x: 5, y: 5 });
      world.addComponent(e1, 'Enemy', {});

      const e2 = world.createEntity();
      world.addComponent(e2, 'Position', { x: 6, y: 6 });
      world.addComponent(e2, 'PlayerControlled', {});

      const playerNear = findWhere(world, ['Position'], (entity, world) => {
        const pos = world.getComponent(entity, 'Position');
        const isPlayer = world.getComponent(entity, 'PlayerControlled');
        return isPlayer && pos && pos.x > 5;
      });

      expect(playerNear).toBe(e2);
    });
  });

  describe('someWhere', () => {
    it('should return true when at least one matches', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, 'Health', { current: 10, max: 100 });

      const e2 = world.createEntity();
      world.addComponent(e2, 'Health', { current: 90, max: 100 });

      const hasLowHealth = someWhere(world, ['Health'], (entity, world) => {
        const health = world.getComponent(entity, 'Health');
        return health && health.current < 50;
      });

      expect(hasLowHealth).toBe(true);
    });

    it('should return false when none match', () => {
      const e = world.createEntity();
      world.addComponent(e, 'Health', { current: 100, max: 100 });

      const hasLowHealth = someWhere(world, ['Health'], (entity, world) => {
        const health = world.getComponent(entity, 'Health');
        return health && health.current < 50;
      });

      expect(hasLowHealth).toBe(false);
    });

    it('should return false for empty query', () => {
      world.registerComponent('Rare');
      const result = someWhere(world, ['Rare'], () => true);
      expect(result).toBe(false);
    });

    it('should short-circuit on first match', () => {
      let callCount = 0;

      for (let i = 0; i < 10; i++) {
        const e = world.createEntity();
        world.addComponent(e, 'Item', { id: i });
      }

      someWhere(world, ['Item'], (entity, world) => {
        callCount++;
        const item = world.getComponent(entity, 'Item');
        return item && item.id === 3;
      });

      // Should stop after finding match, not check all 10
      expect(callCount).toBeLessThanOrEqual(4);
    });
  });

  describe('everyWhere', () => {
    it('should return true when all match', () => {
      for (let i = 0; i < 5; i++) {
        const e = world.createEntity();
        world.addComponent(e, 'Enemy', {});
        world.addComponent(e, 'Health', { current: 0, max: 100 });
      }

      const allDead = everyWhere(world, ['Enemy', 'Health'], (entity, world) => {
        const health = world.getComponent(entity, 'Health');
        return health && health.current === 0;
      });

      expect(allDead).toBe(true);
    });

    it('should return false when at least one does not match', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, 'Enemy', {});
      world.addComponent(e1, 'Health', { current: 0, max: 100 });

      const e2 = world.createEntity();
      world.addComponent(e2, 'Enemy', {});
      world.addComponent(e2, 'Health', { current: 50, max: 100 });

      const allDead = everyWhere(world, ['Enemy', 'Health'], (entity, world) => {
        const health = world.getComponent(entity, 'Health');
        return health && health.current === 0;
      });

      expect(allDead).toBe(false);
    });

    it('should return true for empty query', () => {
      world.registerComponent('Rare');
      const result = everyWhere(world, ['Rare'], () => false);
      expect(result).toBe(true); // Vacuous truth
    });

    it('should short-circuit on first non-match', () => {
      let callCount = 0;

      for (let i = 0; i < 10; i++) {
        const e = world.createEntity();
        world.addComponent(e, 'Item', { id: i });
      }

      everyWhere(world, ['Item'], (entity, world) => {
        callCount++;
        const item = world.getComponent(entity, 'Item');
        return item && item.id < 3;
      });

      // Should stop after finding non-match
      expect(callCount).toBeLessThanOrEqual(4);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work together to implement game logic', () => {
      // Create player
      const player = world.createEntity();
      world.addComponent(player, 'Position', { x: 10, y: 10 });
      world.addComponent(player, 'PlayerControlled', {});

      // Create enemies around player
      for (let i = 0; i < 5; i++) {
        const enemy = world.createEntity();
        world.addComponent(enemy, 'Position', { x: 10 + i, y: 10 });
        world.addComponent(enemy, 'Enemy', {});
        world.addComponent(enemy, 'Health', { current: 10, max: 10 });
      }

      // Check if any enemies nearby
      const hasNearbyEnemy = someWhere(world, ['Position', 'Enemy'], (entity, world) => {
        const pos = world.getComponent(entity, 'Position');
        const playerPos = world.getComponent(player, 'Position');
        return pos && Math.abs(pos.x - playerPos.x) <= 2;
      });
      expect(hasNearbyEnemy).toBe(true);

      // Damage all enemies
      batchUpdate(world, world.query(['Enemy', 'Health']), (entity, world) => {
        const health = world.getComponent(entity, 'Health');
        if (health) {
          health.current -= 10;
          if (health.current <= 0) {
            world.addComponent(entity, 'Dead', {});
          }
        }
      });

      // Check all enemies are dead
      const allEnemiesDead = everyWhere(world, ['Enemy'], (entity, world) => {
        return world.getComponent(entity, 'Dead') !== undefined;
      });
      expect(allEnemiesDead).toBe(true);

      // Clean up dead enemies
      const removed = destroyWhere(world, ['Dead']);
      expect(removed).toBe(5);

      // Verify no enemies remain
      expect(countWhere(world, ['Enemy'])).toBe(0);
    });
  });
});
