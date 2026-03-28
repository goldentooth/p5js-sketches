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

    it('should create an empty Map from empty object', () => {
      const state = createState({});
      expect(state.size).toBe(0);
    });

    it('should handle mixed number and boolean values', () => {
      const state = createState({
        wood_count: 5,
        is_night: false,
        near_fire: true,
        warmth: 0,
      });
      expect(state.get('wood_count')).toBe(5);
      expect(state.get('is_night')).toBe(false);
      expect(state.get('near_fire')).toBe(true);
      expect(state.get('warmth')).toBe(0);
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

    it('should create an action with custom cost', () => {
      const action = createAction({
        name: 'chop_tree',
        preconditions: { has_axe: true, near_tree: true },
        effects: { wood_count: 2 },
        cost: 3,
      });

      expect(action.cost).toBe(3);
      expect(action.preconditions.size).toBe(2);
    });

    it('should handle empty preconditions', () => {
      const action = createAction({
        name: 'move_to_tree',
        preconditions: {},
        effects: { near_tree: true },
        cost: 5,
      });

      expect(action.preconditions.size).toBe(0);
    });
  });

  describe('createGoal', () => {
    it('should create a goal with default priority', () => {
      const goal = createGoal({
        state: { hunger: 100 },
      });

      expect(goal.state.get('hunger')).toBe(100);
      expect(goal.priority).toBe(0);
    });

    it('should create a goal with custom priority', () => {
      const goal = createGoal({
        state: { threat_visible: false },
        priority: 100,
      });

      expect(goal.state.get('threat_visible')).toBe(false);
      expect(goal.priority).toBe(100);
    });

    it('should handle multi-key goals', () => {
      const goal = createGoal({
        state: { hunger: 80, warmth: 60 },
        priority: 50,
      });

      expect(goal.state.size).toBe(2);
    });
  });
});
