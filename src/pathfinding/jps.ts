import type { Map as GameMap } from '../map/types.js';
import type { Direction } from '../movement/directions.js';
import type { PathNode, PathfindingOptions, PathResult, StepState, NodeState } from './types.js';

/**
 * Internal node for JPS with scoring
 */
interface JPSNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: JPSNode | null;
}

function nodeKey(x: number, y: number): string {
  return `${x},${y}`;
}

function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

function toNodeState(node: JPSNode): NodeState {
  return {
    x: node.x,
    y: node.y,
    g: node.g,
    h: node.h,
    f: node.f,
    parentX: node.parent ? node.parent.x : node.x,
    parentY: node.parent ? node.parent.y : node.y,
  };
}

function buildStepState(
  openSet: JPSNode[],
  closedMap: Map<string, JPSNode>,
  current: JPSNode,
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
 * Check if a position is walkable on the map
 */
function isWalkable(
  map: GameMap,
  x: number,
  y: number,
  isBlocked?: (x: number, y: number) => boolean,
  goalX?: number,
  goalY?: number,
): boolean {
  if (!map.isInBounds(x, y)) return false;
  if (map.blocksMovement(x, y)) return false;
  if (isBlocked && isBlocked(x, y) && !(x === goalX && y === goalY)) return false;
  return true;
}

/**
 * Jump in a straight line (one direction only). Only checks for forced neighbors
 * along the scan direction. Does NOT check perpendicular jumps.
 * Used as the "leaf" scan to avoid mutual recursion.
 */
function jumpStraight(
  map: GameMap,
  x: number,
  y: number,
  dx: number,
  dy: number,
  goalX: number,
  goalY: number,
  isBlocked?: (x: number, y: number) => boolean,
): { x: number; y: number } | null {
  let cx = x + dx;
  let cy = y + dy;

  while (isWalkable(map, cx, cy, isBlocked, goalX, goalY)) {
    if (cx === goalX && cy === goalY) {
      return { x: cx, y: cy };
    }

    // Check for forced neighbors perpendicular to scan direction
    if (dx !== 0) {
      // Horizontal scan: check above/below
      if (
        (!isWalkable(map, cx, cy - 1, isBlocked, goalX, goalY) &&
          isWalkable(map, cx + dx, cy - 1, isBlocked, goalX, goalY)) ||
        (!isWalkable(map, cx, cy + 1, isBlocked, goalX, goalY) &&
          isWalkable(map, cx + dx, cy + 1, isBlocked, goalX, goalY))
      ) {
        return { x: cx, y: cy };
      }
    } else {
      // Vertical scan: check left/right
      if (
        (!isWalkable(map, cx - 1, cy, isBlocked, goalX, goalY) &&
          isWalkable(map, cx - 1, cy + dy, isBlocked, goalX, goalY)) ||
        (!isWalkable(map, cx + 1, cy, isBlocked, goalX, goalY) &&
          isWalkable(map, cx + 1, cy + dy, isBlocked, goalX, goalY))
      ) {
        return { x: cx, y: cy };
      }
    }

    cx += dx;
    cy += dy;
  }

  return null;
}

/**
 * Jump in a cardinal direction from (x, y).
 * At each step, checks for forced neighbors AND perpendicular straight jumps.
 * Perpendicular checks use jumpStraight (no further recursion).
 */
function jump(
  map: GameMap,
  x: number,
  y: number,
  dx: number,
  dy: number,
  goalX: number,
  goalY: number,
  isBlocked?: (x: number, y: number) => boolean,
): { x: number; y: number } | null {
  let cx = x + dx;
  let cy = y + dy;

  while (isWalkable(map, cx, cy, isBlocked, goalX, goalY)) {
    if (cx === goalX && cy === goalY) {
      return { x: cx, y: cy };
    }

    if (dx !== 0 && dy === 0) {
      // Horizontal movement
      // Check horizontal forced neighbors (wall above/below with opening beyond)
      if (
        (!isWalkable(map, cx, cy - 1, isBlocked, goalX, goalY) &&
          isWalkable(map, cx + dx, cy - 1, isBlocked, goalX, goalY)) ||
        (!isWalkable(map, cx, cy + 1, isBlocked, goalX, goalY) &&
          isWalkable(map, cx + dx, cy + 1, isBlocked, goalX, goalY))
      ) {
        return { x: cx, y: cy };
      }

      // Check perpendicular vertical straight jumps
      if (
        jumpStraight(map, cx, cy, 0, -1, goalX, goalY, isBlocked) !== null ||
        jumpStraight(map, cx, cy, 0, 1, goalX, goalY, isBlocked) !== null
      ) {
        return { x: cx, y: cy };
      }
    } else if (dy !== 0 && dx === 0) {
      // Vertical movement
      // Check vertical forced neighbors (wall left/right with opening beyond)
      if (
        (!isWalkable(map, cx - 1, cy, isBlocked, goalX, goalY) &&
          isWalkable(map, cx - 1, cy + dy, isBlocked, goalX, goalY)) ||
        (!isWalkable(map, cx + 1, cy, isBlocked, goalX, goalY) &&
          isWalkable(map, cx + 1, cy + dy, isBlocked, goalX, goalY))
      ) {
        return { x: cx, y: cy };
      }

      // Check perpendicular horizontal straight jumps
      if (
        jumpStraight(map, cx, cy, -1, 0, goalX, goalY, isBlocked) !== null ||
        jumpStraight(map, cx, cy, 1, 0, goalX, goalY, isBlocked) !== null
      ) {
        return { x: cx, y: cy };
      }
    }

    cx += dx;
    cy += dy;
  }

  return null;
}

/**
 * Get the directions to explore from a jump point.
 * For the start node (no parent), explore all 4 cardinal directions.
 * For other nodes, prune based on the direction we came from.
 */
function getPrunedDirections(
  map: GameMap,
  node: JPSNode,
  isBlocked?: (x: number, y: number) => boolean,
  goalX?: number,
  goalY?: number,
): Array<{ dx: number; dy: number }> {
  if (node.parent === null) {
    // Start node: try all cardinal directions
    return [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
  }

  const dirs: Array<{ dx: number; dy: number }> = [];
  const dx = clamp(node.x - node.parent.x);
  const dy = clamp(node.y - node.parent.y);

  if (dx !== 0 && dy === 0) {
    // Came from horizontal movement
    // Natural: continue in same direction
    dirs.push({ dx, dy: 0 });
    // Also try perpendicular (vertical) always
    dirs.push({ dx: 0, dy: -1 });
    dirs.push({ dx: 0, dy: 1 });
    // Forced neighbors: if wall beside us, also try diagonal-ish directions
    // (but since we only do cardinal, the perpendicular directions already cover it)
  } else if (dy !== 0 && dx === 0) {
    // Came from vertical movement
    // Natural: continue in same direction
    dirs.push({ dx: 0, dy });
    // Also try perpendicular (horizontal) always - symmetric with horizontal case
    dirs.push({ dx: -1, dy: 0 });
    dirs.push({ dx: 1, dy: 0 });
  }

  return dirs;
}

/**
 * Clamp a value to -1, 0, or 1 (sign function)
 */
function clamp(v: number): number {
  if (v > 0) return 1;
  if (v < 0) return -1;
  return 0;
}

/**
 * Reconstruct the path from goal back to start, filling in intermediate
 * cardinal steps between consecutive jump points.
 */
function reconstructPath(goalNode: JPSNode): PathNode[] {
  // Collect jump points from goal to start
  const jumpPoints: Array<{ x: number; y: number }> = [];
  let node: JPSNode | null = goalNode;
  while (node !== null && node.parent !== null) {
    jumpPoints.unshift({ x: node.x, y: node.y });
    node = node.parent;
  }

  if (jumpPoints.length === 0) return [];

  // Now fill in intermediate steps between consecutive jump points
  // (and from start to first jump point)
  const path: PathNode[] = [];
  let prevX = goalNode.parent !== null ? getStart(goalNode).x : jumpPoints[0].x;
  let prevY = goalNode.parent !== null ? getStart(goalNode).y : jumpPoints[0].y;

  for (const jp of jumpPoints) {
    // Walk from prev to jp using cardinal steps
    const steps = fillCardinalSteps(prevX, prevY, jp.x, jp.y);
    path.push(...steps);
    prevX = jp.x;
    prevY = jp.y;
  }

  return path;
}

/**
 * Get the start node by walking up the parent chain
 */
function getStart(node: JPSNode): { x: number; y: number } {
  let current: JPSNode = node;
  while (current.parent !== null) {
    current = current.parent;
  }
  return { x: current.x, y: current.y };
}

/**
 * Fill in cardinal steps between two points.
 * Since JPS jump points are connected by straight cardinal lines
 * (possibly with an L-turn), we move horizontally first, then vertically.
 */
function fillCardinalSteps(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): PathNode[] {
  const steps: PathNode[] = [];
  let cx = fromX;
  let cy = fromY;

  // Move horizontally first
  while (cx !== toX) {
    cx += cx < toX ? 1 : -1;
    steps.push({ x: cx, y: cy });
  }

  // Then move vertically
  while (cy !== toY) {
    cy += cy < toY ? 1 : -1;
    steps.push({ x: cx, y: cy });
  }

  return steps;
}

/**
 * Generator-based Jump Point Search that yields StepState after expanding each jump point.
 *
 * JPS is a cardinal-only A* optimization for uniform-cost grids. It skips
 * symmetric paths by "jumping" along cardinal directions and only adding
 * jump points (where the path could meaningfully change direction) to the open set.
 *
 * @param map - The game map to pathfind on
 * @param startX - Starting X coordinate
 * @param startY - Starting Y coordinate
 * @param goalX - Goal X coordinate
 * @param goalY - Goal Y coordinate
 * @param options - Pathfinding options (allowDiagonal is ignored; JPS uses cardinal only)
 * @returns Generator yielding StepState, returning PathResult
 */
export function* findPathJPSStepped(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {},
): Generator<StepState, PathResult> {
  const { maxNodes = 1000, isBlocked } = options;

  // Immediate returns
  if (map.blocksMovement(startX, startY) || map.blocksMovement(goalX, goalY)) {
    return { path: [], found: false, nodesExplored: 0 };
  }

  if (startX === goalX && startY === goalY) {
    return { path: [], found: true, nodesExplored: 0 };
  }

  const openSet: JPSNode[] = [];
  const closedMap = new Map<string, JPSNode>();
  const nodeMap = new Map<string, JPSNode>();

  const startH = manhattanDistance(startX, startY, goalX, goalY);
  const startNode: JPSNode = {
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
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const currentKey = nodeKey(current.x, current.y);

    if (closedMap.has(currentKey)) continue;

    nodesExplored++;
    closedMap.set(currentKey, current);

    // Check if we reached the goal
    if (current.x === goalX && current.y === goalY) {
      const path = reconstructPath(current);
      yield buildStepState(openSet, closedMap, current, goalX, goalY, nodesExplored, true);
      return { path, found: true, nodesExplored };
    }

    // Get pruned directions for this jump point
    const directions = getPrunedDirections(map, current, isBlocked, goalX, goalY);

    for (const dir of directions) {
      const jumpPoint = jump(map, current.x, current.y, dir.dx, dir.dy, goalX, goalY, isBlocked);

      if (jumpPoint === null) continue;

      const jpKey = nodeKey(jumpPoint.x, jumpPoint.y);
      if (closedMap.has(jpKey)) continue;

      const dist = manhattanDistance(current.x, current.y, jumpPoint.x, jumpPoint.y);
      const tentativeG = current.g + dist;
      const h = manhattanDistance(jumpPoint.x, jumpPoint.y, goalX, goalY);
      const f = tentativeG + h;

      const existing = nodeMap.get(jpKey);
      if (existing && existing.g <= tentativeG) continue;

      const jpNode: JPSNode = {
        x: jumpPoint.x,
        y: jumpPoint.y,
        g: tentativeG,
        h,
        f,
        parent: current,
      };

      nodeMap.set(jpKey, jpNode);

      if (!existing) {
        openSet.push(jpNode);
      } else {
        const idx = openSet.findIndex(n => n.x === jumpPoint.x && n.y === jumpPoint.y);
        if (idx >= 0) {
          openSet[idx] = jpNode;
        }
      }
    }

    yield buildStepState(openSet, closedMap, current, goalX, goalY, nodesExplored, false);
  }

  return { path: [], found: false, nodesExplored };
}

/**
 * Find a path using Jump Point Search
 */
export function findPathJPS(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {},
): PathResult {
  const gen = findPathJPSStepped(map, startX, startY, goalX, goalY, options);
  let step = gen.next();
  while (!step.done) {
    step = gen.next();
  }
  return step.value;
}

/**
 * Get the first step direction toward a goal using JPS
 */
export function getStepTowardJPS(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {},
): Direction | null {
  const result = findPathJPS(map, startX, startY, goalX, goalY, options);

  if (!result.found || result.path.length === 0) {
    return null;
  }

  const firstStep = result.path[0];
  return {
    dx: firstStep.x - startX,
    dy: firstStep.y - startY,
  };
}
