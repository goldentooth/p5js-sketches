import type p5 from 'p5';
import type { World, System } from '../types';
import { Render } from '../types';
import { PixelX, PixelY, PixelHeight, PixelWidth, RenderableOptions } from '../../render/types';
import type { Position } from '../components/Position';
import type { Glyph } from '../components/Glyph';
import { renderGlyph } from '../components/Glyph';
import { Components } from '../components';

export interface RenderSystemOptions {
  glyphHeight: number;
  glyphWidth: number;
  backgroundColor: p5.Color;
}

export function RenderSystem(options: RenderSystemOptions): System {
  return {
    phase: Render,
    run(world: World, _dt: number, p?: p5, layer?: p5.Graphics) {
      if (!p || !layer) return;
      layer.push();
      for (const e of world.query([Components.Position, Components.Glyph])) {
        const pos = world.getComponent<Position>(e, Components.Position)!;
        const glyph = world.getComponent<Glyph>(e, Components.Glyph)!;
        const renderableOptions: RenderableOptions = {
          x: Math.floor(pos.x * options.glyphWidth) as PixelX,
          y: Math.floor(pos.y * options.glyphHeight) as PixelY,
          width: options.glyphWidth as PixelWidth,
          height: options.glyphHeight as PixelHeight,
          backgroundColor: options.backgroundColor,
        };
        renderGlyph(glyph, p, layer, renderableOptions);
      }
      layer.pop();
    }
  };
}
