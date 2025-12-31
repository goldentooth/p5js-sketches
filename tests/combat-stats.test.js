import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, Components, createCombatStats } from '../src';

describe('CombatStats Component', () => {
  describe('createCombatStats helper', () => {
    it('should create stats with full hp', () => {
      const stats = createCombatStats(10);
      expect(stats.hp).toBe(10);
      expect(stats.maxHp).toBe(10);
    });

    it('should use default attack of 1', () => {
      const stats = createCombatStats(10);
      expect(stats.attack).toBe(1);
    });

    it('should use default defense of 0', () => {
      const stats = createCombatStats(10);
      expect(stats.defense).toBe(0);
    });

    it('should accept custom attack and defense', () => {
      const stats = createCombatStats(20, 5, 3);
      expect(stats.hp).toBe(20);
      expect(stats.maxHp).toBe(20);
      expect(stats.attack).toBe(5);
      expect(stats.defense).toBe(3);
    });
  });

  describe('Using with ECS World', () => {
    let world;

    beforeEach(() => {
      world = createWorld();
    });

    it('should add CombatStats component to entity', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.CombatStats, createCombatStats(10, 3, 1));

      const stats = world.getComponent(entity, Components.CombatStats);
      expect(stats).toBeDefined();
      expect(stats.hp).toBe(10);
      expect(stats.attack).toBe(3);
      expect(stats.defense).toBe(1);
    });

    it('should allow modifying hp', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.CombatStats, createCombatStats(10, 3, 1));

      const stats = world.getComponent(entity, Components.CombatStats);
      stats.hp -= 5;

      expect(stats.hp).toBe(5);
      expect(stats.maxHp).toBe(10);
    });

    it('should query entities with CombatStats', () => {
      const fighter = world.createEntity();
      world.addComponent(fighter, Components.CombatStats, createCombatStats(10));
      world.addComponent(fighter, Components.Position, { x: 0, y: 0 });

      const npc = world.createEntity();
      world.addComponent(npc, Components.Position, { x: 1, y: 1 });

      const combatants = Array.from(world.query([Components.CombatStats]));
      expect(combatants).toHaveLength(1);
      expect(combatants[0]).toBe(fighter);
    });
  });

  describe('Damage calculation pattern', () => {
    it('should calculate damage as attack minus defense (min 0)', () => {
      const attacker = createCombatStats(10, 5, 0);
      const defender = createCombatStats(10, 1, 2);

      const damage = Math.max(0, attacker.attack - defender.defense);
      expect(damage).toBe(3);
    });

    it('should not deal negative damage', () => {
      const attacker = createCombatStats(10, 1, 0);
      const defender = createCombatStats(10, 1, 5);

      const damage = Math.max(0, attacker.attack - defender.defense);
      expect(damage).toBe(0);
    });
  });
});
