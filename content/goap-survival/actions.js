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
    cost: 1,
  },
  {
    name: "eat_food",
    preconditions: { has_food: true },
    effects: { hunger: 30, has_food: false },
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
    effects: { warmth: 40 },
    cost: 1,
  },
  {
    name: "flee",
    preconditions: { threat_visible: true },
    effects: { threat_visible: false },
    cost: 0,
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
];

function buildMoveToActions(map, agentX, agentY) {
  var moveActions = [];

  for (var i = 0; i < MOVE_TARGETS.length; i++) {
    var mt = MOVE_TARGETS[i];
    var nearest = findNearestFeature(map, agentX, agentY, mt.feature, mt.target === "clear");
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

function findNearestFeature(map, ax, ay, featureType, wantClear) {
  var best = null;
  var bestDist = Infinity;

  for (var y = 0; y < MAP_ROWS; y++) {
    for (var x = 0; x < MAP_COLS; x++) {
      if (wantClear) {
        // For "clear" target: walkable grass tile with no feature, not the agent's tile
        if (map.blocksMovement(x, y)) continue;
        if (getFeatureAt(x, y) !== FEATURE_NONE) continue;
        if (getTerrainAt(x, y) !== TERRAIN_GRASS) continue;
      } else {
        if (getFeatureAt(x, y) !== featureType) continue;
      }

      var dist = Math.abs(x - ax) + Math.abs(y - ay);
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
