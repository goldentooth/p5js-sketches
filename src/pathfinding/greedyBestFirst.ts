import type { Map as GameMap } from '../map/types.js';
import type { Direction } from '../movement/directions.js';
import { CARDINAL_DIRECTIONS, ALL_DIRECTIONS } from '../movement/directions.js';
import type { PathNode, PathfindingOptions, PathResult, StepState, NodeState } from './types.js';

/**
 * Internal node for Greedy Best-First Search
 */
interface GreedyNode {
  x: number;
  y: number;
  h: number; // Heuristic cost to goal (only scoring used)
  parent: GreedyNode | null;
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
 * Convert an internal GreedyNode to the public NodeState interface.
 * g is always 0 for Greedy Best-First, f equals h.
 */
function toNodeState(node: GreedyNode): NodeState {
  return {
    x: node.x,
    y: node.y,
    g: 0,
    h: node.h,
    f: node.h,
    parentX: node.parent ? node.parent.x : node.x,
    parentY: node.parent ? node.parent.y : node.y,
  };
}

/**
 * Build a StepState snapshot from the current algorithm state
 */
function buildStepState(
  openSet: GreedyNode[],
  closedMap: Map<string, GreedyNode>,
  current: GreedyNode,
  goalX: number,
  goalY: number,
  nodesExplored: number,
  found: boolean,
): StepState {
  const openMap = new Map<string, NodeState>();
  for (const node of openSet) {
    openMap.set(nodeKey(node.x, node.y), toNodeState(node));
  }

  const closedSnapshot = new Map<string, NodeState>();
  for (const [key, node] of closedMap) {
    closedSnapshot.set(key, toNodeState(node));
  }

  return {
    openSet: openMap,
    closedSet: closedSnapshot,
    current: { x: current.x, y: current.y },
    goal: { x: goalX, y: goalY },
    found,
    nodesExplored,
  };
}

/**
 * Reconstruct the path from goal back to start (excluding start)
 */
function reconstructPath(goalNode: GreedyNode): PathNode[] {
  const path: PathNode[] = [];
  let node: GreedyNode | null = goalNode;
  while (node !== null && node.parent !== null) {
    path.unshift({ x: node.x, y: node.y });
    node = node.parent;
  }
  return path;
}

/**
 * Generator-based Greedy Best-First Search that yields StepState after each node expansion.
 *
 * Greedy Best-First uses only the heuristic (h) to select the next node.
 * g is always 0, f = h. Sorts open set by h. Once a node is visited, it is
 * never revisited (no cost comparison needed since g=0). This is faster than
 * A* but does not guarantee the shortest path.
 *
 * Yields StepState on each step, returns PathResult when done.
 * For start==goal or blocked start/goal, returns immediately with no yields.
 *
 * @param map - The game map to pathfind on
 * @param startX - Starting X coordinate
 * @param startY - Starting Y coordinate
 * @param goalX - Goal X coordinate
 * @param goalY - Goal Y coordinate
 * @param options - Pathfinding options
 * @returns Generator yielding StepState, returning PathResult
 */
export function* findPathGreedyStepped(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {}
): Generator<StepState, PathResult> {
  const {
    maxNodes = 1000,
    allowDiagonal = false,
    isBlocked,
  } = options;

  const heuristic = allowDiagonal ? chebyshevDistance : manhattanDistance;
  const directions = allowDiagonal ? ALL_DIRECTIONS : CARDINAL_DIRECTIONS;

  // Immediate returns: blocked start/goal or start==goal
  if (map.blocksMovement(startX, startY) || map.blocksMovement(goalX, goalY)) {
    return { path: [], found: false, nodesExplored: 0 };
  }

  if (startX === goalX && startY === goalY) {
    return { path: [], found: true, nodesExplored: 0 };
  }

  // Open set (nodes to explore) - array as simple priority queue
  const openSet: GreedyNode[] = [];

  // Closed set tracking both keys and full nodes for StepState snapshots
  const closedMap = new Map<string, GreedyNode>();

  // Map from position key to node (used to skip already-seen positions)
  const nodeMap = new Map<string, GreedyNode>();

  // Initialize start node
  const startH = heuristic(startX, startY, goalX, goalY);
  const startNode: GreedyNode = {
    x: startX,
    y: startY,
    h: startH,
    parent: null,
  };

  openSet.push(startNode);
  nodeMap.set(nodeKey(startX, startY), startNode);

  let nodesExplored = 0;

  while (openSet.length > 0 && nodesExplored < maxNodes) {
    // Find node with lowest h score (greedy: only heuristic, no cost)
    openSet.sort((a, b) => a.h - b.h);
    const current = openSet.shift()!;
    const currentKey = nodeKey(current.x, current.y);

    nodesExplored++;

    // Add to closed set
    closedMap.set(currentKey, current);

    // Check if we reached the goal
    if (current.x === goalX && current.y === goalY) {
      const path = reconstructPath(current);
      yield buildStepState(openSet, closedMap, current, goalX, goalY, nodesExplored, true);
      return { path, found: true, nodesExplored };
    }

    // Explore neighbors
    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const neighborKey = nodeKey(nx, ny);

      // Skip if already visited or in nodeMap (no better-path check needed since g=0)
      if (closedMap.has(neighborKey)) continue;
      if (nodeMap.has(neighborKey)) continue;
      if (!map.isInBounds(nx, ny)) continue;
      if (map.blocksMovement(nx, ny)) continue;
      if (isBlocked && isBlocked(nx, ny) && !(nx === goalX && ny === goalY)) {
        continue;
      }

      const h = heuristic(nx, ny, goalX, goalY);

      const neighbor: GreedyNode = {
        x: nx,
        y: ny,
        h,
        parent: current,
      };

      nodeMap.set(neighborKey, neighbor);
      openSet.push(neighbor);
    }

    // Yield after processing this node and its neighbors
    yield buildStepState(openSet, closedMap, current, goalX, goalY, nodesExplored, false);
  }

  // No path found
  return { path: [], found: false, nodesExplored };
}

/**
 * Find a path from start to goal using Greedy Best-First Search.
 *
 * Greedy Best-First explores nodes by heuristic distance to goal only,
 * typically exploring fewer nodes than Dijkstra or A* but not guaranteeing
 * the shortest path.
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
 * const result = findPathGreedy(map, 5, 5, 15, 10);
 * if (result.found) {
 *   console.log('Path:', result.path);
 * }
 * ```
 */
export function findPathGreedy(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {}
): PathResult {
  const gen = findPathGreedyStepped(map, startX, startY, goalX, goalY, options);
  let step = gen.next();
  while (!step.done) {
    step = gen.next();
  }
  return step.value;
}

/**
 * Get the first step direction toward a goal using Greedy Best-First Search.
 *
 * Finds a path (not necessarily optimal) and returns just the first direction
 * to move. Returns null if no path exists.
 *
 * @param map - The game map
 * @param startX - Starting X coordinate
 * @param startY - Starting Y coordinate
 * @param goalX - Goal X coordinate
 * @param goalY - Goal Y coordinate
 * @param options - Pathfinding options
 * @returns Direction to move, or null if no path exists
 */
export function getStepTowardGreedy(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {}
): Direction | null {
  const result = findPathGreedy(map, startX, startY, goalX, goalY, options);

  if (!result.found || result.path.length === 0) {
    return null;
  }

  const firstStep = result.path[0];
  return {
    dx: firstStep.x - startX,
    dy: firstStep.y - startY,
  };
}
