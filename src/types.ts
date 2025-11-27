/**
 * Utility type for creating branded/nominal types in TypeScript
 *
 * TypeScript uses structural typing, meaning two types with identical structure
 * are considered the same. Branded types add a unique marker that makes types
 * nominally distinct, preventing accidental misuse.
 *
 * This is used throughout the codebase to create type-safe wrappers for primitives
 * like GridX, GridY, PixelX, PixelY, etc., preventing you from accidentally passing
 * a grid coordinate where a pixel coordinate is expected.
 *
 * @example
 * ```typescript
 * // Define branded types
 * type GridX = number & As<'GridX'>;
 * type PixelX = number & As<'PixelX'>;
 *
 * // These are structurally identical but nominally different
 * const gridPos = 5 as GridX;
 * const pixelPos = 80 as PixelX;
 *
 * function moveEntity(x: GridX) { }
 *
 * moveEntity(gridPos);   // ✓ OK
 * moveEntity(pixelPos);  // ✗ Type error - can't pass PixelX where GridX expected
 * moveEntity(5);         // ✗ Type error - can't pass raw number
 * ```
 */
export declare abstract class As<Tag extends keyof never> {
  private static readonly $as$: unique symbol;
  private [As.$as$]: Record<Tag, true>;
}
