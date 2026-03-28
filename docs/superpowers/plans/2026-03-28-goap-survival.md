# GOAP Survival Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Educational single-agent survival sketch demonstrating GOAP planning with a real-time plan inspector, day/night cycle with full light simulation, and a foresight toggle.

**Architecture:** GOAP planner in nuglib (src/goap/) as a generic regressive A* search over abstract world states. Sketch-local systems handle survival scenario (needs, goals, actions, map gen, lighting, rendering). Side panel renders the planner's reasoning in real time.

**Tech Stack:** p5.js, Nuglib (ECS, pathfinding, FOV, rendering), Hugo frontmatter, Vitest

---

## Task 1: GOAP Types (`src/goap/types.ts` + `src/goap/index.ts`)

### Context

The GOAP planner is a generic, domain-agnostic planning engine. It knows nothing about survival -- it operates on abstract world states (`Map<string, number | boolean>`), actions, and goals. The types live in nuglib so any sketch can reuse the planner.

### Steps

- [ ] **1.1** Create `src/goap/types.ts` with type definitions

```typescript
// src/goap/types.ts

/**
 * A flat key-value map representing facts about the world.
 * Keys are strings, values are numbers or booleans.
 * The planner compares states, computes deltas, and checks preconditions against them.
 */
export type GoapState = Map<string, number | boolean>;

/**
 * An action the planner can use to transform world state.
 *
 * Effects use string deltas for numeric changes (e.g. "+2", "-1")
 * and direct values for boolean changes (e.g. true, false).
 * Preconditions with numbers use exact match or the ">=N" string form.
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
    priority: desc.priority ?? 1,
  };
}
```

- [ ] **1.2** Create `src/goap/index.ts` with re-exports

```typescript
// src/goap/index.ts
export * from './types';
export * from './planner';
```

- [ ] **1.3** Add GOAP export to `src/index.ts`

Add this line to the end of `/Users/nathan/Projects/bitterbridge/p5js-sketches/src/index.ts`:

```typescript
export * from './goap';
```

- [ ] **1.4** Write type helper tests in `tests/goap-types.test.js`

```javascript
// tests/goap-types.test.js
import { describe, it, expect } from 'vitest';
import { createState, createAction, createGoal } from '../src';

describe('GOAP Types', () => {
  describe('createState', () => {
    it('should create a Map from a plain object', () => {
      const state = createState({ hunger: 100, has_axe: true });
      expect(state).toBeInstanceOf(Map);
      expect(state.get('hunger')).toBe(100);
      expect(state.get('has_axe')).toBe(true);
      expect(state.size).toBe(2);
    });

    it('should handle empty objects', () => {
      const state = createState({});
      expect(state.size).toBe(0);
    });
  });

  describe('createAction', () => {
    it('should create an action with default cost', () => {
      const action = createAction({
        name: 'gather_stick',
        preconditions: { near_sticks: true },
        effects: { stick_count: 1 },
      });
      expect(action.name).toBe('gather_stick');
      expect(action.preconditions.get('near_sticks')).toBe(true);
      expect(action.effects.get('stick_count')).toBe(1);
      expect(action.cost).toBe(1);
    });

    it('should accept custom cost', () => {
      const action = createAction({
        name: 'chop_tree',
        preconditions: { has_axe: true, near_tree: true },
        effects: { wood_count: 2 },
        cost: 3,
      });
      expect(action.cost).toBe(3);
      expect(action.preconditions.size).toBe(2);
    });
  });

  describe('createGoal', () => {
    it('should create a goal with default priority', () => {
      const goal = createGoal({ state: { has_axe: true } });
      expect(goal.state.get('has_axe')).toBe(true);
      expect(goal.priority).toBe(1);
    });

    it('should accept custom priority', () => {
      const goal = createGoal({ state: { hunger: 100 }, priority: 75 });
      expect(goal.priority).toBe(75);
    });
  });
});
```

- [ ] **1.5** Run tests: `npx vitest run tests/goap-types.test.js`

Expected: all 5 tests pass.

---

## Task 2: GOAP Planner (`src/goap/planner.ts`)

### Context

The planner uses regressive A* search, working backward from the goal. It starts with the desired goal state, finds actions whose effects satisfy unsatisfied conditions, adds the action's preconditions as new sub-goals, and repeats until all preconditions are met by the current world state. This is the standard GOAP algorithm (same structure as Jeff Orkin's original F.E.A.R. planner).

The key insight: numeric effects are **deltas** ("+2" means add 2), but we store them as plain numbers in the effects map. The planner needs to know which effects are deltas vs absolutes. We use a convention: boolean effects are absolute, numeric effects are deltas. For preconditions, numbers mean "current state must be >= this value".

### Steps

- [ ] **2.1** Create `src/goap/planner.ts`

```typescript
// src/goap/planner.ts

import type { GoapState, GoapAction, GoapGoal, GoapPlan, GoapPlanner } from './types';

/**
 * Internal node for the regressive A* search.
 */
interface PlanNode {
  /** The unsatisfied state we still need to achieve */
  unsatisfied: GoapState;
  /** Actions chosen so far (in reverse order -- last chosen first) */
  actions: GoapAction[];
  /** g-cost: sum of action costs so far */
  g: number;
  /** h-cost: heuristic estimate of remaining cost */
  h: number;
  /** f-cost: g + h */
  f: number;
}

/**
 * Check if a precondition is satisfied by the current world state.
 *
 * - Boolean preconditions: current value must equal the required value
 * - Numeric preconditions: current value must be >= required value
 */
function preconditionMet(
  key: string,
  required: number | boolean,
  currentState: GoapState
): boolean {
  const current = currentState.get(key);
  if (current === undefined) {
    // If the key doesn't exist in current state, treat as 0 for numbers, false for booleans
    if (typeof required === 'boolean') {
      return required === false;
    }
    return required <= 0;
  }
  if (typeof required === 'boolean') {
    return current === required;
  }
  if (typeof current === 'number') {
    return current >= required;
  }
  return false;
}

/**
 * Check if an action's effects can satisfy at least one entry in the unsatisfied state.
 */
function actionRelevant(action: GoapAction, unsatisfied: GoapState): boolean {
  for (const [key, value] of unsatisfied) {
    const effect = action.effects.get(key);
    if (effect === undefined) continue;
    // Boolean: effect must match desired value
    if (typeof value === 'boolean' && effect === value) return true;
    // Numeric: effect must be a positive delta when we need a higher value
    if (typeof value === 'number' && typeof effect === 'number' && effect > 0) return true;
  }
  return false;
}

/**
 * Apply an action's effects to the unsatisfied state (regressive).
 *
 * For each effect:
 * - Boolean effects that match an unsatisfied boolean: remove the condition,
 *   then add the action's preconditions for that key.
 * - Numeric effects (positive deltas): reduce the unsatisfied amount.
 *   If fully satisfied, remove; otherwise reduce.
 *
 * Returns a new unsatisfied state with the action's own preconditions merged in.
 */
function applyActionRegressive(
  unsatisfied: GoapState,
  action: GoapAction,
  currentState: GoapState
): GoapState {
  const result = new Map(unsatisfied);

  // Apply effects: remove or reduce satisfied conditions
  for (const [key, effect] of action.effects) {
    const needed = result.get(key);
    if (needed === undefined) continue;

    if (typeof needed === 'boolean' && effect === needed) {
      // Boolean condition satisfied by this action
      result.delete(key);
    } else if (typeof needed === 'number' && typeof effect === 'number') {
      // Numeric: the effect is a delta that contributes toward the needed value
      // In regressive search, if we need value N and the action provides +E,
      // we still need N-E from prior actions (or current state)
      const currentVal = typeof currentState.get(key) === 'number'
        ? currentState.get(key) as number
        : 0;
      const afterEffect = currentVal + effect;
      if (afterEffect >= needed) {
        // This action (combined with current state) fully satisfies this condition
        result.delete(key);
      } else {
        // Still need more -- reduce the requirement
        result.set(key, needed - effect);
      }
    }
  }

  // Add action's preconditions as new unsatisfied goals
  for (const [key, required] of action.preconditions) {
    // Only add if not already satisfied by current world state
    if (!preconditionMet(key, required, currentState)) {
      // Merge: keep the stricter requirement
      const existing = result.get(key);
      if (existing === undefined) {
        result.set(key, required);
      } else if (typeof required === 'number' && typeof existing === 'number') {
        result.set(key, Math.max(required, existing));
      }
      // For booleans, if they conflict we have a problem -- keep existing
    }
  }

  return result;
}

/**
 * Heuristic: count of unsatisfied conditions.
 * Simple but admissible (never overestimates since each action costs >= 1).
 */
function heuristic(unsatisfied: GoapState): number {
  return unsatisfied.size;
}

/**
 * Serialize an unsatisfied state into a string key for the closed set.
 */
function stateKey(unsatisfied: GoapState): string {
  const entries = Array.from(unsatisfied.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([k, v]) => `${k}=${v}`).join('|');
}

/**
 * Create a GOAP planner with the given set of available actions.
 *
 * @param actions - The actions available to the agent
 * @returns A planner instance
 */
export function createPlanner(actions: GoapAction[]): GoapPlanner {
  return { actions: [...actions] };
}

/**
 * Find a plan to achieve the given goal from the current world state.
 *
 * Uses regressive A* search:
 * 1. Start from the goal state (unsatisfied conditions)
 * 2. Find actions whose effects satisfy unsatisfied conditions
 * 3. Add that action's preconditions as new sub-goals
 * 4. Repeat until all conditions are met by current state
 * 5. Return the action sequence (reversed) as the plan
 *
 * @param planner - The planner instance with registered actions
 * @param currentState - The current world state
 * @param goal - The goal to achieve
 * @param maxNodes - Maximum nodes to explore (default 1000)
 * @returns A GoapPlan if one is found, or null if no valid plan exists
 */
export function plan(
  planner: GoapPlanner,
  currentState: GoapState,
  goal: GoapGoal,
  maxNodes: number = 1000
): GoapPlan | null {
  // Build initial unsatisfied set: goal conditions not already met
  const initialUnsatisfied: GoapState = new Map();
  for (const [key, value] of goal.state) {
    if (!preconditionMet(key, value, currentState)) {
      initialUnsatisfied.set(key, value);
    }
  }

  // If the goal is already satisfied, return an empty plan
  if (initialUnsatisfied.size === 0) {
    return { actions: [], goal };
  }

  const h0 = heuristic(initialUnsatisfied);
  const startNode: PlanNode = {
    unsatisfied: initialUnsatisfied,
    actions: [],
    g: 0,
    h: h0,
    f: h0,
  };

  // Open set: sorted by f-cost
  const openSet: PlanNode[] = [startNode];
  // Closed set: tracks visited states to avoid cycles
  const closedSet = new Set<string>();

  let nodesExplored = 0;

  while (openSet.length > 0 && nodesExplored < maxNodes) {
    // Sort by f-cost (lowest first), break ties by lower h
    openSet.sort((a, b) => a.f - b.f || a.h - b.h);
    const current = openSet.shift()!;
    nodesExplored++;

    const key = stateKey(current.unsatisfied);
    if (closedSet.has(key)) continue;
    closedSet.add(key);

    // Check if all conditions are satisfied
    if (current.unsatisfied.size === 0) {
      // Actions were added in reverse (last action first), so reverse them
      return {
        actions: current.actions.slice().reverse(),
        goal,
      };
    }

    // Try each action
    for (const action of planner.actions) {
      // Skip if the action doesn't help with any unsatisfied condition
      if (!actionRelevant(action, current.unsatisfied)) continue;

      // Apply action regressively
      const newUnsatisfied = applyActionRegressive(
        current.unsatisfied,
        action,
        currentState
      );

      const newKey = stateKey(newUnsatisfied);
      if (closedSet.has(newKey)) continue;

      const g = current.g + action.cost;
      const h = heuristic(newUnsatisfied);

      openSet.push({
        unsatisfied: newUnsatisfied,
        actions: [action, ...current.actions],
        g,
        h,
        f: g + h,
      });
    }
  }

  // No plan found
  return null;
}

/**
 * Validate that an existing plan is still executable given the current world state.
 *
 * Walks through the plan actions in order and checks that each action's
 * preconditions would be met after applying all prior actions' effects
 * to the current state.
 *
 * @param planner - The planner instance
 * @param currentState - The current world state
 * @param existingPlan - The plan to validate
 * @returns true if the plan is still valid, false if it needs replanning
 */
export function validatePlan(
  planner: GoapPlanner,
  currentState: GoapState,
  existingPlan: GoapPlan
): boolean {
  if (existingPlan.actions.length === 0) return true;

  // Simulate forward through the plan
  const simState = new Map(currentState);

  for (const action of existingPlan.actions) {
    // Check preconditions against simulated state
    for (const [key, required] of action.preconditions) {
      if (!preconditionMet(key, required, simState)) {
        return false;
      }
    }

    // Apply effects to simulated state
    for (const [key, effect] of action.effects) {
      const current = simState.get(key);
      if (typeof effect === 'boolean') {
        simState.set(key, effect);
      } else if (typeof effect === 'number') {
        const currentVal = typeof current === 'number' ? current : 0;
        simState.set(key, currentVal + effect);
      }
    }
  }

  return true;
}
```

- [ ] **2.2** Write comprehensive planner tests in `tests/goap-planner.test.js`

```javascript
// tests/goap-planner.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { createPlanner, plan, validatePlan, createAction, createState, createGoal } from '../src';

describe('GOAP Planner', () => {
  describe('simple one-action plan', () => {
    it('should find a plan with a single action', () => {
      const eatFood = createAction({
        name: 'eat_food',
        preconditions: { has_food: true },
        effects: { hunger: 30 },
      });

      const planner = createPlanner([eatFood]);
      const currentState = createState({ has_food: true, hunger: 50 });
      const goal = createGoal({ state: { hunger: 80 } });

      const result = plan(planner, currentState, goal);

      expect(result).not.toBeNull();
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].name).toBe('eat_food');
    });

    it('should return empty plan when goal already satisfied', () => {
      const eatFood = createAction({
        name: 'eat_food',
        preconditions: { has_food: true },
        effects: { hunger: 30 },
      });

      const planner = createPlanner([eatFood]);
      const currentState = createState({ hunger: 100 });
      const goal = createGoal({ state: { hunger: 80 } });

      const result = plan(planner, currentState, goal);

      expect(result).not.toBeNull();
      expect(result.actions).toHaveLength(0);
    });

    it('should achieve a boolean goal', () => {
      const craftAxe = createAction({
        name: 'craft_axe',
        preconditions: { stick_count: 1, stone_count: 1 },
        effects: { has_axe: true },
        cost: 2,
      });

      const planner = createPlanner([craftAxe]);
      const currentState = createState({ stick_count: 2, stone_count: 1 });
      const goal = createGoal({ state: { has_axe: true } });

      const result = plan(planner, currentState, goal);

      expect(result).not.toBeNull();
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].name).toBe('craft_axe');
    });
  });

  describe('multi-step plan chains', () => {
    let actions;

    beforeEach(() => {
      actions = [
        createAction({
          name: 'gather_stick',
          preconditions: { near_sticks: true },
          effects: { stick_count: 1 },
          cost: 1,
        }),
        createAction({
          name: 'gather_stone',
          preconditions: { near_rock: true },
          effects: { stone_count: 1 },
          cost: 1,
        }),
        createAction({
          name: 'craft_axe',
          preconditions: { stick_count: 1, stone_count: 1 },
          effects: { has_axe: true },
          cost: 2,
        }),
        createAction({
          name: 'chop_tree',
          preconditions: { has_axe: true, near_tree: true },
          effects: { wood_count: 2 },
          cost: 3,
        }),
        createAction({
          name: 'build_fire',
          preconditions: { wood_count: 2, near_clear: true },
          effects: { near_fire: true },
          cost: 3,
        }),
        createAction({
          name: 'warm_at_fire',
          preconditions: { near_fire: true },
          effects: { warmth: 40 },
          cost: 1,
        }),
      ];
    });

    it('should chain: gather_stick + gather_stone + craft_axe', () => {
      const planner = createPlanner(actions);
      const currentState = createState({
        near_sticks: true,
        near_rock: true,
        stick_count: 0,
        stone_count: 0,
      });
      const goal = createGoal({ state: { has_axe: true } });

      const result = plan(planner, currentState, goal);

      expect(result).not.toBeNull();
      // Should contain gather_stick, gather_stone, craft_axe (in some valid order)
      const names = result.actions.map(a => a.name);
      expect(names).toContain('craft_axe');
      expect(names).toContain('gather_stick');
      expect(names).toContain('gather_stone');
      // craft_axe must come after the gathers
      expect(names.indexOf('craft_axe')).toBeGreaterThan(names.indexOf('gather_stick'));
      expect(names.indexOf('craft_axe')).toBeGreaterThan(names.indexOf('gather_stone'));
    });

    it('should find long chain for warmth from scratch', () => {
      const planner = createPlanner(actions);
      const currentState = createState({
        near_sticks: true,
        near_rock: true,
        near_tree: true,
        near_clear: true,
        stick_count: 0,
        stone_count: 0,
        wood_count: 0,
        warmth: 0,
      });
      const goal = createGoal({ state: { warmth: 40 } });

      const result = plan(planner, currentState, goal);

      expect(result).not.toBeNull();
      const names = result.actions.map(a => a.name);
      // The full chain: gather resources -> craft axe -> chop tree -> build fire -> warm
      expect(names).toContain('warm_at_fire');
      expect(names).toContain('build_fire');
      expect(names).toContain('chop_tree');
      expect(names).toContain('craft_axe');
      // warm_at_fire must be last
      expect(names[names.length - 1]).toBe('warm_at_fire');
    });

    it('should skip steps when state already partially satisfied', () => {
      const planner = createPlanner(actions);
      const currentState = createState({
        has_axe: true,
        near_tree: true,
        near_clear: true,
        wood_count: 0,
        warmth: 0,
      });
      const goal = createGoal({ state: { warmth: 40 } });

      const result = plan(planner, currentState, goal);

      expect(result).not.toBeNull();
      const names = result.actions.map(a => a.name);
      // Should NOT include craft_axe or gathers since we already have the axe
      expect(names).not.toContain('craft_axe');
      expect(names).not.toContain('gather_stick');
      expect(names).not.toContain('gather_stone');
      expect(names).toContain('chop_tree');
      expect(names).toContain('build_fire');
      expect(names).toContain('warm_at_fire');
    });
  });

  describe('no plan possible', () => {
    it('should return null when no actions can satisfy the goal', () => {
      const eatFood = createAction({
        name: 'eat_food',
        preconditions: { has_food: true },
        effects: { hunger: 30 },
      });

      const planner = createPlanner([eatFood]);
      const currentState = createState({ hunger: 0 });
      // Goal: has_axe -- no action produces this
      const goal = createGoal({ state: { has_axe: true } });

      const result = plan(planner, currentState, goal);

      expect(result).toBeNull();
    });

    it('should return null when preconditions cannot be met', () => {
      const chopTree = createAction({
        name: 'chop_tree',
        preconditions: { has_axe: true },
        effects: { wood_count: 2 },
        cost: 3,
      });

      const planner = createPlanner([chopTree]);
      // No axe, and no way to get one
      const currentState = createState({ wood_count: 0 });
      const goal = createGoal({ state: { wood_count: 2 } });

      const result = plan(planner, currentState, goal);

      expect(result).toBeNull();
    });

    it('should return null with empty action set', () => {
      const planner = createPlanner([]);
      const currentState = createState({ hunger: 0 });
      const goal = createGoal({ state: { hunger: 100 } });

      const result = plan(planner, currentState, goal);

      expect(result).toBeNull();
    });
  });

  describe('cost optimization', () => {
    it('should prefer cheaper plans', () => {
      const cheapEat = createAction({
        name: 'eat_berries',
        preconditions: { near_berries: true },
        effects: { hunger: 30 },
        cost: 1,
      });
      const expensiveEat = createAction({
        name: 'cook_meal',
        preconditions: { near_fire: true },
        effects: { hunger: 30 },
        cost: 5,
      });

      const planner = createPlanner([cheapEat, expensiveEat]);
      const currentState = createState({
        near_berries: true,
        near_fire: true,
        hunger: 50,
      });
      const goal = createGoal({ state: { hunger: 80 } });

      const result = plan(planner, currentState, goal);

      expect(result).not.toBeNull();
      expect(result.actions[0].name).toBe('eat_berries');
    });
  });

  describe('validatePlan', () => {
    it('should return true for a valid plan', () => {
      const gatherStick = createAction({
        name: 'gather_stick',
        preconditions: { near_sticks: true },
        effects: { stick_count: 1 },
      });

      const planner = createPlanner([gatherStick]);
      const currentState = createState({ near_sticks: true, stick_count: 0 });
      const existingPlan = {
        actions: [gatherStick],
        goal: createGoal({ state: { stick_count: 1 } }),
      };

      expect(validatePlan(planner, currentState, existingPlan)).toBe(true);
    });

    it('should return false when preconditions no longer met', () => {
      const gatherStick = createAction({
        name: 'gather_stick',
        preconditions: { near_sticks: true },
        effects: { stick_count: 1 },
      });

      const planner = createPlanner([gatherStick]);
      // Agent moved away from sticks
      const currentState = createState({ near_sticks: false, stick_count: 0 });
      const existingPlan = {
        actions: [gatherStick],
        goal: createGoal({ state: { stick_count: 1 } }),
      };

      expect(validatePlan(planner, currentState, existingPlan)).toBe(false);
    });

    it('should return true for an empty plan', () => {
      const planner = createPlanner([]);
      const currentState = createState({ hunger: 100 });
      const existingPlan = {
        actions: [],
        goal: createGoal({ state: { hunger: 100 } }),
      };

      expect(validatePlan(planner, currentState, existingPlan)).toBe(true);
    });

    it('should validate multi-step plans by simulating forward', () => {
      const gatherStick = createAction({
        name: 'gather_stick',
        preconditions: { near_sticks: true },
        effects: { stick_count: 1 },
      });
      const craftTorch = createAction({
        name: 'craft_torch',
        preconditions: { stick_count: 1, wood_count: 1 },
        effects: { has_torch: true },
        cost: 2,
      });

      const planner = createPlanner([gatherStick, craftTorch]);
      const currentState = createState({
        near_sticks: true,
        stick_count: 0,
        wood_count: 1,
      });
      const existingPlan = {
        actions: [gatherStick, craftTorch],
        goal: createGoal({ state: { has_torch: true } }),
      };

      // gather_stick needs near_sticks (true), craft_torch needs stick_count>=1
      // (provided by gather_stick's effect) and wood_count>=1 (already in state)
      expect(validatePlan(planner, currentState, existingPlan)).toBe(true);
    });
  });
});
```

- [ ] **2.3** Run tests (should fail initially since planner.ts doesn't exist yet during TDD -- but since we wrote types.ts and planner.ts together, run to verify): `npx vitest run tests/goap-planner.test.js tests/goap-types.test.js`

Expected: all tests pass.

- [ ] **2.4** Run full test suite to ensure no regressions: `npm test`

Expected: all existing tests still pass, plus new GOAP tests.

---

## Task 3: Build nuglib

### Steps

- [ ] **3.1** Run typecheck: `npm run typecheck`

Expected: no type errors.

- [ ] **3.2** Build nuglib: `npm run build`

Expected: `static/libraries/nuglib.min.js` is regenerated with GOAP exports.

- [ ] **3.3** Run full test suite: `npm test`

Expected: all tests pass.

- [ ] **3.4** Commit the nuglib planner

```bash
git add src/goap/ tests/goap-types.test.js tests/goap-planner.test.js src/index.ts static/libraries/nuglib.min.js
git commit -m "Add GOAP planner to nuglib: regressive A* search with types, helpers, and tests"
```

---

## Task 4: Hugo Frontmatter (`content/goap-survival/index.md`)

### Steps

- [ ] **4.1** Create `content/goap-survival/index.md`

```markdown
---
title: "GOAP Survival"
date: 2026-03-28T00:00:00-05:00
description: "Educational single-agent survival demo using Goal-Oriented Action Planning (GOAP) with a real-time plan inspector"
usage: "Watch the agent survive in a procedural wilderness. The side panel shows GOAP reasoning in real time. Toggle between Proactive (plans ahead) and Reactive (only responds to current needs) modes."
draft: false
scripts:
  - "actions.js"
  - "world-state.js"
  - "needs.js"
  - "map-gen.js"
  - "lighting.js"
  - "rendering.js"
  - "main.js"
technical_details: |
  <ul>
    <li><strong>GOAP Planner:</strong> Regressive A* search over abstract world states — plans multi-step action chains (gather sticks, craft axe, chop tree, build fire)</li>
    <li><strong>Needs:</strong> Hunger, warmth, and health decay over time. Agent dies when any need hits zero.</li>
    <li><strong>Day/Night:</strong> 120-tick cycle with sinusoidal sun. Campfires and torches create light islands at night.</li>
    <li><strong>Foresight Toggle:</strong> Proactive mode anticipates future needs; reactive mode only responds to current conditions.</li>
    <li><strong>Monsters:</strong> Zombies and skeletons spawn at night in dark areas, despawn at dawn.</li>
  </ul>
controls: |
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <strong>Playback</strong>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button id="play-btn" class="control-button">Pause</button>
        <button id="step-btn" class="control-button">Step</button>
        <button id="regen-btn" class="control-button">Regenerate</button>
      </div>
      <div style="margin-top: 8px;">
        <label for="speed-slider">Speed: <span id="speed-value">5</span> tps</label>
        <input type="range" id="speed-slider" class="control-slider" min="1" max="30" value="5" style="width: 200px;">
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <strong>AI Mode</strong>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button id="foresight-btn" class="control-button">Proactive</button>
        <span id="foresight-label" style="color: #888; font-size: 0.85em; align-self: center;">Agent plans ahead for future needs</span>
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <strong>Stats</strong>
      <div style="font-family: monospace; font-size: 0.9em; margin-top: 8px; line-height: 1.8;">
        Survived: <span id="stat-ticks">0</span> ticks &nbsp;
        Deaths: <span id="stat-deaths">0</span> &nbsp;
        Plans: <span id="stat-plans">0</span><br>
        Goal: <span id="stat-goal" style="color: #aaa;">none</span> &nbsp;
        Action: <span id="stat-action" style="color: #aaa;">idle</span>
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333; font-size: 0.85em; color: #888;">
      <strong>Legend</strong>
      <div style="margin-top: 4px; font-family: monospace; line-height: 1.8;">
        <span style="color: #fff;">@</span> Agent &nbsp;
        <span style="color: #228B22;">T</span> Tree &nbsp;
        <span style="color: #8B4513;">/</span> Sticks &nbsp;
        <span style="color: #808080;">^</span> Rock &nbsp;
        <span style="color: #800080;">b</span> Berries &nbsp;
        <span style="color: #FFA500;">*</span> Fire<br>
        <span style="color: #556B2F;">&clubs;</span> Dense forest &nbsp;
        <span style="color: #4169E1;">~</span> Water &nbsp;
        <span style="color: #2E8B57;">Z</span> Zombie &nbsp;
        <span style="color: #fff;">S</span> Skeleton
      </div>
    </div>
  </div>
---
```

---

## Task 5: Map Generator (`content/goap-survival/map-gen.js`)

### Context

The wilderness map uses custom tile types beyond Wall/Floor. We define numeric tile types and store a parallel "feature" array for resources (trees, berries, sticks, rocks) that sit on walkable tiles. The map's `blocksMovement` check uses the tile type -- `Wall`, `DenseForest`, `Water`, and `Rock` block movement; everything else is walkable.

### Steps

- [ ] **5.1** Create `content/goap-survival/map-gen.js`

```javascript
// map-gen.js — Wilderness map generator for GOAP survival
//
// Custom tile types and feature layer. The base map uses Nuglib's createMap
// with Wall for impassable terrain and Floor for walkable. A separate
// features array tracks resource objects (trees, berries, sticks, rocks, fires).

// ─── Tile Constants ────────────────────────────────────────────────────────
// We use the base map tiles: Wall (0) = impassable, Floor (1) = walkable.
// The visual variety (grass, dense forest, water) is encoded in a parallel
// terrain-type array so blocksMovement() stays simple.

var TERRAIN_GRASS = 0;
var TERRAIN_DENSE_FOREST = 1;
var TERRAIN_WATER = 2;

// Feature types (placed on top of walkable tiles, or adjacent-harvestable on walls)
var FEATURE_NONE = 0;
var FEATURE_TREE = 1;
var FEATURE_BERRY = 2;
var FEATURE_STICKS = 3;
var FEATURE_ROCK = 4;
var FEATURE_FIRE = 5;

// ─── Map Data ──────────────────────────────────────────────────────────────
// These parallel arrays are indexed by (y * MAP_COLS + x).
// terrain[] stores visual terrain type (grass, dense forest, water)
// features[] stores resource features on each tile

var MAP_COLS = 50;
var MAP_ROWS = 30;
var terrain; // array of TERRAIN_* values
var features; // array of FEATURE_* values

// ─── Glyph & Color Tables ─────────────────────────────────────────────────

var TERRAIN_GLYPHS = {};
TERRAIN_GLYPHS[TERRAIN_GRASS] = "\u00B7";       // middle dot
TERRAIN_GLYPHS[TERRAIN_DENSE_FOREST] = "\u2663"; // club suit
TERRAIN_GLYPHS[TERRAIN_WATER] = "~";

var TERRAIN_COLORS = {};
TERRAIN_COLORS[TERRAIN_GRASS] = [34, 80, 34];
TERRAIN_COLORS[TERRAIN_DENSE_FOREST] = [20, 60, 20];
TERRAIN_COLORS[TERRAIN_WATER] = [30, 60, 180];

var FEATURE_GLYPHS = {};
FEATURE_GLYPHS[FEATURE_TREE] = "T";
FEATURE_GLYPHS[FEATURE_BERRY] = "b";
FEATURE_GLYPHS[FEATURE_STICKS] = "/";
FEATURE_GLYPHS[FEATURE_ROCK] = "^";
FEATURE_GLYPHS[FEATURE_FIRE] = "*";

var FEATURE_COLORS = {};
FEATURE_COLORS[FEATURE_TREE] = [34, 139, 34];
FEATURE_COLORS[FEATURE_BERRY] = [128, 0, 128];
FEATURE_COLORS[FEATURE_STICKS] = [139, 69, 19];
FEATURE_COLORS[FEATURE_ROCK] = [128, 128, 128];
FEATURE_COLORS[FEATURE_FIRE] = [255, 165, 0];

// ─── Generation ────────────────────────────────────────────────────────────

function generateWildernessMap(rng) {
  // Create base map (all floor = walkable)
  var map = Nuglib.createMap(MAP_COLS, MAP_ROWS, {
    defaultTile: Nuglib.Tiles.Floor,
    edgeBehavior: "block",
  });

  terrain = new Array(MAP_COLS * MAP_ROWS).fill(TERRAIN_GRASS);
  features = new Array(MAP_COLS * MAP_ROWS).fill(FEATURE_NONE);

  // Place water bodies (2-4 blobs)
  var waterBodies = rng.nextRange(2, 5);
  for (var w = 0; w < waterBodies; w++) {
    placeBlob(map, rng, TERRAIN_WATER, true, rng.nextRange(3, 6));
  }

  // Place dense forest clusters (4-7 blobs)
  var forestClusters = rng.nextRange(4, 8);
  for (var f = 0; f < forestClusters; f++) {
    placeBlob(map, rng, TERRAIN_DENSE_FOREST, true, rng.nextRange(3, 7));
  }

  // Place rock outcrops (impassable, harvestable from adjacent)
  placeFeatures(map, rng, FEATURE_ROCK, rng.nextRange(6, 10), 3, true);

  // Place trees (walkable, choppable)
  placeFeatures(map, rng, FEATURE_TREE, rng.nextRange(12, 18), 2, false);

  // Place berry bushes (walkable, forageable)
  placeFeatures(map, rng, FEATURE_BERRY, rng.nextRange(8, 12), 3, false);

  // Place stick piles (walkable, gatherable)
  placeFeatures(map, rng, FEATURE_STICKS, rng.nextRange(10, 15), 2, false);

  return map;
}

function placeBlob(map, rng, terrainType, blocksMove, radius) {
  // Pick a center away from edges
  var cx = rng.nextRange(radius + 2, MAP_COLS - radius - 2);
  var cy = rng.nextRange(radius + 2, MAP_ROWS - radius - 2);

  for (var dy = -radius; dy <= radius; dy++) {
    for (var dx = -radius; dx <= radius; dx++) {
      // Organic shape: use distance + noise
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;
      // Random chance to skip edge tiles for organic shape
      if (dist > radius * 0.6 && rng.nextFloat() < 0.4) continue;

      var x = cx + dx;
      var y = cy + dy;
      if (x <= 0 || x >= MAP_COLS - 1 || y <= 0 || y >= MAP_ROWS - 1) continue;

      var idx = y * MAP_COLS + x;
      terrain[idx] = terrainType;
      if (blocksMove) {
        map.setTile(x, y, Nuglib.Tiles.Wall);
      }
    }
  }
}

function placeFeatures(map, rng, featureType, count, minSpacing, blocksMove) {
  var placed = 0;
  var attempts = 0;
  var maxAttempts = count * 20;

  while (placed < count && attempts < maxAttempts) {
    attempts++;
    var x = rng.nextRange(1, MAP_COLS - 1);
    var y = rng.nextRange(1, MAP_ROWS - 1);
    var idx = y * MAP_COLS + x;

    // Must be on grass (walkable, no other terrain)
    if (terrain[idx] !== TERRAIN_GRASS) continue;
    if (features[idx] !== FEATURE_NONE) continue;
    if (map.blocksMovement(x, y)) continue;

    // Minimum spacing check
    if (!checkSpacing(x, y, featureType, minSpacing)) continue;

    features[idx] = featureType;
    if (blocksMove) {
      map.setTile(x, y, Nuglib.Tiles.Wall);
    }
    placed++;
  }
}

function checkSpacing(x, y, featureType, minSpacing) {
  for (var dy = -minSpacing; dy <= minSpacing; dy++) {
    for (var dx = -minSpacing; dx <= minSpacing; dx++) {
      if (dx === 0 && dy === 0) continue;
      var nx = x + dx;
      var ny = y + dy;
      if (nx < 0 || nx >= MAP_COLS || ny < 0 || ny >= MAP_ROWS) continue;
      var idx = ny * MAP_COLS + nx;
      if (features[idx] === featureType) return false;
    }
  }
  return true;
}

function findSpawnPosition(map, rng) {
  // Find a walkable tile with no feature, near center
  for (var attempt = 0; attempt < 100; attempt++) {
    var x = rng.nextRange(10, MAP_COLS - 10);
    var y = rng.nextRange(5, MAP_ROWS - 5);
    var idx = y * MAP_COLS + x;
    if (!map.blocksMovement(x, y) && features[idx] === FEATURE_NONE) {
      return { x: x, y: y };
    }
  }
  // Fallback: center
  return { x: Math.floor(MAP_COLS / 2), y: Math.floor(MAP_ROWS / 2) };
}

function getFeatureAt(x, y) {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return FEATURE_NONE;
  return features[y * MAP_COLS + x];
}

function setFeatureAt(x, y, featureType) {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return;
  features[y * MAP_COLS + x] = featureType;
}

function getTerrainAt(x, y) {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return TERRAIN_GRASS;
  return terrain[y * MAP_COLS + x];
}

function removeFeatureAt(x, y) {
  setFeatureAt(x, y, FEATURE_NONE);
}
```

---

## Task 6: Lighting System (`content/goap-survival/lighting.js`)

### Context

The day/night cycle is 120 ticks per full cycle (60 day, 60 night). Sun follows a sinusoidal curve from 1.0 at noon to 0.0 at midnight. Campfires (radius 5) and torches (radius 3, carried by agent) add local light. Per-tile light is `max(sunlight, fire, torch)`. Light sources are tracked in a list; fires are permanent, torch follows the agent.

### Steps

- [ ] **6.1** Create `content/goap-survival/lighting.js`

```javascript
// lighting.js — Day/night cycle and per-tile light calculation
//
// 120-tick cycle: ticks 0-59 = day, ticks 60-119 = night
// Sun uses sinusoidal curve. Fires (radius 5) and torches (radius 3) add local light.

var CYCLE_LENGTH = 120;
var DAY_TICKS = 60;

// Per-tile light levels (indexed by y * MAP_COLS + x)
var lightMap;

// Light sources: { x, y, radius, intensity, color }
var lightSources;

function initLighting() {
  lightMap = new Float32Array(MAP_COLS * MAP_ROWS);
  lightSources = [];
}

function getSunLevel(tick) {
  // Sinusoidal: peak at tick 30 (noon), trough at tick 90 (midnight)
  // sin goes from -1 to 1, we map to 0..1
  var phase = (tick / CYCLE_LENGTH) * Math.PI * 2;
  // Shift so tick 0 = dawn (sun rising), tick 30 = noon, tick 60 = dusk, tick 90 = midnight
  var raw = Math.sin(phase - Math.PI / 2);
  // Map [-1, 1] to [0, 1] and clamp
  var level = (raw + 1) / 2;
  return Math.max(0, Math.min(1, level));
}

function isNight(tick) {
  return getSunLevel(tick) < 0.3;
}

function isDawn(tick) {
  var level = getSunLevel(tick);
  var prevLevel = getSunLevel((tick - 1 + CYCLE_LENGTH) % CYCLE_LENGTH);
  return level >= 0.3 && prevLevel < 0.3;
}

function getTimeOfDay(tick) {
  var cycleTick = tick % CYCLE_LENGTH;
  if (cycleTick < 15) return "dawn";
  if (cycleTick < 45) return "day";
  if (cycleTick < 60) return "dusk";
  return "night";
}

function addFireSource(x, y) {
  lightSources.push({
    x: x,
    y: y,
    radius: 5,
    intensity: 0.9,
    color: [255, 180, 60], // warm orange
    permanent: true,
  });
}

function clearLightSources() {
  lightSources = [];
}

function calculateLighting(tick, agentX, agentY, hasTorch) {
  var sunLevel = getSunLevel(tick);

  // Fill with sun level
  for (var i = 0; i < lightMap.length; i++) {
    lightMap[i] = sunLevel;
  }

  // Apply fire sources
  for (var s = 0; s < lightSources.length; s++) {
    var src = lightSources[s];
    applyLightSource(src.x, src.y, src.radius, src.intensity);
  }

  // Apply torch if agent has one
  if (hasTorch) {
    applyLightSource(agentX, agentY, 3, 0.8);
  }
}

function applyLightSource(sx, sy, radius, intensity) {
  var r2 = radius * radius;
  var minX = Math.max(0, sx - radius);
  var maxX = Math.min(MAP_COLS - 1, sx + radius);
  var minY = Math.max(0, sy - radius);
  var maxY = Math.min(MAP_ROWS - 1, sy + radius);

  for (var y = minY; y <= maxY; y++) {
    for (var x = minX; x <= maxX; x++) {
      var dx = x - sx;
      var dy = y - sy;
      var dist2 = dx * dx + dy * dy;
      if (dist2 > r2) continue;

      // Inverse-square falloff, clamped
      var dist = Math.sqrt(dist2);
      var falloff = 1 - (dist / radius);
      var light = intensity * falloff * falloff;

      var idx = y * MAP_COLS + x;
      // Take max of existing light and this source
      if (light > lightMap[idx]) {
        lightMap[idx] = light;
      }
    }
  }
}

function getLightAt(x, y) {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return 0;
  return lightMap[y * MAP_COLS + x];
}
```

---

## Task 7: Actions & World State (`content/goap-survival/actions.js` + `content/goap-survival/world-state.js`)

### Context

Actions define the GOAP action set for the survival scenario. The world state builder scans the ECS and map to produce a flat `GoapState` snapshot each tick. Numeric effects are deltas ("+2" means add 2 to current value). We represent this convention by storing the delta as a plain number -- the planner interprets all numeric effects as deltas.

The `move_to` action is special: it's a meta-action family (one per target type). Each has no preconditions, an effect of `near_<target>: true`, and a cost based on pathfinding distance to the nearest target of that type.

### Steps

- [ ] **7.1** Create `content/goap-survival/actions.js`

```javascript
// actions.js — Survival GOAP action definitions
//
// Each action has preconditions, effects, and cost. Numeric effects are deltas.
// move_to actions are generated dynamically based on map features.

// ─── Static Actions ────────────────────────────────────────────────────────

var SURVIVAL_ACTIONS = [
  {
    name: "gather_stick",
    preconditions: { near_sticks: true },
    effects: { stick_count: 1 },
    cost: 1,
  },
  {
    name: "gather_stone",
    preconditions: { near_rock: true },
    effects: { stone_count: 1 },
    cost: 1,
  },
  {
    name: "gather_berries",
    preconditions: { near_berries: true },
    effects: { has_food: true },
    cost: 1,
  },
  {
    name: "eat_food",
    preconditions: { has_food: true },
    effects: { hunger: 30, has_food: false },
    cost: 1,
  },
  {
    name: "craft_axe",
    preconditions: { stick_count: 1, stone_count: 1 },
    effects: { has_axe: true, stick_count: -1, stone_count: -1 },
    cost: 2,
  },
  {
    name: "craft_torch",
    preconditions: { stick_count: 1, wood_count: 1 },
    effects: { has_torch: true, stick_count: -1, wood_count: -1 },
    cost: 2,
  },
  {
    name: "chop_tree",
    preconditions: { has_axe: true, near_tree: true },
    effects: { wood_count: 2 },
    cost: 3,
  },
  {
    name: "build_fire",
    preconditions: { wood_count: 2, near_clear: true },
    effects: { near_fire: true, wood_count: -2 },
    cost: 3,
  },
  {
    name: "warm_at_fire",
    preconditions: { near_fire: true },
    effects: { warmth: 40 },
    cost: 1,
  },
  {
    name: "flee",
    preconditions: { threat_visible: true },
    effects: { threat_visible: false },
    cost: 0,
  },
];

// ─── Move-To Actions ───────────────────────────────────────────────────────
// Generated dynamically based on agent position and nearest feature of each type.

var MOVE_TARGETS = [
  { target: "tree", feature: FEATURE_TREE, stateKey: "near_tree" },
  { target: "rock", feature: FEATURE_ROCK, stateKey: "near_rock" },
  { target: "berries", feature: FEATURE_BERRY, stateKey: "near_berries" },
  { target: "sticks", feature: FEATURE_STICKS, stateKey: "near_sticks" },
  { target: "fire", feature: FEATURE_FIRE, stateKey: "near_fire" },
  { target: "clear", feature: FEATURE_NONE, stateKey: "near_clear" },
];

function buildMoveToActions(map, agentX, agentY) {
  var moveActions = [];

  for (var i = 0; i < MOVE_TARGETS.length; i++) {
    var mt = MOVE_TARGETS[i];
    var nearest = findNearestFeature(map, agentX, agentY, mt.feature, mt.target === "clear");
    if (!nearest) continue;

    var dist = Math.abs(nearest.x - agentX) + Math.abs(nearest.y - agentY);
    // Cost is distance-based but capped to keep planner search manageable
    var cost = Math.max(1, Math.min(dist, 20));

    var effects = {};
    effects[mt.stateKey] = true;

    moveActions.push(Nuglib.createAction({
      name: "move_to_" + mt.target,
      preconditions: {},
      effects: effects,
      cost: cost,
    }));
  }

  return moveActions;
}

function findNearestFeature(map, ax, ay, featureType, wantClear) {
  var best = null;
  var bestDist = Infinity;

  for (var y = 0; y < MAP_ROWS; y++) {
    for (var x = 0; x < MAP_COLS; x++) {
      if (wantClear) {
        // For "clear" target: walkable grass tile with no feature, not the agent's tile
        if (map.blocksMovement(x, y)) continue;
        if (getFeatureAt(x, y) !== FEATURE_NONE) continue;
        if (getTerrainAt(x, y) !== TERRAIN_GRASS) continue;
      } else {
        if (getFeatureAt(x, y) !== featureType) continue;
      }

      var dist = Math.abs(x - ax) + Math.abs(y - ay);
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: x, y: y };
      }
    }
  }

  return best;
}

function findNearestFeaturePosition(map, ax, ay, featureType, wantClear) {
  return findNearestFeature(map, ax, ay, featureType, wantClear);
}

function buildGoapActions(map, agentX, agentY) {
  // Convert static actions to Nuglib GoapAction objects
  var goapActions = [];
  for (var i = 0; i < SURVIVAL_ACTIONS.length; i++) {
    var a = SURVIVAL_ACTIONS[i];
    goapActions.push(Nuglib.createAction({
      name: a.name,
      preconditions: a.preconditions,
      effects: a.effects,
      cost: a.cost,
    }));
  }

  // Add dynamic move_to actions
  var moveActions = buildMoveToActions(map, agentX, agentY);
  for (var j = 0; j < moveActions.length; j++) {
    goapActions.push(moveActions[j]);
  }

  return goapActions;
}
```

- [ ] **7.2** Create `content/goap-survival/world-state.js`

```javascript
// world-state.js — World state snapshot builder for GOAP planner
//
// Scans ECS entities and map proximity to produce a flat GoapState
// that the planner can reason about.

function buildWorldState(world, map, agentEntity, tick) {
  var pos = world.getComponent(agentEntity, "Position");
  if (!pos) return Nuglib.createState({});

  var needs = world.getComponent(agentEntity, "Needs");
  var inventory = world.getComponent(agentEntity, "Inventory");
  if (!needs || !inventory) return Nuglib.createState({});

  // Scan adjacency (cardinal + diagonal neighbors)
  var nearTree = false;
  var nearRock = false;
  var nearBerries = false;
  var nearSticks = false;
  var nearFire = false;
  var nearClear = false;
  var nearWater = false;

  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      var nx = pos.x + dx;
      var ny = pos.y + dy;
      if (nx < 0 || nx >= MAP_COLS || ny < 0 || ny >= MAP_ROWS) continue;

      var feat = getFeatureAt(nx, ny);
      var terr = getTerrainAt(nx, ny);

      if (feat === FEATURE_TREE) nearTree = true;
      if (feat === FEATURE_ROCK) nearRock = true;
      if (feat === FEATURE_BERRY) nearBerries = true;
      if (feat === FEATURE_STICKS) nearSticks = true;
      if (feat === FEATURE_FIRE) nearFire = true;
      if (terr === TERRAIN_WATER) nearWater = true;

      // near_clear: walkable grass with no feature
      if (!map.blocksMovement(nx, ny) &&
          feat === FEATURE_NONE &&
          terr === TERRAIN_GRASS) {
        nearClear = true;
      }
    }
  }

  // Also check standing tile for fire (warm_at_fire)
  if (getFeatureAt(pos.x, pos.y) === FEATURE_FIRE) {
    nearFire = true;
  }

  // Check for visible threats
  var threatVisible = false;
  var viewshed = world.getComponent(agentEntity, "Viewshed");
  if (viewshed) {
    for (var entity of world.query(["AIControlled", "Position", "CombatStats"])) {
      var epos = world.getComponent(entity, "Position");
      if (!epos) continue;
      var key = epos.x + "," + epos.y;
      if (viewshed.visibleCells.has(key)) {
        threatVisible = true;
        break;
      }
    }
  }

  return Nuglib.createState({
    hunger: needs.hunger,
    warmth: needs.warmth,
    health: needs.health,
    has_axe: inventory.hasAxe,
    has_torch: inventory.hasTorch,
    has_food: inventory.hasFood,
    wood_count: inventory.wood,
    stick_count: inventory.sticks,
    stone_count: inventory.stones,
    near_tree: nearTree,
    near_rock: nearRock,
    near_berries: nearBerries,
    near_sticks: nearSticks,
    near_fire: nearFire,
    near_clear: nearClear,
    near_water: nearWater,
    is_night: isNight(tick),
    threat_visible: threatVisible,
  });
}
```

---

## Task 8: Needs & Goal Selection (`content/goap-survival/needs.js`)

### Context

Two ECS systems: `NeedDecaySystem` ticks needs down each frame. `GoalSelectionSystem` scores candidate goals and picks the highest priority, triggering a replan when the goal changes. The foresight toggle switches between proactive (anticipates future states) and reactive (only responds to current conditions).

### Steps

- [ ] **8.1** Create `content/goap-survival/needs.js`

```javascript
// needs.js — NeedDecaySystem, GoalSelectionSystem, foresight logic
//
// Needs: hunger, warmth, health (0-100). Agent dies when any hits 0.
// Goal selection uses utility scoring. Foresight toggle changes behavior.

var foresightMode = true; // true = proactive, false = reactive

// ─── NeedDecaySystem ───────────────────────────────────────────────────────

var NeedDecaySystem = class {
  constructor() {
    this.phase = "early";
  }

  run(world) {
    var clock = world.getResource("GameClock");
    if (clock && clock.paused) return;

    var tick = clock ? clock.tick : 0;
    var nightTime = isNight(tick);

    for (var entity of world.query(["Needs", "Position"])) {
      var needs = world.getComponent(entity, "Needs");
      if (!needs) continue;

      // Hunger decays at constant rate
      needs.hunger = Math.max(0, needs.hunger - 1);

      // Warmth decays faster at night
      var warmthDecay = nightTime ? 2 : 0.5;
      needs.warmth = Math.max(0, needs.warmth - warmthDecay);

      // Health doesn't decay naturally (only from attacks)

      // Check death
      if (needs.hunger <= 0 || needs.warmth <= 0 || needs.health <= 0) {
        world.addComponent(entity, "Dead", { cause: getCauseOfDeath(needs) });
      }
    }
  }
};

function getCauseOfDeath(needs) {
  if (needs.hunger <= 0) return "starvation";
  if (needs.warmth <= 0) return "hypothermia";
  if (needs.health <= 0) return "killed";
  return "unknown";
}

// ─── GoalSelectionSystem ───────────────────────────────────────────────────

var GoalSelectionSystem = class {
  constructor() {
    this.phase = "early";
  }

  run(world) {
    var clock = world.getResource("GameClock");
    if (clock && clock.paused) return;

    var tick = clock ? clock.tick : 0;

    for (var entity of world.query(["Needs", "Inventory", "GoapAgent", "Position"])) {
      var needs = world.getComponent(entity, "Needs");
      var agent = world.getComponent(entity, "GoapAgent");
      if (!needs || !agent) continue;

      var best = this.selectGoal(needs, world, entity, tick);

      // If goal changed, trigger replan
      if (!agent.currentGoal || !goalsEqual(agent.currentGoal, best)) {
        agent.currentGoal = best;
        agent.currentPlan = null;
        agent.planStepIndex = 0;
        agent.needsReplan = true;
      }
    }
  }

  selectGoal(needs, world, entity, tick) {
    var candidates = [];

    // Check for visible threats (always highest priority)
    var worldState = buildWorldState(world, world.getResource("map"), entity, tick);
    if (worldState.get("threat_visible")) {
      candidates.push({
        state: { threat_visible: false },
        priority: 100,
        label: "flee",
      });
    }

    // Hunger goal
    if (foresightMode) {
      // Proactive: trigger when hunger < 50 OR will be critical in 30 ticks
      var futureHunger = needs.hunger - 30; // 30 ticks * 1 decay/tick
      if (needs.hunger < 50 || futureHunger < 25) {
        candidates.push({
          state: { hunger: 100 },
          priority: 100 - needs.hunger,
          label: "eat",
        });
      }
    } else {
      // Reactive: only when threshold crossed
      if (needs.hunger < 50) {
        candidates.push({
          state: { hunger: 100 },
          priority: 100 - needs.hunger,
          label: "eat",
        });
      }
    }

    // Warmth goal
    if (foresightMode) {
      var nightTime = isNight(tick);
      var warmthDecay = nightTime ? 2 : 0.5;
      var futureWarmth = needs.warmth - (30 * warmthDecay);
      // Also trigger if night is approaching (within 20 ticks)
      var cycleTick = tick % CYCLE_LENGTH;
      var nightApproaching = cycleTick >= 40 && cycleTick < 60;

      if (needs.warmth < 50 || futureWarmth < 25 || (nightApproaching && needs.warmth < 70)) {
        candidates.push({
          state: { warmth: 100 },
          priority: 100 - needs.warmth,
          label: "warmth",
        });
      }
    } else {
      if (needs.warmth < 50) {
        candidates.push({
          state: { warmth: 100 },
          priority: 100 - needs.warmth,
          label: "warmth",
        });
      }
    }

    // Night torch goal
    if (foresightMode) {
      var cycleTick2 = tick % CYCLE_LENGTH;
      var nightSoon = cycleTick2 >= 40;
      var inv = world.getComponent(
        entity,
        "Inventory"
      );
      if (nightSoon && inv && !inv.hasTorch) {
        candidates.push({
          state: { has_torch: true },
          priority: 60,
          label: "craft torch",
        });
      }
    } else {
      var inv2 = world.getComponent(entity, "Inventory");
      if (isNight(tick) && inv2 && !inv2.hasTorch) {
        candidates.push({
          state: { has_torch: true },
          priority: 60,
          label: "craft torch",
        });
      }
    }

    // Default proactive preparation goal
    if (candidates.length === 0) {
      var inv3 = world.getComponent(entity, "Inventory");
      if (inv3 && !inv3.hasAxe) {
        candidates.push({
          state: { has_axe: true },
          priority: 20,
          label: "craft axe",
        });
      } else {
        // Gather wood for future fires
        candidates.push({
          state: { wood_count: 4 },
          priority: 20,
          label: "gather wood",
        });
      }
    }

    // Pick highest priority
    candidates.sort(function (a, b) { return b.priority - a.priority; });
    var chosen = candidates[0];

    var goal = Nuglib.createGoal({
      state: chosen.state,
      priority: chosen.priority,
    });
    setGoalLabel(goal, chosen.label);
    return goal;
  }
};

function goalsEqual(a, b) {
  if (!a || !b) return false;
  if (a.state.size !== b.state.size) return false;
  for (var entry of a.state) {
    if (b.state.get(entry[0]) !== entry[1]) return false;
  }
  return true;
}

// ─── Goal Label (for display) ──────────────────────────────────────────────
// The label is stored alongside the goal for the plan inspector.
// We use a parallel map since GoapGoal doesn't have a label field.

var goalLabels = new Map();

function setGoalLabel(goal, label) {
  // Use state key as identifier
  var key = "";
  for (var entry of goal.state) {
    key += entry[0] + "=" + entry[1] + ";";
  }
  goalLabels.set(key, label);
}

function getGoalLabel(goal) {
  if (!goal) return "none";
  var key = "";
  for (var entry of goal.state) {
    key += entry[0] + "=" + entry[1] + ";";
  }
  return goalLabels.get(key) || "unknown";
}
```

---

## Task 9: Rendering (`content/goap-survival/rendering.js`)

### Context

Canvas layout: left side is the 50x30 map at 12x18px per tile (600x540), right side is a 250px plan inspector panel. Total canvas: 850x540. Rendering uses a LayerManager with a "map" layer and draws the panel directly to the main canvas. Tile colors are multiplied by light level. The plan inspector shows goal, plan steps, need bars, inventory, time, and stats.

### Steps

- [ ] **9.1** Create `content/goap-survival/rendering.js`

```javascript
// rendering.js — Map rendering with lighting, plan inspector panel, glyph coloring
//
// Canvas: 850x540 (600px map + 250px panel)
// Map: 50x30 at 12x18 per tile
// Panel: rendered as text directly on canvas

var CHAR_W = 12;
var CHAR_H = 18;
var MAP_PX_W = MAP_COLS * CHAR_W; // 600
var MAP_PX_H = MAP_ROWS * CHAR_H; // 540
var PANEL_W = 250;
var CANVAS_W = MAP_PX_W + PANEL_W; // 850
var CANVAS_H = MAP_PX_H;           // 540

var layerManager;

// Agent glyph colors by goal type
var GOAL_COLORS = {
  eat: [255, 165, 0],       // orange
  warmth: [100, 150, 255],  // blue
  flee: [255, 50, 50],      // red
  "craft axe": [100, 200, 100],   // green
  "craft torch": [100, 200, 100], // green
  "gather wood": [100, 200, 100], // green
  none: [255, 255, 255],    // white
};

function initRendering() {
  layerManager = new Nuglib.LayerManager(window);
  layerManager.createLayer(
    "map",
    Nuglib.createTextLayerConfig(MAP_PX_W, MAP_PX_H, CHAR_H, "Courier New")
  );
}

function renderMap(world, map, agentEntity, tick) {
  var mapLayer = layerManager.getLayer("map");
  mapLayer.clear();
  mapLayer.textFont("Courier New");
  mapLayer.textSize(CHAR_H);
  mapLayer.textAlign(CENTER, CENTER);
  mapLayer.noStroke();

  var agentPos = world.getComponent(agentEntity, "Position");
  var viewshed = world.getComponent(agentEntity, "Viewshed");
  var memory = world.getComponent(agentEntity, "Memory");

  // Draw terrain and features
  for (var y = 0; y < MAP_ROWS; y++) {
    for (var x = 0; x < MAP_COLS; x++) {
      var cellKey = x + "," + y;
      var visible = viewshed && viewshed.visibleCells.has(cellKey);
      var explored = memory && memory.exploredCells.has(cellKey);

      if (!visible && !explored) continue;

      var light = visible ? getLightAt(x, y) : 0;
      var dimFactor = visible ? Math.max(0.05, light) : 0.15;

      var feat = getFeatureAt(x, y);
      var terr = getTerrainAt(x, y);
      var ch, col;

      if (feat !== FEATURE_NONE) {
        ch = FEATURE_GLYPHS[feat];
        col = FEATURE_COLORS[feat];
      } else {
        ch = TERRAIN_GLYPHS[terr];
        col = TERRAIN_COLORS[terr];
      }

      if (!ch) {
        ch = map.blocksMovement(x, y) ? "#" : "\u00B7";
        col = map.blocksMovement(x, y) ? [128, 128, 128] : [34, 80, 34];
      }

      // Multiply color by light level
      var r = Math.floor(col[0] * dimFactor);
      var g = Math.floor(col[1] * dimFactor);
      var b = Math.floor(col[2] * dimFactor);

      // Explored but not visible: desaturated blue-gray tint
      if (!visible && explored) {
        var avg = (col[0] + col[1] + col[2]) / 3;
        r = Math.floor(avg * 0.2);
        g = Math.floor(avg * 0.2);
        b = Math.floor(avg * 0.25);
      }

      mapLayer.fill(r, g, b);
      mapLayer.text(ch, x * CHAR_W + CHAR_W / 2, y * CHAR_H + CHAR_H / 2);
    }
  }

  // Draw entities (monsters)
  for (var entity of world.query(["Position", "Glyph", "AIControlled"])) {
    var pos = world.getComponent(entity, "Position");
    var gl = world.getComponent(entity, "Glyph");
    if (!pos || !gl) continue;

    // Only draw if visible to agent
    var ck = pos.x + "," + pos.y;
    if (!viewshed || !viewshed.visibleCells.has(ck)) continue;

    var lightLevel = Math.max(0.3, getLightAt(pos.x, pos.y));
    var fg = gl.fg;
    mapLayer.fill(
      Math.floor(fg[0] * lightLevel),
      Math.floor(fg[1] * lightLevel),
      Math.floor(fg[2] * lightLevel)
    );
    mapLayer.text(
      gl.glyph,
      pos.x * CHAR_W + CHAR_W / 2,
      pos.y * CHAR_H + CHAR_H / 2
    );
  }

  // Draw agent
  if (agentPos) {
    var agent = world.getComponent(agentEntity, "GoapAgent");
    var label = agent && agent.currentGoal ? getGoalLabel(agent.currentGoal) : "none";
    var agentColor = GOAL_COLORS[label] || GOAL_COLORS["none"];

    mapLayer.fill(agentColor[0], agentColor[1], agentColor[2]);
    mapLayer.text(
      "@",
      agentPos.x * CHAR_W + CHAR_W / 2,
      agentPos.y * CHAR_H + CHAR_H / 2
    );
  }
}

function renderPanel(world, agentEntity, tick) {
  var px = MAP_PX_W + 10; // panel x offset
  var py = 10;
  var lineH = 16;

  // Panel background
  fill(20, 20, 25);
  noStroke();
  rect(MAP_PX_W, 0, PANEL_W, CANVAS_H);

  textFont("Courier New");
  textSize(12);
  textAlign(LEFT, TOP);

  var agent = world.getComponent(agentEntity, "GoapAgent");
  var needs = world.getComponent(agentEntity, "Needs");
  var inventory = world.getComponent(agentEntity, "Inventory");

  // ─── Title ───
  fill(200, 200, 200);
  text("GOAP Inspector", px, py);
  py += lineH + 4;

  // ─── Time ───
  var timeLabel = getTimeOfDay(tick);
  var cycleTick = tick % CYCLE_LENGTH;
  var sunLvl = getSunLevel(tick);
  fill(150, 150, 150);
  text("Time: " + timeLabel + " (" + cycleTick + "/" + CYCLE_LENGTH + ")", px, py);
  py += lineH;
  text("Sun: " + sunLvl.toFixed(2), px, py);
  py += lineH;
  text("Mode: " + (foresightMode ? "Proactive" : "Reactive"), px, py);
  py += lineH + 8;

  // ─── Need Bars ───
  fill(200, 200, 200);
  text("Needs", px, py);
  py += lineH;

  if (needs) {
    drawNeedBar(px, py, "Hunger", needs.hunger, [255, 165, 0]);
    py += lineH + 2;
    drawNeedBar(px, py, "Warmth", needs.warmth, [100, 150, 255]);
    py += lineH + 2;
    drawNeedBar(px, py, "Health", needs.health, [255, 50, 50]);
    py += lineH + 8;
  }

  // ─── Inventory ───
  fill(200, 200, 200);
  text("Inventory", px, py);
  py += lineH;

  if (inventory) {
    fill(150, 150, 150);
    text("Sticks: " + inventory.sticks + "  Stones: " + inventory.stones, px, py);
    py += lineH;
    text("Wood: " + inventory.wood, px, py);
    py += lineH;
    text("Axe: " + (inventory.hasAxe ? "YES" : "no") +
         "  Torch: " + (inventory.hasTorch ? "YES" : "no"), px, py);
    py += lineH;
    text("Food: " + (inventory.hasFood ? "YES" : "no"), px, py);
    py += lineH + 8;
  }

  // ─── Current Goal ───
  fill(200, 200, 200);
  text("Goal", px, py);
  py += lineH;

  if (agent && agent.currentGoal) {
    var goalLabel = getGoalLabel(agent.currentGoal);
    var goalColor = GOAL_COLORS[goalLabel] || [200, 200, 200];
    fill(goalColor[0], goalColor[1], goalColor[2]);
    text(goalLabel + " (p=" + agent.currentGoal.priority + ")", px, py);
    py += lineH + 4;
  } else {
    fill(100, 100, 100);
    text("none", px, py);
    py += lineH + 4;
  }

  // ─── Plan Steps ───
  fill(200, 200, 200);
  text("Plan", px, py);
  py += lineH;

  if (agent && agent.currentPlan && agent.currentPlan.actions.length > 0) {
    for (var i = 0; i < agent.currentPlan.actions.length; i++) {
      var action = agent.currentPlan.actions[i];
      var prefix;
      if (i < agent.planStepIndex) {
        fill(80, 180, 80);
        prefix = "\u2713 "; // checkmark
      } else if (i === agent.planStepIndex) {
        fill(255, 255, 100);
        prefix = "\u2192 "; // arrow
      } else {
        fill(120, 120, 120);
        prefix = "  ";
      }
      text(prefix + action.name, px, py);
      py += lineH;
    }
  } else {
    fill(100, 100, 100);
    text("(no plan)", px, py);
    py += lineH;
  }

  py += 8;

  // ─── Stats ───
  fill(200, 200, 200);
  text("Stats", px, py);
  py += lineH;

  var stats = world.getResource("SurvivalStats");
  if (stats) {
    fill(150, 150, 150);
    text("Alive: " + stats.aliveTicks + " ticks", px, py);
    py += lineH;
    text("Deaths: " + stats.deaths, px, py);
    py += lineH;
    text("Replans: " + stats.replans, px, py);
    py += lineH;
  }
}

function drawNeedBar(x, y, label, value, barColor) {
  var barW = 100;
  var barH = 10;
  var labelW = 60;

  fill(150, 150, 150);
  textSize(11);
  text(label, x, y);

  // Background bar
  fill(40, 40, 40);
  rect(x + labelW, y + 1, barW, barH);

  // Fill bar
  var fillW = Math.floor(barW * (value / 100));
  var critical = value < 25;

  if (critical) {
    // Pulse red when critical
    var pulse = Math.sin(millis() / 200) * 0.3 + 0.7;
    fill(barColor[0] * pulse, barColor[1] * 0.3, barColor[2] * 0.3);
  } else {
    fill(barColor[0], barColor[1], barColor[2]);
  }
  rect(x + labelW, y + 1, fillW, barH);

  // Value text
  fill(200, 200, 200);
  textSize(10);
  text(Math.floor(value).toString(), x + labelW + barW + 4, y + 1);
  textSize(12);
}
```

---

## Task 10: Main Sketch (`content/goap-survival/main.js`)

### Context

The main sketch wires up the ECS world, handles the draw loop, controls, and contains the `GoapPlanningSystem`, `PlanExecutionSystem`, and `MonsterAISystem`. Monster spawning happens at night. Death triggers full world regeneration.

### Steps

- [ ] **10.1** Create `content/goap-survival/main.js`

```javascript
// main.js — GOAP Survival main sketch
//
// Setup, draw loop, ECS wiring, controls, MonsterAISystem,
// GoapPlanningSystem, PlanExecutionSystem

// ─── State ─────────────────────────────────────────────────────────────────
var rng;
var map;
var world;
var agentEntity;
var playing = true;
var playSpeed = 5;
var lastTickTime = 0;
var deathCount = 0;
var replanCount = 0;
var aliveTicks = 0;

// DOM elements
var playBtn, stepBtn, regenBtn, foresightBtn, foresightLabel;
var speedSlider, speedValue;
var statTicks, statDeaths, statPlans, statGoal, statAction;

// ─── ECS Systems ───────────────────────────────────────────────────────────

var GoapPlanningSystem = class {
  constructor() {
    this.phase = "early";
  }

  run(world) {
    var clock = world.getResource("GameClock");
    if (clock && clock.paused) return;

    var tick = clock ? clock.tick : 0;
    var gameMap = world.getResource("map");

    for (var entity of world.query(["GoapAgent", "Position", "Needs", "Inventory"])) {
      var agent = world.getComponent(entity, "GoapAgent");
      var pos = world.getComponent(entity, "Position");
      if (!agent || !pos) continue;

      // Check if we need to plan
      var shouldPlan = false;

      if (!agent.currentPlan || agent.needsReplan) {
        shouldPlan = true;
      } else if (agent.planStepIndex >= agent.currentPlan.actions.length) {
        // Plan complete -- goal selection will pick a new goal next tick
        shouldPlan = false;
      } else {
        // Validate current plan
        var ws = buildWorldState(world, gameMap, entity, tick);
        if (!Nuglib.validatePlan(agent.planner, ws, agent.currentPlan)) {
          shouldPlan = true;
        }
      }

      if (shouldPlan) {
        this.makePlan(world, entity, agent, gameMap, tick);
      }
    }
  }

  makePlan(world, entity, agent, gameMap, tick) {
    if (!agent.currentGoal) return;

    var pos = world.getComponent(entity, "Position");
    var ws = buildWorldState(world, gameMap, entity, tick);

    // Rebuild actions with current move_to costs
    var actions = buildGoapActions(gameMap, pos.x, pos.y);
    agent.planner = Nuglib.createPlanner(actions);

    var result = Nuglib.plan(agent.planner, ws, agent.currentGoal);
    agent.currentPlan = result;
    agent.planStepIndex = 0;
    agent.needsReplan = false;

    replanCount++;
    var stats = world.getResource("SurvivalStats");
    if (stats) stats.replans = replanCount;
  }
};

var PlanExecutionSystem = class {
  constructor() {
    this.phase = "early";
    this.moveTarget = null; // { x, y } for current move_to destination
  }

  run(world) {
    var clock = world.getResource("GameClock");
    if (clock && clock.paused) return;

    var tick = clock ? clock.tick : 0;
    var gameMap = world.getResource("map");

    for (var entity of world.query(["GoapAgent", "Position", "Energy", "Needs", "Inventory"])) {
      // Skip if already has an action queued
      if (world.getComponent(entity, "Action")) continue;

      var agent = world.getComponent(entity, "GoapAgent");
      if (!agent || !agent.currentPlan) continue;
      if (agent.planStepIndex >= agent.currentPlan.actions.length) continue;

      var currentAction = agent.currentPlan.actions[agent.planStepIndex];
      var pos = world.getComponent(entity, "Position");
      var needs = world.getComponent(entity, "Needs");
      var inventory = world.getComponent(entity, "Inventory");
      if (!pos || !needs || !inventory) continue;

      var done = this.executeAction(world, entity, currentAction, pos, needs, inventory, gameMap, tick);

      if (done) {
        agent.planStepIndex++;
        this.moveTarget = null;
      }
    }
  }

  executeAction(world, entity, action, pos, needs, inventory, gameMap, tick) {
    var name = action.name;

    // ─── Move-to actions ───
    if (name.startsWith("move_to_")) {
      return this.executeMoveToAction(world, entity, name, pos, gameMap);
    }

    // ─── Gather/interact actions ───
    switch (name) {
      case "gather_stick":
        return this.executeGather(world, entity, pos, inventory, FEATURE_STICKS, "sticks", 1);

      case "gather_stone":
        return this.executeGather(world, entity, pos, inventory, FEATURE_ROCK, "stones", 1);

      case "gather_berries":
        return this.executeGatherBerries(world, entity, pos, inventory);

      case "eat_food":
        if (inventory.hasFood) {
          inventory.hasFood = false;
          needs.hunger = Math.min(100, needs.hunger + 30);
          return true;
        }
        return true; // skip if no food (plan invalidated)

      case "craft_axe":
        if (inventory.sticks >= 1 && inventory.stones >= 1) {
          inventory.sticks--;
          inventory.stones--;
          inventory.hasAxe = true;
        }
        return true;

      case "craft_torch":
        if (inventory.sticks >= 1 && inventory.wood >= 1) {
          inventory.sticks--;
          inventory.wood--;
          inventory.hasTorch = true;
        }
        return true;

      case "chop_tree":
        return this.executeChopTree(world, entity, pos, inventory, gameMap);

      case "build_fire":
        return this.executeBuildFire(world, entity, pos, inventory, gameMap);

      case "warm_at_fire":
        needs.warmth = Math.min(100, needs.warmth + 40);
        return true;

      case "flee":
        return this.executeFlee(world, entity, pos, gameMap);

      default:
        return true; // unknown action, skip
    }
  }

  executeMoveToAction(world, entity, name, pos, gameMap) {
    var targetType = name.replace("move_to_", "");
    var featureType = FEATURE_NONE;
    var wantClear = false;

    if (targetType === "tree") featureType = FEATURE_TREE;
    else if (targetType === "rock") featureType = FEATURE_ROCK;
    else if (targetType === "berries") featureType = FEATURE_BERRY;
    else if (targetType === "sticks") featureType = FEATURE_STICKS;
    else if (targetType === "fire") featureType = FEATURE_FIRE;
    else if (targetType === "clear") wantClear = true;

    // Find nearest target if we don't have one or reached the old one
    if (!this.moveTarget) {
      var nearest = findNearestFeaturePosition(gameMap, pos.x, pos.y, featureType, wantClear);
      if (!nearest) return true; // can't find target, skip
      this.moveTarget = nearest;
    }

    // Check if adjacent to the target (for rocks/features that block movement)
    if (Nuglib.isAdjacent(pos.x, pos.y, this.moveTarget.x, this.moveTarget.y)) {
      return true; // arrived adjacent
    }

    // Check if on top of the target (for walkable features)
    if (pos.x === this.moveTarget.x && pos.y === this.moveTarget.y) {
      return true; // arrived
    }

    // Pathfind one step toward target
    var dir = Nuglib.getStepToward(gameMap, pos.x, pos.y, this.moveTarget.x, this.moveTarget.y);
    if (dir) {
      this.queueMove(world, entity, dir);
    } else {
      // Can't reach, give up on this action
      return true;
    }

    return false; // not done yet, still moving
  }

  executeGather(world, entity, pos, inventory, featureType, inventoryKey, amount) {
    // Find adjacent tile with this feature
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = pos.x + dx;
        var ny = pos.y + dy;
        if (getFeatureAt(nx, ny) === featureType) {
          inventory[inventoryKey] += amount;
          // Sticks and berries get consumed; rocks don't
          if (featureType === FEATURE_STICKS) {
            removeFeatureAt(nx, ny);
          }
          // Queue a wait action for the "work" animation
          world.addComponent(entity, "Action", {
            type: "wait",
            energyCost: 50,
          });
          return true;
        }
      }
    }
    return true; // no adjacent feature, skip
  }

  executeGatherBerries(world, entity, pos, inventory) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = pos.x + dx;
        var ny = pos.y + dy;
        if (getFeatureAt(nx, ny) === FEATURE_BERRY) {
          inventory.hasFood = true;
          // Berries respawn, don't remove
          world.addComponent(entity, "Action", {
            type: "wait",
            energyCost: 50,
          });
          return true;
        }
      }
    }
    return true;
  }

  executeChopTree(world, entity, pos, inventory, gameMap) {
    if (!inventory.hasAxe) return true;

    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = pos.x + dx;
        var ny = pos.y + dy;
        if (getFeatureAt(nx, ny) === FEATURE_TREE) {
          inventory.wood += 2;
          removeFeatureAt(nx, ny);
          world.addComponent(entity, "Action", {
            type: "wait",
            energyCost: 100,
          });
          return true;
        }
      }
    }
    return true;
  }

  executeBuildFire(world, entity, pos, inventory, gameMap) {
    if (inventory.wood < 2) return true;

    // Find adjacent clear grass tile
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = pos.x + dx;
        var ny = pos.y + dy;
        if (nx < 0 || nx >= MAP_COLS || ny < 0 || ny >= MAP_ROWS) continue;
        if (gameMap.blocksMovement(nx, ny)) continue;
        if (getFeatureAt(nx, ny) !== FEATURE_NONE) continue;
        if (getTerrainAt(nx, ny) !== TERRAIN_GRASS) continue;

        inventory.wood -= 2;
        setFeatureAt(nx, ny, FEATURE_FIRE);
        addFireSource(nx, ny);
        world.addComponent(entity, "Action", {
          type: "wait",
          energyCost: 100,
        });
        return true;
      }
    }
    return true;
  }

  executeFlee(world, entity, pos, gameMap) {
    // Find nearest threat and move away
    var viewshed = world.getComponent(entity, "Viewshed");
    if (!viewshed) return true;

    var nearestThreat = null;
    var nearestDist = Infinity;

    for (var threat of world.query(["AIControlled", "Position", "CombatStats"])) {
      var tpos = world.getComponent(threat, "Position");
      if (!tpos) continue;
      var tk = tpos.x + "," + tpos.y;
      if (!viewshed.visibleCells.has(tk)) continue;

      var dist = Nuglib.distance(pos.x, pos.y, tpos.x, tpos.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestThreat = tpos;
      }
    }

    if (nearestThreat) {
      var fdx = Math.sign(pos.x - nearestThreat.x);
      var fdy = Math.sign(pos.y - nearestThreat.y);
      if (fdx === 0 && fdy === 0) fdx = 1;

      var tx = pos.x + fdx;
      var ty = pos.y + fdy;
      if (gameMap.isInBounds(tx, ty) && !gameMap.blocksMovement(tx, ty)) {
        this.queueMove(world, entity, { dx: fdx, dy: fdy });
        return false; // keep fleeing until threat gone
      }
    }

    return true; // no threat or can't move
  }

  queueMove(world, entity, direction) {
    var energy = world.getComponent(entity, "Energy");
    var moveCost = energy && energy.moveCost ? energy.moveCost : 100;
    world.addComponent(entity, "Action", {
      type: "move",
      direction: direction,
      energyCost: moveCost,
    });
  }
};

// ─── MonsterAISystem ───────────────────────────────────────────────────────

var MonsterAISystem = class {
  constructor() {
    this.phase = "early";
    this.destinations = new Map();
  }

  run(world) {
    var clock = world.getResource("GameClock");
    if (clock && clock.paused) return;

    var gameMap = world.getResource("map");
    if (!gameMap) return;

    var blockedPositions = this.getBlockedPositions(world);

    for (var entity of world.query(["AIControlled", "Position", "Energy"])) {
      if (world.getComponent(entity, "Action")) continue;

      var pos = world.getComponent(entity, "Position");
      if (!pos) continue;

      // Check if agent is visible
      var viewshed = world.getComponent(entity, "Viewshed");
      var agentVisible = false;
      var agentPos = null;

      // Find agent entity
      for (var a of world.query(["GoapAgent", "Position"])) {
        var ap = world.getComponent(a, "Position");
        if (!ap) continue;
        agentPos = ap;
        if (viewshed && viewshed.visibleCells.has(ap.x + "," + ap.y)) {
          agentVisible = true;
        }
        break;
      }

      // Monsters avoid lit tiles (light > 0.5)
      if (agentVisible && agentPos) {
        // Hunt agent
        if (Nuglib.isAdjacent(pos.x, pos.y, agentPos.x, agentPos.y)) {
          // Attack
          for (var a2 of world.query(["GoapAgent"])) {
            world.addComponent(entity, "Action", {
              type: "melee_attack",
              target: a2,
              energyCost: this.getAttackCost(world, entity),
            });
            break;
          }
        } else {
          var dir = Nuglib.getStepToward(
            gameMap, pos.x, pos.y, agentPos.x, agentPos.y,
            {
              isBlocked: function (x, y) {
                if (x === pos.x && y === pos.y) return false;
                if (x === agentPos.x && y === agentPos.y) return false;
                if (blockedPositions.has(x + "," + y)) return true;
                // Avoid lit tiles
                if (getLightAt(x, y) > 0.5) return true;
                return false;
              },
            }
          );
          if (dir) {
            this.queueMove(world, entity, dir);
          }
        }
      } else {
        // Wander in dark areas
        this.doWander(world, entity, pos, gameMap, blockedPositions);
      }
    }
  }

  doWander(world, entity, pos, gameMap, blockedPositions) {
    var dest = this.destinations.get(entity);

    if (!dest || (pos.x === dest.x && pos.y === dest.y)) {
      dest = this.pickDarkTile(gameMap);
      if (!dest) return;
      this.destinations.set(entity, dest);
    }

    var dir = Nuglib.getStepToward(
      gameMap, pos.x, pos.y, dest.x, dest.y,
      {
        isBlocked: function (x, y) {
          if (x === pos.x && y === pos.y) return false;
          if (blockedPositions.has(x + "," + y)) return true;
          if (getLightAt(x, y) > 0.5) return true;
          return false;
        },
      }
    );

    if (dir) {
      this.queueMove(world, entity, dir);
    } else {
      this.destinations.delete(entity);
    }
  }

  pickDarkTile(gameMap) {
    for (var i = 0; i < 50; i++) {
      var x = rng.nextRange(0, MAP_COLS);
      var y = rng.nextRange(0, MAP_ROWS);
      if (!gameMap.blocksMovement(x, y) && getLightAt(x, y) < 0.3) {
        return { x: x, y: y };
      }
    }
    return null;
  }

  getBlockedPositions(world) {
    var blocked = new Set();
    for (var entity of world.query(["Position", "BlocksMovement"])) {
      var pos = world.getComponent(entity, "Position");
      if (pos) blocked.add(pos.x + "," + pos.y);
    }
    return blocked;
  }

  queueMove(world, entity, direction) {
    world.addComponent(entity, "Action", {
      type: "move",
      direction: direction,
      energyCost: this.getMoveCost(world, entity),
    });
  }

  getMoveCost(world, entity) {
    var energy = world.getComponent(entity, "Energy");
    return energy && energy.moveCost ? energy.moveCost : 100;
  }

  getAttackCost(world, entity) {
    var energy = world.getComponent(entity, "Energy");
    return energy && energy.attackCost ? energy.attackCost : 100;
  }

  clearAllDestinations() {
    this.destinations.clear();
  }
};

// ─── Monster Templates ─────────────────────────────────────────────────────

var ZOMBIE_TEMPLATE = {
  name: "Zombie",
  glyph: "Z",
  fg: [46, 139, 87],
  maxHp: 15,
  attack: 3,
  defense: 2,
  speed: 0.6,
  fovRange: 6,
  moveCost: 150,
  attackCost: 120,
};

var SKELETON_TEMPLATE = {
  name: "Skeleton",
  glyph: "S",
  fg: [255, 255, 255],
  maxHp: 5,
  attack: 4,
  defense: 0,
  speed: 1.2,
  fovRange: 6,
  moveCost: 80,
  attackCost: 80,
};

// ─── Setup ─────────────────────────────────────────────────────────────────

function setup() {
  var cnv = createCanvas(CANVAS_W, CANVAS_H);
  cnv.parent(select("#sketch-container"));
  textFont("monospace");
  noStroke();

  // Grab DOM elements
  playBtn = select("#play-btn");
  stepBtn = select("#step-btn");
  regenBtn = select("#regen-btn");
  foresightBtn = select("#foresight-btn");
  foresightLabel = select("#foresight-label");
  speedSlider = select("#speed-slider");
  speedValue = select("#speed-value");
  statTicks = select("#stat-ticks");
  statDeaths = select("#stat-deaths");
  statPlans = select("#stat-plans");
  statGoal = select("#stat-goal");
  statAction = select("#stat-action");

  // Bind events
  playBtn.mousePressed(function () {
    playing = !playing;
    playBtn.html(playing ? "Pause" : "Play");
  });

  stepBtn.mousePressed(function () {
    doTick();
  });

  regenBtn.mousePressed(function () {
    regenerateWorld();
  });

  foresightBtn.mousePressed(function () {
    foresightMode = !foresightMode;
    foresightBtn.html(foresightMode ? "Proactive" : "Reactive");
    foresightLabel.html(
      foresightMode
        ? "Agent plans ahead for future needs"
        : "Agent only reacts to current needs"
    );
    // Trigger immediate replan
    for (var entity of world.query(["GoapAgent"])) {
      var agent = world.getComponent(entity, "GoapAgent");
      if (agent) {
        agent.needsReplan = true;
        agent.currentGoal = null;
      }
    }
  });

  speedSlider.input(function () {
    playSpeed = parseInt(speedSlider.value());
    speedValue.html(String(playSpeed));
  });

  // Initialize
  initRendering();
  regenerateWorld();
}

// ─── World Generation ──────────────────────────────────────────────────────

function regenerateWorld() {
  rng = Nuglib.xoroshiro128plus(BigInt(Date.now()));

  // Generate map
  map = generateWildernessMap(rng);

  // Init lighting
  initLighting();

  // Create ECS world
  world = Nuglib.createWorld();
  world.addResource("GameClock", Nuglib.createGameClock());
  world.addResource("map", map);
  world.addResource("SurvivalStats", {
    aliveTicks: 0,
    deaths: deathCount,
    replans: replanCount,
  });

  // Create systems
  var movementSystem = new Nuglib.MovementSystem(map);
  var actionExecutionSystem = new Nuglib.ActionExecutionSystem(movementSystem);
  var energyRegenSystem = new Nuglib.EnergyRegenerationSystem();
  var viewshedSystem = new Nuglib.ViewshedSystem(map);
  var needDecaySystem = new NeedDecaySystem();
  var goalSelectionSystem = new GoalSelectionSystem();
  var goapPlanningSystem = new GoapPlanningSystem();
  var planExecutionSystem = new PlanExecutionSystem();
  var monsterAISystem = new MonsterAISystem();

  // Add systems in phase order
  world.addSystem(needDecaySystem);
  world.addSystem(goalSelectionSystem);
  world.addSystem(goapPlanningSystem);
  world.addSystem(planExecutionSystem);
  world.addSystem(monsterAISystem);
  world.addSystem(energyRegenSystem);
  world.addSystem(actionExecutionSystem);
  world.addSystem(movementSystem);
  world.addSystem(viewshedSystem);

  // Spawn agent
  var spawnPos = findSpawnPosition(map, rng);
  agentEntity = world.createEntity();

  world.addComponent(agentEntity, "Position", { x: spawnPos.x, y: spawnPos.y });
  world.addComponent(agentEntity, "Glyph", {
    glyph: "@",
    fg: [255, 255, 255],
    bg: [0, 0, 0],
  });
  world.addComponent(agentEntity, "BlocksMovement", {});
  world.addComponent(agentEntity, "Energy", {
    current: 100,
    max: 100,
    regenRate: 50,
    moveCost: 100,
    attackCost: 100,
  });
  world.addComponent(agentEntity, "CombatStats", {
    hp: 10,
    maxHp: 10,
    attack: 3,
    defense: 1,
  });
  world.addComponent(agentEntity, "Viewshed", {
    range: 8,
    algorithm: "shadowcasting",
    visibleCells: new Set(),
    dirty: true,
  });
  world.addComponent(agentEntity, "Memory", {
    exploredCells: new Set(),
  });
  world.addComponent(agentEntity, "Needs", {
    hunger: 100,
    warmth: 100,
    health: 100,
  });
  world.addComponent(agentEntity, "Inventory", {
    sticks: 0,
    stones: 0,
    wood: 0,
    hasAxe: false,
    hasTorch: false,
    hasFood: false,
  });

  // Initialize GOAP agent
  var initialActions = buildGoapActions(map, spawnPos.x, spawnPos.y);
  world.addComponent(agentEntity, "GoapAgent", {
    planner: Nuglib.createPlanner(initialActions),
    currentGoal: null,
    currentPlan: null,
    planStepIndex: 0,
    needsReplan: true,
  });

  aliveTicks = 0;
  updateDOMStats();
}

// ─── Monster Spawning ──────────────────────────────────────────────────────

var lastMonsterSpawn = 0;

function spawnNightMonsters(tick) {
  if (!isNight(tick)) return;
  if (tick - lastMonsterSpawn < 10) return;
  lastMonsterSpawn = tick;

  // Count existing monsters
  var monsterCount = 0;
  for (var e of world.query(["AIControlled"])) {
    monsterCount++;
  }
  if (monsterCount >= 5) return; // cap at 5

  // Find a dark tile outside agent FOV
  var viewshed = world.getComponent(agentEntity, "Viewshed");
  for (var attempt = 0; attempt < 30; attempt++) {
    var x = rng.nextRange(1, MAP_COLS - 1);
    var y = rng.nextRange(1, MAP_ROWS - 1);

    if (map.blocksMovement(x, y)) continue;
    if (getLightAt(x, y) > 0.2) continue;
    if (getFeatureAt(x, y) !== FEATURE_NONE) continue;
    if (viewshed && viewshed.visibleCells.has(x + "," + y)) continue;

    var template = rng.nextFloat() < 0.5 ? ZOMBIE_TEMPLATE : SKELETON_TEMPLATE;
    var monster = world.createEntity();

    world.addComponent(monster, "Position", { x: x, y: y });
    world.addComponent(monster, "Glyph", {
      glyph: template.glyph,
      fg: template.fg,
      bg: [0, 0, 0],
    });
    world.addComponent(monster, "AIControlled", { state: "wandering" });
    world.addComponent(monster, "BlocksMovement", {});
    world.addComponent(monster, "CombatStats", {
      hp: template.maxHp,
      maxHp: template.maxHp,
      attack: template.attack,
      defense: template.defense,
    });
    world.addComponent(monster, "Energy", {
      current: 0,
      max: Math.max(100, template.moveCost, template.attackCost),
      regenRate: 50,
      moveCost: template.moveCost,
      attackCost: template.attackCost,
    });
    world.addComponent(monster, "Viewshed", {
      range: template.fovRange,
      algorithm: "shadowcasting",
      visibleCells: new Set(),
      dirty: true,
    });
    world.addComponent(monster, "Name", { name: template.name });

    break;
  }
}

function despawnMonstersAtDawn(tick) {
  if (!isDawn(tick)) return;

  var toDestroy = [];
  for (var entity of world.query(["AIControlled", "Position"])) {
    toDestroy.push(entity);
  }
  for (var i = 0; i < toDestroy.length; i++) {
    world.destroyEntity(toDestroy[i]);
  }
}

// ─── Tick ──────────────────────────────────────────────────────────────────

function doTick() {
  var clock = world.getResource("GameClock");
  var tick = clock ? clock.tick : 0;

  // Update agent viewshed range based on time + torch
  var inventory = world.getComponent(agentEntity, "Inventory");
  var viewshed = world.getComponent(agentEntity, "Viewshed");
  if (viewshed && inventory) {
    if (isNight(tick) && !inventory.hasTorch) {
      viewshed.range = 3;
    } else {
      viewshed.range = 8;
    }
  }

  // Handle combat damage to agent health
  var combatStats = world.getComponent(agentEntity, "CombatStats");
  var agentNeeds = world.getComponent(agentEntity, "Needs");
  if (combatStats && agentNeeds) {
    agentNeeds.health = Math.floor((combatStats.hp / combatStats.maxHp) * 100);
  }

  // Calculate lighting
  var agentPos = world.getComponent(agentEntity, "Position");
  if (agentPos) {
    calculateLighting(tick, agentPos.x, agentPos.y, inventory && inventory.hasTorch);
  }

  // Monster spawning/despawning
  spawnNightMonsters(tick);
  despawnMonstersAtDawn(tick);

  // Run ECS tick
  world.tick();

  // Check for agent death
  var dead = world.getComponent(agentEntity, "Dead");
  if (dead) {
    deathCount++;
    replanCount = 0;
    regenerateWorld();
    return;
  }

  // Increment clock
  if (clock) {
    clock.tick++;
  }

  aliveTicks++;
  var stats = world.getResource("SurvivalStats");
  if (stats) {
    stats.aliveTicks = aliveTicks;
    stats.deaths = deathCount;
  }

  updateDOMStats();
}

// ─── Stats ─────────────────────────────────────────────────────────────────

function updateDOMStats() {
  if (!statTicks) return;

  statTicks.html(String(aliveTicks));
  statDeaths.html(String(deathCount));
  statPlans.html(String(replanCount));

  var agent = world.getComponent(agentEntity, "GoapAgent");
  if (agent && agent.currentGoal) {
    var label = getGoalLabel(agent.currentGoal);
    statGoal.html(label);
  } else {
    statGoal.html("none");
  }

  if (agent && agent.currentPlan && agent.planStepIndex < agent.currentPlan.actions.length) {
    statAction.html(agent.currentPlan.actions[agent.planStepIndex].name);
  } else {
    statAction.html("idle");
  }
}

// ─── Draw ──────────────────────────────────────────────────────────────────

function draw() {
  if (playing) {
    var now = millis();
    var interval = 1000 / playSpeed;
    if (now - lastTickTime >= interval) {
      doTick();
      lastTickTime = now;
    }
  }

  background(0);

  var clock = world.getResource("GameClock");
  var tick = clock ? clock.tick : 0;

  // Render map layer
  renderMap(world, map, agentEntity, tick);
  var mapLayer = layerManager.getLayer("map");
  image(mapLayer, 0, 0);

  // Render panel directly to main canvas
  renderPanel(world, agentEntity, tick);
}
```

---

## Task 11: Pin nuglib + smoke test

### Steps

- [ ] **11.1** Copy `static/libraries/nuglib.min.js` to `content/goap-survival/nuglib.min.js`

```bash
cp /Users/nathan/Projects/bitterbridge/p5js-sketches/static/libraries/nuglib.min.js /Users/nathan/Projects/bitterbridge/p5js-sketches/content/goap-survival/nuglib.min.js
```

- [ ] **11.2** Verify the sketch loads without errors

```bash
cd /Users/nathan/Projects/bitterbridge/p5js-sketches && hugo server &
# Open http://localhost:1313/goap-survival/ in browser
# Verify: canvas renders, map visible, agent spawns, panel shows GOAP inspector
# Verify: play/pause/step controls work
# Verify: foresight toggle switches between Proactive/Reactive
# Verify: agent moves and executes plans (watch plan inspector)
# Verify: night cycle triggers monster spawning
# Verify: agent eventually dies and world regenerates
```

- [ ] **11.3** Commit the sketch

```bash
git add content/goap-survival/
git commit -m "Add GOAP survival sketch: educational single-agent survival with plan inspector, day/night, foresight toggle"
```

---

## File Summary

### Nuglib files (committed in Task 3)
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/src/goap/types.ts` -- GoapState, GoapAction, GoapGoal, GoapPlan, helpers
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/src/goap/planner.ts` -- createPlanner, plan, validatePlan
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/src/goap/index.ts` -- re-exports
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/src/index.ts` -- add `export * from './goap'`
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/tests/goap-types.test.js` -- type helper tests
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/tests/goap-planner.test.js` -- planner tests

### Sketch files (committed in Task 11)
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/content/goap-survival/index.md` -- Hugo frontmatter + controls
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/content/goap-survival/actions.js` -- GOAP action definitions + move_to builders
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/content/goap-survival/world-state.js` -- World state snapshot builder
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/content/goap-survival/needs.js` -- NeedDecaySystem, GoalSelectionSystem, foresight
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/content/goap-survival/map-gen.js` -- Wilderness map generator
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/content/goap-survival/lighting.js` -- Day/night cycle, per-tile light
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/content/goap-survival/rendering.js` -- Map rendering, plan inspector panel
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/content/goap-survival/main.js` -- Setup, draw, ECS wiring, controls, monsters
- `/Users/nathan/Projects/bitterbridge/p5js-sketches/content/goap-survival/nuglib.min.js` -- Pinned nuglib build
