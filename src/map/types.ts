import type { As } from '../types';

/**
 * A tile type identifier
 * Tiles represent terrain structure (walls, floors, water, lava, etc.)
 */
export type TileType = number & As<'tile-type'>;

/**
 * Common tile type constants
 * Projects can define additional tile types as needed
 */
export const Tiles = {
  Wall: 0 as TileType,
  Floor: 1 as TileType,
} as const;

/**
 * How the map handles coordinates at edges
 */
export type EdgeBehavior = 'block' | 'wrap';

/**
 * Options for map creation
 */
export interface MapOptions {
  /** Default tile to fill the map with */
  defaultTile?: TileType;
  /** How to handle coordinates at map edges */
  edgeBehavior?: EdgeBehavior;
}

/**
 * A roguelike map with tiles
 */
export interface Map {
  /** Width of the map in tiles */
  width: number;
  /** Height of the map in tiles */
  height: number;
  /** Edge behavior for this map */
  edgeBehavior: EdgeBehavior;

  /** Get tile at coordinates */
  getTile(x: number, y: number): TileType;
  /** Set tile at coordinates */
  setTile(x: number, y: number, tile: TileType): void;

  /** Get tile by linear index */
  getTileByIndex(index: number): TileType;
  /** Set tile by linear index */
  setTileByIndex(index: number, tile: TileType): void;

  /** Convert coordinates to linear index */
  coordsToIndex(x: number, y: number): number;
  /** Convert linear index to coordinates */
  indexToCoords(index: number): { x: number; y: number };

  /** Check if coordinates are within canonical map bounds */
  isInBounds(x: number, y: number): boolean;

  /** Check if a tile blocks movement */
  blocksMovement(x: number, y: number): boolean;
}

/**
 * A rectangular room in a map
 */
export interface Room {
  /** X coordinate of top-left corner */
  x: number;
  /** Y coordinate of top-left corner */
  y: number;
  /** Width of the room */
  width: number;
  /** Height of the room */
  height: number;

  /** Get the center coordinates of the room */
  center(): { x: number; y: number };

  /** Get the left edge x coordinate */
  x1(): number;
  /** Get the right edge x coordinate */
  x2(): number;
  /** Get the top edge y coordinate */
  y1(): number;
  /** Get the bottom edge y coordinate */
  y2(): number;
}

/**
 * Options for procedural map generation
 */
export interface GenerationOptions {
  /** Maximum number of rooms to attempt to place */
  maxRooms: number;
  /** Minimum room size (width and height) */
  minRoomSize: number;
  /** Maximum room size (width and height) */
  maxRoomSize: number;
  /** Maximum attempts to place each room before giving up */
  maxAttempts?: number;
}
