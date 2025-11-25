import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGrid,
  gridContains,
  getNeighbors,
  findCell,
  filterCells,
  countCells
} from '../src';

describe('Grid Query Utilities', () => {
  let grid;

  beforeEach(() => {
    // Create a 5x5 grid for testing
    grid = createGrid(5, 5);
    grid.init(cell => {
      // Set value to the cell's index for easy identification
      cell.value = cell.index;
    });
  });

  describe('gridContains', () => {
    it('should return true for coordinates within bounds', () => {
      expect(gridContains(grid, 0, 0)).toBe(true);
      expect(gridContains(grid, 4, 4)).toBe(true);
      expect(gridContains(grid, 2, 2)).toBe(true);
    });

    it('should return false for negative coordinates', () => {
      expect(gridContains(grid, -1, 0)).toBe(false);
      expect(gridContains(grid, 0, -1)).toBe(false);
      expect(gridContains(grid, -1, -1)).toBe(false);
    });

    it('should return false for coordinates beyond grid dimensions', () => {
      expect(gridContains(grid, 5, 0)).toBe(false);
      expect(gridContains(grid, 0, 5)).toBe(false);
      expect(gridContains(grid, 5, 5)).toBe(false);
    });

    it('should handle edge coordinates correctly', () => {
      // Top-left corner
      expect(gridContains(grid, 0, 0)).toBe(true);
      // Top-right corner
      expect(gridContains(grid, 4, 0)).toBe(true);
      // Bottom-left corner
      expect(gridContains(grid, 0, 4)).toBe(true);
      // Bottom-right corner
      expect(gridContains(grid, 4, 4)).toBe(true);
    });
  });

  describe('getNeighbors', () => {
    it('should return 4 cardinal neighbors for center cell', () => {
      const neighbors = getNeighbors(grid, 2, 2, false);
      expect(neighbors.length).toBe(4);

      // Check that we got the correct neighbors (north, south, east, west)
      const coords = neighbors.map(n => ({ x: n.x, y: n.y }));
      expect(coords).toContainEqual({ x: 2, y: 1 }); // North
      expect(coords).toContainEqual({ x: 2, y: 3 }); // South
      expect(coords).toContainEqual({ x: 3, y: 2 }); // East
      expect(coords).toContainEqual({ x: 1, y: 2 }); // West
    });

    it('should return 8 neighbors when including diagonals', () => {
      const neighbors = getNeighbors(grid, 2, 2, true);
      expect(neighbors.length).toBe(8);
    });

    it('should return 2 neighbors for corner cell (cardinal only)', () => {
      const neighbors = getNeighbors(grid, 0, 0, false);
      expect(neighbors.length).toBe(2);

      // Should only have east and south neighbors
      const coords = neighbors.map(n => ({ x: n.x, y: n.y }));
      expect(coords).toContainEqual({ x: 1, y: 0 }); // East
      expect(coords).toContainEqual({ x: 0, y: 1 }); // South
    });

    it('should return 3 neighbors for corner cell (with diagonals)', () => {
      const neighbors = getNeighbors(grid, 0, 0, true);
      expect(neighbors.length).toBe(3);

      // Should have east, south, and southeast
      const coords = neighbors.map(n => ({ x: n.x, y: n.y }));
      expect(coords).toContainEqual({ x: 1, y: 0 }); // East
      expect(coords).toContainEqual({ x: 0, y: 1 }); // South
      expect(coords).toContainEqual({ x: 1, y: 1 }); // Southeast
    });

    it('should return 3 neighbors for edge cell (cardinal only)', () => {
      const neighbors = getNeighbors(grid, 2, 0, false);
      expect(neighbors.length).toBe(3);

      // Should have west, east, and south
      const coords = neighbors.map(n => ({ x: n.x, y: n.y }));
      expect(coords).toContainEqual({ x: 1, y: 0 }); // West
      expect(coords).toContainEqual({ x: 3, y: 0 }); // East
      expect(coords).toContainEqual({ x: 2, y: 1 }); // South
    });

    it('should return 5 neighbors for edge cell (with diagonals)', () => {
      const neighbors = getNeighbors(grid, 2, 0, true);
      expect(neighbors.length).toBe(5);
    });

    it('should not include out-of-bounds cells', () => {
      const neighbors = getNeighbors(grid, 4, 4, true);
      // Bottom-right corner should have fewer neighbors
      expect(neighbors.length).toBeLessThan(8);

      // All neighbors should be in bounds
      neighbors.forEach(n => {
        expect(gridContains(grid, n.x, n.y)).toBe(true);
      });
    });
  });

  describe('findCell', () => {
    it('should find first cell matching predicate', () => {
      const cell = findCell(grid, c => c.x === 2 && c.y === 2);
      expect(cell).toBeDefined();
      expect(cell.x).toBe(2);
      expect(cell.y).toBe(2);
    });

    it('should return undefined when no cell matches', () => {
      const cell = findCell(grid, c => c.x === 10); // Out of bounds
      expect(cell).toBeUndefined();
    });

    it('should return first match when multiple cells match', () => {
      // Find first cell in row 0
      const cell = findCell(grid, c => c.y === 0);
      expect(cell).toBeDefined();
      expect(cell.y).toBe(0);
      // Should be first cell in iteration order
    });

    it('should work with value-based predicates', () => {
      // Set a specific value
      const targetCell = grid.getCell(3, 3);
      targetCell.value = 'target';

      const found = findCell(grid, c => c.value === 'target');
      expect(found).toBeDefined();
      expect(found.x).toBe(3);
      expect(found.y).toBe(3);
    });
  });

  describe('filterCells', () => {
    it('should return all cells matching predicate', () => {
      // Find all cells in row 2
      const cells = filterCells(grid, c => c.y === 2);
      expect(cells.length).toBe(5); // All 5 columns in row 2
      cells.forEach(c => {
        expect(c.y).toBe(2);
      });
    });

    it('should return empty array when no cells match', () => {
      const cells = filterCells(grid, c => c.x === 10); // Out of bounds
      expect(cells).toEqual([]);
    });

    it('should return all cells when predicate always true', () => {
      const cells = filterCells(grid, () => true);
      expect(cells.length).toBe(25); // 5x5 grid
    });

    it('should work with complex predicates', () => {
      // Find all cells where x and y are equal (diagonal)
      const cells = filterCells(grid, c => c.x === c.y);
      expect(cells.length).toBe(5); // (0,0), (1,1), (2,2), (3,3), (4,4)

      cells.forEach(c => {
        expect(c.x).toBe(c.y);
      });
    });

    it('should work with value-based predicates', () => {
      // Set some cells with specific values
      grid.getCell(0, 0).value = 'special';
      grid.getCell(2, 2).value = 'special';
      grid.getCell(4, 4).value = 'special';

      const cells = filterCells(grid, c => c.value === 'special');
      expect(cells.length).toBe(3);
    });
  });

  describe('countCells', () => {
    it('should count cells matching predicate', () => {
      // Count cells in row 2
      const count = countCells(grid, c => c.y === 2);
      expect(count).toBe(5);
    });

    it('should return 0 when no cells match', () => {
      const count = countCells(grid, c => c.x === 10);
      expect(count).toBe(0);
    });

    it('should count all cells when predicate always true', () => {
      const count = countCells(grid, () => true);
      expect(count).toBe(25); // 5x5 grid
    });

    it('should work with complex predicates', () => {
      // Count cells in top-left quadrant (x < 2 and y < 2)
      const count = countCells(grid, c => c.x < 2 && c.y < 2);
      expect(count).toBe(4); // (0,0), (0,1), (1,0), (1,1)
    });

    it('should be equivalent to filterCells().length', () => {
      const predicate = c => c.x + c.y > 5;
      const count = countCells(grid, predicate);
      const filtered = filterCells(grid, predicate);
      expect(count).toBe(filtered.length);
    });
  });

  describe('Integration scenarios', () => {
    it('should work together to find and count neighbors with specific property', () => {
      // Set some cells as "blocked"
      grid.getCell(1, 2).value = 'blocked';
      grid.getCell(2, 1).value = 'blocked';
      grid.getCell(3, 2).value = 'blocked';
      grid.getCell(2, 3).value = 'blocked';

      // Get neighbors of center cell
      const neighbors = getNeighbors(grid, 2, 2, false);

      // Count how many are blocked
      const blockedCount = neighbors.filter(n => n.value === 'blocked').length;
      expect(blockedCount).toBe(4);
    });

    it('should find cell and get its neighbors', () => {
      // Find a specific cell
      const targetCell = findCell(grid, c => c.x === 1 && c.y === 1);
      expect(targetCell).toBeDefined();

      // Get its neighbors
      const neighbors = getNeighbors(grid, targetCell.x, targetCell.y, false);
      expect(neighbors.length).toBe(4); // (1,1) is not on edge
    });

    it('should filter cells and verify they are in bounds', () => {
      // Get all edge cells
      const edgeCells = filterCells(
        grid,
        c => c.x === 0 || c.y === 0 || c.x === 4 || c.y === 4
      );

      // All should be in bounds
      edgeCells.forEach(cell => {
        expect(gridContains(grid, cell.x, cell.y)).toBe(true);
      });

      // Should be 16 edge cells in 5x5 grid (perimeter)
      expect(edgeCells.length).toBe(16);
    });
  });
});
