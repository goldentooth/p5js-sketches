import type { System, World, Entity, Phase } from '../types';
import type { Map as GameMap } from '../../map/types';
import type { Direction } from '../../movement/directions';
import type { Position } from '../components/Position';
import type { Viewshed } from '../components/Viewshed';
import { toGridX, toGridY } from '../../grid/types';
import { Components } from '../components';
import { normalizeCoordinates } from '../../grid/wrapping';

/**
 * System that handles movement logic for entities.
 * Movement is now triggered via Action components, not direct commands.
 * This system provides the tryMove() method used by ActionExecutionSystem.
 */
interface MoveCommand {
  type: 'move';
  direction: Direction;
}

export class MovementSystem implements System {
  phase: Phase = 'update';
  private world: World | null = null;
  private legacyCommandQueue?: Map<Entity, MoveCommand[]>;

  constructor(private map: GameMap) {}

  /**
   * Queue a movement command.
   * This is a compatibility method for tests and legacy code that executes immediately.
   * For energy-based movement, use world.addComponent(entity, Components.Action, ...) directly.
   * @deprecated Use Action components with energy system for turn-based movement
   */
  queueCommand(entity: Entity, command: { type: 'move'; direction: Direction }): void {
    if (!this.world) {
      // Queue for later processing when run() is called
      if (!this.legacyCommandQueue) {
        this.legacyCommandQueue = new Map();
      }
      if (!this.legacyCommandQueue.has(entity)) {
        this.legacyCommandQueue.set(entity, []);
      }
      this.legacyCommandQueue.get(entity)!.push(command);
      return;
    }

    // Check if entity has Energy component (new system)
    const energy = this.world.getComponent(entity, Components.Energy);
    if (energy) {
      // Use new energy-based system
      this.world.addComponent(entity, Components.Action, {
        type: command.type,
        direction: command.direction,
        energyCost: 100,
      });
    } else {
      // Use legacy immediate execution for backward compatibility
      this.tryMove(this.world, entity, command.direction);
    }
  }

  /**
   * Try to move an entity in a direction
   * Returns true if movement succeeded
   */
  tryMove(world: World, entity: Entity, direction: Direction): boolean {
    const pos = world.getComponent<Position>(entity, Components.Position);
    if (!pos) return false;

    let newX = pos.x + direction.dx;
    let newY = pos.y + direction.dy;

    // Normalize coordinates based on map edge behavior
    const normalized = normalizeCoordinates(
      newX,
      newY,
      this.map.width,
      this.map.height,
      this.map.edgeBehavior
    );
    newX = normalized.x;
    newY = normalized.y;

    // Check if target tile blocks movement
    if (this.map.blocksMovement(newX, newY)) {
      return false;
    }

    // Check if another entity blocks movement at target position
    // Register component if not already registered
    world.registerComponent(Components.BlocksMovement);

    for (const other of world.query([Components.Position, Components.BlocksMovement])) {
      const otherPos = world.getComponent<Position>(other, Components.Position);
      if (otherPos && otherPos.x === newX && otherPos.y === newY) {
        return false;
      }
    }

    // Move is valid
    pos.x = toGridX(newX);
    pos.y = toGridY(newY);

    // Mark viewshed as dirty if entity has one
    const viewshed = world.getComponent<Viewshed>(entity, Components.Viewshed);
    if (viewshed) {
      viewshed.dirty = true;
    }

    return true;
  }

  /**
   * MovementSystem no longer processes its own actions by default.
   * Movement is handled by ActionExecutionSystem calling tryMove().
   * For backward compatibility, processes ONE command per entity per tick from legacy queue.
   */
  run(world: World): void {
    // Store world reference for queueCommand compatibility
    this.world = world;

    // Process legacy command queue for backward compatibility (one command per entity per tick)
    if (this.legacyCommandQueue) {
      for (const [entity, commands] of this.legacyCommandQueue) {
        if (commands.length > 0) {
          const command = commands.shift()!;
          this.tryMove(world, entity, command.direction);
        }
      }
    }

    // Modern path: Actions are processed by ActionExecutionSystem
  }
}
