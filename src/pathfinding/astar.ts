import type { Map as GameMap } from '../map/types.js';
import type { Direction } from '../movement/directions.js';
import { CARDINAL_DIRECTIONS, ALL_DIRECTIONS } from '../movement/directions.js';
import type { PathNode, PathfindingOptions, PathResult } from './types.js';

/**
 * Internal node for A* with scoring
 */
interface AStarNode {
  x: number;
  y: number;
  g: number; // Cost from start to this node
  h: number; // Heuristic cost to goal
  f: number; // Total score (g + h)
  parent: AStarNode | null;
}

/**
 * Create a unique key for a position
 */
function nodeKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Manhattan distance heuristic (for 4-way movement)
 */
function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

/**
 * Chebyshev distance heuristic (for 8-way movement)
 */
function chebyshevDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

/**
 * Find a path from start to goal using A* algorithm
 *
 * @param map - The game map to pathfind on
 * @param startX - Starting X coordinate
 * @param startY - Starting Y coordinate
 * @param goalX - Goal X coordinate
 * @param goalY - Goal Y coordinate
 * @param options - Pathfinding options
 * @returns PathResult with path (if found) and stats
 *
 * @example
 * ```typescript
 * const result = findPath(map, 5, 5, 15, 10);
 * if (result.found) {
 *   console.log('Path:', result.path);
 * }
 * ```
 */
export function findPath(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {}
): PathResult {
  const {
    maxNodes = 1000,
    allowDiagonal = false,
    isBlocked,
  } = options;

  // Use appropriate heuristic and directions
  const heuristic = allowDiagonal ? chebyshevDistance : manhattanDistance;
  const directions = allowDiagonal ? ALL_DIRECTIONS : CARDINAL_DIRECTIONS;

  // Check if start or goal is blocked by terrain (walls)
  // Note: We allow pathing TO an entity-blocked position (for attacking)
  if (map.blocksMovement(startX, startY) || map.blocksMovement(goalX, goalY)) {
    return { path: [], found: false, nodesExplored: 0 };
  }

  // Open set (nodes to explore) - use array as simple priority queue
  const openSet: AStarNode[] = [];

  // Closed set (already explored)
  const closedSet = new Set<string>();

  // Map from position key to best node at that position
  const nodeMap = new Map<string, AStarNode>();

  // Initialize start node
  const startH = heuristic(startX, startY, goalX, goalY);
  const startNode: AStarNode = {
    x: startX,
    y: startY,
    g: 0,
    h: startH,
    f: startH,
    parent: null,
  };

  openSet.push(startNode);
  nodeMap.set(nodeKey(startX, startY), startNode);

  let nodesExplored = 0;

  while (openSet.length > 0 && nodesExplored < maxNodes) {
    // Find node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const currentKey = nodeKey(current.x, current.y);

    nodesExplored++;

    // Check if we reached the goal
    if (current.x === goalX && current.y === goalY) {
      // Reconstruct path
      const path: PathNode[] = [];
      let node: AStarNode | null = current;
      while (node !== null && node.parent !== null) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return { path, found: true, nodesExplored };
    }

    closedSet.add(currentKey);

    // Explore neighbors
    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const neighborKey = nodeKey(nx, ny);

      // Skip if already explored
      if (closedSet.has(neighborKey)) continue;

      // Skip if out of bounds
      if (!map.isInBounds(nx, ny)) continue;

      // Skip if blocked by terrain
      if (map.blocksMovement(nx, ny)) continue;

      // Skip if blocked by entity (but allow goal position)
      if (isBlocked && isBlocked(nx, ny) && !(nx === goalX && ny === goalY)) {
        continue;
      }

      // Calculate scores
      const moveCost = allowDiagonal && dir.dx !== 0 && dir.dy !== 0 ? 1.414 : 1;
      const tentativeG = current.g + moveCost;
      const h = heuristic(nx, ny, goalX, goalY);
      const f = tentativeG + h;

      // Check if we already have a better path to this node
      const existing = nodeMap.get(neighborKey);
      if (existing && existing.g <= tentativeG) {
        continue;
      }

      // Create or update node
      const neighbor: AStarNode = {
        x: nx,
        y: ny,
        g: tentativeG,
        h,
        f,
        parent: current,
      };

      nodeMap.set(neighborKey, neighbor);

      // Add to open set if not already there
      if (!existing) {
        openSet.push(neighbor);
      } else {
        // Update existing node in open set
        const idx = openSet.findIndex(n => n.x === nx && n.y === ny);
        if (idx >= 0) {
          openSet[idx] = neighbor;
        }
      }
    }
  }

  // No path found
  return { path: [], found: false, nodesExplored };
}

/**
 * Get the first step direction toward a goal
 *
 * Finds the optimal path and returns just the first direction to move.
 * Returns null if no path exists.
 *
 * @param map - The game map
 * @param startX - Starting X coordinate
 * @param startY - Starting Y coordinate
 * @param goalX - Goal X coordinate
 * @param goalY - Goal Y coordinate
 * @param options - Pathfinding options
 * @returns Direction to move, or null if no path exists
 *
 * @example
 * ```typescript
 * const dir = getStepToward(map, monsterX, monsterY, playerX, playerY);
 * if (dir) {
 *   movementSystem.queueCommand(entity, { type: 'move', direction: dir });
 * }
 * ```
 */
export function getStepToward(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {}
): Direction | null {
  const result = findPath(map, startX, startY, goalX, goalY, options);

  if (!result.found || result.path.length === 0) {
    return null;
  }

  const firstStep = result.path[0];
  return {
    dx: firstStep.x - startX,
    dy: firstStep.y - startY,
  };
}

/**
 * Calculate distance between two points (used for adjacency checks)
 *
 * @param x1 - First point X
 * @param y1 - First point Y
 * @param x2 - Second point X
 * @param y2 - Second point Y
 * @returns Chebyshev distance (max of dx, dy)
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

/**
 * Check if two positions are adjacent (within 1 tile)
 *
 * @param x1 - First position X
 * @param y1 - First position Y
 * @param x2 - Second position X
 * @param y2 - Second position Y
 * @returns True if positions are adjacent (including diagonals)
 */
export function isAdjacent(x1: number, y1: number, x2: number, y2: number): boolean {
  return distance(x1, y1, x2, y2) === 1;
}
