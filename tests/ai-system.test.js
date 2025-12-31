import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorld,
  createMap,
  Components,
  AISystem,
  ViewshedSystem,
  Tiles,
  xoroshiro128plus,
} from '../src';

describe('AISystem', () => {
  let world;
  let map;
  let aiSystem;
  let viewshedSystem;

  beforeEach(() => {
    // Create a 20x20 map with floor tiles
    map = createMap(20, 20, { edgeBehavior: 'block' });
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        map.setTile(x, y, Tiles.Floor);
      }
    }

    world = createWorld();

    // Add GameClock resource
    world.addResource('GameClock', { paused: false, tick: 0 });

    // Create systems
    const rng = xoroshiro128plus(BigInt(12345));
    aiSystem = new AISystem(map, { rng });
    viewshedSystem = new ViewshedSystem(map);

    world.addSystem(viewshedSystem);
    world.addSystem(aiSystem);
  });

  function createPlayer(x, y) {
    const entity = world.createEntity();
    world.addComponent(entity, Components.PlayerControlled, {});
    world.addComponent(entity, Components.Position, { x, y });
    world.addComponent(entity, Components.BlocksMovement, {});
    world.addComponent(entity, Components.Energy, { current: 100, max: 100, regenRate: 10 });
    world.addComponent(entity, Components.Viewshed, {
      range: 10,
      algorithm: 'shadowcasting',
      visibleCells: new Set(),
      dirty: true,
    });
    return entity;
  }

  function createMonster(x, y, fovRange = 10) {
    const entity = world.createEntity();
    world.addComponent(entity, Components.AIControlled, {});
    world.addComponent(entity, Components.Position, { x, y });
    world.addComponent(entity, Components.BlocksMovement, {});
    world.addComponent(entity, Components.Energy, { current: 100, max: 100, regenRate: 10 });
    world.addComponent(entity, Components.CombatStats, { hp: 5, maxHp: 5, attack: 2, defense: 0 });
    world.addComponent(entity, Components.Viewshed, {
      range: fovRange,
      algorithm: 'shadowcasting',
      visibleCells: new Set(),
      dirty: true,
    });
    return entity;
  }

  describe('when clock is paused', () => {
    it('should not process AI', () => {
      world.addResource('GameClock', { paused: true, tick: 0 });

      const player = createPlayer(10, 10);
      const monster = createMonster(12, 10);

      // Update viewshed first
      viewshedSystem.run(world);

      // Run AI
      aiSystem.run(world);

      // Monster should not have an action
      const action = world.getComponent(monster, Components.Action);
      expect(action).toBeUndefined();
    });
  });

  describe('when player is visible', () => {
    it('should queue chase action when not adjacent', () => {
      const player = createPlayer(10, 10);
      const monster = createMonster(15, 10); // 5 tiles away

      // Update viewshed first (makes player FOV include monster)
      viewshedSystem.run(world);

      // Run AI
      aiSystem.run(world);

      // Monster should have a move action toward player
      const action = world.getComponent(monster, Components.Action);
      expect(action).toBeDefined();
      expect(action.type).toBe('move');
      expect(action.direction.dx).toBe(-1); // Moving west toward player
    });

    it('should queue attack action when adjacent', () => {
      const player = createPlayer(10, 10);
      const monster = createMonster(11, 10); // Adjacent

      // Update viewshed
      viewshedSystem.run(world);

      // Run AI
      aiSystem.run(world);

      // Monster should attack
      const action = world.getComponent(monster, Components.Action);
      expect(action).toBeDefined();
      expect(action.type).toBe('melee_attack');
      expect(action.target).toBe(player);
    });

    it('should attack diagonally adjacent targets', () => {
      const player = createPlayer(10, 10);
      const monster = createMonster(11, 11); // Diagonal adjacent

      viewshedSystem.run(world);
      aiSystem.run(world);

      const action = world.getComponent(monster, Components.Action);
      expect(action).toBeDefined();
      expect(action.type).toBe('melee_attack');
    });
  });

  describe('when player is not visible', () => {
    it('should queue wander action', () => {
      // Player has viewshed range 10, place monster behind a wall
      const player = createPlayer(5, 10);

      // Create a wall to block vision
      map.setTile(8, 9, Tiles.Wall);
      map.setTile(8, 10, Tiles.Wall);
      map.setTile(8, 11, Tiles.Wall);

      const monster = createMonster(12, 10); // Behind the wall

      // Update viewshed - monster blocked by wall
      viewshedSystem.run(world);

      // Verify monster is not visible to player (wall blocks)
      const playerViewshed = world.getComponent(player, Components.Viewshed);
      expect(playerViewshed.visibleCells.has('12,10')).toBe(false);

      // Run AI
      aiSystem.run(world);

      // Monster should have a move action (wander)
      const action = world.getComponent(monster, Components.Action);
      expect(action).toBeDefined();
      expect(action.type).toBe('move');
      // Direction should be one of the cardinal directions
      expect(Math.abs(action.direction.dx) + Math.abs(action.direction.dy)).toBe(1);
    });
  });

  describe('when monster already has action', () => {
    it('should not queue another action', () => {
      const player = createPlayer(10, 10);
      const monster = createMonster(12, 10);

      // Pre-queue an action
      world.addComponent(monster, Components.Action, {
        type: 'wait',
        energyCost: 50,
      });

      viewshedSystem.run(world);
      aiSystem.run(world);

      // Action should still be 'wait', not replaced
      const action = world.getComponent(monster, Components.Action);
      expect(action.type).toBe('wait');
      expect(action.energyCost).toBe(50);
    });
  });

  describe('pathfinding around obstacles', () => {
    it('should path around walls', () => {
      // Create wall between player and monster
      map.setTile(12, 9, Tiles.Wall);
      map.setTile(12, 10, Tiles.Wall);
      map.setTile(12, 11, Tiles.Wall);

      const player = createPlayer(10, 10);
      const monster = createMonster(14, 10);

      viewshedSystem.run(world);
      aiSystem.run(world);

      // Monster should move (path around wall)
      const action = world.getComponent(monster, Components.Action);
      expect(action).toBeDefined();
      expect(action.type).toBe('move');
      // Should go up or down to path around
      expect(action.direction.dy).not.toBe(0);
    });

    it('should avoid other blocking entities', () => {
      const player = createPlayer(10, 10);
      const monster1 = createMonster(12, 10);
      const monster2 = createMonster(11, 10); // Blocking direct path

      viewshedSystem.run(world);
      aiSystem.run(world);

      // Monster1 should find alternate path
      const action = world.getComponent(monster1, Components.Action);
      expect(action).toBeDefined();
      expect(action.type).toBe('move');
    });
  });

  describe('no player in world', () => {
    it('should not crash', () => {
      const monster = createMonster(10, 10);

      // No player created
      aiSystem.run(world);

      // Should not have queued anything (no target)
      const action = world.getComponent(monster, Components.Action);
      expect(action).toBeUndefined();
    });
  });
});
