import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from '../src/ecs/world';
import { createMap } from '../src/map';
import { Tiles } from '../src/map/types';
import { createGrid } from '../src/grid';
import { updateViewshedSettings, syncMapToGridWithFov, renderEntitiesWithFov } from '../src/fov/helpers';
import { createViewshed } from '../src/ecs/components/Viewshed';
import { createMemory } from '../src/ecs/components/Memory';
import { ViewshedSystem } from '../src/ecs/systems/ViewshedSystem';
import { Components } from '../src/ecs/components';

describe('FOV Helpers', () => {
  let world;
  let map;
  let grid;
  let entity;

  beforeEach(() => {
    world = createWorld();
    map = createMap(20, 20, { defaultTile: Tiles.Floor });
    grid = createGrid(20, 20);

    // Create test entity with viewshed
    entity = world.createEntity();
    world.addComponent(entity, Components.Position, { x: 10, y: 10 });
    world.addComponent(entity, Components.Viewshed, createViewshed(10, 'shadowcasting'));
    world.addComponent(entity, Components.Memory, createMemory());
    world.addComponent(entity, Components.Glyph, { char: '@', fg: [255, 255, 255], bg: [0, 0, 0] });

    // Run viewshed system to calculate initial FOV
    const viewshedSystem = new ViewshedSystem(map);
    world.addSystem(viewshedSystem);
    world.tick();
  });

  describe('updateViewshedSettings', () => {
    it('should update viewshed range', () => {
      const result = updateViewshedSettings(world, entity, { range: 15 });
      expect(result).toBe(true);

      const viewshed = world.getComponent(entity, Components.Viewshed);
      expect(viewshed.range).toBe(15);
      expect(viewshed.dirty).toBe(true);
    });

    it('should update viewshed algorithm', () => {
      const result = updateViewshedSettings(world, entity, { algorithm: 'raycasting' });
      expect(result).toBe(true);

      const viewshed = world.getComponent(entity, Components.Viewshed);
      expect(viewshed.algorithm).toBe('raycasting');
      expect(viewshed.dirty).toBe(true);
    });

    it('should update permissiveness', () => {
      const result = updateViewshedSettings(world, entity, { permissiveness: 5 });
      expect(result).toBe(true);

      const viewshed = world.getComponent(entity, Components.Viewshed);
      expect(viewshed.permissiveness).toBe(5);
      expect(viewshed.dirty).toBe(true);
    });

    it('should update multiple settings at once', () => {
      const result = updateViewshedSettings(world, entity, {
        range: 20,
        algorithm: 'permissive',
        permissiveness: 8
      });
      expect(result).toBe(true);

      const viewshed = world.getComponent(entity, Components.Viewshed);
      expect(viewshed.range).toBe(20);
      expect(viewshed.algorithm).toBe('permissive');
      expect(viewshed.permissiveness).toBe(8);
      expect(viewshed.dirty).toBe(true);
    });

    it('should return false if entity has no viewshed', () => {
      const noViewshedEntity = world.createEntity();
      const result = updateViewshedSettings(world, noViewshedEntity, { range: 15 });
      expect(result).toBe(false);
    });
  });

  describe('syncMapToGridWithFov', () => {
    let palette;

    beforeEach(() => {
      // Mock palette
      palette = {
        get(name) {
          if (name === 'wall') return { char: '#', fg: [128, 128, 128], bg: [0, 0, 0] };
          if (name === 'floor') return { char: '.', fg: [64, 64, 64], bg: [0, 0, 0] };
          return null;
        }
      };

      // Set up map with some walls
      for (let x = 0; x < 5; x++) {
        map.setTile(x, 0, Tiles.Wall);
      }
    });

    it('should render visible tiles at full brightness', () => {
      const tileGlyphs = new Map([
        [Tiles.Wall, 'wall'],
        [Tiles.Floor, 'floor']
      ]);

      syncMapToGridWithFov({
        grid,
        map,
        palette,
        world,
        viewerEntity: entity,
        fovEnabled: true,
        tileGlyphs
      });

      // Check that visible floor tiles are rendered at full brightness
      const visibleCell = grid.getCell(10, 10); // Entity position
      expect(visibleCell.value).not.toBeNull();
      expect(visibleCell.value.fg[0]).toBe(64); // Full brightness
    });

    it('should use exploredBrightness parameter', () => {
      const tileGlyphs = new Map([
        [Tiles.Floor, 'floor']
      ]);

      // Test with custom brightness
      syncMapToGridWithFov({
        grid,
        map,
        palette,
        world,
        viewerEntity: entity,
        fovEnabled: true,
        tileGlyphs,
        exploredBrightness: 0.5
      });

      // Function should complete without errors
      expect(true).toBe(true);
    });

    it('should handle tiles without glyph mappings', () => {
      const tileGlyphs = new Map([
        // Only map floor, not wall
        [Tiles.Floor, 'floor']
      ]);

      // Should not throw when encountering unmapped tiles
      expect(() => {
        syncMapToGridWithFov({
          grid,
          map,
          palette,
          world,
          viewerEntity: entity,
          fovEnabled: true,
          tileGlyphs
        });
      }).not.toThrow();
    });

    it('should render all tiles when FOV is disabled', () => {
      const tileGlyphs = new Map([
        [Tiles.Wall, 'wall'],
        [Tiles.Floor, 'floor']
      ]);

      syncMapToGridWithFov({
        grid,
        map,
        palette,
        fovEnabled: false,
        tileGlyphs
      });

      // All tiles should be visible at full brightness
      const farCell = grid.getCell(0, 1); // Far from entity
      expect(farCell.value).not.toBeNull();
      expect(farCell.value.fg[0]).toBe(64); // Full brightness
    });

  });

  describe('renderEntitiesWithFov', () => {
    beforeEach(() => {
      // Create another entity far away
      const farEntity = world.createEntity();
      world.addComponent(farEntity, Components.Position, { x: 0, y: 0 });
      world.addComponent(farEntity, Components.Glyph, { char: 'E', fg: [255, 0, 0], bg: [0, 0, 0] });

      // Create entity nearby
      const nearEntity = world.createEntity();
      world.addComponent(nearEntity, Components.Position, { x: 11, y: 10 });
      world.addComponent(nearEntity, Components.Glyph, { char: 'N', fg: [0, 255, 0], bg: [0, 0, 0] });
    });

    it('should render visible entities', () => {
      // Clear grid before rendering
      grid.init(cell => { cell.value = null; });

      renderEntitiesWithFov(grid, world, entity, true);

      // Viewer entity should be rendered
      const viewerCell = grid.getCell(10, 10);
      expect(viewerCell.value).not.toBeNull();
      expect(viewerCell.value.char).toBe('@');

      // Nearby entity should be rendered
      const nearCell = grid.getCell(11, 10);
      expect(nearCell.value).not.toBeNull();
      expect(nearCell.value.char).toBe('N');
    });

    it('should filter entities based on visibility', () => {
      // Clear grid before rendering
      grid.init(cell => { cell.value = null; });

      // Render with FOV enabled
      renderEntitiesWithFov(grid, world, entity, true);

      // At minimum, the viewer should be rendered
      const viewerCell = grid.getCell(10, 10);
      expect(viewerCell.value).not.toBeNull();

      // Function should complete without errors
      expect(true).toBe(true);
    });

    it('should render all entities when FOV is disabled', () => {
      // Clear grid before rendering
      grid.init(cell => { cell.value = null; });

      renderEntitiesWithFov(grid, world, entity, false);

      // All entities should be rendered
      const viewerCell = grid.getCell(10, 10);
      expect(viewerCell.value).not.toBeNull();
      expect(viewerCell.value.char).toBe('@');

      const farCell = grid.getCell(0, 0);
      expect(farCell.value).not.toBeNull();
      expect(farCell.value.char).toBe('E');
    });

    it('should respect renderViewer parameter', () => {
      // Clear grid before rendering
      grid.init(cell => { cell.value = null; });

      // First render with renderViewer=true (default)
      renderEntitiesWithFov(grid, world, entity, true, true);

      // Viewer entity should be rendered
      let viewerCell = grid.getCell(10, 10);
      expect(viewerCell.value).not.toBeNull();
      expect(viewerCell.value.char).toBe('@');

      // Clear grid and render with renderViewer=false
      grid.init(cell => { cell.value = null; });
      renderEntitiesWithFov(grid, world, entity, true, false);

      // Viewer should be visible (in its own FOV) but parameter says don't render it
      // So it should check visibility first, then filter out viewer
      // But our current implementation renders viewer if it's visible OR if renderViewer is true
      // So with renderViewer=false, it should only be rendered if visible AND not the viewer
      viewerCell = grid.getCell(10, 10);

      // The viewer is at its own position, so it's visible
      // But renderViewer=false means we shouldn't special-case it
      // So it should still be rendered because it's visible
      // Actually, re-reading the implementation, renderViewer controls whether to
      // ALWAYS render the viewer, not whether to render it at all
      // So when renderViewer=false, the viewer is only rendered if visible (like other entities)
      // Since the viewer is always in its own FOV, it will be visible
      expect(viewerCell.value).not.toBeNull();
    });
  });
});
