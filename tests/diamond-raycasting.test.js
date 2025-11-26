import { describe, it, expect } from 'vitest';
import { diamondRaycasting, cellKey } from '../src';

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

describe('Diamond Raycasting - Basic Visibility', () => {
  it('should always see the origin cell', () => {
    const map = createTestMap(10, 10);
    const result = diamondRaycasting(map, 5, 5, 5);

    expect(result.visibleCells.has(cellKey(5, 5))).toBe(true);
  });

  it('should see cells in empty room', () => {
    const map = createTestMap(21, 21);
    const result = diamondRaycasting(map, 10, 10, 5);

    expect(result.visibleCells.has(cellKey(10, 5))).toBe(true);
    expect(result.visibleCells.has(cellKey(10, 15))).toBe(true);
    expect(result.visibleCells.has(cellKey(5, 10))).toBe(true);
    expect(result.visibleCells.has(cellKey(15, 10))).toBe(true);

    expect(result.cells.length).toBeGreaterThan(80);
  });

  it('should not see beyond range', () => {
    const map = createTestMap(50, 50);
    const result = diamondRaycasting(map, 25, 25, 5);

    expect(result.visibleCells.has(cellKey(25, 15))).toBe(false);
    expect(result.visibleCells.has(cellKey(35, 25))).toBe(false);
  });
});

describe('Diamond Raycasting - Wall Blocking', () => {
  it('should block vision with single wall', () => {
    const map = createTestMap(20, 20);
    map.setWall(10, 8);

    const result = diamondRaycasting(map, 10, 10, 10);

    expect(result.visibleCells.has(cellKey(10, 8))).toBe(true);
    expect(result.visibleCells.has(cellKey(10, 7))).toBe(false);
  });

  it('should create minimal shadow behind wall', () => {
    const map = createTestMap(20, 20);
    map.setWall(13, 10);

    const result = diamondRaycasting(map, 10, 10, 10);

    // Wall is visible
    expect(result.visibleCells.has(cellKey(13, 10))).toBe(true);

    // Diamond raycasting creates smaller shadows
    // At least the cell directly behind should be blocked
    expect(result.visibleCells.has(cellKey(14, 10))).toBe(false);
  });

  it('should handle horizontal wall', () => {
    const map = createTestMap(20, 20);

    for (let x = 8; x <= 12; x++) {
      map.setWall(x, 8);
    }

    const result = diamondRaycasting(map, 10, 10, 10);

    expect(result.visibleCells.has(cellKey(10, 8))).toBe(true);
    expect(result.visibleCells.has(cellKey(10, 7))).toBe(false);
  });
});

describe('Diamond Raycasting - Corner Peeking', () => {
  it('should allow corner peeking', () => {
    const map = createTestMap(20, 20);

    // Create L-shaped wall
    map.setWall(12, 10);
    map.setWall(12, 11);
    map.setWall(12, 12);

    const result = diamondRaycasting(map, 10, 10, 10);

    // Should see around corner better than basic algorithms
    expect(result.visibleCells.has(cellKey(11, 11))).toBe(true);
    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);
  });

  it('should peek around 1x1 pillar', () => {
    const map = createTestMap(20, 20);
    map.setWall(12, 10);

    const result = diamondRaycasting(map, 10, 10, 10);

    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);

    // Diamond allows seeing around obstacles
    expect(result.visibleCells.has(cellKey(13, 9))).toBe(true);
    expect(result.visibleCells.has(cellKey(13, 11))).toBe(true);
  });
});

describe('Diamond Raycasting - Characteristics', () => {
  it('should be more permissive than basic raycasting', () => {
    const map = createTestMap(30, 30);

    // Place obstacles
    map.setWall(15, 15);
    map.setWall(15, 16);

    const result = diamondRaycasting(map, 10, 10, 20);

    // Diamond raycasting should see more cells around obstacles
    expect(result.cells.length).toBeGreaterThan(100);
  });

  it('should handle minimal shadow from single cell', () => {
    const map = createTestMap(20, 20);
    map.setWall(15, 10);

    const result = diamondRaycasting(map, 10, 10, 10);

    // Wall blocks vision
    expect(result.visibleCells.has(cellKey(15, 10))).toBe(true);

    // But can see around it due to edge targeting
    expect(result.visibleCells.has(cellKey(16, 9))).toBe(true);
    expect(result.visibleCells.has(cellKey(16, 11))).toBe(true);
  });
});

describe('Diamond Raycasting - Edge Behavior', () => {
  it('should handle block mode edges', () => {
    const map = createTestMap(10, 10, 'block');
    const result = diamondRaycasting(map, 5, 5, 10);

    expect(result.visibleCells.has(cellKey(-1, 5))).toBe(false);
    expect(result.visibleCells.has(cellKey(10, 5))).toBe(false);
  });

  it('should handle corner positions', () => {
    const map = createTestMap(10, 10, 'block');
    const result = diamondRaycasting(map, 0, 0, 5);

    expect(result.visibleCells.has(cellKey(0, 0))).toBe(true);
    expect(result.visibleCells.has(cellKey(1, 0))).toBe(true);
  });
});

describe('Diamond Raycasting - Data Structure', () => {
  it('should return both Set and Array', () => {
    const map = createTestMap(20, 20);
    const result = diamondRaycasting(map, 10, 10, 5);

    expect(result.visibleCells).toBeInstanceOf(Set);
    expect(Array.isArray(result.cells)).toBe(true);
    expect(result.visibleCells.size).toBe(result.cells.length);
  });

  it('should not have duplicates', () => {
    const map = createTestMap(20, 20);
    const result = diamondRaycasting(map, 10, 10, 5);

    const seen = new Set();
    for (const cell of result.cells) {
      const key = cellKey(cell.x, cell.y);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
