import type p5 from 'p5';

export interface TextLayerConfig {
  font?: string;
  size?: number;
  alignH?: 'LEFT' | 'CENTER' | 'RIGHT';
  alignV?: 'TOP' | 'CENTER' | 'BOTTOM' | 'BASELINE';
}

export interface CanvasConfig {
  width: number;
  height: number;
  backgroundColor?: p5.Color | number;
}

/**
 * Configure a graphics layer for text rendering with sensible defaults
 */
export function setupTextLayer(
  layer: p5.Graphics,
  p: p5,
  config: TextLayerConfig = {}
): void {
  const {
    font = 'monospace',
    size = 24,
    alignH = 'CENTER',
    alignV = 'CENTER',
  } = config;

  layer.textFont(font);
  layer.textSize(size);
  layer.textAlign(p[alignH], p[alignV]);
}

/**
 * Create a graphics layer configured for text rendering
 */
export function createTextLayer(
  p: p5,
  width: number,
  height: number,
  config: TextLayerConfig = {}
): p5.Graphics {
  const layer = p.createGraphics(width, height);
  setupTextLayer(layer, p, config);
  return layer;
}

/**
 * Common canvas setup for grid-based sketches
 */
export function setupGridCanvas(
  p: p5,
  config: CanvasConfig
): void {
  p.createCanvas(config.width, config.height);
  if (config.backgroundColor !== undefined) {
    // Type assertion needed due to p5.js overload complexity
    (p.background as any)(config.backgroundColor);
  }
}

/**
 * Calculate grid dimensions from canvas and cell size
 */
export function calculateGridDimensions(
  canvasWidth: number,
  canvasHeight: number,
  cellWidth: number,
  cellHeight: number
): { cols: number; rows: number; adjustedWidth: number; adjustedHeight: number } {
  const cols = Math.floor(canvasWidth / cellWidth);
  const rows = Math.floor(canvasHeight / cellHeight);
  return {
    cols,
    rows,
    adjustedWidth: cols * cellWidth,
    adjustedHeight: rows * cellHeight,
  };
}
