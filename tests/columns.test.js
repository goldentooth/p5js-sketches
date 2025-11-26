import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMap,
  createRoom,
  carveRoom,
  connectRooms,
  Tiles,
  xoroshiro128plus,
  generateColumnsForRoom,
  generateColumns,
  placeColumn,
  DEFAULT_COLUMN_OPTIONS,
} from '../src';

describe('Column Generation', () => {
  let map;
  let rng;

  beforeEach(() => {
    map = createMap(40, 30, { defaultTile: Tiles.Wall });
    rng = xoroshiro128plus(BigInt(12345)); // Deterministic seed
  });

  describe('placeColumn', () => {
    it('should place a 1x1 column', () => {
      carveRoom(map, createRoom(5, 5, 10, 10));

      placeColumn(map, { x: 8, y: 8, width: 1, height: 1 });

      expect(map.getTile(8, 8)).toBe(Tiles.Wall);
    });

    it('should place a 2x2 column', () => {
      carveRoom(map, createRoom(5, 5, 10, 10));

      placeColumn(map, { x: 8, y: 8, width: 2, height: 2 });

      expect(map.getTile(8, 8)).toBe(Tiles.Wall);
      expect(map.getTile(9, 8)).toBe(Tiles.Wall);
      expect(map.getTile(8, 9)).toBe(Tiles.Wall);
      expect(map.getTile(9, 9)).toBe(Tiles.Wall);
    });

    it('should place a 3x3 column', () => {
      carveRoom(map, createRoom(5, 5, 10, 10));

      placeColumn(map, { x: 8, y: 8, width: 3, height: 3 });

      for (let y = 8; y < 11; y++) {
        for (let x = 8; x < 11; x++) {
          expect(map.getTile(x, y)).toBe(Tiles.Wall);
        }
      }
    });

    it('should place a rectangular column (2x3)', () => {
      carveRoom(map, createRoom(5, 5, 10, 10));

      placeColumn(map, { x: 8, y: 8, width: 2, height: 3 });

      for (let y = 8; y < 11; y++) {
        for (let x = 8; x < 10; x++) {
          expect(map.getTile(x, y)).toBe(Tiles.Wall);
        }
      }
    });
  });

  describe('generateColumnsForRoom - Size Requirements', () => {
    it('should not generate columns for small rooms', () => {
      const smallRoom = createRoom(5, 5, 8, 8);
      carveRoom(map, smallRoom);

      const columns = generateColumnsForRoom(map, smallRoom, rng);

      expect(columns).toHaveLength(0);
    });

    it('should generate columns for rooms at minimum size threshold', () => {
      const minRoom = createRoom(5, 5, 12, 12);
      carveRoom(map, minRoom);

      const columns = generateColumnsForRoom(map, minRoom, rng, {
        minRoomSize: { width: 12, height: 12 },
        columnSize: { min: 1, max: 1 },
        spacing: { min: 3, max: 3 },
        edgeBuffer: 1,
        density: 1.0, // Always place columns
      });

      // Should have at least one column
      expect(columns.length).toBeGreaterThan(0);
    });

    it('should generate columns for large rooms', () => {
      const largeRoom = createRoom(5, 5, 20, 20);
      carveRoom(map, largeRoom);

      const columns = generateColumnsForRoom(map, largeRoom, rng, {
        density: 1.0, // Always place columns
      });

      expect(columns.length).toBeGreaterThan(0);
    });

    it('should respect custom minimum room size', () => {
      const room = createRoom(5, 5, 15, 15);
      carveRoom(map, room);

      // Should not generate with high threshold
      const noColumns = generateColumnsForRoom(map, room, rng, {
        minRoomSize: { width: 20, height: 20 },
      });
      expect(noColumns).toHaveLength(0);

      // Should generate with low threshold
      const withColumns = generateColumnsForRoom(map, room, rng, {
        minRoomSize: { width: 10, height: 10 },
        columnSize: { min: 1, max: 1 },
        edgeBuffer: 1,
        density: 1.0,
      });
      expect(withColumns.length).toBeGreaterThan(0);
    });
  });

  describe('generateColumnsForRoom - Placement Rules', () => {
    it('should not place columns too close to room edges', () => {
      const room = createRoom(5, 5, 15, 15);
      carveRoom(map, room);

      const columns = generateColumnsForRoom(map, room, rng, {
        edgeBuffer: 2,
        density: 1.0,
      });

      // All columns should be at least 2 tiles from edges
      for (const col of columns) {
        expect(col.x).toBeGreaterThanOrEqual(room.x1() + 2);
        expect(col.y).toBeGreaterThanOrEqual(room.y1() + 2);
        expect(col.x + col.width - 1).toBeLessThanOrEqual(room.x2() - 2);
        expect(col.y + col.height - 1).toBeLessThanOrEqual(room.y2() - 2);
      }
    });

    it('should not place columns near corridor entrances', () => {
      const room1 = createRoom(5, 5, 15, 15);
      const room2 = createRoom(25, 10, 10, 10);
      carveRoom(map, room1);
      carveRoom(map, room2);

      // Connect rooms (creates corridor)
      const center1 = room1.center();
      const center2 = room2.center();
      connectRooms(map, center1.x, center1.y, center2.x, center2.y);

      const columns = generateColumnsForRoom(map, room1, rng, {
        corridorBuffer: 3,
        density: 1.0,
      });

      // Find corridor entrance (floor tile outside room)
      let corridorX = -1;
      let corridorY = -1;
      for (let x = room1.x1() - 1; x <= room1.x2() + 1; x++) {
        if (map.isInBounds(x, room1.y1() - 1) && map.getTile(x, room1.y1() - 1) === Tiles.Floor) {
          corridorX = x;
          corridorY = room1.y1() - 1;
          break;
        }
      }

      if (corridorX !== -1) {
        // All columns should be at least corridorBuffer distance from entrance
        for (const col of columns) {
          const distance = Math.max(
            Math.abs(col.x - corridorX),
            Math.abs(col.y - corridorY)
          );
          expect(distance).toBeGreaterThan(3);
        }
      }
    });

    it('should only place columns on floor tiles', () => {
      const room = createRoom(5, 5, 15, 15);
      carveRoom(map, room);

      const columns = generateColumnsForRoom(map, room, rng, {
        density: 1.0,
      });

      // Before placement, all column positions should have been floors
      // After placement, they should be walls
      for (const col of columns) {
        for (let y = col.y; y < col.y + col.height; y++) {
          for (let x = col.x; x < col.x + col.width; x++) {
            expect(map.getTile(x, y)).toBe(Tiles.Wall);
          }
        }
      }
    });
  });

  describe('generateColumnsForRoom - Configuration', () => {
    it('should respect density setting', () => {
      const room = createRoom(5, 5, 20, 20);
      carveRoom(map, room);

      // High density should produce more columns
      const highDensity = generateColumnsForRoom(map, room, rng, {
        density: 1.0,
        spacing: { min: 4, max: 4 },
      });

      // Reset map
      map = createMap(40, 30, { defaultTile: Tiles.Wall });
      carveRoom(map, room);
      rng = xoroshiro128plus(BigInt(12345)); // Reset RNG

      // Low density should produce fewer columns
      const lowDensity = generateColumnsForRoom(map, room, rng, {
        density: 0.3,
        spacing: { min: 4, max: 4 },
      });

      expect(lowDensity.length).toBeLessThan(highDensity.length);
    });

    it('should use specified column size range', () => {
      const room = createRoom(5, 5, 20, 20);
      carveRoom(map, room);

      const columns = generateColumnsForRoom(map, room, rng, {
        columnSize: { min: 2, max: 3 },
        density: 1.0,
      });

      for (const col of columns) {
        expect(col.width).toBeGreaterThanOrEqual(2);
        expect(col.width).toBeLessThanOrEqual(3);
        expect(col.height).toBeGreaterThanOrEqual(2);
        expect(col.height).toBeLessThanOrEqual(3);
      }
    });

    it('should respect spacing configuration', () => {
      const room = createRoom(5, 5, 25, 25);
      carveRoom(map, room);

      const columns = generateColumnsForRoom(map, room, rng, {
        spacing: { min: 6, max: 6 },
        columnSize: { min: 1, max: 1 },
        density: 1.0,
      });

      // With fixed spacing of 6, columns should be at least 6 tiles apart
      for (let i = 0; i < columns.length; i++) {
        for (let j = i + 1; j < columns.length; j++) {
          const col1 = columns[i];
          const col2 = columns[j];

          // Check if columns are in same row or column
          if (col1.y === col2.y) {
            // Same row - check x distance
            const xDist = Math.abs(col2.x - col1.x);
            expect(xDist).toBeGreaterThanOrEqual(6);
          } else if (col1.x === col2.x) {
            // Same column - check y distance
            const yDist = Math.abs(col2.y - col1.y);
            expect(yDist).toBeGreaterThanOrEqual(6);
          }
        }
      }
    });

    it('should use default options when none provided', () => {
      const room = createRoom(5, 5, 15, 15);
      carveRoom(map, room);

      const columns = generateColumnsForRoom(map, room, rng);

      // Should work without errors and produce some columns (with default density)
      expect(Array.isArray(columns)).toBe(true);
    });
  });

  describe('generateColumnsForRoom - Determinism', () => {
    it('should produce same results with same seed', () => {
      const room = createRoom(5, 5, 20, 20);
      carveRoom(map, room);

      const rng1 = xoroshiro128plus(BigInt(99999));
      const columns1 = generateColumnsForRoom(map, room, rng1, {
        density: 0.7,
      });

      // Reset map and RNG with same seed
      map = createMap(40, 30, { defaultTile: Tiles.Wall });
      carveRoom(map, room);
      const rng2 = xoroshiro128plus(BigInt(99999));
      const columns2 = generateColumnsForRoom(map, room, rng2, {
        density: 0.7,
      });

      expect(columns1).toEqual(columns2);
    });

    it('should produce different results with different seeds', () => {
      const room = createRoom(5, 5, 20, 20);
      carveRoom(map, room);

      const rng1 = xoroshiro128plus(BigInt(11111));
      const columns1 = generateColumnsForRoom(map, room, rng1, {
        density: 0.7,
      });

      // Reset map with different seed
      map = createMap(40, 30, { defaultTile: Tiles.Wall });
      carveRoom(map, room);
      const rng2 = xoroshiro128plus(BigInt(22222));
      const columns2 = generateColumnsForRoom(map, room, rng2, {
        density: 0.7,
      });

      // Results should differ (with high probability)
      expect(columns1).not.toEqual(columns2);
    });
  });

  describe('generateColumns - Multiple Rooms', () => {
    it('should generate columns for multiple rooms', () => {
      const room1 = createRoom(5, 5, 15, 15);
      const room2 = createRoom(22, 8, 12, 12);
      carveRoom(map, room1);
      carveRoom(map, room2);

      const rooms = [room1, room2];
      const columnsByRoom = generateColumns(map, rooms, rng, {
        density: 1.0,
      });

      expect(columnsByRoom.size).toBeGreaterThan(0);
      expect(columnsByRoom.has(0) || columnsByRoom.has(1)).toBe(true);
    });

    it('should return map with room indices as keys', () => {
      const room1 = createRoom(5, 5, 15, 15);
      const room2 = createRoom(22, 8, 12, 12);
      carveRoom(map, room1);
      carveRoom(map, room2);

      const rooms = [room1, room2];
      const columnsByRoom = generateColumns(map, rooms, rng, {
        density: 1.0,
      });

      for (const [index, columns] of columnsByRoom) {
        expect(typeof index).toBe('number');
        expect(Array.isArray(columns)).toBe(true);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(rooms.length);
      }
    });

    it('should skip rooms that are too small', () => {
      const smallRoom = createRoom(5, 5, 8, 8);
      const largeRoom = createRoom(20, 5, 15, 15);
      carveRoom(map, smallRoom);
      carveRoom(map, largeRoom);

      const rooms = [smallRoom, largeRoom];
      const columnsByRoom = generateColumns(map, rooms, rng, {
        density: 1.0,
      });

      // Small room should not have columns
      expect(columnsByRoom.has(0)).toBe(false);
      // Large room should have columns
      expect(columnsByRoom.has(1)).toBe(true);
    });

    it('should handle empty room array', () => {
      const columnsByRoom = generateColumns(map, [], rng);
      expect(columnsByRoom.size).toBe(0);
    });

    it('should not include rooms with no columns placed', () => {
      const room = createRoom(5, 5, 15, 15);
      carveRoom(map, room);

      const rooms = [room];
      const columnsByRoom = generateColumns(map, rooms, rng, {
        density: 0.0, // Never place columns
      });

      expect(columnsByRoom.size).toBe(0);
    });
  });

  describe('DEFAULT_COLUMN_OPTIONS', () => {
    it('should have all required properties', () => {
      expect(DEFAULT_COLUMN_OPTIONS.minRoomSize).toBeDefined();
      expect(DEFAULT_COLUMN_OPTIONS.columnSize).toBeDefined();
      expect(DEFAULT_COLUMN_OPTIONS.spacing).toBeDefined();
      expect(DEFAULT_COLUMN_OPTIONS.density).toBeDefined();
      expect(DEFAULT_COLUMN_OPTIONS.edgeBuffer).toBeDefined();
      expect(DEFAULT_COLUMN_OPTIONS.corridorBuffer).toBeDefined();
    });

    it('should have reasonable default values', () => {
      expect(DEFAULT_COLUMN_OPTIONS.minRoomSize.width).toBeGreaterThan(0);
      expect(DEFAULT_COLUMN_OPTIONS.minRoomSize.height).toBeGreaterThan(0);
      expect(DEFAULT_COLUMN_OPTIONS.columnSize.min).toBeGreaterThan(0);
      expect(DEFAULT_COLUMN_OPTIONS.columnSize.max).toBeGreaterThanOrEqual(
        DEFAULT_COLUMN_OPTIONS.columnSize.min
      );
      expect(DEFAULT_COLUMN_OPTIONS.spacing.min).toBeGreaterThan(0);
      expect(DEFAULT_COLUMN_OPTIONS.spacing.max).toBeGreaterThanOrEqual(
        DEFAULT_COLUMN_OPTIONS.spacing.min
      );
      expect(DEFAULT_COLUMN_OPTIONS.density).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_COLUMN_OPTIONS.density).toBeLessThanOrEqual(1);
      expect(DEFAULT_COLUMN_OPTIONS.edgeBuffer).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_COLUMN_OPTIONS.corridorBuffer).toBeGreaterThanOrEqual(0);
    });
  });
});
