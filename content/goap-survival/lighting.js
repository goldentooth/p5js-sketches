// lighting.js — Day/night cycle and per-tile light calculation
//
// 120-tick cycle: ticks 0-59 = day, ticks 60-119 = night
// Sun uses sinusoidal curve. Fires (radius 5) and torches (radius 3) add local light.

var CYCLE_LENGTH = 120;
var DAY_TICKS = 60;

// Per-tile light levels (indexed by y * MAP_COLS + x)
var lightMap;

// Light sources: { x, y, radius, intensity, color }
var lightSources;

function initLighting() {
  lightMap = new Float32Array(MAP_COLS * MAP_ROWS);
  lightSources = [];
}

function getSunLevel(tick) {
  // Sinusoidal: peak at tick 30 (noon), trough at tick 90 (midnight)
  // sin goes from -1 to 1, we map to 0..1
  var phase = (tick / CYCLE_LENGTH) * Math.PI * 2;
  // tick 0 = dawn (sin=0 → level=0.5), tick 30 = noon (sin=1 → level=1),
  // tick 60 = dusk (sin=0 → level=0.5), tick 90 = midnight (sin=-1 → level=0)
  var raw = Math.sin(phase);
  // Map [-1, 1] to [0, 1] and clamp
  var level = (raw + 1) / 2;
  return Math.max(0, Math.min(1, level));
}

function isNight(tick) {
  return getSunLevel(tick) < 0.3;
}

function isDawn(tick) {
  var level = getSunLevel(tick);
  var prevLevel = getSunLevel((tick - 1 + CYCLE_LENGTH) % CYCLE_LENGTH);
  return level >= 0.3 && prevLevel < 0.3;
}

function getTimeOfDay(tick) {
  var cycleTick = tick % CYCLE_LENGTH;
  if (cycleTick < 15) return "dawn";
  if (cycleTick < 45) return "day";
  if (cycleTick < 60) return "dusk";
  return "night";
}

function addFireSource(x, y) {
  lightSources.push({
    x: x,
    y: y,
    radius: 5,
    intensity: 0.9,
    color: [255, 180, 60], // warm orange
    permanent: true,
  });
}

function clearLightSources() {
  lightSources = [];
}

function calculateLighting(tick, agentX, agentY, hasTorch) {
  var sunLevel = getSunLevel(tick);

  // Fill with sun level
  for (var i = 0; i < lightMap.length; i++) {
    lightMap[i] = sunLevel;
  }

  // Apply fire sources
  for (var s = 0; s < lightSources.length; s++) {
    var src = lightSources[s];
    applyLightSource(src.x, src.y, src.radius, src.intensity);
  }

  // Apply torch if agent has one
  if (hasTorch) {
    applyLightSource(agentX, agentY, 3, 0.8);
  }
}

function applyLightSource(sx, sy, radius, intensity) {
  var r2 = radius * radius;
  var minX = Math.max(0, sx - radius);
  var maxX = Math.min(MAP_COLS - 1, sx + radius);
  var minY = Math.max(0, sy - radius);
  var maxY = Math.min(MAP_ROWS - 1, sy + radius);

  for (var y = minY; y <= maxY; y++) {
    for (var x = minX; x <= maxX; x++) {
      var dx = x - sx;
      var dy = y - sy;
      var dist2 = dx * dx + dy * dy;
      if (dist2 > r2) continue;

      // Inverse-square falloff, clamped
      var dist = Math.sqrt(dist2);
      var falloff = 1 - (dist / radius);
      var light = intensity * falloff * falloff;

      var idx = y * MAP_COLS + x;
      // Take max of existing light and this source
      if (light > lightMap[idx]) {
        lightMap[idx] = light;
      }
    }
  }
}

function getLightAt(x, y) {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return 0;
  return lightMap[y * MAP_COLS + x];
}
