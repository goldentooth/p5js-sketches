/**
 * Scroll Prevention Utilities
 *
 * Prevents browser scrolling when using movement keys (arrow keys, WASD, etc.)
 * in interactive sketches. This is essential for games/simulations where movement
 * keys should control the sketch, not scroll the page.
 */

import type { KeyMapper } from './KeyboardMapping.js';

/**
 * Prevent browser scrolling for keys that map to movement directions
 *
 * @param keyMapper - Function that maps keys to directions (e.g., defaultKeyMapper)
 * @returns Cleanup function to remove the event listener
 *
 * @example
 * ```typescript
 * // In p5 setup()
 * const cleanup = preventMovementKeyScroll(Nuglib.defaultKeyMapper);
 *
 * // Optional: Call cleanup when done
 * // cleanup();
 * ```
 */
export function preventMovementKeyScroll(keyMapper: KeyMapper): () => void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // Return no-op cleanup in non-browser environments
    return () => {};
  }

  const handler = (e: KeyboardEvent) => {
    // Check if this key maps to a movement direction
    const direction = keyMapper(e.key, e.keyCode);
    if (direction) {
      // Prevent scrolling for movement keys
      e.preventDefault();
    }
  };

  window.addEventListener('keydown', handler, false);

  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handler, false);
  };
}
