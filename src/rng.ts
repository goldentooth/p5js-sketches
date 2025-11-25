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

export function xoroshiro128plus(seed: bigint) {
  const sm = splitmix64(seed);
  let s0 = sm(), s1 = sm(); // 64-bit each
  const MASK_64 = (1n << 64n) - 1n;
  function rotl(x: bigint, k: bigint) {
    return ((x << k) | (x >> (64n - k))) & MASK_64;
  }
  return {
    nextU64(): bigint {
      const r = (s0 + s1) & MASK_64;
      s1 ^= s0;
      s0 = (rotl(s0, 55n) ^ s1 ^ (s1 << 14n)) & MASK_64;
      s1 = rotl(s1, 36n);
      return r;
    },
    nextFloat(): number {
      return Number(this.nextU64() >> 11n) / 2 ** 53;
    },
    nextRange(min: number, max: number): number {
      return Math.floor(this.nextFloat() * (max - min)) + min;
    },
    nextBool(): boolean {
      return (this.nextU64() & 1n) === 1n;
    },
    nextChoice<T>(arr: T[]): T {
      return arr[this.nextRange(0, arr.length)];
    },
  };
}
