import type { System, World, Entity, Phase } from '../types';
import type { Map as GameMap } from '../../map/types';
import type { Direction } from '../../movement/directions';
import type { Position } from '../components/Position';
import { toGridX, toGridY } from '../../grid/types';
import { Components } from '../components';

interface MoveCommand {
  type: 'move';
  direction: Direction;
}

/**
 * System that processes movement commands for player-controlled entities
 */
export class MovementSystem implements System {
  phase: Phase = 'update';
  private commandQueues: Map<Entity, MoveCommand[]> = new Map();

  constructor(private map: GameMap) {}

  /**
   * Queue a movement command for an entity
   */
  queueCommand(entity: Entity, command: MoveCommand): void {
    if (!this.commandQueues.has(entity)) {
      this.commandQueues.set(entity, []);
    }
    this.commandQueues.get(entity)!.push(command);
  }

  /**
   * Get the next queued command for an entity
   */
  private getNextCommand(entity: Entity): MoveCommand | null {
    const queue = this.commandQueues.get(entity);
    if (!queue || queue.length === 0) {
      return null;
    }
    return queue.shift()!;
  }

  /**
   * Wrap coordinates based on map edge behavior
   */
  private wrapCoordinates(x: number, y: number): { x: number; y: number } {
    if (this.map.edgeBehavior === 'wrap') {
      const wrappedX = ((x % this.map.width) + this.map.width) % this.map.width;
      const wrappedY = ((y % this.map.height) + this.map.height) % this.map.height;
      return { x: wrappedX, y: wrappedY };
    }
    return { x, y };
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

    // Wrap coordinates if map uses wrapping
    const wrapped = this.wrapCoordinates(newX, newY);
    newX = wrapped.x;
    newY = wrapped.y;

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
    return true;
  }

  /**
   * Process movement commands for all player-controlled entities
   */
  run(world: World): void {
    for (const entity of world.query([Components.Position, Components.PlayerControlled])) {
      const command = this.getNextCommand(entity);
      if (command && command.type === 'move') {
        this.tryMove(world, entity, command.direction);
      }
    }
  }
}
