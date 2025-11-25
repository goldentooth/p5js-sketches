import type { Map, TileType } from './types';

/**
 * Iterate over all tiles in the map
 * @param map - The map to iterate
 * @param callback - Function called for each tile with (x, y, tile)
 */
export function forEachTile(
  map: Map,
  callback: (x: number, y: number, tile: TileType) => void
): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.getTile(x, y);
      callback(x, y, tile);
    }
  }
}

/**
 * Find all positions containing a specific tile type
 * @param map - The map to search
 * @param tileType - The tile type to find
 * @returns Array of positions {x, y} where the tile exists
 */
export function findTiles(
  map: Map,
  tileType: TileType
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];

  forEachTile(map, (x, y, tile) => {
    if (tile === tileType) {
      positions.push({ x, y });
    }
  });

  return positions;
}

/**
 * Count occurrences of a specific tile type
 * @param map - The map to search
 * @param tileType - The tile type to count
 * @returns Number of tiles of this type
 */
export function countTiles(map: Map, tileType: TileType): number {
  let count = 0;

  forEachTile(map, (x, y, tile) => {
    if (tile === tileType) {
      count++;
    }
  });

  return count;
}

/**
 * Find all tiles matching a predicate
 * @param map - The map to search
 * @param predicate - Function to test each tile
 * @returns Array of positions {x, y, tile} that match
 */
export function findTilesWhere(
  map: Map,
  predicate: (x: number, y: number, tile: TileType) => boolean
): Array<{ x: number; y: number; tile: TileType }> {
  const positions: Array<{ x: number; y: number; tile: TileType }> = [];

  forEachTile(map, (x, y, tile) => {
    if (predicate(x, y, tile)) {
      positions.push({ x, y, tile });
    }
  });

  return positions;
}

/**
 * Check if any tile matches a predicate
 * @param map - The map to search
 * @param predicate - Function to test each tile
 * @returns True if at least one tile matches
 */
export function someTile(
  map: Map,
  predicate: (x: number, y: number, tile: TileType) => boolean
): boolean {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.getTile(x, y);
      if (predicate(x, y, tile)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if all tiles match a predicate
 * @param map - The map to search
 * @param predicate - Function to test each tile
 * @returns True if all tiles match
 */
export function everyTile(
  map: Map,
  predicate: (x: number, y: number, tile: TileType) => boolean
): boolean {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.getTile(x, y);
      if (!predicate(x, y, tile)) {
        return false;
      }
    }
  }
  return true;
}
