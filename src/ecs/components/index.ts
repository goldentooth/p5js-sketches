export * from './BlocksMovement';
export * from './Glyph';
export * from './PlayerControlled';
export * from './Position';

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
  Position: 'Position',
  PlayerControlled: 'PlayerControlled',
  BlocksMovement: 'BlocksMovement',
  Glyph: 'Glyph',
} as const;

// Note: Existing tests may use lowercase keys. Both are supported for backward compatibility.

/**
 * Type representing valid component keys
 */
export type ComponentKey = typeof Components[keyof typeof Components];
