// main.js — Langton's Ant
//
// 400x400 pixel grid. Generalized multi-color rules.
// Direct pixel manipulation for performance.

const GRID_SIZE = 400;
const GRID_CELLS = GRID_SIZE * GRID_SIZE;

// Simulation state
let grid;          // Uint8Array — cell states
let ants;          // Array of {x, y, dir, color}
let rule;          // String, e.g. "RL"
let palette;       // Array of [r, g, b] per state
let stepsPerFrame; // Number
let totalSteps;    // Number
let paused;        // Boolean
let wrapEdges;     // Boolean

// Direction vectors: N=0, E=1, S=2, W=3
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

// DOM elements
let pauseBtn, stepBtn, resetBtn, addAntBtn;
let speedSlider, speedValue, ruleInput, presetSelect;
let wrapCheckbox, stepCountSpan, antCountSpan;

// ─── Color Palette ────────────────────────────────────────────────────────

function buildPalette(ruleLength) {
  const colors = [];
  // State 0 is always black (unvisited)
  colors.push([0, 0, 0]);

  if (ruleLength === 2) {
    // Classic: black and white
    colors.push([224, 224, 224]);
  } else {
    // HSL ramp from deep blue (220) to warm gold (45)
    // We go 220 -> 360 -> 45 (wrapping through red)
    const startHue = 220;
    const endHue = 405; // 45 + 360, so we go the long way around
    const numColors = ruleLength - 1; // exclude state 0
    for (let i = 0; i < numColors; i++) {
      const t = numColors === 1 ? 0.5 : i / (numColors - 1);
      const h = (startHue + t * (endHue - startHue)) % 360;
      const rgb = hslToRgb(h, 80, 55);
      colors.push(rgb);
    }
  }
  return colors;
}

function hslToRgb(h, s, l) {
  // h: 0-360, s: 0-100, l: 0-100 -> [r, g, b] 0-255
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function buildAntColors(count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      colors.push([255, 107, 107]); // red for first ant
    } else {
      const h = (i * 360 / count) % 360;
      colors.push(hslToRgb(h, 90, 60));
    }
  }
  return colors;
}

// ─── Simulation ───────────────────────────────────────────────────────────

function stepAnts(count) {
  for (let s = 0; s < count; s++) {
    // Reverse iteration so splice during removal doesn't skip ants
    for (let i = ants.length - 1; i >= 0; i--) {
      const ant = ants[i];
      const idx = ant.y * GRID_SIZE + ant.x;
      const state = grid[idx];

      // Turn based on rule
      const turn = rule.charAt(state);
      if (turn === "R") {
        ant.dir = (ant.dir + 1) % 4;
      } else {
        ant.dir = (ant.dir + 3) % 4; // turn left = +3 mod 4
      }

      // Flip cell to next state
      grid[idx] = (state + 1) % rule.length;

      // Write changed pixel
      setPixelAt(ant.x, ant.y, palette[grid[idx]]);

      // Move forward
      ant.x += DX[ant.dir];
      ant.y += DY[ant.dir];

      // Edge handling
      if (wrapEdges) {
        ant.x = (ant.x + GRID_SIZE) % GRID_SIZE;
        ant.y = (ant.y + GRID_SIZE) % GRID_SIZE;
      } else {
        if (ant.x < 0 || ant.x >= GRID_SIZE || ant.y < 0 || ant.y >= GRID_SIZE) {
          ants.splice(i, 1);
          updateAntCount();
        }
      }
    }
    totalSteps++;
  }
}

function setPixelAt(x, y, rgb) {
  const i = (y * GRID_SIZE + x) * 4;
  pixels[i] = rgb[0];
  pixels[i + 1] = rgb[1];
  pixels[i + 2] = rgb[2];
  pixels[i + 3] = 255;
}

// ─── Ant Markers ──────────────────────────────────────────────────────────

// Store previous marker positions so we can restore the underlying pixels
let prevMarkers = [];

function clearAntMarkers() {
  for (let i = 0; i < prevMarkers.length; i++) {
    const m = prevMarkers[i];
    setPixelAt(m.x, m.y, palette[grid[m.y * GRID_SIZE + m.x]]);
  }
  prevMarkers = [];
}

function drawAntMarkers() {
  for (let i = 0; i < ants.length; i++) {
    const ant = ants[i];
    // 3x3 marker centered on ant
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = ant.x + dx;
        const py = ant.y + dy;
        if (px < 0 || px >= GRID_SIZE || py < 0 || py >= GRID_SIZE) continue;
        prevMarkers.push({ x: px, y: py });
        setPixelAt(px, py, ant.color);
      }
    }
  }
}

// ─── p5.js Setup & Draw ──────────────────────────────────────────────────

function setup() {
  const cnv = createCanvas(GRID_SIZE, GRID_SIZE);
  cnv.parent(select("#sketch-container"));
  pixelDensity(1);

  // Bind DOM elements
  pauseBtn = document.getElementById("pause-btn");
  stepBtn = document.getElementById("step-btn");
  resetBtn = document.getElementById("reset-btn");
  addAntBtn = document.getElementById("add-ant-btn");
  speedSlider = document.getElementById("speed-slider");
  speedValue = document.getElementById("speed-value");
  ruleInput = document.getElementById("rule-input");
  presetSelect = document.getElementById("preset-select");
  wrapCheckbox = document.getElementById("wrap-checkbox");
  stepCountSpan = document.getElementById("step-count");
  antCountSpan = document.getElementById("ant-count");

  // Event handlers
  pauseBtn.addEventListener("click", function () {
    paused = !paused;
    pauseBtn.textContent = paused ? "Play" : "Pause";
  });

  stepBtn.addEventListener("click", function () {
    if (!paused) return;
    doFrame();
    updateDisplay();
  });

  resetBtn.addEventListener("click", function () {
    resetSimulation(rule);
  });

  addAntBtn.addEventListener("click", function () {
    const dir = Math.floor(Math.random() * 4);
    ants.push({
      x: Math.floor(GRID_SIZE / 2),
      y: Math.floor(GRID_SIZE / 2),
      dir: dir,
      color: [0, 0, 0], // placeholder, reassigned below
    });
    reassignAntColors();
    updateAntCount();
  });

  speedSlider.addEventListener("input", function () {
    stepsPerFrame = parseInt(speedSlider.value, 10);
    speedValue.textContent = stepsPerFrame;
  });

  ruleInput.addEventListener("change", function () {
    applyRule(ruleInput.value);
  });

  ruleInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      applyRule(ruleInput.value);
    }
  });

  presetSelect.addEventListener("change", function () {
    if (presetSelect.value) {
      ruleInput.value = presetSelect.value;
      applyRule(presetSelect.value);
      presetSelect.value = "";
    }
  });

  wrapCheckbox.addEventListener("change", function () {
    wrapEdges = wrapCheckbox.checked;
  });

  // Initialize
  stepsPerFrame = 1;
  paused = false;
  wrapEdges = true;
  resetSimulation("RL");
}

function draw() {
  if (!paused && ants.length > 0) {
    doFrame();
    updateDisplay();
  }
}

function doFrame() {
  loadPixels();
  clearAntMarkers();
  stepAnts(stepsPerFrame);
  drawAntMarkers();
  updatePixels();
}

function updateDisplay() {
  stepCountSpan.textContent = "Steps: " + totalSteps;
}

// ─── Reset & Rule Management ─────────────────────────────────────────────

function resetSimulation(newRule) {
  rule = newRule;
  palette = buildPalette(rule.length);
  grid = new Uint8Array(GRID_CELLS);
  ants = [{
    x: Math.floor(GRID_SIZE / 2),
    y: Math.floor(GRID_SIZE / 2),
    dir: 0,
    color: [255, 107, 107],
  }];
  prevMarkers = [];
  totalSteps = 0;

  // Clear canvas to black
  loadPixels();
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 0;
    pixels[i + 1] = 0;
    pixels[i + 2] = 0;
    pixels[i + 3] = 255;
  }
  drawAntMarkers();
  updatePixels();

  updateAntCount();
  updateDisplay();
}

function applyRule(input) {
  const cleaned = input.toUpperCase().replace(/[^RL]/g, "");
  if (cleaned.length < 2) return;
  ruleInput.value = cleaned;
  resetSimulation(cleaned);
}

function reassignAntColors() {
  const colors = buildAntColors(ants.length);
  for (let i = 0; i < ants.length; i++) {
    ants[i].color = colors[i];
  }
}

function updateAntCount() {
  antCountSpan.textContent = "Ants: " + ants.length;
}

// ─── Paint Interaction ────────────────────────────────────────────────────

// Track paint mode: true = painting (setting state 1), false = erasing (setting state 0)
let paintMode = true;

function paintAt(mx, my, setMode) {
  if (!paused) return;
  const x = Math.floor(mx);
  const y = Math.floor(my);
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

  const idx = y * GRID_SIZE + x;
  if (setMode) {
    // On initial click, decide mode based on current cell
    paintMode = grid[idx] === 0;
  }
  grid[idx] = paintMode ? 1 : 0;

  loadPixels();
  clearAntMarkers();
  setPixelAt(x, y, palette[grid[idx]]);
  drawAntMarkers();
  updatePixels();
}

function mousePressed() {
  if (mouseX >= 0 && mouseX < GRID_SIZE && mouseY >= 0 && mouseY < GRID_SIZE) {
    paintAt(mouseX, mouseY, true);
  }
}

function mouseDragged() {
  if (mouseX >= 0 && mouseX < GRID_SIZE && mouseY >= 0 && mouseY < GRID_SIZE) {
    paintAt(mouseX, mouseY, false);
  }
}
