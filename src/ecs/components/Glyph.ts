import type p5 from 'p5';

export const Glyph = 'glyph';
export interface Glyph {
  glyph: string;
  fg: p5.Color;
  bg: p5.Color;
}
