import { describe, it, expect } from 'vitest';
import {
  Cardinal,
  Diagonal,
  CARDINAL_DIRECTIONS,
  DIAGONAL_DIRECTIONS,
  ALL_DIRECTIONS,
  applyDirection,
  oppositeDirection,
  isCardinal,
  isDiagonal,
  randomCardinalDirection,
  randomDirection,
  randomStep,
  randomCardinalStep,
  biasedRandomStep,
  xoroshiro128plus,
} from '../src';

describe('Direction constants', () => {
  describe('Cardinal directions', () => {
    it('should define NORTH correctly', () => {
      expect(Cardinal.NORTH).toEqual({ dx: 0, dy: -1 });
    });

    it('should define SOUTH correctly', () => {
      expect(Cardinal.SOUTH).toEqual({ dx: 0, dy: 1 });
    });

    it('should define EAST correctly', () => {
      expect(Cardinal.EAST).toEqual({ dx: 1, dy: 0 });
    });

    it('should define WEST correctly', () => {
      expect(Cardinal.WEST).toEqual({ dx: -1, dy: 0 });
    });
  });

  describe('Diagonal directions', () => {
    it('should define NORTHEAST correctly', () => {
      expect(Diagonal.NORTHEAST).toEqual({ dx: 1, dy: -1 });
    });

    it('should define NORTHWEST correctly', () => {
      expect(Diagonal.NORTHWEST).toEqual({ dx: -1, dy: -1 });
    });

    it('should define SOUTHEAST correctly', () => {
      expect(Diagonal.SOUTHEAST).toEqual({ dx: 1, dy: 1 });
    });

    it('should define SOUTHWEST correctly', () => {
      expect(Diagonal.SOUTHWEST).toEqual({ dx: -1, dy: 1 });
    });
  });

  describe('Direction arrays', () => {
    it('should contain 4 cardinal directions', () => {
      expect(CARDINAL_DIRECTIONS).toHaveLength(4);
    });

    it('should contain 4 diagonal directions', () => {
      expect(DIAGONAL_DIRECTIONS).toHaveLength(4);
    });

    it('should contain 8 directions total', () => {
      expect(ALL_DIRECTIONS).toHaveLength(8);
    });

    it('should include all cardinals in ALL_DIRECTIONS', () => {
      CARDINAL_DIRECTIONS.forEach(dir => {
        expect(ALL_DIRECTIONS).toContainEqual(dir);
      });
    });

    it('should include all diagonals in ALL_DIRECTIONS', () => {
      DIAGONAL_DIRECTIONS.forEach(dir => {
        expect(ALL_DIRECTIONS).toContainEqual(dir);
      });
    });
  });
});

describe('applyDirection', () => {
  it('should move north correctly', () => {
    const result = applyDirection(5, 5, Cardinal.NORTH);
    expect(result).toEqual({ x: 5, y: 4 });
  });

  it('should move south correctly', () => {
    const result = applyDirection(5, 5, Cardinal.SOUTH);
    expect(result).toEqual({ x: 5, y: 6 });
  });

  it('should move east correctly', () => {
    const result = applyDirection(5, 5, Cardinal.EAST);
    expect(result).toEqual({ x: 6, y: 5 });
  });

  it('should move west correctly', () => {
    const result = applyDirection(5, 5, Cardinal.WEST);
    expect(result).toEqual({ x: 4, y: 5 });
  });

  it('should move diagonally northeast', () => {
    const result = applyDirection(5, 5, Diagonal.NORTHEAST);
    expect(result).toEqual({ x: 6, y: 4 });
  });

  it('should move diagonally southwest', () => {
    const result = applyDirection(5, 5, Diagonal.SOUTHWEST);
    expect(result).toEqual({ x: 4, y: 6 });
  });

  it('should handle custom directions', () => {
    const result = applyDirection(10, 20, { dx: 3, dy: -2 });
    expect(result).toEqual({ x: 13, y: 18 });
  });
});

describe('oppositeDirection', () => {
  it('should return opposite of NORTH', () => {
    const opposite = oppositeDirection(Cardinal.NORTH);
    // NORTH is (0, -1), opposite should be (0, 1)
    expect(Math.abs(opposite.dx)).toBe(0);
    expect(opposite.dy).toBe(1);
  });

  it('should return opposite of EAST', () => {
    const opposite = oppositeDirection(Cardinal.EAST);
    // EAST is (1, 0), opposite should be (-1, 0)
    expect(opposite.dx).toBe(-1);
    expect(Math.abs(opposite.dy)).toBe(0);
  });

  it('should return opposite of NORTHEAST', () => {
    const opposite = oppositeDirection(Diagonal.NORTHEAST);
    expect(opposite).toEqual({ dx: -1, dy: 1 });
  });

  it('should handle custom directions', () => {
    const opposite = oppositeDirection({ dx: 3, dy: -2 });
    expect(opposite).toEqual({ dx: -3, dy: 2 });
  });

  it('should be reversible', () => {
    const original = Cardinal.WEST;
    const opposite = oppositeDirection(original);
    const back = oppositeDirection(opposite);
    expect(back).toEqual(original);
  });
});

describe('isCardinal', () => {
  it('should return true for NORTH', () => {
    expect(isCardinal(Cardinal.NORTH)).toBe(true);
  });

  it('should return true for all cardinal directions', () => {
    CARDINAL_DIRECTIONS.forEach(dir => {
      expect(isCardinal(dir)).toBe(true);
    });
  });

  it('should return false for diagonal directions', () => {
    DIAGONAL_DIRECTIONS.forEach(dir => {
      expect(isCardinal(dir)).toBe(false);
    });
  });

  it('should return true when only dx is 0', () => {
    expect(isCardinal({ dx: 0, dy: 5 })).toBe(true);
  });

  it('should return true when only dy is 0', () => {
    expect(isCardinal({ dx: 5, dy: 0 })).toBe(true);
  });
});

describe('isDiagonal', () => {
  it('should return false for cardinal directions', () => {
    CARDINAL_DIRECTIONS.forEach(dir => {
      expect(isDiagonal(dir)).toBe(false);
    });
  });

  it('should return true for all diagonal directions', () => {
    DIAGONAL_DIRECTIONS.forEach(dir => {
      expect(isDiagonal(dir)).toBe(true);
    });
  });

  it('should return true when both dx and dy are non-zero', () => {
    expect(isDiagonal({ dx: 1, dy: 1 })).toBe(true);
    expect(isDiagonal({ dx: -2, dy: 3 })).toBe(true);
  });

  it('should return false when either dx or dy is 0', () => {
    expect(isDiagonal({ dx: 0, dy: 5 })).toBe(false);
    expect(isDiagonal({ dx: 5, dy: 0 })).toBe(false);
  });
});

describe('randomCardinalDirection', () => {
  it('should return a cardinal direction without RNG', () => {
    const dir = randomCardinalDirection();
    expect(CARDINAL_DIRECTIONS).toContainEqual(dir);
  });

  it('should return a cardinal direction with RNG', () => {
    const rng = xoroshiro128plus(42n);
    const dir = randomCardinalDirection(rng);
    expect(CARDINAL_DIRECTIONS).toContainEqual(dir);
  });

  it('should produce different directions with RNG', () => {
    const rng = xoroshiro128plus(42n);
    const directions = new Set();
    for (let i = 0; i < 20; i++) {
      const dir = randomCardinalDirection(rng);
      directions.add(JSON.stringify(dir));
    }
    expect(directions.size).toBeGreaterThan(1);
  });

  it('should be deterministic with same seed', () => {
    const rng1 = xoroshiro128plus(123n);
    const rng2 = xoroshiro128plus(123n);
    const dir1 = randomCardinalDirection(rng1);
    const dir2 = randomCardinalDirection(rng2);
    expect(dir1).toEqual(dir2);
  });
});

describe('randomDirection', () => {
  it('should return a valid direction without RNG', () => {
    const dir = randomDirection();
    expect(ALL_DIRECTIONS).toContainEqual(dir);
  });

  it('should return a valid direction with RNG', () => {
    const rng = xoroshiro128plus(42n);
    const dir = randomDirection(rng);
    expect(ALL_DIRECTIONS).toContainEqual(dir);
  });

  it('should produce different directions with RNG', () => {
    const rng = xoroshiro128plus(42n);
    const directions = new Set();
    for (let i = 0; i < 40; i++) {
      const dir = randomDirection(rng);
      directions.add(JSON.stringify(dir));
    }
    expect(directions.size).toBeGreaterThan(4);
  });
});

describe('randomStep', () => {
  it('should return step with valid range', () => {
    const rng = xoroshiro128plus(42n);
    for (let i = 0; i < 100; i++) {
      const step = randomStep(rng);
      expect(step.dx).toBeGreaterThanOrEqual(-1);
      expect(step.dx).toBeLessThanOrEqual(1);
      expect(step.dy).toBeGreaterThanOrEqual(-1);
      expect(step.dy).toBeLessThanOrEqual(1);
    }
  });

  it('should allow staying still by default', () => {
    const rng = xoroshiro128plus(42n);
    let foundStill = false;
    for (let i = 0; i < 100; i++) {
      const step = randomStep(rng);
      if (step.dx === 0 && step.dy === 0) {
        foundStill = true;
        break;
      }
    }
    expect(foundStill).toBe(true);
  });

  it('should not stay still when canStayStill is false', () => {
    const rng = xoroshiro128plus(42n);
    for (let i = 0; i < 100; i++) {
      const step = randomStep(rng, false);
      expect(step.dx !== 0 || step.dy !== 0).toBe(true);
    }
  });
});

describe('randomCardinalStep', () => {
  it('should return a cardinal direction', () => {
    const rng = xoroshiro128plus(42n);
    for (let i = 0; i < 20; i++) {
      const step = randomCardinalStep(rng);
      expect(isCardinal(step)).toBe(true);
    }
  });

  it('should return directions from CARDINAL_DIRECTIONS', () => {
    const rng = xoroshiro128plus(42n);
    for (let i = 0; i < 20; i++) {
      const step = randomCardinalStep(rng);
      expect(CARDINAL_DIRECTIONS).toContainEqual(step);
    }
  });
});

describe('biasedRandomStep', () => {
  it('should tend toward target with high bias', () => {
    const rng = xoroshiro128plus(42n);
    let correctSteps = 0;
    for (let i = 0; i < 100; i++) {
      const step = biasedRandomStep(0, 0, 10, 10, 0.9, rng);
      if (step.dx > 0 && step.dy > 0) {
        correctSteps++;
      }
    }
    // With 90% bias toward target, should be mostly correct
    expect(correctSteps).toBeGreaterThan(70);
  });

  it('should be mostly random with low bias', () => {
    const rng = xoroshiro128plus(42n);
    const steps = new Set();
    for (let i = 0; i < 100; i++) {
      const step = biasedRandomStep(0, 0, 10, 10, 0.1, rng);
      steps.add(JSON.stringify(step));
    }
    // With low bias, should see variety (at least 3-4 different steps)
    expect(steps.size).toBeGreaterThanOrEqual(3);
  });

  it('should return valid step values', () => {
    const rng = xoroshiro128plus(42n);
    for (let i = 0; i < 100; i++) {
      const step = biasedRandomStep(5, 5, 10, 2, 0.5, rng);
      expect(Math.abs(step.dx)).toBeLessThanOrEqual(1);
      expect(Math.abs(step.dy)).toBeLessThanOrEqual(1);
    }
  });

  it('should handle target at same position', () => {
    const rng = xoroshiro128plus(42n);
    const step = biasedRandomStep(5, 5, 5, 5, 0.8, rng);
    expect(Math.abs(step.dx)).toBeLessThanOrEqual(1);
    expect(Math.abs(step.dy)).toBeLessThanOrEqual(1);
  });

  it('should move toward negative target', () => {
    const rng = xoroshiro128plus(42n);
    let correctSteps = 0;
    for (let i = 0; i < 100; i++) {
      const step = biasedRandomStep(10, 10, 0, 0, 0.9, rng);
      if (step.dx < 0 && step.dy < 0) {
        correctSteps++;
      }
    }
    expect(correctSteps).toBeGreaterThan(70);
  });
});
