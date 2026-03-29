// actions.js — Survival GOAP action definitions
//
// Each action has preconditions, effects, and cost. Numeric effects are deltas.
// move_to actions are generated dynamically based on map features.

// ─── Static Actions ────────────────────────────────────────────────────────

var SURVIVAL_ACTIONS = [
  {
    name: "gather_stick",
    preconditions: { near_sticks: true },
    effects: { stick_count: 1 },
    cost: 1,
  },
  {
    name: "gather_stone",
    preconditions: { near_rock: true },
    effects: { stone_count: 1 },
    cost: 1,
  },
  {
    name: "gather_berries",
    preconditions: { near_berries: true },
    effects: { has_food: true },
    cost: 3,
  },
  {
    name: "eat_food",
    preconditions: { has_food: true },
    effects: { hunger: 40, has_food: false },
    cost: 1,
  },
  {
    name: "craft_axe",
    preconditions: { stick_count: 1, stone_count: 1 },
    effects: { has_axe: true, stick_count: -1, stone_count: -1 },
    cost: 2,
  },
  {
    name: "craft_torch",
    preconditions: { stick_count: 1, wood_count: 1 },
    effects: { has_torch: true, stick_count: -1, wood_count: -1 },
    cost: 2,
  },
  {
    name: "chop_tree",
    preconditions: { has_axe: true, near_tree: true },
    effects: { wood_count: 2 },
    cost: 3,
  },
  {
    name: "build_fire",
    preconditions: { wood_count: 2, near_clear: true },
    effects: { near_fire: true, wood_count: -2 },
    cost: 3,
  },
  {
    name: "warm_at_fire",
    preconditions: { near_fire: true },
    effects: { warmth: 50 },
    cost: 1,
  },
  {
    name: "flee",
    preconditions: { threat_visible: true },
    effects: { threat_visible: false },
    cost: 0,
  },
  {
    name: "craft_fishing_pole",
    preconditions: { stick_count: 2, stone_count: 1 },
    effects: { has_fishing_pole: true, stick_count: -2, stone_count: -1 },
    cost: 2,
  },
  {
    name: "build_shelter",
    preconditions: { wood_count: 4, stick_count: 2, near_clear: true },
    effects: { near_shelter: true, wood_count: -4, stick_count: -2 },
    cost: 5,
  },
  {
    name: "catch_fish",
    preconditions: { has_fishing_pole: true, near_water: true },
    effects: { has_raw_fish: true },
    cost: 2,
  },
  {
    name: "cook_fish",
    preconditions: { has_raw_fish: true, near_fire: true },
    effects: { has_cooked_fish: true, has_raw_fish: false },
    cost: 1,
  },
  {
    name: "eat_cooked_fish",
    preconditions: { has_cooked_fish: true },
    effects: { hunger: 60, has_cooked_fish: false },
    cost: 1,
  },
  {
    name: "warm_at_shelter",
    preconditions: { near_shelter: true },
    effects: { warmth: 50 },
    cost: 1,
  },
  {
    name: "craft_shovel",
    preconditions: { stick_count: 2, stone_count: 1 },
    effects: { has_shovel: true, stick_count: -2, stone_count: -1 },
    cost: 2,
  },
  {
    name: "craft_pickaxe",
    preconditions: { stone_count: 2, stick_count: 1 },
    effects: { has_pickaxe: true, stone_count: -2, stick_count: -1 },
    cost: 2,
  },
  {
    name: "dig",
    preconditions: { has_shovel: true, near_dig_site: true },
    effects: { near_exposed_rock: true, near_dig_site: false },
    cost: 3,
  },
  {
    name: "mine_rock",
    preconditions: { has_pickaxe: true, near_exposed_rock: true },
    effects: { mined_rock: true, near_exposed_rock: false },
    cost: 3,
  },
];

// ─── Move-To Actions ───────────────────────────────────────────────────────
// Generated dynamically based on agent position and nearest feature of each type.

var MOVE_TARGETS = [
  { target: "tree", feature: FEATURE_TREE, stateKey: "near_tree" },
  { target: "rock", feature: FEATURE_ROCK, stateKey: "near_rock" },
  { target: "berries", feature: FEATURE_BERRY, stateKey: "near_berries" },
  { target: "sticks", feature: FEATURE_STICKS, stateKey: "near_sticks" },
  { target: "fire", feature: FEATURE_FIRE, stateKey: "near_fire" },
  { target: "clear", feature: FEATURE_NONE, stateKey: "near_clear" },
  { target: "water", terrain: TERRAIN_WATER, stateKey: "near_water" },
  { target: "shelter", feature: FEATURE_SHELTER, stateKey: "near_shelter" },
  { target: "dig_site", feature: FEATURE_DIG_SITE, stateKey: "near_dig_site" },
  { target: "exposed_rock", feature: FEATURE_EXPOSED_ROCK, stateKey: "near_exposed_rock" },
];

var MOVE_SEARCH_RADIUS = 20;
var TERRAIN_SEARCH_RADIUS = 40; // larger for terrain (water) — always exists but can be far

function buildMoveToActions(map, agentX, agentY) {
  var moveActions = [];

  for (var i = 0; i < MOVE_TARGETS.length; i++) {
    var mt = MOVE_TARGETS[i];
    var nearest;
    if (mt.terrain !== undefined) {
      nearest = findNearestTerrain(map, agentX, agentY, mt.terrain, TERRAIN_SEARCH_RADIUS);
    } else {
      nearest = findNearestFeature(map, agentX, agentY, mt.feature, mt.target === "clear", MOVE_SEARCH_RADIUS);
    }
    if (!nearest) continue;

    var dist = Math.abs(nearest.x - agentX) + Math.abs(nearest.y - agentY);
    // Cost is distance-based but capped to keep planner search manageable
    var cost = Math.max(1, Math.min(dist, 20));

    var effects = {};
    effects[mt.stateKey] = true;

    moveActions.push(Nuglib.createAction({
      name: "move_to_" + mt.target,
      preconditions: {},
      effects: effects,
      cost: cost,
    }));
  }

  return moveActions;
}

function findNearestTerrain(map, ax, ay, terrainType, maxRadius) {
  var best = null;
  var bestDist = Infinity;

  for (var y = 0; y < MAP_ROWS; y++) {
    for (var x = 0; x < MAP_COLS; x++) {
      if (getTerrainAt(x, y) !== terrainType) continue;

      var dist = Math.abs(x - ax) + Math.abs(y - ay);
      if (maxRadius && dist > maxRadius) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: x, y: y };
      }
    }
  }

  return best;
}

function findNearestFeature(map, ax, ay, featureType, wantClear, maxRadius) {
  var best = null;
  var bestDist = Infinity;

  for (var y = 0; y < MAP_ROWS; y++) {
    for (var x = 0; x < MAP_COLS; x++) {
      if (wantClear) {
        if (map.blocksMovement(x, y)) continue;
        if (getFeatureAt(x, y) !== FEATURE_NONE) continue;
        if (getTerrainAt(x, y) !== TERRAIN_GRASS) continue;
      } else {
        if (getFeatureAt(x, y) !== featureType) continue;
      }

      var dist = Math.abs(x - ax) + Math.abs(y - ay);
      if (maxRadius && dist > maxRadius) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: x, y: y };
      }
    }
  }

  return best;
}

function findNearestFeaturePosition(map, ax, ay, featureType, wantClear) {
  return findNearestFeature(map, ax, ay, featureType, wantClear);
}

function buildGoapActions(map, agentX, agentY) {
  // Convert static actions to Nuglib GoapAction objects
  var goapActions = [];
  for (var i = 0; i < SURVIVAL_ACTIONS.length; i++) {
    var a = SURVIVAL_ACTIONS[i];
    goapActions.push(Nuglib.createAction({
      name: a.name,
      preconditions: a.preconditions,
      effects: a.effects,
      cost: a.cost,
    }));
  }

  // Add dynamic move_to actions
  var moveActions = buildMoveToActions(map, agentX, agentY);
  for (var j = 0; j < moveActions.length; j++) {
    goapActions.push(moveActions[j]);
  }

  return goapActions;
}
