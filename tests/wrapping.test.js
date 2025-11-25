import { describe, it, expect } from 'vitest';
import { wrapCoordinate, normalizeCoordinates } from '../src/grid/wrapping';

describe('wrapCoordinate', () => {
  describe('positive values', () => {
    it('should return value unchanged when within range', () => {
      expect(wrapCoordinate(5, 10)).toBe(5);
      expect(wrapCoordinate(0, 10)).toBe(0);
      expect(wrapCoordinate(9, 10)).toBe(9);
    });

    it('should wrap value at exact boundary', () => {
      expect(wrapCoordinate(10, 10)).toBe(0);
      expect(wrapCoordinate(20, 10)).toBe(0);
      expect(wrapCoordinate(30, 10)).toBe(0);
    });

    it('should wrap value beyond boundary', () => {
      expect(wrapCoordinate(11, 10)).toBe(1);
      expect(wrapCoordinate(15, 10)).toBe(5);
      expect(wrapCoordinate(25, 10)).toBe(5);
    });
  });

  describe('negative values', () => {
    it('should wrap negative values correctly', () => {
      expect(wrapCoordinate(-1, 10)).toBe(9);
      expect(wrapCoordinate(-2, 10)).toBe(8);
      expect(wrapCoordinate(-10, 10)).toBe(0);
    });

    it('should wrap large negative values', () => {
      expect(wrapCoordinate(-11, 10)).toBe(9);
      expect(wrapCoordinate(-15, 10)).toBe(5);
      expect(wrapCoordinate(-21, 10)).toBe(9);
    });
  });

  describe('edge cases', () => {
    it('should handle single cell grid', () => {
      expect(wrapCoordinate(0, 1)).toBe(0);
      expect(wrapCoordinate(1, 1)).toBe(0);
      expect(wrapCoordinate(-1, 1)).toBe(0);
    });

    it('should handle large grids', () => {
      expect(wrapCoordinate(99, 100)).toBe(99);
      expect(wrapCoordinate(100, 100)).toBe(0);
      expect(wrapCoordinate(-1, 100)).toBe(99);
    });
  });
});

describe('normalizeCoordinates', () => {
  describe('wrap behavior', () => {
    it('should wrap both coordinates when out of bounds', () => {
      const result = normalizeCoordinates(-1, -1, 10, 10, 'wrap');
      expect(result).toEqual({ x: 9, y: 9 });
    });

    it('should wrap only x coordinate when out of bounds', () => {
      const result = normalizeCoordinates(-1, 5, 10, 10, 'wrap');
      expect(result).toEqual({ x: 9, y: 5 });
    });

    it('should wrap only y coordinate when out of bounds', () => {
      const result = normalizeCoordinates(5, -1, 10, 10, 'wrap');
      expect(result).toEqual({ x: 5, y: 9 });
    });

    it('should leave in-bounds coordinates unchanged', () => {
      const result = normalizeCoordinates(5, 5, 10, 10, 'wrap');
      expect(result).toEqual({ x: 5, y: 5 });
    });

    it('should wrap coordinates at upper boundary', () => {
      const result = normalizeCoordinates(10, 10, 10, 10, 'wrap');
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should wrap coordinates beyond upper boundary', () => {
      const result = normalizeCoordinates(15, 12, 10, 10, 'wrap');
      expect(result).toEqual({ x: 5, y: 2 });
    });

    it('should handle non-square grids', () => {
      const result = normalizeCoordinates(-1, -1, 20, 10, 'wrap');
      expect(result).toEqual({ x: 19, y: 9 });
    });

    it('should wrap large negative values', () => {
      const result = normalizeCoordinates(-25, -15, 10, 10, 'wrap');
      expect(result).toEqual({ x: 5, y: 5 });
    });
  });

  describe('block behavior', () => {
    it('should return coordinates unchanged regardless of bounds', () => {
      expect(normalizeCoordinates(-1, -1, 10, 10, 'block')).toEqual({ x: -1, y: -1 });
      expect(normalizeCoordinates(5, 5, 10, 10, 'block')).toEqual({ x: 5, y: 5 });
      expect(normalizeCoordinates(15, 15, 10, 10, 'block')).toEqual({ x: 15, y: 15 });
    });

    it('should not wrap at boundaries', () => {
      expect(normalizeCoordinates(10, 10, 10, 10, 'block')).toEqual({ x: 10, y: 10 });
      expect(normalizeCoordinates(-5, -5, 10, 10, 'block')).toEqual({ x: -5, y: -5 });
    });

    it('should handle zero coordinates', () => {
      expect(normalizeCoordinates(0, 0, 10, 10, 'block')).toEqual({ x: 0, y: 0 });
    });
  });

  describe('edge cases', () => {
    it('should handle single cell grid with wrap', () => {
      expect(normalizeCoordinates(5, -3, 1, 1, 'wrap')).toEqual({ x: 0, y: 0 });
    });

    it('should handle single cell grid with block', () => {
      expect(normalizeCoordinates(5, -3, 1, 1, 'block')).toEqual({ x: 5, y: -3 });
    });

    it('should handle large grids', () => {
      const result = normalizeCoordinates(150, 75, 100, 100, 'wrap');
      expect(result).toEqual({ x: 50, y: 75 });
    });
  });
});

describe('integration scenarios', () => {
  it('should correctly combine wrapping and bounds checking', () => {
    // Scenario: Wrapped coordinates should be valid within the grid dimensions
    const x = -1;
    const y = 5;
    const width = 10;
    const height = 10;

    const wrapped = normalizeCoordinates(x, y, width, height, 'wrap');
    // Wrapped coordinates should be within [0, width) and [0, height)
    expect(wrapped.x).toBeGreaterThanOrEqual(0);
    expect(wrapped.x).toBeLessThan(width);
    expect(wrapped.y).toBeGreaterThanOrEqual(0);
    expect(wrapped.y).toBeLessThan(height);
  });

  it('should handle wrapping at all four edges', () => {
    const width = 10;
    const height = 10;

    // West edge
    expect(normalizeCoordinates(-1, 5, width, height, 'wrap')).toEqual({ x: 9, y: 5 });
    // East edge
    expect(normalizeCoordinates(10, 5, width, height, 'wrap')).toEqual({ x: 0, y: 5 });
    // North edge
    expect(normalizeCoordinates(5, -1, width, height, 'wrap')).toEqual({ x: 5, y: 9 });
    // South edge
    expect(normalizeCoordinates(5, 10, width, height, 'wrap')).toEqual({ x: 5, y: 0 });
  });

  it('should handle diagonal wrapping at corners', () => {
    const width = 10;
    const height = 10;

    // Northwest corner
    expect(normalizeCoordinates(-1, -1, width, height, 'wrap')).toEqual({ x: 9, y: 9 });
    // Northeast corner
    expect(normalizeCoordinates(10, -1, width, height, 'wrap')).toEqual({ x: 0, y: 9 });
    // Southwest corner
    expect(normalizeCoordinates(-1, 10, width, height, 'wrap')).toEqual({ x: 9, y: 0 });
    // Southeast corner
    expect(normalizeCoordinates(10, 10, width, height, 'wrap')).toEqual({ x: 0, y: 0 });
  });
});
