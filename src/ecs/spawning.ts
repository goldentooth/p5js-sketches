/**
 * Monster Spawning Utilities
 *
 * Helper functions for creating monster entities in rooms.
 */

import type { World, Entity } from './types.js';
import type { Room } from '../map/types.js';
import type { xoroshiro128plus } from '../rng.js';
import { Components } from './components/index.js';
import { createGlyph } from './components/Glyph.js';

/**
 * Configuration for a monster type
 */
export interface MonsterTemplate {
  /** Display name */
  name: string;
  /** Character to display */
  glyph: string;
  /** Foreground color as RGB tuple */
  fg: [number, number, number];
  /** Background color as RGB tuple (optional) */
  bg?: [number, number, number];
  /** Maximum hit points */
  maxHp: number;
  /** Attack power */
  attack: number;
  /** Defense rating */
  defense: number;
  /** Speed multiplier (default: 1.0) - affects energy regen rate */
  speed?: number;
  /** FOV range (default: 8) */
  fovRange?: number;
  /** Energy cost to move (default: 100) */
  moveCost?: number;
  /** Energy cost to attack (default: 100) */
  attackCost?: number;
}

/**
 * Preset monster templates for common enemy types
 */
export const MonsterTemplates: Record<string, MonsterTemplate> = {
  goblin: {
    name: 'Goblin',
    glyph: 'g',
    fg: [0, 255, 0],
    maxHp: 5,
    attack: 2,
    defense: 0,
    speed: 1.0,
    fovRange: 8,
    moveCost: 80,   // Quick and nimble
    attackCost: 80,
  },
  orc: {
    name: 'Orc',
    glyph: 'o',
    fg: [0, 180, 0],
    maxHp: 10,
    attack: 3,
    defense: 1,
    speed: 0.8,
    fovRange: 6,
    moveCost: 100,
    attackCost: 100,
  },
  troll: {
    name: 'Troll',
    glyph: 'T',
    fg: [0, 128, 64],
    maxHp: 20,
    attack: 4,
    defense: 2,
    speed: 0.5,
    fovRange: 4,
    moveCost: 120,  // Slow and lumbering
    attackCost: 150, // Big wind-up on attacks
  },
  rat: {
    name: 'Giant Rat',
    glyph: 'r',
    fg: [139, 69, 19],
    maxHp: 3,
    attack: 1,
    defense: 0,
    speed: 1.5,
    fovRange: 6,
    moveCost: 60,   // Very quick
    attackCost: 60,
  },
  skeleton: {
    name: 'Skeleton',
    glyph: 's',
    fg: [255, 255, 255],
    maxHp: 8,
    attack: 3,
    defense: 1,
    speed: 0.9,
    fovRange: 8,
    moveCost: 100,
    attackCost: 90,
  },
};

/**
 * Options for spawning a single monster
 */
export interface SpawnMonsterOptions {
  /** Room to spawn in */
  room: Room;
  /** Monster template to use */
  template: MonsterTemplate;
  /** RNG for position selection */
  rng: ReturnType<typeof xoroshiro128plus>;
  /** Set of position keys to avoid (format: "x,y") */
  avoidPositions?: Set<string>;
  /** Default energy cost for actions (default: 100) */
  actionEnergyCost?: number;
}

/**
 * Spawn a single monster in a room
 *
 * @param world - ECS world
 * @param options - Spawn options
 * @returns The created entity, or null if no valid position found
 */
export function spawnMonster(
  world: World,
  options: SpawnMonsterOptions
): Entity | null {
  const {
    room,
    template,
    rng,
    avoidPositions = new Set(),
    actionEnergyCost = 100,
  } = options;

  // Find a valid spawn position within the room
  const position = findSpawnPosition(room, avoidPositions, rng);
  if (!position) return null;

  // Create entity
  const entity = world.createEntity();

  // Add components
  world.addComponent(entity, Components.Position, {
    x: position.x,
    y: position.y,
  });

  // Create glyph with draw method for rendering
  const glyph = createGlyph(
    template.glyph,
    template.fg as any,
    (template.bg || [0, 0, 0]) as any
  );
  world.addComponent(entity, Components.Glyph, glyph);

  world.addComponent(entity, Components.AIControlled, {
    state: 'wandering',
  });

  // Add viewshed for independent vision
  world.addComponent(entity, Components.Viewshed, {
    range: template.fovRange || 8,
    algorithm: 'shadowcasting',
    visibleCells: new Set(),
    dirty: true,
  });

  world.addComponent(entity, Components.BlocksMovement, {});

  world.addComponent(entity, Components.CombatStats, {
    hp: template.maxHp,
    maxHp: template.maxHp,
    attack: template.attack,
    defense: template.defense,
  });

  const moveCost = template.moveCost ?? actionEnergyCost;
  const attackCost = template.attackCost ?? actionEnergyCost;
  const maxEnergy = Math.max(actionEnergyCost, moveCost, attackCost);

  world.addComponent(entity, Components.Energy, {
    current: 0,
    max: maxEnergy,
    regenRate: Math.floor(actionEnergyCost / 2),
    moveCost,
    attackCost,
  });

  if (template.speed && template.speed !== 1.0) {
    world.addComponent(entity, Components.Speed, {
      multiplier: template.speed,
    });
  }

  world.addComponent(entity, Components.Name, {
    name: template.name,
  });

  return entity;
}

/**
 * Find a valid spawn position within a room
 */
function findSpawnPosition(
  room: Room,
  avoidPositions: Set<string>,
  rng: ReturnType<typeof xoroshiro128plus>,
  maxAttempts: number = 20
): { x: number; y: number } | null {
  // Get room bounds (interior, not walls)
  const x1 = room.x1() + 1;
  const x2 = room.x2() - 1;
  const y1 = room.y1() + 1;
  const y2 = room.y2() - 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = rng.nextRange(x1, x2);
    const y = rng.nextRange(y1, y2);
    const key = `${x},${y}`;

    if (!avoidPositions.has(key)) {
      return { x, y };
    }
  }

  return null;
}

/**
 * Options for spawning monsters across multiple rooms
 */
export interface SpawnMonstersInRoomsOptions {
  /** Rooms to spawn in */
  rooms: Room[];
  /** Index of room to exclude (e.g., player start room) */
  excludeRoomIndex?: number;
  /** Number of monsters per room */
  monstersPerRoom?: number;
  /** Monster templates to choose from */
  templates: MonsterTemplate[];
  /** RNG for randomization */
  rng: ReturnType<typeof xoroshiro128plus>;
  /** Default energy cost for actions */
  actionEnergyCost?: number;
}

/**
 * Spawn monsters across multiple rooms
 *
 * @param world - ECS world
 * @param options - Spawn options
 * @returns Array of created monster entities
 */
export function spawnMonstersInRooms(
  world: World,
  options: SpawnMonstersInRoomsOptions
): Entity[] {
  const {
    rooms,
    excludeRoomIndex = -1,
    monstersPerRoom = 1,
    templates,
    rng,
    actionEnergyCost = 100,
  } = options;

  const monsters: Entity[] = [];
  const occupiedPositions = new Set<string>();

  for (let i = 0; i < rooms.length; i++) {
    // Skip excluded room
    if (i === excludeRoomIndex) continue;

    const room = rooms[i];

    for (let m = 0; m < monstersPerRoom; m++) {
      // Pick a random template
      const template = rng.nextChoice(templates);

      const entity = spawnMonster(world, {
        room,
        template,
        rng,
        avoidPositions: occupiedPositions,
        actionEnergyCost,
      });

      if (entity !== null) {
        monsters.push(entity);

        // Mark position as occupied
        const pos = world.getComponent<{ x: number; y: number }>(
          entity,
          Components.Position
        );
        if (pos) {
          occupiedPositions.add(`${pos.x},${pos.y}`);
        }
      }
    }
  }

  return monsters;
}

/**
 * Create a player entity with standard components
 *
 * @param world - ECS world
 * @param x - Starting X position
 * @param y - Starting Y position
 * @param options - Optional configuration
 * @returns The created player entity
 */
export interface CreatePlayerOptions {
  /** Player glyph (default: '@') */
  glyph?: string;
  /** Foreground color (default: white) */
  fg?: [number, number, number];
  /** Maximum HP (default: 10) */
  maxHp?: number;
  /** Attack power (default: 3) */
  attack?: number;
  /** Defense rating (default: 1) */
  defense?: number;
  /** FOV range (default: 10) */
  fovRange?: number;
  /** FOV algorithm (default: 'shadowcasting') */
  fovAlgorithm?: string;
  /** Action energy cost (default: 100) */
  actionEnergyCost?: number;
  /** Energy cost to move (default: 100) */
  moveCost?: number;
  /** Energy cost to attack (default: 100) */
  attackCost?: number;
}

export function createPlayer(
  world: World,
  x: number,
  y: number,
  options: CreatePlayerOptions = {}
): Entity {
  const {
    glyph = '@',
    fg = [255, 255, 255],
    maxHp = 10,
    attack = 3,
    defense = 1,
    fovRange = 10,
    fovAlgorithm = 'shadowcasting',
    actionEnergyCost = 100,
    moveCost = 100,
    attackCost = 100,
  } = options;

  const entity = world.createEntity();

  world.addComponent(entity, Components.Position, { x, y });

  world.addComponent(entity, Components.Glyph, {
    glyph,
    fg,
    bg: [0, 0, 0],
  });

  world.addComponent(entity, Components.PlayerControlled, {});

  world.addComponent(entity, Components.BlocksMovement, {});

  world.addComponent(entity, Components.CombatStats, {
    hp: maxHp,
    maxHp,
    attack,
    defense,
  });

  world.addComponent(entity, Components.Energy, {
    current: actionEnergyCost,
    max: actionEnergyCost,
    regenRate: Math.floor(actionEnergyCost / 2),
    moveCost,
    attackCost,
  });

  world.addComponent(entity, Components.Viewshed, {
    range: fovRange,
    algorithm: fovAlgorithm,
    visibleCells: new Set(),
    dirty: true,
  });

  world.addComponent(entity, Components.Memory, {
    exploredCells: new Set(),
  });

  return entity;
}
