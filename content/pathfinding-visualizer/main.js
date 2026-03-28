// Pathfinding Algorithm Visualizer
// Renders stepped pathfinding on hand-crafted maps using p5.js + Nuglib

// ─── Algorithm Registry ─────────────────────────────────────────────────────
const ALGORITHMS = {
  astar:    { name: "A*",                fn: Nuglib.findPathStepped },
  dijkstra: { name: "Dijkstra",          fn: Nuglib.findPathDijkstraStepped },
  greedy:   { name: "Greedy Best-First", fn: Nuglib.findPathGreedyStepped },
  bfs:      { name: "BFS",               fn: Nuglib.findPathBFSStepped },
  jps:      { name: "Jump Point Search", fn: Nuglib.findPathJPSStepped },
};

// ─── Tile Rendering ─────────────────────────────────────────────────────────
const TILE_W = 18;
const TILE_H = 22;

// ─── State ──────────────────────────────────────────────────────────────────
let currentMapIndex = 0;
let currentAlgorithm = "astar";
let map = null;           // Nuglib map
let mapDef = null;        // Current EXAMPLE_MAPS entry
let generator = null;     // Stepped generator
let lastStep = null;      // Most recent StepState
let result = null;        // Final PathResult (null until done)
let playing = false;
let playSpeed = 5;        // Steps per second
let lastPlayTime = 0;
let hoverX = -1;
let hoverY = -1;
let finished = false;

// ─── DOM Elements ───────────────────────────────────────────────────────────
let mapSelect, algorithmSelect, playBtn, stepBtn, resetBtn;
let speedSlider, speedValue, statExplored, statFrontier, statPath;

// ─── Setup ──────────────────────────────────────────────────────────────────
function setup() {
  mapDef = EXAMPLE_MAPS[0];
  const cnv = createCanvas(mapDef.width * TILE_W, mapDef.height * TILE_H);
  cnv.parent(select(".sketch-container"));
  textFont("monospace");
  textAlign(CENTER, CENTER);
  noStroke();

  // Grab DOM elements
  mapSelect = select("#map-select");
  algorithmSelect = select("#algorithm-select");
  playBtn = select("#play-btn");
  stepBtn = select("#step-btn");
  resetBtn = select("#reset-btn");
  speedSlider = select("#speed-slider");
  speedValue = select("#speed-value");
  statExplored = select("#stat-explored");
  statFrontier = select("#stat-frontier");
  statPath = select("#stat-path");

  // Populate map dropdown
  for (let i = 0; i < EXAMPLE_MAPS.length; i++) {
    const opt = createElement("option", EXAMPLE_MAPS[i].name);
    opt.attribute("value", String(i));
    opt.parent(mapSelect);
  }

  // Bind events
  mapSelect.changed(() => {
    currentMapIndex = parseInt(mapSelect.value());
    loadMapAndReset();
  });

  algorithmSelect.changed(() => {
    currentAlgorithm = algorithmSelect.value();
    resetVisualization();
  });

  playBtn.mousePressed(() => {
    if (finished) return;
    playing = !playing;
    playBtn.html(playing ? "Pause" : "Play");
  });

  stepBtn.mousePressed(() => {
    if (finished) return;
    doStep();
  });

  resetBtn.mousePressed(() => {
    resetVisualization();
  });

  speedSlider.input(() => {
    playSpeed = parseInt(speedSlider.value());
    speedValue.html(String(playSpeed));
  });

  loadMapAndReset();
}

// ─── Map Loading ────────────────────────────────────────────────────────────
function loadMapAndReset() {
  mapDef = EXAMPLE_MAPS[currentMapIndex];

  // Create Nuglib map from definition
  map = Nuglib.createMap(mapDef.width, mapDef.height);
  for (let y = 0; y < mapDef.height; y++) {
    for (let x = 0; x < mapDef.width; x++) {
      const tile = mapDef.tiles[y * mapDef.width + x];
      map.setTile(x, y, tile === 1 ? Nuglib.Tiles.Floor : Nuglib.Tiles.Wall);
    }
  }

  // Resize canvas to match map
  resizeCanvas(mapDef.width * TILE_W, mapDef.height * TILE_H);

  resetVisualization();
}

function resetVisualization() {
  playing = false;
  finished = false;
  lastStep = null;
  result = null;
  lastPlayTime = 0;
  if (playBtn) playBtn.html("Play");

  const algEntry = ALGORITHMS[currentAlgorithm];
  generator = algEntry.fn(
    map,
    mapDef.start.x, mapDef.start.y,
    mapDef.goal.x, mapDef.goal.y,
    { maxNodes: 10000 }
  );

  updateStats();
}

// ─── Stepping ───────────────────────────────────────────────────────────────
function doStep() {
  if (!generator || finished) return;

  const next = generator.next();
  if (next.done) {
    // Generator returned PathResult
    result = next.value;
    finished = true;
    playing = false;
    if (playBtn) playBtn.html("Play");
  } else {
    lastStep = next.value;
  }

  updateStats();
}

function updateStats() {
  if (!statExplored) return;

  if (lastStep) {
    statExplored.html(String(lastStep.nodesExplored));
    statFrontier.html(String(lastStep.openSet.size));
  } else if (result) {
    statExplored.html(String(result.nodesExplored));
    statFrontier.html("0");
  } else {
    statExplored.html("0");
    statFrontier.html("0");
  }

  if (result) {
    statPath.html(result.found ? String(result.path.length) : "No path");
  } else {
    statPath.html("\u2014");
  }
}

// ─── Draw ───────────────────────────────────────────────────────────────────
function draw() {
  // Auto-step if playing
  if (playing && !finished) {
    const now = millis();
    const interval = 1000 / playSpeed;
    if (now - lastPlayTime >= interval) {
      doStep();
      lastPlayTime = now;
    }
  }

  background(0);

  // Track hover
  hoverX = Math.floor(mouseX / TILE_W);
  hoverY = Math.floor(mouseY / TILE_H);
  if (hoverX < 0 || hoverX >= mapDef.width || hoverY < 0 || hoverY >= mapDef.height) {
    hoverX = -1;
    hoverY = -1;
  }

  drawMap();
  drawOverlay();
  drawPath();
  drawStartGoal();
  drawTooltip();
}

// ─── Map Rendering ──────────────────────────────────────────────────────────
function drawMap() {
  textSize(14);
  for (let y = 0; y < mapDef.height; y++) {
    for (let x = 0; x < mapDef.width; x++) {
      const tile = mapDef.tiles[y * mapDef.width + x];
      const px = x * TILE_W + TILE_W / 2;
      const py = y * TILE_H + TILE_H / 2;

      if (tile === 0) {
        // Wall
        fill(128, 128, 128);
        text("#", px, py);
      } else {
        // Floor
        fill(60, 60, 60);
        text("\u00B7", px, py);
      }
    }
  }
}

// ─── Algorithm Overlay ──────────────────────────────────────────────────────
function drawOverlay() {
  if (!lastStep && !finished) return;

  const step = lastStep;
  if (!step) return;

  // Closed set (explored) - blue tint
  for (const [, node] of step.closedSet) {
    fill(59, 130, 246, 60);
    rect(node.x * TILE_W, node.y * TILE_H, TILE_W, TILE_H);
  }

  // Open set (frontier) - yellow tint
  for (const [, node] of step.openSet) {
    fill(251, 191, 36, 50);
    rect(node.x * TILE_W, node.y * TILE_H, TILE_W, TILE_H);
  }

  // Current node - bright amber (only if not finished)
  if (!finished) {
    fill(245, 158, 11, 150);
    rect(step.current.x * TILE_W, step.current.y * TILE_H, TILE_W, TILE_H);
  }
}

// ─── Path Drawing ───────────────────────────────────────────────────────────
function drawPath() {
  if (!result || !result.found) return;

  for (const node of result.path) {
    fill(249, 115, 22, 130);
    rect(node.x * TILE_W, node.y * TILE_H, TILE_W, TILE_H);
  }
}

// ─── Start & Goal Glyphs ───────────────────────────────────────────────────
function drawStartGoal() {
  textSize(16);

  // Start
  fill(96, 165, 250);
  text("@", mapDef.start.x * TILE_W + TILE_W / 2, mapDef.start.y * TILE_H + TILE_H / 2);

  // Goal
  fill(74, 222, 128);
  text("\u2605", mapDef.goal.x * TILE_W + TILE_W / 2, mapDef.goal.y * TILE_H + TILE_H / 2);
}

// ─── Tooltip ────────────────────────────────────────────────────────────────
function drawTooltip() {
  if (hoverX < 0 || hoverY < 0) return;
  if (!lastStep) return;

  const key = hoverX + "," + hoverY;
  let node = null;
  let status = null;

  if (lastStep.closedSet.has(key)) {
    node = lastStep.closedSet.get(key);
    status = "Explored";
  } else if (lastStep.openSet.has(key)) {
    node = lastStep.openSet.get(key);
    status = "Frontier";
  }

  if (!node) return;

  // Build tooltip lines
  const lines = [
    "(" + node.x + ", " + node.y + ") " + status,
    "g: " + node.g.toFixed(1) + "  h: " + node.h.toFixed(1) + "  f: " + node.f.toFixed(1),
  ];

  // Parent direction
  if (node.parentX !== node.x || node.parentY !== node.y) {
    const arrow = directionArrow(node.x, node.y, node.parentX, node.parentY);
    lines.push("parent: " + arrow + " (" + node.parentX + ", " + node.parentY + ")");
  }

  // Measure tooltip size
  textSize(12);
  const padding = 8;
  const lineHeight = 16;
  let maxW = 0;
  for (const line of lines) {
    const w = textWidth(line);
    if (w > maxW) maxW = w;
  }
  const boxW = maxW + padding * 2;
  const boxH = lines.length * lineHeight + padding * 2;

  // Position near tile, keep on screen
  let tx = (hoverX + 1) * TILE_W + 4;
  let ty = hoverY * TILE_H;
  if (tx + boxW > width) tx = hoverX * TILE_W - boxW - 4;
  if (ty + boxH > height) ty = height - boxH;
  if (ty < 0) ty = 0;

  // Draw background
  const borderColor = status === "Explored"
    ? color(59, 130, 246, 200)
    : color(251, 191, 36, 200);

  stroke(borderColor);
  strokeWeight(1);
  fill(20, 20, 30, 220);
  rect(tx, ty, boxW, boxH, 4);
  noStroke();

  // Draw text
  fill(220);
  textAlign(LEFT, TOP);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], tx + padding, ty + padding + i * lineHeight);
  }

  // Restore alignment
  textAlign(CENTER, CENTER);
}

function directionArrow(fromX, fromY, toX, toY) {
  const dx = Math.sign(toX - fromX);
  const dy = Math.sign(toY - fromY);
  const arrows = {
    "0,-1": "\u2191",
    "0,1": "\u2193",
    "-1,0": "\u2190",
    "1,0": "\u2192",
    "-1,-1": "\u2196",
    "1,-1": "\u2197",
    "-1,1": "\u2199",
    "1,1": "\u2198",
  };
  return arrows[dx + "," + dy] || "\u00B7";
}
