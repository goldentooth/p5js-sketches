import type { System, World, Phase } from '../types';
import type { Energy } from '../components/Energy';
import type { Speed } from '../components/Speed';
import type { GameClock } from '../resources/GameClock';
import { Components } from '../components';

/**
 * System that regenerates energy for all entities and advances the game clock.
 * Runs in the 'early' phase before other systems.
 */
export class EnergyRegenerationSystem implements System {
  phase: Phase = 'early';

  /**
   * Regenerate energy for all entities with Energy component.
   * Energy regeneration rate is affected by Speed multiplier.
   */
  run(world: World): void {
    // Check if clock is paused
    const clock = world.getResource<GameClock>('GameClock');
    const isPaused = clock?.paused ?? false;

    // Increment game clock if not paused
    if (clock && !isPaused) {
      clock.tick++;
    }

    // Don't regenerate energy if clock is paused
    if (isPaused) {
      return;
    }

    // Register components before querying
    world.registerComponent(Components.Energy);
    world.registerComponent(Components.Speed);

    // Regenerate energy for all entities
    for (const entity of world.query([Components.Energy])) {
      const energy = world.getComponent<Energy>(entity, Components.Energy);
      if (!energy) continue;

      // Get speed multiplier (default 1.0 if no Speed component)
      const speed = world.getComponent<Speed>(entity, Components.Speed);
      const multiplier = speed?.multiplier ?? 1.0;

      // Add energy based on regen rate and speed
      energy.current += energy.regenRate * multiplier;

      // Cap at max energy
      energy.current = Math.min(energy.current, energy.max);
    }
  }
}
