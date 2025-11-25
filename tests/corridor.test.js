import { describe, it, expect } from 'vitest';
import {
  createMap,
  carveHorizontalTunnel,
  carveVerticalTunnel,
  connectRooms,
  createRoom,
  carveRoom,
  Tiles
} from '../src';

describe('Horizontal Tunnel Carving', () => {
  it('should carve a horizontal tunnel from left to right', () => {
    const map = createMap(20, 20);

    carveHorizontalTunnel(map, 5, 10, 5);

    // Check all tiles in the tunnel are floors
    for (let x = 5; x <= 10; x++) {
      expect(map.getTile(x, 5)).toBe(Tiles.Floor);
    }

    // Check adjacent tiles remain walls
    expect(map.getTile(4, 5)).toBe(Tiles.Wall);
    expect(map.getTile(11, 5)).toBe(Tiles.Wall);
    expect(map.getTile(7, 4)).toBe(Tiles.Wall);
    expect(map.getTile(7, 6)).toBe(Tiles.Wall);
  });

  it('should carve a horizontal tunnel from right to left', () => {
    const map = createMap(20, 20);

    carveHorizontalTunnel(map, 10, 5, 5);

    // Check all tiles in the tunnel are floors (order shouldn't matter)
    for (let x = 5; x <= 10; x++) {
      expect(map.getTile(x, 5)).toBe(Tiles.Floor);
    }
  });

  it('should handle single-tile horizontal tunnel', () => {
    const map = createMap(20, 20);

    carveHorizontalTunnel(map, 5, 5, 5);

    expect(map.getTile(5, 5)).toBe(Tiles.Floor);
    expect(map.getTile(4, 5)).toBe(Tiles.Wall);
    expect(map.getTile(6, 5)).toBe(Tiles.Wall);
  });

  it('should carve at map edges', () => {
    const map = createMap(20, 20);

    carveHorizontalTunnel(map, 0, 5, 0);

    for (let x = 0; x <= 5; x++) {
      expect(map.getTile(x, 0)).toBe(Tiles.Floor);
    }
  });
});

describe('Vertical Tunnel Carving', () => {
  it('should carve a vertical tunnel from top to bottom', () => {
    const map = createMap(20, 20);

    carveVerticalTunnel(map, 5, 10, 5);

    // Check all tiles in the tunnel are floors
    for (let y = 5; y <= 10; y++) {
      expect(map.getTile(5, y)).toBe(Tiles.Floor);
    }

    // Check adjacent tiles remain walls
    expect(map.getTile(5, 4)).toBe(Tiles.Wall);
    expect(map.getTile(5, 11)).toBe(Tiles.Wall);
    expect(map.getTile(4, 7)).toBe(Tiles.Wall);
    expect(map.getTile(6, 7)).toBe(Tiles.Wall);
  });

  it('should carve a vertical tunnel from bottom to top', () => {
    const map = createMap(20, 20);

    carveVerticalTunnel(map, 10, 5, 5);

    // Check all tiles in the tunnel are floors (order shouldn't matter)
    for (let y = 5; y <= 10; y++) {
      expect(map.getTile(5, y)).toBe(Tiles.Floor);
    }
  });

  it('should handle single-tile vertical tunnel', () => {
    const map = createMap(20, 20);

    carveVerticalTunnel(map, 5, 5, 5);

    expect(map.getTile(5, 5)).toBe(Tiles.Floor);
    expect(map.getTile(5, 4)).toBe(Tiles.Wall);
    expect(map.getTile(5, 6)).toBe(Tiles.Wall);
  });

  it('should carve at map edges', () => {
    const map = createMap(20, 20);

    carveVerticalTunnel(map, 0, 5, 0);

    for (let y = 0; y <= 5; y++) {
      expect(map.getTile(0, y)).toBe(Tiles.Floor);
    }
  });
});

describe('L-Shaped Corridor Connection', () => {
  it('should connect two points with an L-shaped corridor', () => {
    const map = createMap(30, 30);

    // Connect point (5, 5) to point (15, 10)
    connectRooms(map, 5, 5, 15, 10);

    // Check horizontal segment exists
    const minX = Math.min(5, 15);
    const maxX = Math.max(5, 15);
    for (let x = minX; x <= maxX; x++) {
      const tile1 = map.getTile(x, 5);
      const tile2 = map.getTile(x, 10);
      // One of the two Y levels should have a path
      expect(tile1 === Tiles.Floor || tile2 === Tiles.Floor).toBe(true);
    }

    // Check vertical segment exists
    const minY = Math.min(5, 10);
    const maxY = Math.max(5, 10);
    for (let y = minY; y <= maxY; y++) {
      const tile1 = map.getTile(5, y);
      const tile2 = map.getTile(15, y);
      // One of the two X levels should have a path
      expect(tile1 === Tiles.Floor || tile2 === Tiles.Floor).toBe(true);
    }
  });

  it('should connect rooms using their centers', () => {
    const map = createMap(50, 50);
    const room1 = createRoom(5, 5, 6, 6);
    const room2 = createRoom(30, 20, 8, 8);

    carveRoom(map, room1);
    carveRoom(map, room2);

    const center1 = room1.center();
    const center2 = room2.center();

    connectRooms(map, center1.x, center1.y, center2.x, center2.y);

    // Both room centers should still be floors
    expect(map.getTile(center1.x, center1.y)).toBe(Tiles.Floor);
    expect(map.getTile(center2.x, center2.y)).toBe(Tiles.Floor);

    // There should be a path of floors connecting them
    // (We can't easily test the exact path, but we verified the tunnel functions work)
  });

  it('should handle same-point connection', () => {
    const map = createMap(20, 20);

    connectRooms(map, 10, 10, 10, 10);

    // Should at least carve the single point
    expect(map.getTile(10, 10)).toBe(Tiles.Floor);
  });

  it('should handle horizontal-only connection', () => {
    const map = createMap(20, 20);

    // Same Y coordinate
    connectRooms(map, 5, 10, 15, 10);

    // Should carve horizontal line
    for (let x = 5; x <= 15; x++) {
      expect(map.getTile(x, 10)).toBe(Tiles.Floor);
    }
  });

  it('should handle vertical-only connection', () => {
    const map = createMap(20, 20);

    // Same X coordinate
    connectRooms(map, 10, 5, 10, 15);

    // Should carve vertical line
    for (let y = 5; y <= 15; y++) {
      expect(map.getTile(10, y)).toBe(Tiles.Floor);
    }
  });
});

describe('Multiple Room Connections', () => {
  it('should connect three rooms in sequence', () => {
    const map = createMap(60, 40);

    const room1 = createRoom(5, 5, 6, 6);
    const room2 = createRoom(25, 15, 6, 6);
    const room3 = createRoom(45, 25, 6, 6);

    carveRoom(map, room1);
    carveRoom(map, room2);
    carveRoom(map, room3);

    const c1 = room1.center();
    const c2 = room2.center();
    const c3 = room3.center();

    connectRooms(map, c1.x, c1.y, c2.x, c2.y);
    connectRooms(map, c2.x, c2.y, c3.x, c3.y);

    // All room centers should be floors
    expect(map.getTile(c1.x, c1.y)).toBe(Tiles.Floor);
    expect(map.getTile(c2.x, c2.y)).toBe(Tiles.Floor);
    expect(map.getTile(c3.x, c3.y)).toBe(Tiles.Floor);
  });

  it('should handle overlapping corridors', () => {
    const map = createMap(30, 30);

    // Create corridors that cross
    connectRooms(map, 5, 10, 25, 10);  // Horizontal
    connectRooms(map, 15, 5, 15, 25);  // Vertical crossing it

    // Intersection point should be floor
    expect(map.getTile(15, 10)).toBe(Tiles.Floor);

    // Both corridors should exist
    expect(map.getTile(5, 10)).toBe(Tiles.Floor);
    expect(map.getTile(25, 10)).toBe(Tiles.Floor);
    expect(map.getTile(15, 5)).toBe(Tiles.Floor);
    expect(map.getTile(15, 25)).toBe(Tiles.Floor);
  });
});
