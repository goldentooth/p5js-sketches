import { describe, it, expect, beforeEach } from 'vitest';
import { KeyRepeatHandler } from '../src';

describe('KeyRepeatHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new KeyRepeatHandler();
  });

  describe('Configuration', () => {
    it('should use default delays when not specified', () => {
      const handler = new KeyRepeatHandler();
      expect(handler).toBeDefined();
    });

    it('should accept custom initial delay', () => {
      const handler = new KeyRepeatHandler({ initialDelay: 30 });
      handler.onKeyPressed('a', 65);

      // Should not repeat before 30 frames
      for (let i = 0; i < 29; i++) {
        expect(handler.update()).toEqual([]);
      }

      // Should repeat at frame 30
      expect(handler.update()).toEqual([{ key: 'a', keyCode: 65 }]);
    });

    it('should accept custom repeat delay', () => {
      const handler = new KeyRepeatHandler({
        initialDelay: 5,
        repeatDelay: 10,
      });
      handler.onKeyPressed('b', 66);

      // Skip to initial repeat
      for (let i = 0; i < 5; i++) {
        handler.update();
      }

      // Should repeat every 10 frames after initial
      for (let i = 0; i < 9; i++) {
        expect(handler.update()).toEqual([]);
      }
      expect(handler.update()).toEqual([{ key: 'b', keyCode: 66 }]);
    });
  });

  describe('Key press/release tracking', () => {
    it('should track when a key is pressed', () => {
      handler.onKeyPressed('a', 65);
      expect(handler.isKeyHeld('a', 65)).toBe(true);
    });

    it('should track when a key is released', () => {
      handler.onKeyPressed('a', 65);
      handler.onKeyReleased('a', 65);
      expect(handler.isKeyHeld('a', 65)).toBe(false);
    });

    it('should handle multiple different keys', () => {
      handler.onKeyPressed('a', 65);
      handler.onKeyPressed('b', 66);
      handler.onKeyPressed('c', 67);

      expect(handler.isKeyHeld('a', 65)).toBe(true);
      expect(handler.isKeyHeld('b', 66)).toBe(true);
      expect(handler.isKeyHeld('c', 67)).toBe(true);
    });

    it('should not add duplicate key presses', () => {
      handler.onKeyPressed('a', 65);
      handler.onKeyPressed('a', 65);
      handler.onKeyPressed('a', 65);

      expect(handler.heldKeyCount).toBe(1);
    });

    it('should distinguish between different keys with same keyCode', () => {
      handler.onKeyPressed('a', 65);
      handler.onKeyPressed('A', 65);

      expect(handler.heldKeyCount).toBe(2);
    });
  });

  describe('Repeat timing', () => {
    it('should not repeat immediately after press', () => {
      handler.onKeyPressed('a', 65);
      expect(handler.update()).toEqual([]);
    });

    it('should repeat after initial delay (default 20 frames)', () => {
      handler.onKeyPressed('a', 65);

      // Should not repeat for 19 frames
      for (let i = 0; i < 19; i++) {
        expect(handler.update()).toEqual([]);
      }

      // Should repeat on frame 20
      expect(handler.update()).toEqual([{ key: 'a', keyCode: 65 }]);
    });

    it('should repeat at regular intervals after initial delay', () => {
      handler = new KeyRepeatHandler({
        initialDelay: 10,
        repeatDelay: 5,
      });
      handler.onKeyPressed('a', 65);

      // Skip to initial repeat
      for (let i = 0; i < 10; i++) {
        handler.update();
      }

      // Should repeat every 5 frames
      expect(handler.update()).toEqual([]);
      expect(handler.update()).toEqual([]);
      expect(handler.update()).toEqual([]);
      expect(handler.update()).toEqual([]);
      expect(handler.update()).toEqual([{ key: 'a', keyCode: 65 }]);

      expect(handler.update()).toEqual([]);
      expect(handler.update()).toEqual([]);
      expect(handler.update()).toEqual([]);
      expect(handler.update()).toEqual([]);
      expect(handler.update()).toEqual([{ key: 'a', keyCode: 65 }]);
    });

    it('should stop repeating when key is released', () => {
      handler = new KeyRepeatHandler({
        initialDelay: 5,
        repeatDelay: 3,
      });
      handler.onKeyPressed('a', 65);

      // Skip to initial repeat
      for (let i = 0; i < 5; i++) {
        handler.update();
      }

      // Release key
      handler.onKeyReleased('a', 65);

      // Should not repeat anymore
      for (let i = 0; i < 10; i++) {
        expect(handler.update()).toEqual([]);
      }
    });
  });

  describe('Multiple keys', () => {
    it('should handle multiple keys repeating independently', () => {
      handler = new KeyRepeatHandler({
        initialDelay: 5,
        repeatDelay: 3,
      });

      handler.onKeyPressed('a', 65);
      handler.onKeyPressed('b', 66);

      // Both should repeat at frame 5
      for (let i = 0; i < 4; i++) {
        handler.update();
      }

      const result = handler.update();
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ key: 'a', keyCode: 65 });
      expect(result).toContainEqual({ key: 'b', keyCode: 66 });
    });

    it('should handle keys pressed at different times', () => {
      handler = new KeyRepeatHandler({
        initialDelay: 5,
        repeatDelay: 10,
      });

      handler.onKeyPressed('a', 65);

      // Update 3 frames
      handler.update();
      handler.update();
      handler.update();

      // Press second key
      handler.onKeyPressed('b', 66);

      // Update 1 more frame (total 4 for 'a', 1 for 'b')
      handler.update();

      // On the next update, 'a' reaches frame 5 and should repeat, 'b' should not
      expect(handler.update()).toEqual([{ key: 'a', keyCode: 65 }]);
    });
  });

  describe('Utility methods', () => {
    it('should return all held keys', () => {
      handler.onKeyPressed('a', 65);
      handler.onKeyPressed('b', 66);
      handler.onKeyPressed('c', 67);

      const heldKeys = handler.getHeldKeys();
      expect(heldKeys).toHaveLength(3);
      expect(heldKeys).toContainEqual({ key: 'a', keyCode: 65 });
      expect(heldKeys).toContainEqual({ key: 'b', keyCode: 66 });
      expect(heldKeys).toContainEqual({ key: 'c', keyCode: 67 });
    });

    it('should return correct held key count', () => {
      expect(handler.heldKeyCount).toBe(0);

      handler.onKeyPressed('a', 65);
      expect(handler.heldKeyCount).toBe(1);

      handler.onKeyPressed('b', 66);
      expect(handler.heldKeyCount).toBe(2);

      handler.onKeyReleased('a', 65);
      expect(handler.heldKeyCount).toBe(1);

      handler.onKeyReleased('b', 66);
      expect(handler.heldKeyCount).toBe(0);
    });

    it('should clear all held keys', () => {
      handler.onKeyPressed('a', 65);
      handler.onKeyPressed('b', 66);
      handler.onKeyPressed('c', 67);

      expect(handler.heldKeyCount).toBe(3);

      handler.clear();

      expect(handler.heldKeyCount).toBe(0);
      expect(handler.isKeyHeld('a', 65)).toBe(false);
      expect(handler.isKeyHeld('b', 66)).toBe(false);
      expect(handler.isKeyHeld('c', 67)).toBe(false);
    });

    it('should handle clear when no keys are held', () => {
      expect(() => handler.clear()).not.toThrow();
      expect(handler.heldKeyCount).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle releasing a key that was never pressed', () => {
      expect(() => handler.onKeyReleased('z', 90)).not.toThrow();
    });

    it('should handle checking if unheld key is held', () => {
      expect(handler.isKeyHeld('z', 90)).toBe(false);
    });

    it('should handle zero initial delay', () => {
      handler = new KeyRepeatHandler({
        initialDelay: 0,
        repeatDelay: 5,
      });
      handler.onKeyPressed('a', 65);

      // Should repeat immediately
      expect(handler.update()).toEqual([{ key: 'a', keyCode: 65 }]);
    });

    it('should handle very long delays', () => {
      handler = new KeyRepeatHandler({
        initialDelay: 1000,
        repeatDelay: 500,
      });
      handler.onKeyPressed('a', 65);

      // Should not repeat for 999 frames
      for (let i = 0; i < 999; i++) {
        expect(handler.update()).toEqual([]);
      }

      // Should repeat on frame 1000
      expect(handler.update()).toEqual([{ key: 'a', keyCode: 65 }]);
    });

    it('should maintain state across many update calls', () => {
      handler = new KeyRepeatHandler({
        initialDelay: 10,
        repeatDelay: 5,
      });
      handler.onKeyPressed('a', 65);

      let repeatCount = 0;
      for (let i = 0; i < 100; i++) {
        const repeating = handler.update();
        if (repeating.length > 0) {
          repeatCount++;
        }
      }

      // Should have repeated at frames: 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100
      // That's 19 times (initial + 18 repeats)
      expect(repeatCount).toBe(19);
    });
  });
});
