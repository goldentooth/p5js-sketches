export * from './types';
export * from './LayerManager';

import type { PixelX, PixelY, PixelHeight, PixelWidth } from './types';
import type { GridX, GridY } from '../grid';

export function gridToPixelX(gridX: GridX, cellWidth: PixelWidth): PixelX {
  return Math.floor(gridX * cellWidth) as PixelX;
}

export function gridToPixelY(gridY: GridY, cellHeight: PixelHeight): PixelY {
  return Math.floor(gridY * cellHeight) as PixelY;
}

export function pixelToGridX(pixelX: PixelX, cellWidth: PixelWidth): GridX {
  return Math.floor(pixelX / cellWidth) as GridX;
}

export function pixelToGridY(pixelY: PixelY, cellHeight: PixelHeight): GridY {
  return Math.floor(pixelY / cellHeight) as GridY;
}
