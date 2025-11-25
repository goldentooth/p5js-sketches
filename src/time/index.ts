export * from './DeltaTimer';
export * from './FixedTimeStep';

/**
 * Utility functions for time-related operations
 */

/**
 * Convert milliseconds to seconds
 */
export function msToSec(ms: number): number {
  return ms / 1000;
}

/**
 * Convert seconds to milliseconds
 */
export function secToMs(sec: number): number {
  return sec * 1000;
}

/**
 * Convert frames to seconds
 * @param frames - Number of frames
 * @param fps - Frames per second (default: 60)
 */
export function framesToSec(frames: number, fps: number = 60): number {
  return frames / fps;
}

/**
 * Convert seconds to frames
 * @param seconds - Time in seconds
 * @param fps - Frames per second (default: 60)
 */
export function secToFrames(seconds: number, fps: number = 60): number {
  return Math.floor(seconds * fps);
}
