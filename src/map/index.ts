export * from './types';

import type { Map, MapOptions, TileType, Room, GenerationOptions } from './types';
import { Tiles } from './types';
import type { xoroshiro128plus } from '../rng';

type RNG = ReturnType<typeof xoroshiro128plus>;

/**
 * Wrap a value to be within [0, max)
 */
function wrap(value: number, max: number): number {
  return ((value % max) + max) % max;
}

/**
 * Create a new map with the specified dimensions
 * @param width Width of the map in tiles
 * @param height Height of the map in tiles
 * @param options Optional configuration for default tile and edge behavior
 */
export function createMap(width: number, height: number, options?: MapOptions): Map {
  const defaultTile = options?.defaultTile ?? Tiles.Wall;
  const edgeBehavior = options?.edgeBehavior ?? 'block';
  const tiles = new Array(width * height).fill(defaultTile);

  /**
   * Normalize coordinates based on edge behavior
   * For 'wrap': wraps coordinates to valid range
   * For 'block': returns original coordinates
   */
  function normalizeCoords(x: number, y: number): { x: number; y: number } {
    if (edgeBehavior === 'wrap') {
      return {
        x: wrap(x, width),
        y: wrap(y, height),
      };
    }
    return { x, y };
  }

  return {
    width,
    height,
    edgeBehavior,

    coordsToIndex(x: number, y: number): number {
      return y * width + x;
    },

    indexToCoords(index: number): { x: number; y: number } {
      const y = Math.floor(index / width);
      const x = index % width;
      return { x, y };
    },

    isInBounds(x: number, y: number): boolean {
      return x >= 0 && x < width && y >= 0 && y < height;
    },

    getTile(x: number, y: number): TileType {
      const normalized = normalizeCoords(x, y);
      const index = this.coordsToIndex(normalized.x, normalized.y);
      return tiles[index];
    },

    setTile(x: number, y: number, tile: TileType): void {
      const normalized = normalizeCoords(x, y);
      const index = this.coordsToIndex(normalized.x, normalized.y);
      tiles[index] = tile;
    },

    getTileByIndex(index: number): TileType {
      return tiles[index];
    },

    setTileByIndex(index: number, tile: TileType): void {
      tiles[index] = tile;
    },

    blocksMovement(x: number, y: number): boolean {
      // With wrapping, coordinates wrap around rather than blocking
      if (edgeBehavior === 'wrap') {
        const normalized = normalizeCoords(x, y);
        return this.getTile(normalized.x, normalized.y) === Tiles.Wall;
      }

      // With blocking, out of bounds blocks movement
      if (!this.isInBounds(x, y)) {
        return true;
      }

      // Check if the tile itself blocks movement
      return this.getTile(x, y) === Tiles.Wall;
    },
  };
}

/**
 * Create a rectangular room
 * @param x X coordinate of top-left corner
 * @param y Y coordinate of top-left corner
 * @param width Width of the room
 * @param height Height of the room
 */
export function createRoom(x: number, y: number, width: number, height: number): Room {
  return {
    x,
    y,
    width,
    height,

    center(): { x: number; y: number } {
      return {
        x: Math.floor(x + width / 2),
        y: Math.floor(y + height / 2),
      };
    },

    x1(): number {
      return x;
    },

    x2(): number {
      return x + width - 1;
    },

    y1(): number {
      return y;
    },

    y2(): number {
      return y + height - 1;
    },
  };
}

/**
 * Check if two rooms overlap
 * Rooms that only share an edge are not considered overlapping
 */
export function roomsOverlap(room1: Room, room2: Room): boolean {
  return (
    room1.x1() <= room2.x2() &&
    room1.x2() >= room2.x1() &&
    room1.y1() <= room2.y2() &&
    room1.y2() >= room2.y1()
  );
}

/**
 * Carve a room into the map by setting all tiles to floor
 */
export function carveRoom(map: Map, room: Room): void {
  for (let y = room.y1(); y <= room.y2(); y++) {
    for (let x = room.x1(); x <= room.x2(); x++) {
      map.setTile(x, y, Tiles.Floor);
    }
  }
}

/**
 * Carve a horizontal tunnel between two x coordinates at a given y
 */
export function carveHorizontalTunnel(map: Map, x1: number, x2: number, y: number): void {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);

  for (let x = minX; x <= maxX; x++) {
    map.setTile(x, y, Tiles.Floor);
  }
}

/**
 * Carve a vertical tunnel between two y coordinates at a given x
 */
export function carveVerticalTunnel(map: Map, y1: number, y2: number, x: number): void {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  for (let y = minY; y <= maxY; y++) {
    map.setTile(x, y, Tiles.Floor);
  }
}

/**
 * Connect two points with an L-shaped corridor
 * Creates a horizontal tunnel, then a vertical tunnel
 */
export function connectRooms(map: Map, x1: number, y1: number, x2: number, y2: number): void {
  // Carve horizontal tunnel from (x1, y1) to (x2, y1)
  carveHorizontalTunnel(map, x1, x2, y1);

  // Carve vertical tunnel from (x2, y1) to (x2, y2)
  carveVerticalTunnel(map, y1, y2, x2);
}

/**
 * Generate a dungeon with randomly-placed rooms connected by corridors
 * @param map The map to generate into
 * @param rng Random number generator
 * @param options Generation options
 * @returns Array of generated rooms
 */
export function generateRoomsAndCorridors(
  map: Map,
  rng: RNG,
  options: GenerationOptions
): Room[] {
  const { maxRooms, minRoomSize, maxRoomSize, maxAttempts = 30 } = options;
  const rooms: Room[] = [];

  for (let roomIndex = 0; roomIndex < maxRooms; roomIndex++) {
    let placed = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random room size
      const width = rng.nextRange(minRoomSize, maxRoomSize + 1);
      const height = rng.nextRange(minRoomSize, maxRoomSize + 1);

      // Generate random position (ensure room fits in map)
      const x = rng.nextRange(0, map.width - width);
      const y = rng.nextRange(0, map.height - height);

      // Create room
      const room = createRoom(x, y, width, height);

      // Check if room overlaps with any existing room
      let overlaps = false;
      for (const existingRoom of rooms) {
        if (roomsOverlap(room, existingRoom)) {
          overlaps = true;
          break;
        }
      }

      // If no overlap, place the room
      if (!overlaps) {
        carveRoom(map, room);

        // Connect to previous room if this isn't the first room
        if (rooms.length > 0) {
          const prevRoom = rooms[rooms.length - 1];
          const prevCenter = prevRoom.center();
          const newCenter = room.center();
          connectRooms(map, prevCenter.x, prevCenter.y, newCenter.x, newCenter.y);
        }

        rooms.push(room);
        placed = true;
        break;
      }
    }

    // If we couldn't place a room after max attempts, stop trying
    if (!placed) {
      break;
    }
  }

  return rooms;
}
