// rendering.js — Map rendering with lighting, plan inspector panel, glyph coloring
//
// Canvas: 850x540 (600px map + 250px panel)
// Map: 50x30 at 12x18 per tile
// Panel: rendered as text directly on canvas

var CHAR_W = 12;
var CHAR_H = 18;
var MAP_PX_W = MAP_COLS * CHAR_W; // 600
var MAP_PX_H = MAP_ROWS * CHAR_H; // 540
var PANEL_W = 250;
var CANVAS_W = MAP_PX_W + PANEL_W; // 850
var CANVAS_H = MAP_PX_H;           // 540

var layerManager;

// Agent glyph colors by goal type
var GOAL_COLORS = {
  eat: [255, 165, 0],       // orange
  warmth: [100, 150, 255],  // blue
  flee: [255, 50, 50],      // red
  "craft axe": [100, 200, 100],   // green
  "craft torch": [100, 200, 100], // green
  "gather wood": [100, 200, 100], // green
  shelter: [180, 140, 100],           // tan
  "craft fishing pole": [100, 200, 100], // green
  none: [255, 255, 255],    // white
};

function initRendering() {
  layerManager = new Nuglib.LayerManager(window);
  layerManager.createLayer(
    "map",
    Nuglib.createTextLayerConfig(MAP_PX_W, MAP_PX_H, CHAR_H, "Courier New")
  );
}

function renderMap(world, map, agentEntity, tick) {
  var mapLayer = layerManager.getLayer("map");
  mapLayer.clear();
  mapLayer.textFont("Courier New");
  mapLayer.textSize(CHAR_H);
  mapLayer.textAlign(CENTER, CENTER);
  mapLayer.noStroke();

  var agentPos = world.getComponent(agentEntity, "Position");
  var viewshed = world.getComponent(agentEntity, "Viewshed");
  var memory = world.getComponent(agentEntity, "Memory");

  // Draw terrain and features
  for (var y = 0; y < MAP_ROWS; y++) {
    for (var x = 0; x < MAP_COLS; x++) {
      var cellKey = x + "," + y;
      var visible = viewshed && viewshed.visibleCells.has(cellKey);
      var explored = memory && memory.exploredCells.has(cellKey);

      if (!visible && !explored) continue;

      var light = visible ? getLightAt(x, y) : 0;
      var dimFactor = visible ? Math.max(0.05, light) : 0.15;

      var feat = getFeatureAt(x, y);
      var terr = getTerrainAt(x, y);
      var ch, col;

      if (feat !== FEATURE_NONE) {
        ch = FEATURE_GLYPHS[feat];
        col = FEATURE_COLORS[feat];
      } else {
        ch = TERRAIN_GLYPHS[terr];
        col = TERRAIN_COLORS[terr];
      }

      if (!ch) {
        ch = map.blocksMovement(x, y) ? "#" : "\u00B7";
        col = map.blocksMovement(x, y) ? [128, 128, 128] : [34, 80, 34];
      }

      // Multiply color by light level
      var r = Math.floor(col[0] * dimFactor);
      var g = Math.floor(col[1] * dimFactor);
      var b = Math.floor(col[2] * dimFactor);

      // Explored but not visible: desaturated blue-gray tint
      if (!visible && explored) {
        var avg = (col[0] + col[1] + col[2]) / 3;
        r = Math.floor(avg * 0.2);
        g = Math.floor(avg * 0.2);
        b = Math.floor(avg * 0.25);
      }

      mapLayer.fill(r, g, b);
      mapLayer.text(ch, x * CHAR_W + CHAR_W / 2, y * CHAR_H + CHAR_H / 2);
    }
  }

  // Draw entities (monsters)
  for (var entity of world.query(["Position", "Glyph", "AIControlled"])) {
    var pos = world.getComponent(entity, "Position");
    var gl = world.getComponent(entity, "Glyph");
    if (!pos || !gl) continue;

    // Only draw if visible to agent
    var ck = pos.x + "," + pos.y;
    if (!viewshed || !viewshed.visibleCells.has(ck)) continue;

    var lightLevel = Math.max(0.3, getLightAt(pos.x, pos.y));
    var fg = gl.fg;
    mapLayer.fill(
      Math.floor(fg[0] * lightLevel),
      Math.floor(fg[1] * lightLevel),
      Math.floor(fg[2] * lightLevel)
    );
    mapLayer.text(
      gl.glyph,
      pos.x * CHAR_W + CHAR_W / 2,
      pos.y * CHAR_H + CHAR_H / 2
    );
  }

  // Draw agent
  if (agentPos) {
    var agent = world.getComponent(agentEntity, "GoapAgent");
    var label = agent && agent.currentGoal ? getGoalLabel(agent.currentGoal) : "none";
    var agentColor = GOAL_COLORS[label] || GOAL_COLORS["none"];

    mapLayer.fill(agentColor[0], agentColor[1], agentColor[2]);
    mapLayer.text(
      "@",
      agentPos.x * CHAR_W + CHAR_W / 2,
      agentPos.y * CHAR_H + CHAR_H / 2
    );
  }
}

function renderPanel(world, agentEntity, tick) {
  var px = MAP_PX_W + 10; // panel x offset
  var py = 10;
  var lineH = 16;

  // Panel background
  fill(20, 20, 25);
  noStroke();
  rect(MAP_PX_W, 0, PANEL_W, CANVAS_H);

  textFont("Courier New");
  textSize(12);
  textAlign(LEFT, TOP);

  var agent = world.getComponent(agentEntity, "GoapAgent");
  var needs = world.getComponent(agentEntity, "Needs");
  var inventory = world.getComponent(agentEntity, "Inventory");

  // ─── Title ───
  fill(200, 200, 200);
  text("GOAP Inspector", px, py);
  py += lineH + 4;

  // ─── Time ───
  var timeLabel = getTimeOfDay(tick);
  var cycleTick = tick % CYCLE_LENGTH;
  var sunLvl = getSunLevel(tick);
  fill(150, 150, 150);
  text("Time: " + timeLabel + " (" + cycleTick + "/" + CYCLE_LENGTH + ")", px, py);
  py += lineH;
  text("Sun: " + sunLvl.toFixed(2), px, py);
  py += lineH;
  text("Mode: " + (foresightMode ? "Proactive" : "Reactive"), px, py);
  py += lineH + 8;

  // ─── Need Bars ───
  fill(200, 200, 200);
  text("Needs", px, py);
  py += lineH;

  if (needs) {
    drawNeedBar(px, py, "Hunger", needs.hunger, [255, 165, 0]);
    py += lineH + 2;
    drawNeedBar(px, py, "Warmth", needs.warmth, [100, 150, 255]);
    py += lineH + 2;
    drawNeedBar(px, py, "Health", needs.health, [255, 50, 50]);
    py += lineH + 8;
  }

  // ─── Inventory ───
  fill(200, 200, 200);
  text("Inventory", px, py);
  py += lineH;

  if (inventory) {
    fill(150, 150, 150);
    text("Sticks: " + inventory.sticks + "  Stones: " + inventory.stones, px, py);
    py += lineH;
    text("Wood: " + inventory.wood, px, py);
    py += lineH;
    text("Axe: " + (inventory.hasAxe ? "YES" : "no") +
         "  Torch: " + (inventory.hasTorch ? "YES" : "no"), px, py);
    py += lineH;
    text("Pole: " + (inventory.hasFishingPole ? "YES" : "no") +
         "  Food: " + (inventory.hasFood ? "YES" : "no"), px, py);
    py += lineH;
    var fishStatus = inventory.hasCookedFish ? "cooked" :
                     inventory.hasRawFish ? "raw" : "no";
    text("Fish: " + fishStatus, px, py);
    py += lineH + 8;
  }

  // ─── Current Goal ───
  fill(200, 200, 200);
  text("Goal", px, py);
  py += lineH;

  if (agent && agent.currentGoal) {
    var goalLabel = getGoalLabel(agent.currentGoal);
    var goalColor = GOAL_COLORS[goalLabel] || [200, 200, 200];
    fill(goalColor[0], goalColor[1], goalColor[2]);
    text(goalLabel + " (p=" + agent.currentGoal.priority + ")", px, py);
    py += lineH + 4;
  } else {
    fill(100, 100, 100);
    text("none", px, py);
    py += lineH + 4;
  }

  // ─── Plan Steps ───
  fill(200, 200, 200);
  text("Plan", px, py);
  py += lineH;

  if (agent && agent.currentPlan && agent.currentPlan.actions.length > 0) {
    for (var i = 0; i < agent.currentPlan.actions.length; i++) {
      var action = agent.currentPlan.actions[i];
      var prefix;
      if (i < agent.planStepIndex) {
        fill(80, 180, 80);
        prefix = "\u2713 "; // checkmark
      } else if (i === agent.planStepIndex) {
        fill(255, 255, 100);
        prefix = "\u2192 "; // arrow
      } else {
        fill(120, 120, 120);
        prefix = "  ";
      }
      text(prefix + action.name, px, py);
      py += lineH;
    }
  } else {
    fill(100, 100, 100);
    text("(no plan)", px, py);
    py += lineH;
  }

  py += 8;

  // ─── Stats ───
  fill(200, 200, 200);
  text("Stats", px, py);
  py += lineH;

  var stats = world.getResource("SurvivalStats");
  if (stats) {
    fill(150, 150, 150);
    text("Alive: " + stats.aliveTicks + " ticks", px, py);
    py += lineH;
    text("Deaths: " + stats.deaths, px, py);
    py += lineH;
    text("Replans: " + stats.replans, px, py);
    py += lineH;
  }
}

function drawNeedBar(x, y, label, value, barColor) {
  var barW = 100;
  var barH = 10;
  var labelW = 60;

  fill(150, 150, 150);
  textSize(11);
  text(label, x, y);

  // Background bar
  fill(40, 40, 40);
  rect(x + labelW, y + 1, barW, barH);

  // Fill bar
  var fillW = Math.floor(barW * (value / 100));
  var critical = value < 25;

  if (critical) {
    // Pulse red when critical
    var pulse = Math.sin(millis() / 200) * 0.3 + 0.7;
    fill(barColor[0] * pulse, barColor[1] * 0.3, barColor[2] * 0.3);
  } else {
    fill(barColor[0], barColor[1], barColor[2]);
  }
  rect(x + labelW, y + 1, fillW, barH);

  // Value text
  fill(200, 200, 200);
  textSize(10);
  text(Math.floor(value).toString(), x + labelW + barW + 4, y + 1);
  textSize(12);
}
