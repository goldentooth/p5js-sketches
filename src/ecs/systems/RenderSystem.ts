import type p5 from 'p5';
import type { World, System } from '../types';
import { Render } from '../types';
import { Position } from '../components/Position';
import { Glyph } from '../components/Glyph';

export function RenderSystem(): System {
  return {
    phase: Render,
    run(world: World, _dt: number, p?: p5, layer?: p5.Graphics) {
      if (!p || !layer) return;
      layer.push();
      layer.textAlign(layer.CENTER, layer.CENTER);
      for (const e of world.query([Position, Glyph])) {
        const pos = world.getComponent<{ x: number; y: number }>(e, Position)!;
        const glyph = world.getComponent<{ glyph: string; fg: p5.Color; bg: p5.Color }>(e, Glyph)!;
        const glyphHeight = layer.textAscent() + layer.textDescent() - 2;
        const glyphWidth = layer.textWidth(glyph.glyph) - 1;
        layer.fill(glyph.bg);
        layer.rect(pos.x - glyphWidth / 2, pos.y - glyphHeight / 2, glyphWidth, glyphHeight);
        layer.fill(glyph.fg);
        layer.text(glyph.glyph, pos.x, pos.y);
      }
      layer.pop();
    }
  };
}
