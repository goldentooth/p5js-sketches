/**
 * A flat key-value map representing facts about the world.
 * Keys are strings, values are numbers or booleans.
 * The planner compares states, computes deltas, and checks preconditions against them.
 */
export type GoapState = Map<string, number | boolean>;

/**
 * An action the planner can use to transform world state.
 *
 * Numeric effects are additive deltas (e.g. 2 means +2, -1 means subtract 1).
 * Boolean effects are direct values (e.g. true, false).
 * Numeric preconditions use >= comparison (current must be >= required).
 */
export interface GoapAction {
  /** Unique identifier (e.g. "chop_tree") */
  name: string;
  /** World state entries that must be true/met to attempt this action */
  preconditions: GoapState;
  /** World state changes that result from completing this action */
  effects: GoapState;
  /** Numeric cost for A* search (default 1) */
  cost: number;
}

/**
 * A goal the agent wants to achieve.
 * The state is a partial world state -- the planner works backward from
 * this to find an action sequence that satisfies all entries.
 */
export interface GoapGoal {
  /** Partial world state to achieve */
  state: GoapState;
  /** Priority score (higher = more urgent) */
  priority: number;
}

/**
 * A plan: an ordered sequence of actions to achieve a goal.
 */
export interface GoapPlan {
  /** Actions in execution order (first to last) */
  actions: GoapAction[];
  /** The goal this plan achieves */
  goal: GoapGoal;
}

/**
 * A planner instance holding the registered action set.
 */
export interface GoapPlanner {
  /** Available actions the planner can use */
  actions: GoapAction[];
}

/**
 * Helper: create a GoapState from a plain object.
 * Converts `{ hunger: 100, has_axe: true }` to a Map.
 */
export function createState(obj: Record<string, number | boolean>): GoapState {
  return new Map(Object.entries(obj));
}

/**
 * Helper: create a GoapAction from a plain descriptor.
 */
export function createAction(desc: {
  name: string;
  preconditions: Record<string, number | boolean>;
  effects: Record<string, number | boolean>;
  cost?: number;
}): GoapAction {
  return {
    name: desc.name,
    preconditions: createState(desc.preconditions),
    effects: createState(desc.effects),
    cost: desc.cost ?? 1,
  };
}

/**
 * Helper: create a GoapGoal from a plain descriptor.
 */
export function createGoal(desc: {
  state: Record<string, number | boolean>;
  priority?: number;
}): GoapGoal {
  return {
    state: createState(desc.state),
    priority: desc.priority ?? 0,
  };
}
