// Robbie the Robot - Genetic Algorithm Simulation
// Simplified version without Web Worker

const GRID_W = 10;
const GRID_H = 10;
const CANS = 50;

let world;
let population = [];
let generation = 0;
let bestBot = null;
let currentSim = null;
let simStep = 0;

// Simple GA without worker
function setup() {
  createCanvas(500, 500);
  frameRate(30);
  
  console.log("Starting Robbie the Robot simulation...");
  
  // Initialize world and population
  world = World.fromRandom(GRID_W, GRID_H, CANS);
  
  // Create initial population
  for (let i = 0; i < 50; i++) {
    population.push(Robot.fromRandom());
  }
  
  startNewGeneration();
}

function draw() {
  background(255);
  
  // Draw grid
  drawGrid();
  
  // Draw current robot if simulation is running
  if (currentSim) {
    drawRobot();
    
    // Run simulation steps
    for (let i = 0; i < 5; i++) { // Multiple steps per frame for speed
      if (simStep < 200) { // Lifespan
        currentSim.step();
        simStep++;
      } else {
        // Simulation done, start next generation
        nextGeneration();
        break;
      }
    }
  }
  
  // Display info
  fill(0);
  textSize(16);
  text(`Generation: ${generation}`, 10, 20);
  if (bestBot) {
    text(`Best Score: ${bestBot.score || 0}`, 10, 40);
  }
}

function startNewGeneration() {
  generation++;
  console.log(`Starting generation ${generation}`);
  
  // Reset world for display
  world = World.fromRandom(GRID_W, GRID_H, CANS);
  
  // Start simulation with first robot (or best from previous gen)
  let robotToShow = bestBot || population[0];
  currentSim = new Simulation(world, robotToShow, 200);
  simStep = 0;
}

function nextGeneration() {
  // Evaluate all robots (simplified - just use random scores for now)
  for (let robot of population) {
    let sim = new Simulation(World.fromRandom(GRID_W, GRID_H, CANS), robot, 200);
    robot.score = sim.run();
  }
  
  // Sort by score
  population.sort((a, b) => b.score - a.score);
  bestBot = population[0];
  
  console.log(`Gen ${generation} complete. Best score: ${bestBot.score}`);
  
  // Create new population (simple: keep top 25%, create children, add mutations)
  let newPop = [];
  let keepCount = Math.floor(population.length * 0.25);
  
  // Keep best
  for (let i = 0; i < keepCount; i++) {
    newPop.push(population[i]);
  }
  
  // Create children and mutants
  while (newPop.length < population.length) {
    let parent1 = population[Math.floor(Math.random() * keepCount)];
    let parent2 = population[Math.floor(Math.random() * keepCount)];
    let child = Robot.fromParents(parent1, parent2);
    child.mutate(0.1);
    newPop.push(child);
  }
  
  population = newPop;
  startNewGeneration();
}

function drawGrid() {
  if (!world) return;
  
  stroke(0);
  let spacingX = width / GRID_W;
  let spacingY = height / GRID_H;
  
  // Draw grid lines
  for (let x = 0; x <= width; x += spacingX) {
    line(x, 0, x, height);
  }
  for (let y = 0; y <= height; y += spacingY) {
    line(0, y, width, y);
  }
  
  // Draw cans
  noStroke();
  fill(0, 150, 0);
  for (let i = 0; i < GRID_W * GRID_H; i++) {
    if (world.cells[i]) {
      let [gx, gy] = world.xy(i);
      circle(
        gx * spacingX + spacingX / 2,
        gy * spacingY + spacingY / 2,
        min(spacingX, spacingY) / 3
      );
    }
  }
}

function drawRobot() {
  if (!currentSim) return;
  
  let spacingX = width / GRID_W;
  let spacingY = height / GRID_H;
  
  fill(255, 0, 0);
  noStroke();
  circle(
    currentSim.x * spacingX + spacingX / 2,
    currentSim.y * spacingY + spacingY / 2,
    min(spacingX, spacingY) / 2
  );
}