/**
 * Field of View (FOV) types and interfaces
 *
 * This module defines the core types for FOV calculation algorithms.
 * FOV algorithms determine which cells are visible from a given position,
 * accounting for obstructions like walls.
 */

import type { GridX, GridY } from '../grid/types.js';

/**
 * Available FOV algorithms
 *
 * - shadowcasting: Fast indoors, creates realistic shadows (default)
 * - raycasting: Simple ray-based approach, fast outdoors
 * - diamond-raycasting: Minimal shadows, good for stealth gameplay
 * - permissive: Configurable permissiveness, perfect symmetry at level 8
 */
export type FovAlgorithm =
  | 'shadowcasting'
  | 'raycasting'
  | 'diamond-raycasting'
  | 'permissive';

/**
 * Represents a visible cell's coordinates
 */
export interface VisibleCell {
  x: GridX;
  y: GridY;
}

/**
 * Map interface required by FOV algorithms
 *
 * FOV algorithms need to query whether tiles block vision.
 * This interface allows algorithms to work with any map-like structure.
 */
export interface FovMap {
  /** Check if coordinates are within map bounds */
  isInBounds(x: number, y: number): boolean;

  /** Check if a tile blocks vision (e.g., walls) */
  blocksVision(x: number, y: number): boolean;

  /** Map width in tiles */
  width: number;

  /** Map height in tiles */
  height: number;

  /** How map handles edges: 'block' treats edges as walls, 'wrap' allows wrapping */
  edgeBehavior: 'block' | 'wrap';
}

/**
 * Configuration for FOV calculation
 */
export interface FovOptions {
  /** Maximum visibility range in tiles */
  range: number;

  /** Which algorithm to use */
  algorithm?: FovAlgorithm;

  /**
   * Permissiveness level (0-8) for permissive FOV algorithm
   * Higher values are more permissive (see around corners more easily)
   * Only used when algorithm is 'permissive'
   */
  permissiveness?: number;
}

/**
 * Result of an FOV calculation
 */
export interface FovResult {
  /** Set of visible cells as "x,y" strings for fast lookup */
  visibleCells: Set<string>;

  /** Array of visible cells for iteration */
  cells: VisibleCell[];
}

/**
 * Octant transformation for shadowcasting
 *
 * Shadowcasting divides the field of view into 8 octants (45° wedges).
 * Each octant uses coordinate transformation to reuse the same core algorithm.
 */
export interface Octant {
  /** Transform from octant coordinates to map coordinates */
  transformX(row: number, col: number): number;
  transformY(row: number, col: number): number;
}

/**
 * Shadow segment for shadowcasting algorithm
 *
 * Shadows are tracked as slope ranges, not tile coordinates.
 * This keeps them distance-independent as rays expand outward.
 */
export interface Shadow {
  /** Starting slope of shadow (angle from origin) */
  start: number;

  /** Ending slope of shadow (angle from origin) */
  end: number;
}

/**
 * Shadow line for shadowcasting
 *
 * Collection of shadow segments. Segments may merge when they overlap.
 */
export type ShadowLine = Shadow[];

/**
 * Convert cell coordinates to a string key for Set storage
 */
export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Parse a cell key back into coordinates
 */
export function parseCellKey(key: string): VisibleCell {
  const [x, y] = key.split(',').map(Number);
  return { x: x as GridX, y: y as GridY };
}
