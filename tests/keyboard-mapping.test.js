import { describe, it, expect } from 'vitest';
import {
  createKeyMapper,
  defaultKeyMapper,
  isMovementKey,
  KeyMappingPresets,
  Cardinal,
  Diagonal,
} from '../src';

describe('KeyboardMapping', () => {
  describe('Arrow keys', () => {
    const mapper = createKeyMapper();

    it('should map LEFT_ARROW to WEST', () => {
      expect(mapper('ArrowLeft', 37)).toEqual(Cardinal.WEST);
    });

    it('should map RIGHT_ARROW to EAST', () => {
      expect(mapper('ArrowRight', 39)).toEqual(Cardinal.EAST);
    });

    it('should map UP_ARROW to NORTH', () => {
      expect(mapper('ArrowUp', 38)).toEqual(Cardinal.NORTH);
    });

    it('should map DOWN_ARROW to SOUTH', () => {
      expect(mapper('ArrowDown', 40)).toEqual(Cardinal.SOUTH);
    });
  });

  describe('WASD keys', () => {
    const mapper = createKeyMapper();

    it('should map "a" to WEST', () => {
      expect(mapper('a', 65)).toEqual(Cardinal.WEST);
    });

    it('should map "A" to WEST', () => {
      expect(mapper('A', 65)).toEqual(Cardinal.WEST);
    });

    it('should map "d" to EAST', () => {
      expect(mapper('d', 68)).toEqual(Cardinal.EAST);
    });

    it('should map "D" to EAST', () => {
      expect(mapper('D', 68)).toEqual(Cardinal.EAST);
    });

    it('should map "w" to NORTH', () => {
      expect(mapper('w', 87)).toEqual(Cardinal.NORTH);
    });

    it('should map "W" to NORTH', () => {
      expect(mapper('W', 87)).toEqual(Cardinal.NORTH);
    });

    it('should map "s" to SOUTH', () => {
      expect(mapper('s', 83)).toEqual(Cardinal.SOUTH);
    });

    it('should map "S" to SOUTH', () => {
      expect(mapper('S', 83)).toEqual(Cardinal.SOUTH);
    });
  });

  describe('Vi keys', () => {
    const mapper = createKeyMapper();

    it('should map "h" to WEST', () => {
      expect(mapper('h', 72)).toEqual(Cardinal.WEST);
    });

    it('should map "l" to EAST', () => {
      expect(mapper('l', 76)).toEqual(Cardinal.EAST);
    });

    it('should map "k" to NORTH', () => {
      expect(mapper('k', 75)).toEqual(Cardinal.NORTH);
    });

    it('should map "j" to SOUTH', () => {
      expect(mapper('j', 74)).toEqual(Cardinal.SOUTH);
    });
  });

  describe('Numpad keys', () => {
    const mapper = createKeyMapper();

    // Cardinal directions
    it('should map "4" to WEST', () => {
      expect(mapper('4', 52)).toEqual(Cardinal.WEST);
    });

    it('should map "6" to EAST', () => {
      expect(mapper('6', 54)).toEqual(Cardinal.EAST);
    });

    it('should map "8" to NORTH', () => {
      expect(mapper('8', 56)).toEqual(Cardinal.NORTH);
    });

    it('should map "2" to SOUTH', () => {
      expect(mapper('2', 50)).toEqual(Cardinal.SOUTH);
    });

    // Diagonal directions
    it('should map "7" to NORTHWEST', () => {
      expect(mapper('7', 55)).toEqual(Diagonal.NORTHWEST);
    });

    it('should map "9" to NORTHEAST', () => {
      expect(mapper('9', 57)).toEqual(Diagonal.NORTHEAST);
    });

    it('should map "1" to SOUTHWEST', () => {
      expect(mapper('1', 49)).toEqual(Diagonal.SOUTHWEST);
    });

    it('should map "3" to SOUTHEAST', () => {
      expect(mapper('3', 51)).toEqual(Diagonal.SOUTHEAST);
    });
  });

  describe('Non-movement keys', () => {
    const mapper = createKeyMapper();

    it('should return null for non-movement keys', () => {
      expect(mapper('x', 88)).toBeNull();
      expect(mapper('q', 81)).toBeNull();
      expect(mapper('e', 69)).toBeNull();
      expect(mapper(' ', 32)).toBeNull();
      expect(mapper('Enter', 13)).toBeNull();
    });
  });

  describe('Configuration', () => {
    it('should disable arrow keys when configured', () => {
      const mapper = createKeyMapper({ arrows: false });
      expect(mapper('ArrowLeft', 37)).toBeNull();
      expect(mapper('ArrowRight', 39)).toBeNull();
    });

    it('should disable WASD when configured', () => {
      const mapper = createKeyMapper({ wasd: false });
      expect(mapper('a', 65)).toBeNull();
      expect(mapper('d', 68)).toBeNull();
      expect(mapper('w', 87)).toBeNull();
      expect(mapper('s', 83)).toBeNull();
    });

    it('should disable vi keys when configured', () => {
      const mapper = createKeyMapper({ vi: false });
      expect(mapper('h', 72)).toBeNull();
      expect(mapper('j', 74)).toBeNull();
      expect(mapper('k', 75)).toBeNull();
      expect(mapper('l', 76)).toBeNull();
    });

    it('should disable numpad when configured', () => {
      const mapper = createKeyMapper({ numpad: false });
      expect(mapper('4', 52)).toBeNull();
      expect(mapper('6', 54)).toBeNull();
      expect(mapper('7', 55)).toBeNull();
      expect(mapper('9', 57)).toBeNull();
    });

    it('should allow enabling only specific key sets', () => {
      const mapper = createKeyMapper({
        arrows: true,
        wasd: false,
        vi: false,
        numpad: false,
      });

      expect(mapper('ArrowLeft', 37)).toEqual(Cardinal.WEST);
      expect(mapper('a', 65)).toBeNull();
      expect(mapper('h', 72)).toBeNull();
      expect(mapper('4', 52)).toBeNull();
    });
  });

  describe('Presets', () => {
    it('should provide arrows-only preset', () => {
      const mapper = createKeyMapper(KeyMappingPresets.arrowsOnly);
      expect(mapper('ArrowLeft', 37)).toEqual(Cardinal.WEST);
      expect(mapper('a', 65)).toBeNull();
    });

    it('should provide gaming preset (arrows + WASD)', () => {
      const mapper = createKeyMapper(KeyMappingPresets.gaming);
      expect(mapper('ArrowLeft', 37)).toEqual(Cardinal.WEST);
      expect(mapper('a', 65)).toEqual(Cardinal.WEST);
      expect(mapper('h', 72)).toBeNull();
      expect(mapper('4', 52)).toBeNull();
    });

    it('should provide roguelike preset (vi + numpad)', () => {
      const mapper = createKeyMapper(KeyMappingPresets.roguelike);
      expect(mapper('h', 72)).toEqual(Cardinal.WEST);
      expect(mapper('7', 55)).toEqual(Diagonal.NORTHWEST);
      expect(mapper('ArrowLeft', 37)).toBeNull();
      expect(mapper('a', 65)).toBeNull();
    });

    it('should provide all preset', () => {
      const mapper = createKeyMapper(KeyMappingPresets.all);
      expect(mapper('ArrowLeft', 37)).toEqual(Cardinal.WEST);
      expect(mapper('a', 65)).toEqual(Cardinal.WEST);
      expect(mapper('h', 72)).toEqual(Cardinal.WEST);
      expect(mapper('4', 52)).toEqual(Cardinal.WEST);
    });
  });

  describe('defaultKeyMapper', () => {
    it('should have all key sets enabled by default', () => {
      expect(defaultKeyMapper('ArrowLeft', 37)).toEqual(Cardinal.WEST);
      expect(defaultKeyMapper('a', 65)).toEqual(Cardinal.WEST);
      expect(defaultKeyMapper('h', 72)).toEqual(Cardinal.WEST);
      expect(defaultKeyMapper('4', 52)).toEqual(Cardinal.WEST);
    });
  });

  describe('isMovementKey', () => {
    it('should return true for movement keys', () => {
      expect(isMovementKey('ArrowLeft', 37)).toBe(true);
      expect(isMovementKey('a', 65)).toBe(true);
      expect(isMovementKey('h', 72)).toBe(true);
      expect(isMovementKey('7', 55)).toBe(true);
    });

    it('should return false for non-movement keys', () => {
      expect(isMovementKey('x', 88)).toBe(false);
      expect(isMovementKey('q', 81)).toBe(false);
      expect(isMovementKey(' ', 32)).toBe(false);
    });

    it('should respect configuration', () => {
      expect(isMovementKey('a', 65, { wasd: false })).toBe(false);
      expect(isMovementKey('a', 65, { wasd: true })).toBe(true);
    });
  });

  describe('Direction consistency', () => {
    it('should return the same direction for equivalent keys', () => {
      const mapper = createKeyMapper();

      // All these should map to WEST
      const west1 = mapper('ArrowLeft', 37);
      const west2 = mapper('a', 65);
      const west3 = mapper('h', 72);
      const west4 = mapper('4', 52);

      expect(west1).toEqual(west2);
      expect(west2).toEqual(west3);
      expect(west3).toEqual(west4);
    });

    it('should return unique directions for diagonals', () => {
      const mapper = createKeyMapper();

      const nw = mapper('7', 55);
      const ne = mapper('9', 57);
      const sw = mapper('1', 49);
      const se = mapper('3', 51);

      expect(nw).toEqual(Diagonal.NORTHWEST);
      expect(ne).toEqual(Diagonal.NORTHEAST);
      expect(sw).toEqual(Diagonal.SOUTHWEST);
      expect(se).toEqual(Diagonal.SOUTHEAST);

      // All should be different
      expect(nw).not.toEqual(ne);
      expect(nw).not.toEqual(sw);
      expect(ne).not.toEqual(se);
    });
  });
});
