import { describe, it, expect } from 'vitest';
import { permissiveFov, cellKey } from '../src';

function createTestMap(width, height, edgeBehavior = 'block') {
  const tiles = Array(height)
    .fill(0)
    .map(() => Array(width).fill(0));

  return {
    width,
    height,
    edgeBehavior,
    tiles,

    isInBounds(x, y) {
      return x >= 0 && x < width && y >= 0 && y < height;
    },

    blocksVision(x, y) {
      if (!this.isInBounds(x, y)) return true;
      return tiles[y][x] === 1;
    },

    setWall(x, y) {
      if (this.isInBounds(x, y)) {
        tiles[y][x] = 1;
      }
    },
  };
}

describe('Permissive FOV - Basic Visibility', () => {
  it('should always see the origin cell', () => {
    const map = createTestMap(10, 10);
    const result = permissiveFov(map, 5, 5, 5);

    expect(result.visibleCells.has(cellKey(5, 5))).toBe(true);
  });

  it('should see cells in empty room', () => {
    const map = createTestMap(21, 21);
    const result = permissiveFov(map, 10, 10, 5);

    expect(result.visibleCells.has(cellKey(10, 5))).toBe(true);
    expect(result.visibleCells.has(cellKey(10, 15))).toBe(true);
    expect(result.visibleCells.has(cellKey(5, 10))).toBe(true);
    expect(result.visibleCells.has(cellKey(15, 10))).toBe(true);

    expect(result.cells.length).toBeGreaterThan(50);
  });

  it('should not see beyond range', () => {
    const map = createTestMap(50, 50);
    const result = permissiveFov(map, 25, 25, 5);

    expect(result.visibleCells.has(cellKey(25, 15))).toBe(false);
    expect(result.visibleCells.has(cellKey(35, 25))).toBe(false);
  });
});

describe('Permissive FOV - Permissiveness Levels', () => {
  it('should be restrictive at permissiveness 0', () => {
    const map = createTestMap(20, 20);
    map.setWall(12, 10);

    const result = permissiveFov(map, 10, 10, 10, 0);

    // At level 0, should be very restrictive
    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);

    // Check that we have some visibility
    expect(result.cells.length).toBeGreaterThan(10);
  });

  it('should be balanced at permissiveness 4', () => {
    const map = createTestMap(20, 20);
    map.setWall(12, 10);

    const result = permissiveFov(map, 10, 10, 10, 4);

    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);
    expect(result.cells.length).toBeGreaterThan(20);
  });

  it('should be very permissive at level 8', () => {
    const map = createTestMap(20, 20);
    map.setWall(12, 10);

    const result = permissiveFov(map, 10, 10, 10, 8);

    // At level 8, should see around obstacles well
    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);
    expect(result.cells.length).toBeGreaterThan(30);
  });

  it('should see more cells as permissiveness increases', () => {
    const map = createTestMap(30, 30);

    // Add some obstacles
    map.setWall(15, 15);
    map.setWall(16, 15);
    map.setWall(15, 16);

    const result0 = permissiveFov(map, 10, 10, 15, 0);
    const result4 = permissiveFov(map, 10, 10, 15, 4);
    const result8 = permissiveFov(map, 10, 10, 15, 8);

    // Higher permissiveness should generally see more cells
    expect(result4.cells.length).toBeGreaterThanOrEqual(result0.cells.length);
    expect(result8.cells.length).toBeGreaterThanOrEqual(result4.cells.length);
  });
});

describe('Permissive FOV - Wall Blocking', () => {
  it('should handle single wall', () => {
    const map = createTestMap(20, 20);
    map.setWall(10, 8);

    const result = permissiveFov(map, 10, 10, 10, 4);

    expect(result.visibleCells.has(cellKey(10, 8))).toBe(true);
  });

  it('should handle horizontal wall', () => {
    const map = createTestMap(20, 20);

    for (let x = 8; x <= 12; x++) {
      map.setWall(x, 8);
    }

    const result = permissiveFov(map, 10, 10, 10, 4);

    expect(result.visibleCells.has(cellKey(10, 8))).toBe(true);
  });

  it('should handle vertical wall', () => {
    const map = createTestMap(20, 20);

    for (let y = 8; y <= 12; y++) {
      map.setWall(12, y);
    }

    const result = permissiveFov(map, 10, 10, 10, 4);

    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);
  });
});

describe('Permissive FOV - Corner Peeking', () => {
  it('should handle corner peeking based on permissiveness', () => {
    const map = createTestMap(20, 20);

    map.setWall(12, 10);
    map.setWall(12, 11);
    map.setWall(12, 12);

    const resultLow = permissiveFov(map, 10, 10, 10, 0);
    const resultHigh = permissiveFov(map, 10, 10, 10, 8);

    // Both should see the wall
    expect(resultLow.visibleCells.has(cellKey(12, 10))).toBe(true);
    expect(resultHigh.visibleCells.has(cellKey(12, 10))).toBe(true);

    // High permissiveness should see more around corners
    expect(resultHigh.cells.length).toBeGreaterThanOrEqual(
      resultLow.cells.length
    );
  });
});

describe('Permissive FOV - Pillar Handling', () => {
  it('should handle 1x1 pillar', () => {
    const map = createTestMap(20, 20);
    map.setWall(12, 10);

    const result = permissiveFov(map, 10, 10, 10, 4);

    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);
  });

  it('should handle 2x2 pillar', () => {
    const map = createTestMap(20, 20);

    map.setWall(12, 10);
    map.setWall(13, 10);
    map.setWall(12, 11);
    map.setWall(13, 11);

    const result = permissiveFov(map, 10, 10, 10, 4);

    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);
  });
});

describe('Permissive FOV - Edge Behavior', () => {
  it('should handle block mode edges', () => {
    const map = createTestMap(10, 10, 'block');
    const result = permissiveFov(map, 5, 5, 10, 4);

    expect(result.visibleCells.has(cellKey(-1, 5))).toBe(false);
    expect(result.visibleCells.has(cellKey(10, 5))).toBe(false);
  });

  it('should handle corner positions', () => {
    const map = createTestMap(10, 10, 'block');
    const result = permissiveFov(map, 0, 0, 5, 4);

    expect(result.visibleCells.has(cellKey(0, 0))).toBe(true);
    expect(result.visibleCells.has(cellKey(1, 0))).toBe(true);
  });
});

describe('Permissive FOV - Parameter Validation', () => {
  it('should clamp permissiveness to valid range', () => {
    const map = createTestMap(20, 20);

    // Negative should be treated as 0
    const resultNeg = permissiveFov(map, 10, 10, 5, -5);
    expect(resultNeg.cells.length).toBeGreaterThan(0);

    // >8 should be treated as 8
    const resultHigh = permissiveFov(map, 10, 10, 5, 15);
    expect(resultHigh.cells.length).toBeGreaterThan(0);
  });

  it('should use default permissiveness if not specified', () => {
    const map = createTestMap(20, 20);
    const result = permissiveFov(map, 10, 10, 5);

    expect(result.cells.length).toBeGreaterThan(0);
  });
});

describe('Permissive FOV - Range Variations', () => {
  it('should handle small range', () => {
    const map = createTestMap(10, 10);
    const result = permissiveFov(map, 5, 5, 1, 4);

    expect(result.visibleCells.has(cellKey(5, 5))).toBe(true);
    expect(result.cells.length).toBeGreaterThan(0);
  });

  it('should handle medium range', () => {
    const map = createTestMap(50, 50);
    const result = permissiveFov(map, 25, 25, 10, 4);

    expect(result.cells.length).toBeGreaterThan(50);
  });
});

describe('Permissive FOV - Data Structure', () => {
  it('should return both Set and Array', () => {
    const map = createTestMap(20, 20);
    const result = permissiveFov(map, 10, 10, 5, 4);

    expect(result.visibleCells).toBeInstanceOf(Set);
    expect(Array.isArray(result.cells)).toBe(true);
    expect(result.visibleCells.size).toBe(result.cells.length);
  });

  it('should not have duplicates', () => {
    const map = createTestMap(20, 20);
    const result = permissiveFov(map, 10, 10, 5, 4);

    const seen = new Set();
    for (const cell of result.cells) {
      const key = cellKey(cell.x, cell.y);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
