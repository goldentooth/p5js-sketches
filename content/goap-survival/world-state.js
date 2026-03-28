// world-state.js — World state snapshot builder for GOAP planner
//
// Scans ECS entities and map proximity to produce a flat GoapState
// that the planner can reason about.

function buildWorldState(world, map, agentEntity, tick) {
  var pos = world.getComponent(agentEntity, "Position");
  if (!pos) return Nuglib.createState({});

  var needs = world.getComponent(agentEntity, "Needs");
  var inventory = world.getComponent(agentEntity, "Inventory");
  if (!needs || !inventory) return Nuglib.createState({});

  // Scan adjacency (cardinal + diagonal neighbors)
  var nearTree = false;
  var nearRock = false;
  var nearBerries = false;
  var nearSticks = false;
  var nearFire = false;
  var nearClear = false;
  var nearWater = false;
  var nearShelter = false;

  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      var nx = pos.x + dx;
      var ny = pos.y + dy;
      if (nx < 0 || nx >= MAP_COLS || ny < 0 || ny >= MAP_ROWS) continue;

      var feat = getFeatureAt(nx, ny);
      var terr = getTerrainAt(nx, ny);

      if (feat === FEATURE_TREE) nearTree = true;
      if (feat === FEATURE_ROCK) nearRock = true;
      if (feat === FEATURE_BERRY) nearBerries = true;
      if (feat === FEATURE_STICKS) nearSticks = true;
      if (feat === FEATURE_FIRE) nearFire = true;
      if (feat === FEATURE_SHELTER) nearShelter = true;
      if (terr === TERRAIN_WATER) nearWater = true;

      // near_clear: walkable grass with no feature
      if (!map.blocksMovement(nx, ny) &&
          feat === FEATURE_NONE &&
          terr === TERRAIN_GRASS) {
        nearClear = true;
      }
    }
  }

  // Also check standing tile for fire (warm_at_fire)
  if (getFeatureAt(pos.x, pos.y) === FEATURE_FIRE) {
    nearFire = true;
  }

  // Check for visible threats
  var threatVisible = false;
  var viewshed = world.getComponent(agentEntity, "Viewshed");
  if (viewshed) {
    for (var entity of world.query(["AIControlled", "Position", "CombatStats"])) {
      var epos = world.getComponent(entity, "Position");
      if (!epos) continue;
      var key = epos.x + "," + epos.y;
      if (viewshed.visibleCells.has(key)) {
        threatVisible = true;
        break;
      }
    }
  }

  return Nuglib.createState({
    hunger: needs.hunger,
    warmth: needs.warmth,
    health: needs.health,
    has_axe: inventory.hasAxe,
    has_torch: inventory.hasTorch,
    has_food: inventory.hasFood,
    wood_count: inventory.wood,
    stick_count: inventory.sticks,
    stone_count: inventory.stones,
    near_tree: nearTree,
    near_rock: nearRock,
    near_berries: nearBerries,
    near_sticks: nearSticks,
    near_fire: nearFire,
    near_clear: nearClear,
    near_water: nearWater,
    near_shelter: nearShelter,
    has_fishing_pole: inventory.hasFishingPole,
    has_raw_fish: inventory.hasRawFish,
    has_cooked_fish: inventory.hasCookedFish,
    is_night: isNight(tick),
    threat_visible: threatVisible,
  });
}
