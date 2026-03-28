// main.js — GOAP Survival main sketch
//
// Setup, draw loop, ECS wiring, controls, MonsterAISystem,
// GoapPlanningSystem, PlanExecutionSystem

// ─── State ─────────────────────────────────────────────────────────────────
var rng;
var map;
var world;
var agentEntity;
var playing = true;
var playSpeed = 5;
var lastTickTime = 0;
var deathCount = 0;
var replanCount = 0;
var aliveTicks = 0;

// DOM elements
var playBtn, stepBtn, regenBtn, foresightBtn, foresightLabel;
var speedSlider, speedValue;
var statTicks, statDeaths, statPlans, statGoal, statAction;

// ─── ECS Systems ───────────────────────────────────────────────────────────

var GoapPlanningSystem = class {
  constructor() {
    this.phase = "early";
  }

  run(world) {
    var clock = world.getResource("GameClock");
    if (clock && clock.paused) return;

    var tick = clock ? clock.tick : 0;
    var gameMap = world.getResource("map");

    for (var entity of world.query(["GoapAgent", "Position", "Needs", "Inventory"])) {
      var agent = world.getComponent(entity, "GoapAgent");
      var pos = world.getComponent(entity, "Position");
      if (!agent || !pos) continue;

      // Check if we need to plan
      var shouldPlan = false;

      if (!agent.currentPlan || agent.needsReplan) {
        shouldPlan = true;
      } else if (agent.planStepIndex >= agent.currentPlan.actions.length) {
        // Plan complete -- goal selection will pick a new goal next tick
        shouldPlan = false;
      } else {
        // Validate remaining plan steps (skip already-completed ones)
        var ws = buildWorldState(world, gameMap, entity, tick);
        var remaining = {
          actions: agent.currentPlan.actions.slice(agent.planStepIndex),
          goal: agent.currentPlan.goal,
        };
        if (!Nuglib.validatePlan(agent.planner, ws, remaining)) {
          shouldPlan = true;
        }
      }

      if (shouldPlan) {
        this.makePlan(world, entity, agent, gameMap, tick);
      }
    }
  }

  makePlan(world, entity, agent, gameMap, tick) {
    if (!agent.currentGoal) return;

    var pos = world.getComponent(entity, "Position");
    var ws = buildWorldState(world, gameMap, entity, tick);

    // Rebuild actions with current move_to costs
    var actions = buildGoapActions(gameMap, pos.x, pos.y);
    agent.planner = Nuglib.createPlanner(actions);

    var result = Nuglib.plan(agent.planner, ws, agent.currentGoal);
    agent.currentPlan = result;
    agent.planStepIndex = 0;
    agent.needsReplan = false;

    replanCount++;
    var stats = world.getResource("SurvivalStats");
    if (stats) stats.replans = replanCount;
  }
};

var PlanExecutionSystem = class {
  constructor() {
    this.phase = "early";
    this.moveTarget = null; // { x, y } for current move_to destination
  }

  run(world) {
    var clock = world.getResource("GameClock");
    if (clock && clock.paused) return;

    var tick = clock ? clock.tick : 0;
    var gameMap = world.getResource("map");

    for (var entity of world.query(["GoapAgent", "Position", "Energy", "Needs", "Inventory"])) {
      // Skip if already has an action queued
      if (world.getComponent(entity, "Action")) continue;

      var agent = world.getComponent(entity, "GoapAgent");
      if (!agent || !agent.currentPlan) continue;
      if (agent.planStepIndex >= agent.currentPlan.actions.length) continue;

      var currentAction = agent.currentPlan.actions[agent.planStepIndex];
      var pos = world.getComponent(entity, "Position");
      var needs = world.getComponent(entity, "Needs");
      var inventory = world.getComponent(entity, "Inventory");
      if (!pos || !needs || !inventory) continue;

      var done = this.executeAction(world, entity, currentAction, pos, needs, inventory, gameMap, tick);

      if (done) {
        agent.planStepIndex++;
        this.moveTarget = null;
      }
    }
  }

  executeAction(world, entity, action, pos, needs, inventory, gameMap, tick) {
    var name = action.name;

    // ─── Move-to actions ───
    if (name.startsWith("move_to_")) {
      return this.executeMoveToAction(world, entity, name, pos, gameMap);
    }

    // ─── Gather/interact actions ───
    switch (name) {
      case "gather_stick":
        return this.executeGather(world, entity, pos, inventory, FEATURE_STICKS, "sticks", 1);

      case "gather_stone":
        return this.executeGather(world, entity, pos, inventory, FEATURE_ROCK, "stones", 1);

      case "gather_berries":
        return this.executeGatherBerries(world, entity, pos, inventory);

      case "eat_food":
        if (inventory.hasFood) {
          inventory.hasFood = false;
          needs.hunger = Math.min(100, needs.hunger + 30);
          return true;
        }
        return true; // skip if no food (plan invalidated)

      case "craft_axe":
        if (inventory.sticks >= 1 && inventory.stones >= 1) {
          inventory.sticks--;
          inventory.stones--;
          inventory.hasAxe = true;
        }
        return true;

      case "craft_torch":
        if (inventory.sticks >= 1 && inventory.wood >= 1) {
          inventory.sticks--;
          inventory.wood--;
          inventory.hasTorch = true;
        }
        return true;

      case "chop_tree":
        return this.executeChopTree(world, entity, pos, inventory, gameMap);

      case "build_fire":
        return this.executeBuildFire(world, entity, pos, inventory, gameMap);

      case "warm_at_fire":
        needs.warmth = Math.min(100, needs.warmth + 40);
        return true;

      case "flee":
        return this.executeFlee(world, entity, pos, gameMap);

      default:
        return true; // unknown action, skip
    }
  }

  executeMoveToAction(world, entity, name, pos, gameMap) {
    var targetType = name.replace("move_to_", "");
    var featureType = FEATURE_NONE;
    var wantClear = false;

    if (targetType === "tree") featureType = FEATURE_TREE;
    else if (targetType === "rock") featureType = FEATURE_ROCK;
    else if (targetType === "berries") featureType = FEATURE_BERRY;
    else if (targetType === "sticks") featureType = FEATURE_STICKS;
    else if (targetType === "fire") featureType = FEATURE_FIRE;
    else if (targetType === "clear") wantClear = true;

    // Find nearest target if we don't have one or reached the old one
    if (!this.moveTarget) {
      var nearest = findNearestFeaturePosition(gameMap, pos.x, pos.y, featureType, wantClear);
      if (!nearest) return true; // can't find target, skip
      this.moveTarget = nearest;
    }

    // Check if adjacent to the target (for rocks/features that block movement)
    if (Nuglib.isAdjacent(pos.x, pos.y, this.moveTarget.x, this.moveTarget.y)) {
      return true; // arrived adjacent
    }

    // Check if on top of the target (for walkable features)
    if (pos.x === this.moveTarget.x && pos.y === this.moveTarget.y) {
      return true; // arrived
    }

    // Pathfind one step toward target
    var dir = Nuglib.getStepToward(gameMap, pos.x, pos.y, this.moveTarget.x, this.moveTarget.y);
    if (dir) {
      this.queueMove(world, entity, dir);
    } else {
      // Can't reach, give up on this action
      return true;
    }

    return false; // not done yet, still moving
  }

  executeGather(world, entity, pos, inventory, featureType, inventoryKey, amount) {
    // Find adjacent tile with this feature
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = pos.x + dx;
        var ny = pos.y + dy;
        if (getFeatureAt(nx, ny) === featureType) {
          inventory[inventoryKey] += amount;
          // Sticks and berries get consumed; rocks don't
          if (featureType === FEATURE_STICKS) {
            removeFeatureAt(nx, ny);
          }
          // Queue a wait action for the "work" animation
          world.addComponent(entity, "Action", {
            type: "wait",
            energyCost: 50,
          });
          return true;
        }
      }
    }
    return true; // no adjacent feature, skip
  }

  executeGatherBerries(world, entity, pos, inventory) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = pos.x + dx;
        var ny = pos.y + dy;
        if (getFeatureAt(nx, ny) === FEATURE_BERRY) {
          inventory.hasFood = true;
          // Berries respawn, don't remove
          world.addComponent(entity, "Action", {
            type: "wait",
            energyCost: 50,
          });
          return true;
        }
      }
    }
    return true;
  }

  executeChopTree(world, entity, pos, inventory, gameMap) {
    if (!inventory.hasAxe) return true;

    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = pos.x + dx;
        var ny = pos.y + dy;
        if (getFeatureAt(nx, ny) === FEATURE_TREE) {
          inventory.wood += 2;
          removeFeatureAt(nx, ny);
          world.addComponent(entity, "Action", {
            type: "wait",
            energyCost: 100,
          });
          return true;
        }
      }
    }
    return true;
  }

  executeBuildFire(world, entity, pos, inventory, gameMap) {
    if (inventory.wood < 2) return true;

    // Find adjacent clear grass tile
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = pos.x + dx;
        var ny = pos.y + dy;
        if (nx < 0 || nx >= MAP_COLS || ny < 0 || ny >= MAP_ROWS) continue;
        if (gameMap.blocksMovement(nx, ny)) continue;
        if (getFeatureAt(nx, ny) !== FEATURE_NONE) continue;
        if (getTerrainAt(nx, ny) !== TERRAIN_GRASS) continue;

        inventory.wood -= 2;
        setFeatureAt(nx, ny, FEATURE_FIRE);
        addFireSource(nx, ny);
        world.addComponent(entity, "Action", {
          type: "wait",
          energyCost: 100,
        });
        return true;
      }
    }
    return true;
  }

  executeFlee(world, entity, pos, gameMap) {
    // Find nearest threat and move away
    var viewshed = world.getComponent(entity, "Viewshed");
    if (!viewshed) return true;

    var nearestThreat = null;
    var nearestDist = Infinity;

    for (var threat of world.query(["AIControlled", "Position", "CombatStats"])) {
      var tpos = world.getComponent(threat, "Position");
      if (!tpos) continue;
      var tk = tpos.x + "," + tpos.y;
      if (!viewshed.visibleCells.has(tk)) continue;

      var dist = Nuglib.distance(pos.x, pos.y, tpos.x, tpos.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestThreat = tpos;
      }
    }

    if (nearestThreat) {
      var fdx = Math.sign(pos.x - nearestThreat.x);
      var fdy = Math.sign(pos.y - nearestThreat.y);
      if (fdx === 0 && fdy === 0) fdx = 1;

      var tx = pos.x + fdx;
      var ty = pos.y + fdy;
      if (gameMap.isInBounds(tx, ty) && !gameMap.blocksMovement(tx, ty)) {
        this.queueMove(world, entity, { dx: fdx, dy: fdy });
        return false; // keep fleeing until threat gone
      }
    }

    return true; // no threat or can't move
  }

  queueMove(world, entity, direction) {
    var energy = world.getComponent(entity, "Energy");
    var moveCost = energy && energy.moveCost ? energy.moveCost : 100;
    world.addComponent(entity, "Action", {
      type: "move",
      direction: direction,
      energyCost: moveCost,
    });
  }
};

// ─── MonsterAISystem ───────────────────────────────────────────────────────

var MonsterAISystem = class {
  constructor() {
    this.phase = "early";
    this.destinations = new Map();
  }

  run(world) {
    var clock = world.getResource("GameClock");
    if (clock && clock.paused) return;

    var gameMap = world.getResource("map");
    if (!gameMap) return;

    var blockedPositions = this.getBlockedPositions(world);

    for (var entity of world.query(["AIControlled", "Position", "Energy"])) {
      if (world.getComponent(entity, "Action")) continue;

      var pos = world.getComponent(entity, "Position");
      if (!pos) continue;

      // Check if agent is visible
      var viewshed = world.getComponent(entity, "Viewshed");
      var agentVisible = false;
      var agentPos = null;

      // Find agent entity
      for (var a of world.query(["GoapAgent", "Position"])) {
        var ap = world.getComponent(a, "Position");
        if (!ap) continue;
        agentPos = ap;
        if (viewshed && viewshed.visibleCells.has(ap.x + "," + ap.y)) {
          agentVisible = true;
        }
        break;
      }

      // Monsters avoid lit tiles (light > 0.5)
      if (agentVisible && agentPos) {
        // Hunt agent
        if (Nuglib.isAdjacent(pos.x, pos.y, agentPos.x, agentPos.y)) {
          // Attack
          for (var a2 of world.query(["GoapAgent"])) {
            world.addComponent(entity, "Action", {
              type: "melee_attack",
              target: a2,
              energyCost: this.getAttackCost(world, entity),
            });
            break;
          }
        } else {
          var dir = Nuglib.getStepToward(
            gameMap, pos.x, pos.y, agentPos.x, agentPos.y,
            {
              isBlocked: function (x, y) {
                if (x === pos.x && y === pos.y) return false;
                if (x === agentPos.x && y === agentPos.y) return false;
                if (blockedPositions.has(x + "," + y)) return true;
                // Avoid lit tiles
                if (getLightAt(x, y) > 0.5) return true;
                return false;
              },
            }
          );
          if (dir) {
            this.queueMove(world, entity, dir);
          }
        }
      } else {
        // Wander in dark areas
        this.doWander(world, entity, pos, gameMap, blockedPositions);
      }
    }
  }

  doWander(world, entity, pos, gameMap, blockedPositions) {
    var dest = this.destinations.get(entity);

    if (!dest || (pos.x === dest.x && pos.y === dest.y)) {
      dest = this.pickDarkTile(gameMap);
      if (!dest) return;
      this.destinations.set(entity, dest);
    }

    var dir = Nuglib.getStepToward(
      gameMap, pos.x, pos.y, dest.x, dest.y,
      {
        isBlocked: function (x, y) {
          if (x === pos.x && y === pos.y) return false;
          if (blockedPositions.has(x + "," + y)) return true;
          if (getLightAt(x, y) > 0.5) return true;
          return false;
        },
      }
    );

    if (dir) {
      this.queueMove(world, entity, dir);
    } else {
      this.destinations.delete(entity);
    }
  }

  pickDarkTile(gameMap) {
    for (var i = 0; i < 50; i++) {
      var x = rng.nextRange(0, MAP_COLS);
      var y = rng.nextRange(0, MAP_ROWS);
      if (!gameMap.blocksMovement(x, y) && getLightAt(x, y) < 0.3) {
        return { x: x, y: y };
      }
    }
    return null;
  }

  getBlockedPositions(world) {
    var blocked = new Set();
    for (var entity of world.query(["Position", "BlocksMovement"])) {
      var pos = world.getComponent(entity, "Position");
      if (pos) blocked.add(pos.x + "," + pos.y);
    }
    return blocked;
  }

  queueMove(world, entity, direction) {
    world.addComponent(entity, "Action", {
      type: "move",
      direction: direction,
      energyCost: this.getMoveCost(world, entity),
    });
  }

  getMoveCost(world, entity) {
    var energy = world.getComponent(entity, "Energy");
    return energy && energy.moveCost ? energy.moveCost : 100;
  }

  getAttackCost(world, entity) {
    var energy = world.getComponent(entity, "Energy");
    return energy && energy.attackCost ? energy.attackCost : 100;
  }

  clearAllDestinations() {
    this.destinations.clear();
  }
};

// ─── Monster Templates ─────────────────────────────────────────────────────

var ZOMBIE_TEMPLATE = {
  name: "Zombie",
  glyph: "Z",
  fg: [46, 139, 87],
  maxHp: 15,
  attack: 3,
  defense: 2,
  speed: 0.6,
  fovRange: 6,
  moveCost: 150,
  attackCost: 120,
};

var SKELETON_TEMPLATE = {
  name: "Skeleton",
  glyph: "S",
  fg: [255, 255, 255],
  maxHp: 5,
  attack: 4,
  defense: 0,
  speed: 1.2,
  fovRange: 6,
  moveCost: 80,
  attackCost: 80,
};

// ─── Setup ─────────────────────────────────────────────────────────────────

function setup() {
  var cnv = createCanvas(CANVAS_W, CANVAS_H);
  cnv.parent(select("#sketch-container"));
  textFont("monospace");
  noStroke();

  // Grab DOM elements
  playBtn = select("#play-btn");
  stepBtn = select("#step-btn");
  regenBtn = select("#regen-btn");
  foresightBtn = select("#foresight-btn");
  foresightLabel = select("#foresight-label");
  speedSlider = select("#speed-slider");
  speedValue = select("#speed-value");
  statTicks = select("#stat-ticks");
  statDeaths = select("#stat-deaths");
  statPlans = select("#stat-plans");
  statGoal = select("#stat-goal");
  statAction = select("#stat-action");

  // Bind events
  playBtn.mousePressed(function () {
    playing = !playing;
    playBtn.html(playing ? "Pause" : "Play");
  });

  stepBtn.mousePressed(function () {
    doTick();
  });

  regenBtn.mousePressed(function () {
    regenerateWorld();
  });

  foresightBtn.mousePressed(function () {
    foresightMode = !foresightMode;
    foresightBtn.html(foresightMode ? "Proactive" : "Reactive");
    foresightLabel.html(
      foresightMode
        ? "Agent plans ahead for future needs"
        : "Agent only reacts to current needs"
    );
    // Trigger immediate replan
    for (var entity of world.query(["GoapAgent"])) {
      var agent = world.getComponent(entity, "GoapAgent");
      if (agent) {
        agent.needsReplan = true;
        agent.currentGoal = null;
      }
    }
  });

  speedSlider.input(function () {
    playSpeed = parseInt(speedSlider.value());
    speedValue.html(String(playSpeed));
  });

  // Initialize
  initRendering();
  regenerateWorld();
}

// ─── World Generation ──────────────────────────────────────────────────────

function regenerateWorld() {
  rng = Nuglib.xoroshiro128plus(BigInt(Date.now()));

  // Generate map
  map = generateWildernessMap(rng);

  // Init lighting
  initLighting();

  // Create ECS world
  world = Nuglib.createWorld();
  world.addResource("GameClock", Nuglib.createGameClock());
  world.addResource("map", map);
  world.addResource("SurvivalStats", {
    aliveTicks: 0,
    deaths: deathCount,
    replans: replanCount,
  });

  // Create systems
  var movementSystem = new Nuglib.MovementSystem(map);
  var actionExecutionSystem = new Nuglib.ActionExecutionSystem(movementSystem);
  var energyRegenSystem = new Nuglib.EnergyRegenerationSystem();
  var viewshedSystem = new Nuglib.ViewshedSystem(map);
  var needDecaySystem = new NeedDecaySystem();
  var goalSelectionSystem = new GoalSelectionSystem();
  var goapPlanningSystem = new GoapPlanningSystem();
  var planExecutionSystem = new PlanExecutionSystem();
  var monsterAISystem = new MonsterAISystem();

  // Add systems in phase order
  world.addSystem(needDecaySystem);
  world.addSystem(goalSelectionSystem);
  world.addSystem(goapPlanningSystem);
  world.addSystem(planExecutionSystem);
  world.addSystem(monsterAISystem);
  world.addSystem(energyRegenSystem);
  world.addSystem(actionExecutionSystem);
  world.addSystem(movementSystem);
  world.addSystem(viewshedSystem);

  // Spawn agent
  var spawnPos = findSpawnPosition(map, rng);
  agentEntity = world.createEntity();

  world.addComponent(agentEntity, "Position", { x: spawnPos.x, y: spawnPos.y });
  world.addComponent(agentEntity, "Glyph", {
    glyph: "@",
    fg: [255, 255, 255],
    bg: [0, 0, 0],
  });
  world.addComponent(agentEntity, "BlocksMovement", {});
  world.addComponent(agentEntity, "Energy", {
    current: 100,
    max: 100,
    regenRate: 50,
    moveCost: 100,
    attackCost: 100,
  });
  world.addComponent(agentEntity, "CombatStats", {
    hp: 10,
    maxHp: 10,
    attack: 3,
    defense: 1,
  });
  world.addComponent(agentEntity, "Viewshed", {
    range: 8,
    algorithm: "shadowcasting",
    visibleCells: new Set(),
    dirty: true,
  });
  world.addComponent(agentEntity, "Memory", {
    exploredCells: new Set(),
  });
  world.addComponent(agentEntity, "Needs", {
    hunger: 100,
    warmth: 100,
    health: 100,
  });
  world.addComponent(agentEntity, "Inventory", {
    sticks: 0,
    stones: 0,
    wood: 0,
    hasAxe: false,
    hasTorch: false,
    hasFood: false,
  });

  // Initialize GOAP agent
  var initialActions = buildGoapActions(map, spawnPos.x, spawnPos.y);
  world.addComponent(agentEntity, "GoapAgent", {
    planner: Nuglib.createPlanner(initialActions),
    currentGoal: null,
    currentPlan: null,
    planStepIndex: 0,
    needsReplan: true,
  });

  aliveTicks = 0;
  lastMonsterSpawn = 0;
  updateDOMStats();
}

// ─── Monster Spawning ──────────────────────────────────────────────────────

var lastMonsterSpawn = 0;

function spawnNightMonsters(tick) {
  if (!isNight(tick)) return;
  if (tick - lastMonsterSpawn < 10) return;
  lastMonsterSpawn = tick;

  // Count existing monsters
  var monsterCount = 0;
  for (var e of world.query(["AIControlled"])) {
    monsterCount++;
  }
  if (monsterCount >= 5) return; // cap at 5

  // Find a dark tile outside agent FOV
  var viewshed = world.getComponent(agentEntity, "Viewshed");
  for (var attempt = 0; attempt < 30; attempt++) {
    var x = rng.nextRange(1, MAP_COLS - 1);
    var y = rng.nextRange(1, MAP_ROWS - 1);

    if (map.blocksMovement(x, y)) continue;
    if (getLightAt(x, y) > 0.2) continue;
    if (getFeatureAt(x, y) !== FEATURE_NONE) continue;
    if (viewshed && viewshed.visibleCells.has(x + "," + y)) continue;

    var template = rng.nextFloat() < 0.5 ? ZOMBIE_TEMPLATE : SKELETON_TEMPLATE;
    var monster = world.createEntity();

    world.addComponent(monster, "Position", { x: x, y: y });
    world.addComponent(monster, "Glyph", {
      glyph: template.glyph,
      fg: template.fg,
      bg: [0, 0, 0],
    });
    world.addComponent(monster, "AIControlled", { state: "wandering" });
    world.addComponent(monster, "BlocksMovement", {});
    world.addComponent(monster, "CombatStats", {
      hp: template.maxHp,
      maxHp: template.maxHp,
      attack: template.attack,
      defense: template.defense,
    });
    world.addComponent(monster, "Energy", {
      current: 0,
      max: Math.max(100, template.moveCost, template.attackCost),
      regenRate: 50,
      moveCost: template.moveCost,
      attackCost: template.attackCost,
    });
    world.addComponent(monster, "Viewshed", {
      range: template.fovRange,
      algorithm: "shadowcasting",
      visibleCells: new Set(),
      dirty: true,
    });
    world.addComponent(monster, "Name", { name: template.name });

    break;
  }
}

function despawnMonstersAtDawn(tick) {
  if (!isDawn(tick)) return;

  var toDestroy = [];
  for (var entity of world.query(["AIControlled", "Position"])) {
    toDestroy.push(entity);
  }
  for (var i = 0; i < toDestroy.length; i++) {
    world.destroyEntity(toDestroy[i]);
  }
}

// ─── Tick ──────────────────────────────────────────────────────────────────

function doTick() {
  var clock = world.getResource("GameClock");
  var tick = clock ? clock.tick : 0;

  // Update agent viewshed range based on time + torch
  var inventory = world.getComponent(agentEntity, "Inventory");
  var viewshed = world.getComponent(agentEntity, "Viewshed");
  if (viewshed && inventory) {
    if (isNight(tick) && !inventory.hasTorch) {
      viewshed.range = 3;
    } else {
      viewshed.range = 8;
    }
  }

  // Handle combat damage to agent health
  var combatStats = world.getComponent(agentEntity, "CombatStats");
  var agentNeeds = world.getComponent(agentEntity, "Needs");
  if (combatStats && agentNeeds) {
    agentNeeds.health = Math.floor((combatStats.hp / combatStats.maxHp) * 100);
  }

  // Calculate lighting
  var agentPos = world.getComponent(agentEntity, "Position");
  if (agentPos) {
    calculateLighting(tick, agentPos.x, agentPos.y, inventory && inventory.hasTorch);
  }

  // Monster spawning/despawning
  spawnNightMonsters(tick);
  despawnMonstersAtDawn(tick);

  // Run ECS tick
  world.tick();

  // Check for agent death
  var dead = world.getComponent(agentEntity, "Dead");
  if (dead) {
    deathCount++;
    replanCount = 0;
    regenerateWorld();
    return;
  }

  // Increment clock
  if (clock) {
    clock.tick++;
  }

  aliveTicks++;
  var stats = world.getResource("SurvivalStats");
  if (stats) {
    stats.aliveTicks = aliveTicks;
    stats.deaths = deathCount;
  }

  updateDOMStats();
}

// ─── Stats ─────────────────────────────────────────────────────────────────

function updateDOMStats() {
  if (!statTicks) return;

  statTicks.html(String(aliveTicks));
  statDeaths.html(String(deathCount));
  statPlans.html(String(replanCount));

  var agent = world.getComponent(agentEntity, "GoapAgent");
  if (agent && agent.currentGoal) {
    var label = getGoalLabel(agent.currentGoal);
    statGoal.html(label);
  } else {
    statGoal.html("none");
  }

  if (agent && agent.currentPlan && agent.planStepIndex < agent.currentPlan.actions.length) {
    statAction.html(agent.currentPlan.actions[agent.planStepIndex].name);
  } else {
    statAction.html("idle");
  }
}

// ─── Draw ──────────────────────────────────────────────────────────────────

function draw() {
  if (playing) {
    var now = millis();
    var interval = 1000 / playSpeed;
    if (now - lastTickTime >= interval) {
      doTick();
      lastTickTime = now;
    }
  }

  background(0);

  var clock = world.getResource("GameClock");
  var tick = clock ? clock.tick : 0;

  // Render map layer
  renderMap(world, map, agentEntity, tick);
  var mapLayer = layerManager.getLayer("map");
  image(mapLayer, 0, 0);

  // Render panel directly to main canvas
  renderPanel(world, agentEntity, tick);
}
