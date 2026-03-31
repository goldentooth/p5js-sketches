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

// Dimmed versions for unhappy agents (40% brightness)
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

// Stagnation tracking
let stagnationCounter = 0;
let lastUnhappyCount = -1;
let statusMessage = '';

// Rendering
const CHAR_HEIGHT = 14;
const CHAR_WIDTH = 9;
let palette;
let grid;
let gridRenderer;
let layerManager;
let chartBuffer;
const CHART_HEIGHT = 100;

// === Palette and initialization ===

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

// === Unhappy detection and grid sync ===

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
  grid.init(function (cell) {
    const idx = cell.y * gridSize + cell.x;
    const groupId = cells[idx];
    if (groupId === EMPTY) {
      cell.value = palette.get('empty');
    } else {
      const g = GROUPS[groupId - 1];
      const glyphName = unhappySet[idx] ? g.name + '_dim' : g.name;
      cell.value = palette.get(glyphName);
    }
  });
}

// === Simulation logic ===

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
    if (cells[idx] === EMPTY) continue;
    if (empties.length === 0) break;

    const emptyPick = Math.floor(Math.random() * empties.length);
    const targetIdx = empties[emptyPick];

    cells[targetIdx] = cells[idx];
    cells[idx] = EMPTY;

    empties[emptyPick] = idx;
  }
}

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

    const visited = new Set();
    const queue = [[startX, startY, 0]];
    visited.add(idx);
    let found = -1;

    while (queue.length > 0) {
      const [cx, cy, dist] = queue.shift();
      const ci = cy * gridSize + cx;

      if (ci !== idx && emptySet.has(ci)) {
        if (!wouldBeUnhappy(cx, cy, groupId, idx)) {
          found = ci;
          break;
        }
      }

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
      if (ni === ignoreIdx) continue;
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

function moveSwap(unhappyIndices) {
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
    if (cells[a] === cells[b]) continue;

    const tmp = cells[a];
    cells[a] = cells[b];
    cells[b] = tmp;
    swapped.add(a);
    swapped.add(b);
  }
}

function doStep() {
  computeUnhappySet();

  const unhappyIndices = [];
  for (let i = 0; i < unhappySet.length; i++) {
    if (unhappySet[i]) unhappyIndices.push(i);
  }

  if (unhappyIndices.length === 0) {
    paused = true;
    statusMessage = 'Equilibrium at step ' + stepCount;
    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.textContent = 'Play';
    return;
  }

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

  if (strategy === 'random') {
    moveRandom(unhappyIndices);
  } else if (strategy === 'nearest') {
    moveNearestSatisfying(unhappyIndices);
  } else if (strategy === 'swap') {
    moveSwap(unhappyIndices);
  }

  stepCount++;

  const seg = measureSegregation();
  segregationHistory.push(seg);
  if (segregationHistory.length > MAX_HISTORY) {
    segregationHistory.shift();
  }
}

// === setup(), draw(), rendering, and chart ===

function setup() {
  buildPalette();
  initGroupSettings();
  initCells();

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

// === UI Control Implementations ===

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
  computeUnhappySet();
  const initialSeg = measureSegregation();
  segregationHistory.push(initialSeg);
  syncGrid();
  renderAll();
  updateReadouts();
}

function fullReset() {
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
  if (chartBuffer) chartBuffer.remove();
  chartBuffer = createGraphics(dims.adjustedWidth, CHART_HEIGHT);

  initGroupSettings();
  resetSimulation();
  buildGroupControlsUI();
}

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
    resetSimulation();
  });

  strategySelect.addEventListener('change', function () {
    strategy = strategySelect.value;
  });

  addGroupBtn.addEventListener('click', function () {
    if (activeGroupCount >= 6) return;
    activeGroupCount++;
    initGroupSettings();
    resetSimulation();
    buildGroupControlsUI();
  });

  removeGroupBtn.addEventListener('click', function () {
    if (activeGroupCount <= 2) return;
    activeGroupCount--;
    initGroupSettings();
    resetSimulation();
    buildGroupControlsUI();
  });
}

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
