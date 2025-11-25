export * from './types';

import type { Map, MapOptions, TileType } from './types';
import { Tiles } from './types';

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
