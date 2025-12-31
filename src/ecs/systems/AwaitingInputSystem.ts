import type { System, World, Phase } from '../types';
import type { GameClock } from '../resources/GameClock';
import type { Energy } from '../components/Energy';
import type { Action } from '../components/Action';
import { Components } from '../components';

/**
 * System that pauses the game clock when waiting for player input.
 * Runs in the 'early' phase before energy regeneration.
 *
 * This implements turn-based behavior by pausing time when the player
 * has no action queued, and resuming when an action is ready.
 *
 * Also sets a 'playerRecharging' flag when the player has an action
 * but not enough energy - this allows energy regen but blocks AI.
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
    world.registerComponent(Components.Energy);

    // Find all player-controlled entities
    const players = Array.from(world.query([Components.PlayerControlled]));

    if (players.length === 0) {
      // No player in the game, unpause
      clock.paused = false;
      clock.playerRecharging = false;
      return;
    }

    // Check if any player has an action queued and enough energy
    let anyPlayerHasAction = false;
    let anyPlayerRecharging = false;

    for (const player of players) {
      const action = world.getComponent<Action>(player, Components.Action);
      if (action) {
        const energy = world.getComponent<Energy>(player, Components.Energy);
        if (energy && energy.current >= action.energyCost) {
          anyPlayerHasAction = true;
        } else {
          // Player has action but not enough energy - recharging
          anyPlayerRecharging = true;
        }
        break;
      }
    }

    // Pause the clock if no player has an action queued
    // This makes the game wait for player input before processing the next tick
    clock.paused = !anyPlayerHasAction && !anyPlayerRecharging;

    // Set recharging flag - allows energy regen but blocks AI
    clock.playerRecharging = anyPlayerRecharging;
  }
}
