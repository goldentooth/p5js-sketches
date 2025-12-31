import type { System, World, Phase, Entity } from '../types';
import type { Action } from '../components/Action';
import type { Energy } from '../components/Energy';
import type { CombatStats } from '../components/CombatStats';
import type { Position } from '../components/Position';
import { Components } from '../components';
import type { MovementSystem } from './MovementSystem';

/**
 * System that executes queued actions when entities have sufficient energy.
 * Runs in the 'update' phase after energy regeneration.
 */
export class ActionExecutionSystem implements System {
  phase: Phase = 'update';

  constructor(private movementSystem: MovementSystem) {}

  /**
   * Process all entities with queued actions.
   * Actions are only executed if the entity has enough energy.
   * Player actions are processed first to ensure player moves resolve before enemy attacks.
   */
  run(world: World): void {
    // Register components before querying
    world.registerComponent(Components.Action);
    world.registerComponent(Components.Energy);
    world.registerComponent(Components.PlayerControlled);

    // Collect entities with actions, separating player from others
    const playerEntities: Entity[] = [];
    const otherEntities: Entity[] = [];

    for (const entity of world.query([Components.Action, Components.Energy])) {
      if (world.getComponent(entity, Components.PlayerControlled)) {
        playerEntities.push(entity);
      } else {
        otherEntities.push(entity);
      }
    }

    // Process player actions first, then others
    for (const entity of [...playerEntities, ...otherEntities]) {
      const action = world.getComponent<Action>(entity, Components.Action);
      const energy = world.getComponent<Energy>(entity, Components.Energy);

      if (!action || !energy) continue;

      // Check if entity has enough energy to perform the action
      if (energy.current >= action.energyCost) {
        // Execute action based on type
        this.executeAction(world, entity, action);

        // Deduct energy cost
        energy.current -= action.energyCost;

        // Remove action component after execution
        world.removeComponent(entity, Components.Action);
      }
      // If not enough energy, action remains queued for next tick
    }
  }

  /**
   * Execute a specific action for an entity
   */
  private executeAction(world: World, entity: number, action: Action): void {
    switch (action.type) {
      case 'move':
        if (action.direction) {
          this.movementSystem.tryMove(world, entity, action.direction);
        }
        break;

      case 'wait':
        // Do nothing - just burn energy
        break;

      case 'melee_attack':
        if (action.target !== undefined) {
          this.executeMeleeAttack(world, entity, action.target);
        }
        break;

      case 'ranged_attack':
        // TODO: Implement in Stage 8 (Combat)
        break;

      case 'use_item':
        // TODO: Implement in future stage
        break;

      case 'pickup':
        // TODO: Implement in future stage
        break;

      case 'drop':
        // TODO: Implement in future stage
        break;

      default:
        console.warn(`Unknown action type: ${(action as Action).type}`);
    }
  }

  /**
   * Execute a melee attack against a target entity
   *
   * Damage is calculated as: attacker.attack - defender.defense (minimum 0)
   * If target's HP drops to 0 or below, the entity is destroyed.
   * Attack only succeeds if attacker and target are adjacent.
   */
  private executeMeleeAttack(world: World, attacker: Entity, target: Entity): void {
    const attackerStats = world.getComponent<CombatStats>(attacker, Components.CombatStats);
    const targetStats = world.getComponent<CombatStats>(target, Components.CombatStats);
    const attackerPos = world.getComponent<Position>(attacker, Components.Position);
    const targetPos = world.getComponent<Position>(target, Components.Position);

    // Both entities need CombatStats and Position for combat
    if (!attackerStats || !targetStats || !attackerPos || !targetPos) return;

    // Verify attacker and target are still adjacent (target may have moved)
    const dx = Math.abs(attackerPos.x - targetPos.x);
    const dy = Math.abs(attackerPos.y - targetPos.y);
    const isAdjacent = dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);

    if (!isAdjacent) {
      return; // Attack whiffs - target moved away
    }

    // Calculate and apply damage (minimum 0)
    const damage = Math.max(0, attackerStats.attack - targetStats.defense);
    targetStats.hp -= damage;

    // Stagger: target loses energy proportional to damage (makes kiting possible)
    if (damage > 0) {
      const targetEnergy = world.getComponent<Energy>(target, Components.Energy);
      if (targetEnergy) {
        const staggerAmount = damage * 10; // Each point of damage = 10 energy lost
        targetEnergy.current = Math.max(0, targetEnergy.current - staggerAmount);
      }
    }

    // Check for death
    if (targetStats.hp <= 0) {
      world.destroyEntity(target);
    }
  }
}
