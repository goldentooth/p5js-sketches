import { GridX, GridY } from '../../grid/types.js';

export const Position = 'position';
// Note that the x and y here are in grid coordinates, not pixel coordinates.
export interface Position {
  x: GridX;
  y: GridY;
}
