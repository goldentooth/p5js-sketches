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

// === Stubs for later tasks ===
function doStep() {}
function bindControls() {}
function buildGroupControlsUI() {}
function updateReadouts() {}
