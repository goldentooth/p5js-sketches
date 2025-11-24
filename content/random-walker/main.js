// Initialize RNG with seed
const rng = Nuglib.xoroshiro128plus(BigInt(Date.now()));

class Walker {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.color = [
      rng.nextRange(100, 255),
      rng.nextRange(100, 255),
      rng.nextRange(100, 255)
    ];
  }

  step() {
    let xstep = rng.nextRange(0, 3) - 1;
    let ystep = rng.nextRange(0, 3) - 1;
    this.x += xstep;
    this.y += ystep;
  }
}

// Glyph templates using palette API
const glyphs = {
  wall: Nuglib.glyphFactory('#', [128, 128, 128], [0, 0, 0]),
  floor: Nuglib.coloredGlyphFactory('.', [0, 0, 0]),
};

let grid;
let gridRenderer;
let gridLayer;
let walker;
let playback;
let charHeight = 24;
let charWidth = 16;
let cols;
let rows;

function initGrid() {
  cols = floor(width / charWidth);
  rows = floor(height / charHeight);

  // Create grid and initialize all cells as walls
  grid = Nuglib.createGrid(cols, rows);
  grid.init((cell) => {
    cell.value = glyphs.wall();
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

  // Check if walker is out of bounds
  if (walker.x < 0 || walker.y < 0 || walker.x >= cols || walker.y >= rows) {
    resetWalker();
    return;
  }

  // Carve out the floor at walker's position
  const cell = grid.getCell(walker.x, walker.y);
  cell.value = glyphs.floor(walker.color);
}

function setup() {
  createCanvas(charWidth * 40, charHeight * 25);
  background(0);

  // Create grid renderer
  gridRenderer = Nuglib.GridRenderer({
    cellHeight: charHeight,
    cellWidth: charWidth,
    backgroundColor: color(0),
  });

  // Create graphics layer for grid
  gridLayer = createGraphics(width, height);
  gridLayer.textFont('Courier New');
  gridLayer.textSize(24);
  gridLayer.textAlign(CENTER, CENTER);

  // Initialize grid
  initGrid();

  // Create playback controller and wire up controls
  playback = new Nuglib.PlaybackController({ isRunning: true, stepsPerFrame: 1 });
  playback.bindPlayPauseButton('pause-btn');
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

  // Render the grid
  gridRenderer.draw(grid, window, gridLayer);
  image(gridLayer, 0, 0);
}
