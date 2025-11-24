/**
 * PlaybackController manages playback state and controls for sketches
 * Handles play/pause, step-through, and speed control patterns
 */
export class PlaybackController {
  private isRunning: boolean;
  private shouldStep: boolean = false;
  private stepsPerFrame: number;

  constructor(options?: {
    isRunning?: boolean;
    stepsPerFrame?: number;
  }) {
    this.isRunning = options?.isRunning ?? true;
    this.stepsPerFrame = options?.stepsPerFrame ?? 1;
  }

  /**
   * Check if playback is currently running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get the current number of steps per frame
   */
  getStepsPerFrame(): number {
    return this.stepsPerFrame;
  }

  /**
   * Check and consume the step-once flag
   * Returns true once after step() is called, then false
   */
  private shouldStepOnce(): boolean {
    const result = this.shouldStep;
    this.shouldStep = false;
    return result;
  }

  /**
   * Start playback
   */
  play(): void {
    this.isRunning = true;
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.isRunning = false;
  }

  /**
   * Toggle between play and pause
   */
  toggle(): void {
    this.isRunning = !this.isRunning;
  }

  /**
   * Step forward one frame (works when paused)
   */
  step(): void {
    this.shouldStep = true;
  }

  /**
   * Set the number of simulation steps per frame
   */
  setSpeed(stepsPerFrame: number): void {
    this.stepsPerFrame = Math.max(1, Math.floor(stepsPerFrame));
  }

  /**
   * Check if the simulation should run this frame
   * Use this in your draw loop to determine if simulation should advance
   */
  shouldRun(): boolean {
    return this.isRunning || this.shouldStepOnce();
  }

  /**
   * Bind a play/pause toggle button
   * @param buttonId - DOM element ID
   * @param playText - Text to show when paused (default: "Resume")
   * @param pauseText - Text to show when playing (default: "Pause")
   */
  bindPlayPauseButton(buttonId: string, playText: string = 'Resume', pauseText: string = 'Pause'): void {
    const btn = document.getElementById(buttonId);
    if (!btn) throw new Error(`Button ${buttonId} not found`);

    const updateText = () => {
      btn.textContent = this.isRunning ? pauseText : playText;
    };

    btn.addEventListener('click', () => {
      this.toggle();
      updateText();
    });

    updateText();
  }

  /**
   * Bind a step button
   * @param buttonId - DOM element ID
   */
  bindStepButton(buttonId: string): void {
    const btn = document.getElementById(buttonId);
    if (!btn) throw new Error(`Button ${buttonId} not found`);
    btn.addEventListener('click', () => this.step());
  }

  /**
   * Bind a speed slider control
   * @param sliderId - DOM element ID for the slider
   * @param valueDisplayId - Optional DOM element ID to display current value
   */
  bindSpeedSlider(sliderId: string, valueDisplayId?: string): void {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    if (!slider) throw new Error(`Slider ${sliderId} not found`);

    const updateValue = (value: number) => {
      this.setSpeed(value);
      if (valueDisplayId) {
        const display = document.getElementById(valueDisplayId);
        if (display) {
          display.textContent = this.stepsPerFrame.toString();
        }
      }
    };

    slider.addEventListener('input', (e) => {
      updateValue(parseInt((e.target as HTMLInputElement).value));
    });

    // Set initial values
    slider.value = this.stepsPerFrame.toString();
    if (valueDisplayId) {
      const display = document.getElementById(valueDisplayId);
      if (display) {
        display.textContent = this.stepsPerFrame.toString();
      }
    }
  }

  /**
   * Bind a custom callback to a button
   * @param buttonId - DOM element ID
   * @param callback - Function to call when button is clicked
   */
  bindButton(buttonId: string, callback: () => void): void {
    const btn = document.getElementById(buttonId);
    if (!btn) throw new Error(`Button ${buttonId} not found`);
    btn.addEventListener('click', callback);
  }
}
