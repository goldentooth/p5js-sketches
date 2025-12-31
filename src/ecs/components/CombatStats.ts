export const CombatStats = 'CombatStats';

/**
 * Combat statistics component for entities that can fight.
 * Tracks health and offensive/defensive capabilities.
 */
export interface CombatStats {
  /** Current hit points */
  hp: number;
  /** Maximum hit points */
  maxHp: number;
  /** Attack power (damage dealt before defense reduction) */
  attack: number;
  /** Defense (reduces incoming damage) */
  defense: number;
}

/**
 * Create a CombatStats component with sensible defaults
 *
 * @param maxHp - Maximum and starting hit points
 * @param attack - Attack power (default: 1)
 * @param defense - Defense rating (default: 0)
 * @returns CombatStats component data
 */
export function createCombatStats(
  maxHp: number,
  attack: number = 1,
  defense: number = 0
): CombatStats {
  return {
    hp: maxHp,
    maxHp,
    attack,
    defense,
  };
}
