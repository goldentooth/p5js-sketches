import type { System, World, Phase } from '../types';
import type { Action } from '../components/Action';
import type { Energy } from '../components/Energy';
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
   */
  run(world: World): void {
    // Register components before querying
    world.registerComponent(Components.Action);
    world.registerComponent(Components.Energy);

    for (const entity of world.query([Components.Action, Components.Energy])) {
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
        // TODO: Implement in Stage 8 (Combat)
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
}
