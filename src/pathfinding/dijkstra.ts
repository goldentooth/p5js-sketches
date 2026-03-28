import type { Map as GameMap } from '../map/types.js';
import type { Direction } from '../movement/directions.js';
import { CARDINAL_DIRECTIONS, ALL_DIRECTIONS } from '../movement/directions.js';
import type { PathNode, PathfindingOptions, PathResult, StepState, NodeState } from './types.js';

/**
 * Internal node for Dijkstra's algorithm
 */
interface DijkstraNode {
  x: number;
  y: number;
  g: number; // Cost from start to this node
  parent: DijkstraNode | null;
}

/**
 * Create a unique key for a position
 */
function nodeKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Convert an internal DijkstraNode to the public NodeState interface
 * h is always 0 for Dijkstra, f equals g
 */
function toNodeState(node: DijkstraNode): NodeState {
  return {
    x: node.x,
    y: node.y,
    g: node.g,
    h: 0,
    f: node.g,
    parentX: node.parent ? node.parent.x : node.x,
    parentY: node.parent ? node.parent.y : node.y,
  };
}

/**
 * Build a StepState snapshot from the current algorithm state
 */
function buildStepState(
  openSet: DijkstraNode[],
  closedMap: Map<string, DijkstraNode>,
  current: DijkstraNode,
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
function reconstructPath(goalNode: DijkstraNode): PathNode[] {
  const path: PathNode[] = [];
  let node: DijkstraNode | null = goalNode;
  while (node !== null && node.parent !== null) {
    path.unshift({ x: node.x, y: node.y });
    node = node.parent;
  }
  return path;
}

/**
 * Generator-based Dijkstra's algorithm that yields StepState after each node expansion.
 *
 * Dijkstra is A* with h=0: sorts open set by g cost only (true shortest path).
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
export function* findPathDijkstraStepped(
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

  const directions = allowDiagonal ? ALL_DIRECTIONS : CARDINAL_DIRECTIONS;

  // Immediate returns: blocked start/goal or start==goal
  if (map.blocksMovement(startX, startY) || map.blocksMovement(goalX, goalY)) {
    return { path: [], found: false, nodesExplored: 0 };
  }

  if (startX === goalX && startY === goalY) {
    return { path: [], found: true, nodesExplored: 0 };
  }

  // Open set (nodes to explore) - array as simple priority queue
  const openSet: DijkstraNode[] = [];

  // Closed set tracking both keys and full nodes for StepState snapshots
  const closedMap = new Map<string, DijkstraNode>();

  // Map from position key to best node at that position
  const nodeMap = new Map<string, DijkstraNode>();

  // Initialize start node
  const startNode: DijkstraNode = {
    x: startX,
    y: startY,
    g: 0,
    parent: null,
  };

  openSet.push(startNode);
  nodeMap.set(nodeKey(startX, startY), startNode);

  let nodesExplored = 0;

  while (openSet.length > 0 && nodesExplored < maxNodes) {
    // Find node with lowest g score (no heuristic)
    openSet.sort((a, b) => a.g - b.g);
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

      if (closedMap.has(neighborKey)) continue;
      if (!map.isInBounds(nx, ny)) continue;
      if (map.blocksMovement(nx, ny)) continue;
      if (isBlocked && isBlocked(nx, ny) && !(nx === goalX && ny === goalY)) {
        continue;
      }

      const moveCost = allowDiagonal && dir.dx !== 0 && dir.dy !== 0 ? 1.414 : 1;
      const tentativeG = current.g + moveCost;

      const existing = nodeMap.get(neighborKey);
      if (existing && existing.g <= tentativeG) {
        continue;
      }

      const neighbor: DijkstraNode = {
        x: nx,
        y: ny,
        g: tentativeG,
        parent: current,
      };

      nodeMap.set(neighborKey, neighbor);

      if (!existing) {
        openSet.push(neighbor);
      } else {
        const idx = openSet.findIndex(n => n.x === nx && n.y === ny);
        if (idx >= 0) {
          openSet[idx] = neighbor;
        }
      }
    }

    // Yield after processing this node and its neighbors
    yield buildStepState(openSet, closedMap, current, goalX, goalY, nodesExplored, false);
  }

  // No path found
  return { path: [], found: false, nodesExplored };
}

/**
 * Find a path from start to goal using Dijkstra's algorithm
 *
 * Dijkstra's explores all paths by true cost (no heuristic), guaranteeing
 * the shortest path but exploring more nodes than A*.
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
 * const result = findPathDijkstra(map, 5, 5, 15, 10);
 * if (result.found) {
 *   console.log('Path:', result.path);
 * }
 * ```
 */
export function findPathDijkstra(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {}
): PathResult {
  const gen = findPathDijkstraStepped(map, startX, startY, goalX, goalY, options);
  let step = gen.next();
  while (!step.done) {
    step = gen.next();
  }
  return step.value;
}

/**
 * Get the first step direction toward a goal using Dijkstra's algorithm
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
 */
export function getStepTowardDijkstra(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {}
): Direction | null {
  const result = findPathDijkstra(map, startX, startY, goalX, goalY, options);

  if (!result.found || result.path.length === 0) {
    return null;
  }

  const firstStep = result.path[0];
  return {
    dx: firstStep.x - startX,
    dy: firstStep.y - startY,
  };
}
