/**
 * Configuration options for KeyRepeatHandler
 */
export interface KeyRepeatConfig {
  /** Frames to wait before repeat starts (default: 20 frames ~333ms at 60fps) */
  initialDelay?: number;
  /** Frames between repeats after initial delay (default: 6 frames ~100ms at 60fps) */
  repeatDelay?: number;
}

/**
 * Information about a key
 */
export interface KeyInfo {
  key: string;
  keyCode: number;
}

/**
 * Internal state for tracking a held key
 */
interface KeyState extends KeyInfo {
  framesSincePress: number;
}

/**
 * Handles key repeat/continuous input with configurable delays.
 *
 * This class manages the timing and state for keys that should repeat
 * when held down, similar to how text input works in most editors:
 * - Immediate response on first press
 * - Initial delay before repeat starts
 * - Faster repeat rate once started
 *
 * @example
 * ```typescript
 * const keyRepeat = new KeyRepeatHandler({
 *   initialDelay: 20,  // ~333ms before repeat
 *   repeatDelay: 6     // ~100ms between repeats
 * });
 *
 * function keyPressed() {
 *   keyRepeat.onKeyPressed(key, keyCode);
 * }
 *
 * function keyReleased() {
 *   keyRepeat.onKeyReleased(key, keyCode);
 * }
 *
 * function draw() {
 *   const repeatingKeys = keyRepeat.update();
 *   for (const { key, keyCode } of repeatingKeys) {
 *     // Handle repeated key
 *   }
 * }
 * ```
 */
export class KeyRepeatHandler {
  private heldKeys: Map<string, KeyState> = new Map();
  private initialDelay: number;
  private repeatDelay: number;

  constructor(config: KeyRepeatConfig = {}) {
    this.initialDelay = config.initialDelay ?? 20;
    this.repeatDelay = config.repeatDelay ?? 6;
  }

  /**
   * Call this in your keyPressed() handler
   */
  onKeyPressed(key: string, keyCode: number): void {
    const keyId = this.getKeyId(key, keyCode);

    // Only add if not already held (prevents repeat keyPressed events)
    if (!this.heldKeys.has(keyId)) {
      this.heldKeys.set(keyId, {
        key,
        keyCode,
        framesSincePress: 0,
      });
    }
  }

  /**
   * Call this in your keyReleased() handler
   */
  onKeyReleased(key: string, keyCode: number): void {
    const keyId = this.getKeyId(key, keyCode);
    this.heldKeys.delete(keyId);
  }

  /**
   * Call this in your draw() loop.
   * Returns an array of keys that should repeat this frame.
   */
  update(): KeyInfo[] {
    const repeatingKeys: KeyInfo[] = [];

    for (const [keyId, keyState] of this.heldKeys) {
      keyState.framesSincePress++;

      // Handle zero initial delay as a special case (repeat every frame)
      if (this.initialDelay === 0 && keyState.framesSincePress > 0) {
        repeatingKeys.push({
          key: keyState.key,
          keyCode: keyState.keyCode,
        });
        continue;
      }

      // Check if it's time to repeat based on initial delay or repeat delay
      const isInitialRepeat = keyState.framesSincePress === this.initialDelay;
      const isSubsequentRepeat =
        keyState.framesSincePress > this.initialDelay &&
        (keyState.framesSincePress - this.initialDelay) % this.repeatDelay === 0;

      if (isInitialRepeat || isSubsequentRepeat) {
        repeatingKeys.push({
          key: keyState.key,
          keyCode: keyState.keyCode,
        });
      }
    }

    return repeatingKeys;
  }

  /**
   * Check if a specific key is currently held down
   */
  isKeyHeld(key: string, keyCode: number): boolean {
    const keyId = this.getKeyId(key, keyCode);
    return this.heldKeys.has(keyId);
  }

  /**
   * Get all currently held keys
   */
  getHeldKeys(): KeyInfo[] {
    return Array.from(this.heldKeys.values()).map(({ key, keyCode }) => ({
      key,
      keyCode,
    }));
  }

  /**
   * Clear all held keys
   */
  clear(): void {
    this.heldKeys.clear();
  }

  /**
   * Get the number of currently held keys
   */
  get heldKeyCount(): number {
    return this.heldKeys.size;
  }

  /**
   * Generate a unique identifier for a key
   */
  private getKeyId(key: string, keyCode: number): string {
    return `${key}-${keyCode}`;
  }
}
