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
var layerManager;
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
  layerManager = new Nuglib.LayerManager(window);
  layerManager.createLayer(
    "grid",
    Nuglib.createTextLayerConfig(width, height, CHAR_H, "Courier New")
  );
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
  var counts = countMonsters();
  if (counts.total < targetPopulation) {
    spawnRandomMonster();
  }
}

function countMonsters() {
  var counts = { goblins: 0, orcs: 0, trolls: 0, total: 0 };

  for (var entity of world.query(["AIControlled", "Name"])) {
    var name = world.getComponent(entity, "Name");
    if (!name) continue;
    counts.total++;
    if (name.name === "Goblin") counts.goblins++;
    else if (name.name === "Orc") counts.orcs++;
    else if (name.name === "Troll") counts.trolls++;
  }

  return counts;
}

// ─── Tick ───────────────────────────────────────────────────────────────────
function doTick() {
  // Count before tick to detect kills
  var before = countMonsters();

  world.tick();
  respawnIfNeeded();

  // Count kills
  var after = countMonsters();
  if (after.total < before.total) {
    totalKills += before.total - after.total;
  }

  updateStats();
}

// ─── Stats ──────────────────────────────────────────────────────────────────
function updateStats() {
  if (!statGoblins) return;

  var counts = countMonsters();

  statGoblins.html(String(counts.goblins));
  statOrcs.html(String(counts.orcs));
  statTrolls.html(String(counts.trolls));
  statTotal.html(String(counts.total));
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
