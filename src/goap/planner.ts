// src/goap/planner.ts

import type { GoapState, GoapAction, GoapGoal, GoapPlan, GoapPlanner } from './types';

/**
 * Create a planner instance with the given action set.
 */
export function createPlanner(actions: GoapAction[]): GoapPlanner {
  return { actions: [...actions] };
}

/**
 * Check if a precondition is met by the current state.
 * - Boolean preconditions: exact match
 * - Numeric preconditions: current value must be >= required value
 */
function preconditionMet(
  state: GoapState,
  key: string,
  required: number | boolean
): boolean {
  const current = state.get(key);
  if (current === undefined) return false;

  if (typeof required === 'boolean') {
    return current === required;
  }
  // Numeric: current must be >= required
  if (typeof current === 'number' && typeof required === 'number') {
    return current >= required;
  }
  return false;
}

/**
 * Check if an action is relevant to satisfying an unsatisfied condition.
 * An action is relevant if any of its effects help satisfy the condition.
 */
function actionRelevant(
  action: GoapAction,
  key: string,
  goalValue: number | boolean
): boolean {
  const effect = action.effects.get(key);
  if (effect === undefined) return false;

  if (typeof goalValue === 'boolean') {
    return effect === goalValue;
  }
  // For numeric goals, any positive delta helps if we need more
  if (typeof effect === 'number' && typeof goalValue === 'number') {
    return effect > 0;
  }
  return false;
}

/**
 * Apply an action's effects in reverse (regressive search).
 * This adds the action's preconditions as new requirements
 * and removes/adjusts satisfied conditions.
 */
function applyActionRegressive(
  unsatisfied: GoapState,
  action: GoapAction,
  currentState: GoapState
): GoapState {
  const newUnsatisfied = new Map(unsatisfied);

  // Remove conditions that this action's effects satisfy
  for (const [key, effect] of action.effects) {
    const goalVal = newUnsatisfied.get(key);
    if (goalVal === undefined) continue;

    if (typeof goalVal === 'boolean' && effect === goalVal) {
      newUnsatisfied.delete(key);
    } else if (typeof goalVal === 'number' && typeof effect === 'number') {
      const remaining = goalVal - effect;
      if (remaining <= 0) {
        newUnsatisfied.delete(key);
      } else {
        // Still need more -- but check if current state already has some
        const currentVal = typeof currentState.get(key) === 'number'
          ? (currentState.get(key) as number) : 0;
        if (currentVal >= remaining) {
          newUnsatisfied.delete(key);
        } else {
          newUnsatisfied.set(key, remaining);
        }
      }
    }
  }

  // Add this action's preconditions as new unsatisfied conditions
  // (unless already satisfied by current state)
  for (const [key, required] of action.preconditions) {
    if (preconditionMet(currentState, key, required)) continue;
    // Don't overwrite a harder requirement
    const existing = newUnsatisfied.get(key);
    if (existing !== undefined) {
      if (typeof existing === 'number' && typeof required === 'number') {
        newUnsatisfied.set(key, Math.max(existing, required));
      }
      // If existing is boolean and matches, skip
      continue;
    }
    newUnsatisfied.set(key, required);
  }

  return newUnsatisfied;
}

/**
 * Heuristic: count of unsatisfied conditions.
 */
function heuristic(unsatisfied: GoapState): number {
  return unsatisfied.size;
}

/**
 * Create a string key for a state (for visited set).
 */
function stateKey(unsatisfied: GoapState): string {
  const entries: string[] = [];
  for (const [k, v] of unsatisfied) {
    entries.push(`${k}:${v}`);
  }
  entries.sort();
  return entries.join('|');
}

interface SearchNode {
  unsatisfied: GoapState;
  actions: GoapAction[];
  gCost: number;
  fCost: number;
}

/**
 * Find a plan to achieve the given goal from the current state.
 * Returns a GoapPlan or null if no plan exists.
 *
 * Uses regressive A*: starts from the goal, works backward through actions
 * until all preconditions are satisfied by the current state.
 */
export function plan(
  planner: GoapPlanner,
  currentState: GoapState,
  goal: GoapGoal,
  maxNodes: number = 1000
): GoapPlan | null {
  // Build initial unsatisfied set from goal
  const initialUnsatisfied: GoapState = new Map();
  for (const [key, goalValue] of goal.state) {
    if (!preconditionMet(currentState, key, goalValue)) {
      initialUnsatisfied.set(key, goalValue);
    }
  }

  // Goal already satisfied
  if (initialUnsatisfied.size === 0) {
    return { actions: [], goal };
  }

  const open: SearchNode[] = [{
    unsatisfied: initialUnsatisfied,
    actions: [],
    gCost: 0,
    fCost: heuristic(initialUnsatisfied),
  }];

  const visited = new Set<string>();
  visited.add(stateKey(initialUnsatisfied));

  let nodesExpanded = 0;

  while (open.length > 0 && nodesExpanded < maxNodes) {
    // Find lowest fCost node
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].fCost < open[bestIdx].fCost) {
        bestIdx = i;
      }
    }
    const current = open.splice(bestIdx, 1)[0];
    nodesExpanded++;

    // Try each action
    for (const action of planner.actions) {
      // Check if this action is relevant (helps satisfy any unsatisfied condition)
      let relevant = false;
      for (const [key, value] of current.unsatisfied) {
        if (actionRelevant(action, key, value)) {
          relevant = true;
          break;
        }
      }
      if (!relevant) continue;

      // Apply action regressively
      const newUnsatisfied = applyActionRegressive(
        current.unsatisfied,
        action,
        currentState
      );

      const key = stateKey(newUnsatisfied);
      if (visited.has(key)) continue;
      visited.add(key);

      const newActions = [action, ...current.actions];
      const gCost = current.gCost + action.cost;

      // If all conditions satisfied, we found a plan
      if (newUnsatisfied.size === 0) {
        return { actions: newActions, goal };
      }

      open.push({
        unsatisfied: newUnsatisfied,
        actions: newActions,
        gCost,
        fCost: gCost + heuristic(newUnsatisfied),
      });
    }
  }

  return null; // No plan found
}

/**
 * Validate that an existing plan is still executable given the current state.
 * Simulates forward through the plan, checking preconditions at each step.
 */
export function validatePlan(
  _planner: GoapPlanner,
  currentState: GoapState,
  existingPlan: GoapPlan
): boolean {
  if (existingPlan.actions.length === 0) return true;

  const simState = new Map(currentState);

  for (const action of existingPlan.actions) {
    // Check all preconditions
    for (const [key, required] of action.preconditions) {
      if (!preconditionMet(simState, key, required)) {
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
