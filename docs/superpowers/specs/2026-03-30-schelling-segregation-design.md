# Schelling Segregation Model — Sketch Design

## Overview

An interactive Schelling segregation model rendered in roguelike glyph style. Fantasy races (Dwarves, Elves, Orcs, etc.) populate a grid and relocate when unhappy with their neighborhood composition. The sketch demonstrates how mild individual preferences produce dramatic collective segregation — Schelling's core insight from *Micromotives and Macrobehavior* (1978).

**Prior art:** Inspired by Nicky Case & Vi Hart's [Parable of the Polygons](https://ncase.me/polygons/), which will be cited in the sketch.

## Core Simulation

- Grid-based model with Moore neighborhood (8 surrounding cells)
- 2–6 configurable groups, each a fantasy race with distinct glyph and color
- An agent is **unhappy** if:
  - The fraction of same-group neighbors is **below** their group's tolerance threshold, OR
  - The fraction of same-group neighbors is **above** their group's anti-bias threshold (when enabled)
- Each step: identify all unhappy agents, shuffle them randomly, then process each sequentially (an agent's move may change neighbors' happiness before they are processed — this is standard Schelling behavior and produces more interesting dynamics than batch moves)
- Agents on edges/corners use only the neighbors they have (non-wrapping boundary)

## Groups

Six available races, 2–6 active at a time:

| Race    | Glyph | Color       |
|---------|-------|-------------|
| Dwarf   | `d`   | Amber       |
| Elf     | `e`   | Green       |
| Orc     | `o`   | Red         |
| Hobbit  | `h`   | Warm brown  |
| Goblin  | `g`   | Purple      |
| Troll   | `T`   | Teal        |

Empty cells rendered as `.` in dark gray.

## Movement Strategies

User-selectable via dropdown:

### Random
Unhappy agent moves to a random empty cell. No optimization — may remain unhappy. Closest to Schelling's original model. Fast, chaotic.

### Nearest Satisfying
Unhappy agent BFS-searches outward for the closest empty cell where they would be happy. If no satisfying cell exists, they stay put. More "rational," converges faster, produces tighter clusters.

### Swap
Two random unhappy agents exchange positions. No empty cells required. Works at 100% density. Shows segregation even without the escape valve of empty space.

## Controls

### Global Controls
- **Play / Pause / Step / Reset** — standard playback
- **Steps per frame** — slider, 1–50
- **Grid size** — dropdown: Medium (40x40), Large (60x60), XL (80x80)
- **Population density** — slider, 50%–95% of cells occupied
- **Movement strategy** — dropdown: Random, Nearest Satisfying, Swap

### Per-Group Controls (dynamic rows, one per active group)
- **Enable/disable toggle** — add or remove groups (minimum 2, maximum 6)
- **Population proportion** — relative weight slider (defaults to equal distribution)
- **Tolerance threshold** — slider, 0%–100% ("I want at least X% of my neighbors to be like me")
- **Anti-bias threshold** — slider, 0%–100%, default 100%/off ("I'm unhappy if MORE than X% are like me")

### Live Readouts
- Current step count
- % of agents currently unhappy
- Average similarity ratio (segregation metric)
- Line chart of segregation over time (Y: 0–100%, X: step count)

## Rendering

### Grid
- Roguelike monospace glyph rendering, consistent with Rooms-and-Corridors / Monsters sketches
- Cell size adjusts based on grid size selection to fit the canvas
- Unhappy agents rendered dimmed to show who is about to move
- Destination cells briefly flash/highlight when an agent moves, so migration is visible in real-time

### Segregation Chart
- Simple line chart below or beside the canvas
- Plots average similarity ratio over steps
- Resets when the board resets

### Layout
- Canvas area (main)
- Controls panel in the HTML controls section (right side or below, matching existing sketch patterns)
- Per-group control rows color-coded to match glyph colors
- Attribution footer citing Schelling and Nicky Case

## Initialization

Random placement weighted by population proportions. If Dwarves are set to 40% and Elves to 60%, occupied cells are distributed stochastically (not exact counts).

## Edge Cases & Behavior

- **Equilibrium:** If zero agents are unhappy, auto-pause and display "Equilibrium reached at step N"
- **Stagnation:** If unhappy count is unchanged for 50+ steps, display "Stagnated" but keep running
- **Grid resize / group change / proportion change:** Triggers a full reset and re-randomize
- **Anti-bias default:** 100% (effectively off). Setting it below 100% activates diversity-seeking behavior — agent wants similarity between tolerance% and anti-bias%

## File Structure

```
content/schelling-segregation/
├── index.md       # Frontmatter, description, controls HTML
├── main.js        # p5.js sketch, simulation logic, rendering
└── preview.png    # Gallery thumbnail
```

Single-file implementation in `main.js` unless complexity warrants splitting (e.g., a separate `simulation.js`).
