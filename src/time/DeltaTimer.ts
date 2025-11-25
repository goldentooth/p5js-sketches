/**
 * DeltaTimer manages delta time calculation for smooth animation
 * Handles time tracking, clamping, and time scaling
 */
export class DeltaTimer {
  private lastTime: number = 0;
  private timeScale: number = 1.0;
  private maxDelta: number;
  private accumulatedTime: number = 0;

  constructor(options?: {
    maxDelta?: number;
    timeScale?: number;
  }) {
    this.maxDelta = options?.maxDelta ?? 0.05; // Default 50ms max
    this.timeScale = options?.timeScale ?? 1.0;
  }

  /**
   * Get the delta time in seconds since last tick
   * Automatically clamps to maxDelta for stability
   * @param currentTime - Current time in seconds (e.g., from p.millis() / 1000)
   * @returns Delta time in seconds, scaled by timeScale
   */
  tick(currentTime: number): number {
    // First tick, initialize
    if (this.lastTime === 0) {
      this.lastTime = currentTime;
      return 0;
    }

    const rawDelta = currentTime - this.lastTime;
    const clampedDelta = Math.min(rawDelta, this.maxDelta);
    const scaledDelta = clampedDelta * this.timeScale;

    this.lastTime = currentTime;
    this.accumulatedTime += scaledDelta;

    return scaledDelta;
  }

  /**
   * Reset the timer (useful when unpausing or resetting simulation)
   */
  reset(): void {
    this.lastTime = 0;
    this.accumulatedTime = 0;
  }

  /**
   * Get accumulated time since timer started
   */
  getAccumulatedTime(): number {
    return this.accumulatedTime;
  }

  /**
   * Set the time scale (1.0 = normal, 0.5 = half speed, 2.0 = double speed)
   */
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
  }

  /**
   * Get the current time scale
   */
  getTimeScale(): number {
    return this.timeScale;
  }

  /**
   * Set the maximum delta time (in seconds)
   * Useful for preventing spiral of death in physics simulations
   */
  setMaxDelta(maxDelta: number): void {
    this.maxDelta = Math.max(0, maxDelta);
  }

  /**
   * Get the maximum delta time
   */
  getMaxDelta(): number {
    return this.maxDelta;
  }
}
