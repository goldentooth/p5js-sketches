// main.js — Reaction-Diffusion
//
// Gray-Scott model. 300x300 grid, 2px per cell on 600x600 canvas.
// Direct pixel manipulation for performance.

const GRID_W = 300;
const GRID_H = 300;
const GRID_CELLS = GRID_W * GRID_H;
const CELL_SIZE = 2;
const CANVAS_W = GRID_W * CELL_SIZE;
const CANVAS_H = GRID_H * CELL_SIZE;

// Diffusion rates
const DA = 1.0;
const DB = 0.5;
const DT = 1.0;

// Simulation state
let gridA, gridB;     // Float32Array — current chemical concentrations
let nextA, nextB;     // Float32Array — next step buffers
let feedRate;         // F parameter
let killRate;         // k parameter
let stepsPerFrame;    // Number
let paused;           // Boolean

// Rendering
let colorLUT;         // Uint8Array(256 * 3) — precomputed color lookup

// DOM elements
let pauseBtn, stepBtn, resetBtn, reseedBtn;
let speedSlider, speedValue;
let feedSlider, feedValue, killSlider, killValue;
let patternSelect, seedSelect, paletteSelect;

// ─── Pattern Presets ──────────────────────────────────────────────────────

const PATTERNS = {
  mitosis:  { f: 0.0367, k: 0.0649 },
  coral:    { f: 0.0545, k: 0.062 },
  maze:     { f: 0.029,  k: 0.057 },
  spots:    { f: 0.035,  k: 0.065 },
  waves:    { f: 0.014,  k: 0.045 },
  holes:    { f: 0.039,  k: 0.058 },
  solitons: { f: 0.03,   k: 0.06 },
  uskate:   { f: 0.062,  k: 0.061 },
  bubbles:  { f: 0.012,  k: 0.05 },
  stripe:   { f: 0.022,  k: 0.051 },
  chaos:    { f: 0.026,  k: 0.051 },
};

// ─── Color Palettes ───────────────────────────────────────────────────────

const PALETTES = {
  thermal: [
    [0, 0, 0],
    [180, 30, 0],
    [220, 100, 0],
    [255, 220, 50],
    [255, 255, 255],
  ],
  ocean: [
    [0, 0, 0],
    [0, 30, 100],
    [0, 120, 180],
    [100, 210, 255],
    [255, 255, 255],
  ],
  toxic: [
    [0, 0, 0],
    [0, 80, 20],
    [30, 180, 30],
    [140, 255, 60],
    [255, 255, 255],
  ],
  grayscale: [
    [0, 0, 0],
    [255, 255, 255],
  ],
  neon: [
    [0, 0, 0],
    [80, 0, 120],
    [200, 0, 150],
    [255, 80, 180],
    [255, 255, 255],
  ],
};

function buildColorLUT(paletteName) {
  const stops = PALETTES[paletteName];
  const lut = new Uint8Array(256 * 3);
  const numSegments = stops.length - 1;

  for (let i = 0; i < 256; i++) {
    // Map i (0-255) to position in the gradient
    const t = i / 255;
    const segFloat = t * numSegments;
    const seg = Math.min(Math.floor(segFloat), numSegments - 1);
    const segT = segFloat - seg;

    const c0 = stops[seg];
    const c1 = stops[seg + 1];
    const base = i * 3;
    lut[base] = Math.round(c0[0] + (c1[0] - c0[0]) * segT);
    lut[base + 1] = Math.round(c0[1] + (c1[1] - c0[1]) * segT);
    lut[base + 2] = Math.round(c0[2] + (c1[2] - c0[2]) * segT);
  }
  colorLUT = lut;
}

// ─── Simulation ───────────────────────────────────────────────────────────

function stepSimulation(steps) {
  for (let s = 0; s < steps; s++) {
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const idx = y * GRID_W + x;
        const a = gridA[idx];
        const b = gridB[idx];

        // Laplacian with weighted stencil (wrapping edges)
        const lapA = laplacian(gridA, x, y);
        const lapB = laplacian(gridB, x, y);

        // Reaction term
        const reaction = a * b * b;

        // Gray-Scott update
        nextA[idx] = a + (DA * lapA - reaction + feedRate * (1.0 - a)) * DT;
        nextB[idx] = b + (DB * lapB + reaction - (killRate + feedRate) * b) * DT;

        // Clamp
        if (nextA[idx] < 0) nextA[idx] = 0;
        if (nextA[idx] > 1) nextA[idx] = 1;
        if (nextB[idx] < 0) nextB[idx] = 0;
        if (nextB[idx] > 1) nextB[idx] = 1;
      }
    }

    // Swap buffers
    const tmpA = gridA;
    const tmpB = gridB;
    gridA = nextA;
    gridB = nextB;
    nextA = tmpA;
    nextB = tmpB;
  }
}

function laplacian(grid, x, y) {
  // Weighted 5-point stencil: cardinal +0.2, diagonal +0.05, center -1.0
  const xL = (x - 1 + GRID_W) % GRID_W;
  const xR = (x + 1) % GRID_W;
  const yU = (y - 1 + GRID_H) % GRID_H;
  const yD = (y + 1) % GRID_H;
  const idx = y * GRID_W + x;

  return -grid[idx]
    + 0.2 * grid[y * GRID_W + xR]
    + 0.2 * grid[y * GRID_W + xL]
    + 0.2 * grid[yD * GRID_W + x]
    + 0.2 * grid[yU * GRID_W + x]
    + 0.05 * grid[yU * GRID_W + xL]
    + 0.05 * grid[yU * GRID_W + xR]
    + 0.05 * grid[yD * GRID_W + xL]
    + 0.05 * grid[yD * GRID_W + xR];
}

// ─── Rendering ────────────────────────────────────────────────────────────

function renderGrid() {
  loadPixels();
  for (let cy = 0; cy < GRID_H; cy++) {
    for (let cx = 0; cx < GRID_W; cx++) {
      const b = gridB[cy * GRID_W + cx];
      const lutIdx = Math.floor(b * 255) * 3;
      const r = colorLUT[lutIdx];
      const g = colorLUT[lutIdx + 1];
      const bl = colorLUT[lutIdx + 2];

      // Write 2x2 pixel block
      const px = cx * CELL_SIZE;
      const py = cy * CELL_SIZE;
      setPixelBlock(px, py, r, g, bl);
    }
  }
  updatePixels();
}

function setPixelBlock(px, py, r, g, b) {
  for (let dy = 0; dy < CELL_SIZE; dy++) {
    for (let dx = 0; dx < CELL_SIZE; dx++) {
      const i = ((py + dy) * CANVAS_W + (px + dx)) * 4;
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = 255;
    }
  }
}

// ─── Seeding ──────────────────────────────────────────────────────────────

function applySeed(seedType) {
  switch (seedType) {
    case "center":
      seedRect(GRID_W / 2 - 5, GRID_H / 2 - 5, 10, 10);
      break;
    case "scatter":
      for (let i = 0; i < 18; i++) {
        const r = 3 + Math.floor(Math.random() * 3);
        const sx = Math.floor(Math.random() * (GRID_W - r * 2)) + r;
        const sy = Math.floor(Math.random() * (GRID_H - r * 2)) + r;
        seedCircle(sx, sy, r);
      }
      break;
    case "ring":
      seedRing(GRID_W / 2, GRID_H / 2, 40, 5);
      break;
    case "line":
      seedRect(0, GRID_H / 2 - 2, GRID_W, 5);
      break;
  }
}

function seedRect(sx, sy, w, h) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const x = Math.floor(sx + dx);
      const y = Math.floor(sy + dy);
      if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) {
        gridB[y * GRID_W + x] = 1.0;
      }
    }
  }
}

function seedCircle(cx, cy, radius) {
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= r2) {
        const x = Math.floor(cx + dx);
        const y = Math.floor(cy + dy);
        if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) {
          gridB[y * GRID_W + x] = 1.0;
        }
      }
    }
  }
}

function seedRing(cx, cy, radius, thickness) {
  const outerR2 = radius * radius;
  const innerR2 = (radius - thickness) * (radius - thickness);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 <= outerR2 && d2 >= innerR2) {
        const x = Math.floor(cx + dx);
        const y = Math.floor(cy + dy);
        if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) {
          gridB[y * GRID_W + x] = 1.0;
        }
      }
    }
  }
}

// ─── p5.js Setup & Draw ──────────────────────────────────────────────────

function setup() {
  const cnv = createCanvas(CANVAS_W, CANVAS_H);
  cnv.parent(select("#sketch-container"));
  pixelDensity(1);

  // Bind DOM elements
  pauseBtn = document.getElementById("pause-btn");
  stepBtn = document.getElementById("step-btn");
  resetBtn = document.getElementById("reset-btn");
  reseedBtn = document.getElementById("reseed-btn");
  speedSlider = document.getElementById("speed-slider");
  speedValue = document.getElementById("speed-value");
  feedSlider = document.getElementById("feed-slider");
  feedValue = document.getElementById("feed-value");
  killSlider = document.getElementById("kill-slider");
  killValue = document.getElementById("kill-value");
  patternSelect = document.getElementById("pattern-select");
  seedSelect = document.getElementById("seed-select");
  paletteSelect = document.getElementById("palette-select");

  // Event handlers
  pauseBtn.addEventListener("click", function () {
    paused = !paused;
    pauseBtn.textContent = paused ? "Play" : "Pause";
  });

  stepBtn.addEventListener("click", function () {
    if (!paused) return;
    doFrame();
  });

  resetBtn.addEventListener("click", function () {
    resetGrid();
    applySeed("center");
    renderGrid();
  });

  reseedBtn.addEventListener("click", function () {
    resetGrid();
    applySeed(seedSelect.value);
    renderGrid();
  });

  speedSlider.addEventListener("input", function () {
    stepsPerFrame = parseInt(speedSlider.value, 10);
    speedValue.textContent = stepsPerFrame;
  });

  feedSlider.addEventListener("input", function () {
    feedRate = parseFloat(feedSlider.value);
    feedValue.textContent = feedRate.toFixed(4);
  });

  killSlider.addEventListener("input", function () {
    killRate = parseFloat(killSlider.value);
    killValue.textContent = killRate.toFixed(4);
  });

  patternSelect.addEventListener("change", function () {
    const p = PATTERNS[patternSelect.value];
    feedRate = p.f;
    killRate = p.k;
    feedSlider.value = feedRate;
    feedValue.textContent = feedRate.toFixed(4);
    killSlider.value = killRate;
    killValue.textContent = killRate.toFixed(4);
    resetGrid();
    applySeed(seedSelect.value);
    renderGrid();
  });

  paletteSelect.addEventListener("change", function () {
    buildColorLUT(paletteSelect.value);
    renderGrid();
  });

  // Initialize
  stepsPerFrame = 5;
  paused = false;
  feedRate = PATTERNS.mitosis.f;
  killRate = PATTERNS.mitosis.k;
  buildColorLUT("thermal");
  resetGrid();
  applySeed("center");
  renderGrid();
}

function draw() {
  if (!paused) {
    doFrame();
  }
}

function doFrame() {
  stepSimulation(stepsPerFrame);
  renderGrid();
}

// ─── Grid Reset ───────────────────────────────────────────────────────────

function resetGrid() {
  gridA = new Float32Array(GRID_CELLS);
  gridB = new Float32Array(GRID_CELLS);
  nextA = new Float32Array(GRID_CELLS);
  nextB = new Float32Array(GRID_CELLS);

  // Fill A with 1.0 (B stays 0.0)
  for (let i = 0; i < GRID_CELLS; i++) {
    gridA[i] = 1.0;
  }
}

// ─── Paint Interaction ────────────────────────────────────────────────────

const BRUSH_RADIUS = 5;

function paintAt(mx, my) {
  const cx = Math.floor(mx / CELL_SIZE);
  const cy = Math.floor(my / CELL_SIZE);
  seedCircle(cx, cy, BRUSH_RADIUS);

  if (paused) {
    renderGrid();
  }
}

function mousePressed() {
  if (mouseX >= 0 && mouseX < CANVAS_W && mouseY >= 0 && mouseY < CANVAS_H) {
    paintAt(mouseX, mouseY);
  }
}

function mouseDragged() {
  if (mouseX >= 0 && mouseX < CANVAS_W && mouseY >= 0 && mouseY < CANVAS_H) {
    paintAt(mouseX, mouseY);
  }
}
