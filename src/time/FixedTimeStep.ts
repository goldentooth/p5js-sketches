/**
 * FixedTimeStep implements a fixed timestep update loop
 * Useful for deterministic physics simulations
 */
export class FixedTimeStep {
  private accumulator: number = 0;
  private lastTime: number = 0;
  private readonly fixedDt: number;
  private readonly maxAccumulator: number;

  constructor(options?: {
    fps?: number;
    maxAccumulatorSteps?: number;
  }) {
    const fps = options?.fps ?? 60;
    this.fixedDt = 1 / fps;
    const maxSteps = options?.maxAccumulatorSteps ?? 5;
    this.maxAccumulator = this.fixedDt * maxSteps;
  }

  /**
   * Update the fixed timestep loop
   * Calls the updateFn zero or more times with fixed dt
   * Calls the renderFn once with interpolation factor (alpha)
   *
   * @param currentTime - Current time in seconds
   * @param updateFn - Function to call for each fixed timestep (receives dt)
   * @param renderFn - Optional render function (receives alpha for interpolation)
   * @returns Number of update steps executed
   */
  tick(
    currentTime: number,
    updateFn: (dt: number) => void,
    renderFn?: (alpha: number) => void
  ): number {
    // First tick, initialize
    if (this.lastTime === 0) {
      this.lastTime = currentTime;
      return 0;
    }

    const frameTime = Math.min(currentTime - this.lastTime, this.maxAccumulator);
    this.accumulator += frameTime;
    this.lastTime = currentTime;

    let steps = 0;
    while (this.accumulator >= this.fixedDt) {
      updateFn(this.fixedDt);
      this.accumulator -= this.fixedDt;
      steps++;
    }

    // Alpha is used for interpolation between physics states
    const alpha = this.accumulator / this.fixedDt;

    if (renderFn) {
      renderFn(alpha);
    }

    return steps;
  }

  /**
   * Reset the accumulator
   */
  reset(): void {
    this.accumulator = 0;
    this.lastTime = 0;
  }

  /**
   * Get the fixed delta time
   */
  getFixedDt(): number {
    return this.fixedDt;
  }
}
