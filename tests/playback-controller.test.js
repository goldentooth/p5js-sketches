import { describe, it, expect, beforeEach } from 'vitest';
import { PlaybackController } from '../src';

describe('PlaybackController', () => {
  let controller;

  beforeEach(() => {
    controller = new PlaybackController();
  });

  describe('Initial state', () => {
    it('should start in running state by default', () => {
      expect(controller.getIsRunning()).toBe(true);
    });

    it('should respect isRunning option', () => {
      const paused = new PlaybackController({ isRunning: false });
      expect(paused.getIsRunning()).toBe(false);
    });

    it('should start with 1 step per frame by default', () => {
      expect(controller.getStepsPerFrame()).toBe(1);
    });

    it('should respect stepsPerFrame option', () => {
      const fast = new PlaybackController({ stepsPerFrame: 5 });
      expect(fast.getStepsPerFrame()).toBe(5);
    });
  });

  describe('Play/Pause controls', () => {
    it('should pause playback', () => {
      controller.pause();
      expect(controller.getIsRunning()).toBe(false);
    });

    it('should resume playback', () => {
      controller.pause();
      controller.play();
      expect(controller.getIsRunning()).toBe(true);
    });

    it('should toggle from running to paused', () => {
      expect(controller.getIsRunning()).toBe(true);
      controller.toggle();
      expect(controller.getIsRunning()).toBe(false);
    });

    it('should toggle from paused to running', () => {
      controller.pause();
      controller.toggle();
      expect(controller.getIsRunning()).toBe(true);
    });

    it('should toggle multiple times', () => {
      controller.toggle(); // pause
      controller.toggle(); // play
      controller.toggle(); // pause
      expect(controller.getIsRunning()).toBe(false);
    });
  });

  describe('shouldRun behavior', () => {
    it('should return true when running', () => {
      expect(controller.shouldRun()).toBe(true);
    });

    it('should return false when paused', () => {
      controller.pause();
      expect(controller.shouldRun()).toBe(false);
    });

    it('should return true once after step()', () => {
      controller.pause();
      controller.step();
      expect(controller.shouldRun()).toBe(true);
    });

    it('should return false on second call after step()', () => {
      controller.pause();
      controller.step();
      controller.shouldRun(); // Consumes the step
      expect(controller.shouldRun()).toBe(false);
    });

    it('should allow multiple steps', () => {
      controller.pause();
      controller.step();
      expect(controller.shouldRun()).toBe(true);
      controller.step();
      expect(controller.shouldRun()).toBe(true);
    });

    it('should consume step flag each time', () => {
      controller.pause();
      controller.step();
      controller.shouldRun(); // Consumes
      controller.step();
      controller.shouldRun(); // Consumes
      expect(controller.shouldRun()).toBe(false); // Nothing left
    });
  });

  describe('Step functionality', () => {
    it('should not affect running state when called while running', () => {
      controller.step();
      expect(controller.getIsRunning()).toBe(true);
    });

    it('should work when paused', () => {
      controller.pause();
      controller.step();
      // shouldRun returns true once
      expect(controller.shouldRun()).toBe(true);
      // Then false
      expect(controller.shouldRun()).toBe(false);
    });

    it('should not make shouldRun return true when already running', () => {
      const before = controller.shouldRun(); // true (running)
      controller.step();
      const after = controller.shouldRun(); // still true (running)
      expect(before).toBe(true);
      expect(after).toBe(true);
    });
  });

  describe('Speed control', () => {
    it('should set speed to positive integer', () => {
      controller.setSpeed(10);
      expect(controller.getStepsPerFrame()).toBe(10);
    });

    it('should floor fractional speed', () => {
      controller.setSpeed(3.7);
      expect(controller.getStepsPerFrame()).toBe(3);
    });

    it('should clamp negative speed to 1', () => {
      controller.setSpeed(-5);
      expect(controller.getStepsPerFrame()).toBe(1);
    });

    it('should clamp zero speed to 1', () => {
      controller.setSpeed(0);
      expect(controller.getStepsPerFrame()).toBe(1);
    });

    it('should handle large speeds', () => {
      controller.setSpeed(1000);
      expect(controller.getStepsPerFrame()).toBe(1000);
    });
  });

  describe('State combinations', () => {
    it('should maintain speed when toggling playback', () => {
      controller.setSpeed(5);
      controller.toggle();
      controller.toggle();
      expect(controller.getStepsPerFrame()).toBe(5);
    });

    it('should maintain speed after stepping', () => {
      controller.setSpeed(3);
      controller.pause();
      controller.step();
      controller.shouldRun();
      expect(controller.getStepsPerFrame()).toBe(3);
    });
  });

  describe('Typical usage patterns', () => {
    it('should support pause -> step -> step -> play workflow', () => {
      controller.pause();
      expect(controller.shouldRun()).toBe(false);

      controller.step();
      expect(controller.shouldRun()).toBe(true);
      expect(controller.shouldRun()).toBe(false);

      controller.step();
      expect(controller.shouldRun()).toBe(true);
      expect(controller.shouldRun()).toBe(false);

      controller.play();
      expect(controller.shouldRun()).toBe(true);
      expect(controller.shouldRun()).toBe(true); // Still running
    });

    it('should support speed adjustment during playback', () => {
      expect(controller.getStepsPerFrame()).toBe(1);
      controller.setSpeed(2);
      expect(controller.getStepsPerFrame()).toBe(2);
      expect(controller.shouldRun()).toBe(true);
    });
  });
});
