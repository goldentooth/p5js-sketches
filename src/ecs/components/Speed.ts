export const Speed = 'Speed';

/**
 * Speed component affects energy regeneration rate.
 * Used to make entities faster or slower than baseline.
 */
export interface Speed {
  /**
   * Speed multiplier applied to energy regeneration.
   * - 1.0 = normal speed
   * - 2.0 = twice as fast (regenerates energy 2x faster)
   * - 0.5 = half speed (regenerates energy 2x slower)
   */
  multiplier: number;
}
