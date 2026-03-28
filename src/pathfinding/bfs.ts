import type { Map as GameMap } from '../map/types.js';
import type { Direction } from '../movement/directions.js';
import { CARDINAL_DIRECTIONS, ALL_DIRECTIONS } from '../movement/directions.js';
import type { PathNode, PathfindingOptions, PathResult, StepState, NodeState } from './types.js';

/**
 * Internal node for BFS algorithm
 */
interface BFSNode {
  x: number;
  y: number;
  depth: number; // Hop count from start
  parent: BFSNode | null;
}

/**
 * Create a unique key for a position
 */
function nodeKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Convert an internal BFSNode to the public NodeState interface
 * h is always 0 for BFS, f equals g (depth)
 */
function toNodeState(node: BFSNode): NodeState {
  return {
    x: node.x,
    y: node.y,
    g: node.depth,
    h: 0,
    f: node.depth,
    parentX: node.parent ? node.parent.x : node.x,
    parentY: node.parent ? node.parent.y : node.y,
  };
}

/**
 * Build a StepState snapshot from the current algorithm state
 */
function buildStepState(
  queue: BFSNode[],
  closedMap: Map<string, BFSNode>,
  current: BFSNode,
  goalX: number,
  goalY: number,
  nodesExplored: number,
  found: boolean,
): StepState {
  const openMap = new Map<string, NodeState>();
  for (const node of queue) {
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
function reconstructPath(goalNode: BFSNode): PathNode[] {
  const path: PathNode[] = [];
  let node: BFSNode | null = goalNode;
  while (node !== null && node.parent !== null) {
    path.unshift({ x: node.x, y: node.y });
    node = node.parent;
  }
  return path;
}

/**
 * Generator-based BFS algorithm that yields StepState after each node expansion.
 *
 * BFS uses a FIFO queue (no sorting), guaranteeing fewest hops (not lowest cost).
 * g tracks hop count (depth), h=0, f=g.
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
export function* findPathBFSStepped(
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

  // FIFO queue - no sorting, BFS property maintained by order of insertion
  const queue: BFSNode[] = [];

  // Closed set tracking both keys and full nodes for StepState snapshots
  const closedMap = new Map<string, BFSNode>();

  // Map from position key to node (to avoid revisiting)
  const nodeMap = new Map<string, BFSNode>();

  // Initialize start node
  const startNode: BFSNode = {
    x: startX,
    y: startY,
    depth: 0,
    parent: null,
  };

  queue.push(startNode);
  nodeMap.set(nodeKey(startX, startY), startNode);

  let nodesExplored = 0;

  while (queue.length > 0 && nodesExplored < maxNodes) {
    // FIFO: take from front of queue (NO sorting)
    const current = queue.shift()!;
    const currentKey = nodeKey(current.x, current.y);

    // Skip if already processed
    if (closedMap.has(currentKey)) continue;

    nodesExplored++;

    // Add to closed set
    closedMap.set(currentKey, current);

    // Check if we reached the goal
    if (current.x === goalX && current.y === goalY) {
      const path = reconstructPath(current);
      yield buildStepState(queue, closedMap, current, goalX, goalY, nodesExplored, true);
      return { path, found: true, nodesExplored };
    }

    // Explore neighbors
    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const neighborKey = nodeKey(nx, ny);

      if (closedMap.has(neighborKey)) continue;
      if (nodeMap.has(neighborKey)) continue;
      if (!map.isInBounds(nx, ny)) continue;
      if (map.blocksMovement(nx, ny)) continue;
      if (isBlocked && isBlocked(nx, ny) && !(nx === goalX && ny === goalY)) {
        continue;
      }

      const neighbor: BFSNode = {
        x: nx,
        y: ny,
        depth: current.depth + 1,
        parent: current,
      };

      nodeMap.set(neighborKey, neighbor);
      queue.push(neighbor);
    }

    // Yield after processing this node and its neighbors
    yield buildStepState(queue, closedMap, current, goalX, goalY, nodesExplored, false);
  }

  // No path found
  return { path: [], found: false, nodesExplored };
}

/**
 * Find a path from start to goal using Breadth-First Search
 *
 * BFS explores all nodes at depth N before depth N+1, guaranteeing the
 * fewest hops path (not necessarily lowest movement cost).
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
 * const result = findPathBFS(map, 5, 5, 15, 10);
 * if (result.found) {
 *   console.log('Path:', result.path);
 * }
 * ```
 */
export function findPathBFS(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {}
): PathResult {
  const gen = findPathBFSStepped(map, startX, startY, goalX, goalY, options);
  let step = gen.next();
  while (!step.done) {
    step = gen.next();
  }
  return step.value;
}

/**
 * Get the first step direction toward a goal using BFS
 *
 * Finds the fewest-hops path and returns just the first direction to move.
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
export function getStepTowardBFS(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {}
): Direction | null {
  const result = findPathBFS(map, startX, startY, goalX, goalY, options);

  if (!result.found || result.path.length === 0) {
    return null;
  }

  const firstStep = result.path[0];
  return {
    dx: firstStep.x - startX,
    dy: firstStep.y - startY,
  };
}
