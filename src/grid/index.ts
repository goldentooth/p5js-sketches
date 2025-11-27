export * from './types';
export * from './bounds';
export * from './wrapping';
export * from './queries';

import type p5 from 'p5';
import type { GridCell, Grid, GridX, GridY, GridHeight, GridWidth, GridIndex } from './types';
import type { PixelHeight, PixelWidth, PixelX, PixelY, Renderable, RenderableOptions } from '../render';

/**
 * Converts 2D grid coordinates to a 1D array index
 *
 * @param x - Grid X coordinate
 * @param y - Grid Y coordinate
 * @param width - Width of the grid
 * @returns Linear index into a 1D array representation
 *
 * @example
 * ```typescript
 * const index = gridCoordsToIndex(5 as GridX, 3 as GridY, 10 as GridWidth);
 * // Returns 35 (3 * 10 + 5)
 * ```
 */
export function gridCoordsToIndex(x: GridX, y: GridY, width: GridWidth): GridIndex {
  return (y * width + x) as GridIndex;
}

/**
 * Converts a 1D array index back to 2D grid coordinates
 *
 * @param index - Linear index in the grid array
 * @param width - Width of the grid
 * @returns Object containing x and y grid coordinates
 *
 * @example
 * ```typescript
 * const coords = gridIndexToCoords(35 as GridIndex, 10 as GridWidth);
 * // Returns { x: 5, y: 3 }
 * ```
 */
export function gridIndexToCoords(index: GridIndex, width: GridWidth): { x: GridX; y: GridY } {
  const y = Math.floor(index / width);
  const x = index % width;
  return { x: x as GridX, y: y as GridY };
}

/**
 * Converts a p5.Vector to a grid index
 *
 * Convenience function that extracts x,y from a p5.Vector and converts to a grid index.
 *
 * @param vec - p5.Vector containing grid coordinates
 * @param width - Width of the grid
 * @returns Linear index into the grid array
 *
 * @example
 * ```typescript
 * const pos = createVector(5, 3);
 * const index = vectorToGridIndex(pos, 10 as GridWidth);
 * ```
 */
export function vectorToGridIndex(vec: p5.Vector, width: GridWidth): GridIndex {
  return gridCoordsToIndex(vec.x as GridX, vec.y as GridY, width);
}

/**
 * Creates a grid cell object
 *
 * Grid cells contain position information and an optional renderable value.
 * They provide a draw() method that delegates to the value's draw method if present.
 *
 * @param index - Linear index of the cell in the grid
 * @param x - Grid X coordinate
 * @param y - Grid Y coordinate
 * @param value - Optional renderable object (entity, tile, etc.)
 * @returns GridCell object with position and rendering capabilities
 *
 * @example
 * ```typescript
 * const cell = createCell(0 as GridIndex, 0 as GridX, 0 as GridY, myEntity);
 * cell.draw(p5Instance, layer, renderOptions);
 * ```
 */
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

/**
 * Configuration options for the grid renderer
 */
export interface GridRendererOptions {
  /** Height of each cell in pixels */
  cellHeight: PixelHeight;
  /** Width of each cell in pixels */
  cellWidth: PixelWidth;
  /** Background color for cell rendering */
  backgroundColor: p5.Color;
}

/**
 * Creates a grid renderer for drawing grids to a p5.Graphics layer
 *
 * The renderer handles iterating over grid cells and delegating rendering to each cell's
 * draw method. It manages pixel conversion and applies rendering options consistently.
 *
 * @param options - Rendering configuration (cell dimensions, colors)
 * @returns Renderer object with draw method
 *
 * @example
 * ```typescript
 * const renderer = GridRenderer({
 *   cellHeight: 16 as PixelHeight,
 *   cellWidth: 16 as PixelWidth,
 *   backgroundColor: p.color(0)
 * });
 *
 * renderer.draw(myGrid, p5Instance, graphicsLayer);
 * ```
 */
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

/**
 * Creates a new grid data structure
 *
 * Grids are 2D structures stored as a Map of GridCell objects. They provide methods for
 * initializing, getting, setting, and iterating over cells. Cells can be accessed by
 * coordinates (x, y) or by linear index.
 *
 * @param columns - Width of the grid
 * @param rows - Height of the grid
 * @returns Grid object with methods for cell manipulation
 *
 * @example
 * ```typescript
 * const grid = createGrid(80 as GridWidth, 50 as GridHeight);
 *
 * // Initialize all cells
 * grid.init(cell => {
 *   cell.value = createTile();
 * });
 *
 * // Access cells
 * const cell = grid.getCell(10 as GridX, 5 as GridY);
 *
 * // Modify cells
 * grid.setCell(10 as GridX, 5 as GridY, newCell);
 *
 * // Iterate over all cells
 * grid.forEachCell(cell => {
 *   console.log(cell.x, cell.y);
 * });
 * ```
 */
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
