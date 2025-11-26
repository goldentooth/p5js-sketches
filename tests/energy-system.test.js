/**
 * Energy System Tests
 *
 * Tests for the energy-based time system including:
 * - Energy regeneration
 * - Speed multipliers
 * - Action execution and energy costs
 * - Turn-based input blocking via GameClock
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from '../src/ecs/world';
import { createMap, Tiles } from '../src/map';
import { Components } from '../src/ecs/components';
import { createGameClock } from '../src/ecs/resources/GameClock';
import { EnergyRegenerationSystem } from '../src/ecs/systems/EnergyRegenerationSystem';
import { ActionExecutionSystem } from '../src/ecs/systems/ActionExecutionSystem';
import { AwaitingInputSystem } from '../src/ecs/systems/AwaitingInputSystem';
import { MovementSystem } from '../src/ecs/systems/MovementSystem';
import { Cardinal } from '../src/movement/directions';

describe('Energy System', () => {
  let world;
  let map;
  let energyRegenSystem;
  let actionExecutionSystem;
  let awaitingInputSystem;
  let movementSystem;

  beforeEach(() => {
    // Create test map
    map = createMap(20, 20, { defaultTile: Tiles.Floor, edgeBehavior: 'block' });

    // Create ECS world
    world = createWorld();

    // Create systems
    movementSystem = new MovementSystem(map);
    energyRegenSystem = new EnergyRegenerationSystem();
    actionExecutionSystem = new ActionExecutionSystem(movementSystem);
    awaitingInputSystem = new AwaitingInputSystem();

    // Add systems in correct order
    world.addSystem(awaitingInputSystem); // early phase - checks for player input
    world.addSystem(energyRegenSystem); // early phase - regenerates energy
    world.addSystem(actionExecutionSystem); // update phase - executes actions
    world.addSystem(movementSystem); // update phase - provides movement logic

    // Add GameClock resource
    world.addResource('GameClock', createGameClock());
  });

  describe('EnergyRegenerationSystem', () => {
    it('should regenerate energy each tick', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Energy, {
        current: 50,
        max: 100,
        regenRate: 10,
      });

      world.tick(0);

      const energy = world.getComponent(entity, Components.Energy);
      expect(energy.current).toBe(60);
    });

    it('should apply speed multiplier to energy regeneration', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Energy, {
        current: 50,
        max: 100,
        regenRate: 10,
      });
      world.addComponent(entity, Components.Speed, {
        multiplier: 2.0, // Double speed
      });

      world.tick(0);

      const energy = world.getComponent(entity, Components.Energy);
      expect(energy.current).toBe(70); // 50 + (10 * 2.0)
    });

    it('should cap energy at max', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Energy, {
        current: 95,
        max: 100,
        regenRate: 10,
      });

      world.tick(0);

      const energy = world.getComponent(entity, Components.Energy);
      expect(energy.current).toBe(100); // Capped at max, not 105
    });

    it('should increment game clock', () => {
      const clock = world.getResource('GameClock');
      expect(clock.tick).toBe(0);

      world.tick(0);

      expect(clock.tick).toBe(1);
    });

    it('should not increment clock when paused', () => {
      // Create a player entity to prevent AwaitingInputSystem from unpausing
      const player = world.createEntity();
      world.addComponent(player, Components.PlayerControlled, {});
      // No action, so clock will be paused

      const clock = world.getResource('GameClock');

      // First tick: AwaitingInputSystem will pause the clock
      world.tick(0);
      expect(clock.paused).toBe(true);
      expect(clock.tick).toBe(0); // Should not increment when paused
    });

    it('should not regenerate energy when clock is paused', () => {
      // Create a player entity with no action to pause the clock
      const player = world.createEntity();
      world.addComponent(player, Components.PlayerControlled, {});
      // No action, so AwaitingInputSystem will pause the clock

      const entity = world.createEntity();
      world.addComponent(entity, Components.Energy, {
        current: 50,
        max: 100,
        regenRate: 10,
      });

      world.tick(0);

      const clock = world.getResource('GameClock');
      expect(clock.paused).toBe(true);

      const energy = world.getComponent(entity, Components.Energy);
      expect(energy.current).toBe(50); // No regeneration when paused
    });
  });

  describe('ActionExecutionSystem', () => {
    it('should execute action when entity has enough energy', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Energy, {
        current: 100,
        max: 100,
        regenRate: 10,
      });
      world.addComponent(entity, Components.Action, {
        type: 'wait',
        energyCost: 50,
      });

      world.tick(0);

      const energy = world.getComponent(entity, Components.Energy);
      expect(energy.current).toBe(50); // 100 - 50

      // Action should be removed after execution
      const action = world.getComponent(entity, Components.Action);
      expect(action).toBeUndefined();
    });

    it('should not execute action when entity lacks sufficient energy', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Energy, {
        current: 30,
        max: 100,
        regenRate: 10,
      });
      world.addComponent(entity, Components.Action, {
        type: 'wait',
        energyCost: 50,
      });

      // Set regen rate to 0 to prevent energy from accumulating
      const energy = world.getComponent(entity, Components.Energy);
      energy.regenRate = 0;

      world.tick(0);

      expect(energy.current).toBe(30); // No energy deducted

      // Action should still be queued
      const action = world.getComponent(entity, Components.Action);
      expect(action).toBeDefined();
      expect(action.type).toBe('wait');
    });

    it('should execute move action', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Energy, {
        current: 100,
        max: 100,
        regenRate: 10,
      });
      world.addComponent(entity, Components.Action, {
        type: 'move',
        direction: Cardinal.EAST,
        energyCost: 50,
      });

      world.tick(0);

      const pos = world.getComponent(entity, Components.Position);
      expect(pos.x).toBe(11); // Moved east
      expect(pos.y).toBe(10);

      const energy = world.getComponent(entity, Components.Energy);
      expect(energy.current).toBe(50);
    });

    it('should handle blocked movement gracefully', () => {
      // Add wall to block movement
      map.setTile(11, 10, Tiles.Wall);

      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Energy, {
        current: 100,
        max: 100,
        regenRate: 10,
      });
      world.addComponent(entity, Components.Action, {
        type: 'move',
        direction: Cardinal.EAST,
        energyCost: 50,
      });

      world.tick(0);

      const pos = world.getComponent(entity, Components.Position);
      expect(pos.x).toBe(10); // Did not move
      expect(pos.y).toBe(10);

      // Energy should still be deducted (attempted to move)
      const energy = world.getComponent(entity, Components.Energy);
      expect(energy.current).toBe(50);
    });
  });

  describe('AwaitingInputSystem', () => {
    it('should pause clock when player has no action', () => {
      const player = world.createEntity();
      world.addComponent(player, Components.Position, { x: 10, y: 10 });
      world.addComponent(player, Components.PlayerControlled, {});
      world.addComponent(player, Components.Energy, {
        current: 100,
        max: 100,
        regenRate: 10,
      });
      // No Action component

      world.tick(0);

      const clock = world.getResource('GameClock');
      expect(clock.paused).toBe(true);
    });

    it('should unpause clock when player has action', () => {
      const player = world.createEntity();
      world.addComponent(player, Components.Position, { x: 10, y: 10 });
      world.addComponent(player, Components.PlayerControlled, {});
      world.addComponent(player, Components.Energy, {
        current: 100,
        max: 100,
        regenRate: 10,
      });
      world.addComponent(player, Components.Action, {
        type: 'wait',
        energyCost: 50,
      });

      world.tick(0);

      const clock = world.getResource('GameClock');
      expect(clock.paused).toBe(false);
    });

    it('should not pause when no player exists', () => {
      // Create NPC entity (not player-controlled)
      const npc = world.createEntity();
      world.addComponent(npc, Components.Position, { x: 10, y: 10 });
      world.addComponent(npc, Components.Energy, {
        current: 100,
        max: 100,
        regenRate: 10,
      });

      world.tick(0);

      const clock = world.getResource('GameClock');
      expect(clock.paused).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should process full turn cycle with player input', () => {
      const player = world.createEntity();
      world.addComponent(player, Components.Position, { x: 10, y: 10 });
      world.addComponent(player, Components.PlayerControlled, {});
      world.addComponent(player, Components.Energy, {
        current: 100,
        max: 100,
        regenRate: 10,
      });

      // Tick 1: No action, clock should pause
      world.tick(0);
      let clock = world.getResource('GameClock');
      expect(clock.paused).toBe(true);
      expect(clock.tick).toBe(0);

      // Player queues action
      world.addComponent(player, Components.Action, {
        type: 'move',
        direction: Cardinal.EAST,
        energyCost: 50,
      });

      // Tick 2: Action executes, clock advances
      world.tick(0);
      clock = world.getResource('GameClock');
      // Clock is unpaused at start of tick (player had action)
      // But action is now executed and removed
      expect(clock.tick).toBe(1);

      const pos = world.getComponent(player, Components.Position);
      expect(pos.x).toBe(11);

      const energy = world.getComponent(player, Components.Energy);
      // Energy regenerates first (100 + 10 = 110, capped at 100), then action executes (100 - 50 = 50)
      expect(energy.current).toBe(50);

      // Tick 3: No action, clock should pause again
      world.tick(0);
      clock = world.getResource('GameClock');
      expect(clock.paused).toBe(true);
      expect(clock.tick).toBe(1); // Doesn't increment because paused
    });

    it('should handle multiple entities with different speeds', () => {
      // Fast entity
      const fast = world.createEntity();
      world.addComponent(fast, Components.Position, { x: 5, y: 5 });
      world.addComponent(fast, Components.Energy, {
        current: 0,
        max: 100,
        regenRate: 10,
      });
      world.addComponent(fast, Components.Speed, {
        multiplier: 2.0,
      });

      // Slow entity
      const slow = world.createEntity();
      world.addComponent(slow, Components.Position, { x: 15, y: 15 });
      world.addComponent(slow, Components.Energy, {
        current: 0,
        max: 100,
        regenRate: 10,
      });
      world.addComponent(slow, Components.Speed, {
        multiplier: 0.5,
      });

      world.tick(0);

      const fastEnergy = world.getComponent(fast, Components.Energy);
      const slowEnergy = world.getComponent(slow, Components.Energy);

      expect(fastEnergy.current).toBe(20); // 10 * 2.0
      expect(slowEnergy.current).toBe(5); // 10 * 0.5
    });

    it('should queue action for next tick if insufficient energy', () => {
      const entity = world.createEntity();
      world.addComponent(entity, Components.Position, { x: 10, y: 10 });
      world.addComponent(entity, Components.Energy, {
        current: 10,
        max: 100,
        regenRate: 15,
      });
      world.addComponent(entity, Components.Action, {
        type: 'wait',
        energyCost: 60,
      });

      // First tick: Not enough energy
      world.tick(0);
      let energy = world.getComponent(entity, Components.Energy);
      expect(energy.current).toBe(25); // 10 + 15 (regen), action not executed

      let action = world.getComponent(entity, Components.Action);
      expect(action).toBeDefined(); // Still queued

      // Second tick: Still not enough energy
      world.tick(0);
      energy = world.getComponent(entity, Components.Energy);
      expect(energy.current).toBe(40); // 25 + 15 (regen)

      action = world.getComponent(entity, Components.Action);
      expect(action).toBeDefined(); // Still queued

      // Third tick: Still not enough energy
      world.tick(0);
      energy = world.getComponent(entity, Components.Energy);
      expect(energy.current).toBe(55); // 40 + 15 (regen)

      action = world.getComponent(entity, Components.Action);
      expect(action).toBeDefined(); // Still queued

      // Fourth tick: Now has enough energy
      world.tick(0);
      energy = world.getComponent(entity, Components.Energy);
      expect(energy.current).toBe(10); // 55 + 15 (regen) - 60 (action)

      action = world.getComponent(entity, Components.Action);
      expect(action).toBeUndefined(); // Action executed and removed
    });
  });
});
