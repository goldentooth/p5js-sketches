import type p5 from 'p5';
import type { As } from '../types';

export type PixelX = number & As<'pixel-x'>;
export type PixelY = number & As<'pixel-y'>;
export type PixelHeight = number & As<'pixel-height'>;
export type PixelWidth = number & As<'pixel-width'>;

export interface RenderableOptions {
  height: PixelHeight;
  width: PixelWidth;
  x: PixelX;
  y: PixelY;
  backgroundColor: p5.Color;
}

export interface Renderable {
  draw(p: p5, layer: p5.Graphics, options: RenderableOptions): void;
}
