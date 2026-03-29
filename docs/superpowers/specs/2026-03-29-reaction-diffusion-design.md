# Reaction-Diffusion Design

**Goal:** A Gray-Scott reaction-diffusion sketch that starts with a center seed growing into organic patterns, then offers controls to explore parameter space, preset patterns, interactive seeding, and color palettes.

**Architecture:** Single-file p5.js sketch using global mode. 300x300 cell grid rendered at 2px per cell on a 600x600 canvas. Direct pixel manipulation for performance. HTML controls defined in Hugo frontmatter. No Nuglib dependency.

**Tech Stack:** p5.js (global mode), Hugo content page

---

## 1. Grid & Simulation

### Data Structures

- **Chemical buffers:** Four `Float32Array(90000)` arrays — `gridA`, `gridB` (current), `nextA`, `nextB` (next step). Flat arrays indexed by `y * 300 + x`.
- **Initial state:** A = 1.0 everywhere, B = 0.0 everywhere. Seeds set B = 1.0 in localized regions.

### Gray-Scott Step

For each cell per step:
1. Compute Laplacian of A and B using weighted 5-point stencil (cardinal neighbors +0.2, diagonal neighbors +0.05, center -1.0)
2. Compute reaction term: `reaction = A * B * B`
3. Update:
   ```
   nextA = A + (dA * laplacianA - reaction + F * (1.0 - A)) * dt
   nextB = B + (dB * laplacianB + reaction - (k + F) * B) * dt
   ```
4. Clamp results to [0.0, 1.0]

Constants: `dA = 1.0`, `dB = 0.5`, `dt = 1.0`.

After processing all cells, swap current and next buffers.

### Grid Size

300x300 cells. Canvas is 600x600 pixels (2px per cell).

### Steps Per Frame

Slider from 1 to 20, default 5. Gray-Scott evolves slowly so multiple steps per frame speeds up pattern formation.

## 2. Controls

All controls defined in Hugo frontmatter `controls` field, bound in `setup()` via `document.getElementById()`.

### Simulation Controls

- **Pause/Play button:** Toggles simulation on/off
- **Step button:** Advances one frame (applying current steps-per-frame) while paused
- **Reset button:** Clears grid to initial state (A=1, B=0), removes all seeds

### Steps Per Frame

- Range slider: 1-20
- Default: 5
- Label displays current value

### Parameter Sliders

- **Feed rate (F):** Range 0.01-0.08, step 0.001, default 0.0367
- **Kill rate (k):** Range 0.04-0.07, step 0.001, default 0.0649
- Labels display current values
- Changing sliders does NOT reset the grid — simulation continues with new parameters

### Pattern Presets

Dropdown that sets F and k to known interesting values, resets grid, and applies current seed preset:

| Name | F | k |
|------|---|---|
| Mitosis (default) | 0.0367 | 0.0649 |
| Coral | 0.0545 | 0.062 |
| Maze/Worms | 0.029 | 0.057 |
| Spots | 0.035 | 0.065 |
| Waves | 0.014 | 0.045 |
| Holes | 0.039 | 0.058 |
| Solitons | 0.03 | 0.06 |
| U-Skate | 0.062 | 0.061 |
| Bubbles | 0.012 | 0.05 |
| Stripe | 0.022 | 0.051 |
| Chaos | 0.026 | 0.051 |

### Seed Presets

Dropdown for initial B distribution (applied on reset/pattern change):

- **Center blob** (default) — 10x10 square of B=1.0 at grid center
- **Random scatter** — 15-20 small blobs (radius 3-5) at random positions
- **Ring** — circle of B=1.0, radius ~40 cells, thickness ~5 cells, centered
- **Horizontal line** — full-width stripe of B=1.0, height ~5 cells, centered vertically

### Color Palette

Dropdown to select color mapping. Changing palette does not reset simulation.

### Clear & Reseed

Button that resets grid and applies the current seed preset with current F/k values.

## 3. Rendering & Colors

### Pixel Manipulation

Use `loadPixels()` / `updatePixels()` each frame. Write every cell every frame (diffusion means most cells change each step). Each cell at `(cx, cy)` maps to a 2x2 pixel block: `(cx*2, cy*2)`, `(cx*2+1, cy*2)`, `(cx*2, cy*2+1)`, `(cx*2+1, cy*2+1)`.

### Color Mapping

Map chemical B concentration (0.0-1.0) to color via palette lookup table. Precompute a 256-entry RGB lookup table when palette changes. To render: `index = Math.floor(B * 255)`, then look up RGB.

### Color Palettes

5 palettes, each defined as an array of RGB color stops with linear interpolation:

- **Thermal** (default): [0,0,0] -> [180,30,0] -> [220,100,0] -> [255,220,50] -> [255,255,255]
- **Ocean**: [0,0,0] -> [0,30,100] -> [0,120,180] -> [100,210,255] -> [255,255,255]
- **Toxic**: [0,0,0] -> [0,80,20] -> [30,180,30] -> [140,255,60] -> [255,255,255]
- **Grayscale**: [0,0,0] -> [255,255,255]
- **Neon**: [0,0,0] -> [80,0,120] -> [200,0,150] -> [255,80,180] -> [255,255,255]

## 4. Interaction

### Paint Brush

`mousePressed()` and `mouseDragged()` drop chemical B at cursor position. Map mouse coordinates to grid coordinates by dividing by 2. Circular brush with radius ~5 cells. Set B=1.0 within the brush area. Works while running or paused.

### Seed Application

Seed presets are applied when:
- Pattern preset is selected (resets grid + applies seed)
- Clear & Reseed button is clicked (resets grid + applies seed)
- Reset button is clicked (resets grid + applies center blob)

### Parameter Morphing

Changing F or k sliders does not reset the grid. The simulation continues with new parameters, allowing users to watch patterns morph in real-time. This is one of the most interesting interactions — dragging kill rate can smoothly transition spots into stripes.

## 5. Hugo Content Page

### File Structure

```
content/reaction-diffusion/
  index.md          — Frontmatter + description
  main.js           — All sketch logic
  preview.png       — Gallery preview (created after implementation)
```

### Frontmatter

```yaml
title: "Reaction-Diffusion"
date: 2026-03-29
description: |
  Gray-Scott reaction-diffusion — two virtual chemicals interact to produce
  organic patterns ranging from cell mitosis to coral growth to labyrinthine
  mazes.
usage: |
  Watch patterns emerge from the center seed. Use pattern presets to explore
  different parameter regimes. Drag F and k sliders to morph patterns in
  real-time. Click the grid to drop more chemical. Try different color palettes.
scripts:
  - "main.js"
controls: |
  [HTML controls — see Section 2]
technical_details: |
  <ul>
    <li>300x300 cell grid, 2 pixels per cell on 600x600 canvas</li>
    <li>Gray-Scott model: two chemicals (A, B) with diffusion and reaction</li>
    <li>Weighted 5-point Laplacian stencil for diffusion</li>
    <li>Direct pixel manipulation via loadPixels/updatePixels</li>
    <li>256-entry precomputed color lookup table for fast palette mapping</li>
  </ul>
```
