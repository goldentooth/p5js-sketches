export * from './Action';
export * from './AIControlled';
export * from './BlocksMovement';
export * from './CombatStats';
export * from './Energy';
export * from './Glyph';
export * from './Memory';
export * from './Name';
export * from './PlayerControlled';
export * from './Position';
export * from './Speed';
export * from './Viewshed';

/**
 * Type-safe component key registry
 * Use these constants instead of string literals for compile-time safety
 *
 * @example
 * // Instead of:
 * world.addComponent(entity, 'Position', {x: 5, y: 5})
 *
 * // Use:
 * world.addComponent(entity, Components.Position, {x: 5, y: 5})
 */
export const Components = {
  Action: 'Action',
  AIControlled: 'AIControlled',
  BlocksMovement: 'BlocksMovement',
  CombatStats: 'CombatStats',
  Energy: 'Energy',
  Glyph: 'Glyph',
  Memory: 'Memory',
  Name: 'Name',
  PlayerControlled: 'PlayerControlled',
  Position: 'Position',
  Speed: 'Speed',
  Viewshed: 'Viewshed',
} as const;

// Note: Existing tests may use lowercase keys. Both are supported for backward compatibility.

/**
 * Type representing valid component keys
 */
export type ComponentKey = typeof Components[keyof typeof Components];
