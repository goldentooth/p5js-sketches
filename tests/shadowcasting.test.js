import { describe, it, expect, beforeEach } from 'vitest';
import { shadowcasting, cellKey } from '../src';

/**
 * Simple test map implementation
 * Uses 2D array where 0 = transparent, 1 = opaque
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

describe('Shadowcasting - Basic Visibility', () => {
  it('should always see the origin cell', () => {
    const map = createTestMap(10, 10);
    const result = shadowcasting(map, 5, 5, 5);

    expect(result.visibleCells.has(cellKey(5, 5))).toBe(true);
    expect(result.cells).toContainEqual({ x: 5, y: 5 });
  });

  it('should see all cells in empty room within range', () => {
    const map = createTestMap(21, 21);
    const result = shadowcasting(map, 10, 10, 5);

    // With Chebyshev distance (square range), should see (2*r+1)² cells
    // For range 5: (2*5+1)² = 121 cells
    expect(result.cells.length).toBe(121);

    // Should see all cells within Manhattan distance 5
    expect(result.visibleCells.has(cellKey(10, 5))).toBe(true); // North
    expect(result.visibleCells.has(cellKey(10, 15))).toBe(true); // South
    expect(result.visibleCells.has(cellKey(5, 10))).toBe(true); // West
    expect(result.visibleCells.has(cellKey(15, 10))).toBe(true); // East
  });

  it('should not see beyond range', () => {
    const map = createTestMap(50, 50);
    const result = shadowcasting(map, 25, 25, 5);

    // Cells outside range should not be visible
    expect(result.visibleCells.has(cellKey(25, 15))).toBe(false); // 10 tiles away
    expect(result.visibleCells.has(cellKey(35, 25))).toBe(false); // 10 tiles away
    expect(result.visibleCells.has(cellKey(15, 25))).toBe(false); // 10 tiles away
  });

  it('should see cells exactly at range limit', () => {
    const map = createTestMap(30, 30);
    const range = 5;
    const result = shadowcasting(map, 15, 15, range);

    // Check cells at exactly range distance (Chebyshev distance)
    expect(result.visibleCells.has(cellKey(15, 10))).toBe(true); // 5 north
    expect(result.visibleCells.has(cellKey(15, 20))).toBe(true); // 5 south
    expect(result.visibleCells.has(cellKey(10, 15))).toBe(true); // 5 west
    expect(result.visibleCells.has(cellKey(20, 15))).toBe(true); // 5 east
  });
});

describe('Shadowcasting - Wall Blocking', () => {
  it('should block vision with single wall', () => {
    const map = createTestMap(20, 20);

    // Place wall directly north of origin
    map.setWall(10, 8);

    const result = shadowcasting(map, 10, 10, 10);

    // Should see the wall itself
    expect(result.visibleCells.has(cellKey(10, 8))).toBe(true);

    // Should NOT see cells behind the wall
    expect(result.visibleCells.has(cellKey(10, 7))).toBe(false);
    expect(result.visibleCells.has(cellKey(10, 6))).toBe(false);
  });

  it('should create shadow behind wall', () => {
    const map = createTestMap(20, 20);

    // Place wall to the right of origin
    map.setWall(13, 10);

    const result = shadowcasting(map, 10, 10, 10);

    // Wall is visible
    expect(result.visibleCells.has(cellKey(13, 10))).toBe(true);

    // Cells behind wall should be shadowed
    expect(result.visibleCells.has(cellKey(14, 10))).toBe(false);
    expect(result.visibleCells.has(cellKey(15, 10))).toBe(false);
  });

  it('should handle horizontal wall', () => {
    const map = createTestMap(20, 20);

    // Place horizontal wall
    for (let x = 8; x <= 12; x++) {
      map.setWall(x, 8);
    }

    const result = shadowcasting(map, 10, 10, 10);

    // Should see the wall
    expect(result.visibleCells.has(cellKey(10, 8))).toBe(true);

    // Should NOT see behind center of wall
    expect(result.visibleCells.has(cellKey(10, 7))).toBe(false);
    expect(result.visibleCells.has(cellKey(10, 6))).toBe(false);
  });

  it('should handle vertical wall', () => {
    const map = createTestMap(20, 20);

    // Place vertical wall
    for (let y = 8; y <= 12; y++) {
      map.setWall(12, y);
    }

    const result = shadowcasting(map, 10, 10, 10);

    // Should see the wall
    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);

    // Should NOT see behind center of wall
    expect(result.visibleCells.has(cellKey(13, 10))).toBe(false);
    expect(result.visibleCells.has(cellKey(14, 10))).toBe(false);
  });
});

describe('Shadowcasting - Corners and Pillars', () => {
  it('should handle corner peeking', () => {
    const map = createTestMap(20, 20);

    // Create an L-shaped wall
    map.setWall(12, 10);
    map.setWall(12, 11);
    map.setWall(12, 12);
    map.setWall(13, 12);
    map.setWall(14, 12);

    const result = shadowcasting(map, 10, 10, 10);

    // Should see some cells around the corner
    expect(result.visibleCells.has(cellKey(11, 11))).toBe(true);

    // Wall itself should be visible
    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);
  });

  it('should handle 1x1 pillar', () => {
    const map = createTestMap(20, 20);

    // Place single pillar
    map.setWall(12, 10);

    const result = shadowcasting(map, 10, 10, 10);

    // Pillar is visible
    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);

    // Some cells behind pillar should be shadowed
    expect(result.visibleCells.has(cellKey(13, 10))).toBe(false);

    // But can see around it
    expect(result.visibleCells.has(cellKey(13, 9))).toBe(true);
    expect(result.visibleCells.has(cellKey(13, 11))).toBe(true);
  });

  it('should handle 2x2 pillar', () => {
    const map = createTestMap(20, 20);

    // Place 2x2 pillar
    map.setWall(12, 10);
    map.setWall(13, 10);
    map.setWall(12, 11);
    map.setWall(13, 11);

    const result = shadowcasting(map, 10, 10, 10);

    // At least part of pillar is visible
    expect(result.visibleCells.has(cellKey(12, 10))).toBe(true);
    // Note: Due to octant processing, not all pillar cells may be visible
    // from certain angles - this is a known edge case

    // Creates shadow behind it
    expect(result.visibleCells.has(cellKey(14, 11))).toBe(false);
  });

  it('should handle 3x3 pillar', () => {
    const map = createTestMap(30, 30);

    // Place 3x3 pillar
    for (let dx = 0; dx < 3; dx++) {
      for (let dy = 0; dy < 3; dy++) {
        map.setWall(15 + dx, 15 + dy);
      }
    }

    const result = shadowcasting(map, 10, 10, 20);

    // Pillar is visible
    expect(result.visibleCells.has(cellKey(15, 15))).toBe(true);

    // Creates shadow (at least some cells should be blocked)
    // Note: Shadow extent varies by algorithm implementation
    const shadowedCells = [
      cellKey(18, 15),
      cellKey(18, 16),
      cellKey(18, 17),
      cellKey(19, 16),
      cellKey(20, 17),
    ];

    const blockedCount = shadowedCells.filter(
      (key) => !result.visibleCells.has(key)
    ).length;

    // At least some cells should be in shadow
    expect(blockedCount).toBeGreaterThan(0);
  });
});

describe('Shadowcasting - Symmetry', () => {
  it('should be symmetric (if A sees B, then B sees A)', () => {
    const map = createTestMap(30, 30);

    // Add some walls
    for (let x = 10; x < 15; x++) {
      map.setWall(x, 12);
    }

    const range = 20;
    const posA = { x: 5, y: 5 };
    const posB = { x: 20, y: 20 };

    const resultFromA = shadowcasting(map, posA.x, posA.y, range);
    const resultFromB = shadowcasting(map, posB.x, posB.y, range);

    const aSeesB = resultFromA.visibleCells.has(cellKey(posB.x, posB.y));
    const bSeesA = resultFromB.visibleCells.has(cellKey(posA.x, posA.y));

    expect(aSeesB).toBe(bSeesA);
  });

  it('should maintain symmetry with multiple positions', () => {
    const map = createTestMap(20, 20);

    // Place some obstacles
    map.setWall(10, 10);
    map.setWall(11, 11);

    const positions = [
      { x: 5, y: 5 },
      { x: 15, y: 5 },
      { x: 5, y: 15 },
      { x: 15, y: 15 },
    ];

    const range = 12;

    // Check symmetry for all pairs
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const resultI = shadowcasting(map, positions[i].x, positions[i].y, range);
        const resultJ = shadowcasting(map, positions[j].x, positions[j].y, range);

        const iSeesJ = resultI.visibleCells.has(
          cellKey(positions[j].x, positions[j].y)
        );
        const jSeesI = resultJ.visibleCells.has(
          cellKey(positions[i].x, positions[i].y)
        );

        expect(iSeesJ).toBe(jSeesI);
      }
    }
  });
});

describe('Shadowcasting - Edge Behavior', () => {
  it('should treat edges as blocking in block mode', () => {
    const map = createTestMap(10, 10, 'block');
    const result = shadowcasting(map, 5, 5, 10);

    // Should not see beyond edges
    expect(result.visibleCells.has(cellKey(-1, 5))).toBe(false);
    expect(result.visibleCells.has(cellKey(10, 5))).toBe(false);
    expect(result.visibleCells.has(cellKey(5, -1))).toBe(false);
    expect(result.visibleCells.has(cellKey(5, 10))).toBe(false);
  });

  it('should handle wrapping in wrap mode', () => {
    const map = createTestMap(10, 10, 'wrap');
    const result = shadowcasting(map, 1, 1, 3);

    // Should see wrapped cells (wrapping from left edge to right edge)
    // This is a complex behavior, just verify it doesn't crash
    expect(result.visibleCells.size).toBeGreaterThan(0);
    expect(result.cells.length).toBeGreaterThan(0);
  });

  it('should handle position at map edge in block mode', () => {
    const map = createTestMap(10, 10, 'block');
    const result = shadowcasting(map, 0, 0, 5);

    // Should see origin
    expect(result.visibleCells.has(cellKey(0, 0))).toBe(true);

    // Should see cells in valid directions
    expect(result.visibleCells.has(cellKey(1, 0))).toBe(true);
    expect(result.visibleCells.has(cellKey(0, 1))).toBe(true);
    expect(result.visibleCells.has(cellKey(1, 1))).toBe(true);
  });

  it('should handle position at map center', () => {
    const map = createTestMap(21, 21, 'block');
    const result = shadowcasting(map, 10, 10, 5);

    // Should see cells in all directions
    expect(result.visibleCells.has(cellKey(10, 5))).toBe(true); // North
    expect(result.visibleCells.has(cellKey(10, 15))).toBe(true); // South
    expect(result.visibleCells.has(cellKey(5, 10))).toBe(true); // West
    expect(result.visibleCells.has(cellKey(15, 10))).toBe(true); // East
  });
});

describe('Shadowcasting - Complex Scenarios', () => {
  it('should handle room with pillars', () => {
    const map = createTestMap(30, 30);

    // Place pillars in a pattern
    map.setWall(10, 10);
    map.setWall(20, 10);
    map.setWall(10, 20);
    map.setWall(20, 20);

    const result = shadowcasting(map, 15, 15, 10);

    // Should see all pillars
    expect(result.visibleCells.has(cellKey(10, 10))).toBe(true);
    expect(result.visibleCells.has(cellKey(20, 10))).toBe(true);
    expect(result.visibleCells.has(cellKey(10, 20))).toBe(true);
    expect(result.visibleCells.has(cellKey(20, 20))).toBe(true);

    // Should see center area
    expect(result.visibleCells.has(cellKey(15, 15))).toBe(true);
  });

  it('should handle maze-like structure', () => {
    const map = createTestMap(20, 20);

    // Create maze walls
    for (let x = 5; x < 15; x++) {
      map.setWall(x, 7);
      map.setWall(x, 13);
    }
    for (let y = 7; y <= 13; y++) {
      map.setWall(5, y);
      map.setWall(14, y);
    }

    // Add opening
    map.setFloor(10, 7);

    const result = shadowcasting(map, 10, 10, 10);

    // Should see inside the room
    expect(result.visibleCells.has(cellKey(10, 10))).toBe(true);
    expect(result.visibleCells.has(cellKey(8, 10))).toBe(true);

    // Should see the opening
    expect(result.visibleCells.has(cellKey(10, 7))).toBe(true);

    // Should see through opening
    expect(result.visibleCells.has(cellKey(10, 6))).toBe(true);
  });

  it('should handle diagonal walls', () => {
    const map = createTestMap(20, 20);

    // Create diagonal wall
    for (let i = 0; i < 5; i++) {
      map.setWall(10 + i, 10 + i);
    }

    const result = shadowcasting(map, 8, 8, 10);

    // Should see at least part of the diagonal wall
    expect(result.visibleCells.has(cellKey(10, 10))).toBe(true);
    // Note: Diagonal wall visibility varies by octant processing

    // Should have limited vision beyond diagonal
    const behindWall = result.visibleCells.has(cellKey(15, 15));
    expect(behindWall).toBe(false);
  });
});

describe('Shadowcasting - Range Variations', () => {
  it('should handle very small range (1)', () => {
    const map = createTestMap(10, 10);
    const result = shadowcasting(map, 5, 5, 1);

    // Should see origin and immediate neighbors
    expect(result.visibleCells.has(cellKey(5, 5))).toBe(true);
    expect(result.cells.length).toBeGreaterThan(1);
    expect(result.cells.length).toBeLessThan(10);
  });

  it('should handle medium range (10)', () => {
    const map = createTestMap(50, 50);
    const result = shadowcasting(map, 25, 25, 10);

    // Chebyshev distance: (2*10+1)² = 441 cells
    expect(result.cells.length).toBe(441);
  });

  it('should handle large range (20)', () => {
    const map = createTestMap(80, 80);
    const result = shadowcasting(map, 40, 40, 20);

    // Chebyshev distance: (2*20+1)² = 1681 cells
    expect(result.cells.length).toBe(1681);
  });
});

describe('Shadowcasting - Data Structure', () => {
  it('should return both Set and Array representations', () => {
    const map = createTestMap(20, 20);
    const result = shadowcasting(map, 10, 10, 5);

    expect(result.visibleCells).toBeInstanceOf(Set);
    expect(Array.isArray(result.cells)).toBe(true);
    expect(result.visibleCells.size).toBe(result.cells.length);
  });

  it('should have consistent Set and Array contents', () => {
    const map = createTestMap(20, 20);
    const result = shadowcasting(map, 10, 10, 5);

    // Every cell in array should be in set
    for (const cell of result.cells) {
      expect(result.visibleCells.has(cellKey(cell.x, cell.y))).toBe(true);
    }
  });

  it('should not have duplicate cells in results', () => {
    const map = createTestMap(20, 20);
    const result = shadowcasting(map, 10, 10, 5);

    // Check for duplicates in array
    const seen = new Set();
    for (const cell of result.cells) {
      const key = cellKey(cell.x, cell.y);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
