# Langton's Ant Design

**Goal:** A pixel-grid Langton's Ant sketch that starts with the classic "RL" ant building its highway, then offers controls to explore multi-color rule strings, multiple ants, and interactive painting.

**Architecture:** Single-file p5.js sketch using global mode. 400x400 pixel grid with direct pixel manipulation for performance. HTML controls defined in Hugo frontmatter. No Nuglib dependency.

**Tech Stack:** p5.js (global mode), Hugo content page

---

## 1. Grid & Simulation

### Data Structures

- **Grid:** `Uint8Array(160000)` — flat array indexed by `y * 400 + x`. Each cell stores its current color state (0 = unvisited, 1+ = visited states cycling through rule length).
- **Ants:** Array of `{x, y, dir}` objects. `dir` is 0-3 mapping to N/E/S/W. Each ant also has a `color` for its marker (RGB array).

### Step Function

For each ant per step:
1. Read cell state at `(ant.x, ant.y)`
2. Look up rule character at `rule[state]` — "R" = turn clockwise, "L" = turn counterclockwise
3. Set cell to `(state + 1) % rule.length`
4. Move ant forward in its current direction
5. If wrap mode: mod coordinates by grid size. If bounded mode: remove ant if it would leave the grid.

### Grid Size

400x400 cells, one pixel per cell. Canvas is 400x400 pixels.

## 2. Controls

All controls defined in Hugo frontmatter `controls` field, bound in `setup()` via `document.getElementById()`.

### Speed

- Range slider: 1-2000 steps per frame
- Default: 1
- Label displays current value
- At 60fps, max throughput ~120,000 steps/second

### Rule String

- Text input, default "RL" (classic Langton's Ant)
- Validated to only contain R and L characters (case-insensitive, normalized to uppercase)
- Changing the rule resets the grid and ants
- Preset dropdown alongside the input:
  - "RL" — Classic (highway)
  - "RLR" — Triangle growth
  - "LLRR" — Square growth
  - "LRRRRRLLR" — Fractal chaos
  - "RRLLLRLLLRRR" — Complex symmetry

### Multiple Ants

- "Add Ant" button spawns a new ant at grid center with random direction
- Each ant gets a distinct marker color (evenly spaced hues)
- Counter displays number of active ants

### Paint/Erase

- Click or drag on canvas to toggle cells between state 0 and state 1
- Only active when paused (to avoid fighting the simulation)

### Reset

- Clears grid to all zeros
- Removes all ants except one at center facing north
- Resets step counter to 0

### Pause/Step

- Pause button toggles simulation on/off
- Step button advances one frame (applying current steps-per-frame) while paused

### Wrap Toggle

- Checkbox, default on (wrapping enabled)
- When off: ants that would leave the grid are removed

### Step Counter

- Displays total steps executed, shown below the canvas
- Useful for tracking highway emergence (~10,000 steps)

## 3. Rendering & Colors

### Pixel Manipulation

Use `loadPixels()` / `updatePixels()` for direct pixel array access. Do NOT redraw the entire grid each frame. Only write pixels that changed since last frame (one cell flip per ant per step). At 2000 steps/frame with 1 ant, that's 2000 pixel writes — trivial.

### Color Schemes

**Classic "RL" (2 states):**
- State 0: black (#000000) — unvisited
- State 1: white (#e0e0e0)

**Multi-color (3+ states):**
- State 0: always black (unvisited)
- States 1 through N-1: HSL ramp from deep blue (hue 220) to warm gold (hue 45), evenly subdivided by rule length
- Colors precomputed when rule changes, stored as RGB arrays for fast pixel writes

### Ant Markers

- Each ant drawn as a 3x3 pixel square on top of the grid
- First ant: red (#ff6b6b)
- Additional ants: evenly spaced hues
- Previous frame's ant markers must be restored (redraw the underlying cell colors) before drawing new positions

## 4. Hugo Content Page

### File Structure

```
content/langtons-ant/
  index.md          — Frontmatter + description
  main.js           — All sketch logic
  preview.png       — Gallery preview (created after implementation)
```

### Frontmatter

```yaml
title: "Langton's Ant"
date: 2026-03-29
description: |
  Langton's Ant — a two-dimensional Turing machine with emergent behavior.
  Watch chaos resolve into a diagonal highway, then explore multi-color
  rule strings and multiple ants.
usage: |
  Watch the classic ant build its highway (~10,000 steps). Use the speed
  slider to fast-forward. Try different rule strings for wildly different
  patterns. Add more ants to see interference. Click the grid (while paused)
  to paint initial conditions.
scripts:
  - "main.js"
controls: |
  [HTML controls — see Section 2]
technical_details: |
  <ul>
    <li>400x400 pixel grid, one cell per pixel</li>
    <li>Direct pixel manipulation via loadPixels/updatePixels</li>
    <li>Multi-color rules use generalized Langton's Ant (cyclic states with per-state turn direction)</li>
    <li>HSL color ramp from blue to gold for multi-state visualization</li>
  </ul>
```

## 5. Interaction Details

### Paint Mode

When paused, `mousePressed()` and `mouseDragged()` toggle cells. Map mouse coordinates to grid coordinates (1:1 since canvas = grid size). Toggle between state 0 and state 1 (regardless of current multi-color state). This lets users set up barriers or patterns before running.

### Rule Change

When the rule input changes (on blur or Enter):
1. Validate: strip non-R/L characters, uppercase
2. If empty or unchanged, ignore
3. Recompute color palette for new rule length
4. Reset grid to all zeros
5. Reset to single ant at center

### Adding Ants

New ants spawn at `(200, 200)` with a random direction (0-3). If multiple ants occupy the same cell, they each execute independently on their turn. Ant marker colors are reassigned to all ants when a new one is added (evenly spaced hues).
