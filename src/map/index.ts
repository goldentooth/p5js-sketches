export * from './types';

import type { Map } from './types';
import { TileType } from './types';

/**
 * Create a new map with the specified dimensions
 * All tiles are initialized as walls
 */
export function createMap(width: number, height: number): Map {
  const tiles = new Array(width * height).fill(TileType.Wall);

  return {
    width,
    height,

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
      const index = this.coordsToIndex(x, y);
      return tiles[index];
    },

    setTile(x: number, y: number, tile: TileType): void {
      const index = this.coordsToIndex(x, y);
      tiles[index] = tile;
    },

    getTileByIndex(index: number): TileType {
      return tiles[index];
    },

    setTileByIndex(index: number, tile: TileType): void {
      tiles[index] = tile;
    },

    blocksMovement(x: number, y: number): boolean {
      // Out of bounds blocks movement
      if (!this.isInBounds(x, y)) {
        return true;
      }
      // Walls block movement, floors do not
      return this.getTile(x, y) === TileType.Wall;
    },
  };
}
