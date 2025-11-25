/**
 * Types of tiles in the map
 */
export enum TileType {
  Wall = 0,
  Floor = 1,
}

/**
 * A roguelike map with tiles
 */
export interface Map {
  /** Width of the map in tiles */
  width: number;
  /** Height of the map in tiles */
  height: number;

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

  /** Check if coordinates are within map bounds */
  isInBounds(x: number, y: number): boolean;

  /** Check if a tile blocks movement */
  blocksMovement(x: number, y: number): boolean;
}
