# Spirobiomorphs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `spirobiomorphs` p5.js sketch — a Dawkins-style biomorph breeding grid where each specimen is a layered, kaleidoscope-symmetric stack of animated hypotrochoids with palette-driven gradient strokes and multi-band radial masks.

**Architecture:** Single-page Hugo sketch under `content/spirobiomorphs/` with one `main.js` file (matches the existing project pattern). p5.js is loaded by the layout; `Nuglib.*` (built from `src/`) is available globally. Each of the 9 grid cells owns a `p5.Graphics` buffer that animates continuously with a fade-trail technique (alpha black overlay each frame, additive stroke compositing). All breeding logic, mutation, history, and rendering live in `main.js`. Saved specimens persist to `localStorage`.

**Tech Stack:** p5.js 1.x (loaded by Hugo layout), Nuglib (project's TypeScript helper library, especially `time/DeltaTimer` and `color/`), Hugo 0.x (static site generator), vanilla JS for the sketch itself.

**Convention notes:**

- The project does not unit-test sketch code (tests in `tests/` cover Nuglib only). Each rendering task is verified visually via `hugo server` at `localhost:1313/spirobiomorphs/`. Each task's verification step lists what to look for.
- Existing sketches reference: `content/schelling-segregation/`, `content/reaction-diffusion/`, `content/random-walker/`. Match their indentation, comment style, and DOM-wiring patterns.
- All commits use `feat:` / `fix:` / `chore:` / `docs:` Conventional-Commit prefixes (existing repo convention — see `git log --oneline -20`).

---

## File Structure

| Path | Purpose | Created/Modified |
|------|---------|------------------|
| `content/spirobiomorphs/index.md` | Hugo frontmatter: title, description, controls HTML, technical_details | Create |
| `content/spirobiomorphs/main.js` | Entire sketch: genome, mutation, history, rendering, UI wiring | Create |
| `content/spirobiomorphs/preview.png` | Static screenshot for the gallery thumbnail | Create (after sketch is working) |

That's it. No new files in `src/`, no new test files, no layout changes. The Hugo layout under `layouts/_default/` already renders the `controls` and `technical_details` frontmatter fields for any sketch — see how `schelling-segregation` does it.

---

## Task 1: Hugo skeleton — page loads with a dark canvas

**Files:**
- Create: `content/spirobiomorphs/index.md`
- Create: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Create `index.md` with minimal frontmatter**

```markdown
---
title: "Spirobiomorphs"
date: 2026-05-05
description: |
  Dawkins' biomorphs crossed with a Spirograph kaleidoscope. Breed
  layered hypotrochoid specimens by clicking children in a 3x3 grid;
  the clicked child becomes the new parent and 8 fresh mutants spawn.
  Inspired by The Blind Watchmaker (Dawkins, 1986).
usage: |
  Click any child to make it the new parent. Use Back/Forward to
  navigate breeding history. Save favorites to keep them around.
scripts:
  - "main.js"
controls: |
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div id="control-row-buttons"></div>
    <div id="control-row-sliders"></div>
    <div id="status-line" style="font-size: 0.85em; color: #aaa;"></div>
    <div id="saved-strip" style="display: flex; gap: 6px; overflow-x: auto; min-height: 130px;"></div>
  </div>
technical_details: |
  <ul>
    <li><strong>Status:</strong> work in progress.</li>
  </ul>
draft: false
---
```

- [ ] **Step 2: Create `main.js` with empty p5 sketch**

```javascript
// === Spirobiomorphs ===
// Layered hypotrochoid biomorphs bred via Dawkins-style 3x3 selection.

const CANVAS_W = 900;
const CANVAS_H = 900;
const BG = '#0d0d0f';

function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.parent('sketch-holder');
  pixelDensity(1);
  background(BG);
}

function draw() {
  background(BG);
  // (next tasks add specimens here)
}
```

- [ ] **Step 3: Verify in browser**

Run: `hugo server`
Navigate to: `http://localhost:1313/spirobiomorphs/`
Expected: page loads with title "Spirobiomorphs", a 900×900 dark canvas, the empty controls placeholders below it, no console errors.

- [ ] **Step 4: Commit**

```bash
git add content/spirobiomorphs/index.md content/spirobiomorphs/main.js
git commit -m "feat: spirobiomorphs skeleton — page loads with empty dark canvas"
```

---

## Task 2: Render a single static hypotrochoid layer

**Files:**
- Modify: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Add hypotrochoid math + a hardcoded layer renderer**

Replace `main.js` contents with:

```javascript
// === Spirobiomorphs ===
// Layered hypotrochoid biomorphs bred via Dawkins-style 3x3 selection.

const CANVAS_W = 900;
const CANVAS_H = 900;
const BG = '#0d0d0f';

// === Hypotrochoid math ===
// Pen position for a hypotrochoid (small gear of radius r rolling inside
// large gear of radius R, pen offset d from small gear center):
//   x = (R - r) cos(t) + d cos((R-r)/r * t)
//   y = (R - r) sin(t) - d sin((R-r)/r * t)
function hypoPoint(t, R, r, d) {
  const k = R - r;
  return {
    x: k * Math.cos(t) + d * Math.cos((k / r) * t),
    y: k * Math.sin(t) - d * Math.sin((k / r) * t),
  };
}

// Draw a full hypotrochoid layer into `buf`, centered at buf's translate origin.
// `layer` shape (this task): { R, r, d, revs }
function drawLayerStatic(buf, layer) {
  if (layer.r >= layer.R) return; // degenerate, skip
  const steps = 1500;
  buf.stroke(255, 200);
  buf.noFill();
  buf.strokeWeight(1);
  buf.beginShape();
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * layer.revs;
    const p = hypoPoint(t, layer.R, layer.r, layer.d);
    buf.vertex(p.x, p.y);
  }
  buf.endShape();
}

// === Sketch ===
let testBuf;

function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.parent('sketch-holder');
  pixelDensity(1);
  testBuf = createGraphics(280, 280);
  testBuf.translate(140, 140);
  testBuf.background(BG);
  drawLayerStatic(testBuf, { R: 70, r: 21, d: 50, revs: 7 });
}

function draw() {
  background(BG);
  image(testBuf, CANVAS_W / 2 - 140, CANVAS_H / 2 - 140);
}
```

- [ ] **Step 2: Verify in browser**

Reload `http://localhost:1313/spirobiomorphs/`.
Expected: a single rosette-shaped curve visible at the canvas center inside a 280×280 region, drawn with white strokes on a near-black background. Multiple "petals" should be visible (R=70, r=21 gives a distinctive multi-petal hypotrochoid).

- [ ] **Step 3: Commit**

```bash
git add content/spirobiomorphs/main.js
git commit -m "feat: hypotrochoid layer rendering"
```

---

## Task 3: Multi-band radial mask

**Files:**
- Modify: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Replace `drawLayerStatic` with a per-segment, mask-aware version**

Replace the `drawLayerStatic` function from Task 2 with:

```javascript
// Compute the maximum origin-distance the pen can reach for this layer.
// |hypo(t)| <= (R - r) + d, used to derive band period.
function layerMaxRadius(layer) {
  return (layer.R - layer.r) + layer.d;
}

// Mask: divide [0, maxR] into `band_count` equal bands; within each band,
// the first `band_duty` fraction draws and the rest is skipped. `band_phase`
// shifts the pattern (0..band_period).
function isInBand(dist, layer) {
  const maxR = layerMaxRadius(layer);
  const period = maxR / layer.band_count;
  const local = ((dist - layer.band_phase) % period + period) % period;
  return local <= period * layer.band_duty;
}

// `layer` shape (this task): { R, r, d, revs, band_count, band_phase, band_duty }
function drawLayerStatic(buf, layer) {
  if (layer.r >= layer.R) return;
  const steps = 1500;
  buf.stroke(255, 200);
  buf.noFill();
  buf.strokeWeight(1);
  for (let i = 0; i < steps; i++) {
    const t1 = (i / steps) * Math.PI * 2 * layer.revs;
    const t2 = ((i + 1) / steps) * Math.PI * 2 * layer.revs;
    const p1 = hypoPoint(t1, layer.R, layer.r, layer.d);
    const p2 = hypoPoint(t2, layer.R, layer.r, layer.d);
    const midDist = Math.hypot((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    if (isInBand(midDist, layer)) {
      buf.line(p1.x, p1.y, p2.x, p2.y);
    }
  }
}
```

- [ ] **Step 2: Update `setup()` to pass band genes**

Replace the `setup()` body with:

```javascript
function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.parent('sketch-holder');
  pixelDensity(1);
  testBuf = createGraphics(280, 280);
  testBuf.translate(140, 140);
  testBuf.background(BG);
  drawLayerStatic(testBuf, {
    R: 70, r: 21, d: 50, revs: 7,
    band_count: 4, band_phase: 0, band_duty: 0.5,
  });
}
```

- [ ] **Step 3: Verify in browser**

Reload. Expected: same rosette as before, but now drawn only in alternating concentric rings — roughly half drawn, half blank, repeating 4 times from center to outer edge.

- [ ] **Step 4: Try a couple variations**

Briefly change `band_count` to 2 (broader bands) and to 7 (tighter striations), reload between each, confirm the visual changes match expectation. Restore to `band_count: 4`.

- [ ] **Step 5: Commit**

```bash
git add content/spirobiomorphs/main.js
git commit -m "feat: multi-band radial mask for layer rendering"
```

---

## Task 4: Per-layer offset + per-specimen k-fold radial symmetry

**Files:**
- Modify: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Update layer data + introduce a specimen-level draw function**

Add an `offset` property to layer data (distance from cell origin) and a function that draws one specimen — which means looping over `k_outer` rotated copies of all its layers.

Replace `drawLayerStatic` and add `drawSpecimenStatic`:

```javascript
// Renders one layer, rotated by aOuter and translated by `offset` along x.
// (The outer rotation is applied to the whole composition; offset places
// the layer at radius `offset` from origin before stamping.)
function drawLayerInto(buf, layer, aOuter) {
  if (layer.r >= layer.R) return;
  const steps = 1200;
  const cosA = Math.cos(aOuter);
  const sinA = Math.sin(aOuter);
  buf.stroke(255, 200);
  buf.strokeWeight(1);
  for (let i = 0; i < steps; i++) {
    const t1 = (i / steps) * Math.PI * 2 * layer.revs;
    const t2 = ((i + 1) / steps) * Math.PI * 2 * layer.revs;
    const p1 = hypoPoint(t1, layer.R, layer.r, layer.d);
    const p2 = hypoPoint(t2, layer.R, layer.r, layer.d);
    const midDist = Math.hypot((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    if (!isInBand(midDist, layer)) continue;
    // shift by offset along local +x, then rotate by aOuter
    const x1 = p1.x + layer.offset, y1 = p1.y;
    const x2 = p2.x + layer.offset, y2 = p2.y;
    const rx1 = x1 * cosA - y1 * sinA;
    const ry1 = x1 * sinA + y1 * cosA;
    const rx2 = x2 * cosA - y2 * sinA;
    const ry2 = x2 * sinA + y2 * cosA;
    buf.line(rx1, ry1, rx2, ry2);
  }
}

// `specimen` (this task): { k_outer, layers: [...] }
function drawSpecimenStatic(buf, specimen) {
  for (let outer = 0; outer < specimen.k_outer; outer++) {
    const aOuter = (outer / specimen.k_outer) * Math.PI * 2;
    for (const layer of specimen.layers) {
      drawLayerInto(buf, layer, aOuter);
    }
  }
}
```

- [ ] **Step 2: Update `setup()` to render a specimen**

Replace `setup()` body:

```javascript
function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.parent('sketch-holder');
  pixelDensity(1);
  testBuf = createGraphics(280, 280);
  testBuf.translate(140, 140);
  testBuf.background(BG);
  drawSpecimenStatic(testBuf, {
    k_outer: 6,
    layers: [
      { R: 60, r: 17, d: 40, revs: 17, offset: 25, band_count: 4, band_phase: 0, band_duty: 0.5 },
    ],
  });
}
```

- [ ] **Step 3: Verify in browser**

Reload. Expected: a 6-fold radially symmetric kaleidoscope pattern (the layer's rosette stamped 6 times around the center, each copy offset 25 px from origin). Should look distinctly Spirograph-toy-like.

- [ ] **Step 4: Commit**

```bash
git add content/spirobiomorphs/main.js
git commit -m "feat: per-layer offset + k-fold radial symmetry stamping"
```

---

## Task 5: Palette + per-layer gradient + additive blending

**Files:**
- Modify: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Add palette utilities and gradient color sampling**

Add near the top of the file (after the math section):

```javascript
// === Palette ===
// Palette is an array of 4 [H, S, L] triples. H in [0, 360), S/L in [0, 100].
// Layer gradient samples between palette[layer.palette_a] and palette[layer.palette_b]
// linearly along curve parameter t (i / steps).
function sampleGradient(palette, a, b, tNorm) {
  const [h1, s1, l1] = palette[a];
  const [h2, s2, l2] = palette[b];
  // shortest hue path
  let dh = h2 - h1;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const h = (h1 + dh * tNorm + 360) % 360;
  const s = s1 + (s2 - s1) * tNorm;
  const l = l1 + (l2 - l1) * tNorm;
  return [h, s, l];
}
```

- [ ] **Step 2: Update `drawLayerInto` to use the palette gradient**

Replace `drawLayerInto` with:

```javascript
function drawLayerInto(buf, layer, aOuter, palette) {
  if (layer.r >= layer.R) return;
  const steps = 1200;
  const cosA = Math.cos(aOuter);
  const sinA = Math.sin(aOuter);
  buf.colorMode(HSL, 360, 100, 100, 1);
  buf.strokeWeight(1);
  for (let i = 0; i < steps; i++) {
    const tNorm = i / steps;
    const t1 = tNorm * Math.PI * 2 * layer.revs;
    const t2 = ((i + 1) / steps) * Math.PI * 2 * layer.revs;
    const p1 = hypoPoint(t1, layer.R, layer.r, layer.d);
    const p2 = hypoPoint(t2, layer.R, layer.r, layer.d);
    const midDist = Math.hypot((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    if (!isInBand(midDist, layer)) continue;
    const [h, s, l] = sampleGradient(palette, layer.palette_a, layer.palette_b, tNorm);
    buf.stroke(h, s, l, 0.6);
    const x1 = p1.x + layer.offset, y1 = p1.y;
    const x2 = p2.x + layer.offset, y2 = p2.y;
    const rx1 = x1 * cosA - y1 * sinA;
    const ry1 = x1 * sinA + y1 * cosA;
    const rx2 = x2 * cosA - y2 * sinA;
    const ry2 = x2 * sinA + y2 * cosA;
    buf.line(rx1, ry1, rx2, ry2);
  }
}
```

- [ ] **Step 3: Update `drawSpecimenStatic` to pass palette and use additive blend**

Replace `drawSpecimenStatic` with:

```javascript
function drawSpecimenStatic(buf, specimen) {
  buf.blendMode(ADD);
  for (let outer = 0; outer < specimen.k_outer; outer++) {
    const aOuter = (outer / specimen.k_outer) * Math.PI * 2;
    for (const layer of specimen.layers) {
      drawLayerInto(buf, layer, aOuter, specimen.palette);
    }
  }
  buf.blendMode(BLEND);
}
```

- [ ] **Step 4: Update `setup()` to provide a palette and `palette_a/b`**

Replace `setup()` body:

```javascript
function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.parent('sketch-holder');
  pixelDensity(1);
  testBuf = createGraphics(280, 280);
  testBuf.translate(140, 140);
  testBuf.background(BG);
  drawSpecimenStatic(testBuf, {
    k_outer: 6,
    palette: [[30, 80, 65], [340, 60, 60], [200, 70, 55], [80, 60, 55]],
    layers: [
      { R: 60, r: 17, d: 40, revs: 17, offset: 25, band_count: 4, band_phase: 0, band_duty: 0.5,
        palette_a: 0, palette_b: 1 },
    ],
  });
}
```

- [ ] **Step 5: Verify in browser**

Reload. Expected: same kaleidoscope shape as Task 4, but now strokes shift in color from amber (palette[0]) at the start of each stroke arc to magenta (palette[1]) at the end. Where strokes overlap, brightness builds (additive). Background remains dark.

- [ ] **Step 6: Commit**

```bash
git add content/spirobiomorphs/main.js
git commit -m "feat: palette + per-layer gradient strokes with additive blend"
```

---

## Task 6: Multi-layer specimen + per-layer stroke weight

**Files:**
- Modify: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Add `stroke_w` to layer rendering**

Modify `drawLayerInto`'s `buf.strokeWeight(1)` line to use the layer's gene:

```javascript
buf.strokeWeight(layer.stroke_w);
```

- [ ] **Step 2: Update test specimen to use 3 layers with varied stroke weights**

Replace the `setup()` body's `drawSpecimenStatic` call with:

```javascript
drawSpecimenStatic(testBuf, {
  k_outer: 6,
  palette: [[30, 80, 65], [340, 60, 60], [200, 70, 55], [80, 60, 55]],
  layers: [
    { R: 60, r: 17, d: 40, revs: 17, offset: 25, band_count: 4, band_phase: 0, band_duty: 0.5,
      palette_a: 0, palette_b: 1, stroke_w: 0.5 },
    { R: 75, r: 26, d: 30, revs: 13, offset: 10, band_count: 3, band_phase: 0, band_duty: 0.6,
      palette_a: 2, palette_b: 0, stroke_w: 1.5 },
    { R: 50, r: 11, d: 35, revs: 11, offset: 0,  band_count: 2, band_phase: 0, band_duty: 0.7,
      palette_a: 3, palette_b: 1, stroke_w: 2.5 },
  ],
});
```

- [ ] **Step 3: Verify in browser**

Reload. Expected: three stacked layers visible — fine wireframe (0.5 px), medium (1.5 px), and chunky (2.5 px). Colors come from different palette pairs per layer. The composition retains 6-fold symmetry overall.

- [ ] **Step 4: Commit**

```bash
git add content/spirobiomorphs/main.js
git commit -m "feat: multi-layer composition with per-layer stroke weight"
```

---

## Task 7: Animated pen with fade trails

**Files:**
- Modify: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Replace static rendering with per-frame stepped rendering**

This is the biggest rendering change so far. The model: each layer holds its own current `t`. Each frame, advance `t` by `pen_speed * dt * 4` and stroke segments from the previous `t` to the new `t`. Wrap when `t > revs * 2π`. Before stroking, overlay the buffer with a low-alpha black rectangle in BLEND mode to fade old strokes; then switch to ADD mode for the new strokes.

Replace `drawLayerInto` and `drawSpecimenStatic` with the following — and remove `drawLayerStatic` if it's still around:

```javascript
// === Animated rendering ===
// A specimen "instance" tracks per-layer pen state separately from the genome:
//   instance.tPrev[layerIdx] — pen t at last frame
//   instance.t[layerIdx]     — pen t at current frame
// `specimen` is the genome (palette, k_outer, layers). `instance.layerSpeed[i]`
// is a fixed multiplier so different layers don't all march in lockstep.

function makeInstance(specimen) {
  return {
    specimen,
    t: specimen.layers.map(() => 0),
    layerSpeed: specimen.layers.map((_, i) => 1 + i * 0.13), // slight desync
  };
}

const FADE_ALPHA = 12; // 0..255, lower = longer trail
const SEGMENTS_PER_FULL_REV = 240;

function stepInstance(instance, dt, penSpeed, buf) {
  // 1) Fade overlay — must be in BLEND mode so destination is partially erased.
  buf.push();
  buf.resetMatrix();
  buf.blendMode(BLEND);
  buf.noStroke();
  buf.fill(0, 0, 0, FADE_ALPHA);
  buf.rect(0, 0, buf.width, buf.height);
  buf.pop();

  // 2) Stroke new segments in ADD mode.
  buf.blendMode(ADD);
  buf.colorMode(HSL, 360, 100, 100, 1);
  const { specimen } = instance;
  for (let li = 0; li < specimen.layers.length; li++) {
    const layer = specimen.layers[li];
    if (layer.r >= layer.R) continue;
    const totalT = layer.revs * Math.PI * 2;
    const tPrev = instance.t[li];
    let tNext = tPrev + dt * penSpeed * instance.layerSpeed[li] * 4;
    // Number of mini-segments to stroke this frame, proportional to angle covered.
    const segCount = Math.max(1, Math.ceil((tNext - tPrev) / (Math.PI * 2) * SEGMENTS_PER_FULL_REV));
    for (let s = 0; s < segCount; s++) {
      const tA = tPrev + (s / segCount) * (tNext - tPrev);
      const tB = tPrev + ((s + 1) / segCount) * (tNext - tPrev);
      // wrap each end independently to [0, totalT]
      const wA = ((tA % totalT) + totalT) % totalT;
      const wB = ((tB % totalT) + totalT) % totalT;
      // skip the wrap-around segment (don't draw a chord across the wrap)
      if (wB < wA) continue;
      strokeSegment(buf, layer, specimen, wA, wB);
    }
    instance.t[li] = tNext > totalT ? tNext - totalT : tNext;
  }
  buf.blendMode(BLEND);
}

function strokeSegment(buf, layer, specimen, tA, tB) {
  const totalT = layer.revs * Math.PI * 2;
  const tNormA = tA / totalT;
  const p1 = hypoPoint(tA, layer.R, layer.r, layer.d);
  const p2 = hypoPoint(tB, layer.R, layer.r, layer.d);
  const midDist = Math.hypot((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  if (!isInBand(midDist, layer)) return;
  const [h, s, l] = sampleGradient(specimen.palette, layer.palette_a, layer.palette_b, tNormA);
  buf.stroke(h, s, l, 0.55);
  buf.strokeWeight(layer.stroke_w);
  for (let outer = 0; outer < specimen.k_outer; outer++) {
    const aOuter = (outer / specimen.k_outer) * Math.PI * 2;
    const cosA = Math.cos(aOuter);
    const sinA = Math.sin(aOuter);
    const x1 = p1.x + layer.offset, y1 = p1.y;
    const x2 = p2.x + layer.offset, y2 = p2.y;
    const rx1 = x1 * cosA - y1 * sinA;
    const ry1 = x1 * sinA + y1 * cosA;
    const rx2 = x2 * cosA - y2 * sinA;
    const ry2 = x2 * sinA + y2 * cosA;
    buf.line(rx1 + buf.width / 2, ry1 + buf.height / 2, rx2 + buf.width / 2, ry2 + buf.height / 2);
  }
}
```

- [ ] **Step 2: Update `setup()` and `draw()` to drive the animation**

Replace the sketch driver section at the bottom with:

```javascript
let testBuf;
let testInstance;
let lastFrameMs = 0;

function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.parent('sketch-holder');
  pixelDensity(1);
  testBuf = createGraphics(280, 280);
  testBuf.background(BG);
  testInstance = makeInstance({
    k_outer: 6,
    palette: [[30, 80, 65], [340, 60, 60], [200, 70, 55], [80, 60, 55]],
    layers: [
      { R: 60, r: 17, d: 40, revs: 17, offset: 25, band_count: 4, band_phase: 0, band_duty: 0.5,
        palette_a: 0, palette_b: 1, stroke_w: 0.5 },
      { R: 75, r: 26, d: 30, revs: 13, offset: 10, band_count: 3, band_phase: 0, band_duty: 0.6,
        palette_a: 2, palette_b: 0, stroke_w: 1.5 },
      { R: 50, r: 11, d: 35, revs: 11, offset: 0,  band_count: 2, band_phase: 0, band_duty: 0.7,
        palette_a: 3, palette_b: 1, stroke_w: 2.5 },
    ],
  });
  lastFrameMs = millis();
}

function draw() {
  background(BG);
  const now = millis();
  const dt = Math.min(0.1, (now - lastFrameMs) / 1000); // clamp first-frame spike
  lastFrameMs = now;
  stepInstance(testInstance, dt, 1.0, testBuf);
  image(testBuf, CANVAS_W / 2 - 140, CANVAS_H / 2 - 140);
}
```

- [ ] **Step 3: Verify in browser**

Reload. Expected: the kaleidoscope draws itself over time, with older strokes fading. After ~5 seconds the full pattern is visible; fade is gradual. The animation should "breathe" — pen wraps around, redraws, old strokes always being slowly erased. No visible stutter at 60fps.

- [ ] **Step 4: Commit**

```bash
git add content/spirobiomorphs/main.js
git commit -m "feat: animated pen with fade trails and additive glow"
```

---

## Task 8: Specimen class + 3×3 grid

**Files:**
- Modify: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Introduce a `Specimen` class wrapping genome + buffer + state**

Replace the `makeInstance` / `stepInstance` pair with a class. Keep `strokeSegment` as is.

Add (replace the animated rendering section):

```javascript
// === Specimen ===
const CELL_PX = 280;

class Specimen {
  constructor(genome) {
    this.genome = genome;
    this.buffer = createGraphics(CELL_PX, CELL_PX);
    this.buffer.background(BG);
    this.t = genome.layers.map(() => 0);
    this.layerSpeed = genome.layers.map((_, i) => 1 + i * 0.13);
  }
  resetBuffer() {
    this.buffer.background(BG);
    this.t = this.genome.layers.map(() => 0);
  }
  step(dt, penSpeed) {
    const buf = this.buffer;
    buf.push();
    buf.resetMatrix();
    buf.blendMode(BLEND);
    buf.noStroke();
    buf.fill(0, 0, 0, FADE_ALPHA);
    buf.rect(0, 0, buf.width, buf.height);
    buf.pop();
    buf.blendMode(ADD);
    buf.colorMode(HSL, 360, 100, 100, 1);
    const g = this.genome;
    for (let li = 0; li < g.layers.length; li++) {
      const layer = g.layers[li];
      if (layer.r >= layer.R) continue;
      const totalT = layer.revs * Math.PI * 2;
      const tPrev = this.t[li];
      let tNext = tPrev + dt * penSpeed * this.layerSpeed[li] * 4;
      const segCount = Math.max(1, Math.ceil((tNext - tPrev) / (Math.PI * 2) * SEGMENTS_PER_FULL_REV));
      for (let s = 0; s < segCount; s++) {
        const tA = tPrev + (s / segCount) * (tNext - tPrev);
        const tB = tPrev + ((s + 1) / segCount) * (tNext - tPrev);
        const wA = ((tA % totalT) + totalT) % totalT;
        const wB = ((tB % totalT) + totalT) % totalT;
        if (wB < wA) continue;
        strokeSegment(buf, layer, g, wA, wB);
      }
      this.t[li] = tNext > totalT ? tNext - totalT : tNext;
    }
    buf.blendMode(BLEND);
  }
  render(x, y) {
    image(this.buffer, x, y);
  }
}
```

- [ ] **Step 2: Replace driver with a 3×3 grid of specimens**

Replace the `setup()` / `draw()` section with:

```javascript
const GRID = 3;
const GUTTER = 30;
const GRID_ORIGIN = (CANVAS_W - GRID * CELL_PX - (GRID - 1) * GUTTER) / 2;

function cellPosition(col, row) {
  return {
    x: GRID_ORIGIN + col * (CELL_PX + GUTTER),
    y: GRID_ORIGIN + row * (CELL_PX + GUTTER),
  };
}

// Produces a hand-written placeholder genome with mild variation per cell.
// Real random/curated/mutate land in the next task — this is just so the grid
// shows 9 distinct things for verification.
function placeholderGenome(seed) {
  return {
    k_outer: 4 + (seed % 5),
    palette: [[30, 80, 65], [340, 60, 60], [200, 70, 55], [80, 60, 55]],
    layers: [
      { R: 60 + (seed * 3) % 30, r: 17, d: 40, revs: 11 + (seed % 7), offset: 25,
        band_count: 3, band_phase: 0, band_duty: 0.5,
        palette_a: seed % 4, palette_b: (seed + 1) % 4, stroke_w: 1 },
    ],
  };
}

let specimens = [];
let lastFrameMs = 0;

function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.parent('sketch-holder');
  pixelDensity(1);
  for (let i = 0; i < 9; i++) {
    specimens.push(new Specimen(placeholderGenome(i)));
  }
  lastFrameMs = millis();
}

function draw() {
  background(BG);
  const now = millis();
  const dt = Math.min(0.1, (now - lastFrameMs) / 1000);
  lastFrameMs = now;
  for (let i = 0; i < 9; i++) {
    const col = i % GRID;
    const row = Math.floor(i / GRID);
    specimens[i].step(dt, 1.0);
    const pos = cellPosition(col, row);
    specimens[i].render(pos.x, pos.y);
    // parent indicator
    if (col === 1 && row === 1) {
      noFill();
      stroke(180, 180, 180, 200);
      strokeWeight(2);
      rect(pos.x - 2, pos.y - 2, CELL_PX + 4, CELL_PX + 4);
    }
  }
}
```

- [ ] **Step 3: Verify in browser**

Reload. Expected: a 3×3 grid of 9 distinct kaleidoscope specimens animating in parallel, with the center cell highlighted by a thin gray border. All 9 should breathe smoothly. Performance: 60 fps on a recent laptop.

- [ ] **Step 4: Commit**

```bash
git add content/spirobiomorphs/main.js
git commit -m "feat: Specimen class and 3x3 animated grid"
```

---

## Task 9: Genome — gene metadata, randomGenome, curatedSeedGenome, mutate, fingerprint

**Files:**
- Modify: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Define gene metadata and a seedable RNG**

Add a new section near the top of the file (after the math, before the rendering code):

```javascript
// === RNG ===
// Seeded RNG (mulberry32) so breeding history is reproducible.
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngInt(rng, lo, hi) { return Math.floor(rng() * (hi - lo + 1)) + lo; }
function rngFloat(rng, lo, hi) { return rng() * (hi - lo) + lo; }
function rngPick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function rngSign(rng) { return rng() < 0.5 ? -1 : 1; }

// === Gene metadata ===
// type: 'int' | 'qfloat' | 'cfloat' (continuous float)
// range: [min, max] inclusive
// step: amount per ±1 mutation (defined for qfloat/int; cfloat uses 5% of range)
const SPECIMEN_GENES = [
  { name: 'k_outer',  type: 'int', range: [1, 12] },
  { name: 'n_layers', type: 'int', range: [1, 5] },
];
// palette: 4 slots × (H, S, L). Treated as a flat list of 12 cfloat genes for mutation.
const PALETTE_SLOTS = 4;
const PALETTE_GENE_DEFS = [
  { name: 'H', type: 'cfloat', range: [0, 360] },
  { name: 'S', type: 'cfloat', range: [0, 100] },
  { name: 'L', type: 'cfloat', range: [0, 100] },
];

const LAYER_GENES = [
  { name: 'R',          type: 'int',    range: [20, 120] },
  { name: 'r',          type: 'int',    range: [5, 60]   },
  { name: 'd',          type: 'int',    range: [1, 80]   },
  { name: 'revs',       type: 'int',    range: [1, 30]   },
  { name: 'offset',     type: 'cfloat', range: [0, 60]   },
  { name: 'band_count', type: 'int',    range: [1, 8]    },
  { name: 'band_phase', type: 'cfloat', range: [0, 1]    }, // normalized 0..1, multiplied by band period at render
  { name: 'band_duty',  type: 'qfloat', range: [0.1, 0.9], step: 0.1 },
  { name: 'palette_a',  type: 'int',    range: [0, 3]    },
  { name: 'palette_b',  type: 'int',    range: [0, 3]    },
  { name: 'stroke_w',   type: 'qfloat', range: [0.5, 4.0], step: 0.5 },
];
```

- [ ] **Step 2: Update `isInBand` to use normalized band_phase**

Because we changed `band_phase` to a normalized 0..1 value (so its mutation range is meaningful regardless of layer scale), update `isInBand`:

```javascript
function isInBand(dist, layer) {
  const maxR = layerMaxRadius(layer);
  const period = maxR / layer.band_count;
  const phase = layer.band_phase * period;
  const local = ((dist - phase) % period + period) % period;
  return local <= period * layer.band_duty;
}
```

- [ ] **Step 3: Implement `randomGenome`, `curatedSeedGenome`, `mutate`, `fingerprint`**

Add this section right after the gene metadata:

```javascript
// === Genome ops ===
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function randomGenome(rng) {
  const palette = [];
  for (let i = 0; i < PALETTE_SLOTS; i++) {
    palette.push([
      rngFloat(rng, 0, 360),
      rngFloat(rng, 30, 90),
      rngFloat(rng, 30, 75),
    ]);
  }
  const n = rngInt(rng, 1, 5);
  const layers = [];
  for (let i = 0; i < n; i++) layers.push(randomLayer(rng));
  return {
    k_outer: rngInt(rng, 1, 12),
    n_layers: n,
    palette,
    layers,
  };
}

function randomLayer(rng) {
  const layer = {};
  for (const g of LAYER_GENES) {
    if (g.type === 'int') layer[g.name] = rngInt(rng, g.range[0], g.range[1]);
    else if (g.type === 'qfloat') {
      const steps = Math.round((g.range[1] - g.range[0]) / g.step);
      layer[g.name] = g.range[0] + rngInt(rng, 0, steps) * g.step;
    } else {
      layer[g.name] = rngFloat(rng, g.range[0], g.range[1]);
    }
  }
  // sanity: ensure r < R (otherwise layer renders nothing)
  if (layer.r >= layer.R) layer.r = Math.max(5, layer.R - 5);
  return layer;
}

// "Curated" seed: tighter ranges so the initial parent is plausible, not noise.
function curatedSeedGenome(rng) {
  const palette = [];
  for (let i = 0; i < PALETTE_SLOTS; i++) {
    palette.push([
      rngFloat(rng, 0, 360),
      rngFloat(rng, 50, 80),
      rngFloat(rng, 45, 65),
    ]);
  }
  const n = rngInt(rng, 2, 3);
  const layers = [];
  for (let i = 0; i < n; i++) {
    layers.push({
      R: rngInt(rng, 50, 90),
      r: rngInt(rng, 12, 30),
      d: rngInt(rng, 25, 55),
      revs: rngInt(rng, 7, 17),
      offset: rngFloat(rng, 0, 30),
      band_count: rngInt(rng, 2, 5),
      band_phase: rngFloat(rng, 0, 1),
      band_duty: 0.5,
      palette_a: rngInt(rng, 0, 3),
      palette_b: rngInt(rng, 0, 3),
      stroke_w: 1.0,
    });
  }
  return { k_outer: rngInt(rng, 4, 8), n_layers: n, palette, layers };
}

// Returns a flat list of {scope, layerIdx, name, geneDef} entries that mutation
// picks from uniformly. Only ACTIVE genes are listed (layers beyond n_layers
// are excluded).
function activeGeneList(genome) {
  const list = [];
  for (const g of SPECIMEN_GENES) list.push({ scope: 'specimen', name: g.name, def: g });
  for (let p = 0; p < PALETTE_SLOTS; p++) {
    for (const g of PALETTE_GENE_DEFS) list.push({ scope: 'palette', slot: p, name: g.name, def: g });
  }
  for (let li = 0; li < genome.n_layers; li++) {
    for (const g of LAYER_GENES) list.push({ scope: 'layer', layerIdx: li, name: g.name, def: g });
  }
  return list;
}

function mutateGene(genome, entry, rng) {
  const { def, scope } = entry;
  const sign = rngSign(rng);
  if (scope === 'specimen') {
    if (entry.name === 'n_layers') {
      // special: ±1, with structural side effect
      const cur = genome.n_layers;
      const next = clamp(cur + sign, def.range[0], def.range[1]);
      if (next > cur) {
        // append a "neutral" layer (median of each gene's range)
        const layer = {};
        for (const lg of LAYER_GENES) {
          if (lg.type === 'int') layer[lg.name] = Math.round((lg.range[0] + lg.range[1]) / 2);
          else if (lg.type === 'qfloat') {
            const steps = Math.round((lg.range[1] - lg.range[0]) / lg.step);
            layer[lg.name] = lg.range[0] + Math.round(steps / 2) * lg.step;
          } else layer[lg.name] = (lg.range[0] + lg.range[1]) / 2;
        }
        if (layer.r >= layer.R) layer.r = Math.max(5, layer.R - 5);
        genome.layers.push(layer);
      } else if (next < cur) {
        genome.layers.pop();
      }
      genome.n_layers = next;
      return;
    }
    genome[entry.name] = clamp(genome[entry.name] + sign, def.range[0], def.range[1]);
    return;
  }
  if (scope === 'palette') {
    const slot = genome.palette[entry.slot];
    const idx = entry.name === 'H' ? 0 : entry.name === 'S' ? 1 : 2;
    const step = (def.range[1] - def.range[0]) * 0.05;
    if (entry.name === 'H') slot[idx] = (slot[idx] + sign * step + 360) % 360;
    else slot[idx] = clamp(slot[idx] + sign * step, def.range[0], def.range[1]);
    return;
  }
  if (scope === 'layer') {
    const layer = genome.layers[entry.layerIdx];
    if (def.type === 'int') {
      layer[entry.name] = clamp(layer[entry.name] + sign, def.range[0], def.range[1]);
      // keep r < R for renderability
      if (entry.name === 'r' && layer.r >= layer.R) layer.r = layer.R - 1;
    } else if (def.type === 'qfloat') {
      layer[entry.name] = clamp(
        Math.round((layer[entry.name] + sign * def.step) / def.step) * def.step,
        def.range[0], def.range[1]
      );
    } else {
      const step = (def.range[1] - def.range[0]) * 0.05;
      layer[entry.name] = clamp(layer[entry.name] + sign * step, def.range[0], def.range[1]);
    }
  }
}

// Returns a deep copy of `parent` with N mutations applied using `rng`.
function mutate(parent, n, rng) {
  const child = JSON.parse(JSON.stringify(parent));
  for (let i = 0; i < n; i++) {
    const list = activeGeneList(child);
    const entry = list[Math.floor(rng() * list.length)];
    mutateGene(child, entry, rng);
  }
  return child;
}

// 32-bit FNV-1a hash → 4-char hex.
function fingerprint(genome) {
  const json = JSON.stringify(genome, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v);
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) & 0xffff).toString(16).padStart(4, '0');
}
```

- [ ] **Step 4: Wire up real genome generation in `setup()`**

Replace the `setup()` body (specifically the specimen-creation loop) with:

```javascript
const initialSeed = (Math.random() * 0xffffffff) >>> 0;
const seedRng = makeRng(initialSeed);
const parentGenome = curatedSeedGenome(seedRng);
const childRng = makeRng((initialSeed + 1) >>> 0);
const grid = new Array(9);
grid[4] = new Specimen(parentGenome);
let childIdx = 0;
for (let i = 0; i < 9; i++) {
  if (i === 4) continue;
  grid[i] = new Specimen(mutate(parentGenome, 1, childRng));
  childIdx++;
}
specimens = grid;
```

(Remove the old `placeholderGenome` and the `for (let i = 0; i < 9; i++)` loop that used it.)

- [ ] **Step 5: Verify in browser**

Reload several times. Expected: each load shows a coherent parent in the center and 8 visibly-related-but-distinct children around it. Consecutive children should differ from the parent by what looks like one gene change (one different color, one different layer count, etc.). The sketch should not crash on edge cases (degenerate `r ≥ R` is handled by skipping that layer's draw).

- [ ] **Step 6: Commit**

```bash
git add content/spirobiomorphs/main.js
git commit -m "feat: gene metadata, random/curated genomes, mutation, fingerprint"
```

---

## Task 10: Click-to-breed (no animation yet)

**Files:**
- Modify: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Add hit-testing and a `breed()` function**

Add to `main.js` after the `Specimen` class:

```javascript
// === Breeding ===
let parentSeed = null;       // RNG seed used to generate the current 8 children
let parentGenome = null;
let mutationsPerOffspring = 1;

function rebuildChildren() {
  const rng = makeRng(parentSeed);
  for (let i = 0; i < 9; i++) {
    if (i === 4) continue;
    specimens[i] = new Specimen(mutate(parentGenome, mutationsPerOffspring, rng));
  }
}

function setParent(genome) {
  parentGenome = genome;
  parentSeed = (Math.random() * 0xffffffff) >>> 0;
  specimens[4] = new Specimen(parentGenome);
  rebuildChildren();
}

function breedFromCell(cellIdx) {
  if (cellIdx === 4) return; // clicking parent is no-op
  setParent(specimens[cellIdx].genome);
}

function cellAt(mx, my) {
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const pos = cellPosition(col, row);
      if (mx >= pos.x && mx < pos.x + CELL_PX && my >= pos.y && my < pos.y + CELL_PX) {
        return row * GRID + col;
      }
    }
  }
  return -1;
}

function mousePressed() {
  const idx = cellAt(mouseX, mouseY);
  if (idx >= 0) breedFromCell(idx);
}
```

- [ ] **Step 2: Refactor `setup()` to use `setParent`**

Replace the genome wiring at the bottom of `setup()` (the block from Task 9 step 4) with:

```javascript
specimens = new Array(9);
const seedRng = makeRng((Math.random() * 0xffffffff) >>> 0);
setParent(curatedSeedGenome(seedRng));
```

- [ ] **Step 3: Verify in browser**

Reload. Click a child (any non-center cell). Expected: that child's genome becomes the new parent (now visible in the center, with its own animation restarted) and 8 fresh mutants appear in the surrounding cells. Click a child again — repeats. Click the center — nothing happens.

- [ ] **Step 4: Commit**

```bash
git add content/spirobiomorphs/main.js
git commit -m "feat: click a child to breed from it"
```

---

## Task 11: Deterministic history stack with Back/Forward

**Files:**
- Modify: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Add history stack**

Replace the breeding section's globals with:

```javascript
// History entry: { genome, seed }. The seed is the RNG used to mutate
// children — storing it makes navigation deterministic (same parent +
// same seed → same children).
let history = [];      // committed past parents (oldest at index 0)
let historyForward = []; // entries undone by Back, available for Forward
let parentGenome = null;
let parentSeed = null;
let mutationsPerOffspring = 1;
```

- [ ] **Step 2: Update `setParent` and `breedFromCell` to push/clear history**

```javascript
function commitParent(genome, seed) {
  parentGenome = genome;
  parentSeed = seed;
  specimens[4] = new Specimen(genome);
  rebuildChildren();
  updateStatus(); // defined in a later task; safe to call (will be a no-op if undefined)
}

function setParent(genome) {
  // brand-new parent (initial, reset, random) — clears forward history
  if (parentGenome) history.push({ genome: parentGenome, seed: parentSeed });
  historyForward.length = 0;
  commitParent(genome, (Math.random() * 0xffffffff) >>> 0);
}

function breedFromCell(cellIdx) {
  if (cellIdx === 4) return;
  // push current parent to history before changing
  history.push({ genome: parentGenome, seed: parentSeed });
  historyForward.length = 0;
  commitParent(specimens[cellIdx].genome, (Math.random() * 0xffffffff) >>> 0);
}

function goBack() {
  if (history.length === 0) return;
  historyForward.push({ genome: parentGenome, seed: parentSeed });
  const prev = history.pop();
  commitParent(prev.genome, prev.seed);
}

function goForward() {
  if (historyForward.length === 0) return;
  history.push({ genome: parentGenome, seed: parentSeed });
  const next = historyForward.pop();
  commitParent(next.genome, next.seed);
}
```

Replace the previous `setParent` definition entirely with the version above.

- [ ] **Step 3: Add a temporary `updateStatus` shim and Back/Forward buttons**

At the bottom of `setup()`, build the buttons in `#control-row-buttons`:

```javascript
function updateStatus() { /* implemented in a later task */ }

function buildControls() {
  const buttonRow = document.getElementById('control-row-buttons');
  buttonRow.innerHTML = '';
  const mkBtn = (label, onClick, id) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = 'control-button';
    b.id = id;
    b.addEventListener('click', onClick);
    buttonRow.appendChild(b);
    return b;
  };
  mkBtn('◀ Back',    goBack,    'back-btn');
  mkBtn('Forward ▶', goForward, 'forward-btn');
}
```

Then in `setup()`, after `setParent(...)`, call `buildControls();`.

- [ ] **Step 4: Verify in browser**

Reload. Breed by clicking children a few times. Press Back — center should revert to the previous parent, with the same 8 children that were shown before. Press Forward — moves you back along that chain. Press Back to root, then Forward to head, then breed a different child — Forward stack should clear (no zombie redo).

- [ ] **Step 5: Commit**

```bash
git add content/spirobiomorphs/main.js
git commit -m "feat: deterministic breeding history with Back/Forward"
```

---

## Task 12: Reset, Random, mutation-rate slider, pen-speed slider, status line

**Files:**
- Modify: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Add Reset and Random buttons + sliders**

Replace `buildControls()` with:

```javascript
let penSpeed = 1.0;

function buildControls() {
  const buttonRow = document.getElementById('control-row-buttons');
  buttonRow.innerHTML = '';
  const mkBtn = (label, onClick, id) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = 'control-button';
    b.id = id;
    b.addEventListener('click', onClick);
    buttonRow.appendChild(b);
    return b;
  };
  mkBtn('◀ Back',         goBack,                   'back-btn');
  mkBtn('Forward ▶',      goForward,                'forward-btn');
  mkBtn('Reset',          () => doReset(),          'reset-btn');
  mkBtn('Random',         () => doRandom(),         'random-btn');
  mkBtn('💾 Save Parent', () => savePinned(),       'save-btn');

  const sliderRow = document.getElementById('control-row-sliders');
  sliderRow.innerHTML = `
    <label>Mutations per offspring: <span id="mut-value">1</span></label>
    <input type="range" id="mut-slider" class="control-slider" min="1" max="5" value="1">
    <label>Pen speed: <span id="speed-value">1.0×</span></label>
    <input type="range" id="speed-slider" class="control-slider" min="25" max="400" value="100">
  `;
  const mutSlider = document.getElementById('mut-slider');
  const mutValue  = document.getElementById('mut-value');
  mutSlider.addEventListener('input', () => {
    mutationsPerOffspring = parseInt(mutSlider.value, 10);
    mutValue.textContent = mutationsPerOffspring;
    rebuildChildren();
  });
  const speedSlider = document.getElementById('speed-slider');
  const speedValue  = document.getElementById('speed-value');
  speedSlider.addEventListener('input', () => {
    penSpeed = parseInt(speedSlider.value, 10) / 100;
    speedValue.textContent = penSpeed.toFixed(2) + '×';
  });
}

function doReset() {
  history.length = 0;
  historyForward.length = 0;
  parentGenome = null;
  parentSeed = null;
  const seedRng = makeRng((Math.random() * 0xffffffff) >>> 0);
  setParent(curatedSeedGenome(seedRng));
}

function doRandom() {
  const seedRng = makeRng((Math.random() * 0xffffffff) >>> 0);
  setParent(randomGenome(seedRng));
}

function savePinned() { /* implemented in next task */ }
```

- [ ] **Step 2: Pass `penSpeed` to `step()` calls**

In `draw()`, change `specimens[i].step(dt, 1.0);` to `specimens[i].step(dt, penSpeed);`.

- [ ] **Step 3: Implement the status line**

Replace `function updateStatus() { /* implemented in a later task */ }` with:

```javascript
function updateStatus() {
  const el = document.getElementById('status-line');
  if (!el || !parentGenome) return;
  el.textContent = `Generation: ${history.length}  ·  Layers: ${parentGenome.n_layers}  ·  k=${parentGenome.k_outer}  ·  fingerprint: ${fingerprint(parentGenome)}`;
  document.getElementById('back-btn').disabled = history.length === 0;
  document.getElementById('forward-btn').disabled = historyForward.length === 0;
}
```

- [ ] **Step 4: Verify in browser**

Reload. The status line should show "Generation: 0", a layer count, k value, and a 4-char fingerprint. Breed a few times — generation count climbs, fingerprint changes. Move the mutations slider to 5; new mutations should be more dramatic. Move pen-speed to 0.25× — animation slows; to 4× — animation speeds. Press Reset — fresh seed, generation drops to 0, history cleared. Press Random — full re-roll. Back/Forward buttons gray out at the boundaries.

- [ ] **Step 5: Commit**

```bash
git add content/spirobiomorphs/main.js
git commit -m "feat: Reset, Random, mutation-rate slider, pen-speed slider, status line"
```

---

## Task 13: Save Parent + saved gallery strip with localStorage

**Files:**
- Modify: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Implement `savePinned`, gallery rendering, localStorage I/O**

Add:

```javascript
// === Saved gallery ===
const STORAGE_KEY = 'spirobiomorphs:saved';
const THUMB_PX = 120;

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function persistSaved(arr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch {}
}

function savePinned() {
  if (!parentGenome) return;
  const arr = loadSaved();
  arr.push(JSON.parse(JSON.stringify(parentGenome)));
  persistSaved(arr);
  renderSavedStrip();
}

// Render a static thumbnail by stepping a Specimen long enough that the
// pen has traced the full path at least once for every layer.
function renderThumbnail(genome) {
  const tmpSpecimen = new Specimen(genome);
  // Discard the default 280x280 buffer; replace with a thumb-sized one.
  tmpSpecimen.buffer.remove();
  tmpSpecimen.buffer = createGraphics(THUMB_PX, THUMB_PX);
  tmpSpecimen.buffer.background(BG);
  // Run enough simulated frames so each layer completes at least one pass.
  // Using a large dt per step compresses time. ~120 steps at dt=0.1 = sim 12s.
  for (let i = 0; i < 120; i++) tmpSpecimen.step(0.1, 1.0);
  const url = tmpSpecimen.buffer.canvas.toDataURL('image/png');
  tmpSpecimen.buffer.remove();
  return url;
}

function renderSavedStrip() {
  const strip = document.getElementById('saved-strip');
  strip.innerHTML = '';
  const arr = loadSaved();
  arr.forEach((genome, idx) => {
    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    wrap.style.cursor = 'pointer';
    wrap.style.flex = '0 0 auto';
    wrap.title = `fingerprint: ${fingerprint(genome)}`;
    const img = document.createElement('img');
    img.src = renderThumbnail(genome);
    img.style.width = THUMB_PX + 'px';
    img.style.height = THUMB_PX + 'px';
    img.style.borderRadius = '6px';
    img.style.display = 'block';
    img.addEventListener('click', () => setParent(JSON.parse(JSON.stringify(genome))));
    const xBtn = document.createElement('button');
    xBtn.textContent = '×';
    xBtn.style.position = 'absolute';
    xBtn.style.top = '4px';
    xBtn.style.right = '4px';
    xBtn.style.opacity = '0';
    xBtn.style.transition = 'opacity 0.2s';
    xBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const updated = loadSaved();
      updated.splice(idx, 1);
      persistSaved(updated);
      renderSavedStrip();
    });
    wrap.addEventListener('mouseenter', () => xBtn.style.opacity = '1');
    wrap.addEventListener('mouseleave', () => xBtn.style.opacity = '0');
    wrap.appendChild(img);
    wrap.appendChild(xBtn);
    strip.appendChild(wrap);
  });
}
```

- [ ] **Step 2: Call `renderSavedStrip()` in `setup()`**

At the end of `setup()` (after `buildControls()`), add `renderSavedStrip();`.

- [ ] **Step 3: Verify in browser**

Reload. Press 💾 Save Parent. A 120×120 thumbnail should appear in the strip below the controls. Reload the page — the thumbnail persists. Click the thumbnail — that specimen becomes the new parent (with breeding history pushed). Hover over the thumbnail — an × appears in the top-right; click to remove. Save several specimens, fill the strip, scroll horizontally if it overflows.

- [ ] **Step 4: Commit**

```bash
git add content/spirobiomorphs/main.js
git commit -m "feat: Save Parent and saved gallery strip with localStorage"
```

---

## Task 14: Keyboard shortcuts + smooth click animation

**Files:**
- Modify: `content/spirobiomorphs/main.js`

- [ ] **Step 1: Add keyboard handler**

Add (replacing/adding next to `mousePressed`):

```javascript
function keyPressed() {
  // Numpad-layout grid mapping: 7 8 9 / 4 5 6 / 1 2 3
  const numpadMap = { '7': 0, '8': 1, '9': 2, '4': 3, '5': 4, '6': 5, '1': 6, '2': 7, '3': 8 };
  if (numpadMap[key] !== undefined) { breedFromCell(numpadMap[key]); return; }
  if (key === 'z' || key === 'Z') { goBack(); return; }
  if (key === 'x' || key === 'X') { goForward(); return; }
  if (key === 'r' || key === 'R') { doReset(); return; }
  if (key === 'n' || key === 'N') { doRandom(); return; }
  if (key === 's' || key === 'S') { savePinned(); return; }
  if (key === '+' || key === '=') {
    const sl = document.getElementById('mut-slider');
    sl.value = Math.min(5, parseInt(sl.value, 10) + 1);
    sl.dispatchEvent(new Event('input'));
    return;
  }
  if (key === '-' || key === '_') {
    const sl = document.getElementById('mut-slider');
    sl.value = Math.max(1, parseInt(sl.value, 10) - 1);
    sl.dispatchEvent(new Event('input'));
    return;
  }
}
```

- [ ] **Step 2: Add a click slide-to-center animation**

The simple version: when a child is bred, capture the source cell's position, the target (center) position, and animate `image()` rendering during a ~300 ms transition. During the transition, the new parent buffer fades in from 0 alpha; the clicked child slides toward center; remaining old children fade out.

Add a transition state object:

```javascript
let transition = null; // { fromCol, fromRow, durationMs, elapsedMs }

function startTransition(fromIdx) {
  transition = {
    fromCol: fromIdx % GRID,
    fromRow: Math.floor(fromIdx / GRID),
    durationMs: 300,
    elapsedMs: 0,
  };
}
```

Modify `breedFromCell` to start a transition before swapping (capture the source genome first, since `commitParent` will overwrite specimens):

```javascript
function breedFromCell(cellIdx) {
  if (cellIdx === 4) return;
  history.push({ genome: parentGenome, seed: parentSeed });
  historyForward.length = 0;
  const newParentGenome = specimens[cellIdx].genome;
  startTransition(cellIdx);
  commitParent(newParentGenome, (Math.random() * 0xffffffff) >>> 0);
}
```

Modify `draw()` so that when `transition` is active, the new parent is drawn at the interpolated position (sliding from source to center) and at fading-in alpha:

```javascript
function draw() {
  background(BG);
  const now = millis();
  const dt = Math.min(0.1, (now - lastFrameMs) / 1000);
  lastFrameMs = now;
  if (transition) {
    transition.elapsedMs += dt * 1000;
    if (transition.elapsedMs >= transition.durationMs) transition = null;
  }
  for (let i = 0; i < 9; i++) {
    const col = i % GRID;
    const row = Math.floor(i / GRID);
    specimens[i].step(dt, penSpeed);
    let pos = cellPosition(col, row);
    let tintAlpha = 255;
    if (transition) {
      const u = Math.min(1, transition.elapsedMs / transition.durationMs);
      // children other than parent fade out as transition runs
      if (i !== 4) tintAlpha = 255 * (1 - u * 0.6);
      // the parent slides from the source cell into the center as it appears
      if (i === 4) {
        const src = cellPosition(transition.fromCol, transition.fromRow);
        const dst = cellPosition(1, 1);
        pos = { x: src.x + (dst.x - src.x) * u, y: src.y + (dst.y - src.y) * u };
        tintAlpha = 255 * u;
      }
    }
    if (tintAlpha < 255) {
      tintImage(specimens[i], pos.x, pos.y, tintAlpha);
    } else {
      specimens[i].render(pos.x, pos.y);
    }
    if (i === 4 && !transition) {
      push();
      noFill(); stroke(180, 180, 180, 200); strokeWeight(2);
      rect(pos.x - 2, pos.y - 2, CELL_PX + 4, CELL_PX + 4);
      pop();
    }
  }
}

function tintImage(spec, x, y, alpha) {
  push();
  tint(255, alpha);
  spec.render(x, y);
  pop();
}
```

- [ ] **Step 3: Verify in browser**

Reload. Click a child — the clicked cell visually slides toward the center over ~300 ms while the other children fade. Test keyboard: press `8` to breed the top-middle child, `Z` to go back, `X` to forward, `R` to reset, `N` to random, `S` to save, `+` and `-` to adjust mutation rate. All should match button behavior.

- [ ] **Step 4: Commit**

```bash
git add content/spirobiomorphs/main.js
git commit -m "feat: keyboard shortcuts and click slide-to-center transition"
```

---

## Task 15: Hugo frontmatter polish + preview screenshot

**Files:**
- Modify: `content/spirobiomorphs/index.md`
- Create: `content/spirobiomorphs/preview.png`

- [ ] **Step 1: Replace `index.md` with the polished frontmatter**

```markdown
---
title: "Spirobiomorphs"
date: 2026-05-05
description: |
  Richard Dawkins' biomorphs crossed with a Spirograph kaleidoscope.
  Specimens are layered hypotrochoid stacks with multi-band radial masks
  and palette-driven gradient strokes. Breed by clicking children in a
  3×3 grid; the clicked child becomes the new parent and 8 fresh mutants
  spawn around it. Inspired by The Blind Watchmaker (Dawkins, 1986).
usage: |
  Click any child to make it the new parent. Use Back/Forward to navigate
  breeding history (the same children reappear — navigation is
  deterministic). Save favorites to localStorage with the 💾 button.
  Numpad keys 1–9 pick a child; Z/X = Back/Forward; R reset; N random;
  S save; +/− adjusts mutation rate.
scripts:
  - "main.js"
controls: |
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div id="control-row-buttons" style="display: flex; gap: 6px; flex-wrap: wrap;"></div>
    <div id="control-row-sliders" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;"></div>
    <div id="status-line" style="font-size: 0.85em; color: #aaa;"></div>
    <div id="saved-strip" style="display: flex; gap: 6px; overflow-x: auto; min-height: 130px;"></div>
    <div style="font-size: 0.75em; color: #888; margin-top: 8px;">
      Inspired by Richard Dawkins' biomorphs from
      <em>The Blind Watchmaker</em> (1986) and the classic Spirograph drawing toy.
    </div>
  </div>
technical_details: |
  <ul>
    <li><strong>Curve family:</strong> hypotrochoid — small gear of radius <code>r</code> rolls inside a fixed gear of radius <code>R</code>; pen offset <code>d</code> from the small gear's center traces the curve. Each layer has its own <code>(R, r, d, revs)</code>.</li>
    <li><strong>Composition:</strong> 1–5 hypotrochoid layers per specimen, stacked. The whole composition is then radially copied <code>k_outer</code> times around the cell center for kaleidoscope symmetry. Each layer can be offset from origin by an <code>offset</code> gene.</li>
    <li><strong>Mask:</strong> per-layer multi-band radial mask. The pen's distance from origin determines whether the segment draws — <code>band_count</code> alternating draw/skip rings, with <code>band_phase</code> shift and <code>band_duty</code> draw fraction.</li>
    <li><strong>Color:</strong> each specimen has a 4-slot HSL palette. Each layer picks two palette indices and gradients between them along the pen's path. Strokes use additive blending on a near-black background, so overlaps build brightness.</li>
    <li><strong>Animation:</strong> each cell owns a <code>p5.Graphics</code> buffer. The pen advances every frame; old strokes fade via a low-alpha black rectangle in BLEND mode. New strokes composite in ADD mode for glow.</li>
    <li><strong>Mutation:</strong> Dawkins-style — pick one random active gene, change it by ±1 step (integer +/-1, quantized float by its natural step, continuous float by 5% of range). Mutations-per-offspring slider scales the count. Layer count is itself a gene; adding a layer fills it with median-of-range values.</li>
    <li><strong>History:</strong> deterministic. The RNG seed used to mutate each child is stored alongside the parent in history, so Back/Forward returns you to the same children you saw before.</li>
    <li><strong>Saved gallery:</strong> persists across reloads via <code>localStorage</code>; click a thumbnail to make it the new parent (pushed onto history).</li>
  </ul>
draft: false
---
```

- [ ] **Step 2: Generate a preview screenshot**

Open the sketch in the browser, breed until you have a specimen you like, then take a screenshot of the canvas (or a saved-strip thumbnail) at 1200×1200 (or whatever resolution the existing sketches use — check `content/schelling-segregation/preview.png` dimensions). Save as `content/spirobiomorphs/preview.png`.

- [ ] **Step 3: Verify in browser**

Reload. Confirm the title, description, usage, controls, and technical_details all render correctly via the Hugo layout. Verify that the "Inspired by..." footer shows under the saved strip. Confirm the preview thumbnail shows up on the gallery index page (`http://localhost:1313/`).

- [ ] **Step 4: Commit**

```bash
git add content/spirobiomorphs/index.md content/spirobiomorphs/preview.png
git commit -m "docs: spirobiomorphs frontmatter and preview screenshot"
```

---

## Definition of Done

- [ ] All 15 tasks committed.
- [ ] `hugo server` shows the sketch at `/spirobiomorphs/` with no console errors.
- [ ] Click-to-breed, Back, Forward, Reset, Random, Save Parent all work.
- [ ] Mutations-per-offspring and Pen-speed sliders work.
- [ ] Status line shows generation, layers, k, fingerprint.
- [ ] Saved gallery persists across reloads; click to recall, hover-× to remove.
- [ ] Keyboard shortcuts (1–9 numpad, Z/X, R, N, S, +/−) work.
- [ ] Slide-to-center transition animates on click.
- [ ] Preview screenshot exists.
- [ ] No regressions to other sketches.
