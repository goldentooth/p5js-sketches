import type p5 from 'p5';
import { createGlyph, type Glyph } from '../ecs/components/Glyph';

/**
 * Color specification - can be a p5.Color or RGB/RGBA array
 */
export type ColorSpec = p5.Color | [number, number, number] | [number, number, number, number];

/**
 * Glyph template definition
 */
export interface GlyphTemplate {
  char: string;
  fg: ColorSpec;
  bg: ColorSpec;
}

/**
 * Create a glyph from a template
 */
export function fromTemplate(template: GlyphTemplate): Glyph {
  return createGlyph(template.char, template.fg as p5.Color, template.bg as p5.Color);
}

/**
 * Create a glyph with a custom foreground color
 */
export function withColor(char: string, fg: ColorSpec, bg: ColorSpec = [0, 0, 0]): Glyph {
  return createGlyph(char, fg as p5.Color, bg as p5.Color);
}

/**
 * Create a factory function that returns a glyph with the specified character and colors
 */
export function glyphFactory(char: string, fg: ColorSpec, bg: ColorSpec = [0, 0, 0]): () => Glyph {
  return () => createGlyph(char, fg as p5.Color, bg as p5.Color);
}

/**
 * Create a factory function that accepts a foreground color parameter
 */
export function coloredGlyphFactory(char: string, bg: ColorSpec = [0, 0, 0]): (fg: ColorSpec) => Glyph {
  return (fg: ColorSpec) => createGlyph(char, fg as p5.Color, bg as p5.Color);
}

/**
 * Common glyph templates for typical roguelike elements
 */
export const Templates = {
  // Walls and barriers
  wall: { char: '#', fg: [128, 128, 128], bg: [0, 0, 0] } as GlyphTemplate,
  wallBrick: { char: '▓', fg: [139, 69, 19], bg: [0, 0, 0] } as GlyphTemplate,
  wallStone: { char: '█', fg: [128, 128, 128], bg: [0, 0, 0] } as GlyphTemplate,

  // Floors and ground
  floor: { char: '.', fg: [64, 64, 64], bg: [0, 0, 0] } as GlyphTemplate,
  floorWood: { char: '≡', fg: [139, 90, 43], bg: [0, 0, 0] } as GlyphTemplate,
  floorStone: { char: '·', fg: [100, 100, 100], bg: [0, 0, 0] } as GlyphTemplate,

  // Doors and passages
  doorClosed: { char: '+', fg: [139, 69, 19], bg: [0, 0, 0] } as GlyphTemplate,
  doorOpen: { char: '/', fg: [139, 69, 19], bg: [0, 0, 0] } as GlyphTemplate,

  // Water and liquids
  water: { char: '≈', fg: [64, 164, 223], bg: [0, 0, 0] } as GlyphTemplate,

  // Entities
  player: { char: '@', fg: [255, 255, 255], bg: [0, 0, 0] } as GlyphTemplate,
  enemy: { char: 'e', fg: [255, 0, 0], bg: [0, 0, 0] } as GlyphTemplate,
  npc: { char: 'n', fg: [255, 255, 0], bg: [0, 0, 0] } as GlyphTemplate,

  // Items
  item: { char: '!', fg: [255, 200, 0], bg: [0, 0, 0] } as GlyphTemplate,
  gold: { char: '$', fg: [255, 215, 0], bg: [0, 0, 0] } as GlyphTemplate,

  // Empty/void
  empty: { char: ' ', fg: [0, 0, 0], bg: [0, 0, 0] } as GlyphTemplate,
};

/**
 * Palette class for managing collections of custom glyphs
 */
export class GlyphPalette {
  private templates: Map<string, GlyphTemplate> = new Map();

  /**
   * Register a glyph template with a name
   */
  register(name: string, template: GlyphTemplate): void {
    this.templates.set(name, template);
  }

  /**
   * Register a glyph template using individual parameters
   */
  registerGlyph(name: string, char: string, fg: ColorSpec, bg: ColorSpec = [0, 0, 0]): void {
    this.templates.set(name, { char, fg, bg });
  }

  /**
   * Get a glyph by name
   */
  get(name: string): Glyph {
    const template = this.templates.get(name);
    if (!template) throw new Error(`Unknown glyph: ${name}`);
    return fromTemplate(template);
  }

  /**
   * Get a glyph with a custom foreground color
   */
  getWithColor(name: string, fg: ColorSpec): Glyph {
    const template = this.templates.get(name);
    if (!template) throw new Error(`Unknown glyph: ${name}`);
    return withColor(template.char, fg, template.bg);
  }

  /**
   * Create a factory function for a registered glyph
   */
  factory(name: string): () => Glyph {
    return () => this.get(name);
  }

  /**
   * Create a colored factory function for a registered glyph
   */
  coloredFactory(name: string): (fg: ColorSpec) => Glyph {
    const template = this.templates.get(name);
    if (!template) throw new Error(`Unknown glyph: ${name}`);
    return coloredGlyphFactory(template.char, template.bg);
  }
}
