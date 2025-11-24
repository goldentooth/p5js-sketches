import type p5 from 'p5';
import type { PixelX, PixelY, Renderable, RenderableOptions } from '../../render/types';

export const Glyph = 'glyph';
export interface Glyph extends Renderable {
  glyph: string;
  fg: p5.Color;
  bg: p5.Color;
}

// Note that the x and y here are in pixel coordinates, not grid coordinates.
export function renderGlyph(glyph: Glyph, p: p5, layer: p5.Graphics, options: RenderableOptions) {
  layer.fill(glyph.bg || options.backgroundColor || 0);
  layer.textAlign(p.CENTER, p.CENTER);
  const topLeftX: PixelX = options.x;
  const topLeftY: PixelY = options.y;
  const textX = topLeftX + options.width / 2;
  const textY = topLeftY + options.height / 2;
  layer.rect(topLeftX, topLeftY, options.width, options.height);
  layer.fill(glyph.fg);
  layer.text(glyph.glyph[0], textX, textY);
}

export function createGlyph(glyph: string, fg: p5.Color, bg: p5.Color): Glyph {
  return {
    glyph,
    fg,
    bg,
    draw(p: p5, layer: p5.Graphics, options: RenderableOptions) {
      renderGlyph(this, p, layer, options);
    }
  };
}
