import type { System, World, Phase } from '../types';
import type { GameClock } from '../resources/GameClock';
import { Components } from '../components';

/**
 * System that pauses the game clock when waiting for player input.
 * Runs in the 'early' phase before energy regeneration.
 *
 * This implements turn-based behavior by pausing time when the player
 * has no action queued, and resuming when an action is ready.
 */
export class AwaitingInputSystem implements System {
  phase: Phase = 'early';

  /**
   * Check if player has an action queued, and pause/unpause the game clock accordingly.
   */
  run(world: World): void {
    const clock = world.getResource<GameClock>('GameClock');
    if (!clock) return;

    // Register components before querying
    world.registerComponent(Components.PlayerControlled);
    world.registerComponent(Components.Action);

    // Find all player-controlled entities
    const players = Array.from(world.query([Components.PlayerControlled]));

    if (players.length === 0) {
      // No player in the game, unpause
      clock.paused = false;
      return;
    }

    // Check if any player has an action queued
    let anyPlayerHasAction = false;
    for (const player of players) {
      const action = world.getComponent(player, Components.Action);
      if (action) {
        anyPlayerHasAction = true;
        break;
      }
    }

    // Pause the clock if no player has an action queued
    // This makes the game wait for player input before processing the next tick
    clock.paused = !anyPlayerHasAction;
  }
}
