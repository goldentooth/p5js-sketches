import { splitmix64, xoroshiro128plus } from '../src';

describe('splitmix64', () => {
  it('should be defined', () => {
    expect(splitmix64).toBeDefined();
  });

  it('should produce different sequences for different seeds', () => {
    const rng1 = splitmix64(123n);
    const rng2 = splitmix64(456n);
    expect(rng1()).not.toEqual(rng2());
  });

  it('should produce consistent sequences for the same seed', () => {
    const seed = 789n;
    const rng1 = splitmix64(seed);
    const rng2 = splitmix64(seed);
    expect(rng1()).toEqual(rng2());
    expect(rng1()).toEqual(rng2());
    expect(rng1()).toEqual(rng2());
  });
});

describe('xoroshiro128plus', () => {
  it('should be defined', () => {
    expect(xoroshiro128plus).toBeDefined();
  });

  it('should produce different sequences for different seeds', () => {
    const rng1 = xoroshiro128plus(123n);
    const rng2 = xoroshiro128plus(456n);
    expect(rng1.nextU64()).not.toEqual(rng2.nextU64());
  });

  it('should produce consistent sequences for the same seed', () => {
    const seed = 789n;
    const rng1 = xoroshiro128plus(seed);
    const rng2 = xoroshiro128plus(seed);
    expect(rng1.nextU64()).toEqual(rng2.nextU64());
    expect(rng1.nextU64()).toEqual(rng2.nextU64());
    expect(rng1.nextU64()).toEqual(rng2.nextU64());
  });

  it('should produce floats in the range [0, 1)', () => {
    const rng = xoroshiro128plus(101112n);
    for (let i = 0; i < 100; i++) {
      const value = rng.nextFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should produce integers in the specified range', () => {
    const rng = xoroshiro128plus(131415n);
    const min = 10;
    const max = 20;
    for (let i = 0; i < 100; i++) {
      const value = rng.nextRange(min, max);
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThan(max);
    }
  });

  it('should produce boolean values', () => {
    const rng = xoroshiro128plus(161718n);
    let foundTrue = false;
    let foundFalse = false;
    for (let i = 0; i < 100; i++) {
      const value = rng.nextBool();
      if (value) {
        foundTrue = true;
      } else {
        foundFalse = true;
      }
      if (foundTrue && foundFalse) {
        break;
      }
    }
    expect(foundTrue).toBe(true);
    expect(foundFalse).toBe(true);
  });

  it('should select random choices from an array', () => {
    const rng = xoroshiro128plus(192021n);
    const choices = ['a', 'b', 'c', 'd', 'e'];
    const results = new Set();
    for (let i = 0; i < 100; i++) {
      const choice = rng.nextChoice(choices);
      results.add(choice);
      if (results.size === choices.length) {
        break;
      }
    }
    expect(results.size).toBe(choices.length);
  });

});
