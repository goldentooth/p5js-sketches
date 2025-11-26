import type { Map as NugMap, Room } from './types';
import { Tiles } from './types';
import type { xoroshiro128plus } from '../rng';

type RNG = ReturnType<typeof xoroshiro128plus>;

/**
 * Options for column generation
 */
export interface ColumnOptions {
  /** Minimum room size (width and height) to qualify for columns */
  minRoomSize?: { width: number; height: number };
  /** Column size range (width and height in tiles) */
  columnSize?: { min: number; max: number };
  /** Spacing between columns (in tiles) */
  spacing?: { min: number; max: number };
  /** Probability of placing a column at each valid position (0-1) */
  density?: number;
  /** Minimum distance from room edges (in tiles) */
  edgeBuffer?: number;
  /** Minimum distance from corridor entrances (in tiles) */
  corridorBuffer?: number;
}

/**
 * Default column generation options
 */
export const DEFAULT_COLUMN_OPTIONS: Required<ColumnOptions> = {
  minRoomSize: { width: 10, height: 10 },
  columnSize: { min: 1, max: 3 },
  spacing: { min: 3, max: 6 },
  density: 0.8,
  edgeBuffer: 2,
  corridorBuffer: 2,
};

/**
 * A column/pillar structure in a room
 */
export interface Column {
  /** X coordinate of top-left corner */
  x: number;
  /** Y coordinate of top-left corner */
  y: number;
  /** Width of the column */
  width: number;
  /** Height of the column */
  height: number;
}

/**
 * Check if a position is near a corridor entrance
 * Corridors are floor tiles adjacent to room boundaries
 */
function isNearCorridor(
  map: NugMap,
  room: Room,
  x: number,
  y: number,
  buffer: number
): boolean {
  // Check positions around the perimeter of the room
  const roomX1 = room.x1();
  const roomX2 = room.x2();
  const roomY1 = room.y1();
  const roomY2 = room.y2();

  // Check top and bottom edges
  for (let checkX = roomX1 - 1; checkX <= roomX2 + 1; checkX++) {
    // Top edge
    if (map.isInBounds(checkX, roomY1 - 1) && map.getTile(checkX, roomY1 - 1) === Tiles.Floor) {
      // Found corridor entrance on top edge
      if (Math.abs(x - checkX) <= buffer && Math.abs(y - roomY1) <= buffer) {
        return true;
      }
    }
    // Bottom edge
    if (map.isInBounds(checkX, roomY2 + 1) && map.getTile(checkX, roomY2 + 1) === Tiles.Floor) {
      // Found corridor entrance on bottom edge
      if (Math.abs(x - checkX) <= buffer && Math.abs(y - roomY2) <= buffer) {
        return true;
      }
    }
  }

  // Check left and right edges
  for (let checkY = roomY1 - 1; checkY <= roomY2 + 1; checkY++) {
    // Left edge
    if (map.isInBounds(roomX1 - 1, checkY) && map.getTile(roomX1 - 1, checkY) === Tiles.Floor) {
      // Found corridor entrance on left edge
      if (Math.abs(x - roomX1) <= buffer && Math.abs(y - checkY) <= buffer) {
        return true;
      }
    }
    // Right edge
    if (map.isInBounds(roomX2 + 1, checkY) && map.getTile(roomX2 + 1, checkY) === Tiles.Floor) {
      // Found corridor entrance on right edge
      if (Math.abs(x - roomX2) <= buffer && Math.abs(y - checkY) <= buffer) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a column at the given position would be valid
 */
function isValidColumnPosition(
  map: NugMap,
  room: Room,
  x: number,
  y: number,
  columnWidth: number,
  columnHeight: number,
  options: Required<ColumnOptions>
): boolean {
  const { edgeBuffer, corridorBuffer } = options;

  // Check if column fits within room boundaries with edge buffer
  const roomX1 = room.x1();
  const roomX2 = room.x2();
  const roomY1 = room.y1();
  const roomY2 = room.y2();

  if (
    x < roomX1 + edgeBuffer ||
    y < roomY1 + edgeBuffer ||
    x + columnWidth - 1 > roomX2 - edgeBuffer ||
    y + columnHeight - 1 > roomY2 - edgeBuffer
  ) {
    return false;
  }

  // Check if near corridor entrance
  if (isNearCorridor(map, room, x, y, corridorBuffer)) {
    return false;
  }

  // Check if all tiles where column would be placed are currently floors
  for (let cy = y; cy < y + columnHeight; cy++) {
    for (let cx = x; cx < x + columnWidth; cx++) {
      if (map.getTile(cx, cy) !== Tiles.Floor) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Place a column (pillar) in the map by setting tiles to walls
 */
export function placeColumn(map: NugMap, column: Column): void {
  for (let y = column.y; y < column.y + column.height; y++) {
    for (let x = column.x; x < column.x + column.width; x++) {
      map.setTile(x, y, Tiles.Wall);
    }
  }
}

/**
 * Generate columns for a single room
 * @param map The map to place columns in
 * @param room The room to add columns to
 * @param rng Random number generator
 * @param options Column generation options
 * @returns Array of placed columns
 */
export function generateColumnsForRoom(
  map: NugMap,
  room: Room,
  rng: RNG,
  options: ColumnOptions = {}
): Column[] {
  const opts = { ...DEFAULT_COLUMN_OPTIONS, ...options };
  const columns: Column[] = [];

  // Check if room is large enough for columns
  if (room.width < opts.minRoomSize.width || room.height < opts.minRoomSize.height) {
    return columns;
  }

  // Randomly determine column size for this room (all columns in room have same size)
  const columnWidth = rng.nextRange(opts.columnSize.min, opts.columnSize.max + 1);
  const columnHeight = rng.nextRange(opts.columnSize.min, opts.columnSize.max + 1);

  // Randomly determine spacing for this room
  const spacingX = rng.nextRange(opts.spacing.min, opts.spacing.max + 1);
  const spacingY = rng.nextRange(opts.spacing.min, opts.spacing.max + 1);

  // Generate grid of potential column positions
  const roomX1 = room.x1();
  const roomX2 = room.x2();
  const roomY1 = room.y1();
  const roomY2 = room.y2();

  // Start from edge buffer + first spacing
  const startX = roomX1 + opts.edgeBuffer + spacingX;
  const startY = roomY1 + opts.edgeBuffer + spacingY;

  // Place columns at regular intervals
  for (let y = startY; y <= roomY2 - opts.edgeBuffer - columnHeight + 1; y += spacingY) {
    for (let x = startX; x <= roomX2 - opts.edgeBuffer - columnWidth + 1; x += spacingX) {
      // Random density check
      if (rng.nextFloat() > opts.density) {
        continue;
      }

      // Check if this is a valid position
      if (isValidColumnPosition(map, room, x, y, columnWidth, columnHeight, opts)) {
        const column: Column = { x, y, width: columnWidth, height: columnHeight };
        placeColumn(map, column);
        columns.push(column);
      }
    }
  }

  return columns;
}

/**
 * Generate columns for all rooms in a map
 * @param map The map to place columns in
 * @param rooms Array of rooms to add columns to
 * @param rng Random number generator
 * @param options Column generation options
 * @returns Map of room index to array of columns in that room
 */
export function generateColumns(
  map: NugMap,
  rooms: Room[],
  rng: RNG,
  options: ColumnOptions = {}
): Map<number, Column[]> {
  const columnsByRoom = new Map<number, Column[]>();

  rooms.forEach((room, index) => {
    const columns = generateColumnsForRoom(map, room, rng, options);
    if (columns.length > 0) {
      columnsByRoom.set(index, columns);
    }
  });

  return columnsByRoom;
}
