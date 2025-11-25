// Initialize RNG with seed
const rng = Nuglib.xoroshiro128plus(BigInt(Date.now()));

class Walker {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.color = Nuglib.randomBrightRgb(rng, 100);
  }

  step() {
    // Use random step utility for 8-way movement
    const direction = Nuglib.randomStep(rng, true);
    this.x += direction.dx;
    this.y += direction.dy;
  }
}

// Glyph palette for the sketch
const palette = new Nuglib.GlyphPalette();
palette.registerGlyph('wall', '#', [128, 128, 128], [0, 0, 0]);
palette.registerGlyph('floor', '.', [64, 64, 64], [0, 0, 0]);

let grid;
let gridRenderer;
let layerManager;
let walker;
let playback;
const charHeight = 24;
const charWidth = 16;
let cols;
let rows;

function initGrid() {
  cols = floor(width / charWidth);
  rows = floor(height / charHeight);

  // Create grid and initialize all cells as walls
  grid = Nuglib.createGrid(cols, rows);
  grid.init((cell) => {
    cell.value = palette.get('wall');
  });

  // Reset walker to center
  resetWalker();
}

function resetWalker() {
  const newX = floor(cols / 2);
  const newY = floor(rows / 2);
  walker = new Walker(newX, newY);
}

function stepWalker() {
  // Only step 10% of the time for slower movement
  if (rng.nextFloat() < 0.1) {
    walker.step();
  }

  // Check if walker is out of bounds using grid bounds utilities
  const bounds = { width: cols, height: rows };
  if (!Nuglib.isInBounds(walker.x, walker.y, bounds)) {
    resetWalker();
    return;
  }

  // Carve out the floor at walker's position
  const cell = grid.getCell(walker.x, walker.y);
  cell.value = palette.getWithColor('floor', walker.color);
}

function setup() {
  const gridDims = Nuglib.calculateGridDimensions(
    charWidth * 40,
    charHeight * 25,
    charWidth,
    charHeight
  );

  createCanvas(gridDims.adjustedWidth, gridDims.adjustedHeight);
  background(0);

  cols = gridDims.cols;
  rows = gridDims.rows;

  // Create playback controller
  playback = new Nuglib.PlaybackController({
    isRunning: true,
    stepsPerFrame: 1
  });

  // Create grid renderer
  gridRenderer = Nuglib.GridRenderer({
    cellHeight: charHeight,
    cellWidth: charWidth,
    backgroundColor: color(0),
  });

  // Create layer manager
  layerManager = new Nuglib.LayerManager(window);
  layerManager.createLayer('grid', Nuglib.createTextLayerConfig(
    width,
    height,
    24,
    'Courier New'
  ));

  // Initialize grid
  initGrid();

  // Wire up controls using playback controller
  playback.bindPlayPauseButton('pause-btn', 'Resume', 'Pause');
  playback.bindStepButton('step-btn');
  playback.bindSpeedSlider('speed-slider', 'speed-value');
  playback.bindButton('clear-btn', clearMap);
}

function clearMap() {
  initGrid();
  background(0);
}

function draw() {
  background(0);

  if (playback.shouldRun()) {
    for (let i = 0; i < playback.getStepsPerFrame(); i++) {
      stepWalker();
    }
  }

  // Render the grid using layer manager
  const gridLayer = layerManager.requireLayer('grid');
  gridRenderer.draw(grid, window, gridLayer);
  layerManager.render();
}
