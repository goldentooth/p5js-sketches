import { describe, it, expect, beforeEach } from 'vitest';
import { createMap, findPath, findPathStepped, getStepToward, distance, isAdjacent, findPathDijkstra, findPathDijkstraStepped, findPathGreedy, findPathGreedyStepped, findPathBFS, findPathBFSStepped, findPathJPS, findPathJPSStepped, Tiles } from '../src';

describe('Pathfinding', () => {
  describe('findPath', () => {
    let map;

    beforeEach(() => {
      // Create a 10x10 map with floor tiles
      map = createMap(10, 10, { edgeBehavior: 'block' });

      // Fill with floor
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          map.setTile(x, y, Tiles.Floor);
        }
      }
    });

    it('should find a straight path on open map', () => {
      const result = findPath(map, 0, 0, 5, 0);

      expect(result.found).toBe(true);
      expect(result.path.length).toBe(5);
      expect(result.path[0]).toEqual({ x: 1, y: 0 });
      expect(result.path[4]).toEqual({ x: 5, y: 0 });
    });

    it('should return empty path when start equals goal', () => {
      const result = findPath(map, 3, 3, 3, 3);

      expect(result.found).toBe(true);
      expect(result.path.length).toBe(0);
    });

    it('should find path around obstacles', () => {
      // Create a wall barrier
      map.setTile(2, 0, Tiles.Wall);
      map.setTile(2, 1, Tiles.Wall);
      map.setTile(2, 2, Tiles.Wall);

      const result = findPath(map, 0, 0, 4, 0);

      expect(result.found).toBe(true);
      // Path should go around the wall
      expect(result.path.length).toBeGreaterThan(4);
    });

    it('should return no path when completely blocked', () => {
      // Create a complete wall barrier
      for (let y = 0; y < 10; y++) {
        map.setTile(5, y, Tiles.Wall);
      }

      const result = findPath(map, 0, 0, 9, 0);

      expect(result.found).toBe(false);
      expect(result.path.length).toBe(0);
    });

    it('should return no path when start is blocked', () => {
      map.setTile(0, 0, Tiles.Wall);

      const result = findPath(map, 0, 0, 5, 5);

      expect(result.found).toBe(false);
    });

    it('should return no path when goal is blocked', () => {
      map.setTile(5, 5, Tiles.Wall);

      const result = findPath(map, 0, 0, 5, 5);

      expect(result.found).toBe(false);
    });

    it('should respect maxNodes limit', () => {
      const result = findPath(map, 0, 0, 9, 9, { maxNodes: 5 });

      // With only 5 nodes, unlikely to find path across large map
      expect(result.nodesExplored).toBeLessThanOrEqual(5);
    });

    it('should use custom blocking function', () => {
      const blockedPositions = new Set(['3,3', '3,4', '3,5']);

      const result = findPath(map, 0, 3, 6, 3, {
        isBlocked: (x, y) => blockedPositions.has(`${x},${y}`),
      });

      expect(result.found).toBe(true);
      // Should not pass through blocked positions
      for (const node of result.path) {
        expect(blockedPositions.has(`${node.x},${node.y}`)).toBe(false);
      }
    });

    it('should allow reaching goal even if blocked by entity', () => {
      // Goal is "blocked" by an entity we want to attack
      const result = findPath(map, 0, 0, 3, 0, {
        isBlocked: (x, y) => x === 3 && y === 0,
      });

      expect(result.found).toBe(true);
      // Last step should be the goal
      expect(result.path[result.path.length - 1]).toEqual({ x: 3, y: 0 });
    });

    describe('diagonal movement', () => {
      it('should find diagonal path when allowed', () => {
        const result = findPath(map, 0, 0, 3, 3, { allowDiagonal: true });

        expect(result.found).toBe(true);
        // Diagonal path should be shorter
        expect(result.path.length).toBe(3);
      });

      it('should find longer cardinal path when diagonal disabled', () => {
        const result = findPath(map, 0, 0, 3, 3, { allowDiagonal: false });

        expect(result.found).toBe(true);
        // Cardinal path is longer (Manhattan distance)
        expect(result.path.length).toBe(6);
      });
    });
  });

  describe('getStepToward', () => {
    let map;

    beforeEach(() => {
      map = createMap(10, 10, { edgeBehavior: 'block' });
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          map.setTile(x, y, Tiles.Floor);
        }
      }
    });

    it('should return first step direction', () => {
      const dir = getStepToward(map, 0, 0, 3, 0);

      expect(dir).toBeDefined();
      expect(dir.dx).toBe(1);
      expect(dir.dy).toBe(0);
    });

    it('should return null when no path exists', () => {
      // Block path completely
      for (let y = 0; y < 10; y++) {
        map.setTile(5, y, Tiles.Wall);
      }

      const dir = getStepToward(map, 0, 0, 9, 0);

      expect(dir).toBeNull();
    });

    it('should return null when already at goal', () => {
      const dir = getStepToward(map, 5, 5, 5, 5);

      // At goal, no step needed - path is empty
      expect(dir).toBeNull();
    });

    it('should navigate around obstacles', () => {
      // Create L-shaped wall
      map.setTile(1, 0, Tiles.Wall);
      map.setTile(1, 1, Tiles.Wall);

      const dir = getStepToward(map, 0, 0, 2, 0);

      // Should go south first to go around wall
      expect(dir).toBeDefined();
      expect(dir.dy).toBe(1);
    });
  });

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
      for (let y = 0; y < 10; y++) map.setTile(5, y, Tiles.Wall);
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
      for (let y = 0; y < 10; y++) map.setTile(5, y, Tiles.Wall);
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

  describe('distance', () => {
    it('should return 0 for same position', () => {
      expect(distance(5, 5, 5, 5)).toBe(0);
    });

    it('should return 1 for adjacent positions', () => {
      expect(distance(5, 5, 5, 6)).toBe(1);
      expect(distance(5, 5, 6, 5)).toBe(1);
      expect(distance(5, 5, 6, 6)).toBe(1); // diagonal
    });

    it('should use Chebyshev distance (max of dx, dy)', () => {
      expect(distance(0, 0, 3, 5)).toBe(5);
      expect(distance(0, 0, 7, 2)).toBe(7);
    });
  });

  describe('isAdjacent', () => {
    it('should return true for cardinal adjacent', () => {
      expect(isAdjacent(5, 5, 5, 6)).toBe(true);
      expect(isAdjacent(5, 5, 5, 4)).toBe(true);
      expect(isAdjacent(5, 5, 6, 5)).toBe(true);
      expect(isAdjacent(5, 5, 4, 5)).toBe(true);
    });

    it('should return true for diagonal adjacent', () => {
      expect(isAdjacent(5, 5, 6, 6)).toBe(true);
      expect(isAdjacent(5, 5, 4, 4)).toBe(true);
      expect(isAdjacent(5, 5, 6, 4)).toBe(true);
      expect(isAdjacent(5, 5, 4, 6)).toBe(true);
    });

    it('should return false for same position', () => {
      expect(isAdjacent(5, 5, 5, 5)).toBe(false);
    });

    it('should return false for distant positions', () => {
      expect(isAdjacent(0, 0, 2, 0)).toBe(false);
      expect(isAdjacent(0, 0, 5, 5)).toBe(false);
    });
  });

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
      for (let y = 0; y < 10; y++) map.setTile(5, y, Tiles.Wall);
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
      for (let i = 1; i < depths.length; i++) {
        expect(depths[i]).toBeGreaterThanOrEqual(depths[i - 1]);
      }
    });
  });

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
      for (let y = 0; y < 10; y++) map.setTile(5, y, Tiles.Wall);
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
});
