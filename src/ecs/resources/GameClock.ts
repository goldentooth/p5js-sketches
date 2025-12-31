/**
 * GameClock resource tracks global game time.
 * Used by the energy system to coordinate turn-based timing.
 */
export interface GameClock {
  /** Current game tick/turn number */
  tick: number;
  /** Whether the game clock is paused */
  paused: boolean;
  /** Whether the player is recharging energy (blocks AI but allows regen) */
  playerRecharging: boolean;
}

/**
 * Create a new GameClock resource with default values
 */
export function createGameClock(): GameClock {
  return {
    tick: 0,
    paused: false,
    playerRecharging: false,
  };
}
