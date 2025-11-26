import { describe, it, expect } from 'vitest';
import { preventMovementKeyScroll } from '../src/input/scroll-prevention';
import { defaultKeyMapper } from '../src/input/KeyboardMapping';

describe('Scroll Prevention', () => {
  describe('preventMovementKeyScroll', () => {
    it('should return a cleanup function', () => {
      const cleanup = preventMovementKeyScroll(defaultKeyMapper);
      expect(typeof cleanup).toBe('function');
      cleanup();
    });

    it('should handle non-browser environments gracefully', () => {
      // In Node.js test environment (no window), should return no-op cleanup
      const cleanup = preventMovementKeyScroll(defaultKeyMapper);
      expect(typeof cleanup).toBe('function');

      // Should not throw when called
      expect(() => cleanup()).not.toThrow();
    });

    it('should work with custom key mappers', () => {
      // Custom mapper that only maps 'x' to a direction
      const customMapper = (key) => {
        if (key === 'x') return { dx: 1, dy: 0 };
        return null;
      };

      const cleanup = preventMovementKeyScroll(customMapper);
      expect(typeof cleanup).toBe('function');
      cleanup();
    });

    it('should accept any key mapper function signature', () => {
      // Test that the function accepts the correct signature
      const mockMapper = (key, keyCode) => {
        if (key === 'ArrowUp') return { dx: 0, dy: -1 };
        return null;
      };

      const cleanup = preventMovementKeyScroll(mockMapper);
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });
});
