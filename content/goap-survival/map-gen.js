// map-gen.js — Wilderness map generator for GOAP survival
//
// Custom tile types and feature layer. The base map uses Nuglib's createMap
// with Wall for impassable terrain and Floor for walkable. A separate
// features array tracks resource objects (trees, berries, sticks, rocks, fires).

// ─── Tile Constants ────────────────────────────────────────────────────────
// We use the base map tiles: Wall (0) = impassable, Floor (1) = walkable.
// The visual variety (grass, dense forest, water) is encoded in a parallel
// terrain-type array so blocksMovement() stays simple.

var TERRAIN_GRASS = 0;
var TERRAIN_DENSE_FOREST = 1;
var TERRAIN_WATER = 2;

// Feature types (placed on top of walkable tiles, or adjacent-harvestable on walls)
var FEATURE_NONE = 0;
var FEATURE_TREE = 1;
var FEATURE_BERRY = 2;
var FEATURE_STICKS = 3;
var FEATURE_ROCK = 4;
var FEATURE_FIRE = 5;
var FEATURE_SHELTER = 6;

// ─── Map Data ──────────────────────────────────────────────────────────────
// These parallel arrays are indexed by (y * MAP_COLS + x).
// terrain[] stores visual terrain type (grass, dense forest, water)
// features[] stores resource features on each tile

var MAP_COLS = 50;
var MAP_ROWS = 30;
var terrain; // array of TERRAIN_* values
var features; // array of FEATURE_* values

// ─── Glyph & Color Tables ─────────────────────────────────────────────────

var TERRAIN_GLYPHS = {};
TERRAIN_GLYPHS[TERRAIN_GRASS] = "\u00B7";       // middle dot
TERRAIN_GLYPHS[TERRAIN_DENSE_FOREST] = "\u2663"; // club suit
TERRAIN_GLYPHS[TERRAIN_WATER] = "~";

var TERRAIN_COLORS = {};
TERRAIN_COLORS[TERRAIN_GRASS] = [34, 80, 34];
TERRAIN_COLORS[TERRAIN_DENSE_FOREST] = [20, 60, 20];
TERRAIN_COLORS[TERRAIN_WATER] = [30, 60, 180];

var FEATURE_GLYPHS = {};
FEATURE_GLYPHS[FEATURE_TREE] = "T";
FEATURE_GLYPHS[FEATURE_BERRY] = "b";
FEATURE_GLYPHS[FEATURE_STICKS] = "/";
FEATURE_GLYPHS[FEATURE_ROCK] = "^";
FEATURE_GLYPHS[FEATURE_FIRE] = "*";

var FEATURE_COLORS = {};
FEATURE_COLORS[FEATURE_TREE] = [34, 139, 34];
FEATURE_COLORS[FEATURE_BERRY] = [128, 0, 128];
FEATURE_COLORS[FEATURE_STICKS] = [139, 69, 19];
FEATURE_COLORS[FEATURE_ROCK] = [128, 128, 128];
FEATURE_COLORS[FEATURE_FIRE] = [255, 165, 0];
FEATURE_GLYPHS[FEATURE_SHELTER] = "H";
FEATURE_COLORS[FEATURE_SHELTER] = [180, 140, 100];

// ─── Generation ────────────────────────────────────────────────────────────

function generateWildernessMap(rng) {
  // Create base map (all floor = walkable)
  var map = Nuglib.createMap(MAP_COLS, MAP_ROWS, {
    defaultTile: Nuglib.Tiles.Floor,
    edgeBehavior: "block",
  });

  terrain = new Array(MAP_COLS * MAP_ROWS).fill(TERRAIN_GRASS);
  features = new Array(MAP_COLS * MAP_ROWS).fill(FEATURE_NONE);

  // Place water bodies (2-4 blobs)
  var waterBodies = rng.nextRange(2, 5);
  for (var w = 0; w < waterBodies; w++) {
    placeBlob(map, rng, TERRAIN_WATER, true, rng.nextRange(3, 6));
  }

  // Place dense forest clusters (4-7 blobs)
  var forestClusters = rng.nextRange(4, 8);
  for (var f = 0; f < forestClusters; f++) {
    placeBlob(map, rng, TERRAIN_DENSE_FOREST, true, rng.nextRange(3, 7));
  }

  // Place rock outcrops (impassable, harvestable from adjacent)
  placeFeatures(map, rng, FEATURE_ROCK, rng.nextRange(6, 10), 3, true);

  // Place trees (walkable, choppable)
  placeFeatures(map, rng, FEATURE_TREE, rng.nextRange(12, 18), 2, false);

  // Place berry bushes (walkable, forageable)
  placeFeatures(map, rng, FEATURE_BERRY, rng.nextRange(8, 12), 3, false);

  // Place stick piles (walkable, gatherable)
  placeFeatures(map, rng, FEATURE_STICKS, rng.nextRange(10, 15), 2, false);

  return map;
}

function placeBlob(map, rng, terrainType, blocksMove, radius) {
  // Pick a center away from edges
  var cx = rng.nextRange(radius + 2, MAP_COLS - radius - 2);
  var cy = rng.nextRange(radius + 2, MAP_ROWS - radius - 2);

  for (var dy = -radius; dy <= radius; dy++) {
    for (var dx = -radius; dx <= radius; dx++) {
      // Organic shape: use distance + noise
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;
      // Random chance to skip edge tiles for organic shape
      if (dist > radius * 0.6 && rng.nextFloat() < 0.4) continue;

      var x = cx + dx;
      var y = cy + dy;
      if (x <= 0 || x >= MAP_COLS - 1 || y <= 0 || y >= MAP_ROWS - 1) continue;

      var idx = y * MAP_COLS + x;
      terrain[idx] = terrainType;
      if (blocksMove) {
        map.setTile(x, y, Nuglib.Tiles.Wall);
      }
    }
  }
}

function placeFeatures(map, rng, featureType, count, minSpacing, blocksMove) {
  var placed = 0;
  var attempts = 0;
  var maxAttempts = count * 20;

  while (placed < count && attempts < maxAttempts) {
    attempts++;
    var x = rng.nextRange(1, MAP_COLS - 1);
    var y = rng.nextRange(1, MAP_ROWS - 1);
    var idx = y * MAP_COLS + x;

    // Must be on grass (walkable, no other terrain)
    if (terrain[idx] !== TERRAIN_GRASS) continue;
    if (features[idx] !== FEATURE_NONE) continue;
    if (map.blocksMovement(x, y)) continue;

    // Minimum spacing check
    if (!checkSpacing(x, y, featureType, minSpacing)) continue;

    features[idx] = featureType;
    if (blocksMove) {
      map.setTile(x, y, Nuglib.Tiles.Wall);
    }
    placed++;
  }
}

function checkSpacing(x, y, featureType, minSpacing) {
  for (var dy = -minSpacing; dy <= minSpacing; dy++) {
    for (var dx = -minSpacing; dx <= minSpacing; dx++) {
      if (dx === 0 && dy === 0) continue;
      var nx = x + dx;
      var ny = y + dy;
      if (nx < 0 || nx >= MAP_COLS || ny < 0 || ny >= MAP_ROWS) continue;
      var idx = ny * MAP_COLS + nx;
      if (features[idx] === featureType) return false;
    }
  }
  return true;
}

function findSpawnPosition(map, rng) {
  // Find a walkable tile with no feature, near center
  for (var attempt = 0; attempt < 100; attempt++) {
    var x = rng.nextRange(10, MAP_COLS - 10);
    var y = rng.nextRange(5, MAP_ROWS - 5);
    var idx = y * MAP_COLS + x;
    if (!map.blocksMovement(x, y) && features[idx] === FEATURE_NONE) {
      return { x: x, y: y };
    }
  }
  // Fallback: center
  return { x: Math.floor(MAP_COLS / 2), y: Math.floor(MAP_ROWS / 2) };
}

function getFeatureAt(x, y) {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return FEATURE_NONE;
  return features[y * MAP_COLS + x];
}

function setFeatureAt(x, y, featureType) {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return;
  features[y * MAP_COLS + x] = featureType;
}

function getTerrainAt(x, y) {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return TERRAIN_GRASS;
  return terrain[y * MAP_COLS + x];
}

function removeFeatureAt(x, y) {
  setFeatureAt(x, y, FEATURE_NONE);
}

function shelterExistsOnMap() {
  for (var i = 0; i < features.length; i++) {
    if (features[i] === FEATURE_SHELTER) return true;
  }
  return false;
}
