/**
 * Field of View Helper Utilities
 *
 * High-level utilities for working with viewsheds and fog of war rendering.
 * These functions simplify common FOV patterns in sketches.
 */

import type { World, Entity } from '../ecs/types.js';
import type { Map as GameMap } from '../map/types.js';
import type { Grid, GridX, GridY } from '../grid/types.js';
import type { Viewshed } from '../ecs/components/Viewshed.js';
import type { Glyph } from '../ecs/components/Glyph.js';
import type { FovAlgorithm } from './types.js';
import { Components } from '../ecs/components/index.js';
import { getVisibilityState } from './visibility.js';

/**
 * Settings for updating a viewshed component
 */
export interface ViewshedSettings {
  /** Visibility range in tiles */
  range?: number;

  /** FOV algorithm to use */
  algorithm?: FovAlgorithm;

  /** Permissiveness level (0-8) for permissive algorithm */
  permissiveness?: number;
}

/**
 * Update a viewshed component with new settings and mark it dirty
 *
 * @param world - ECS world
 * @param entity - Entity with Viewshed component
 * @param settings - New viewshed settings (only specified fields are updated)
 * @returns True if viewshed was updated, false if entity has no viewshed
 *
 * @example
 * ```typescript
 * // Update range only
 * updateViewshedSettings(world, playerEntity, { range: 15 });
 *
 * // Update algorithm and permissiveness
 * updateViewshedSettings(world, playerEntity, {
 *   algorithm: 'permissive',
 *   permissiveness: 4
 * });
 * ```
 */
export function updateViewshedSettings(
  world: World,
  entity: Entity,
  settings: ViewshedSettings
): boolean {
  const viewshed = world.getComponent<Viewshed>(entity, Components.Viewshed);
  if (!viewshed) return false;

  // Update specified settings
  if (settings.range !== undefined) {
    viewshed.range = settings.range;
  }
  if (settings.algorithm !== undefined) {
    viewshed.algorithm = settings.algorithm;
  }
  if (settings.permissiveness !== undefined) {
    (viewshed as any).permissiveness = settings.permissiveness;
  }

  // Mark dirty to trigger recalculation
  viewshed.dirty = true;

  return true;
}

/**
 * Simplified glyph data structure for FOV helpers
 *
 * This is a minimal interface compatible with the full Glyph component.
 * Colors are represented as RGB tuples for efficient manipulation during FOV calculations.
 *
 * @see {@link Glyph} for the full ECS component type
 */
export interface FovGlyph {
  char: string;
  fg: [number, number, number];
  bg: [number, number, number];
}

/**
 * Minimal palette interface for retrieving glyphs by name
 *
 * This interface is compatible with the GlyphPalette class but uses simplified
 * FovGlyph types for efficient color manipulation during FOV rendering.
 *
 * @see {@link GlyphPalette} for the full palette implementation
 */
export interface FovGlyphPalette {
  get(name: string): FovGlyph;
}

/**
 * Options for syncing map to grid with fog of war
 */
export interface SyncMapToGridOptions {
  /** The grid to update */
  grid: Grid;

  /** The map to read tiles from */
  map: GameMap;

  /** Glyph palette for rendering tiles */
  palette: FovGlyphPalette;

  /** ECS world (required if FOV is enabled) */
  world?: World;

  /** Entity to check visibility from (required if FOV is enabled) */
  viewerEntity?: Entity;

  /** Whether fog of war is enabled (default: true if world and viewerEntity provided) */
  fovEnabled?: boolean;

  /** Tile type to glyph name mapping */
  tileGlyphs?: Map<number, string>;

  /** Brightness factor for explored but not visible tiles (default: 0.3) */
  exploredBrightness?: number;
}

/**
 * Sync map tiles to grid with fog of war rendering
 *
 * This is a high-level utility that handles the common pattern of:
 * 1. Iterating over grid cells
 * 2. Checking visibility state (visible/explored/hidden)
 * 3. Getting the appropriate glyph from the palette
 * 4. Applying fog of war dimming for explored tiles
 * 5. Setting the grid cell value
 *
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * // Basic usage with fog of war
 * syncMapToGridWithFov({
 *   grid,
 *   map,
 *   palette,
 *   world,
 *   viewerEntity: playerEntity,
 *   tileGlyphs: new Map([
 *     [Nuglib.Tiles.Wall, 'wall'],
 *     [Nuglib.Tiles.Floor, 'floor']
 *   ])
 * });
 *
 * // Without fog of war
 * syncMapToGridWithFov({
 *   grid,
 *   map,
 *   palette,
 *   fovEnabled: false,
 *   tileGlyphs: new Map([
 *     [Nuglib.Tiles.Wall, 'wall'],
 *     [Nuglib.Tiles.Floor, 'floor']
 *   ])
 * });
 * ```
 */
export function syncMapToGridWithFov(options: SyncMapToGridOptions): void {
  const {
    grid,
    map,
    palette,
    world,
    viewerEntity,
    fovEnabled = world !== undefined && viewerEntity !== undefined,
    tileGlyphs = new Map(),
    exploredBrightness = 0.3,
  } = options;

  grid.init((cell) => {
    // Get visibility state for this cell
    const visibilityState =
      fovEnabled && world && viewerEntity
        ? getVisibilityState(world, viewerEntity, cell.x, cell.y)
        : 'visible';

    // Hidden cells are not rendered
    if (visibilityState === 'hidden') {
      cell.value = null;
      return;
    }

    // Get the tile type and corresponding glyph name
    const tileType = map.getTile(cell.x, cell.y);
    const glyphName = tileGlyphs.get(tileType);

    if (!glyphName) {
      cell.value = null;
      return;
    }

    // Get the base glyph from palette
    const baseGlyph = palette.get(glyphName);
    if (!baseGlyph) {
      cell.value = null;
      return;
    }

    // Clone the glyph so we don't modify the palette
    const glyph = { ...baseGlyph };

    // Apply fog of war effect to explored but not visible cells
    if (visibilityState === 'explored') {
      // Dim the foreground color
      glyph.fg = [
        Math.floor(glyph.fg[0] * exploredBrightness),
        Math.floor(glyph.fg[1] * exploredBrightness),
        Math.floor(glyph.fg[2] * exploredBrightness),
      ];
    }

    cell.value = glyph;
  });
}

/**
 * Render entities to grid with fog of war filtering
 *
 * Only renders entities that are currently visible (or the viewer entity itself).
 * This should be called after syncMapToGridWithFov to overlay entities on top of tiles.
 *
 * @param grid - The grid to render to
 * @param world - ECS world
 * @param viewerEntity - Entity to check visibility from
 * @param fovEnabled - Whether fog of war is enabled (default: true)
 * @param renderViewer - Whether to always render the viewer entity (default: true)
 *
 * @example
 * ```typescript
 * // Render all visible entities
 * renderEntitiesWithFov(grid, world, playerEntity);
 *
 * // Render entities, hide viewer
 * renderEntitiesWithFov(grid, world, playerEntity, true, false);
 * ```
 */
export function renderEntitiesWithFov(
  grid: Grid,
  world: World,
  viewerEntity: Entity,
  fovEnabled: boolean = true,
  renderViewer: boolean = true
): void {
  // Query entities with Position and Glyph components
  for (const entity of world.query([Components.Position, Components.Glyph])) {
    const pos = world.getComponent<{ x: GridX; y: GridY }>(entity, Components.Position);
    const glyph = world.getComponent<Glyph>(entity, Components.Glyph);

    if (!pos || !glyph) continue;

    // Check visibility
    const visibilityState = fovEnabled
      ? getVisibilityState(world, viewerEntity, pos.x, pos.y)
      : 'visible';

    // Only render if visible or if this is the viewer entity
    const shouldRender =
      visibilityState === 'visible' || (renderViewer && entity === viewerEntity);

    if (shouldRender) {
      const cell = grid.getCell(pos.x, pos.y);
      if (cell) {
        cell.value = glyph;
      }
    }
  }
}
