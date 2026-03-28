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
