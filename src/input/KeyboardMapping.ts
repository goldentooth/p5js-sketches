import type { Direction } from '../movement/directions';
import { Cardinal, Diagonal } from '../movement/directions';

/**
 * Configuration for keyboard-to-direction mapping
 */
export interface KeyMappingConfig {
  /** Enable arrow keys (default: true) */
  arrows?: boolean;
  /** Enable WASD keys (default: true) */
  wasd?: boolean;
  /** Enable vi keys (hjkl) (default: true) */
  vi?: boolean;
  /** Enable numpad keys (default: true) */
  numpad?: boolean;
}

/**
 * Maps keyboard input to direction vectors.
 *
 * Supports multiple keyboard layouts:
 * - Arrow keys (←↑→↓)
 * - WASD (common in games)
 * - Vi keys (hjkl)
 * - Numpad (1-9, including diagonals)
 *
 * @example
 * ```typescript
 * const mapper = createKeyMapper();
 *
 * function keyPressed() {
 *   const direction = mapper(key, keyCode);
 *   if (direction) {
 *     // Move in that direction
 *   }
 * }
 * ```
 */
export function createKeyMapper(config: KeyMappingConfig = {}) {
  const {
    arrows = true,
    wasd = true,
    vi = true,
    numpad = true,
  } = config;

  return function mapKeyToDirection(
    key: string,
    keyCode: number
  ): Direction | null {
    // Arrow keys (use keyCode for compatibility)
    if (arrows) {
      if (keyCode === 37) return Cardinal.WEST; // LEFT_ARROW
      if (keyCode === 38) return Cardinal.NORTH; // UP_ARROW
      if (keyCode === 39) return Cardinal.EAST; // RIGHT_ARROW
      if (keyCode === 40) return Cardinal.SOUTH; // DOWN_ARROW
    }

    // WASD
    if (wasd) {
      if (key === 'a' || key === 'A') return Cardinal.WEST;
      if (key === 'd' || key === 'D') return Cardinal.EAST;
      if (key === 'w' || key === 'W') return Cardinal.NORTH;
      if (key === 's' || key === 'S') return Cardinal.SOUTH;
    }

    // Vi keys
    if (vi) {
      if (key === 'h') return Cardinal.WEST;
      if (key === 'l') return Cardinal.EAST;
      if (key === 'k') return Cardinal.NORTH;
      if (key === 'j') return Cardinal.SOUTH;
    }

    // Numpad (cardinal and diagonal)
    if (numpad) {
      if (key === '4') return Cardinal.WEST;
      if (key === '6') return Cardinal.EAST;
      if (key === '8') return Cardinal.NORTH;
      if (key === '2') return Cardinal.SOUTH;
      if (key === '7') return Diagonal.NORTHWEST;
      if (key === '9') return Diagonal.NORTHEAST;
      if (key === '1') return Diagonal.SOUTHWEST;
      if (key === '3') return Diagonal.SOUTHEAST;
    }

    return null;
  };
}

/**
 * Default keyboard mapper with all layouts enabled
 */
export const defaultKeyMapper = createKeyMapper();

/**
 * Check if a key maps to a direction
 */
export function isMovementKey(
  key: string,
  keyCode: number,
  config?: KeyMappingConfig
): boolean {
  const mapper = createKeyMapper(config);
  return mapper(key, keyCode) !== null;
}

/**
 * Preset configurations for common use cases
 */
export const KeyMappingPresets = {
  /** Only arrow keys */
  arrowsOnly: { arrows: true, wasd: false, vi: false, numpad: false },

  /** WASD + arrow keys (common for games) */
  gaming: { arrows: true, wasd: true, vi: false, numpad: false },

  /** Vi keys only (for roguelikes) */
  roguelike: { arrows: false, wasd: false, vi: true, numpad: true },

  /** Everything enabled */
  all: { arrows: true, wasd: true, vi: true, numpad: true },
} as const;
