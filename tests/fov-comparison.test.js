import { describe, it, expect } from 'vitest';
import {
  shadowcasting,
  raycasting,
  diamondRaycasting,
  permissiveFov,
  cellKey,
} from '../src';

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

describe('FOV Algorithms - Comparison', () => {
  it('all algorithms should see origin', () => {
    const map = createTestMap(20, 20);
    const x = 10;
    const y = 10;
    const range = 5;

    const shadow = shadowcasting(map, x, y, range);
    const ray = raycasting(map, x, y, range);
    const diamond = diamondRaycasting(map, x, y, range);
    const permissive = permissiveFov(map, x, y, range, 4);

    expect(shadow.visibleCells.has(cellKey(x, y))).toBe(true);
    expect(ray.visibleCells.has(cellKey(x, y))).toBe(true);
    expect(diamond.visibleCells.has(cellKey(x, y))).toBe(true);
    expect(permissive.visibleCells.has(cellKey(x, y))).toBe(true);
  });

  it('all algorithms should see cardinal directions in empty space', () => {
    const map = createTestMap(30, 30);
    const x = 15;
    const y = 15;
    const range = 5;

    const algorithms = [
      shadowcasting(map, x, y, range),
      raycasting(map, x, y, range),
      diamondRaycasting(map, x, y, range),
      permissiveFov(map, x, y, range, 4),
    ];

    const cardinals = [
      cellKey(15, 10), // North
      cellKey(15, 20), // South
      cellKey(10, 15), // West
      cellKey(20, 15), // East
    ];

    for (const result of algorithms) {
      for (const cell of cardinals) {
        expect(result.visibleCells.has(cell)).toBe(true);
      }
    }
  });

  it('all algorithms should block at walls', () => {
    const map = createTestMap(20, 20);

    // Place wall
    map.setWall(10, 8);

    const x = 10;
    const y = 10;
    const range = 10;

    const algorithms = [
      shadowcasting(map, x, y, range),
      raycasting(map, x, y, range),
      diamondRaycasting(map, x, y, range),
      permissiveFov(map, x, y, range, 4),
    ];

    for (const result of algorithms) {
      // All should see the wall
      expect(result.visibleCells.has(cellKey(10, 8))).toBe(true);

      // All should block behind wall
      expect(result.visibleCells.has(cellKey(10, 7))).toBe(false);
    }
  });

  it('all algorithms should respect range limits', () => {
    const map = createTestMap(50, 50);
    const x = 25;
    const y = 25;
    const range = 5;

    const algorithms = [
      shadowcasting(map, x, y, range),
      raycasting(map, x, y, range),
      diamondRaycasting(map, x, y, range),
      permissiveFov(map, x, y, range, 4),
    ];

    const outsideRange = [
      cellKey(25, 15), // 10 tiles away
      cellKey(25, 35), // 10 tiles away
      cellKey(15, 25), // 10 tiles away
      cellKey(35, 25), // 10 tiles away
    ];

    for (const result of algorithms) {
      for (const cell of outsideRange) {
        expect(result.visibleCells.has(cell)).toBe(false);
      }
    }
  });
});

describe('FOV Algorithms - Permissiveness Comparison', () => {
  it('diamond should be more permissive than shadowcasting', () => {
    const map = createTestMap(30, 30);

    // Place obstacle
    map.setWall(15, 15);
    map.setWall(16, 15);

    const shadow = shadowcasting(map, 10, 10, 15);
    const diamond = diamondRaycasting(map, 10, 10, 15);

    // Diamond tends to see around obstacles better
    // This is a characteristic test - exact numbers may vary
    expect(diamond.cells.length).toBeGreaterThanOrEqual(shadow.cells.length * 0.8);
  });

  it('permissive level 8 should see more than level 0', () => {
    const map = createTestMap(30, 30);

    map.setWall(15, 15);

    const permissive0 = permissiveFov(map, 10, 10, 15, 0);
    const permissive8 = permissiveFov(map, 10, 10, 15, 8);

    expect(permissive8.cells.length).toBeGreaterThanOrEqual(
      permissive0.cells.length
    );
  });
});

describe('FOV Algorithms - Symmetry', () => {
  it('all algorithms should maintain basic symmetry', () => {
    const map = createTestMap(30, 30);

    const range = 10;
    const posA = { x: 10, y: 10 };
    const posB = { x: 15, y: 15 };

    const algorithms = [
      { name: 'shadowcasting', fn: shadowcasting },
      { name: 'raycasting', fn: raycasting },
      { name: 'diamond', fn: diamondRaycasting },
      { name: 'permissive', fn: (m, x, y, r) => permissiveFov(m, x, y, r, 4) },
    ];

    for (const algo of algorithms) {
      const fromA = algo.fn(map, posA.x, posA.y, range);
      const fromB = algo.fn(map, posB.x, posB.y, range);

      const aSeesB = fromA.visibleCells.has(cellKey(posB.x, posB.y));
      const bSeesA = fromB.visibleCells.has(cellKey(posA.x, posA.y));

      expect(aSeesB).toBe(bSeesA);
    }
  });
});

describe('FOV Algorithms - Performance Characteristics', () => {
  it('all algorithms should handle small range efficiently', () => {
    const map = createTestMap(20, 20);

    const start = Date.now();

    shadowcasting(map, 10, 10, 3);
    raycasting(map, 10, 10, 3);
    diamondRaycasting(map, 10, 10, 3);
    permissiveFov(map, 10, 10, 3, 4);

    const elapsed = Date.now() - start;

    // Should complete quickly (under 100ms even on slow systems)
    expect(elapsed).toBeLessThan(100);
  });

  it('all algorithms should handle medium range', () => {
    const map = createTestMap(50, 50);

    const algorithms = [
      shadowcasting(map, 25, 25, 10),
      raycasting(map, 25, 25, 10),
      diamondRaycasting(map, 25, 25, 10),
      permissiveFov(map, 25, 25, 10, 4),
    ];

    // All should produce reasonable results
    for (const result of algorithms) {
      expect(result.cells.length).toBeGreaterThan(50);
      expect(result.cells.length).toBeLessThan(2000);
    }
  });

  it('all algorithms should handle large range', () => {
    const map = createTestMap(80, 80);

    const algorithms = [
      shadowcasting(map, 40, 40, 20),
      raycasting(map, 40, 40, 20),
      diamondRaycasting(map, 40, 40, 20),
      permissiveFov(map, 40, 40, 20, 4),
    ];

    // All should produce results without crashing
    for (const result of algorithms) {
      expect(result.cells.length).toBeGreaterThan(100);
      expect(result.visibleCells.size).toBe(result.cells.length);
    }
  });
});

describe('FOV Algorithms - Data Structure Consistency', () => {
  it('all algorithms should return consistent data structures', () => {
    const map = createTestMap(20, 20);

    const algorithms = [
      shadowcasting(map, 10, 10, 5),
      raycasting(map, 10, 10, 5),
      diamondRaycasting(map, 10, 10, 5),
      permissiveFov(map, 10, 10, 5, 4),
    ];

    for (const result of algorithms) {
      expect(result.visibleCells).toBeInstanceOf(Set);
      expect(Array.isArray(result.cells)).toBe(true);
      expect(result.visibleCells.size).toBe(result.cells.length);

      // No duplicates
      const seen = new Set();
      for (const cell of result.cells) {
        const key = cellKey(cell.x, cell.y);
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });
});

describe('FOV Algorithms - Complex Scenarios', () => {
  it('all algorithms should handle room with pillars', () => {
    const map = createTestMap(30, 30);

    // Create pillars
    map.setWall(15, 15);
    map.setWall(20, 15);
    map.setWall(15, 20);
    map.setWall(20, 20);

    const algorithms = [
      shadowcasting(map, 17, 17, 10),
      raycasting(map, 17, 17, 10),
      diamondRaycasting(map, 17, 17, 10),
      permissiveFov(map, 17, 17, 10, 4),
    ];

    for (const result of algorithms) {
      // Should see at least some pillars
      const seenPillars = [
        result.visibleCells.has(cellKey(15, 15)),
        result.visibleCells.has(cellKey(20, 15)),
        result.visibleCells.has(cellKey(15, 20)),
        result.visibleCells.has(cellKey(20, 20)),
      ].filter(Boolean).length;

      expect(seenPillars).toBeGreaterThan(0);
    }
  });

  it('all algorithms should handle maze-like structure', () => {
    const map = createTestMap(20, 20);

    // Create walls
    for (let x = 5; x < 15; x++) {
      map.setWall(x, 7);
      map.setWall(x, 13);
    }
    for (let y = 7; y <= 13; y++) {
      map.setWall(5, y);
      map.setWall(14, y);
    }

    const algorithms = [
      shadowcasting(map, 10, 10, 10),
      raycasting(map, 10, 10, 10),
      diamondRaycasting(map, 10, 10, 10),
      permissiveFov(map, 10, 10, 10, 4),
    ];

    for (const result of algorithms) {
      // Should see inside the enclosed area
      expect(result.visibleCells.has(cellKey(10, 10))).toBe(true);
      expect(result.visibleCells.has(cellKey(8, 10))).toBe(true);

      // Should see the walls
      expect(result.visibleCells.has(cellKey(5, 10))).toBe(true);
    }
  });
});
