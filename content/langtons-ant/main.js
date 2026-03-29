// main.js — Langton's Ant
//
// 400x400 pixel grid. Generalized multi-color rules.
// Direct pixel manipulation for performance.

var GRID_SIZE = 400;
var GRID_CELLS = GRID_SIZE * GRID_SIZE;

// Simulation state
var grid;          // Uint8Array — cell states
var ants;          // Array of {x, y, dir, color}
var rule;          // String, e.g. "RL"
var palette;       // Array of [r, g, b] per state
var stepsPerFrame; // Number
var totalSteps;    // Number
var paused;        // Boolean
var wrapEdges;     // Boolean

// Direction vectors: N=0, E=1, S=2, W=3
var DX = [0, 1, 0, -1];
var DY = [-1, 0, 1, 0];

// DOM elements
var pauseBtn, stepBtn, resetBtn, addAntBtn;
var speedSlider, speedValue, ruleInput, presetSelect;
var wrapCheckbox, stepCountSpan, antCountSpan;

// ─── Color Palette ────────────────────────────────────────────────────────

function buildPalette(ruleLength) {
  var colors = [];
  // State 0 is always black (unvisited)
  colors.push([0, 0, 0]);

  if (ruleLength === 2) {
    // Classic: black and white
    colors.push([224, 224, 224]);
  } else {
    // HSL ramp from deep blue (220) to warm gold (45)
    // We go 220 -> 360 -> 45 (wrapping through red)
    var startHue = 220;
    var endHue = 405; // 45 + 360, so we go the long way around
    var numColors = ruleLength - 1; // exclude state 0
    for (var i = 0; i < numColors; i++) {
      var t = numColors === 1 ? 0.5 : i / (numColors - 1);
      var h = (startHue + t * (endHue - startHue)) % 360;
      var rgb = hslToRgb(h, 80, 55);
      colors.push(rgb);
    }
  }
  return colors;
}

function hslToRgb(h, s, l) {
  // h: 0-360, s: 0-100, l: 0-100 -> [r, g, b] 0-255
  s /= 100;
  l /= 100;
  var c = (1 - Math.abs(2 * l - 1)) * s;
  var x = c * (1 - Math.abs((h / 60) % 2 - 1));
  var m = l - c / 2;
  var r, g, b;
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
  var colors = [];
  for (var i = 0; i < count; i++) {
    if (i === 0) {
      colors.push([255, 107, 107]); // red for first ant
    } else {
      var h = (i * 360 / count) % 360;
      colors.push(hslToRgb(h, 90, 60));
    }
  }
  return colors;
}

// ─── Simulation ───────────────────────────────────────────────────────────

function stepAnts(count) {
  for (var s = 0; s < count; s++) {
    for (var i = ants.length - 1; i >= 0; i--) {
      var ant = ants[i];
      var idx = ant.y * GRID_SIZE + ant.x;
      var state = grid[idx];

      // Turn based on rule
      var turn = rule.charAt(state);
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
  var i = (y * GRID_SIZE + x) * 4;
  pixels[i] = rgb[0];
  pixels[i + 1] = rgb[1];
  pixels[i + 2] = rgb[2];
  pixels[i + 3] = 255;
}

// ─── Ant Markers ──────────────────────────────────────────────────────────

// Store previous marker positions so we can restore the underlying pixels
var prevMarkers = [];

function clearAntMarkers() {
  for (var i = 0; i < prevMarkers.length; i++) {
    var m = prevMarkers[i];
    setPixelAt(m.x, m.y, palette[grid[m.y * GRID_SIZE + m.x]]);
  }
  prevMarkers = [];
}

function drawAntMarkers() {
  for (var i = 0; i < ants.length; i++) {
    var ant = ants[i];
    // 3x3 marker centered on ant
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var px = ant.x + dx;
        var py = ant.y + dy;
        if (px < 0 || px >= GRID_SIZE || py < 0 || py >= GRID_SIZE) continue;
        prevMarkers.push({ x: px, y: py });
        setPixelAt(px, py, ant.color);
      }
    }
  }
}

// ─── p5.js Setup & Draw ──────────────────────────────────────────────────

function setup() {
  var cnv = createCanvas(GRID_SIZE, GRID_SIZE);
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
    var dir = Math.floor(Math.random() * 4);
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
    stepsPerFrame = parseInt(speedSlider.value);
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
  }
  updateDisplay();
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
  for (var i = 0; i < pixels.length; i += 4) {
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
  var cleaned = input.toUpperCase().replace(/[^RL]/g, "");
  if (cleaned.length < 2) return;
  ruleInput.value = cleaned;
  resetSimulation(cleaned);
}

function reassignAntColors() {
  var colors = buildAntColors(ants.length);
  for (var i = 0; i < ants.length; i++) {
    ants[i].color = colors[i];
  }
}

function updateAntCount() {
  antCountSpan.textContent = "Ants: " + ants.length;
}

// ─── Paint Interaction ────────────────────────────────────────────────────

function paintAt(mx, my) {
  if (!paused) return;
  var x = Math.floor(mx);
  var y = Math.floor(my);
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

  var idx = y * GRID_SIZE + x;
  // Toggle between state 0 and state 1
  grid[idx] = grid[idx] === 0 ? 1 : 0;

  loadPixels();
  clearAntMarkers();
  setPixelAt(x, y, palette[grid[idx]]);
  drawAntMarkers();
  updatePixels();
}

function mousePressed() {
  if (mouseX >= 0 && mouseX < GRID_SIZE && mouseY >= 0 && mouseY < GRID_SIZE) {
    paintAt(mouseX, mouseY);
  }
}

function mouseDragged() {
  if (mouseX >= 0 && mouseX < GRID_SIZE && mouseY >= 0 && mouseY < GRID_SIZE) {
    paintAt(mouseX, mouseY);
  }
}
