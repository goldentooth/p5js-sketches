import { describe, it, expect } from 'vitest';
import {
  randomRgb,
  randomBrightRgb,
  randomPastelRgb,
  randomDarkRgb,
  randomGrayscale,
  hslToRgb,
  rgbToHsl,
  lighten,
  darken,
  grayscale,
  invert,
  analogousPalette,
  complementaryPalette,
  triadicPalette,
  ColorPalette,
} from '../src/color/index';

describe('Color Utilities', () => {
  describe('Random RGB generation', () => {
    it('should generate random RGB colors in valid range', () => {
      const color = randomRgb();
      expect(color).toHaveLength(3);
      expect(color[0]).toBeGreaterThanOrEqual(0);
      expect(color[0]).toBeLessThanOrEqual(255);
      expect(color[1]).toBeGreaterThanOrEqual(0);
      expect(color[1]).toBeLessThanOrEqual(255);
      expect(color[2]).toBeGreaterThanOrEqual(0);
      expect(color[2]).toBeLessThanOrEqual(255);
    });

    it('should generate bright colors', () => {
      const color = randomBrightRgb();
      expect(color.some(c => c >= 100)).toBe(true);
    });

    it('should generate grayscale colors', () => {
      const color = randomGrayscale();
      expect(color[0]).toBe(color[1]);
      expect(color[1]).toBe(color[2]);
    });
  });

  describe('HSL/RGB conversion', () => {
    it('should convert RGB to HSL and back', () => {
      const rgb = [255, 0, 0]; // Red
      const hsl = rgbToHsl(rgb);
      const backToRgb = hslToRgb(hsl);

      // Allow small rounding differences
      expect(Math.abs(backToRgb[0] - rgb[0])).toBeLessThanOrEqual(1);
      expect(Math.abs(backToRgb[1] - rgb[1])).toBeLessThanOrEqual(1);
      expect(Math.abs(backToRgb[2] - rgb[2])).toBeLessThanOrEqual(1);
    });

    it('should convert pure red correctly', () => {
      const hsl = [0, 100, 50]; // Pure red in HSL
      const rgb = hslToRgb(hsl);
      expect(rgb[0]).toBeCloseTo(255, 0);
      expect(rgb[1]).toBeCloseTo(0, 0);
      expect(rgb[2]).toBeCloseTo(0, 0);
    });
  });

  describe('Color manipulation', () => {
    it('should lighten a color', () => {
      const color = [128, 128, 128];
      const lightened = lighten(color, 20);
      const hsl = rgbToHsl(lightened);
      const originalHsl = rgbToHsl(color);
      expect(hsl[2]).toBeGreaterThan(originalHsl[2]);
    });

    it('should darken a color', () => {
      const color = [128, 128, 128];
      const darkened = darken(color, 20);
      const hsl = rgbToHsl(darkened);
      const originalHsl = rgbToHsl(color);
      expect(hsl[2]).toBeLessThan(originalHsl[2]);
    });

    it('should convert to grayscale', () => {
      const color = [255, 128, 64];
      const gray = grayscale(color);
      expect(gray[0]).toBe(gray[1]);
      expect(gray[1]).toBe(gray[2]);
    });

    it('should invert a color', () => {
      const color = [100, 150, 200];
      const inverted = invert(color);
      expect(inverted[0]).toBe(155);
      expect(inverted[1]).toBe(105);
      expect(inverted[2]).toBe(55);
    });
  });

  describe('Color palettes', () => {
    it('should generate analogous palette', () => {
      const baseColor = [255, 0, 0];
      const palette = analogousPalette(baseColor, 5);
      expect(palette).toHaveLength(5);
      expect(palette).toContainEqual(baseColor);
    });

    it('should generate complementary palette', () => {
      const baseColor = [255, 0, 0];
      const [color1, color2] = complementaryPalette(baseColor);
      expect(color1).toEqual(baseColor);

      // Complement should be roughly cyan (opposite of red)
      const hsl1 = rgbToHsl(color1);
      const hsl2 = rgbToHsl(color2);
      expect(Math.abs((hsl2[0] - hsl1[0] + 360) % 360 - 180)).toBeLessThanOrEqual(1);
    });

    it('should generate triadic palette', () => {
      const baseColor = [255, 0, 0];
      const palette = triadicPalette(baseColor);
      expect(palette).toHaveLength(3);
    });
  });

  describe('ColorPalette class', () => {
    it('should store and retrieve colors', () => {
      const palette = new ColorPalette();
      const color1 = [255, 0, 0];
      const color2 = [0, 255, 0];

      palette.add(color1, 'red');
      palette.add(color2, 'green');

      expect(palette.size()).toBe(2);
      expect(palette.getByName('red')).toEqual(color1);
      expect(palette.getByName('green')).toEqual(color2);
    });

    it('should get color by index', () => {
      const palette = new ColorPalette();
      const color = [255, 0, 0];
      palette.add(color);
      expect(palette.get(0)).toEqual(color);
    });

    it('should return all colors', () => {
      const palette = new ColorPalette();
      palette.add([255, 0, 0]);
      palette.add([0, 255, 0]);
      const all = palette.all();
      expect(all).toHaveLength(2);
    });

    it('should clear all colors', () => {
      const palette = new ColorPalette();
      palette.add([255, 0, 0]);
      palette.clear();
      expect(palette.size()).toBe(0);
    });
  });
});
