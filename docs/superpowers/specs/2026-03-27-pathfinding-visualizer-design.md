# Pathfinding Algorithm Visualizer — Design Spec

## Overview

A p5.js sketch that visualizes five pathfinding algorithms step-by-step on hand-crafted example maps. The user picks a map and algorithm, then steps through (or plays back) the search one node expansion at a time, watching the frontier grow and the path emerge. A canvas-drawn tooltip on hover shows full node detail (g, h, f, parent).

This sketch motivates and demonstrates an expansion of nuglib's pathfinding module from one algorithm (A*) to five, with a new generator-based stepper API.

A second sketch (pathfinding fishbowl — monsters roaming with random goals) is planned separately.

## Nuglib Pathfinding Module Expansion

### New Algorithms

Four new algorithms alongside the existing A*, each in its own file under `src/pathfinding/`:

| Algorithm | File | Key Trait |
|---|---|---|
| A* | `astar.ts` (existing) | Optimal, heuristic-guided |
| Dijkstra | `dijkstra.ts` | Optimal, no heuristic — uniform expansion |
| Greedy Best-First | `greedyBestFirst.ts` | Not optimal — heuristic only, beelines toward goal |
| BFS | `bfs.ts` | Optimal for unweighted graphs — FIFO expansion in rings |
| Jump Point Search | `jps.ts` | A* optimization for uniform-cost grids — skips symmetric paths |

All algorithms share the existing `PathResult` and `PathfindingOptions` interfaces. Each exports `findPath()` and `getStepToward()` matching the existing A* signatures.

### Generator-Based Stepper API

Each algorithm also exports `findPathStepped()`, which returns a `Generator<StepState, PathResult>`. The generator yields a `StepState` after each node expansion, and returns the final `PathResult` when complete.

```ts
interface StepState {
  openSet: ReadonlyMap<string, NodeState>;   // frontier nodes
  closedSet: ReadonlyMap<string, NodeState>; // explored nodes
  current: { x: number; y: number };         // node just expanded
  goal: { x: number; y: number };
  found: boolean;
  nodesExplored: number;
}

interface NodeState {
  x: number;
  y: number;
  g: number;        // cost from start (0 for BFS)
  h: number;        // heuristic to goal (0 for Dijkstra/BFS)
  f: number;        // g + h
  parentX: number;  // for drawing parent arrows
  parentY: number;
}
```

The existing `findPath` gets refactored so the core loop lives in the generator, and `findPath` just runs the generator to completion. Same pattern for all five algorithms.

**Algorithm-specific notes:**
- **BFS** — h is 0, g tracks depth (hop count), f equals g. Ordering is purely FIFO. Still populates `NodeState` for consistent rendering.
- **Greedy Best-First** — g is always 0, f equals h. Shows how it beelines toward the goal.
- **JPS** — yields at each jump point found, not every cell scanned. `NodeState` includes the jump point with its parent. The sketch draws lines between jump points rather than coloring every intermediate cell.

## Sketch: Pathfinding Visualizer

### File Structure

Located at `content/pathfinding-visualizer/`:

- **`index.md`** — Hugo frontmatter with title, description, `technical_details` (algorithm descriptions, color legend), `controls` (map picker, algorithm picker, play/step/reset, speed slider, stats), and `scripts` array.
- **`main.js`** — p5.js sketch: canvas setup, map rendering with glyph palette, algorithm state overlay (color tinting), canvas-drawn tooltip, control wiring.
- **`maps.js`** — The 5 hand-crafted example maps as 2D arrays with predefined start/goal positions.

### UI Layout

Follows the existing roguelike sketch pattern (monsters, rooms-and-corridors):

- **Canvas** — roguelike-style glyph rendering (`#` walls, `·` floors, `@` start, `★` goal). Algorithm state shown via background color tinting on tiles. Canvas-drawn tooltip on hover shows g/h/f/parent for any explored or frontier tile.
- **Controls (below canvas, Hugo frontmatter)** — map selector, algorithm selector, play/step/reset buttons, speed slider, live stats (nodes explored, frontier size, path length).
- **Technical details (above/below canvas, Hugo frontmatter)** — algorithm descriptions, explanation of visualization colors.

### Color Scheme

| State | Background Tint |
|---|---|
| Unexplored floor | No tint (dark) |
| Open set (frontier) | Yellow/amber tint |
| Closed set (explored) | Blue tint |
| Current node | Bright amber |
| Final path | Orange highlight |
| Wall | Gray `#` glyphs |
| Start | Blue `@` with glow |
| Goal | Green `★` with glow |

### Tooltip

Canvas-drawn popup that appears when hovering over any explored or frontier tile. Displays:
- Tile coordinates and status (open/closed/current)
- g (cost from start)
- h (heuristic estimate to goal)
- f (total = g + h)
- Parent direction and coordinates

### Playback Model

- **Step** = one node expansion (one node removed from open set, its neighbors processed)
- **Play** = auto-step at a configurable speed (speed slider)
- **Reset** = clear algorithm state, keep map and algorithm selection

### Example Maps

Five hand-crafted maps (~30x20 tiles), each designed to highlight different algorithm behaviors:

1. **Open Room** — Large open space, start and goal on opposite sides. Shows Dijkstra flooding uniformly vs A* cutting toward the goal vs Greedy beelining straight.
2. **Bottleneck** — Two rooms connected by a single narrow corridor. All algorithms must find the chokepoint; they waste different amounts of effort discovering it.
3. **Maze** — Tight corridors with dead ends. Greedy's weakness — it chases the heuristic into dead ends. JPS has little to optimize with no open spaces.
4. **U-Trap** — A wall wrapping around the goal, forcing algorithms to move "away" from the goal first. Classic heuristic trap — Greedy explores the entire U interior before backing out.
5. **Pillars** — Scattered single-tile obstacles in an open field. JPS's strength — it skips large open sections. Good contrast with Dijkstra's uniform expansion.
