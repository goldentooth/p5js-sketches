import { describe, it, expect, beforeEach } from 'vitest';
import { DeltaTimer, FixedTimeStep, msToSec, secToMs, framesToSec, secToFrames } from '../src';

describe('DeltaTimer', () => {
  let timer;

  beforeEach(() => {
    timer = new DeltaTimer();
  });

  describe('Basic timing', () => {
    it('should return 0 on first tick', () => {
      const dt = timer.tick(1.0);
      expect(dt).toBe(0);
    });

    it('should return correct delta time between ticks', () => {
      timer.tick(1.0);
      const dt = timer.tick(1.5);
      expect(dt).toBeCloseTo(0.05, 5); // Clamped to default maxDelta 0.05
    });

    it('should accumulate multiple deltas correctly', () => {
      timer.tick(0.1);
      timer.tick(0.2);
      timer.tick(0.3);
      const dt = timer.tick(0.4);
      expect(dt).toBeCloseTo(0.05, 5); // Each step clamped to 0.05
    });

    it('should handle non-sequential time values', () => {
      timer.tick(5.0);
      const dt = timer.tick(5.05);
      expect(dt).toBeCloseTo(0.05, 5);
    });
  });

  describe('Delta clamping', () => {
    it('should clamp delta to maxDelta', () => {
      const timer = new DeltaTimer({ maxDelta: 0.1 });
      timer.tick(1.0);
      const dt = timer.tick(2.0); // Would be 1.0 without clamping
      expect(dt).toBe(0.1);
    });

    it('should not clamp delta below maxDelta', () => {
      const timer = new DeltaTimer({ maxDelta: 0.5 });
      timer.tick(1.0);
      const dt = timer.tick(1.1);
      expect(dt).toBeCloseTo(0.1, 5);
    });

    it('should use default maxDelta of 0.05 seconds', () => {
      timer.tick(1.0);
      const dt = timer.tick(11.0); // Large jump
      expect(dt).toBe(0.05);
    });
  });

  describe('Time scaling', () => {
    it('should apply timeScale to delta', () => {
      const timer = new DeltaTimer({ timeScale: 2.0, maxDelta: 1.0 });
      timer.tick(1.0);
      const dt = timer.tick(1.1);
      expect(dt).toBeCloseTo(0.2, 5); // 0.1 * 2.0
    });

    it('should support slow motion with timeScale < 1', () => {
      const timer = new DeltaTimer({ timeScale: 0.5, maxDelta: 1.0 });
      timer.tick(1.0);
      const dt = timer.tick(1.1);
      expect(dt).toBeCloseTo(0.05, 5); // 0.1 * 0.5
    });

    it('should allow changing timeScale dynamically', () => {
      const timer = new DeltaTimer({ maxDelta: 1.0 });
      timer.tick(1.0);
      timer.setTimeScale(3.0);
      const dt = timer.tick(1.1);
      expect(dt).toBeCloseTo(0.3, 5); // 0.1 * 3.0
    });

    it('should return current timeScale', () => {
      timer.setTimeScale(1.5);
      expect(timer.getTimeScale()).toBe(1.5);
    });

    it('should clamp negative timeScale to 0', () => {
      timer.setTimeScale(-1.0);
      expect(timer.getTimeScale()).toBe(0);
    });
  });

  describe('Accumulated time', () => {
    it('should track total accumulated time', () => {
      const timer = new DeltaTimer({ maxDelta: 1.0 });
      timer.tick(1.0);
      timer.tick(1.1);
      timer.tick(1.2);
      timer.tick(1.3);
      expect(timer.getAccumulatedTime()).toBeCloseTo(0.3, 5);
    });

    it('should accumulate scaled time', () => {
      const timer = new DeltaTimer({ timeScale: 2.0, maxDelta: 1.0 });
      timer.tick(1.0);
      timer.tick(1.1);
      timer.tick(1.2);
      expect(timer.getAccumulatedTime()).toBeCloseTo(0.4, 5); // (0.1 + 0.1) * 2.0
    });

    it('should accumulate clamped time, not raw time', () => {
      const timer = new DeltaTimer({ maxDelta: 0.05 });
      timer.tick(1.0);
      timer.tick(11.0); // Would add 10.0 without clamping
      expect(timer.getAccumulatedTime()).toBe(0.05);
    });
  });

  describe('Reset functionality', () => {
    it('should reset accumulated time to 0', () => {
      const timer = new DeltaTimer({ maxDelta: 1.0 });
      timer.tick(1.0);
      timer.tick(1.5);
      timer.reset();
      expect(timer.getAccumulatedTime()).toBe(0);
    });

    it('should return 0 on first tick after reset', () => {
      const timer = new DeltaTimer({ maxDelta: 1.0 });
      timer.tick(1.0);
      timer.tick(1.5);
      timer.reset();
      const dt = timer.tick(2.0);
      expect(dt).toBe(0);
    });

    it('should work correctly after reset', () => {
      const timer = new DeltaTimer({ maxDelta: 1.0 });
      timer.tick(1.0);
      timer.tick(1.5);
      timer.reset();
      timer.tick(2.0);
      const dt = timer.tick(2.1);
      expect(dt).toBeCloseTo(0.1, 5);
    });
  });

  describe('MaxDelta management', () => {
    it('should allow changing maxDelta', () => {
      timer.setMaxDelta(0.2);
      expect(timer.getMaxDelta()).toBe(0.2);
    });

    it('should apply new maxDelta immediately', () => {
      timer.tick(1.0);
      timer.setMaxDelta(0.1);
      const dt = timer.tick(2.0);
      expect(dt).toBe(0.1);
    });

    it('should clamp negative maxDelta to 0', () => {
      timer.setMaxDelta(-0.5);
      expect(timer.getMaxDelta()).toBe(0);
    });
  });
});

describe('FixedTimeStep', () => {
  let fixedStep;
  let updateCalls;
  let updateDeltas;
  let renderCalls;
  let renderAlphas;

  beforeEach(() => {
    fixedStep = new FixedTimeStep();
    updateCalls = 0;
    updateDeltas = [];
    renderCalls = 0;
    renderAlphas = [];
  });

  const updateFn = (dt) => {
    updateCalls++;
    updateDeltas.push(dt);
  };

  const renderFn = (alpha) => {
    renderCalls++;
    renderAlphas.push(alpha);
  };

  describe('Basic fixed timestep', () => {
    it('should return 0 steps on first tick', () => {
      const steps = fixedStep.tick(1.0, updateFn);
      expect(steps).toBe(0);
      expect(updateCalls).toBe(0);
    });

    it('should call updateFn once when one frame has passed', () => {
      const fps = 60;
      const dt = 1 / fps;
      fixedStep.tick(1.0, updateFn);
      fixedStep.tick(1.0 + dt + 0.001, updateFn); // Add small epsilon to ensure >= 1 frame
      expect(updateCalls).toBe(1);
    });

    it('should pass fixed dt to updateFn', () => {
      fixedStep.tick(1.0, updateFn);
      fixedStep.tick(2.0, updateFn); // Large time jump
      expect(updateDeltas[0]).toBeCloseTo(1/60, 5);
    });

    it('should call updateFn multiple times for large time steps', () => {
      fixedStep.tick(1.0, updateFn);
      fixedStep.tick(1.11, updateFn); // Would be 6+ frames, but clamped to 5 by maxAccumulatorSteps
      expect(updateCalls).toBe(5); // Default maxAccumulatorSteps is 5
    });

    it('should accumulate partial frames', () => {
      const dt = 1/60;
      fixedStep.tick(1.0, updateFn);
      fixedStep.tick(1.0 + dt * 0.5, updateFn); // Half frame
      expect(updateCalls).toBe(0);
      fixedStep.tick(1.0 + dt * 1.01, updateFn); // Now full frame accumulated
      expect(updateCalls).toBe(1);
    });
  });

  describe('Custom frame rate', () => {
    it('should support custom FPS', () => {
      const fixedStep30 = new FixedTimeStep({ fps: 30 });
      let calls = 0;
      let deltas = [];
      const fn = (dt) => { calls++; deltas.push(dt); };
      fixedStep30.tick(1.0, fn);
      fixedStep30.tick(1.0 + 1/30, fn);
      expect(calls).toBe(1);
      expect(deltas[0]).toBeCloseTo(1/30, 5);
    });

    it('should return correct fixed dt for custom FPS', () => {
      const fixedStep30 = new FixedTimeStep({ fps: 30 });
      expect(fixedStep30.getFixedDt()).toBeCloseTo(1/30, 5);
    });

    it('should handle 120 FPS', () => {
      const fixedStep120 = new FixedTimeStep({ fps: 120 });
      let calls = 0;
      const fn = () => calls++;
      fixedStep120.tick(1.0, fn);
      fixedStep120.tick(1.0 + 1/120 + 0.0001, fn); // Add epsilon
      expect(calls).toBe(1);
    });
  });

  describe('Render function and interpolation', () => {
    it('should call renderFn once per tick', () => {
      fixedStep.tick(1.0, updateFn, renderFn);
      fixedStep.tick(1.01, updateFn, renderFn);
      fixedStep.tick(1.02, updateFn, renderFn);
      expect(renderCalls).toBe(2); // First tick doesn't call renderFn with result
    });

    it('should provide valid alpha value', () => {
      fixedStep.tick(1.0, updateFn, renderFn);
      fixedStep.tick(1.0 + 1/60, updateFn, renderFn); // Exactly one frame
      // Alpha should be between 0 and 1 (represents accumulator / fixedDt)
      expect(renderAlphas[0]).toBeGreaterThanOrEqual(0);
      expect(renderAlphas[0]).toBeLessThan(1);
    });

    it('should provide 0 < alpha < 1 for partial frames', () => {
      const dt = 1/60;
      fixedStep.tick(1.0, updateFn, renderFn);
      fixedStep.tick(1.0 + dt * 0.5, updateFn, renderFn);
      expect(renderAlphas[0]).toBeGreaterThan(0);
      expect(renderAlphas[0]).toBeLessThan(1);
      expect(renderAlphas[0]).toBeCloseTo(0.5, 1);
    });

    it('should work without renderFn (optional parameter)', () => {
      expect(() => {
        fixedStep.tick(1.0, updateFn);
        fixedStep.tick(1.1, updateFn);
      }).not.toThrow();
    });
  });

  describe('Spiral of death prevention', () => {
    it('should clamp frame time to prevent excessive updates', () => {
      let calls = 0;
      const fn = () => calls++;
      fixedStep.tick(1.0, fn);
      fixedStep.tick(11.0, fn); // Huge jump (600 frames!)
      // Default maxAccumulatorSteps is 5
      expect(calls).toBeLessThanOrEqual(5);
    });

    it('should respect custom maxAccumulatorSteps', () => {
      const customStep = new FixedTimeStep({ maxAccumulatorSteps: 3 });
      let calls = 0;
      const fn = () => calls++;
      customStep.tick(1.0, fn);
      customStep.tick(11.0, fn);
      expect(calls).toBeLessThanOrEqual(3);
    });

    it('should allow setting maxAccumulatorSteps to higher value', () => {
      const customStep = new FixedTimeStep({ maxAccumulatorSteps: 10 });
      let calls = 0;
      const fn = () => calls++;
      customStep.tick(1.0, fn);
      customStep.tick(1.2, fn); // 12 frames at 60fps
      expect(calls).toBeLessThanOrEqual(10);
    });
  });

  describe('Reset functionality', () => {
    it('should clear accumulator on reset', () => {
      const dt = 1/60;
      let calls = 0;
      const fn = () => calls++;
      fixedStep.tick(1.0, fn);
      fixedStep.tick(1.0 + dt * 0.5, fn); // Half frame accumulated
      expect(calls).toBe(0);
      fixedStep.reset();
      fixedStep.tick(1.0, fn); // Should be treated as first tick
      expect(calls).toBe(0); // First tick after reset
    });

    it('should return 0 on first tick after reset', () => {
      let calls = 0;
      const fn = () => calls++;
      fixedStep.tick(1.0, fn);
      fixedStep.tick(1.1, fn);
      fixedStep.reset();
      const steps = fixedStep.tick(2.0, fn);
      expect(steps).toBe(0);
    });

    it('should work correctly after reset', () => {
      let calls = 0;
      const fn = () => calls++;
      fixedStep.tick(1.0, fn);
      fixedStep.tick(1.1, fn);
      const callsBefore = calls;
      fixedStep.reset();
      fixedStep.tick(2.0, fn);
      fixedStep.tick(2.0 + 1/60 + 0.001, fn);
      expect(calls).toBe(callsBefore + 1);
    });
  });

  describe('Return value accuracy', () => {
    it('should return number of update steps executed', () => {
      let calls = 0;
      const fn = () => calls++;
      fixedStep.tick(1.0, fn);
      const steps = fixedStep.tick(1.1, fn);
      expect(steps).toBe(calls);
    });

    it('should return 0 when no updates happen', () => {
      let calls = 0;
      const fn = () => calls++;
      fixedStep.tick(1.0, fn);
      const steps = fixedStep.tick(1.001, fn); // Too small
      expect(steps).toBe(0);
      expect(calls).toBe(0);
    });

    it('should return correct count for multiple frames', () => {
      let calls = 0;
      const fn = () => calls++;
      fixedStep.tick(1.0, fn);
      const steps = fixedStep.tick(1.0 + 1/60 * 3, fn);
      expect(steps).toBe(3);
      expect(calls).toBe(3);
    });
  });
});

describe('Time utility functions', () => {
  describe('msToSec', () => {
    it('should convert milliseconds to seconds', () => {
      expect(msToSec(1000)).toBe(1);
      expect(msToSec(500)).toBe(0.5);
      expect(msToSec(2500)).toBe(2.5);
    });

    it('should handle 0', () => {
      expect(msToSec(0)).toBe(0);
    });
  });

  describe('secToMs', () => {
    it('should convert seconds to milliseconds', () => {
      expect(secToMs(1)).toBe(1000);
      expect(secToMs(0.5)).toBe(500);
      expect(secToMs(2.5)).toBe(2500);
    });

    it('should handle 0', () => {
      expect(secToMs(0)).toBe(0);
    });
  });

  describe('framesToSec', () => {
    it('should convert frames to seconds at 60 FPS', () => {
      expect(framesToSec(60)).toBe(1);
      expect(framesToSec(30)).toBe(0.5);
      expect(framesToSec(120)).toBe(2);
    });

    it('should support custom FPS', () => {
      expect(framesToSec(30, 30)).toBe(1);
      expect(framesToSec(15, 30)).toBe(0.5);
    });

    it('should handle 0 frames', () => {
      expect(framesToSec(0)).toBe(0);
    });
  });

  describe('secToFrames', () => {
    it('should convert seconds to frames at 60 FPS', () => {
      expect(secToFrames(1)).toBe(60);
      expect(secToFrames(0.5)).toBe(30);
      expect(secToFrames(2)).toBe(120);
    });

    it('should support custom FPS', () => {
      expect(secToFrames(1, 30)).toBe(30);
      expect(secToFrames(2, 30)).toBe(60);
    });

    it('should floor partial frames', () => {
      expect(secToFrames(1.5 / 60)).toBe(1); // 1.5 frames -> 1
    });

    it('should handle 0 seconds', () => {
      expect(secToFrames(0)).toBe(0);
    });
  });

  describe('Round-trip conversions', () => {
    it('should convert ms -> sec -> ms correctly', () => {
      const original = 1234;
      expect(secToMs(msToSec(original))).toBe(original);
    });

    it('should convert frames -> sec -> frames correctly', () => {
      // Use a value divisible by 60 to avoid floating point issues
      const original = 120;
      expect(secToFrames(framesToSec(original))).toBe(original);
    });

    it('should handle frame conversion with rounding', () => {
      // Non-divisible values may have rounding errors
      const original = 123;
      const result = secToFrames(framesToSec(original));
      // Allow for floating point imprecision
      expect(Math.abs(result - original)).toBeLessThanOrEqual(1);
    });
  });
});
