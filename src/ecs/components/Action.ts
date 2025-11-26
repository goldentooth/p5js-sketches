import type { Entity } from '../types.js';
import type { Direction } from '../../movement/directions.js';

export const Action = 'Action';

/**
 * Action types supported by the action execution system
 */
export type ActionType =
  | 'move'
  | 'wait'
  | 'melee_attack'
  | 'ranged_attack'
  | 'use_item'
  | 'pickup'
  | 'drop';

/**
 * Action component represents an entity's intent to perform an action.
 * Actions are queued by behavior systems and executed by ActionExecutionSystem
 * when the entity has sufficient energy.
 */
export interface Action {
  /** Type of action to perform */
  type: ActionType;
  /** Energy cost to execute this action */
  energyCost: number;
  /** Target entity (for attacks, interactions) */
  target?: Entity;
  /** Movement direction (for move actions) */
  direction?: Direction;
  /** Additional action-specific data */
  data?: any;
}
