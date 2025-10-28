class Tile {
  constructor(char = '#', color = [128, 128, 128]) {
    this.char = char;
    this.color = color;
  }
}

class Walker {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.color = [random(100, 255), random(100, 255), random(100, 255)];
  }

  step() {
    let xstep = floor(random(3)) - 1;
    let ystep = floor(random(3)) - 1;
    this.x += xstep;
    this.y += ystep;
  }
}

const tiles = {
  wall: new Tile('#', [128, 128, 128]),
  floor: new Tile('.', [255, 255, 255]),
}

class TileMap {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.resetWalker();
    this.map = [];
    for (let i = 0; i < cols; i++) {
      this.map[i] = [];
      for (let j = 0; j < rows; j++) {
        this.map[i][j] = tiles.wall;
      }
    }
  }

  step() {
    if (random() < 0.1) {
      this.walker.step();
    }
    if (!this.checkWalker()) {
      this.resetWalker();
    }
    this.map[this.walker.x][this.walker.y] = new Tile(tiles.floor.char, this.walker.color);
  }

  checkWalker() {
    switch (true) {
      case this.walker.x < 0:
      case this.walker.y < 0:
      case this.walker.x >= this.cols:
      case this.walker.y >= this.rows:
        return false;
      default:
        return true;
    }
  }

  resetWalker() {
    const newX = floor(this.cols / 2);
    const newY = floor(this.rows / 2);
    this.walker = new Walker(newX, newY);
  }

  containsWalker(x, y) {
    return this.walker.x === x && this.walker.y === y;
  }

  display(charWidth, charHeight, fontSize) {
    textFont('Courier New');
    textSize(fontSize);
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        const tile = this.map[i][j];
        fill(...tile.color);
        text(tile.char, (i + 1) * charWidth, (j + 1) * charHeight);
      }
    }
  }
}

let tileMap;
let charHeight = 24;
let charWidth = 16;
let isRunning = true;
let shouldStep = false;
let stepsPerFrame = 1;

function setup() {
  createCanvas(400, 400);
  tileMap = new TileMap(floor(width / charWidth), floor(height / charHeight), '#');
  background(0);

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
  tileMap = new TileMap(floor(width / charWidth), floor(height / charHeight), '#');
  background(0);
}

function draw() {
  clear();

  if (isRunning || shouldStep) {
    for (let i = 0; i < stepsPerFrame; i++) {
      tileMap.step();
    }
    shouldStep = false;
  }

  tileMap.display(charWidth, charHeight, 24);
}
