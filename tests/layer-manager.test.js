import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayerManager, createTextLayerConfig } from '../src';

// Mock p5 and p5.Graphics
function createMockP5() {
  return {
    createGraphics: vi.fn((w, h) => createMockGraphics(w, h)),
    image: vi.fn(),
    LEFT: 'LEFT',
    CENTER: 'CENTER',
    RIGHT: 'RIGHT',
    TOP: 'TOP',
    BOTTOM: 'BOTTOM',
    BASELINE: 'BASELINE',
  };
}

function createMockGraphics(width, height) {
  return {
    width,
    height,
    textFont: vi.fn(),
    textSize: vi.fn(),
    textAlign: vi.fn(),
    clear: vi.fn(),
    remove: vi.fn(),
    push: vi.fn(),
    pop: vi.fn(),
    _cleared: false,
    _removed: false,
  };
}

describe('LayerManager', () => {
  let p;
  let manager;

  beforeEach(() => {
    p = createMockP5();
    manager = new LayerManager(p);
  });

  describe('Layer creation', () => {
    it('should create a layer with specified dimensions', () => {
      const graphics = manager.createLayer('test', { width: 100, height: 200 });

      expect(p.createGraphics).toHaveBeenCalledWith(100, 200);
      expect(graphics).toBeDefined();
      expect(graphics.width).toBe(100);
      expect(graphics.height).toBe(200);
    });

    it('should throw error when creating duplicate layer', () => {
      manager.createLayer('test', { width: 100, height: 100 });

      expect(() => {
        manager.createLayer('test', { width: 100, height: 100 });
      }).toThrow("Layer 'test' already exists");
    });

    it('should apply text font configuration', () => {
      const graphics = manager.createLayer('text', {
        width: 100,
        height: 100,
        textFont: 'monospace',
      });

      expect(graphics.textFont).toHaveBeenCalledWith('monospace');
    });

    it('should apply text size configuration', () => {
      const graphics = manager.createLayer('text', {
        width: 100,
        height: 100,
        textSize: 24,
      });

      expect(graphics.textSize).toHaveBeenCalledWith(24);
    });

    it('should apply text align configuration', () => {
      const graphics = manager.createLayer('text', {
        width: 100,
        height: 100,
        textAlign: {
          horizontal: 'CENTER',
          vertical: 'CENTER',
        },
      });

      expect(graphics.textAlign).toHaveBeenCalledWith('CENTER', 'CENTER');
    });

    it('should apply all text configuration options together', () => {
      const graphics = manager.createLayer('text', {
        width: 100,
        height: 100,
        textFont: 'Arial',
        textSize: 18,
        textAlign: {
          horizontal: 'LEFT',
          vertical: 'TOP',
        },
      });

      expect(graphics.textFont).toHaveBeenCalledWith('Arial');
      expect(graphics.textSize).toHaveBeenCalledWith(18);
      expect(graphics.textAlign).toHaveBeenCalledWith('LEFT', 'TOP');
    });

    it('should create layer as visible by default', () => {
      manager.createLayer('test', { width: 100, height: 100 });
      const graphics = manager.getLayer('test');
      expect(graphics).toBeDefined();
    });
  });

  describe('Layer retrieval', () => {
    beforeEach(() => {
      manager.createLayer('layer1', { width: 100, height: 100 });
      manager.createLayer('layer2', { width: 200, height: 200 });
    });

    it('should get layer by name', () => {
      const layer = manager.getLayer('layer1');
      expect(layer).toBeDefined();
      expect(layer.width).toBe(100);
    });

    it('should return undefined for non-existent layer', () => {
      const layer = manager.getLayer('nonexistent');
      expect(layer).toBeUndefined();
    });

    it('should require layer by name', () => {
      const layer = manager.requireLayer('layer2');
      expect(layer).toBeDefined();
      expect(layer.width).toBe(200);
    });

    it('should throw error when requiring non-existent layer', () => {
      expect(() => {
        manager.requireLayer('nonexistent');
      }).toThrow("Layer 'nonexistent' not found");
    });
  });

  describe('Visibility control', () => {
    beforeEach(() => {
      manager.createLayer('test', { width: 100, height: 100 });
    });

    it('should set layer visible', () => {
      manager.setVisible('test', true);
      // Layer should render (tested in render tests)
    });

    it('should set layer invisible', () => {
      manager.setVisible('test', false);
      manager.render();
      expect(p.image).not.toHaveBeenCalled();
    });

    it('should toggle visibility from visible to invisible', () => {
      manager.toggleVisible('test');
      manager.render();
      expect(p.image).not.toHaveBeenCalled();
    });

    it('should toggle visibility from invisible to visible', () => {
      manager.setVisible('test', false);
      manager.toggleVisible('test');
      manager.render();
      expect(p.image).toHaveBeenCalledTimes(1);
    });

    it('should handle visibility of non-existent layer gracefully', () => {
      expect(() => {
        manager.setVisible('nonexistent', false);
      }).not.toThrow();
    });
  });

  describe('Layer clearing', () => {
    let graphics;

    beforeEach(() => {
      graphics = manager.createLayer('test', { width: 100, height: 100 });
    });

    it('should clear specific layer', () => {
      manager.clearLayer('test');
      expect(graphics.clear).toHaveBeenCalledTimes(1);
    });

    it('should clear all layers', () => {
      const graphics2 = manager.createLayer('test2', { width: 100, height: 100 });
      manager.clearAll();
      expect(graphics.clear).toHaveBeenCalledTimes(1);
      expect(graphics2.clear).toHaveBeenCalledTimes(1);
    });

    it('should handle clearing non-existent layer gracefully', () => {
      expect(() => {
        manager.clearLayer('nonexistent');
      }).not.toThrow();
    });
  });

  describe('Layer removal', () => {
    let graphics;

    beforeEach(() => {
      graphics = manager.createLayer('test', { width: 100, height: 100 });
    });

    it('should remove layer', () => {
      manager.removeLayer('test');
      expect(graphics.remove).toHaveBeenCalledTimes(1);
      expect(manager.getLayer('test')).toBeUndefined();
    });

    it('should allow creating layer with same name after removal', () => {
      manager.removeLayer('test');
      expect(() => {
        manager.createLayer('test', { width: 100, height: 100 });
      }).not.toThrow();
    });

    it('should handle removing non-existent layer gracefully', () => {
      expect(() => {
        manager.removeLayer('nonexistent');
      }).not.toThrow();
    });

    it('should remove layer from rendering order', () => {
      manager.createLayer('other', { width: 100, height: 100 });
      manager.removeLayer('test');

      const names = manager.getLayerNames();
      expect(names).not.toContain('test');
      expect(names).toContain('other');
    });
  });

  describe('Layer ordering', () => {
    beforeEach(() => {
      manager.createLayer('layer1', { width: 100, height: 100 });
      manager.createLayer('layer2', { width: 100, height: 100 });
      manager.createLayer('layer3', { width: 100, height: 100 });
    });

    it('should get layer names in creation order', () => {
      const names = manager.getLayerNames();
      expect(names).toEqual(['layer1', 'layer2', 'layer3']);
    });

    it('should set custom layer order', () => {
      manager.setLayerOrder(['layer3', 'layer1', 'layer2']);
      const names = manager.getLayerNames();
      expect(names).toEqual(['layer3', 'layer1', 'layer2']);
    });

    it('should throw error when setting order with non-existent layer', () => {
      expect(() => {
        manager.setLayerOrder(['layer1', 'nonexistent', 'layer3']);
      }).toThrow("Layer 'nonexistent' not found");
    });

    it('should preserve order after setting', () => {
      manager.setLayerOrder(['layer2', 'layer3', 'layer1']);
      const names = manager.getLayerNames();
      expect(names).toEqual(['layer2', 'layer3', 'layer1']);
    });
  });

  describe('Rendering', () => {
    let layer1, layer2, layer3;

    beforeEach(() => {
      layer1 = manager.createLayer('layer1', { width: 100, height: 100 });
      layer2 = manager.createLayer('layer2', { width: 100, height: 100 });
      layer3 = manager.createLayer('layer3', { width: 100, height: 100 });
    });

    it('should render all visible layers in order', () => {
      manager.render();
      expect(p.image).toHaveBeenCalledTimes(3);
      expect(p.image).toHaveBeenNthCalledWith(1, layer1, 0, 0);
      expect(p.image).toHaveBeenNthCalledWith(2, layer2, 0, 0);
      expect(p.image).toHaveBeenNthCalledWith(3, layer3, 0, 0);
    });

    it('should render at custom position', () => {
      manager.render(10, 20);
      expect(p.image).toHaveBeenCalledWith(layer1, 10, 20);
    });

    it('should skip invisible layers', () => {
      manager.setVisible('layer2', false);
      manager.render();
      expect(p.image).toHaveBeenCalledTimes(2);
      expect(p.image).toHaveBeenCalledWith(layer1, 0, 0);
      expect(p.image).toHaveBeenCalledWith(layer3, 0, 0);
      expect(p.image).not.toHaveBeenCalledWith(layer2, 0, 0);
    });

    it('should respect custom layer order when rendering', () => {
      manager.setLayerOrder(['layer3', 'layer1', 'layer2']);
      manager.render();
      expect(p.image).toHaveBeenNthCalledWith(1, layer3, 0, 0);
      expect(p.image).toHaveBeenNthCalledWith(2, layer1, 0, 0);
      expect(p.image).toHaveBeenNthCalledWith(3, layer2, 0, 0);
    });

    it('should render specific layers', () => {
      manager.renderLayers(['layer1', 'layer3']);
      expect(p.image).toHaveBeenCalledTimes(2);
      expect(p.image).toHaveBeenCalledWith(layer1, 0, 0);
      expect(p.image).toHaveBeenCalledWith(layer3, 0, 0);
      expect(p.image).not.toHaveBeenCalledWith(layer2, 0, 0);
    });

    it('should render specific layers at custom position', () => {
      manager.renderLayers(['layer2'], 50, 75);
      expect(p.image).toHaveBeenCalledWith(layer2, 50, 75);
    });

    it('should respect visibility when rendering specific layers', () => {
      manager.setVisible('layer1', false);
      manager.renderLayers(['layer1', 'layer2']);
      expect(p.image).toHaveBeenCalledTimes(1);
      expect(p.image).toHaveBeenCalledWith(layer2, 0, 0);
    });
  });

  describe('Layer existence check', () => {
    beforeEach(() => {
      manager.createLayer('existing', { width: 100, height: 100 });
    });

    it('should return true for existing layer', () => {
      expect(manager.hasLayer('existing')).toBe(true);
    });

    it('should return false for non-existent layer', () => {
      expect(manager.hasLayer('nonexistent')).toBe(false);
    });

    it('should return false after removing layer', () => {
      manager.removeLayer('existing');
      expect(manager.hasLayer('existing')).toBe(false);
    });
  });
});

describe('createTextLayerConfig', () => {
  it('should create config with specified dimensions', () => {
    const config = createTextLayerConfig(800, 600);
    expect(config.width).toBe(800);
    expect(config.height).toBe(600);
  });

  it('should use default font settings', () => {
    const config = createTextLayerConfig(100, 100);
    expect(config.textFont).toBe('monospace');
    expect(config.textSize).toBe(24);
    expect(config.textAlign).toEqual({
      horizontal: 'CENTER',
      vertical: 'CENTER',
    });
  });

  it('should use custom font size', () => {
    const config = createTextLayerConfig(100, 100, 36);
    expect(config.textSize).toBe(36);
  });

  it('should use custom font family', () => {
    const config = createTextLayerConfig(100, 100, 18, 'Arial');
    expect(config.textFont).toBe('Arial');
    expect(config.textSize).toBe(18);
  });
});
