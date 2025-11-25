import { describe, it, expect } from 'vitest';
import { TileType, createMap } from '../src';

describe('TileType', () => {
  it('should have Wall and Floor types', () => {
    expect(TileType.Wall).toBeDefined();
    expect(TileType.Floor).toBeDefined();
  });

  it('should have distinct values', () => {
    expect(TileType.Wall).not.toBe(TileType.Floor);
  });
});

describe('Map Creation', () => {
  it('should create a map with specified dimensions', () => {
    const map = createMap(80, 50);
    expect(map.width).toBe(80);
    expect(map.height).toBe(50);
  });

  it('should initialize all tiles as walls by default', () => {
    const map = createMap(10, 10);

    // Check all tiles are walls
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        expect(map.getTile(x, y)).toBe(TileType.Wall);
      }
    }
  });
});

describe('Map Tile Operations', () => {
  it('should get and set tiles by coordinates', () => {
    const map = createMap(10, 10);

    // Set a floor tile
    map.setTile(5, 5, TileType.Floor);
    expect(map.getTile(5, 5)).toBe(TileType.Floor);

    // Set a wall tile
    map.setTile(3, 3, TileType.Wall);
    expect(map.getTile(3, 3)).toBe(TileType.Wall);
  });

  it('should handle boundary tiles correctly', () => {
    const map = createMap(10, 10);

    // Top-left corner
    map.setTile(0, 0, TileType.Floor);
    expect(map.getTile(0, 0)).toBe(TileType.Floor);

    // Bottom-right corner
    map.setTile(9, 9, TileType.Floor);
    expect(map.getTile(9, 9)).toBe(TileType.Floor);

    // Boundaries should remain walls initially
    const bottomRight = createMap(5, 5);
    expect(bottomRight.getTile(4, 4)).toBe(TileType.Wall);
  });

  it('should get and set tiles by index', () => {
    const map = createMap(10, 10);

    // Index for position (5, 5) in a 10-wide map is: 5 * 10 + 5 = 55
    map.setTileByIndex(55, TileType.Floor);
    expect(map.getTileByIndex(55)).toBe(TileType.Floor);

    // Verify it matches coordinate access
    expect(map.getTile(5, 5)).toBe(TileType.Floor);
  });
});

describe('Map Index Conversion', () => {
  it('should convert coordinates to index correctly', () => {
    const map = createMap(80, 50);

    // Top-left (0, 0) -> 0
    expect(map.coordsToIndex(0, 0)).toBe(0);

    // Position (5, 0) -> 5
    expect(map.coordsToIndex(5, 0)).toBe(5);

    // Position (0, 1) -> 80 (start of second row)
    expect(map.coordsToIndex(0, 1)).toBe(80);

    // Position (5, 3) -> 3 * 80 + 5 = 245
    expect(map.coordsToIndex(5, 3)).toBe(245);
  });

  it('should convert index to coordinates correctly', () => {
    const map = createMap(80, 50);

    // Index 0 -> (0, 0)
    expect(map.indexToCoords(0)).toEqual({ x: 0, y: 0 });

    // Index 5 -> (5, 0)
    expect(map.indexToCoords(5)).toEqual({ x: 5, y: 0 });

    // Index 80 -> (0, 1)
    expect(map.indexToCoords(80)).toEqual({ x: 0, y: 1 });

    // Index 245 -> (5, 3)
    expect(map.indexToCoords(245)).toEqual({ x: 5, y: 3 });
  });

  it('should have consistent coordinate/index round-trip conversion', () => {
    const map = createMap(80, 50);

    const coords = [
      { x: 0, y: 0 },
      { x: 79, y: 0 },
      { x: 0, y: 49 },
      { x: 79, y: 49 },
      { x: 40, y: 25 },
    ];

    coords.forEach(({ x, y }) => {
      const index = map.coordsToIndex(x, y);
      const converted = map.indexToCoords(index);
      expect(converted.x).toBe(x);
      expect(converted.y).toBe(y);
    });
  });
});

describe('Map Bounds Checking', () => {
  it('should identify in-bounds coordinates', () => {
    const map = createMap(10, 10);

    expect(map.isInBounds(0, 0)).toBe(true);
    expect(map.isInBounds(5, 5)).toBe(true);
    expect(map.isInBounds(9, 9)).toBe(true);
  });

  it('should identify out-of-bounds coordinates', () => {
    const map = createMap(10, 10);

    expect(map.isInBounds(-1, 0)).toBe(false);
    expect(map.isInBounds(0, -1)).toBe(false);
    expect(map.isInBounds(10, 0)).toBe(false);
    expect(map.isInBounds(0, 10)).toBe(false);
    expect(map.isInBounds(10, 10)).toBe(false);
  });
});

describe('Map Tile Queries', () => {
  it('should check if tile blocks movement (walls block, floors do not)', () => {
    const map = createMap(10, 10);

    // Wall blocks movement
    expect(map.blocksMovement(0, 0)).toBe(true);

    // Floor does not block movement
    map.setTile(5, 5, TileType.Floor);
    expect(map.blocksMovement(5, 5)).toBe(false);
  });

  it('should treat out-of-bounds as blocking movement', () => {
    const map = createMap(10, 10);

    expect(map.blocksMovement(-1, 0)).toBe(true);
    expect(map.blocksMovement(10, 10)).toBe(true);
  });
});
