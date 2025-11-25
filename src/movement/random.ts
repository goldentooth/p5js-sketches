import type { xoroshiro128plus } from '../rng';
import type { Direction } from './directions';
import { CARDINAL_DIRECTIONS, ALL_DIRECTIONS } from './directions';

/**
 * Get a random cardinal direction (4-way)
 */
export function randomCardinalDirection(
  rng?: ReturnType<typeof xoroshiro128plus>
): Direction {
  if (rng) {
    return rng.nextChoice(CARDINAL_DIRECTIONS);
  }
  return CARDINAL_DIRECTIONS[Math.floor(Math.random() * CARDINAL_DIRECTIONS.length)];
}

/**
 * Get a random direction (8-way, including diagonals)
 */
export function randomDirection(
  rng?: ReturnType<typeof xoroshiro128plus>
): Direction {
  if (rng) {
    return rng.nextChoice(ALL_DIRECTIONS);
  }
  return ALL_DIRECTIONS[Math.floor(Math.random() * ALL_DIRECTIONS.length)];
}

/**
 * Get a random step in 8 directions (including staying still)
 * Returns a direction with dx and dy each being -1, 0, or 1
 */
export function randomStep(
  rng?: ReturnType<typeof xoroshiro128plus>,
  canStayStill: boolean = true
): Direction {
  const nextInt = rng
    ? (min: number, max: number) => rng.nextRange(min, max)
    : (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  const range = canStayStill ? 3 : 2;
  const offset = canStayStill ? 1 : 0;

  let dx: number, dy: number;

  do {
    dx = nextInt(0, range) - offset;
    dy = nextInt(0, range) - offset;
  } while (!canStayStill && dx === 0 && dy === 0);

  return { dx, dy };
}

/**
 * Get a random cardinal step (4-way movement only, no diagonals)
 * Returns a direction with only one of dx or dy being non-zero
 */
export function randomCardinalStep(
  rng?: ReturnType<typeof xoroshiro128plus>
): Direction {
  const direction = randomCardinalDirection(rng);
  return { dx: direction.dx, dy: direction.dy };
}

/**
 * Random walk that tends toward a target position
 * Returns a step that has a bias toward the target
 */
export function biasedRandomStep(
  currentX: number,
  currentY: number,
  targetX: number,
  targetY: number,
  bias: number = 0.5,
  rng?: ReturnType<typeof xoroshiro128plus>
): Direction {
  const nextFloat = rng ? () => rng.nextFloat() : () => Math.random();

  let dx = 0;
  let dy = 0;

  // X direction
  if (nextFloat() < bias) {
    dx = Math.sign(targetX - currentX);
  } else {
    dx = nextFloat() < 0.5 ? -1 : 1;
  }

  // Y direction
  if (nextFloat() < bias) {
    dy = Math.sign(targetY - currentY);
  } else {
    dy = nextFloat() < 0.5 ? -1 : 1;
  }

  return { dx, dy };
}
