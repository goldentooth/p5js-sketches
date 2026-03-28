# Pathfinding Fishbowl Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A zero-player roguelike fishbowl where monsters roam a dungeon with rock-paper-scissors predation, hunting and fleeing each other autonomously.

**Architecture:** Sketch-local FishbowlAISystem replaces nuglib's AISystem with RPS-aware wandering/hunting/fleeing. Reuses all other nuglib ECS systems (Energy, ActionExecution, Movement, Viewshed) unchanged. God-view rendering with no FOV on the camera. Hugo frontmatter controls for population, speed, playback, and map regeneration.

**Tech Stack:** p5.js, Nuglib (ECS, pathfinding, map generation, FOV, rendering), Hugo frontmatter

---

## File Structure

| File | Responsibility |
|------|---------------|
| `content/pathfinding-fishbowl/index.md` (create) | Hugo frontmatter: title, description, controls HTML, technical details, scripts |
| `content/pathfinding-fishbowl/ai.js` (create) | FishbowlAISystem class: RPS rules, wandering/hunting/fleeing state machine |
| `content/pathfinding-fishbowl/main.js` (create) | Setup, draw loop, ECS wiring, rendering, controls, respawning |

---

### Task 1: Create index.md with Hugo frontmatter

**Files:**
- Create: `content/pathfinding-fishbowl/index.md`

- [ ] **Step 1: Create index.md**

Create `content/pathfinding-fishbowl/index.md`:

```markdown
---
title: "Pathfinding Fishbowl"
date: 2026-03-27T00:00:00-05:00
description: "Zero-player roguelike fishbowl — monsters hunt and flee each other using rock-paper-scissors predation rules"
usage: "Watch monsters roam, hunt, and flee. Goblins hunt Trolls, Orcs hunt Goblins, Trolls hunt Orcs. Adjust population and speed with the sliders."
draft: false
scripts:
  - "ai.js"
  - "main.js"
technical_details: |
  <ul>
    <li><strong>Predation:</strong> Rock-paper-scissors — Goblins beat Trolls, Orcs beat Goblins, Trolls beat Orcs</li>
    <li><strong>AI States:</strong> Wander (random destination), Hunt (pathfind to prey), Flee (run from predator)</li>
    <li><strong>Pathfinding:</strong> A* algorithm for all navigation</li>
    <li><strong>Combat:</strong> Energy-based turns with attack/defense stats. Lethal — dead monsters respawn.</li>
    <li><strong>FOV:</strong> Monsters have independent vision — they only react to what they can see</li>
  </ul>
controls: |
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <strong>Population</strong>
      <div style="margin-top: 8px;">
        <label for="population-slider">Target: <span id="population-value">20</span></label>
        <input type="range" id="population-slider" class="control-slider" min="5" max="40" value="20" style="width: 200px;">
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <strong>Playback</strong>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button id="play-btn" class="control-button">Pause</button>
        <button id="step-btn" class="control-button">Step</button>
        <button id="regen-btn" class="control-button">Regenerate Map</button>
      </div>
      <div style="margin-top: 8px;">
        <label for="speed-slider">Speed: <span id="speed-value">10</span> tps</label>
        <input type="range" id="speed-slider" class="control-slider" min="1" max="30" value="10" style="width: 200px;">
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <strong>Stats</strong>
      <div style="font-family: monospace; font-size: 0.9em; margin-top: 8px; line-height: 1.8;">
        <span style="color: #4ade80;">Goblins: <span id="stat-goblins">0</span></span> &nbsp;
        <span style="color: #f97316;">Orcs: <span id="stat-orcs">0</span></span> &nbsp;
        <span style="color: #ef4444;">Trolls: <span id="stat-trolls">0</span></span><br>
        Total: <span id="stat-total">0</span> / <span id="stat-target">20</span> &nbsp;
        Kills: <span id="stat-kills">0</span>
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333; font-size: 0.85em; color: #888;">
      <strong>Monster Guide</strong>
      <div style="margin-top: 4px; font-family: monospace; line-height: 1.8;">
        <span style="color: #4ade80;">g</span> Goblin — hunts Trolls, flees Orcs<br>
        <span style="color: #f97316;">o</span> Orc — hunts Goblins, flees Trolls<br>
        <span style="color: #ef4444;">T</span> Troll — hunts Orcs, flees Goblins
      </div>
    </div>
  </div>
---
```

- [ ] **Step 2: Commit**

```bash
git add content/pathfinding-fishbowl/index.md
git commit -m "Add index.md for pathfinding fishbowl sketch"
```

---

### Task 2: Create FishbowlAISystem (ai.js)

**Files:**
- Create: `content/pathfinding-fishbowl/ai.js`

This is the novel piece — a sketch-local AI system with RPS predation rules. It replaces nuglib's AISystem (which targets a player) with one where monsters target each other.

**Important:** This file is loaded as a separate `<script>` tag by Hugo. Use `var` for the class declaration so it's accessible from `main.js`.

- [ ] **Step 1: Create ai.js**

Create `content/pathfinding-fishbowl/ai.js`:

```js
// FishbowlAISystem — RPS predation AI for zero-player fishbowl
//
// State machine per monster:
//   Wandering — pick random floor tile, pathfind there, pick new on arrival
//   Hunting   — prey visible in FOV, pathfind toward nearest prey
//   Fleeing   — predator visible in FOV, move away from nearest predator
//
// RPS rules:
//   Goblin hunts Troll, flees Orc
//   Orc hunts Goblin, flees Troll
//   Troll hunts Orc, flees Goblin

// ─── RPS Predation Table ────────────────────────────────────────────────────
const PREDATION = {
  Goblin: { hunts: "Troll", flees: "Orc" },
  Orc: { hunts: "Goblin", flees: "Troll" },
  Troll: { hunts: "Orc", flees: "Goblin" },
};

// ─── FishbowlAISystem ──────────────────────────────────────────────────────
var FishbowlAISystem = class {
  constructor(map, options = {}) {
    this.phase = "early";
    this.map = map;
    this.rng = options.rng || null;
    this.defaultActionCost = options.defaultActionCost || 100;
    // Map of entity -> {x, y} wander destination
    this.destinations = new Map();
  }

  run(world) {
    const clock = world.getResource("GameClock");
    if (clock && clock.paused) return;

    const blockedPositions = this.getBlockedPositions(world);

    for (const entity of world.query(["AIControlled", "Position", "Energy"])) {
      // Skip entities that already have a queued action
      if (world.getComponent(entity, "Action")) continue;

      const pos = world.getComponent(entity, "Position");
      const name = world.getComponent(entity, "Name");
      if (!pos || !name) continue;

      const rules = PREDATION[name.name];
      if (!rules) {
        this.doWander(world, entity, pos, blockedPositions);
        continue;
      }

      // Scan visible monsters for prey and predators
      const { nearestPrey, nearestPredator } = this.scanVisible(
        world,
        entity,
        pos,
        rules
      );

      // Priority: flee > hunt > wander
      if (nearestPredator) {
        this.doFlee(world, entity, pos, nearestPredator, blockedPositions);
      } else if (nearestPrey) {
        this.doHunt(world, entity, pos, nearestPrey, blockedPositions);
      } else {
        this.doWander(world, entity, pos, blockedPositions);
      }
    }
  }

  scanVisible(world, entity, pos, rules) {
    let nearestPrey = null;
    let nearestPreyDist = Infinity;
    let nearestPredator = null;
    let nearestPredatorDist = Infinity;

    for (const other of world.query(["AIControlled", "Position", "Name"])) {
      if (other === entity) continue;

      const otherPos = world.getComponent(other, "Position");
      const otherName = world.getComponent(other, "Name");
      if (!otherPos || !otherName) continue;

      // Check if this entity can see the other
      if (!Nuglib.isVisible(world, entity, otherPos.x, otherPos.y)) continue;

      const dist = Nuglib.distance(pos.x, pos.y, otherPos.x, otherPos.y);

      if (otherName.name === rules.hunts && dist < nearestPreyDist) {
        nearestPrey = { entity: other, pos: otherPos };
        nearestPreyDist = dist;
      }

      if (otherName.name === rules.flees && dist < nearestPredatorDist) {
        nearestPredator = { entity: other, pos: otherPos };
        nearestPredatorDist = dist;
      }
    }

    return { nearestPrey, nearestPredator };
  }

  doFlee(world, entity, pos, predator, blockedPositions) {
    // Clear any wander destination
    this.destinations.delete(entity);

    // Move in the opposite direction from the predator
    const dx = pos.x - predator.pos.x;
    const dy = pos.y - predator.pos.y;

    // Normalize to cardinal direction
    const fleeDir = { dx: Math.sign(dx), dy: Math.sign(dy) };

    // If fleeing direction is (0,0), pick random
    if (fleeDir.dx === 0 && fleeDir.dy === 0) {
      this.queueRandomMove(world, entity);
      return;
    }

    // Try to move in flee direction; if blocked, try a random direction
    const targetX = pos.x + fleeDir.dx;
    const targetY = pos.y + fleeDir.dy;
    const key = targetX + "," + targetY;

    if (
      this.map.isInBounds(targetX, targetY) &&
      !this.map.blocksMovement(targetX, targetY) &&
      !blockedPositions.has(key)
    ) {
      this.queueMove(world, entity, fleeDir);
    } else {
      this.queueRandomMove(world, entity);
    }
  }

  doHunt(world, entity, pos, prey, blockedPositions) {
    // Clear wander destination
    this.destinations.delete(entity);

    // If adjacent, attack
    if (Nuglib.isAdjacent(pos.x, pos.y, prey.pos.x, prey.pos.y)) {
      this.queueAttack(world, entity, prey.entity);
      return;
    }

    // Pathfind toward prey
    const direction = Nuglib.getStepToward(
      this.map,
      pos.x,
      pos.y,
      prey.pos.x,
      prey.pos.y,
      {
        isBlocked: (x, y) => {
          if (x === pos.x && y === pos.y) return false;
          if (x === prey.pos.x && y === prey.pos.y) return false;
          return blockedPositions.has(x + "," + y);
        },
      }
    );

    if (direction) {
      this.queueMove(world, entity, direction);
    } else {
      this.queueRandomMove(world, entity);
    }
  }

  doWander(world, entity, pos, blockedPositions) {
    // Check if we've reached our destination or don't have one
    let dest = this.destinations.get(entity);

    if (!dest || (pos.x === dest.x && pos.y === dest.y)) {
      dest = this.pickRandomFloorTile();
      if (!dest) {
        this.queueRandomMove(world, entity);
        return;
      }
      this.destinations.set(entity, dest);
    }

    // Pathfind toward destination
    const direction = Nuglib.getStepToward(
      this.map,
      pos.x,
      pos.y,
      dest.x,
      dest.y,
      {
        isBlocked: (x, y) => {
          if (x === pos.x && y === pos.y) return false;
          return blockedPositions.has(x + "," + y);
        },
      }
    );

    if (direction) {
      this.queueMove(world, entity, direction);
    } else {
      // Can't reach destination, pick a new one next tick
      this.destinations.delete(entity);
      this.queueRandomMove(world, entity);
    }
  }

  pickRandomFloorTile() {
    // Try up to 50 times to find a walkable tile
    for (let i = 0; i < 50; i++) {
      const x = this.rng
        ? this.rng.nextRange(0, this.map.width)
        : Math.floor(Math.random() * this.map.width);
      const y = this.rng
        ? this.rng.nextRange(0, this.map.height)
        : Math.floor(Math.random() * this.map.height);
      if (!this.map.blocksMovement(x, y)) {
        return { x, y };
      }
    }
    return null;
  }

  getBlockedPositions(world) {
    const blocked = new Set();
    for (const entity of world.query(["Position", "BlocksMovement"])) {
      const pos = world.getComponent(entity, "Position");
      if (pos) {
        blocked.add(pos.x + "," + pos.y);
      }
    }
    return blocked;
  }

  queueMove(world, entity, direction) {
    world.addComponent(entity, "Action", {
      type: "move",
      direction,
      energyCost: this.getMoveCost(world, entity),
    });
  }

  queueAttack(world, entity, target) {
    world.addComponent(entity, "Action", {
      type: "melee_attack",
      target,
      energyCost: this.getAttackCost(world, entity),
    });
  }

  queueRandomMove(world, entity) {
    const direction = Nuglib.randomCardinalDirection(this.rng);
    world.addComponent(entity, "Action", {
      type: "move",
      direction,
      energyCost: this.getMoveCost(world, entity),
    });
  }

  getMoveCost(world, entity) {
    const energy = world.getComponent(entity, "Energy");
    return energy && energy.moveCost ? energy.moveCost : this.defaultActionCost;
  }

  getAttackCost(world, entity) {
    const energy = world.getComponent(entity, "Energy");
    return energy && energy.attackCost
      ? energy.attackCost
      : this.defaultActionCost;
  }

  // Call when map regenerates or entity dies to clean up stale destinations
  clearDestination(entity) {
    this.destinations.delete(entity);
  }

  clearAllDestinations() {
    this.destinations.clear();
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add content/pathfinding-fishbowl/ai.js
git commit -m "Add FishbowlAISystem with RPS predation rules"
```

---

### Task 3: Create main.js (setup, rendering, controls, respawning)

**Files:**
- Create: `content/pathfinding-fishbowl/main.js`

This wires together the ECS world, rendering, controls, and respawn loop.

**Key differences from the monsters sketch:**
- No player entity, no AwaitingInputSystem, no keyboard input
- Uses FishbowlAISystem (from ai.js) instead of nuglib's AISystem
- God view rendering (no FOV on camera)
- Continuous ticking controlled by speed slider
- Respawn logic to maintain target population
- Custom monster templates with distinct colors (green/orange/red instead of the default all-green-ish palette)

- [ ] **Step 1: Create main.js**

Create `content/pathfinding-fishbowl/main.js`:

```js
// Pathfinding Fishbowl — zero-player roguelike with RPS predation
//
// Monsters roam a procedurally generated dungeon, hunting and fleeing
// each other based on rock-paper-scissors rules.

// ─── Constants ──────────────────────────────────────────────────────────────
var COLS = 40;
var ROWS = 25;
var CHAR_W = 16;
var CHAR_H = 24;

// Monster templates with distinct, visible colors
var FISHBOWL_TEMPLATES = {
  goblin: {
    name: "Goblin",
    glyph: "g",
    fg: [74, 222, 128],   // green
    maxHp: 5,
    attack: 2,
    defense: 0,
    speed: 1.0,
    fovRange: 8,
    moveCost: 80,
    attackCost: 80,
  },
  orc: {
    name: "Orc",
    glyph: "o",
    fg: [249, 115, 22],   // orange
    maxHp: 10,
    attack: 3,
    defense: 1,
    speed: 0.8,
    fovRange: 6,
    moveCost: 100,
    attackCost: 100,
  },
  troll: {
    name: "Troll",
    glyph: "T",
    fg: [239, 68, 68],    // red
    maxHp: 20,
    attack: 4,
    defense: 2,
    speed: 0.5,
    fovRange: 4,
    moveCost: 120,
    attackCost: 150,
  },
};

var TEMPLATE_LIST = [
  FISHBOWL_TEMPLATES.goblin,
  FISHBOWL_TEMPLATES.orc,
  FISHBOWL_TEMPLATES.troll,
];

// ─── State ──────────────────────────────────────────────────────────────────
var rng;
var map, rooms;
var world;
var aiSystem, movementSystem, actionExecutionSystem;
var energyRegenSystem, viewshedSystem;
var grid, gridRenderer, layerManager, palette;
var playing = true;
var playSpeed = 10;
var lastTickTime = 0;
var targetPopulation = 20;
var totalKills = 0;

// ─── DOM Elements ───────────────────────────────────────────────────────────
var playBtn, stepBtn, regenBtn;
var speedSlider, speedValue;
var populationSlider, populationValue;
var statGoblins, statOrcs, statTrolls, statTotal, statTarget, statKills;

// ─── Setup ──────────────────────────────────────────────────────────────────
function setup() {
  var cnv = createCanvas(COLS * CHAR_W, ROWS * CHAR_H);
  cnv.parent(select("#sketch-container"));
  textFont("monospace");
  noStroke();

  // Grab DOM elements
  playBtn = select("#play-btn");
  stepBtn = select("#step-btn");
  regenBtn = select("#regen-btn");
  speedSlider = select("#speed-slider");
  speedValue = select("#speed-value");
  populationSlider = select("#population-slider");
  populationValue = select("#population-value");
  statGoblins = select("#stat-goblins");
  statOrcs = select("#stat-orcs");
  statTrolls = select("#stat-trolls");
  statTotal = select("#stat-total");
  statTarget = select("#stat-target");
  statKills = select("#stat-kills");

  // Bind events
  playBtn.mousePressed(function () {
    playing = !playing;
    playBtn.html(playing ? "Pause" : "Play");
  });

  stepBtn.mousePressed(function () {
    doTick();
  });

  regenBtn.mousePressed(function () {
    regenerateMap();
  });

  speedSlider.input(function () {
    playSpeed = parseInt(speedSlider.value());
    speedValue.html(String(playSpeed));
  });

  populationSlider.input(function () {
    targetPopulation = parseInt(populationSlider.value());
    populationValue.html(String(targetPopulation));
    statTarget.html(String(targetPopulation));
  });

  // Initialize
  initRendering();
  regenerateMap();
}

// ─── Rendering Setup ────────────────────────────────────────────────────────
function initRendering() {
  grid = Nuglib.createGrid(COLS, ROWS);

  gridRenderer = Nuglib.GridRenderer({
    cellWidth: CHAR_W,
    cellHeight: CHAR_H,
    backgroundColor: color(0),
  });

  layerManager = new Nuglib.LayerManager(window);
  layerManager.createLayer(
    "grid",
    Nuglib.createTextLayerConfig(width, height, CHAR_H, "Courier New")
  );

  // Glyph palette for map tiles
  palette = new Nuglib.GlyphPalette();
  palette.registerGlyph("wall", "#", [128, 128, 128], [0, 0, 0]);
  palette.registerGlyph("floor", "\u00B7", [60, 60, 60], [0, 0, 0]);
}

// ─── Map Generation & World Setup ───────────────────────────────────────────
function regenerateMap() {
  rng = Nuglib.xoroshiro128plus(BigInt(Date.now()));
  totalKills = 0;

  // Generate map
  map = Nuglib.createMap(COLS, ROWS, { edgeBehavior: "block" });
  rooms = Nuglib.generateRoomsAndCorridors(map, rng, {
    maxRooms: 6,
    minRoomSize: 5,
    maxRoomSize: 12,
  });

  // Create ECS world
  world = Nuglib.createWorld();
  world.addResource("GameClock", Nuglib.createGameClock());

  // Create systems
  movementSystem = new Nuglib.MovementSystem(map);
  actionExecutionSystem = new Nuglib.ActionExecutionSystem(movementSystem);
  aiSystem = new FishbowlAISystem(map, { rng: rng });
  energyRegenSystem = new Nuglib.EnergyRegenerationSystem();
  viewshedSystem = new Nuglib.ViewshedSystem(map);

  // Add systems in phase order (no AwaitingInputSystem — never pause)
  world.addSystem(aiSystem);
  world.addSystem(energyRegenSystem);
  world.addSystem(actionExecutionSystem);
  world.addSystem(movementSystem);
  world.addSystem(viewshedSystem);

  // Spawn initial population
  spawnInitialPopulation();

  updateStats();
}

// ─── Spawning ───────────────────────────────────────────────────────────────
function spawnInitialPopulation() {
  for (var i = 0; i < targetPopulation; i++) {
    spawnRandomMonster();
  }
}

function spawnRandomMonster() {
  if (rooms.length === 0) return;

  var template = rng.nextChoice(TEMPLATE_LIST);
  var room = rng.nextChoice(rooms);

  Nuglib.spawnMonster(world, {
    room: room,
    template: template,
    rng: rng,
  });
}

function respawnIfNeeded() {
  var current = countMonsters();
  var total = current.goblins + current.orcs + current.trolls;

  if (total < targetPopulation) {
    spawnRandomMonster();
  }
}

function countMonsters() {
  var counts = { goblins: 0, orcs: 0, trolls: 0 };

  for (var entity of world.query(["AIControlled", "Name"])) {
    var name = world.getComponent(entity, "Name");
    if (!name) continue;
    if (name.name === "Goblin") counts.goblins++;
    else if (name.name === "Orc") counts.orcs++;
    else if (name.name === "Troll") counts.trolls++;
  }

  return counts;
}

// ─── Tick ───────────────────────────────────────────────────────────────────
function doTick() {
  // Count before tick to detect kills
  var beforeCount = countTotal();

  world.tick();
  respawnIfNeeded();

  // Count kills
  var afterCount = countTotal();
  if (afterCount < beforeCount) {
    totalKills += beforeCount - afterCount;
  }

  updateStats();
}

function countTotal() {
  var total = 0;
  for (var _entity of world.query(["AIControlled"])) {
    total++;
  }
  return total;
}

// ─── Stats ──────────────────────────────────────────────────────────────────
function updateStats() {
  if (!statGoblins) return;

  var counts = countMonsters();
  var total = counts.goblins + counts.orcs + counts.trolls;

  statGoblins.html(String(counts.goblins));
  statOrcs.html(String(counts.orcs));
  statTrolls.html(String(counts.trolls));
  statTotal.html(String(total));
  statTarget.html(String(targetPopulation));
  statKills.html(String(totalKills));
}

// ─── Draw ───────────────────────────────────────────────────────────────────
function draw() {
  // Auto-tick if playing
  if (playing) {
    var now = millis();
    var interval = 1000 / playSpeed;
    if (now - lastTickTime >= interval) {
      doTick();
      lastTickTime = now;
    }
  }

  background(0);

  // Render map (god view — no FOV)
  var gridLayer = layerManager.getLayer("grid");
  gridLayer.clear();
  gridLayer.textFont("Courier New");
  gridLayer.textSize(CHAR_H);
  gridLayer.textAlign(CENTER, CENTER);
  gridLayer.noStroke();

  // Draw map tiles
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      var tile = map.getTile(x, y);
      var isWall = tile === Nuglib.Tiles.Wall;
      var ch = isWall ? "#" : "\u00B7";
      var col = isWall ? 128 : 60;

      gridLayer.fill(col);
      gridLayer.text(
        ch,
        x * CHAR_W + CHAR_W / 2,
        y * CHAR_H + CHAR_H / 2
      );
    }
  }

  // Draw monsters
  for (var entity of world.query(["Position", "Glyph"])) {
    var pos = world.getComponent(entity, "Position");
    var gl = world.getComponent(entity, "Glyph");
    if (!pos || !gl) continue;

    var fg = gl.fg;
    gridLayer.fill(fg[0], fg[1], fg[2]);
    gridLayer.text(
      gl.glyph,
      pos.x * CHAR_W + CHAR_W / 2,
      pos.y * CHAR_H + CHAR_H / 2
    );
  }

  // Composite layers
  image(gridLayer, 0, 0);
}
```

- [ ] **Step 2: Commit**

```bash
git add content/pathfinding-fishbowl/main.js
git commit -m "Add main sketch for pathfinding fishbowl"
```

---

### Task 4: Pin nuglib, smoke test, and verify

**Files:**
- Create: `content/pathfinding-fishbowl/nuglib.min.js` (via pin script)

- [ ] **Step 1: Pin nuglib to the fishbowl sketch**

```bash
npm run pin-nuglib -- pathfinding-fishbowl
```

Expected: `Pinned nuglib.min.js → content/pathfinding-fishbowl/nuglib.min.js`

- [ ] **Step 2: Run smoke tests**

```bash
npm run smoke
```

Expected: All sketches pass, including the new `pathfinding-fishbowl`.

- [ ] **Step 3: Commit the pinned nuglib**

```bash
git add content/pathfinding-fishbowl/nuglib.min.js
git commit -m "Pin nuglib.min.js to pathfinding fishbowl sketch"
```

- [ ] **Step 4: Manual verification**

Start Hugo and open the sketch in a browser:

```bash
hugo server --port 1316
```

Navigate to `http://localhost:1316/p5js-sketches/pathfinding-fishbowl/`

Verify:
- Canvas renders with dungeon map
- Monsters appear and move around
- Monsters hunt and flee each other (watch for chasing behavior)
- Population counts update in stats
- Play/Pause works
- Step button advances one tick
- Speed slider changes tick rate
- Population slider changes target (new monsters spawn if below target)
- Regenerate Map creates a new dungeon
- Kill count increments when monsters die
