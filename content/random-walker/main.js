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

// Glyph templates
const glyphs = {
  wall: () => Nuglib.createGlyph('#', [128, 128, 128], [0, 0, 0]),
  floor: (color) => Nuglib.createGlyph('.', color, [0, 0, 0]),
};

let grid;
let gridRenderer;
let gridLayer;
let walker;
let charHeight = 24;
let charWidth = 16;
let isRunning = true;
let shouldStep = false;
let stepsPerFrame = 1;
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

  // Wire up controls
  document.getElementById('pause-btn').addEventListener('click', togglePause);
  document.getElementById('step-btn').addEventListener('click', stepOnce);
  document.getElementById('clear-btn').addEventListener('click', clearMap);
  document.getElementById('speed-slider').addEventListener('input', updateSpeed);
}

function updateSpeed(event) {
  stepsPerFrame = parseInt(event.target.value);
  document.getElementById('speed-value').textContent = stepsPerFrame;
}

function togglePause() {
  isRunning = !isRunning;
  const btn = document.getElementById('pause-btn');
  btn.textContent = isRunning ? 'Pause' : 'Resume';
}

function stepOnce() {
  shouldStep = true;
}

function clearMap() {
  initGrid();
  background(0);
}

function draw() {
  background(0);

  if (isRunning || shouldStep) {
    for (let i = 0; i < stepsPerFrame; i++) {
      stepWalker();
    }
    shouldStep = false;
  }

  // Render the grid
  gridRenderer.draw(grid, window, gridLayer);
  image(gridLayer, 0, 0);
}
