import type p5 from 'p5';
import type { Renderable } from '../render/types';
import type { As } from '../types';

export type GridX = number & As<'grid-x'>;
export type GridY = number & As<'grid-y'>;
export type GridIndex = number & As<'grid-index'>;
export type GridHeight = number & As<'grid-height'>;
export type GridWidth = number & As<'grid-width'>;

export interface GridCell extends Renderable {
  index: GridIndex;
  x: GridX;
  y: GridY;
  value: any;
}

export interface Grid {
  columns: number;
  rows: number;
  init(func: (cell: GridCell) => void): void;
  setCell(x: GridX, y: GridY, value: GridCell): void;
  getCell(x: GridX, y: GridY): GridCell;
  clearCell(x: GridX, y: GridY): void;
  setCellByIndex(index: GridIndex, value: GridCell): void;
  getCellByIndex(index: GridIndex): GridCell;
  clearCellByIndex(index: GridIndex): void;
  forEachCell(callback: (cell: GridCell) => void): void;
}

