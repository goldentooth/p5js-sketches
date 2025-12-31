import type { System, World, Phase, Entity } from '../types.js';
import type { GameClock } from '../resources/GameClock.js';
import type { Map as GameMap } from '../../map/types.js';
import type { Position } from '../components/Position.js';
import type { CombatStats } from '../components/CombatStats.js';
import type { xoroshiro128plus } from '../../rng.js';
import { Components } from '../components/index.js';
import { getStepToward, isAdjacent } from '../../pathfinding/astar.js';
import { randomCardinalDirection } from '../../movement/random.js';
import { isVisible } from '../../fov/visibility.js';

/**
 * Options for the AI System
 */
export interface AISystemOptions {
  /** Default energy cost for AI actions (default: 100) */
  defaultActionCost?: number;
  /** RNG for random movement */
  rng?: ReturnType<typeof xoroshiro128plus>;
}

/**
 * System that controls AI-controlled entities.
 *
 * Behavior:
 * - When the player is visible to an AI entity (symmetric FOV), chase them
 * - When adjacent to the player, queue an attack action
 * - When player is not visible, wander randomly
 *
 * Runs in the 'early' phase after AwaitingInputSystem.
 */
export class AISystem implements System {
  phase: Phase = 'early';
  private defaultActionCost: number;
  private rng?: ReturnType<typeof xoroshiro128plus>;

  constructor(
    private map: GameMap,
    options: AISystemOptions = {}
  ) {
    this.defaultActionCost = options.defaultActionCost ?? 100;
    this.rng = options.rng;
  }

  /**
   * Process all AI-controlled entities
   */
  run(world: World): void {
    // Don't process if clock is paused (waiting for player input)
    const clock = world.getResource<GameClock>('GameClock');
    if (clock?.paused) return;

    // Register components
    world.registerComponent(Components.AIControlled);
    world.registerComponent(Components.Position);
    world.registerComponent(Components.Energy);
    world.registerComponent(Components.Action);
    world.registerComponent(Components.PlayerControlled);
    world.registerComponent(Components.CombatStats);
    world.registerComponent(Components.BlocksMovement);
    world.registerComponent(Components.Viewshed);

    // Find player position
    const playerData = this.getPlayerData(world);
    if (!playerData) return;

    // Get all blocking entity positions for pathfinding
    const blockedPositions = this.getBlockedPositions(world, playerData.entity);

    // Process all AI-controlled entities
    for (const entity of world.query([
      Components.AIControlled,
      Components.Position,
      Components.Energy,
    ])) {
      // Skip if already has an action queued
      if (world.getComponent(entity, Components.Action)) continue;

      const pos = world.getComponent<Position>(entity, Components.Position);
      if (!pos) continue;

      // Check if this monster can see the player using its own viewshed
      // Each monster has independent vision based on its Viewshed component
      const canSeePlayer = isVisible(world, entity, playerData.pos.x, playerData.pos.y);

      if (canSeePlayer) {
        this.handleVisiblePlayer(world, entity, pos, playerData, blockedPositions);
      } else {
        this.queueWanderAction(world, entity);
      }
    }
  }

  /**
   * Get player entity and position
   */
  private getPlayerData(world: World): { entity: Entity; pos: Position } | null {
    for (const entity of world.query([Components.PlayerControlled, Components.Position])) {
      const pos = world.getComponent<Position>(entity, Components.Position);
      if (pos) {
        return { entity, pos };
      }
    }
    return null;
  }

  /**
   * Get set of positions blocked by entities (for pathfinding)
   */
  private getBlockedPositions(world: World, excludeEntity?: Entity): Set<string> {
    const blocked = new Set<string>();

    for (const entity of world.query([Components.Position, Components.BlocksMovement])) {
      if (entity === excludeEntity) continue;
      const pos = world.getComponent<Position>(entity, Components.Position);
      if (pos) {
        blocked.add(`${pos.x},${pos.y}`);
      }
    }

    return blocked;
  }

  /**
   * Handle AI when player is visible
   */
  private handleVisiblePlayer(
    world: World,
    entity: Entity,
    pos: Position,
    playerData: { entity: Entity; pos: Position },
    blockedPositions: Set<string>
  ): void {
    // Check if adjacent to player - attack!
    if (isAdjacent(pos.x, pos.y, playerData.pos.x, playerData.pos.y)) {
      this.queueAttackAction(world, entity, playerData.entity);
      return;
    }

    // Not adjacent - pathfind toward player
    const direction = getStepToward(
      this.map,
      pos.x,
      pos.y,
      playerData.pos.x,
      playerData.pos.y,
      {
        isBlocked: (x, y) => {
          // Don't block on self position
          if (x === pos.x && y === pos.y) return false;
          // Don't block on target position (player)
          if (x === playerData.pos.x && y === playerData.pos.y) return false;
          return blockedPositions.has(`${x},${y}`);
        },
      }
    );

    if (direction) {
      this.queueMoveAction(world, entity, direction);
    } else {
      // Can't path to player, wander instead
      this.queueWanderAction(world, entity);
    }
  }

  /**
   * Queue a movement action
   */
  private queueMoveAction(
    world: World,
    entity: Entity,
    direction: { dx: number; dy: number }
  ): void {
    world.addComponent(entity, Components.Action, {
      type: 'move',
      direction,
      energyCost: this.defaultActionCost,
    });
  }

  /**
   * Queue a melee attack action
   */
  private queueAttackAction(world: World, entity: Entity, target: Entity): void {
    world.addComponent(entity, Components.Action, {
      type: 'melee_attack',
      target,
      energyCost: this.defaultActionCost,
    });
  }

  /**
   * Queue a random wander action
   */
  private queueWanderAction(world: World, entity: Entity): void {
    const direction = randomCardinalDirection(this.rng);
    world.addComponent(entity, Components.Action, {
      type: 'move',
      direction,
      energyCost: this.defaultActionCost,
    });
  }
}
