/**
 * Creates a splitmix64 pseudo-random number generator
 *
 * SplitMix64 is a fast, high-quality PRNG often used to seed other generators.
 * It produces a sequence of 64-bit unsigned integers from a single 64-bit seed.
 *
 * @param seed - Initial 64-bit seed value as BigInt
 * @returns Function that generates the next 64-bit random value
 *
 * @example
 * ```typescript
 * const rng = splitmix64(12345n);
 * const random1 = rng(); // First random value
 * const random2 = rng(); // Second random value
 * ```
 */
export function splitmix64(seed: bigint): () => bigint {
  let x = seed & ((1n << 64n) - 1n);
  return () => {
    x = (x + 0x9e3779b97f4a7c15n) & ((1n << 64n) - 1n);
    let z = x;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & ((1n << 64n) - 1n);
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & ((1n << 64n) - 1n);
    return z ^ (z >> 31n);
  };
}

/**
 * Creates a xoroshiro128+ pseudo-random number generator
 *
 * Xoroshiro128+ is a fast, high-quality PRNG with excellent statistical properties.
 * It maintains 128 bits of state and has a period of 2^128 - 1. Perfect for games
 * and simulations requiring deterministic, seedable randomness.
 *
 * @param seed - Initial 64-bit seed value (used to initialize 128-bit state via splitmix64)
 * @returns Object with methods for generating various random values
 *
 * @example
 * ```typescript
 * const rng = xoroshiro128plus(42n);
 *
 * // Generate raw 64-bit integer
 * const rawValue = rng.nextU64();
 *
 * // Generate float in range [0, 1)
 * const probability = rng.nextFloat();
 *
 * // Generate integer in range [min, max)
 * const diceRoll = rng.nextRange(1, 7); // 1-6
 *
 * // Generate random boolean
 * const coinFlip = rng.nextBool();
 *
 * // Pick random element from array
 * const direction = rng.nextChoice(['north', 'south', 'east', 'west']);
 * ```
 */
export function xoroshiro128plus(seed: bigint) {
  const sm = splitmix64(seed);
  let s0 = sm(), s1 = sm(); // 64-bit each
  const MASK_64 = (1n << 64n) - 1n;
  function rotl(x: bigint, k: bigint) {
    return ((x << k) | (x >> (64n - k))) & MASK_64;
  }
  return {
    /** Generate next 64-bit unsigned integer */
    nextU64(): bigint {
      const r = (s0 + s1) & MASK_64;
      s1 ^= s0;
      s0 = (rotl(s0, 55n) ^ s1 ^ (s1 << 14n)) & MASK_64;
      s1 = rotl(s1, 36n);
      return r;
    },
    /** Generate random float in range [0, 1) with 53 bits of precision */
    nextFloat(): number {
      return Number(this.nextU64() >> 11n) / 2 ** 53;
    },
    /** Generate random integer in range [min, max) */
    nextRange(min: number, max: number): number {
      return Math.floor(this.nextFloat() * (max - min)) + min;
    },
    /** Generate random boolean (50/50 chance) */
    nextBool(): boolean {
      return (this.nextU64() & 1n) === 1n;
    },
    /** Pick random element from array */
    nextChoice<T>(arr: T[]): T {
      return arr[this.nextRange(0, arr.length)];
    },
  };
}
