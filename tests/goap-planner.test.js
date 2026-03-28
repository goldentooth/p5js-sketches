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
      const names = result.actions.map(a => a.name);
      expect(names).toContain('craft_axe');
      expect(names).toContain('gather_stick');
      expect(names).toContain('gather_stone');
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
      expect(names).toContain('warm_at_fire');
      expect(names).toContain('build_fire');
      expect(names).toContain('chop_tree');
      expect(names).toContain('craft_axe');
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

      expect(validatePlan(planner, currentState, existingPlan)).toBe(true);
    });
  });
});
