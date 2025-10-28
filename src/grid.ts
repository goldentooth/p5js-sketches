import type p5 from 'p5';

export function coordsToIndex(x: number, y: number, width: number): number {
  return y * width + x;
}

export function indexToCoords(index: number, width: number): { x: number; y: number } {
  const y = Math.floor(index / width);
  const x = index % width;
  return { x, y };
}

export function vectorToIndex(vec: p5.Vector, width: number): number {
  return coordsToIndex(vec.x, vec.y, width);
}

export interface Cell {
  x: number;
  y: number;
  value: any;
  draw(p: p5, layer: p5.Graphics): void;
}

export interface Grid {
  columns: number;
  rows: number;
  init(func: (index: number, x: number, y: number) => Cell): void;
  setCell(x: number, y: number, value: Cell): void;
  getCell(x: number, y: number): Cell;
  clearCell(x: number, y: number): void;
  setCellByIndex(index: number, value: Cell): void;
  getCellByIndex(index: number): Cell;
  clearCellByIndex(index: number): void;
  forEachCell(callback: (cell: Cell) => void): void;
  draw(p: p5, layer: p5.Graphics): void;
}

export function createGrid(columns: number, rows: number): Grid {
  const cells: Map<number, Cell> = new Map();

  return {
    columns,
    rows,
    init(func: (index: number, x: number, y: number) => Cell) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          const index = coordsToIndex(x, y, columns);
          const cell = func(index, x, y);
          cells.set(index, cell);
        }
      }
    },
    setCell(x: number, y: number, value: Cell) {
      const index = coordsToIndex(x, y, columns);
      cells.set(index, value);
    },
    getCell(x: number, y: number): Cell {
      const index = coordsToIndex(x, y, columns);
      return cells.get(index)!;
    },
    clearCell(x: number, y: number) {
      const index = coordsToIndex(x, y, columns);
      cells.delete(index);
    },
    setCellByIndex(index: number, value: Cell) {
      cells.set(index, value);
    },
    getCellByIndex(index: number): Cell {
      return cells.get(index)!;
    },
    clearCellByIndex(index: number) {
      cells.delete(index);
    },
    forEachCell(callback: (cell: Cell) => void) {
      cells.forEach(callback);
    },
    draw(p: p5, layer: p5.Graphics) {
      layer.clear();
      layer.push();
      this.forEachCell(cell => {
        cell.draw(p, layer);
      });
      layer.pop();
    }
  };
}