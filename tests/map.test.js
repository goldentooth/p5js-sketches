import { describe, it, expect } from 'vitest';
import { Tiles, createMap } from '../src';

describe('Tiles', () => {
  it('should have Wall and Floor constants', () => {
    expect(Tiles.Wall).toBeDefined();
    expect(Tiles.Floor).toBeDefined();
  });

  it('should have distinct values', () => {
    expect(Tiles.Wall).not.toBe(Tiles.Floor);
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
        expect(map.getTile(x, y)).toBe(Tiles.Wall);
      }
    }
  });

  it('should default to block edge behavior', () => {
    const map = createMap(10, 10);
    expect(map.edgeBehavior).toBe('block');
  });

  it('should accept custom edge behavior', () => {
    const map = createMap(10, 10, { edgeBehavior: 'wrap' });
    expect(map.edgeBehavior).toBe('wrap');
  });

  it('should accept custom default tile', () => {
    const map = createMap(10, 10, { defaultTile: Tiles.Floor });
    expect(map.getTile(5, 5)).toBe(Tiles.Floor);
  });
});

describe('Map Tile Operations', () => {
  it('should get and set tiles by coordinates', () => {
    const map = createMap(10, 10);

    // Set a floor tile
    map.setTile(5, 5, Tiles.Floor);
    expect(map.getTile(5, 5)).toBe(Tiles.Floor);

    // Set a wall tile
    map.setTile(3, 3, Tiles.Wall);
    expect(map.getTile(3, 3)).toBe(Tiles.Wall);
  });

  it('should handle boundary tiles correctly', () => {
    const map = createMap(10, 10);

    // Top-left corner
    map.setTile(0, 0, Tiles.Floor);
    expect(map.getTile(0, 0)).toBe(Tiles.Floor);

    // Bottom-right corner
    map.setTile(9, 9, Tiles.Floor);
    expect(map.getTile(9, 9)).toBe(Tiles.Floor);

    // Boundaries should remain walls initially
    const bottomRight = createMap(5, 5);
    expect(bottomRight.getTile(4, 4)).toBe(Tiles.Wall);
  });

  it('should get and set tiles by index', () => {
    const map = createMap(10, 10);

    // Index for position (5, 5) in a 10-wide map is: 5 * 10 + 5 = 55
    map.setTileByIndex(55, Tiles.Floor);
    expect(map.getTileByIndex(55)).toBe(Tiles.Floor);

    // Verify it matches coordinate access
    expect(map.getTile(5, 5)).toBe(Tiles.Floor);
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
    map.setTile(5, 5, Tiles.Floor);
    expect(map.blocksMovement(5, 5)).toBe(false);
  });

  it('should treat out-of-bounds as blocking movement with block edge behavior', () => {
    const map = createMap(10, 10, { edgeBehavior: 'block' });

    expect(map.blocksMovement(-1, 0)).toBe(true);
    expect(map.blocksMovement(10, 10)).toBe(true);
  });
});

describe('Map Edge Behavior - Wrapping', () => {
  it('should wrap coordinates when getting tiles', () => {
    const map = createMap(10, 10, { edgeBehavior: 'wrap' });

    // Set a floor at (0, 0)
    map.setTile(0, 0, Tiles.Floor);

    // Accessing with wrapped coordinates should get the same tile
    expect(map.getTile(10, 0)).toBe(Tiles.Floor);  // wraps to (0, 0)
    expect(map.getTile(-10, 0)).toBe(Tiles.Floor); // wraps to (0, 0)
    expect(map.getTile(0, 10)).toBe(Tiles.Floor);  // wraps to (0, 0)
    expect(map.getTile(0, -10)).toBe(Tiles.Floor); // wraps to (0, 0)
  });

  it('should wrap coordinates when setting tiles', () => {
    const map = createMap(10, 10, { edgeBehavior: 'wrap' });

    // Set tile using wrapped coordinates
    map.setTile(10, 5, Tiles.Floor);

    // Should be set at wrapped position (0, 5)
    expect(map.getTile(0, 5)).toBe(Tiles.Floor);

    // Negative wrapping
    map.setTile(-1, -1, Tiles.Floor);
    expect(map.getTile(9, 9)).toBe(Tiles.Floor);
  });

  it('should not block movement at edges with wrapping', () => {
    const map = createMap(10, 10, {
      edgeBehavior: 'wrap',
      defaultTile: Tiles.Floor
    });

    // Out of bounds coordinates should wrap, not block
    expect(map.blocksMovement(-1, 0)).toBe(false);
    expect(map.blocksMovement(10, 0)).toBe(false);
    expect(map.blocksMovement(0, -1)).toBe(false);
    expect(map.blocksMovement(0, 10)).toBe(false);
  });

  it('should still block on wall tiles with wrapping', () => {
    const map = createMap(10, 10, { edgeBehavior: 'wrap' });

    // Set a wall at wrapped position
    map.setTile(0, 0, Tiles.Wall);

    // Should block movement when accessing via wrapped coords
    expect(map.blocksMovement(10, 0)).toBe(true);
    expect(map.blocksMovement(-10, 0)).toBe(true);
  });

  it('should wrap large coordinate values correctly', () => {
    const map = createMap(10, 10, { edgeBehavior: 'wrap' });

    map.setTile(0, 0, Tiles.Floor);

    // Large positive values
    expect(map.getTile(20, 30)).toBe(Tiles.Floor); // wraps to (0, 0)
    expect(map.getTile(100, 200)).toBe(Tiles.Floor); // wraps to (0, 0)

    // Large negative values
    expect(map.getTile(-20, -30)).toBe(Tiles.Floor); // wraps to (0, 0)
  });
});
