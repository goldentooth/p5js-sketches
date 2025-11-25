import {
  createGrid,
  isInBounds,
  clampToBounds,
  wrapToBounds,
  wouldBeOutOfBounds,
  getNeighborsInBounds
} from '../src/';

describe('Grid', () => {
  it('should create a grid', () => {
    const grid = createGrid(5, 6);
    expect(grid.columns).toBe(5);
    expect(grid.rows).toBe(6);
  });
});

describe('Grid Bounds', () => {
  const bounds = { width: 10, height: 10 };

  describe('isInBounds', () => {
    it('should return true for coordinates within bounds', () => {
      expect(isInBounds(0, 0, bounds)).toBe(true);
      expect(isInBounds(5, 5, bounds)).toBe(true);
      expect(isInBounds(9, 9, bounds)).toBe(true);
    });

    it('should return false for coordinates outside bounds', () => {
      expect(isInBounds(-1, 0, bounds)).toBe(false);
      expect(isInBounds(0, -1, bounds)).toBe(false);
      expect(isInBounds(10, 0, bounds)).toBe(false);
      expect(isInBounds(0, 10, bounds)).toBe(false);
      expect(isInBounds(10, 10, bounds)).toBe(false);
    });
  });

  describe('clampToBounds', () => {
    it('should keep in-bounds coordinates unchanged', () => {
      const result = clampToBounds(5, 5, bounds);
      expect(result.x).toBe(5);
      expect(result.y).toBe(5);
    });

    it('should clamp negative coordinates to 0', () => {
      const result = clampToBounds(-5, -3, bounds);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should clamp coordinates exceeding bounds to max', () => {
      const result = clampToBounds(15, 12, bounds);
      expect(result.x).toBe(9);
      expect(result.y).toBe(9);
    });
  });

  describe('wrapToBounds', () => {
    it('should keep in-bounds coordinates unchanged', () => {
      const result = wrapToBounds(5, 5, bounds);
      expect(result.x).toBe(5);
      expect(result.y).toBe(5);
    });

    it('should wrap negative coordinates', () => {
      const result = wrapToBounds(-1, -1, bounds);
      expect(result.x).toBe(9);
      expect(result.y).toBe(9);
    });

    it('should wrap coordinates exceeding bounds', () => {
      const result = wrapToBounds(10, 11, bounds);
      expect(result.x).toBe(0);
      expect(result.y).toBe(1);
    });

    it('should wrap large negative coordinates', () => {
      const result = wrapToBounds(-15, -23, bounds);
      expect(result.x).toBe(5);
      expect(result.y).toBe(7);
    });
  });

  describe('wouldBeOutOfBounds', () => {
    it('should return false when delta keeps position in bounds', () => {
      expect(wouldBeOutOfBounds(5, 5, 1, 1, bounds)).toBe(false);
      expect(wouldBeOutOfBounds(5, 5, -1, -1, bounds)).toBe(false);
    });

    it('should return true when delta moves position out of bounds', () => {
      expect(wouldBeOutOfBounds(0, 0, -1, 0, bounds)).toBe(true);
      expect(wouldBeOutOfBounds(9, 9, 1, 1, bounds)).toBe(true);
      expect(wouldBeOutOfBounds(5, 0, 0, -1, bounds)).toBe(true);
    });
  });

  describe('getNeighborsInBounds', () => {
    it('should return 4 cardinal neighbors for center position', () => {
      const neighbors = getNeighborsInBounds(5, 5, bounds, false);
      expect(neighbors.length).toBe(4);
    });

    it('should return 8 neighbors including diagonals for center position', () => {
      const neighbors = getNeighborsInBounds(5, 5, bounds, true);
      expect(neighbors.length).toBe(8);
    });

    it('should return only in-bounds neighbors for corner position', () => {
      const neighbors = getNeighborsInBounds(0, 0, bounds, false);
      expect(neighbors.length).toBe(2);
      expect(neighbors).toContainEqual({ x: 1, y: 0 });
      expect(neighbors).toContainEqual({ x: 0, y: 1 });
    });

    it('should return only in-bounds diagonal neighbors for corner', () => {
      const neighbors = getNeighborsInBounds(0, 0, bounds, true);
      expect(neighbors.length).toBe(3);
      expect(neighbors).toContainEqual({ x: 1, y: 0 });
      expect(neighbors).toContainEqual({ x: 0, y: 1 });
      expect(neighbors).toContainEqual({ x: 1, y: 1 });
    });

    it('should return edge neighbors correctly', () => {
      const neighbors = getNeighborsInBounds(0, 5, bounds, false);
      expect(neighbors.length).toBe(3); // right, up, down
    });
  });
});
