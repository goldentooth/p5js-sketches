import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMap,
  Tiles,
  forEachTile,
  findTiles,
  countTiles,
  findTilesWhere,
  someTile,
  everyTile
} from '../src';

describe('Map Query Utilities', () => {
  let map;

  beforeEach(() => {
    // Create a 10x10 map with default floor tiles
    map = createMap(10, 10, { defaultTile: Tiles.Floor });
  });

  describe('forEachTile', () => {
    it('should visit every tile exactly once', () => {
      const visited = new Set();

      forEachTile(map, (x, y) => {
        const key = `${x},${y}`;
        expect(visited.has(key)).toBe(false); // Not visited yet
        visited.add(key);
      });

      expect(visited.size).toBe(100); // 10x10 map
    });

    it('should provide correct coordinates', () => {
      forEachTile(map, (x, y) => {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(10);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(10);
      });
    });

    it('should provide correct tile values', () => {
      // Set some walls
      map.setTile(0, 0, Tiles.Wall);
      map.setTile(5, 5, Tiles.Wall);

      let wallCount = 0;
      let floorCount = 0;

      forEachTile(map, (x, y, tile) => {
        if (tile === Tiles.Wall) {
          wallCount++;
        } else if (tile === Tiles.Floor) {
          floorCount++;
        }
      });

      expect(wallCount).toBe(2);
      expect(floorCount).toBe(98);
    });

    it('should allow modification during iteration', () => {
      // Turn all floor tiles into walls
      forEachTile(map, (x, y, tile) => {
        if (tile === Tiles.Floor) {
          map.setTile(x, y, Tiles.Wall);
        }
      });

      // Verify all are walls
      forEachTile(map, (x, y, tile) => {
        expect(tile).toBe(Tiles.Wall);
      });
    });
  });

  describe('findTiles', () => {
    beforeEach(() => {
      // Create a pattern with walls
      map.setTile(0, 0, Tiles.Wall);
      map.setTile(5, 5, Tiles.Wall);
      map.setTile(9, 9, Tiles.Wall);
    });

    it('should find all tiles of a specific type', () => {
      const walls = findTiles(map, Tiles.Wall);
      expect(walls.length).toBe(3);

      // Check specific positions
      expect(walls).toContainEqual({ x: 0, y: 0 });
      expect(walls).toContainEqual({ x: 5, y: 5 });
      expect(walls).toContainEqual({ x: 9, y: 9 });
    });

    it('should return empty array when tile type not found', () => {
      // Create a map with only walls
      const wallMap = createMap(5, 5, { defaultTile: Tiles.Wall });
      const floors = findTiles(wallMap, Tiles.Floor);
      expect(floors).toEqual([]);
    });

    it('should find all tiles when entire map is one type', () => {
      const floors = findTiles(map, Tiles.Floor);
      expect(floors.length).toBe(97); // 100 - 3 walls
    });

    it('should return positions that can be used to access tiles', () => {
      const walls = findTiles(map, Tiles.Wall);

      walls.forEach(pos => {
        const tile = map.getTile(pos.x, pos.y);
        expect(tile).toBe(Tiles.Wall);
      });
    });
  });

  describe('countTiles', () => {
    it('should count tiles of specific type', () => {
      // Initially all floor
      expect(countTiles(map, Tiles.Floor)).toBe(100);
      expect(countTiles(map, Tiles.Wall)).toBe(0);
    });

    it('should count correctly after modifications', () => {
      // Add some walls
      map.setTile(0, 0, Tiles.Wall);
      map.setTile(1, 0, Tiles.Wall);
      map.setTile(2, 0, Tiles.Wall);

      expect(countTiles(map, Tiles.Wall)).toBe(3);
      expect(countTiles(map, Tiles.Floor)).toBe(97);
    });

    it('should return 0 for non-existent tile type', () => {
      expect(countTiles(map, Tiles.Wall)).toBe(0);
    });

    it('should be equivalent to findTiles().length', () => {
      map.setTile(3, 3, Tiles.Wall);
      map.setTile(4, 4, Tiles.Wall);

      const countResult = countTiles(map, Tiles.Wall);
      const findResult = findTiles(map, Tiles.Wall);

      expect(countResult).toBe(findResult.length);
    });
  });

  describe('findTilesWhere', () => {
    it('should find tiles matching predicate', () => {
      // Set walls in diagonal
      for (let i = 0; i < 5; i++) {
        map.setTile(i, i, Tiles.Wall);
      }

      // Find walls on diagonal
      const diagonal = findTilesWhere(map, (x, y, tile) => {
        return tile === Tiles.Wall && x === y;
      });

      expect(diagonal.length).toBe(5);
      diagonal.forEach(pos => {
        expect(pos.x).toBe(pos.y);
        expect(pos.tile).toBe(Tiles.Wall);
      });
    });

    it('should find tiles based on position only', () => {
      // Find all tiles in top row
      const topRow = findTilesWhere(map, (x, y) => y === 0);
      expect(topRow.length).toBe(10);

      topRow.forEach(pos => {
        expect(pos.y).toBe(0);
      });
    });

    it('should return empty array when no match', () => {
      const result = findTilesWhere(map, () => false);
      expect(result).toEqual([]);
    });

    it('should include tile value in results', () => {
      map.setTile(5, 5, Tiles.Wall);

      const walls = findTilesWhere(map, (x, y, tile) => tile === Tiles.Wall);
      expect(walls.length).toBe(1);
      expect(walls[0]).toEqual({ x: 5, y: 5, tile: Tiles.Wall });
    });

    it('should work with complex predicates', () => {
      // Set walls around perimeter
      for (let x = 0; x < 10; x++) {
        map.setTile(x, 0, Tiles.Wall);
        map.setTile(x, 9, Tiles.Wall);
      }
      for (let y = 0; y < 10; y++) {
        map.setTile(0, y, Tiles.Wall);
        map.setTile(9, y, Tiles.Wall);
      }

      // Find perimeter walls
      const perimeter = findTilesWhere(
        map,
        (x, y, tile) => tile === Tiles.Wall && (x === 0 || x === 9 || y === 0 || y === 9)
      );

      // 36 perimeter tiles (10 + 10 + 8 + 8, accounting for corners)
      expect(perimeter.length).toBe(36);
    });
  });

  describe('someTile', () => {
    it('should return true when at least one tile matches', () => {
      map.setTile(5, 5, Tiles.Wall);

      const hasWall = someTile(map, (x, y, tile) => tile === Tiles.Wall);
      expect(hasWall).toBe(true);
    });

    it('should return false when no tiles match', () => {
      // All floor, no walls
      const hasWall = someTile(map, (x, y, tile) => tile === Tiles.Wall);
      expect(hasWall).toBe(false);
    });

    it('should short-circuit on first match', () => {
      let callCount = 0;

      // Set wall at 0,0 (first tile checked)
      map.setTile(0, 0, Tiles.Wall);

      someTile(map, (x, y, tile) => {
        callCount++;
        return tile === Tiles.Wall;
      });

      // Should stop after first match
      expect(callCount).toBeLessThan(100);
    });

    it('should work with position-based predicates', () => {
      const hasCornerTile = someTile(map, (x, y) => x === 0 && y === 0);
      expect(hasCornerTile).toBe(true);
    });
  });

  describe('everyTile', () => {
    it('should return true when all tiles match', () => {
      // All tiles are floor by default
      const allFloor = everyTile(map, (x, y, tile) => tile === Tiles.Floor);
      expect(allFloor).toBe(true);
    });

    it('should return false when any tile does not match', () => {
      map.setTile(5, 5, Tiles.Wall);

      const allFloor = everyTile(map, (x, y, tile) => tile === Tiles.Floor);
      expect(allFloor).toBe(false);
    });

    it('should short-circuit on first non-match', () => {
      let callCount = 0;

      // Set wall at 0,0 (first tile checked)
      map.setTile(0, 0, Tiles.Wall);

      everyTile(map, (x, y, tile) => {
        callCount++;
        return tile === Tiles.Floor;
      });

      // Should stop after first non-match
      expect(callCount).toBeLessThan(100);
    });

    it('should work with position-based predicates', () => {
      const allInBounds = everyTile(
        map,
        (x, y) => x >= 0 && x < 10 && y >= 0 && y < 10
      );
      expect(allInBounds).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should find tiles, count them, and verify with someTile', () => {
      // Create a cross pattern
      for (let i = 0; i < 10; i++) {
        map.setTile(5, i, Tiles.Wall); // Vertical line
        map.setTile(i, 5, Tiles.Wall); // Horizontal line
      }

      const walls = findTiles(map, Tiles.Wall);
      const count = countTiles(map, Tiles.Wall);
      const hasWalls = someTile(map, (x, y, tile) => tile === Tiles.Wall);

      // Cross pattern: 10 + 10 - 1 (center overlap) = 19 walls
      expect(walls.length).toBe(19);
      expect(count).toBe(19);
      expect(hasWalls).toBe(true);
    });

    it('should use forEachTile to collect statistics', () => {
      // Create a checkerboard pattern
      forEachTile(map, (x, y) => {
        if ((x + y) % 2 === 0) {
          map.setTile(x, y, Tiles.Wall);
        }
      });

      const wallCount = countTiles(map, Tiles.Wall);
      const floorCount = countTiles(map, Tiles.Floor);

      expect(wallCount + floorCount).toBe(100);
      expect(wallCount).toBe(50); // Half are walls
    });

    it('should find tiles and verify they meet criteria', () => {
      // Set walls in corners
      map.setTile(0, 0, Tiles.Wall);
      map.setTile(9, 0, Tiles.Wall);
      map.setTile(0, 9, Tiles.Wall);
      map.setTile(9, 9, Tiles.Wall);

      const corners = findTilesWhere(
        map,
        (x, y, tile) =>
          tile === Tiles.Wall && ((x === 0 || x === 9) && (y === 0 || y === 9))
      );

      expect(corners.length).toBe(4);

      // Verify each corner is actually a wall
      corners.forEach(pos => {
        expect(map.getTile(pos.x, pos.y)).toBe(Tiles.Wall);
        expect(pos.tile).toBe(Tiles.Wall);
      });
    });

    it('should combine someTile and everyTile for validation', () => {
      // Initially all floor
      expect(everyTile(map, (x, y, tile) => tile === Tiles.Floor)).toBe(true);
      expect(someTile(map, (x, y, tile) => tile === Tiles.Wall)).toBe(false);

      // Add one wall
      map.setTile(5, 5, Tiles.Wall);

      expect(everyTile(map, (x, y, tile) => tile === Tiles.Floor)).toBe(false);
      expect(someTile(map, (x, y, tile) => tile === Tiles.Wall)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle 1x1 map', () => {
      const tinyMap = createMap(1, 1, { defaultTile: Tiles.Floor });

      let count = 0;
      forEachTile(tinyMap, () => count++);
      expect(count).toBe(1);

      expect(findTiles(tinyMap, Tiles.Floor).length).toBe(1);
      expect(countTiles(tinyMap, Tiles.Floor)).toBe(1);
    });

    it('should handle large maps efficiently', () => {
      const largeMap = createMap(100, 100);

      const start = Date.now();
      const count = countTiles(largeMap, Tiles.Wall);
      const elapsed = Date.now() - start;

      expect(count).toBe(10000); // All walls
      expect(elapsed).toBeLessThan(100); // Should be fast (< 100ms)
    });

    it('should handle wrapping maps correctly', () => {
      const wrappingMap = createMap(5, 5, {
        defaultTile: Tiles.Floor,
        edgeBehavior: 'wrap'
      });

      wrappingMap.setTile(0, 0, Tiles.Wall);

      // getTile with wrapping should still work
      const tile = wrappingMap.getTile(5, 5); // Wraps to 0,0
      expect(tile).toBe(Tiles.Wall);

      // But findTiles should still report actual positions
      const walls = findTiles(wrappingMap, Tiles.Wall);
      expect(walls.length).toBe(1);
      expect(walls[0]).toEqual({ x: 0, y: 0 });
    });
  });
});
