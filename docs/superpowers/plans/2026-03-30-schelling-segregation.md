# Schelling Segregation Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive Schelling segregation model sketch rendered in roguelike glyph style with configurable groups (fantasy races), movement strategies, per-group tolerance/anti-bias thresholds, and a live segregation chart.

**Architecture:** Single p5.js sketch using `Nuglib.GlyphPalette`, `Nuglib.GridRenderer`, and `Nuglib.LayerManager` for roguelike text rendering. Simulation state is a flat `Uint8Array` grid (cell values encode group ID or empty). Controls are HTML elements in Hugo frontmatter. A segregation line chart is drawn directly on a second p5.js graphics buffer.

**Tech Stack:** p5.js, Nuglib (GlyphPalette, GridRenderer, LayerManager, createGrid, createTextLayerConfig, calculateGridDimensions), Hugo frontmatter for controls HTML.

---

## File Structure

```
content/schelling-segregation/
├── index.md       # Frontmatter: title, description, controls HTML, technical_details
├── main.js        # All simulation logic, rendering, and UI binding (~400-600 lines)
```

`main.js` is a single file containing:
- Constants and configuration (group definitions, defaults)
- Simulation state and core logic (init, step, happiness check, movement strategies)
- Rendering (grid sync, chart drawing)
- UI binding (DOM event handlers)
- p5.js `setup()` and `draw()`

---

## Task 1: Hugo Content Page (index.md)

**Files:**
- Create: `content/schelling-segregation/index.md`

- [ ] **Step 1: Create the frontmatter file**

```markdown
---
title: "Schelling Segregation"
date: 2026-03-30
description: |
  Schelling's segregation model — even mild individual preferences for similar
  neighbors produce dramatic collective segregation. Fantasy races populate a
  grid and relocate when unhappy with their neighborhood. Inspired by Thomas
  Schelling's Micromotives and Macrobehavior (1978).
usage: |
  Watch races self-segregate on the grid. Adjust tolerance thresholds to see
  how mild preferences create dramatic clustering. Try different movement
  strategies and group configurations. Dimmed agents are unhappy and about
  to move.
scripts:
  - "main.js"
controls: |
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div>
      <button id="play-btn" class="control-button">Play</button>
      <button id="step-btn" class="control-button">Step</button>
      <button id="reset-btn" class="control-button">Reset</button>
    </div>
    <div>
      <label for="speed-slider">Steps/frame: <span id="speed-value">1</span></label>
      <input type="range" id="speed-slider" class="control-slider" min="1" max="50" value="1">
    </div>
    <div>
      <label for="grid-select">Grid:</label>
      <select id="grid-select" class="control-select">
        <option value="40">Medium (40×40)</option>
        <option value="60" selected>Large (60×60)</option>
        <option value="80">XL (80×80)</option>
      </select>
      <label for="density-slider">Density: <span id="density-value">75</span>%</label>
      <input type="range" id="density-slider" class="control-slider" min="50" max="95" value="75">
      <label for="strategy-select">Movement:</label>
      <select id="strategy-select" class="control-select">
        <option value="random">Random</option>
        <option value="nearest">Nearest Satisfying</option>
        <option value="swap">Swap</option>
      </select>
    </div>
    <div id="group-controls"></div>
    <div>
      <button id="add-group-btn" class="control-button">+ Add Group</button>
      <button id="remove-group-btn" class="control-button">− Remove Group</button>
    </div>
    <div style="font-size: 0.85em;">
      <span id="step-count">Step: 0</span> ·
      <span id="unhappy-count">Unhappy: 0%</span> ·
      <span id="segregation-value">Segregation: 0%</span> ·
      <span id="status-text"></span>
    </div>
    <div style="font-size: 0.75em; color: #888; margin-top: 8px;">
      Inspired by <a href="https://ncase.me/polygons/" target="_blank" style="color: #aaa;">Parable of the Polygons</a>
      by Nicky Case & Vi Hart, based on Thomas Schelling's segregation model.
    </div>
  </div>
technical_details: |
  <ul>
    <li><strong>Model:</strong> Schelling's spatial segregation model (1971). Agents on a grid are "unhappy" if the fraction of same-group neighbors falls below their tolerance threshold or above their anti-bias threshold.</li>
    <li><strong>Neighborhood:</strong> Moore neighborhood (8 surrounding cells). Edge/corner agents use only available neighbors. Non-wrapping boundary.</li>
    <li><strong>Movement strategies:</strong> Random (move to any empty cell), Nearest Satisfying (BFS to closest happy empty cell), Swap (exchange positions of two unhappy agents).</li>
    <li><strong>Processing:</strong> Each step identifies all unhappy agents, shuffles them randomly, then processes sequentially — an agent's move may change neighbors' happiness before they are processed.</li>
    <li><strong>Rendering:</strong> Roguelike glyph grid via Nuglib GridRenderer and LayerManager. Segregation chart drawn on a separate p5.js graphics buffer.</li>
  </ul>
draft: false
---
```

- [ ] **Step 2: Verify the file renders with Hugo**

Run: `hugo server` (briefly, then Ctrl+C)
Expected: No build errors. Page accessible at `/schelling-segregation/`.

- [ ] **Step 3: Commit**

```bash
git add content/schelling-segregation/index.md
git commit -m "feat: add Schelling Segregation Hugo content page"
```

---

## Task 2: Grid Rendering & Initialization

**Files:**
- Create: `content/schelling-segregation/main.js`

This task creates the skeleton `main.js` with constants, group definitions, grid initialization, and rendering. No simulation logic yet — just a randomly populated grid that displays correctly.

- [ ] **Step 1: Create main.js with constants and group definitions**

```javascript
// === Constants ===
const EMPTY = 0;

const GROUPS = [
  { id: 1, name: 'Dwarf',  glyph: 'd', fg: [218, 165, 32],  bg: [0, 0, 0] },
  { id: 2, name: 'Elf',    glyph: 'e', fg: [34,  197, 94],  bg: [0, 0, 0] },
  { id: 3, name: 'Orc',    glyph: 'o', fg: [239, 68,  68],  bg: [0, 0, 0] },
  { id: 4, name: 'Hobbit', glyph: 'h', fg: [180, 130, 70],  bg: [0, 0, 0] },
  { id: 5, name: 'Goblin', glyph: 'g', fg: [168, 85,  247], bg: [0, 0, 0] },
  { id: 6, name: 'Troll',  glyph: 'T', fg: [45,  212, 191], bg: [0, 0, 0] },
];

// Dimmed versions for unhappy agents (50% brightness)
const DIMMED_GROUPS = GROUPS.map(g => ({
  ...g,
  fg: g.fg.map(c => Math.floor(c * 0.4)),
}));

// === State ===
let gridSize = 60;
let density = 0.75;
let activeGroupCount = 3;
let stepsPerFrame = 1;
let paused = true;
let stepCount = 0;
let strategy = 'random';

// Per-group settings: { tolerance: 0.33, antiBias: 1.0, proportion: 1.0 }
let groupSettings = [];

// Simulation grid: flat array, cells[y * gridSize + x] = group id (0 = empty)
let cells = null;

// Unhappy set (recalculated each step)
let unhappySet = null;

// Segregation history for chart
let segregationHistory = [];
const MAX_HISTORY = 300;

// Rendering
const CHAR_HEIGHT = 14;
const CHAR_WIDTH = 9;
let palette;
let grid;
let gridRenderer;
let layerManager;
let chartBuffer;
const CHART_HEIGHT = 100;
```

- [ ] **Step 2: Add palette registration and grid initialization**

```javascript
function buildPalette() {
  palette = new Nuglib.GlyphPalette();
  palette.registerGlyph('empty', '.', [40, 40, 40], [0, 0, 0]);
  for (let i = 0; i < GROUPS.length; i++) {
    const g = GROUPS[i];
    const d = DIMMED_GROUPS[i];
    palette.registerGlyph(g.name, g.glyph, g.fg, g.bg);
    palette.registerGlyph(g.name + '_dim', g.glyph, d.fg, d.bg);
  }
}

function initGroupSettings() {
  groupSettings = [];
  for (let i = 0; i < activeGroupCount; i++) {
    groupSettings.push({ tolerance: 0.33, antiBias: 1.0, proportion: 1.0 });
  }
}

function initCells() {
  const totalCells = gridSize * gridSize;
  cells = new Uint8Array(totalCells);
  const occupiedCount = Math.floor(totalCells * density);

  // Build weighted group list
  const totalWeight = groupSettings.reduce((sum, s) => sum + s.proportion, 0);
  const groupCounts = groupSettings.map((s, i) =>
    Math.floor(occupiedCount * (s.proportion / totalWeight))
  );
  // Assign remainders to first group
  const assigned = groupCounts.reduce((a, b) => a + b, 0);
  groupCounts[0] += occupiedCount - assigned;

  // Fill array with group IDs
  const assignments = [];
  for (let g = 0; g < groupCounts.length; g++) {
    for (let j = 0; j < groupCounts[g]; j++) {
      assignments.push(GROUPS[g].id);
    }
  }
  // Pad with empties
  while (assignments.length < totalCells) {
    assignments.push(EMPTY);
  }

  // Fisher-Yates shuffle
  for (let i = assignments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = assignments[i];
    assignments[i] = assignments[j];
    assignments[j] = tmp;
  }

  for (let i = 0; i < totalCells; i++) {
    cells[i] = assignments[i];
  }
}
```

- [ ] **Step 3: Add syncGrid function and rendering**

```javascript
function computeUnhappySet() {
  unhappySet = new Uint8Array(gridSize * gridSize);
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = y * gridSize + x;
      const groupId = cells[idx];
      if (groupId === EMPTY) continue;
      if (isUnhappy(x, y, groupId)) {
        unhappySet[idx] = 1;
      }
    }
  }
}

function isUnhappy(x, y, groupId) {
  const settingsIdx = groupId - 1; // group IDs are 1-based
  const settings = groupSettings[settingsIdx];
  if (!settings) return false;

  let sameCount = 0;
  let neighborCount = 0;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;
      const neighbor = cells[ny * gridSize + nx];
      if (neighbor === EMPTY) continue;
      neighborCount++;
      if (neighbor === groupId) sameCount++;
    }
  }

  // No neighbors — not unhappy (nothing to compare to)
  if (neighborCount === 0) return false;

  const similarity = sameCount / neighborCount;
  return similarity < settings.tolerance || similarity > settings.antiBias;
}

function syncGrid() {
  computeUnhappySet();
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = y * gridSize + x;
      const groupId = cells[idx];
      if (groupId === EMPTY) {
        grid.setCell(x, y, palette.get('empty'));
      } else {
        const g = GROUPS[groupId - 1];
        const glyphName = unhappySet[idx] ? g.name + '_dim' : g.name;
        grid.setCell(x, y, palette.get(glyphName));
      }
    }
  }
}
```

- [ ] **Step 4: Add setup() and draw()**

```javascript
function setup() {
  buildPalette();
  initGroupSettings();
  initCells();

  const canvasW = CHAR_WIDTH * gridSize;
  const canvasH = CHAR_HEIGHT * gridSize + CHART_HEIGHT;

  const dims = Nuglib.calculateGridDimensions(
    CHAR_WIDTH * gridSize,
    CHAR_HEIGHT * gridSize,
    CHAR_WIDTH,
    CHAR_HEIGHT
  );

  createCanvas(dims.adjustedWidth, dims.adjustedHeight + CHART_HEIGHT);
  const cnv = select('canvas');
  cnv.parent(select('#sketch-container'));
  pixelDensity(1);
  background(0);

  grid = Nuglib.createGrid(gridSize, gridSize);
  gridRenderer = Nuglib.GridRenderer({
    cellHeight: CHAR_HEIGHT,
    cellWidth: CHAR_WIDTH,
    backgroundColor: color(0),
  });
  layerManager = new Nuglib.LayerManager(window);
  layerManager.createLayer('grid', Nuglib.createTextLayerConfig(
    dims.adjustedWidth,
    dims.adjustedHeight,
    CHAR_HEIGHT,
    'Courier New'
  ));

  chartBuffer = createGraphics(dims.adjustedWidth, CHART_HEIGHT);

  segregationHistory = [];
  stepCount = 0;

  syncGrid();
  renderAll();
  bindControls();
  buildGroupControlsUI();
  updateReadouts();
}

function draw() {
  if (!paused) {
    for (let i = 0; i < stepsPerFrame; i++) {
      doStep();
    }
    syncGrid();
    renderAll();
    updateReadouts();
  }
}

function renderAll() {
  const gridLayer = layerManager.requireLayer('grid');
  gridRenderer.draw(grid, window, gridLayer);
  layerManager.render();
  drawChart();
}

function drawChart() {
  chartBuffer.background(0);
  chartBuffer.stroke(80);
  chartBuffer.strokeWeight(1);
  // Horizontal gridlines at 25%, 50%, 75%
  for (let pct of [0.25, 0.5, 0.75]) {
    const cy = CHART_HEIGHT - pct * CHART_HEIGHT;
    chartBuffer.line(0, cy, chartBuffer.width, cy);
  }

  if (segregationHistory.length < 2) {
    image(chartBuffer, 0, height - CHART_HEIGHT);
    return;
  }

  chartBuffer.noFill();
  chartBuffer.stroke(100, 200, 255);
  chartBuffer.strokeWeight(1.5);
  chartBuffer.beginShape();
  for (let i = 0; i < segregationHistory.length; i++) {
    const sx = (i / (MAX_HISTORY - 1)) * chartBuffer.width;
    const sy = CHART_HEIGHT - segregationHistory[i] * CHART_HEIGHT;
    chartBuffer.vertex(sx, sy);
  }
  chartBuffer.endShape();

  // Labels
  chartBuffer.noStroke();
  chartBuffer.fill(120);
  chartBuffer.textSize(10);
  chartBuffer.textAlign(LEFT, TOP);
  chartBuffer.text('Segregation', 4, 2);
  chartBuffer.textAlign(RIGHT, TOP);
  chartBuffer.text('100%', chartBuffer.width - 4, 2);
  chartBuffer.textAlign(RIGHT, BOTTOM);
  chartBuffer.text('0%', chartBuffer.width - 4, CHART_HEIGHT - 2);

  image(chartBuffer, 0, height - CHART_HEIGHT);
}
```

- [ ] **Step 5: Verify the grid renders**

Run: `hugo server`, open the sketch in a browser.
Expected: A randomly populated grid of colored glyphs on a black background. Dimmed glyphs for unhappy agents. An empty chart area at the bottom. No simulation running yet (paused).

- [ ] **Step 6: Commit**

```bash
git add content/schelling-segregation/main.js
git commit -m "feat: Schelling grid rendering and initialization"
```

---

## Task 3: Simulation Logic (Movement Strategies)

**Files:**
- Modify: `content/schelling-segregation/main.js`

This task adds the three movement strategies and the `doStep()` function that drives the simulation.

- [ ] **Step 1: Add segregation measurement**

Add after the `isUnhappy` function:

```javascript
function measureSegregation() {
  let totalSimilarity = 0;
  let agentCount = 0;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const groupId = cells[y * gridSize + x];
      if (groupId === EMPTY) continue;

      let sameCount = 0;
      let neighborCount = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;
          const neighbor = cells[ny * gridSize + nx];
          if (neighbor === EMPTY) continue;
          neighborCount++;
          if (neighbor === groupId) sameCount++;
        }
      }
      if (neighborCount > 0) {
        totalSimilarity += sameCount / neighborCount;
        agentCount++;
      }
    }
  }

  return agentCount > 0 ? totalSimilarity / agentCount : 0;
}
```

- [ ] **Step 2: Add movement strategy — Random**

```javascript
function getEmptyCells() {
  const empties = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === EMPTY) empties.push(i);
  }
  return empties;
}

function moveRandom(unhappyIndices) {
  const empties = getEmptyCells();
  if (empties.length === 0) return;

  for (const idx of unhappyIndices) {
    if (cells[idx] === EMPTY) continue; // already moved by a previous agent in this step
    if (empties.length === 0) break;

    const emptyPick = Math.floor(Math.random() * empties.length);
    const targetIdx = empties[emptyPick];

    // Move agent
    cells[targetIdx] = cells[idx];
    cells[idx] = EMPTY;

    // Update empties: remove target, add old position
    empties[emptyPick] = idx;
  }
}
```

- [ ] **Step 3: Add movement strategy — Nearest Satisfying**

```javascript
function moveNearestSatisfying(unhappyIndices) {
  const emptySet = new Set();
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === EMPTY) emptySet.add(i);
  }

  for (const idx of unhappyIndices) {
    if (cells[idx] === EMPTY) continue;
    const groupId = cells[idx];
    const startX = idx % gridSize;
    const startY = Math.floor(idx / gridSize);

    // BFS from current position
    const visited = new Set();
    const queue = [[startX, startY, 0]];
    visited.add(idx);
    let found = -1;

    while (queue.length > 0) {
      const [cx, cy, dist] = queue.shift();
      const ci = cy * gridSize + cx;

      // Check if this empty cell would make agent happy
      if (ci !== idx && emptySet.has(ci)) {
        if (!wouldBeUnhappy(cx, cy, groupId, idx)) {
          found = ci;
          break;
        }
      }

      // Expand neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;
          const ni = ny * gridSize + nx;
          if (!visited.has(ni)) {
            visited.add(ni);
            queue.push([nx, ny, dist + 1]);
          }
        }
      }
    }

    if (found >= 0) {
      cells[found] = groupId;
      cells[idx] = EMPTY;
      emptySet.delete(found);
      emptySet.add(idx);
    }
  }
}

// Check if agent of groupId placed at (x,y) would be unhappy,
// pretending cell at ignoreIdx is empty (agent's old position)
function wouldBeUnhappy(x, y, groupId, ignoreIdx) {
  const settingsIdx = groupId - 1;
  const settings = groupSettings[settingsIdx];
  if (!settings) return false;

  let sameCount = 0;
  let neighborCount = 0;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;
      const ni = ny * gridSize + nx;
      if (ni === ignoreIdx) continue; // pretend old position is empty
      const neighbor = cells[ni];
      if (neighbor === EMPTY) continue;
      neighborCount++;
      if (neighbor === groupId) sameCount++;
    }
  }

  if (neighborCount === 0) return false;
  const similarity = sameCount / neighborCount;
  return similarity < settings.tolerance || similarity > settings.antiBias;
}
```

- [ ] **Step 4: Add movement strategy — Swap**

```javascript
function moveSwap(unhappyIndices) {
  // Shuffle the unhappy list and pair them up for swaps
  const shuffled = [...unhappyIndices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  const swapped = new Set();
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    const a = shuffled[i];
    const b = shuffled[i + 1];
    if (swapped.has(a) || swapped.has(b)) continue;
    if (cells[a] === EMPTY || cells[b] === EMPTY) continue;
    if (cells[a] === cells[b]) continue; // no point swapping same group

    const tmp = cells[a];
    cells[a] = cells[b];
    cells[b] = tmp;
    swapped.add(a);
    swapped.add(b);
  }
}
```

- [ ] **Step 5: Add doStep() and stagnation/equilibrium detection**

```javascript
let stagnationCounter = 0;
let lastUnhappyCount = -1;
let statusMessage = '';

function doStep() {
  // Compute who is unhappy
  computeUnhappySet();

  // Collect unhappy indices
  const unhappyIndices = [];
  for (let i = 0; i < unhappySet.length; i++) {
    if (unhappySet[i]) unhappyIndices.push(i);
  }

  // Equilibrium check
  if (unhappyIndices.length === 0) {
    paused = true;
    statusMessage = 'Equilibrium at step ' + stepCount;
    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.textContent = 'Play';
    return;
  }

  // Stagnation check
  if (unhappyIndices.length === lastUnhappyCount) {
    stagnationCounter++;
  } else {
    stagnationCounter = 0;
  }
  lastUnhappyCount = unhappyIndices.length;
  if (stagnationCounter >= 50) {
    statusMessage = 'Stagnated';
  } else {
    statusMessage = '';
  }

  // Shuffle unhappy agents
  for (let i = unhappyIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = unhappyIndices[i];
    unhappyIndices[i] = unhappyIndices[j];
    unhappyIndices[j] = tmp;
  }

  // Apply movement strategy
  if (strategy === 'random') {
    moveRandom(unhappyIndices);
  } else if (strategy === 'nearest') {
    moveNearestSatisfying(unhappyIndices);
  } else if (strategy === 'swap') {
    moveSwap(unhappyIndices);
  }

  stepCount++;

  // Record segregation
  const seg = measureSegregation();
  segregationHistory.push(seg);
  if (segregationHistory.length > MAX_HISTORY) {
    segregationHistory.shift();
  }
}
```

- [ ] **Step 6: Verify simulation runs**

Run: `hugo server`, open the sketch, click Play.
Expected: Agents move around, clusters form. Unhappy agents (dimmed) decrease over time. Segregation chart rises. Simulation pauses at equilibrium.

- [ ] **Step 7: Commit**

```bash
git add content/schelling-segregation/main.js
git commit -m "feat: add simulation logic with three movement strategies"
```

---

## Task 4: UI Controls Binding

**Files:**
- Modify: `content/schelling-segregation/main.js`

This task wires up all HTML controls to the simulation state.

- [ ] **Step 1: Add bindControls()**

```javascript
function bindControls() {
  const playBtn = document.getElementById('play-btn');
  const stepBtn = document.getElementById('step-btn');
  const resetBtn = document.getElementById('reset-btn');
  const speedSlider = document.getElementById('speed-slider');
  const speedValue = document.getElementById('speed-value');
  const gridSelect = document.getElementById('grid-select');
  const densitySlider = document.getElementById('density-slider');
  const densityValue = document.getElementById('density-value');
  const strategySelect = document.getElementById('strategy-select');
  const addGroupBtn = document.getElementById('add-group-btn');
  const removeGroupBtn = document.getElementById('remove-group-btn');

  playBtn.addEventListener('click', function () {
    paused = !paused;
    playBtn.textContent = paused ? 'Play' : 'Pause';
  });

  stepBtn.addEventListener('click', function () {
    doStep();
    syncGrid();
    renderAll();
    updateReadouts();
  });

  resetBtn.addEventListener('click', function () {
    resetSimulation();
  });

  speedSlider.addEventListener('input', function () {
    stepsPerFrame = parseInt(speedSlider.value, 10);
    speedValue.textContent = stepsPerFrame;
  });

  gridSelect.addEventListener('change', function () {
    gridSize = parseInt(gridSelect.value, 10);
    fullReset();
  });

  densitySlider.addEventListener('input', function () {
    density = parseInt(densitySlider.value, 10) / 100;
    densityValue.textContent = parseInt(densitySlider.value, 10);
  });

  strategySelect.addEventListener('change', function () {
    strategy = strategySelect.value;
  });

  addGroupBtn.addEventListener('click', function () {
    if (activeGroupCount >= 6) return;
    activeGroupCount++;
    resetSimulation();
    buildGroupControlsUI();
  });

  removeGroupBtn.addEventListener('click', function () {
    if (activeGroupCount <= 2) return;
    activeGroupCount--;
    resetSimulation();
    buildGroupControlsUI();
  });
}

function resetSimulation() {
  paused = true;
  const playBtn = document.getElementById('play-btn');
  if (playBtn) playBtn.textContent = 'Play';
  stepCount = 0;
  stagnationCounter = 0;
  lastUnhappyCount = -1;
  statusMessage = '';
  segregationHistory = [];
  initCells();
  syncGrid();
  renderAll();
  updateReadouts();
}

function fullReset() {
  // Recreate canvas and grid for new grid size
  const dims = Nuglib.calculateGridDimensions(
    CHAR_WIDTH * gridSize,
    CHAR_HEIGHT * gridSize,
    CHAR_WIDTH,
    CHAR_HEIGHT
  );

  resizeCanvas(dims.adjustedWidth, dims.adjustedHeight + CHART_HEIGHT);
  background(0);

  grid = Nuglib.createGrid(gridSize, gridSize);
  gridRenderer = Nuglib.GridRenderer({
    cellHeight: CHAR_HEIGHT,
    cellWidth: CHAR_WIDTH,
    backgroundColor: color(0),
  });
  layerManager = new Nuglib.LayerManager(window);
  layerManager.createLayer('grid', Nuglib.createTextLayerConfig(
    dims.adjustedWidth,
    dims.adjustedHeight,
    CHAR_HEIGHT,
    'Courier New'
  ));
  chartBuffer = createGraphics(dims.adjustedWidth, CHART_HEIGHT);

  initGroupSettings();
  resetSimulation();
  buildGroupControlsUI();
}
```

- [ ] **Step 2: Add buildGroupControlsUI()**

```javascript
function buildGroupControlsUI() {
  const container = document.getElementById('group-controls');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < activeGroupCount; i++) {
    const g = GROUPS[i];
    const settings = groupSettings[i];
    const rgbStr = 'rgb(' + g.fg[0] + ',' + g.fg[1] + ',' + g.fg[2] + ')';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:4px 0; border-bottom:1px solid #333;';

    row.innerHTML =
      '<span style="color:' + rgbStr + '; font-family:Courier New; font-weight:bold; min-width:60px;">' + g.glyph + ' ' + g.name + '</span>' +
      '<label style="font-size:0.8em;">Pop: <span id="prop-value-' + i + '">' + Math.round(settings.proportion * 100) + '</span>%' +
      '<input type="range" class="control-slider" id="prop-slider-' + i + '" min="5" max="200" value="' + Math.round(settings.proportion * 100) + '" style="width:80px;"></label>' +
      '<label style="font-size:0.8em;">Tol: <span id="tol-value-' + i + '">' + Math.round(settings.tolerance * 100) + '</span>%' +
      '<input type="range" class="control-slider" id="tol-slider-' + i + '" min="0" max="100" value="' + Math.round(settings.tolerance * 100) + '" style="width:80px;"></label>' +
      '<label style="font-size:0.8em;">Anti: <span id="anti-value-' + i + '">' + Math.round(settings.antiBias * 100) + '</span>%' +
      '<input type="range" class="control-slider" id="anti-slider-' + i + '" min="0" max="100" value="' + Math.round(settings.antiBias * 100) + '" style="width:80px;"></label>';

    container.appendChild(row);

    // Bind slider events (closure over i)
    (function (idx) {
      document.getElementById('prop-slider-' + idx).addEventListener('input', function () {
        groupSettings[idx].proportion = parseInt(this.value, 10) / 100;
        document.getElementById('prop-value-' + idx).textContent = parseInt(this.value, 10);
      });
      document.getElementById('tol-slider-' + idx).addEventListener('input', function () {
        groupSettings[idx].tolerance = parseInt(this.value, 10) / 100;
        document.getElementById('tol-value-' + idx).textContent = parseInt(this.value, 10);
      });
      document.getElementById('anti-slider-' + idx).addEventListener('input', function () {
        groupSettings[idx].antiBias = parseInt(this.value, 10) / 100;
        document.getElementById('anti-value-' + idx).textContent = parseInt(this.value, 10);
      });
    })(i);
  }
}
```

- [ ] **Step 3: Add updateReadouts()**

```javascript
function updateReadouts() {
  const stepEl = document.getElementById('step-count');
  const unhappyEl = document.getElementById('unhappy-count');
  const segEl = document.getElementById('segregation-value');
  const statusEl = document.getElementById('status-text');

  if (stepEl) stepEl.textContent = 'Step: ' + stepCount;

  if (unhappyEl) {
    let unhappyCount = 0;
    let agentCount = 0;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] !== EMPTY) {
        agentCount++;
        if (unhappySet && unhappySet[i]) unhappyCount++;
      }
    }
    const pct = agentCount > 0 ? Math.round(100 * unhappyCount / agentCount) : 0;
    unhappyEl.textContent = 'Unhappy: ' + pct + '%';
  }

  if (segEl) {
    const seg = segregationHistory.length > 0
      ? segregationHistory[segregationHistory.length - 1]
      : measureSegregation();
    segEl.textContent = 'Segregation: ' + Math.round(seg * 100) + '%';
  }

  if (statusEl) statusEl.textContent = statusMessage;
}
```

- [ ] **Step 4: Verify all controls work**

Run: `hugo server`, open the sketch.
Expected:
- Play/Pause/Step/Reset buttons work
- Speed slider updates steps per frame
- Grid size dropdown resets and resizes the grid
- Density slider updates (takes effect on next Reset)
- Movement strategy dropdown switches strategies
- Add/Remove Group buttons add/remove group rows and reset
- Per-group sliders update tolerance, anti-bias, and proportion values
- Readouts update live during simulation

- [ ] **Step 5: Commit**

```bash
git add content/schelling-segregation/main.js
git commit -m "feat: wire up all UI controls for Schelling sketch"
```

---

**Deferred:** The spec mentions destination cell flash/highlight on agent moves. This is omitted — with hundreds of agents moving per step, per-cell flashing would be imperceptible and add complexity. The dimmed-glyph indicator for unhappy agents already communicates who is about to move. Can be revisited as a future polish pass.

---

## Task 5: Polish & Final Verification

**Files:**
- Modify: `content/schelling-segregation/main.js`
- Modify: `content/schelling-segregation/index.md` (if needed)

- [ ] **Step 1: Add density slider reset behavior**

The density slider should trigger a reset when changed (since changing density mid-simulation is meaningless without redistributing). Modify the density slider event handler in `bindControls()`:

```javascript
  densitySlider.addEventListener('input', function () {
    density = parseInt(densitySlider.value, 10) / 100;
    densityValue.textContent = parseInt(densitySlider.value, 10);
    resetSimulation();
  });
```

- [ ] **Step 2: Add initial segregation measurement on reset**

In `resetSimulation()`, add after `initCells()`:

```javascript
  // Record initial segregation
  computeUnhappySet();
  const initialSeg = measureSegregation();
  segregationHistory.push(initialSeg);
```

- [ ] **Step 3: Verify the full sketch end-to-end**

Run: `hugo server`, open the sketch.

Test checklist:
- [ ] Grid renders with colored glyphs for each race
- [ ] Unhappy agents are visibly dimmed
- [ ] Play starts simulation, Pause stops it
- [ ] Step advances one step while paused
- [ ] Reset re-randomizes the grid
- [ ] Speed slider changes simulation speed
- [ ] Grid size dropdown changes grid and resets
- [ ] Density slider changes occupancy and resets
- [ ] Movement strategy dropdown switches between Random, Nearest Satisfying, Swap
- [ ] Add/Remove Group buttons work (min 2, max 6)
- [ ] Per-group tolerance sliders affect happiness calculation
- [ ] Per-group anti-bias sliders affect happiness calculation (set to <100% to see effect)
- [ ] Per-group proportion sliders affect population distribution on reset
- [ ] Segregation chart plots over time
- [ ] Equilibrium auto-pauses with message
- [ ] Stagnation message appears after 50 steps with no improvement
- [ ] Attribution link visible and clickable

- [ ] **Step 4: Commit**

```bash
git add content/schelling-segregation/main.js content/schelling-segregation/index.md
git commit -m "fix: polish Schelling Segregation — density reset, initial segregation"
```
