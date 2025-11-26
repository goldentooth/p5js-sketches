export const Energy = 'Energy';

/**
 * Energy component for action cost and time system.
 * Entities accumulate energy over time and spend it on actions.
 */
export interface Energy {
  /** Current energy pool (can be negative if action borrowed energy) */
  current: number;
  /** Maximum energy capacity */
  max: number;
  /** Energy gained per clock tick (affected by Speed multiplier) */
  regenRate: number;
}
