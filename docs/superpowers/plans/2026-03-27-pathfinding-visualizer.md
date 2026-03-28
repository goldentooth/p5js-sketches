# Pathfinding Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand nuglib's pathfinding module to five algorithms with a generator-based stepper API, then build a p5.js sketch that visualizes them step-by-step on hand-crafted maps.

**Architecture:** Each algorithm lives in its own file under `src/pathfinding/`, sharing `PathResult`, `PathfindingOptions`, `StepState`, and `NodeState` interfaces. A generator-based `findPathStepped()` is the core implementation; `findPath()` wraps it. The sketch at `content/pathfinding-visualizer/` calls `.next()` on the generator each tick and renders the yielded state with color-tinted roguelike glyphs and a canvas-drawn tooltip.

**Tech Stack:** TypeScript (nuglib), JavaScript (sketch), p5.js, Vitest, Hugo

**Spec:** `docs/superpowers/specs/2026-03-27-pathfinding-visualizer-design.md`

---

## File Structure

### Nuglib changes (`src/pathfinding/`)

| File | Action | Responsibility |
|---|---|---|
| `src/pathfinding/types.ts` | Create | Shared interfaces: `StepState`, `NodeState`, `PathNode`, `PathResult`, `PathfindingOptions` |
| `src/pathfinding/astar.ts` | Modify | Refactor to generator-based core, add `findPathStepped()` |
| `src/pathfinding/dijkstra.ts` | Create | Dijkstra's algorithm (A* without heuristic) |
| `src/pathfinding/greedyBestFirst.ts` | Create | Greedy best-first search (heuristic only) |
| `src/pathfinding/bfs.ts` | Create | Breadth-first search (FIFO, unweighted) |
| `src/pathfinding/jps.ts` | Create | Jump point search (A* optimization for uniform grids) |
| `src/pathfinding/index.ts` | Modify | Re-export all algorithms and types |

### Tests (`tests/`)

| File | Action | Responsibility |
|---|---|---|
| `tests/pathfinding.test.js` | Modify | Add tests for stepper API, new algorithms |

### Sketch (`content/pathfinding-visualizer/`)

| File | Action | Responsibility |
|---|---|---|
| `content/pathfinding-visualizer/index.md` | Create | Hugo frontmatter: title, description, controls, technical_details |
| `content/pathfinding-visualizer/maps.js` | Create | 5 hand-crafted example maps as 2D arrays |
| `content/pathfinding-visualizer/main.js` | Create | p5.js sketch: rendering, tooltip, playback, control wiring |

---

## Task 1: Extract shared types to `types.ts`

**Files:**
- Create: `src/pathfinding/types.ts`
- Modify: `src/pathfinding/astar.ts`
- Modify: `src/pathfinding/index.ts`

- [ ] **Step 1: Create `src/pathfinding/types.ts`**

```ts
import type { Map as GameMap } from '../map/types.js';

/**
 * A node in the pathfinding graph
 */
export interface PathNode {
  x: number;
  y: number;
}

/**
 * Options for pathfinding
 */
export interface PathfindingOptions {
  /** Maximum nodes to explore before giving up (default: 1000) */
  maxNodes?: number;
  /** Whether to allow diagonal movement (default: false) */
  allowDiagonal?: boolean;
  /** Additional blocking check (e.g., for entities) */
  isBlocked?: (x: number, y: number) => boolean;
}

/**
 * Result of a pathfinding operation
 */
export interface PathResult {
  /** Path from start to goal (excluding start, including goal) */
  path: PathNode[];
  /** Whether a path was found */
  found: boolean;
  /** Number of nodes explored */
  nodesExplored: number;
}

/**
 * State of a single node during pathfinding
 */
export interface NodeState {
  x: number;
  y: number;
  /** Cost from start (hop count for BFS) */
  g: number;
  /** Heuristic estimate to goal (0 for Dijkstra/BFS) */
  h: number;
  /** Total score: g + h */
  f: number;
  /** Parent node X for reconstructing path / drawing arrows */
  parentX: number;
  /** Parent node Y */
  parentY: number;
}

/**
 * State yielded by a stepped pathfinding generator after each node expansion
 */
export interface StepState {
  /** Frontier nodes not yet expanded */
  openSet: ReadonlyMap<string, NodeState>;
  /** Already-expanded nodes */
  closedSet: ReadonlyMap<string, NodeState>;
  /** The node just expanded this step */
  current: PathNode;
  /** The goal position */
  goal: PathNode;
  /** Whether the goal has been found */
  found: boolean;
  /** Total nodes explored so far */
  nodesExplored: number;
}

/**
 * Common pathfinding function signature
 */
export type FindPathFn = (
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options?: PathfindingOptions,
) => PathResult;

/**
 * Common stepped pathfinding function signature
 */
export type FindPathSteppedFn = (
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options?: PathfindingOptions,
) => Generator<StepState, PathResult>;
```

- [ ] **Step 2: Update `astar.ts` to import types from `types.ts`**

Remove the `PathNode`, `PathfindingOptions`, and `PathResult` interface definitions from `astar.ts`. Replace with imports:

```ts
import type { PathNode, PathfindingOptions, PathResult } from './types.js';
```

Keep the `AStarNode` interface, the heuristic functions, `nodeKey`, `findPath`, `getStepToward`, `distance`, and `isAdjacent` all in `astar.ts` — they don't move yet.

- [ ] **Step 3: Update `index.ts` to export types**

Replace the contents of `src/pathfinding/index.ts` with:

```ts
/**
 * Pathfinding module
 *
 * Provides multiple pathfinding algorithms and a generator-based stepper API
 * for step-by-step visualization.
 *
 * @module pathfinding
 */

export * from './types.js';
export * from './astar.js';
```

- [ ] **Step 4: Run typecheck and tests**

Run: `npm run typecheck && npm test`
Expected: All pass — this is a pure refactor with no behavior change.

- [ ] **Step 5: Commit**

```bash
git add src/pathfinding/types.ts src/pathfinding/astar.ts src/pathfinding/index.ts
git commit -m "Extract shared pathfinding types to types.ts"
```

---

## Task 2: Add generator-based stepper to A*

**Files:**
- Modify: `src/pathfinding/astar.ts`
- Test: `tests/pathfinding.test.js`

- [ ] **Step 1: Write failing tests for `findPathStepped`**

Add to `tests/pathfinding.test.js`, inside the top-level `describe('Pathfinding')` block:

```js
import { createMap, findPath, findPathStepped, getStepToward, distance, isAdjacent, Tiles } from '../src';

// ... existing tests ...

describe('findPathStepped', () => {
  let map;

  beforeEach(() => {
    map = createMap(10, 10, { edgeBehavior: 'block' });
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        map.setTile(x, y, Tiles.Floor);
      }
    }
  });

  it('should yield StepState on each expansion', () => {
    const gen = findPathStepped(map, 0, 0, 3, 0);
    const first = gen.next();

    expect(first.done).toBe(false);
    const state = first.value;
    expect(state.current).toEqual({ x: 0, y: 0 });
    expect(state.nodesExplored).toBe(1);
    expect(state.closedSet.size).toBe(1);
    expect(state.openSet.size).toBeGreaterThan(0);
    expect(state.found).toBe(false);
  });

  it('should return PathResult when generator completes', () => {
    const gen = findPathStepped(map, 0, 0, 3, 0);
    let result;
    while (true) {
      const step = gen.next();
      if (step.done) {
        result = step.value;
        break;
      }
    }

    expect(result.found).toBe(true);
    expect(result.path.length).toBe(3);
    expect(result.path[0]).toEqual({ x: 1, y: 0 });
    expect(result.path[2]).toEqual({ x: 3, y: 0 });
  });

  it('should produce same result as findPath', () => {
    const directResult = findPath(map, 0, 0, 5, 5);

    const gen = findPathStepped(map, 0, 0, 5, 5);
    let steppedResult;
    while (true) {
      const step = gen.next();
      if (step.done) {
        steppedResult = step.value;
        break;
      }
    }

    expect(steppedResult.found).toBe(directResult.found);
    expect(steppedResult.path).toEqual(directResult.path);
    expect(steppedResult.nodesExplored).toBe(directResult.nodesExplored);
  });

  it('should include NodeState with g, h, f, parent in closedSet', () => {
    const gen = findPathStepped(map, 0, 0, 5, 0);
    // Step a few times to build up closed set
    gen.next();
    gen.next();
    const { value: state } = gen.next();

    for (const [, node] of state.closedSet) {
      expect(node).toHaveProperty('g');
      expect(node).toHaveProperty('h');
      expect(node).toHaveProperty('f');
      expect(node).toHaveProperty('parentX');
      expect(node).toHaveProperty('parentY');
      expect(node.f).toBe(node.g + node.h);
    }
  });

  it('should return not-found result when no path exists', () => {
    for (let y = 0; y < 10; y++) {
      map.setTile(5, y, Tiles.Wall);
    }

    const gen = findPathStepped(map, 0, 0, 9, 0);
    let result;
    while (true) {
      const step = gen.next();
      if (step.done) {
        result = step.value;
        break;
      }
    }

    expect(result.found).toBe(false);
    expect(result.path.length).toBe(0);
  });
});
```

Also update the import at the top of the file to include `findPathStepped`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: New `findPathStepped` tests fail with import error (function doesn't exist yet).

- [ ] **Step 3: Implement `findPathStepped` in `astar.ts`**

Add the generator function to `astar.ts`. The core A* loop moves into the generator; `findPath` becomes a thin wrapper.

```ts
import type { PathNode, PathfindingOptions, PathResult, StepState, NodeState } from './types.js';
import type { Direction } from '../movement/directions.js';
import { CARDINAL_DIRECTIONS, ALL_DIRECTIONS } from '../movement/directions.js';

/**
 * Internal node for A* with scoring
 */
interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

function nodeKey(x: number, y: number): string {
  return `${x},${y}`;
}

function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

function chebyshevDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

/**
 * Convert internal AStarNode to a NodeState for external consumption
 */
function toNodeState(node: AStarNode): NodeState {
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

/**
 * Build a StepState snapshot from the current algorithm state
 */
function buildStepState(
  current: AStarNode,
  openSet: AStarNode[],
  closedSet: Set<string>,
  nodeMap: Map<string, AStarNode>,
  goalX: number,
  goalY: number,
  nodesExplored: number,
  found: boolean,
): StepState {
  const openMap = new Map<string, NodeState>();
  for (const node of openSet) {
    openMap.set(nodeKey(node.x, node.y), toNodeState(node));
  }

  const closedMap = new Map<string, NodeState>();
  for (const key of closedSet) {
    const node = nodeMap.get(key);
    if (node) {
      closedMap.set(key, toNodeState(node));
    }
  }

  return {
    openSet: openMap,
    closedSet: closedMap,
    current: { x: current.x, y: current.y },
    goal: { x: goalX, y: goalY },
    found,
    nodesExplored,
  };
}

/**
 * Reconstruct the path from goal back to start via parent pointers
 */
function reconstructPath(goalNode: AStarNode): PathNode[] {
  const path: PathNode[] = [];
  let node: AStarNode | null = goalNode;
  while (node !== null && node.parent !== null) {
    path.unshift({ x: node.x, y: node.y });
    node = node.parent;
  }
  return path;
}

/**
 * Step-by-step A* pathfinding generator.
 *
 * Yields a StepState after each node expansion. Returns the final PathResult
 * when complete (path found or search exhausted).
 */
export function* findPathStepped(
  map: import('../map/types.js').Map,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {},
): Generator<StepState, PathResult> {
  const { maxNodes = 1000, allowDiagonal = false, isBlocked } = options;
  const heuristic = allowDiagonal ? chebyshevDistance : manhattanDistance;
  const directions = allowDiagonal ? ALL_DIRECTIONS : CARDINAL_DIRECTIONS;

  if (map.blocksMovement(startX, startY) || map.blocksMovement(goalX, goalY)) {
    return { path: [], found: false, nodesExplored: 0 };
  }

  if (startX === goalX && startY === goalY) {
    return { path: [], found: true, nodesExplored: 0 };
  }

  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();
  const nodeMap = new Map<string, AStarNode>();

  const startH = heuristic(startX, startY, goalX, goalY);
  const startNode: AStarNode = { x: startX, y: startY, g: 0, h: startH, f: startH, parent: null };
  openSet.push(startNode);
  nodeMap.set(nodeKey(startX, startY), startNode);

  let nodesExplored = 0;

  while (openSet.length > 0 && nodesExplored < maxNodes) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const currentKey = nodeKey(current.x, current.y);

    nodesExplored++;
    closedSet.add(currentKey);

    if (current.x === goalX && current.y === goalY) {
      yield buildStepState(current, openSet, closedSet, nodeMap, goalX, goalY, nodesExplored, true);
      return { path: reconstructPath(current), found: true, nodesExplored };
    }

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const neighborKey = nodeKey(nx, ny);

      if (closedSet.has(neighborKey)) continue;
      if (!map.isInBounds(nx, ny)) continue;
      if (map.blocksMovement(nx, ny)) continue;
      if (isBlocked && isBlocked(nx, ny) && !(nx === goalX && ny === goalY)) continue;

      const moveCost = allowDiagonal && dir.dx !== 0 && dir.dy !== 0 ? 1.414 : 1;
      const tentativeG = current.g + moveCost;
      const h = heuristic(nx, ny, goalX, goalY);
      const f = tentativeG + h;

      const existing = nodeMap.get(neighborKey);
      if (existing && existing.g <= tentativeG) continue;

      const neighbor: AStarNode = { x: nx, y: ny, g: tentativeG, h, f, parent: current };
      nodeMap.set(neighborKey, neighbor);

      if (!existing) {
        openSet.push(neighbor);
      } else {
        const idx = openSet.findIndex(n => n.x === nx && n.y === ny);
        if (idx >= 0) openSet[idx] = neighbor;
      }
    }

    yield buildStepState(current, openSet, closedSet, nodeMap, goalX, goalY, nodesExplored, false);
  }

  return { path: [], found: false, nodesExplored };
}

/**
 * Find a path from start to goal using A* algorithm.
 * Runs the stepped generator to completion.
 */
export function findPath(
  map: import('../map/types.js').Map,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {},
): PathResult {
  const gen = findPathStepped(map, startX, startY, goalX, goalY, options);
  let step = gen.next();
  while (!step.done) {
    step = gen.next();
  }
  return step.value;
}

/**
 * Get the first step direction toward a goal
 */
export function getStepToward(
  map: import('../map/types.js').Map,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  options: PathfindingOptions = {},
): Direction | null {
  const result = findPath(map, startX, startY, goalX, goalY, options);
  if (!result.found || result.path.length === 0) return null;
  const firstStep = result.path[0];
  return { dx: firstStep.x - startX, dy: firstStep.y - startY };
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

export function isAdjacent(x1: number, y1: number, x2: number, y2: number): boolean {
  return distance(x1, y1, x2, y2) === 1;
}
```

- [ ] **Step 4: Run typecheck and tests**

Run: `npm run typecheck && npm test`
Expected: All tests pass — both existing `findPath` tests and new `findPathStepped` tests.

- [ ] **Step 5: Commit**

```bash
git add src/pathfinding/astar.ts tests/pathfinding.test.js
git commit -m "Add generator-based stepper API to A* pathfinding"
```

---

## Task 3: Implement Dijkstra's algorithm

**Files:**
- Create: `src/pathfinding/dijkstra.ts`
- Modify: `src/pathfinding/index.ts`
- Test: `tests/pathfinding.test.js`

- [ ] **Step 1: Write failing tests for Dijkstra**

Add to `tests/pathfinding.test.js`. Update the import:

```js
import {
  createMap, findPath, findPathStepped, getStepToward, distance, isAdjacent, Tiles,
  findPathDijkstra, findPathDijkstraStepped,
} from '../src';
```

Add a new `describe` block inside the top-level `describe('Pathfinding')`:

```js
describe('Dijkstra', () => {
  let map;

  beforeEach(() => {
    map = createMap(10, 10, { edgeBehavior: 'block' });
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        map.setTile(x, y, Tiles.Floor);
      }
    }
  });

  it('should find optimal path on open map', () => {
    const result = findPathDijkstra(map, 0, 0, 5, 0);
    expect(result.found).toBe(true);
    expect(result.path.length).toBe(5);
  });

  it('should explore more nodes than A* (no heuristic)', () => {
    const dijkstraResult = findPathDijkstra(map, 0, 0, 9, 0);
    const astarResult = findPath(map, 0, 0, 9, 0);
    expect(dijkstraResult.found).toBe(true);
    expect(dijkstraResult.path.length).toBe(astarResult.path.length);
    expect(dijkstraResult.nodesExplored).toBeGreaterThanOrEqual(astarResult.nodesExplored);
  });

  it('should find path around obstacles', () => {
    map.setTile(2, 0, Tiles.Wall);
    map.setTile(2, 1, Tiles.Wall);
    map.setTile(2, 2, Tiles.Wall);

    const result = findPathDijkstra(map, 0, 0, 4, 0);
    expect(result.found).toBe(true);
    expect(result.path.length).toBeGreaterThan(4);
  });

  it('should return no path when completely blocked', () => {
    for (let y = 0; y < 10; y++) {
      map.setTile(5, y, Tiles.Wall);
    }
    const result = findPathDijkstra(map, 0, 0, 9, 0);
    expect(result.found).toBe(false);
  });

  it('stepper should have h=0 for all nodes', () => {
    const gen = findPathDijkstraStepped(map, 0, 0, 5, 0);
    gen.next();
    const { value: state } = gen.next();

    for (const [, node] of state.closedSet) {
      expect(node.h).toBe(0);
      expect(node.f).toBe(node.g);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: Fails — `findPathDijkstra` and `findPathDijkstraStepped` don't exist yet.

- [ ] **Step 3: Create `src/pathfinding/dijkstra.ts`**

Dijkstra is A* with h=0 for every node:

```ts
import type { Map as GameMap } from '../map/types.js';
import type { Direction } from '../movement/directions.js';
import type { PathfindingOptions, PathResult, StepState, NodeState, PathNode } from './types.js';
import { CARDINAL_DIRECTIONS, ALL_DIRECTIONS } from '../movement/directions.js';

interface DijkstraNode {
  x: number;
  y: number;
  g: number;
  parent: DijkstraNode | null;
}

function nodeKey(x: number, y: number): string {
  return `${x},${y}`;
}

function toNodeState(node: DijkstraNode): NodeState {
  return {
    x: node.x, y: node.y,
    g: node.g, h: 0, f: node.g,
    parentX: node.parent ? node.parent.x : node.x,
    parentY: node.parent ? node.parent.y : node.y,
  };
}

function buildStepState(
  current: DijkstraNode, openSet: DijkstraNode[], closedSet: Set<string>,
  nodeMap: Map<string, DijkstraNode>, goalX: number, goalY: number,
  nodesExplored: number, found: boolean,
): StepState {
  const openMap = new Map<string, NodeState>();
  for (const node of openSet) openMap.set(nodeKey(node.x, node.y), toNodeState(node));
  const closedMap = new Map<string, NodeState>();
  for (const key of closedSet) {
    const node = nodeMap.get(key);
    if (node) closedMap.set(key, toNodeState(node));
  }
  return { openSet: openMap, closedSet: closedMap, current: { x: current.x, y: current.y },
    goal: { x: goalX, y: goalY }, found, nodesExplored };
}

function reconstructPath(goalNode: DijkstraNode): PathNode[] {
  const path: PathNode[] = [];
  let node: DijkstraNode | null = goalNode;
  while (node !== null && node.parent !== null) {
    path.unshift({ x: node.x, y: node.y });
    node = node.parent;
  }
  return path;
}

export function* findPathDijkstraStepped(
  map: GameMap, startX: number, startY: number, goalX: number, goalY: number,
  options: PathfindingOptions = {},
): Generator<StepState, PathResult> {
  const { maxNodes = 1000, allowDiagonal = false, isBlocked } = options;
  const directions = allowDiagonal ? ALL_DIRECTIONS : CARDINAL_DIRECTIONS;

  if (map.blocksMovement(startX, startY) || map.blocksMovement(goalX, goalY)) {
    return { path: [], found: false, nodesExplored: 0 };
  }
  if (startX === goalX && startY === goalY) {
    return { path: [], found: true, nodesExplored: 0 };
  }

  const openSet: DijkstraNode[] = [];
  const closedSet = new Set<string>();
  const nodeMap = new Map<string, DijkstraNode>();

  const startNode: DijkstraNode = { x: startX, y: startY, g: 0, parent: null };
  openSet.push(startNode);
  nodeMap.set(nodeKey(startX, startY), startNode);

  let nodesExplored = 0;

  while (openSet.length > 0 && nodesExplored < maxNodes) {
    openSet.sort((a, b) => a.g - b.g);
    const current = openSet.shift()!;
    const currentKey = nodeKey(current.x, current.y);

    nodesExplored++;
    closedSet.add(currentKey);

    if (current.x === goalX && current.y === goalY) {
      yield buildStepState(current, openSet, closedSet, nodeMap, goalX, goalY, nodesExplored, true);
      return { path: reconstructPath(current), found: true, nodesExplored };
    }

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const neighborKey = nodeKey(nx, ny);

      if (closedSet.has(neighborKey)) continue;
      if (!map.isInBounds(nx, ny)) continue;
      if (map.blocksMovement(nx, ny)) continue;
      if (isBlocked && isBlocked(nx, ny) && !(nx === goalX && ny === goalY)) continue;

      const moveCost = allowDiagonal && dir.dx !== 0 && dir.dy !== 0 ? 1.414 : 1;
      const tentativeG = current.g + moveCost;

      const existing = nodeMap.get(neighborKey);
      if (existing && existing.g <= tentativeG) continue;

      const neighbor: DijkstraNode = { x: nx, y: ny, g: tentativeG, parent: current };
      nodeMap.set(neighborKey, neighbor);

      if (!existing) {
        openSet.push(neighbor);
      } else {
        const idx = openSet.findIndex(n => n.x === nx && n.y === ny);
        if (idx >= 0) openSet[idx] = neighbor;
      }
    }

    yield buildStepState(current, openSet, closedSet, nodeMap, goalX, goalY, nodesExplored, false);
  }

  return { path: [], found: false, nodesExplored };
}

export function findPathDijkstra(
  map: GameMap, startX: number, startY: number, goalX: number, goalY: number,
  options: PathfindingOptions = {},
): PathResult {
  const gen = findPathDijkstraStepped(map, startX, startY, goalX, goalY, options);
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value;
}

export function getStepTowardDijkstra(
  map: GameMap, startX: number, startY: number, goalX: number, goalY: number,
  options: PathfindingOptions = {},
): Direction | null {
  const result = findPathDijkstra(map, startX, startY, goalX, goalY, options);
  if (!result.found || result.path.length === 0) return null;
  const firstStep = result.path[0];
  return { dx: firstStep.x - startX, dy: firstStep.y - startY };
}
```

- [ ] **Step 4: Add export to `src/pathfinding/index.ts`**

Add this line:

```ts
export * from './dijkstra.js';
```

- [ ] **Step 5: Run typecheck and tests**

Run: `npm run typecheck && npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pathfinding/dijkstra.ts src/pathfinding/index.ts tests/pathfinding.test.js
git commit -m "Add Dijkstra pathfinding algorithm with stepper API"
```

---

## Task 4: Implement Greedy Best-First Search

**Files:**
- Create: `src/pathfinding/greedyBestFirst.ts`
- Modify: `src/pathfinding/index.ts`
- Test: `tests/pathfinding.test.js`

- [ ] **Step 1: Write failing tests for Greedy Best-First**

Update the import in `tests/pathfinding.test.js`:

```js
import {
  createMap, findPath, findPathStepped, getStepToward, distance, isAdjacent, Tiles,
  findPathDijkstra, findPathDijkstraStepped,
  findPathGreedy, findPathGreedyStepped,
} from '../src';
```

Add a new `describe` block:

```js
describe('Greedy Best-First', () => {
  let map;

  beforeEach(() => {
    map = createMap(10, 10, { edgeBehavior: 'block' });
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        map.setTile(x, y, Tiles.Floor);
      }
    }
  });

  it('should find a path on open map', () => {
    const result = findPathGreedy(map, 0, 0, 5, 0);
    expect(result.found).toBe(true);
    expect(result.path[result.path.length - 1]).toEqual({ x: 5, y: 0 });
  });

  it('should find path around obstacles (may not be optimal)', () => {
    map.setTile(2, 0, Tiles.Wall);
    map.setTile(2, 1, Tiles.Wall);
    map.setTile(2, 2, Tiles.Wall);

    const result = findPathGreedy(map, 0, 0, 4, 0);
    expect(result.found).toBe(true);
  });

  it('should return no path when completely blocked', () => {
    for (let y = 0; y < 10; y++) {
      map.setTile(5, y, Tiles.Wall);
    }
    const result = findPathGreedy(map, 0, 0, 9, 0);
    expect(result.found).toBe(false);
  });

  it('stepper should have g=0 for all nodes (no cost tracking)', () => {
    const gen = findPathGreedyStepped(map, 0, 0, 5, 0);
    gen.next();
    const { value: state } = gen.next();

    for (const [, node] of state.closedSet) {
      expect(node.g).toBe(0);
      expect(node.f).toBe(node.h);
    }
  });

  it('should typically explore fewer nodes than Dijkstra on open map', () => {
    const greedyResult = findPathGreedy(map, 0, 0, 9, 0);
    const dijkstraResult = findPathDijkstra(map, 0, 0, 9, 0);
    expect(greedyResult.found).toBe(true);
    expect(greedyResult.nodesExplored).toBeLessThanOrEqual(dijkstraResult.nodesExplored);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: Fails — `findPathGreedy` and `findPathGreedyStepped` don't exist.

- [ ] **Step 3: Create `src/pathfinding/greedyBestFirst.ts`**

Greedy Best-First uses only the heuristic (h) — g is always 0, f = h:

```ts
import type { Map as GameMap } from '../map/types.js';
import type { Direction } from '../movement/directions.js';
import type { PathfindingOptions, PathResult, StepState, NodeState, PathNode } from './types.js';
import { CARDINAL_DIRECTIONS, ALL_DIRECTIONS } from '../movement/directions.js';

interface GreedyNode {
  x: number;
  y: number;
  h: number;
  parent: GreedyNode | null;
}

function nodeKey(x: number, y: number): string {
  return `${x},${y}`;
}

function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

function chebyshevDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

function toNodeState(node: GreedyNode): NodeState {
  return {
    x: node.x, y: node.y,
    g: 0, h: node.h, f: node.h,
    parentX: node.parent ? node.parent.x : node.x,
    parentY: node.parent ? node.parent.y : node.y,
  };
}

function buildStepState(
  current: GreedyNode, openSet: GreedyNode[], closedSet: Set<string>,
  nodeMap: Map<string, GreedyNode>, goalX: number, goalY: number,
  nodesExplored: number, found: boolean,
): StepState {
  const openMap = new Map<string, NodeState>();
  for (const node of openSet) openMap.set(nodeKey(node.x, node.y), toNodeState(node));
  const closedMap = new Map<string, NodeState>();
  for (const key of closedSet) {
    const node = nodeMap.get(key);
    if (node) closedMap.set(key, toNodeState(node));
  }
  return { openSet: openMap, closedSet: closedMap, current: { x: current.x, y: current.y },
    goal: { x: goalX, y: goalY }, found, nodesExplored };
}

function reconstructPath(goalNode: GreedyNode): PathNode[] {
  const path: PathNode[] = [];
  let node: GreedyNode | null = goalNode;
  while (node !== null && node.parent !== null) {
    path.unshift({ x: node.x, y: node.y });
    node = node.parent;
  }
  return path;
}

export function* findPathGreedyStepped(
  map: GameMap, startX: number, startY: number, goalX: number, goalY: number,
  options: PathfindingOptions = {},
): Generator<StepState, PathResult> {
  const { maxNodes = 1000, allowDiagonal = false, isBlocked } = options;
  const heuristic = allowDiagonal ? chebyshevDistance : manhattanDistance;
  const directions = allowDiagonal ? ALL_DIRECTIONS : CARDINAL_DIRECTIONS;

  if (map.blocksMovement(startX, startY) || map.blocksMovement(goalX, goalY)) {
    return { path: [], found: false, nodesExplored: 0 };
  }
  if (startX === goalX && startY === goalY) {
    return { path: [], found: true, nodesExplored: 0 };
  }

  const openSet: GreedyNode[] = [];
  const closedSet = new Set<string>();
  const nodeMap = new Map<string, GreedyNode>();

  const startNode: GreedyNode = { x: startX, y: startY, h: heuristic(startX, startY, goalX, goalY), parent: null };
  openSet.push(startNode);
  nodeMap.set(nodeKey(startX, startY), startNode);

  let nodesExplored = 0;

  while (openSet.length > 0 && nodesExplored < maxNodes) {
    openSet.sort((a, b) => a.h - b.h);
    const current = openSet.shift()!;
    const currentKey = nodeKey(current.x, current.y);

    nodesExplored++;
    closedSet.add(currentKey);

    if (current.x === goalX && current.y === goalY) {
      yield buildStepState(current, openSet, closedSet, nodeMap, goalX, goalY, nodesExplored, true);
      return { path: reconstructPath(current), found: true, nodesExplored };
    }

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const neighborKey = nodeKey(nx, ny);

      if (closedSet.has(neighborKey)) continue;
      if (!map.isInBounds(nx, ny)) continue;
      if (map.blocksMovement(nx, ny)) continue;
      if (isBlocked && isBlocked(nx, ny) && !(nx === goalX && ny === goalY)) continue;

      if (nodeMap.has(neighborKey)) continue;

      const neighbor: GreedyNode = { x: nx, y: ny, h: heuristic(nx, ny, goalX, goalY), parent: current };
      nodeMap.set(neighborKey, neighbor);
      openSet.push(neighbor);
    }

    yield buildStepState(current, openSet, closedSet, nodeMap, goalX, goalY, nodesExplored, false);
  }

  return { path: [], found: false, nodesExplored };
}

export function findPathGreedy(
  map: GameMap, startX: number, startY: number, goalX: number, goalY: number,
  options: PathfindingOptions = {},
): PathResult {
  const gen = findPathGreedyStepped(map, startX, startY, goalX, goalY, options);
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value;
}

export function getStepTowardGreedy(
  map: GameMap, startX: number, startY: number, goalX: number, goalY: number,
  options: PathfindingOptions = {},
): Direction | null {
  const result = findPathGreedy(map, startX, startY, goalX, goalY, options);
  if (!result.found || result.path.length === 0) return null;
  const firstStep = result.path[0];
  return { dx: firstStep.x - startX, dy: firstStep.y - startY };
}
```

- [ ] **Step 4: Add export to `src/pathfinding/index.ts`**

Add:

```ts
export * from './greedyBestFirst.js';
```

- [ ] **Step 5: Run typecheck and tests**

Run: `npm run typecheck && npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pathfinding/greedyBestFirst.ts src/pathfinding/index.ts tests/pathfinding.test.js
git commit -m "Add Greedy Best-First Search pathfinding algorithm"
```

---

## Task 5: Implement Breadth-First Search

**Files:**
- Create: `src/pathfinding/bfs.ts`
- Modify: `src/pathfinding/index.ts`
- Test: `tests/pathfinding.test.js`

- [ ] **Step 1: Write failing tests for BFS**

Update the import:

```js
import {
  createMap, findPath, findPathStepped, getStepToward, distance, isAdjacent, Tiles,
  findPathDijkstra, findPathDijkstraStepped,
  findPathGreedy, findPathGreedyStepped,
  findPathBFS, findPathBFSStepped,
} from '../src';
```

Add:

```js
describe('BFS', () => {
  let map;

  beforeEach(() => {
    map = createMap(10, 10, { edgeBehavior: 'block' });
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        map.setTile(x, y, Tiles.Floor);
      }
    }
  });

  it('should find shortest path (fewest hops) on open map', () => {
    const result = findPathBFS(map, 0, 0, 5, 0);
    expect(result.found).toBe(true);
    expect(result.path.length).toBe(5);
  });

  it('should find path around obstacles', () => {
    map.setTile(2, 0, Tiles.Wall);
    map.setTile(2, 1, Tiles.Wall);
    map.setTile(2, 2, Tiles.Wall);

    const result = findPathBFS(map, 0, 0, 4, 0);
    expect(result.found).toBe(true);
    expect(result.path.length).toBeGreaterThan(4);
  });

  it('should return no path when completely blocked', () => {
    for (let y = 0; y < 10; y++) {
      map.setTile(5, y, Tiles.Wall);
    }
    const result = findPathBFS(map, 0, 0, 9, 0);
    expect(result.found).toBe(false);
  });

  it('stepper should track depth as g, h=0', () => {
    const gen = findPathBFSStepped(map, 0, 0, 5, 0);
    gen.next();
    const { value: state } = gen.next();

    for (const [, node] of state.closedSet) {
      expect(node.h).toBe(0);
      expect(node.f).toBe(node.g);
      expect(Number.isInteger(node.g)).toBe(true);
    }
  });

  it('should expand in rings (nodes at depth N explored before depth N+1)', () => {
    const gen = findPathBFSStepped(map, 4, 4, 9, 9);
    const depths = [];
    let step = gen.next();
    while (!step.done) {
      const state = step.value;
      const currentNode = state.closedSet.get(`${state.current.x},${state.current.y}`);
      if (currentNode) depths.push(currentNode.g);
      step = gen.next();
    }
    // Depths should be non-decreasing (BFS property)
    for (let i = 1; i < depths.length; i++) {
      expect(depths[i]).toBeGreaterThanOrEqual(depths[i - 1]);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: Fails — `findPathBFS` and `findPathBFSStepped` don't exist.

- [ ] **Step 3: Create `src/pathfinding/bfs.ts`**

BFS uses a FIFO queue (no sorting), g tracks hop count:

```ts
import type { Map as GameMap } from '../map/types.js';
import type { Direction } from '../movement/directions.js';
import type { PathfindingOptions, PathResult, StepState, NodeState, PathNode } from './types.js';
import { CARDINAL_DIRECTIONS, ALL_DIRECTIONS } from '../movement/directions.js';

interface BFSNode {
  x: number;
  y: number;
  depth: number;
  parent: BFSNode | null;
}

function nodeKey(x: number, y: number): string {
  return `${x},${y}`;
}

function toNodeState(node: BFSNode): NodeState {
  return {
    x: node.x, y: node.y,
    g: node.depth, h: 0, f: node.depth,
    parentX: node.parent ? node.parent.x : node.x,
    parentY: node.parent ? node.parent.y : node.y,
  };
}

function buildStepState(
  current: BFSNode, queue: BFSNode[], closedSet: Set<string>,
  nodeMap: Map<string, BFSNode>, goalX: number, goalY: number,
  nodesExplored: number, found: boolean,
): StepState {
  const openMap = new Map<string, NodeState>();
  for (const node of queue) openMap.set(nodeKey(node.x, node.y), toNodeState(node));
  const closedMap = new Map<string, NodeState>();
  for (const key of closedSet) {
    const node = nodeMap.get(key);
    if (node) closedMap.set(key, toNodeState(node));
  }
  return { openSet: openMap, closedSet: closedMap, current: { x: current.x, y: current.y },
    goal: { x: goalX, y: goalY }, found, nodesExplored };
}

function reconstructPath(goalNode: BFSNode): PathNode[] {
  const path: PathNode[] = [];
  let node: BFSNode | null = goalNode;
  while (node !== null && node.parent !== null) {
    path.unshift({ x: node.x, y: node.y });
    node = node.parent;
  }
  return path;
}

export function* findPathBFSStepped(
  map: GameMap, startX: number, startY: number, goalX: number, goalY: number,
  options: PathfindingOptions = {},
): Generator<StepState, PathResult> {
  const { maxNodes = 1000, allowDiagonal = false, isBlocked } = options;
  const directions = allowDiagonal ? ALL_DIRECTIONS : CARDINAL_DIRECTIONS;

  if (map.blocksMovement(startX, startY) || map.blocksMovement(goalX, goalY)) {
    return { path: [], found: false, nodesExplored: 0 };
  }
  if (startX === goalX && startY === goalY) {
    return { path: [], found: true, nodesExplored: 0 };
  }

  const queue: BFSNode[] = [];
  const closedSet = new Set<string>();
  const nodeMap = new Map<string, BFSNode>();

  const startNode: BFSNode = { x: startX, y: startY, depth: 0, parent: null };
  queue.push(startNode);
  nodeMap.set(nodeKey(startX, startY), startNode);

  let nodesExplored = 0;

  while (queue.length > 0 && nodesExplored < maxNodes) {
    const current = queue.shift()!;
    const currentKey = nodeKey(current.x, current.y);

    if (closedSet.has(currentKey)) continue;

    nodesExplored++;
    closedSet.add(currentKey);

    if (current.x === goalX && current.y === goalY) {
      yield buildStepState(current, queue, closedSet, nodeMap, goalX, goalY, nodesExplored, true);
      return { path: reconstructPath(current), found: true, nodesExplored };
    }

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const neighborKey = nodeKey(nx, ny);

      if (closedSet.has(neighborKey)) continue;
      if (nodeMap.has(neighborKey)) continue;
      if (!map.isInBounds(nx, ny)) continue;
      if (map.blocksMovement(nx, ny)) continue;
      if (isBlocked && isBlocked(nx, ny) && !(nx === goalX && ny === goalY)) continue;

      const neighbor: BFSNode = { x: nx, y: ny, depth: current.depth + 1, parent: current };
      nodeMap.set(neighborKey, neighbor);
      queue.push(neighbor);
    }

    yield buildStepState(current, queue, closedSet, nodeMap, goalX, goalY, nodesExplored, false);
  }

  return { path: [], found: false, nodesExplored };
}

export function findPathBFS(
  map: GameMap, startX: number, startY: number, goalX: number, goalY: number,
  options: PathfindingOptions = {},
): PathResult {
  const gen = findPathBFSStepped(map, startX, startY, goalX, goalY, options);
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value;
}

export function getStepTowardBFS(
  map: GameMap, startX: number, startY: number, goalX: number, goalY: number,
  options: PathfindingOptions = {},
): Direction | null {
  const result = findPathBFS(map, startX, startY, goalX, goalY, options);
  if (!result.found || result.path.length === 0) return null;
  const firstStep = result.path[0];
  return { dx: firstStep.x - startX, dy: firstStep.y - startY };
}
```

- [ ] **Step 4: Add export to `src/pathfinding/index.ts`**

Add:

```ts
export * from './bfs.js';
```

- [ ] **Step 5: Run typecheck and tests**

Run: `npm run typecheck && npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pathfinding/bfs.ts src/pathfinding/index.ts tests/pathfinding.test.js
git commit -m "Add BFS pathfinding algorithm with stepper API"
```

---

## Task 6: Implement Jump Point Search

**Files:**
- Create: `src/pathfinding/jps.ts`
- Modify: `src/pathfinding/index.ts`
- Test: `tests/pathfinding.test.js`

- [ ] **Step 1: Write failing tests for JPS**

Update the import:

```js
import {
  createMap, findPath, findPathStepped, getStepToward, distance, isAdjacent, Tiles,
  findPathDijkstra, findPathDijkstraStepped,
  findPathGreedy, findPathGreedyStepped,
  findPathBFS, findPathBFSStepped,
  findPathJPS, findPathJPSStepped,
} from '../src';
```

Add:

```js
describe('JPS', () => {
  let map;

  beforeEach(() => {
    map = createMap(10, 10, { edgeBehavior: 'block' });
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        map.setTile(x, y, Tiles.Floor);
      }
    }
  });

  it('should find optimal path on open map', () => {
    const result = findPathJPS(map, 0, 0, 8, 0);
    expect(result.found).toBe(true);
    expect(result.path.length).toBe(8);
  });

  it('should find same-length path as A*', () => {
    map.setTile(3, 0, Tiles.Wall);
    map.setTile(3, 1, Tiles.Wall);
    map.setTile(3, 2, Tiles.Wall);

    const jpsResult = findPathJPS(map, 0, 0, 6, 0);
    const astarResult = findPath(map, 0, 0, 6, 0);
    expect(jpsResult.found).toBe(true);
    expect(jpsResult.path.length).toBe(astarResult.path.length);
  });

  it('should explore fewer nodes than A* on open map', () => {
    const jpsResult = findPathJPS(map, 0, 0, 8, 0);
    const astarResult = findPath(map, 0, 0, 8, 0);
    expect(jpsResult.nodesExplored).toBeLessThanOrEqual(astarResult.nodesExplored);
  });

  it('should return no path when completely blocked', () => {
    for (let y = 0; y < 10; y++) {
      map.setTile(5, y, Tiles.Wall);
    }
    const result = findPathJPS(map, 0, 0, 9, 0);
    expect(result.found).toBe(false);
  });

  it('should find path around obstacles', () => {
    map.setTile(2, 0, Tiles.Wall);
    map.setTile(2, 1, Tiles.Wall);
    map.setTile(2, 2, Tiles.Wall);

    const result = findPathJPS(map, 0, 0, 4, 0);
    expect(result.found).toBe(true);
  });

  it('stepper should yield StepState with jump points', () => {
    const gen = findPathJPSStepped(map, 0, 0, 8, 0);
    const first = gen.next();
    expect(first.done).toBe(false);
    expect(first.value.current).toBeDefined();
    expect(first.value.openSet).toBeDefined();
    expect(first.value.closedSet).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: Fails — `findPathJPS` and `findPathJPSStepped` don't exist.

- [ ] **Step 3: Create `src/pathfinding/jps.ts`**

JPS is a cardinal-only variant (diagonal JPS is substantially more complex; cardinal-only matches the default `allowDiagonal: false` used throughout the codebase). It works by "jumping" along cardinal directions, skipping nodes that would be expanded by a straight-line path, and only adding "jump points" — nodes where the path could meaningfully change direction — to the open set.

```ts
import type { Map as GameMap } from '../map/types.js';
import type { Direction } from '../movement/directions.js';
import type { PathfindingOptions, PathResult, StepState, NodeState, PathNode } from './types.js';
import { CARDINAL_DIRECTIONS } from '../movement/directions.js';

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
    x: node.x, y: node.y,
    g: node.g, h: node.h, f: node.f,
    parentX: node.parent ? node.parent.x : node.x,
    parentY: node.parent ? node.parent.y : node.y,
  };
}

function buildStepState(
  current: JPSNode, openSet: JPSNode[], closedSet: Set<string>,
  nodeMap: Map<string, JPSNode>, goalX: number, goalY: number,
  nodesExplored: number, found: boolean,
): StepState {
  const openMap = new Map<string, NodeState>();
  for (const node of openSet) openMap.set(nodeKey(node.x, node.y), toNodeState(node));
  const closedMap = new Map<string, NodeState>();
  for (const key of closedSet) {
    const node = nodeMap.get(key);
    if (node) closedMap.set(key, toNodeState(node));
  }
  return { openSet: openMap, closedSet: closedMap, current: { x: current.x, y: current.y },
    goal: { x: goalX, y: goalY }, found, nodesExplored };
}

function reconstructPath(goalNode: JPSNode): PathNode[] {
  // JPS jump points may not be adjacent — fill in intermediate steps
  const jumpPoints: PathNode[] = [];
  let node: JPSNode | null = goalNode;
  while (node !== null && node.parent !== null) {
    jumpPoints.unshift({ x: node.x, y: node.y });
    node = node.parent;
  }

  if (jumpPoints.length === 0) return [];

  // Add start's position as anchor for interpolation
  const startX = goalNode.parent ? findRoot(goalNode).x : goalNode.x;
  const startY = goalNode.parent ? findRoot(goalNode).y : goalNode.y;

  const path: PathNode[] = [];
  let prevX = startX;
  let prevY = startY;

  for (const jp of jumpPoints) {
    // Walk from prev to jp one step at a time
    let cx = prevX;
    let cy = prevY;
    while (cx !== jp.x || cy !== jp.y) {
      if (cx < jp.x) cx++;
      else if (cx > jp.x) cx--;
      if (cy < jp.y) cy++;
      else if (cy > jp.y) cy--;
      path.push({ x: cx, y: cy });
    }
    prevX = jp.x;
    prevY = jp.y;
  }

  return path;
}

function findRoot(node: JPSNode): JPSNode {
  let current = node;
  while (current.parent !== null) current = current.parent;
  return current;
}

/**
 * Check if a position is walkable (in bounds and not blocked by terrain)
 */
function isWalkable(map: GameMap, x: number, y: number): boolean {
  return map.isInBounds(x, y) && !map.blocksMovement(x, y);
}

/**
 * Jump in a cardinal direction, looking for jump points.
 * Returns the jump point position or null if none found.
 */
function jump(
  map: GameMap, x: number, y: number, dx: number, dy: number,
  goalX: number, goalY: number, maxSteps: number,
): { x: number; y: number } | null {
  let nx = x + dx;
  let ny = y + dy;
  let steps = 0;

  while (steps < maxSteps) {
    if (!isWalkable(map, nx, ny)) return null;
    if (nx === goalX && ny === goalY) return { x: nx, y: ny };

    // Check for forced neighbors (cardinal JPS)
    if (dx !== 0 && dy === 0) {
      // Horizontal movement: check for vertical forced neighbors
      if ((!isWalkable(map, nx, ny - 1) && isWalkable(map, nx + dx, ny - 1)) ||
          (!isWalkable(map, nx, ny + 1) && isWalkable(map, nx + dx, ny + 1))) {
        return { x: nx, y: ny };
      }
      // Also check perpendicular jumps
      if (jump(map, nx, ny, 0, -1, goalX, goalY, maxSteps - steps) !== null ||
          jump(map, nx, ny, 0, 1, goalX, goalY, maxSteps - steps) !== null) {
        return { x: nx, y: ny };
      }
    } else if (dy !== 0 && dx === 0) {
      // Vertical movement: check for horizontal forced neighbors
      if ((!isWalkable(map, nx - 1, ny) && isWalkable(map, nx - 1, ny + dy)) ||
          (!isWalkable(map, nx + 1, ny) && isWalkable(map, nx + 1, ny + dy))) {
        return { x: nx, y: ny };
      }
    }

    nx += dx;
    ny += dy;
    steps++;
  }

  return null;
}

export function* findPathJPSStepped(
  map: GameMap, startX: number, startY: number, goalX: number, goalY: number,
  options: PathfindingOptions = {},
): Generator<StepState, PathResult> {
  const { maxNodes = 1000 } = options;
  // JPS is cardinal-only (diagonal JPS is a different, more complex algorithm)

  if (map.blocksMovement(startX, startY) || map.blocksMovement(goalX, goalY)) {
    return { path: [], found: false, nodesExplored: 0 };
  }
  if (startX === goalX && startY === goalY) {
    return { path: [], found: true, nodesExplored: 0 };
  }

  const openSet: JPSNode[] = [];
  const closedSet = new Set<string>();
  const nodeMap = new Map<string, JPSNode>();

  const startH = manhattanDistance(startX, startY, goalX, goalY);
  const startNode: JPSNode = { x: startX, y: startY, g: 0, h: startH, f: startH, parent: null };
  openSet.push(startNode);
  nodeMap.set(nodeKey(startX, startY), startNode);

  let nodesExplored = 0;
  const maxJumpSteps = map.width + map.height;

  while (openSet.length > 0 && nodesExplored < maxNodes) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const currentKey = nodeKey(current.x, current.y);

    if (closedSet.has(currentKey)) continue;

    nodesExplored++;
    closedSet.add(currentKey);

    if (current.x === goalX && current.y === goalY) {
      yield buildStepState(current, openSet, closedSet, nodeMap, goalX, goalY, nodesExplored, true);
      return { path: reconstructPath(current), found: true, nodesExplored };
    }

    // Determine which directions to explore
    const directions = current.parent
      ? getPrunedDirections(map, current, current.parent)
      : CARDINAL_DIRECTIONS;

    for (const dir of directions) {
      const jumpPoint = jump(map, current.x, current.y, dir.dx, dir.dy, goalX, goalY, maxJumpSteps);
      if (jumpPoint === null) continue;

      const jpKey = nodeKey(jumpPoint.x, jumpPoint.y);
      if (closedSet.has(jpKey)) continue;

      const g = current.g + manhattanDistance(current.x, current.y, jumpPoint.x, jumpPoint.y);
      const existing = nodeMap.get(jpKey);
      if (existing && existing.g <= g) continue;

      const h = manhattanDistance(jumpPoint.x, jumpPoint.y, goalX, goalY);
      const jpNode: JPSNode = { x: jumpPoint.x, y: jumpPoint.y, g, h, f: g + h, parent: current };
      nodeMap.set(jpKey, jpNode);

      if (!existing) {
        openSet.push(jpNode);
      } else {
        const idx = openSet.findIndex(n => n.x === jumpPoint.x && n.y === jumpPoint.y);
        if (idx >= 0) openSet[idx] = jpNode;
      }
    }

    yield buildStepState(current, openSet, closedSet, nodeMap, goalX, goalY, nodesExplored, false);
  }

  return { path: [], found: false, nodesExplored };
}

/**
 * Get pruned directions for JPS based on parent direction.
 * Only returns natural neighbors and forced neighbors.
 */
function getPrunedDirections(
  map: GameMap, current: JPSNode, parent: JPSNode,
): Direction[] {
  const dx = Math.sign(current.x - parent.x);
  const dy = Math.sign(current.y - parent.y);
  const dirs: Direction[] = [];

  if (dx !== 0 && dy === 0) {
    // Horizontal movement: continue forward + check forced neighbors
    dirs.push({ dx, dy: 0 });
    if (!isWalkable(map, current.x, current.y - 1)) dirs.push({ dx, dy: -1 });
    if (!isWalkable(map, current.x, current.y + 1)) dirs.push({ dx, dy: 1 });
    // Always check perpendicular
    dirs.push({ dx: 0, dy: -1 });
    dirs.push({ dx: 0, dy: 1 });
  } else if (dy !== 0 && dx === 0) {
    // Vertical movement: continue forward + check forced neighbors
    dirs.push({ dx: 0, dy });
    if (!isWalkable(map, current.x - 1, current.y)) dirs.push({ dx: -1, dy });
    if (!isWalkable(map, current.x + 1, current.y)) dirs.push({ dx: 1, dy });
    // Always check perpendicular
    dirs.push({ dx: -1, dy: 0 });
    dirs.push({ dx: 1, dy: 0 });
  } else {
    // No clear parent direction (shouldn't happen but fallback to all)
    return [...CARDINAL_DIRECTIONS];
  }

  return dirs;
}

export function findPathJPS(
  map: GameMap, startX: number, startY: number, goalX: number, goalY: number,
  options: PathfindingOptions = {},
): PathResult {
  const gen = findPathJPSStepped(map, startX, startY, goalX, goalY, options);
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value;
}

export function getStepTowardJPS(
  map: GameMap, startX: number, startY: number, goalX: number, goalY: number,
  options: PathfindingOptions = {},
): Direction | null {
  const result = findPathJPS(map, startX, startY, goalX, goalY, options);
  if (!result.found || result.path.length === 0) return null;
  const firstStep = result.path[0];
  return { dx: firstStep.x - startX, dy: firstStep.y - startY };
}
```

- [ ] **Step 4: Add export to `src/pathfinding/index.ts`**

Add:

```ts
export * from './jps.js';
```

- [ ] **Step 5: Run typecheck and tests**

Run: `npm run typecheck && npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pathfinding/jps.ts src/pathfinding/index.ts tests/pathfinding.test.js
git commit -m "Add Jump Point Search pathfinding algorithm"
```

---

## Task 7: Build nuglib and verify all algorithms work together

**Files:**
- Modify: `src/pathfinding/index.ts` (verify final state)

- [ ] **Step 1: Verify `src/pathfinding/index.ts` has all exports**

The file should contain:

```ts
/**
 * Pathfinding module
 *
 * Provides multiple pathfinding algorithms and a generator-based stepper API
 * for step-by-step visualization.
 *
 * @module pathfinding
 */

export * from './types.js';
export * from './astar.js';
export * from './dijkstra.js';
export * from './greedyBestFirst.js';
export * from './bfs.js';
export * from './jps.js';
```

- [ ] **Step 2: Run full typecheck, test suite, and build**

Run: `npm run typecheck && npm test && npm run build`
Expected: All pass. `static/libraries/nuglib.min.js` is updated with all five algorithms.

- [ ] **Step 3: Commit**

```bash
git add static/libraries/nuglib.min.js
git commit -m "Build nuglib with all five pathfinding algorithms"
```

---

## Task 8: Create example maps

**Files:**
- Create: `content/pathfinding-visualizer/maps.js`

- [ ] **Step 1: Create `content/pathfinding-visualizer/maps.js`**

Each map is a 2D array where `0` = wall, `1` = floor. Each map includes a start and goal position. Maps are approximately 30x20 tiles.

```js
// 0 = wall, 1 = floor
// Each map: { name, description, width, height, tiles (flat array, row-major), start: {x,y}, goal: {x,y} }

const MAPS = [
  {
    name: 'Open Room',
    description: 'Large open space — shows how algorithms expand differently without obstacles.',
    width: 30,
    height: 20,
    start: { x: 2, y: 10 },
    goal: { x: 27, y: 10 },
    tiles: (() => {
      const t = [];
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 30; x++) {
          t.push((x === 0 || x === 29 || y === 0 || y === 19) ? 0 : 1);
        }
      }
      return t;
    })(),
  },

  {
    name: 'Bottleneck',
    description: 'Two rooms connected by a narrow corridor — all algorithms must find the chokepoint.',
    width: 30,
    height: 20,
    start: { x: 5, y: 10 },
    goal: { x: 24, y: 10 },
    tiles: (() => {
      const t = [];
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 30; x++) {
          // Outer walls
          if (x === 0 || x === 29 || y === 0 || y === 19) { t.push(0); continue; }
          // Dividing wall at x=14,15 with gap at y=9,10
          if ((x === 14 || x === 15) && !(y >= 9 && y <= 10)) { t.push(0); continue; }
          t.push(1);
        }
      }
      return t;
    })(),
  },

  {
    name: 'Maze',
    description: 'Tight corridors with dead ends — exposes greedy search chasing the heuristic into traps.',
    width: 31,
    height: 21,
    start: { x: 1, y: 1 },
    goal: { x: 29, y: 19 },
    tiles: (() => {
      // Simple hand-crafted maze with corridors and dead ends
      const w = 31, h = 21;
      const t = new Array(w * h).fill(0);
      const set = (x, y, v) => { t[y * w + x] = v; };

      // Carve corridors
      // Main horizontal corridors
      for (let x = 1; x < w - 1; x++) { set(x, 1, 1); set(x, 5, 1); set(x, 9, 1); set(x, 13, 1); set(x, 17, 1); set(x, 19, 1); }
      // Vertical connectors (right side)
      for (let y = 1; y <= 5; y++) set(27, y, 1);
      for (let y = 5; y <= 9; y++) set(3, y, 1);
      for (let y = 9; y <= 13; y++) set(27, y, 1);
      for (let y = 13; y <= 17; y++) set(3, y, 1);
      for (let y = 17; y <= 19; y++) set(27, y, 1);
      // Dead ends (vertical stubs going nowhere)
      for (let y = 1; y <= 3; y++) { set(10, y, 1); set(18, y, 1); }
      for (let y = 5; y <= 7; y++) { set(12, y, 1); set(20, y, 1); }
      for (let y = 9; y <= 11; y++) { set(10, y, 1); set(18, y, 1); }
      for (let y = 13; y <= 15; y++) { set(12, y, 1); set(20, y, 1); }

      return t;
    })(),
  },

  {
    name: 'U-Trap',
    description: 'Wall wraps around the goal — algorithms must move away from the goal first.',
    width: 30,
    height: 20,
    start: { x: 14, y: 10 },
    goal: { x: 20, y: 10 },
    tiles: (() => {
      const t = [];
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 30; x++) {
          // Outer walls
          if (x === 0 || x === 29 || y === 0 || y === 19) { t.push(0); continue; }
          // U-shaped wall around goal: vertical walls at x=17 and x=23, horizontal at y=4 and y=16
          // Left wall of U
          if (x === 17 && y >= 4 && y <= 16) { t.push(0); continue; }
          // Right wall of U
          if (x === 23 && y >= 4 && y <= 16) { t.push(0); continue; }
          // Top wall of U (closing the top)
          if (y === 4 && x >= 17 && x <= 23) { t.push(0); continue; }
          // Bottom is open — that's where you enter
          t.push(1);
        }
      }
      return t;
    })(),
  },

  {
    name: 'Pillars',
    description: 'Scattered obstacles in open space — JPS skips open areas while others explore everything.',
    width: 30,
    height: 20,
    start: { x: 2, y: 2 },
    goal: { x: 27, y: 17 },
    tiles: (() => {
      const t = [];
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 30; x++) {
          if (x === 0 || x === 29 || y === 0 || y === 19) { t.push(0); continue; }
          // Regular grid of pillars every 4 tiles, offset
          if (x % 4 === 2 && y % 4 === 2 && x > 2 && y > 2 && x < 27 && y < 17) {
            t.push(0); continue;
          }
          t.push(1);
        }
      }
      return t;
    })(),
  },
];
```

- [ ] **Step 2: Verify maps render correctly by inspecting tile counts**

Check each map manually: the start and goal positions should be on floor tiles, and the outer border should be walls.

- [ ] **Step 3: Commit**

```bash
git add content/pathfinding-visualizer/maps.js
git commit -m "Add hand-crafted example maps for pathfinding visualizer"
```

---

## Task 9: Create the sketch index.md

**Files:**
- Create: `content/pathfinding-visualizer/index.md`

- [ ] **Step 1: Create `content/pathfinding-visualizer/index.md`**

```markdown
---
title: "Pathfinding Algorithm Visualizer"
date: 2026-03-27T00:00:00-05:00
description: "Step-by-step visualization of five pathfinding algorithms on hand-crafted maps"
usage: "Select a map and algorithm, then use Step to advance one node at a time, or Play for continuous playback. Hover tiles to see g/h/f scores."
draft: false
scripts:
  - "maps.js"
  - "main.js"
technical_details: |
  <ul>
    <li><strong>A*:</strong> Optimal — combines actual cost (g) with heuristic (h). Explores fewest nodes of any optimal algorithm.</li>
    <li><strong>Dijkstra:</strong> Optimal — no heuristic, expands uniformly by cost. Explores more nodes than A*.</li>
    <li><strong>Greedy Best-First:</strong> Not optimal — uses only heuristic, beelines toward goal. Fast but can find suboptimal paths.</li>
    <li><strong>BFS:</strong> Optimal for unweighted graphs — explores in rings by depth. Simple but thorough.</li>
    <li><strong>Jump Point Search:</strong> Optimal — A* optimization that skips symmetric paths on uniform grids. Dramatically fewer node expansions.</li>
  </ul>
controls: |
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <strong>Map</strong>
      <div style="margin-top: 8px;">
        <select id="map-select" class="control-select" style="width: 200px;"></select>
      </div>
    </div>

    <div>
      <strong>Algorithm</strong>
      <div style="margin-top: 8px;">
        <select id="algorithm-select" class="control-select" style="width: 200px;">
          <option value="astar">A*</option>
          <option value="dijkstra">Dijkstra</option>
          <option value="greedy">Greedy Best-First</option>
          <option value="bfs">BFS</option>
          <option value="jps">Jump Point Search</option>
        </select>
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <strong>Playback</strong>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button id="play-btn" class="control-button">Play</button>
        <button id="step-btn" class="control-button">Step</button>
        <button id="reset-btn" class="control-button">Reset</button>
      </div>
      <div style="margin-top: 8px;">
        <label for="speed-slider">Speed: <span id="speed-value">5</span></label>
        <input type="range" id="speed-slider" class="control-slider" min="1" max="30" value="5" style="width: 200px;">
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <strong>Stats</strong>
      <div style="font-family: monospace; font-size: 0.9em; margin-top: 8px; line-height: 1.8;">
        Nodes explored: <span id="stat-explored">0</span><br>
        Frontier size: <span id="stat-frontier">0</span><br>
        Path length: <span id="stat-path">—</span>
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333; font-size: 0.85em; color: #888;">
      <strong>Legend</strong>
      <div style="margin-top: 4px; font-family: monospace; line-height: 1.8;">
        <span style="color: #60a5fa;">@</span> Start &nbsp;
        <span style="color: #4ade80;">★</span> Goal<br>
        <span style="background: rgba(59,130,246,0.3); padding: 0 4px;">·</span> Explored &nbsp;
        <span style="background: rgba(251,191,36,0.3); padding: 0 4px;">·</span> Frontier<br>
        <span style="background: rgba(251,191,36,0.6); padding: 0 4px;">·</span> Current &nbsp;
        <span style="background: rgba(249,115,22,0.5); padding: 0 4px;">·</span> Path
      </div>
    </div>
  </div>
---
```

- [ ] **Step 2: Commit**

```bash
git add content/pathfinding-visualizer/index.md
git commit -m "Add index.md for pathfinding visualizer sketch"
```

---

## Task 10: Create the main sketch

**Files:**
- Create: `content/pathfinding-visualizer/main.js`

- [ ] **Step 1: Create `content/pathfinding-visualizer/main.js`**

This is the largest file. It handles: canvas setup, map rendering with glyph palette, algorithm state overlay with color tinting, canvas-drawn tooltip on hover, and playback control wiring.

```js
// --- State ---
let currentMap = null;
let currentAlgorithm = 'astar';
let generator = null;
let lastStepState = null;
let finalResult = null;
let isPlaying = false;
let playSpeed = 5; // steps per second
let lastPlayTime = 0;

// --- Rendering ---
let glyphPalette;
let tileW, tileH;
let hoveredTile = null; // { x, y }

// --- DOM elements ---
let mapSelect, algorithmSelect, playBtn, stepBtn, resetBtn, speedSlider, speedValue;
let statExplored, statFrontier, statPath;

// --- Algorithm registry ---
const ALGORITHMS = {
  astar: { name: 'A*', stepped: Nuglib.findPathStepped },
  dijkstra: { name: 'Dijkstra', stepped: Nuglib.findPathDijkstraStepped },
  greedy: { name: 'Greedy BFS', stepped: Nuglib.findPathGreedyStepped },
  bfs: { name: 'BFS', stepped: Nuglib.findPathBFSStepped },
  jps: { name: 'JPS', stepped: Nuglib.findPathJPSStepped },
};

// --- Map helpers ---
function loadMap(mapDef) {
  const map = Nuglib.createMap(mapDef.width, mapDef.height, { edgeBehavior: 'block' });
  for (let y = 0; y < mapDef.height; y++) {
    for (let x = 0; x < mapDef.width; x++) {
      map.setTile(x, y, mapDef.tiles[y * mapDef.width + x] === 0 ? Nuglib.Tiles.Wall : Nuglib.Tiles.Floor);
    }
  }
  return map;
}

function resetVisualization() {
  const mapDef = MAPS[mapSelect.selectedIndex];
  const map = loadMap(mapDef);
  const algo = ALGORITHMS[currentAlgorithm];

  generator = algo.stepped(map, mapDef.start.x, mapDef.start.y, mapDef.goal.x, mapDef.goal.y);
  lastStepState = null;
  finalResult = null;
  isPlaying = false;
  playBtn.textContent = 'Play';
  updateStats();
}

// --- Playback ---
function doStep() {
  if (!generator || finalResult) return false;

  const result = generator.next();
  if (result.done) {
    finalResult = result.value;
    // Keep the last step state for rendering the final explored area
    updateStats();
    return false;
  }

  lastStepState = result.value;
  if (lastStepState.found) {
    // One more call to get the PathResult
    const final = generator.next();
    if (final.done) finalResult = final.value;
  }
  updateStats();
  return !finalResult;
}

function togglePlay() {
  if (finalResult) return;
  isPlaying = !isPlaying;
  playBtn.textContent = isPlaying ? 'Pause' : 'Play';
  if (isPlaying) lastPlayTime = millis();
}

function updateStats() {
  if (lastStepState) {
    statExplored.textContent = lastStepState.nodesExplored;
    statFrontier.textContent = lastStepState.openSet.size;
  } else {
    statExplored.textContent = '0';
    statFrontier.textContent = '0';
  }
  statPath.textContent = finalResult && finalResult.found ? finalResult.path.length : '—';
}

// --- p5.js ---
function setup() {
  // Calculate tile size to fit map
  const firstMap = MAPS[0];
  tileW = 18;
  tileH = 22;
  const canvasW = firstMap.width * tileW;
  const canvasH = firstMap.height * tileH;
  const canvas = createCanvas(canvasW, canvasH);
  canvas.parent('sketch-container');

  textFont('monospace');
  textAlign(CENTER, CENTER);

  // Glyph palette
  glyphPalette = new Nuglib.GlyphPalette();

  // Bind DOM
  mapSelect = document.getElementById('map-select');
  algorithmSelect = document.getElementById('algorithm-select');
  playBtn = document.getElementById('play-btn');
  stepBtn = document.getElementById('step-btn');
  resetBtn = document.getElementById('reset-btn');
  speedSlider = document.getElementById('speed-slider');
  speedValue = document.getElementById('speed-value');
  statExplored = document.getElementById('stat-explored');
  statFrontier = document.getElementById('stat-frontier');
  statPath = document.getElementById('stat-path');

  // Populate map select
  for (const m of MAPS) {
    const opt = document.createElement('option');
    opt.textContent = m.name;
    mapSelect.appendChild(opt);
  }

  // Event listeners
  mapSelect.addEventListener('change', () => { resizeForMap(); resetVisualization(); });
  algorithmSelect.addEventListener('change', () => { currentAlgorithm = algorithmSelect.value; resetVisualization(); });
  playBtn.addEventListener('click', togglePlay);
  stepBtn.addEventListener('click', () => { isPlaying = false; playBtn.textContent = 'Play'; doStep(); });
  resetBtn.addEventListener('click', resetVisualization);
  speedSlider.addEventListener('input', () => { playSpeed = parseInt(speedSlider.value); speedValue.textContent = playSpeed; });

  resizeForMap();
  resetVisualization();
}

function resizeForMap() {
  const mapDef = MAPS[mapSelect.selectedIndex];
  const canvasW = mapDef.width * tileW;
  const canvasH = mapDef.height * tileH;
  resizeCanvas(canvasW, canvasH);
}

function draw() {
  // Auto-step during playback
  if (isPlaying) {
    const interval = 1000 / playSpeed;
    if (millis() - lastPlayTime >= interval) {
      if (!doStep()) {
        isPlaying = false;
        playBtn.textContent = 'Play';
      }
      lastPlayTime = millis();
    }
  }

  background(0);
  const mapDef = MAPS[mapSelect.selectedIndex];

  // Track hovered tile
  const mx = Math.floor(mouseX / tileW);
  const my = Math.floor(mouseY / tileH);
  hoveredTile = (mx >= 0 && mx < mapDef.width && my >= 0 && my < mapDef.height) ? { x: mx, y: my } : null;

  drawMap(mapDef);
  drawAlgorithmState(mapDef);
  drawFinalPath(mapDef);
  drawStartGoal(mapDef);
  drawTooltip(mapDef);
}

function drawMap(mapDef) {
  textSize(14);
  for (let y = 0; y < mapDef.height; y++) {
    for (let x = 0; x < mapDef.width; x++) {
      const tile = mapDef.tiles[y * mapDef.width + x];
      const px = x * tileW;
      const py = y * tileH;

      if (tile === 0) {
        fill(85);
        text('#', px + tileW / 2, py + tileH / 2);
      } else {
        fill(50);
        text('·', px + tileW / 2, py + tileH / 2);
      }
    }
  }
}

function drawAlgorithmState(mapDef) {
  if (!lastStepState) return;

  noStroke();

  // Closed set (explored) — blue tint
  for (const [, node] of lastStepState.closedSet) {
    fill(59, 130, 246, 60);
    rect(node.x * tileW, node.y * tileH, tileW, tileH);
  }

  // Open set (frontier) — yellow tint
  for (const [, node] of lastStepState.openSet) {
    fill(251, 191, 36, 50);
    rect(node.x * tileW, node.y * tileH, tileW, tileH);
  }

  // Current node — bright amber
  if (!finalResult) {
    fill(245, 158, 11, 150);
    rect(lastStepState.current.x * tileW, lastStepState.current.y * tileH, tileW, tileH);
  }
}

function drawFinalPath(mapDef) {
  if (!finalResult || !finalResult.found) return;

  noStroke();
  fill(249, 115, 22, 130);
  for (const node of finalResult.path) {
    rect(node.x * tileW, node.y * tileH, tileW, tileH);
  }
}

function drawStartGoal(mapDef) {
  textSize(14);

  // Start
  fill(96, 165, 250);
  text('@', mapDef.start.x * tileW + tileW / 2, mapDef.start.y * tileH + tileH / 2);

  // Goal
  fill(74, 222, 128);
  text('★', mapDef.goal.x * tileW + tileW / 2, mapDef.goal.y * tileH + tileH / 2);
}

function drawTooltip(mapDef) {
  if (!hoveredTile || !lastStepState) return;

  const key = `${hoveredTile.x},${hoveredTile.y}`;
  const closedNode = lastStepState.closedSet.get(key);
  const openNode = lastStepState.openSet.get(key);
  const node = closedNode || openNode;

  if (!node) return;

  const status = closedNode ? 'Explored' : 'Frontier';
  const statusColor = closedNode ? color(59, 130, 246) : color(251, 191, 36);

  // Tooltip dimensions
  const padding = 10;
  const lineH = 18;
  const tooltipW = 170;
  const tooltipH = padding * 2 + lineH * 6;

  // Position tooltip near tile, keeping on screen
  let tx = hoveredTile.x * tileW + tileW + 8;
  let ty = hoveredTile.y * tileH;
  if (tx + tooltipW > width) tx = hoveredTile.x * tileW - tooltipW - 8;
  if (ty + tooltipH > height) ty = height - tooltipH;
  if (ty < 0) ty = 0;

  // Background
  fill(15, 15, 30, 240);
  stroke(statusColor);
  strokeWeight(1);
  rect(tx, ty, tooltipW, tooltipH, 6);
  noStroke();

  // Content
  textSize(11);
  textAlign(LEFT, TOP);
  let cy = ty + padding;

  fill(statusColor);
  text(`(${node.x}, ${node.y}) — ${status}`, tx + padding, cy);
  cy += lineH + 4;

  fill(200);
  text(`g (cost):`, tx + padding, cy);
  fill(74, 222, 128);
  textAlign(RIGHT, TOP);
  text(node.g % 1 === 0 ? node.g : node.g.toFixed(1), tx + tooltipW - padding, cy);
  cy += lineH;

  textAlign(LEFT, TOP);
  fill(200);
  text(`h (heuristic):`, tx + padding, cy);
  fill(251, 191, 36);
  textAlign(RIGHT, TOP);
  text(node.h % 1 === 0 ? node.h : node.h.toFixed(1), tx + tooltipW - padding, cy);
  cy += lineH;

  textAlign(LEFT, TOP);
  fill(200);
  text(`f (total):`, tx + padding, cy);
  fill(255);
  textAlign(RIGHT, TOP);
  text(node.f % 1 === 0 ? node.f : node.f.toFixed(1), tx + tooltipW - padding, cy);
  cy += lineH;

  // Parent direction
  const dx = node.x - node.parentX;
  const dy = node.y - node.parentY;
  const arrows = { '0,-1': '↓', '0,1': '↑', '1,0': '←', '-1,0': '→', '1,-1': '↙', '-1,-1': '↘', '1,1': '↖', '-1,1': '↗', '0,0': '·' };
  const arrowKey = `${dx},${dy}`;
  const arrow = arrows[arrowKey] || '·';

  textAlign(LEFT, TOP);
  fill(200);
  text(`parent:`, tx + padding, cy);
  textAlign(RIGHT, TOP);
  fill(180);
  text(`${arrow} (${node.parentX}, ${node.parentY})`, tx + tooltipW - padding, cy);

  // Reset text alignment
  textAlign(CENTER, CENTER);
}
```

- [ ] **Step 2: Verify the sketch loads in Hugo**

Run: `hugo server`
Navigate to `http://localhost:1313/pathfinding-visualizer/` in a browser. Verify:
- Map renders with `#` and `·` glyphs
- Start `@` and goal `★` are visible
- Algorithm and map dropdowns work
- Step button advances visualization one node
- Play button auto-steps at configured speed
- Hovering explored/frontier tiles shows tooltip
- Reset clears state
- Switching map or algorithm resets

- [ ] **Step 3: Commit**

```bash
git add content/pathfinding-visualizer/main.js
git commit -m "Add main sketch for pathfinding algorithm visualizer"
```

---

## Task 11: Test the full sketch end-to-end and polish

**Files:**
- Modify: any files needing fixes

- [ ] **Step 1: Run full build and test suite**

Run: `npm run typecheck && npm test && npm run build`
Expected: All pass.

- [ ] **Step 2: Test each algorithm on each map in Hugo**

Run `hugo server` and manually verify:
1. Each of the 5 algorithms runs on each of the 5 maps
2. Step-through works correctly (one node per click)
3. Play/pause works with speed slider
4. Tooltip shows correct g/h/f values
5. Final path highlights when algorithm completes
6. Stats update correctly
7. Reset works cleanly

- [ ] **Step 3: Fix any issues found during testing**

Address any rendering glitches, incorrect behavior, or edge cases found.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "Polish pathfinding visualizer sketch"
```
