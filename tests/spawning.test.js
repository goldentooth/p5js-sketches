import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorld,
  createMap,
  Components,
  MonsterTemplates,
  spawnMonster,
  spawnMonstersInRooms,
  createPlayer,
  xoroshiro128plus,
  Tiles,
  createRoom,
} from '../src';

describe('Spawning Utilities', () => {
  let world;
  let rng;

  beforeEach(() => {
    world = createWorld();
    rng = xoroshiro128plus(BigInt(12345));
  });

  describe('MonsterTemplates', () => {
    it('should have preset templates', () => {
      expect(MonsterTemplates.goblin).toBeDefined();
      expect(MonsterTemplates.orc).toBeDefined();
      expect(MonsterTemplates.troll).toBeDefined();
      expect(MonsterTemplates.rat).toBeDefined();
      expect(MonsterTemplates.skeleton).toBeDefined();
    });

    it('should have valid template structure', () => {
      const template = MonsterTemplates.goblin;
      expect(template.name).toBe('Goblin');
      expect(template.glyph).toBe('g');
      expect(template.fg).toEqual([0, 255, 0]);
      expect(template.maxHp).toBeGreaterThan(0);
      expect(template.attack).toBeGreaterThan(0);
      expect(typeof template.defense).toBe('number');
    });
  });

  describe('spawnMonster', () => {
    let room;

    beforeEach(() => {
      room = createRoom(5, 5, 10, 10);
    });

    it('should create monster with all required components', () => {
      const entity = spawnMonster(world, {
        room,
        template: MonsterTemplates.goblin,
        rng,
      });

      expect(entity).not.toBeNull();

      // Check all components exist
      expect(world.getComponent(entity, Components.Position)).toBeDefined();
      expect(world.getComponent(entity, Components.Glyph)).toBeDefined();
      expect(world.getComponent(entity, Components.AIControlled)).toBeDefined();
      expect(world.getComponent(entity, Components.BlocksMovement)).toBeDefined();
      expect(world.getComponent(entity, Components.CombatStats)).toBeDefined();
      expect(world.getComponent(entity, Components.Energy)).toBeDefined();
      expect(world.getComponent(entity, Components.Name)).toBeDefined();
    });

    it('should spawn within room bounds', () => {
      const entity = spawnMonster(world, {
        room,
        template: MonsterTemplates.goblin,
        rng,
      });

      const pos = world.getComponent(entity, Components.Position);
      expect(pos.x).toBeGreaterThan(room.x1());
      expect(pos.x).toBeLessThan(room.x2());
      expect(pos.y).toBeGreaterThan(room.y1());
      expect(pos.y).toBeLessThan(room.y2());
    });

    it('should avoid specified positions', () => {
      const avoidPositions = new Set();
      // Block most of the room
      for (let x = 6; x <= 13; x++) {
        for (let y = 6; y <= 13; y++) {
          avoidPositions.add(`${x},${y}`);
        }
      }

      const entity = spawnMonster(world, {
        room,
        template: MonsterTemplates.goblin,
        rng,
        avoidPositions,
      });

      if (entity) {
        const pos = world.getComponent(entity, Components.Position);
        expect(avoidPositions.has(`${pos.x},${pos.y}`)).toBe(false);
      }
    });

    it('should apply template stats correctly', () => {
      const entity = spawnMonster(world, {
        room,
        template: MonsterTemplates.orc,
        rng,
      });

      const stats = world.getComponent(entity, Components.CombatStats);
      expect(stats.hp).toBe(MonsterTemplates.orc.maxHp);
      expect(stats.maxHp).toBe(MonsterTemplates.orc.maxHp);
      expect(stats.attack).toBe(MonsterTemplates.orc.attack);
      expect(stats.defense).toBe(MonsterTemplates.orc.defense);

      const glyph = world.getComponent(entity, Components.Glyph);
      expect(glyph.glyph).toBe(MonsterTemplates.orc.glyph);

      const name = world.getComponent(entity, Components.Name);
      expect(name.name).toBe(MonsterTemplates.orc.name);
    });

    it('should add Speed component for non-1.0 speed', () => {
      const entity = spawnMonster(world, {
        room,
        template: MonsterTemplates.troll, // Has speed 0.5
        rng,
      });

      const speed = world.getComponent(entity, Components.Speed);
      expect(speed).toBeDefined();
      expect(speed.multiplier).toBe(0.5);
    });
  });

  describe('spawnMonstersInRooms', () => {
    let rooms;

    beforeEach(() => {
      rooms = [
        createRoom(0, 0, 10, 10),
        createRoom(15, 0, 10, 10),
        createRoom(0, 15, 10, 10),
        createRoom(15, 15, 10, 10),
      ];
    });

    it('should spawn monsters in multiple rooms', () => {
      const monsters = spawnMonstersInRooms(world, {
        rooms,
        templates: [MonsterTemplates.goblin],
        rng,
        monstersPerRoom: 1,
      });

      expect(monsters.length).toBe(4);
    });

    it('should exclude specified room', () => {
      const monsters = spawnMonstersInRooms(world, {
        rooms,
        excludeRoomIndex: 0, // Exclude first room
        templates: [MonsterTemplates.goblin],
        rng,
        monstersPerRoom: 1,
      });

      expect(monsters.length).toBe(3);

      // Check no monster in first room
      for (const entity of monsters) {
        const pos = world.getComponent(entity, Components.Position);
        const room0 = rooms[0];
        const inRoom0 =
          pos.x > room0.x1() &&
          pos.x < room0.x2() &&
          pos.y > room0.y1() &&
          pos.y < room0.y2();
        expect(inRoom0).toBe(false);
      }
    });

    it('should spawn multiple monsters per room', () => {
      const monsters = spawnMonstersInRooms(world, {
        rooms,
        templates: [MonsterTemplates.goblin],
        rng,
        monstersPerRoom: 2,
      });

      expect(monsters.length).toBe(8); // 4 rooms * 2 monsters
    });

    it('should not spawn monsters on same position', () => {
      const monsters = spawnMonstersInRooms(world, {
        rooms,
        templates: [MonsterTemplates.goblin],
        rng,
        monstersPerRoom: 3,
      });

      const positions = new Set();
      for (const entity of monsters) {
        const pos = world.getComponent(entity, Components.Position);
        const key = `${pos.x},${pos.y}`;
        expect(positions.has(key)).toBe(false);
        positions.add(key);
      }
    });
  });

  describe('createPlayer', () => {
    it('should create player with all required components', () => {
      const entity = createPlayer(world, 10, 10);

      expect(world.getComponent(entity, Components.Position)).toBeDefined();
      expect(world.getComponent(entity, Components.Glyph)).toBeDefined();
      expect(world.getComponent(entity, Components.PlayerControlled)).toBeDefined();
      expect(world.getComponent(entity, Components.BlocksMovement)).toBeDefined();
      expect(world.getComponent(entity, Components.CombatStats)).toBeDefined();
      expect(world.getComponent(entity, Components.Energy)).toBeDefined();
      expect(world.getComponent(entity, Components.Viewshed)).toBeDefined();
      expect(world.getComponent(entity, Components.Memory)).toBeDefined();
    });

    it('should use default values', () => {
      const entity = createPlayer(world, 5, 7);

      const pos = world.getComponent(entity, Components.Position);
      expect(pos.x).toBe(5);
      expect(pos.y).toBe(7);

      const glyph = world.getComponent(entity, Components.Glyph);
      expect(glyph.glyph).toBe('@');

      const stats = world.getComponent(entity, Components.CombatStats);
      expect(stats.maxHp).toBe(10);
    });

    it('should accept custom options', () => {
      const entity = createPlayer(world, 10, 10, {
        glyph: 'P',
        maxHp: 50,
        attack: 10,
        defense: 5,
        fovRange: 15,
      });

      const glyph = world.getComponent(entity, Components.Glyph);
      expect(glyph.glyph).toBe('P');

      const stats = world.getComponent(entity, Components.CombatStats);
      expect(stats.maxHp).toBe(50);
      expect(stats.attack).toBe(10);
      expect(stats.defense).toBe(5);

      const viewshed = world.getComponent(entity, Components.Viewshed);
      expect(viewshed.range).toBe(15);
    });
  });
});
