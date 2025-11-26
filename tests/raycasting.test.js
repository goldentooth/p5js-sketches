import { describe, it, expect } from 'vitest';
import { raycasting, cellKey } from '../src';

/**
 * Simple test map implementation
 */
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

    setFloor(x, y) {
      if (this.isInBounds(x, y)) {
        tiles[y][x] = 0;
      }
    },
  };
}

describe('Raycasting - Basic Visibility', () => {
  it('should always see the origin cell', () => {
    const map = createTestMap(10, 10);
    const result = raycasting(map, 5, 5, 5);

    expect(result.visibleCells.has(cellKey(5, 5))).toBe(true);
    expect(result.cells).toContainEqual({ x: 5, y: 5 });
  });

  it('should see cells in empty room within range', () => {
    const map = createTestMap(21, 21);
    const result = raycasting(map, 10, 10, 5);

    // Should see cells within range
    expect(result.visibleCells.has(cellKey(10, 5))).toBe(true); // North
    expect(result.visibleCells.has(cellKey(10, 15))).toBe(true); // South
    expect(result.visibleCells.has(cellKey(5, 10))).toBe(true); // West
    expect(result.visibleCells.has(cellKey(15, 10))).toBe(true); // East

    // Should have reasonable coverage
    expect(result.cells.length).toBeGreaterThan(80);
  });

  it('should not see beyond range', () => {
    const map = createTestMap(50, 50);
    const result = raycasting(map, 25, 25, 5);

    // Cells well outside range should not be visible
    expect(result.visibleCells.has(cellKey(25, 15))).toBe(false);
    expect(result.visibleCells.has(cellKey(35, 25))).toBe(false);
  });

  it('should see cells at range limit', () => {
    const map = createTestMap(30, 30);
    const range = 5;
    const result = raycasting(map, 15, 15, range);

    // Check cardinal directions at range
    expect(result.visibleCells.has(cellKey(15, 10))).toBe(true); // 5 north
    expect(result.visibleCells.has(cellKey(15, 20))).toBe(true); // 5 south
    expect(result.visibleCells.has(cellKey(10, 15))).toBe(true); // 5 west
    expect(result.visibleCells.has(cellKey(20, 15))).toBe(true); // 5 east
  });
});

describe('Raycasting - Wall Blocking', () => {
  it('should block vision with single wall', () => {
    const map = createTestMap(20, 20);
    map.setWall(10, 8);

    const result = raycasting(map, 10, 10, 10);

    // Should see the wall
    expect(result.visibleCells.has(cellKey(10, 8))).toBe(true);

    // Should NOT see directly behind wall
    expect(result.visibleCells.has(cellKey(10, 7))).toBe(false);
  });

  it('should create shadow behind wall', () => {
    const map = createTestMap(20, 20);
    map.setWall(13, 10);

    const result = raycasting(map, 10, 10, 10);

    // Wall is visible
    expect(result.visibleCells.has(cellKey(13, 10))).toBe(true);

    // Directly behind wall should be shadowed
    expect(result.visibleCells.has(cellKey(14, 10))).toBe(false);
    expect(result.visibleCells.has(cellKey(15, 10))).toBe(false);
  });

  it('should handle horizontal wall', () => {
    const map = createTestMap(20, 20);

    for (let x = 8; x <= 12; x++) {
      map.setWall(x, 8);
    }

    const result = raycasting(map, 10, 10, 10);

    // Should see the wall
    expect(result.visibleCells.has(cellKey(10, 8))).toBe(true);

    // Should NOT see directly behind wall
    expect(result.visibleCells.has(cellKey(10, 7))).toBe(false);
  });

  it('should handle vertical wall', () => {
    const map = createTestMap(20, 20);

    for (let y = 8; y <= 12; y++) {
      map.setWall(12, y);
    }

    const result = raycasting(map, 10, 10, 10);

    // Should see the wall
    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);

    // Should NOT see directly behind wall
    expect(result.visibleCells.has(cellKey(13, 10))).toBe(false);
  });
});

describe('Raycasting - Pillars', () => {
  it('should handle 1x1 pillar', () => {
    const map = createTestMap(20, 20);
    map.setWall(12, 10);

    const result = raycasting(map, 10, 10, 10);

    // Pillar is visible
    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);

    // Should see around pillar
    expect(result.visibleCells.has(cellKey(13, 9))).toBe(true);
    expect(result.visibleCells.has(cellKey(13, 11))).toBe(true);
  });

  it('should handle 2x2 pillar', () => {
    const map = createTestMap(20, 20);

    map.setWall(12, 10);
    map.setWall(13, 10);
    map.setWall(12, 11);
    map.setWall(13, 11);

    const result = raycasting(map, 10, 10, 10);

    // Should see at least part of pillar
    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);

    // Creates shadow
    expect(result.visibleCells.has(cellKey(14, 10))).toBe(false);
  });

  it('should handle 3x3 pillar', () => {
    const map = createTestMap(30, 30);

    for (let dx = 0; dx < 3; dx++) {
      for (let dy = 0; dy < 3; dy++) {
        map.setWall(15 + dx, 15 + dy);
      }
    }

    const result = raycasting(map, 10, 10, 20);

    // Pillar is visible
    expect(result.visibleCells.has(cellKey(15, 15))).toBe(true);

    // Some cells should be shadowed
    const shadowedCells = [
      cellKey(18, 15),
      cellKey(18, 16),
      cellKey(19, 16),
    ];

    const blockedCount = shadowedCells.filter(
      (key) => !result.visibleCells.has(key)
    ).length;

    expect(blockedCount).toBeGreaterThan(0);
  });
});

describe('Raycasting - Edge Behavior', () => {
  it('should treat edges as blocking in block mode', () => {
    const map = createTestMap(10, 10, 'block');
    const result = raycasting(map, 5, 5, 10);

    // Should not see beyond edges
    expect(result.visibleCells.has(cellKey(-1, 5))).toBe(false);
    expect(result.visibleCells.has(cellKey(10, 5))).toBe(false);
  });

  it('should handle position at map edge', () => {
    const map = createTestMap(10, 10, 'block');
    const result = raycasting(map, 0, 0, 5);

    // Should see origin
    expect(result.visibleCells.has(cellKey(0, 0))).toBe(true);

    // Should see cells in valid directions
    expect(result.visibleCells.has(cellKey(1, 0))).toBe(true);
    expect(result.visibleCells.has(cellKey(0, 1))).toBe(true);
  });

  it('should handle wrapping in wrap mode', () => {
    const map = createTestMap(10, 10, 'wrap');
    const result = raycasting(map, 1, 1, 3);

    // Should complete without errors
    expect(result.visibleCells.size).toBeGreaterThan(0);
  });
});

describe('Raycasting - Range Variations', () => {
  it('should handle small range', () => {
    const map = createTestMap(10, 10);
    const result = raycasting(map, 5, 5, 1);

    expect(result.visibleCells.has(cellKey(5, 5))).toBe(true);
    expect(result.cells.length).toBeGreaterThan(1);
  });

  it('should handle medium range', () => {
    const map = createTestMap(50, 50);
    const result = raycasting(map, 25, 25, 10);

    expect(result.cells.length).toBeGreaterThan(200);
  });

  it('should handle large range', () => {
    const map = createTestMap(80, 80);
    const result = raycasting(map, 40, 40, 20);

    expect(result.cells.length).toBeGreaterThan(800);
  });
});

describe('Raycasting - Data Structure', () => {
  it('should return both Set and Array', () => {
    const map = createTestMap(20, 20);
    const result = raycasting(map, 10, 10, 5);

    expect(result.visibleCells).toBeInstanceOf(Set);
    expect(Array.isArray(result.cells)).toBe(true);
    expect(result.visibleCells.size).toBe(result.cells.length);
  });

  it('should not have duplicate cells', () => {
    const map = createTestMap(20, 20);
    const result = raycasting(map, 10, 10, 5);

    const seen = new Set();
    for (const cell of result.cells) {
      const key = cellKey(cell.x, cell.y);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
