export * from './types';
export * from './bounds';
export * from './wrapping';

import type p5 from 'p5';
import type { GridCell, Grid, GridX, GridY, GridHeight, GridWidth, GridIndex } from './types';
import type { PixelHeight, PixelWidth, PixelX, PixelY, Renderable, RenderableOptions } from '../render';

export function gridCoordsToIndex(x: GridX, y: GridY, width: GridWidth): GridIndex {
  return (y * width + x) as GridIndex;
}

export function gridIndexToCoords(index: GridIndex, width: GridWidth): { x: GridX; y: GridY } {
  const y = Math.floor(index / width);
  const x = index % width;
  return { x: x as GridX, y: y as GridY };
}

export function vectorToGridIndex(vec: p5.Vector, width: GridWidth): GridIndex {
  return gridCoordsToIndex(vec.x as GridX, vec.y as GridY, width);
}

export function createCell(index: GridIndex, x: GridX, y: GridY, value: Renderable | undefined): GridCell {
  return {
    index,
    x,
    y,
    value,
    draw(p: p5, layer: p5.Graphics, options: RenderableOptions) {
      if (this.value && typeof this.value.draw === 'function') {
        this.value.draw(p, layer, options);
      }
    }
  };
}

export interface GridRendererOptions {
  cellHeight: PixelHeight;
  cellWidth: PixelWidth;
  backgroundColor: p5.Color;
}

export function GridRenderer(options: GridRendererOptions) {
  return {
    draw(grid: Grid, p: p5, layer: p5.Graphics) {
      layer.clear();
      layer.push();
      grid.forEachCell(cell => {
        const cellRenderOptions: RenderableOptions = {
          height: options.cellHeight,
          width: options.cellWidth,
          x: Math.floor(cell.x * options.cellWidth) as PixelX,
          y: Math.floor(cell.y * options.cellHeight) as PixelY,
          backgroundColor: options.backgroundColor,
        };
        cell.draw(p, layer, cellRenderOptions);
      });
      layer.pop();
    }
  };
}

export function createGrid(columns: GridWidth, rows: GridHeight): Grid {
  const cells: Map<number, GridCell> = new Map();

  return {
    columns,
    rows,
    init(func: (cell: GridCell) => void) {
      for (let y: GridY = 0 as GridY; y < rows; y++) {
        for (let x: GridX = 0 as GridX; x < columns; x++) {
          const index = gridCoordsToIndex(x, y, columns);
          const cell = createCell(index, x, y, undefined);
          func(cell);
          cells.set(index, cell);
        }
      }
    },
    setCell(x: GridX, y: GridY, value: GridCell) {
      const index = gridCoordsToIndex(x, y, columns);
      cells.set(index, value);
    },
    getCell(x: GridX, y: GridY): GridCell {
      const index = gridCoordsToIndex(x, y, columns);
      return cells.get(index)!;
    },
    clearCell(x: GridX, y: GridY) {
      const index = gridCoordsToIndex(x, y, columns);
      cells.delete(index);
    },
    setCellByIndex(index: GridIndex, value: GridCell) {
      cells.set(index, value);
    },
    getCellByIndex(index: GridIndex): GridCell {
      return cells.get(index)!;
    },
    clearCellByIndex(index: GridIndex) {
      cells.delete(index);
    },
    forEachCell(callback: (cell: GridCell) => void) {
      cells.forEach(callback);
    },
  };
}
