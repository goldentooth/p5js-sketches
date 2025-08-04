let worker;
let bestBotGenome = null;
let world;

const GRID_W = 10;
const GRID_H = 10;
const CANS = 50;

let replaySim = null;
let replayTick = 0;

function setup() {
  createCanvas(500, 500);
  frameRate(30);

  // start GA in worker
  worker = new Worker('ga-worker.js');
  worker.onmessage = (e) => {
    const msg = e.data;

    if (msg.type === 'status') {
      console.log(`Gen ${msg.gen} | Best: ${msg.bestScore} | Worst: ${msg.worstScore}`);
      bestBotGenome = msg.bestBot;

      if (replaySim && replayTick < replaySim.lifespan) {
        return;
      }

      // Prepare a new replay sim for this generation
      world = World.fromRandom(GRID_W, GRID_H, CANS);
      const robot = new Robot(bestBotGenome);
      replaySim = new Simulation(world, robot, GRID_W * GRID_H * 2);
      replayTick = 0;
    } else if (msg.type === 'done') {
      console.log('GA done!');
    }
  };

  worker.postMessage({
    type: 'start',
    popSize: 20000,
    generations: 1000,
    worldWidth: GRID_W,
    worldHeight: GRID_H,
    cans: CANS
  });
}

function draw() {
  background(255);

  if (replaySim) {
    drawGrid(replaySim.world); // ✅ draw from replaySim.world, not stale world

    // Advance simulation slowly so we can watch it
    if (replayTick < replaySim.lifespan) {
      replaySim.step();
      replayTick++;
    }
    drawReplayBot();
  } else {
    drawGrid(world); // fallback if no replay yet
  }
}

function drawGrid(worldToDraw) {
  if (!worldToDraw) return;

  stroke(0);
  let spacingX = width / GRID_W;
  let spacingY = height / GRID_H;

  for (let x = 0; x <= width; x += spacingX) line(x, 0, x, height);
  for (let y = 0; y <= height; y += spacingY) line(0, y, width, y);

  // draw cans
  noStroke();
  fill(0, 150, 0);
  for (let i = 0; i < GRID_W * GRID_H; i++) {
    if (worldToDraw.cells[i]) {
      let [gx, gy] = worldToDraw.xy(i);
      circle(
        gx * spacingX + spacingX / 2,
        gy * spacingY + spacingY / 2,
        min(spacingX, spacingY) / 3
      );
    }
  }
}

function drawReplayBot() {
  let spacingX = width / GRID_W;
  let spacingY = height / GRID_H;

  fill(255, 0, 0);
  circle(
    replaySim.x * spacingX + spacingX / 2,
    replaySim.y * spacingY + spacingY / 2,
    min(spacingX, spacingY) / 2
  );
}
