import type p5 from 'p5';
import type { PixelHeight, PixelWidth } from './types';

/**
 * Configuration options for a graphics layer
 */
export interface LayerConfig {
  width: PixelWidth;
  height: PixelHeight;
  textFont?: string;
  textSize?: number;
  textAlign?: {
    horizontal: 'LEFT' | 'CENTER' | 'RIGHT';
    vertical: 'TOP' | 'CENTER' | 'BOTTOM' | 'BASELINE';
  };
}

/**
 * A managed graphics layer
 */
export interface Layer {
  name: string;
  graphics: p5.Graphics;
  visible: boolean;
}

/**
 * LayerManager handles creation, configuration, and rendering of multiple p5 graphics layers
 */
export class LayerManager {
  private layers: Map<string, Layer> = new Map();
  private p: p5;
  private layerOrder: string[] = [];

  constructor(p: p5) {
    this.p = p;
  }

  /**
   * Create a new graphics layer
   * @param name - Unique identifier for the layer
   * @param config - Layer configuration options
   * @returns The created graphics layer
   */
  createLayer(name: string, config: LayerConfig): p5.Graphics {
    if (this.layers.has(name)) {
      throw new Error(`Layer '${name}' already exists`);
    }

    const graphics = this.p.createGraphics(config.width, config.height);

    // Apply text configuration if provided
    if (config.textFont || config.textSize || config.textAlign) {
      if (config.textFont) {
        graphics.textFont(config.textFont);
      }
      if (config.textSize) {
        graphics.textSize(config.textSize);
      }
      if (config.textAlign) {
        const h = this.p[config.textAlign.horizontal];
        const v = this.p[config.textAlign.vertical];
        graphics.textAlign(h, v);
      }
    }

    const layer: Layer = {
      name,
      graphics,
      visible: true,
    };

    this.layers.set(name, layer);
    this.layerOrder.push(name);

    return graphics;
  }

  /**
   * Get a layer's graphics object by name
   * @param name - Layer name
   * @returns The graphics object or undefined if not found
   */
  getLayer(name: string): p5.Graphics | undefined {
    return this.layers.get(name)?.graphics;
  }

  /**
   * Get a layer's graphics object by name, throwing if not found
   * @param name - Layer name
   * @returns The graphics object
   * @throws Error if layer not found
   */
  requireLayer(name: string): p5.Graphics {
    const layer = this.layers.get(name);
    if (!layer) {
      throw new Error(`Layer '${name}' not found`);
    }
    return layer.graphics;
  }

  /**
   * Set the visibility of a layer
   * @param name - Layer name
   * @param visible - Whether the layer should be visible
   */
  setVisible(name: string, visible: boolean): void {
    const layer = this.layers.get(name);
    if (layer) {
      layer.visible = visible;
    }
  }

  /**
   * Toggle a layer's visibility
   * @param name - Layer name
   */
  toggleVisible(name: string): void {
    const layer = this.layers.get(name);
    if (layer) {
      layer.visible = !layer.visible;
    }
  }

  /**
   * Clear a specific layer
   * @param name - Layer name
   */
  clearLayer(name: string): void {
    const layer = this.layers.get(name);
    if (layer) {
      layer.graphics.clear();
    }
  }

  /**
   * Clear all layers
   */
  clearAll(): void {
    this.layers.forEach(layer => layer.graphics.clear());
  }

  /**
   * Remove a layer
   * @param name - Layer name
   */
  removeLayer(name: string): void {
    const layer = this.layers.get(name);
    if (layer) {
      layer.graphics.remove();
      this.layers.delete(name);
      this.layerOrder = this.layerOrder.filter(n => n !== name);
    }
  }

  /**
   * Set the rendering order of layers
   * Layers are rendered in the order specified (first = bottom, last = top)
   * @param order - Array of layer names in desired rendering order
   */
  setLayerOrder(order: string[]): void {
    // Validate all layer names exist
    for (const name of order) {
      if (!this.layers.has(name)) {
        throw new Error(`Layer '${name}' not found`);
      }
    }
    this.layerOrder = [...order];
  }

  /**
   * Render all visible layers to the main canvas in order
   * @param x - X position to render at (default: 0)
   * @param y - Y position to render at (default: 0)
   */
  render(x: number = 0, y: number = 0): void {
    for (const name of this.layerOrder) {
      const layer = this.layers.get(name);
      if (layer && layer.visible) {
        this.p.image(layer.graphics, x, y);
      }
    }
  }

  /**
   * Render specific layers in the order provided
   * @param layerNames - Names of layers to render
   * @param x - X position to render at (default: 0)
   * @param y - Y position to render at (default: 0)
   */
  renderLayers(layerNames: string[], x: number = 0, y: number = 0): void {
    for (const name of layerNames) {
      const layer = this.layers.get(name);
      if (layer && layer.visible) {
        this.p.image(layer.graphics, x, y);
      }
    }
  }

  /**
   * Get all layer names in rendering order
   * @returns Array of layer names
   */
  getLayerNames(): string[] {
    return [...this.layerOrder];
  }

  /**
   * Check if a layer exists
   * @param name - Layer name
   * @returns True if layer exists
   */
  hasLayer(name: string): boolean {
    return this.layers.has(name);
  }
}

/**
 * Create a standard text layer configuration
 * @param width - Layer width in pixels
 * @param height - Layer height in pixels
 * @param fontSize - Font size (default: 24)
 * @param fontFamily - Font family (default: 'monospace')
 * @returns Layer configuration object
 */
export function createTextLayerConfig(
  width: PixelWidth,
  height: PixelHeight,
  fontSize: number = 24,
  fontFamily: string = 'monospace'
): LayerConfig {
  return {
    width,
    height,
    textFont: fontFamily,
    textSize: fontSize,
    textAlign: {
      horizontal: 'CENTER',
      vertical: 'CENTER',
    },
  };
}
