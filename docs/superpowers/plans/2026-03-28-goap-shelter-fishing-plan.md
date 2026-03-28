# GOAP Shelter, Fishing & Oscillation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix agent oscillation bugs and add shelter (permanent structure with monster safe zone + warmth) and fishing chain (craft pole → catch fish → cook fish) to the GOAP survival sketch.

**Architecture:** All changes are in the existing vanilla JS files loaded by p5.js. No new files — extends existing systems (GOAP actions, world state, plan execution, monster AI, goal selection, rendering). The oscillation fix modifies goal selection and plan validation; shelter/fishing adds new GOAP actions and execution handlers following established patterns.

**Tech Stack:** p5.js, Nuglib (ECS + GOAP + pathfinding), vanilla JS (no modules, no build step)

**Spec:** `docs/superpowers/specs/2026-03-28-goap-shelter-fishing-design.md`

---

## File Structure

All modifications — no new files created.

| File | Responsibility | Changes |
|------|---------------|---------|
| `content/goap-survival/needs.js` | Need decay, goal selection | Goal hysteresis, shelter warmth decay, shelter goal |
| `content/goap-survival/main.js` | Systems, ECS setup, execution | Remove validatePlan, clear moveTarget, pathGoal for blocked tiles, shelter/fishing execution, monster safe zone, inventory fields |
| `content/goap-survival/map-gen.js` | Map data, feature constants | FEATURE_SHELTER constant + glyph + color, shelterExistsOnMap helper |
| `content/goap-survival/actions.js` | GOAP action definitions | 7 new actions, 2 new move targets, findNearestTerrain helper |
| `content/goap-survival/world-state.js` | World state snapshot | near_shelter + fishing inventory state keys |
| `content/goap-survival/rendering.js` | Map + panel rendering | New goal colors, fishing inventory in panel |
| `content/goap-survival/index.md` | Page metadata + legend | Shelter in legend |

---

### Task 1: Fix GOAP Oscillation

Fixes the Buridan's ass problem where the agent oscillates between move_to_rock and move_to_sticks (plan-level oscillation from per-tick cost rebuilding) and the problem where the agent abandons long journeys when a minor need fluctuation triggers a goal switch.

**Files:**
- Modify: `content/goap-survival/needs.js:56-76` (GoalSelectionSystem.run)
- Modify: `content/goap-survival/main.js:25-66` (GoapPlanningSystem.run)
- Modify: `content/goap-survival/main.js:89-123` (PlanExecutionSystem constructor + run)

- [ ] **Step 1: Add goal hysteresis to GoalSelectionSystem**

In `content/goap-survival/needs.js`, replace the goal-changed check in `GoalSelectionSystem.run` (lines 70-76):

```javascript
      // OLD:
      // If goal changed, trigger replan
      if (!agent.currentGoal || !goalsEqual(agent.currentGoal, best)) {
        agent.currentGoal = best;
        agent.currentPlan = null;
        agent.planStepIndex = 0;
        agent.needsReplan = true;
      }
```

With:

```javascript
      // Goal hysteresis: if executing a plan, require significant priority
      // jump to switch goals (prevents oscillation on minor need fluctuations)
      var shouldSwitch = true;
      if (agent.currentGoal && agent.currentPlan &&
          agent.planStepIndex < agent.currentPlan.actions.length) {
        if (best.priority <= agent.currentGoal.priority + 15) {
          shouldSwitch = false;
        }
      }

      if (shouldSwitch && (!agent.currentGoal || !goalsEqual(agent.currentGoal, best))) {
        agent.currentGoal = best;
        agent.currentPlan = null;
        agent.planStepIndex = 0;
        agent.needsReplan = true;
      }
```

- [ ] **Step 2: Remove per-tick plan validation from GoapPlanningSystem**

In `content/goap-survival/main.js`, replace the `shouldPlan` logic in `GoapPlanningSystem.run` (lines 43-64):

```javascript
      // OLD:
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
```

With:

```javascript
      // Plan commitment: only replan when goal changes (needsReplan) or
      // no plan exists. Do NOT revalidate per-tick — that causes oscillation
      // when dynamic move_to costs shift with agent position.
      if (!agent.currentPlan || agent.needsReplan) {
        this.makePlan(world, entity, agent, gameMap, tick);
      }
```

- [ ] **Step 3: Add plan-change detection and pathGoal to PlanExecutionSystem**

In `content/goap-survival/main.js`, replace the PlanExecutionSystem constructor (line 90-93):

```javascript
  // OLD:
  constructor() {
    this.phase = "early";
    this.moveTarget = null; // { x, y } for current move_to destination
  }
```

With:

```javascript
  constructor() {
    this.phase = "early";
    this.moveTarget = null;
    this.pathGoal = null;
    this._lastPlan = null;
    this._lastStepIndex = -1;
  }
```

Then in `PlanExecutionSystem.run`, add plan-change detection right before the `executeAction` call. Replace lines 106-120:

```javascript
      // OLD:
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
```

With:

```javascript
      // Clear pathfinding state when plan or step changes
      if (agent.currentPlan !== this._lastPlan || agent.planStepIndex !== this._lastStepIndex) {
        this.moveTarget = null;
        this.pathGoal = null;
        this._lastPlan = agent.currentPlan;
        this._lastStepIndex = agent.planStepIndex;
      }

      var currentAction = agent.currentPlan.actions[agent.planStepIndex];
      var pos = world.getComponent(entity, "Position");
      var needs = world.getComponent(entity, "Needs");
      var inventory = world.getComponent(entity, "Inventory");
      if (!pos || !needs || !inventory) continue;

      var done = this.executeAction(world, entity, currentAction, pos, needs, inventory, gameMap, tick);

      if (done) {
        agent.planStepIndex++;
        this.moveTarget = null;
        this.pathGoal = null;
      }
```

- [ ] **Step 4: Add pathGoal support to executeMoveToAction**

In `content/goap-survival/main.js`, replace the entire `executeMoveToAction` method (lines 186-225):

```javascript
  executeMoveToAction(world, entity, name, pos, gameMap) {
    var targetType = name.replace("move_to_", "");
    var featureType = FEATURE_NONE;
    var wantClear = false;
    var wantWater = false;

    if (targetType === "tree") featureType = FEATURE_TREE;
    else if (targetType === "rock") featureType = FEATURE_ROCK;
    else if (targetType === "berries") featureType = FEATURE_BERRY;
    else if (targetType === "sticks") featureType = FEATURE_STICKS;
    else if (targetType === "fire") featureType = FEATURE_FIRE;
    else if (targetType === "shelter") featureType = FEATURE_SHELTER;
    else if (targetType === "clear") wantClear = true;
    else if (targetType === "water") wantWater = true;

    // Find nearest target if we don't have one
    if (!this.moveTarget) {
      var nearest;
      if (wantWater) {
        nearest = findNearestTerrain(gameMap, pos.x, pos.y, TERRAIN_WATER);
      } else {
        nearest = findNearestFeaturePosition(gameMap, pos.x, pos.y, featureType, wantClear);
      }
      if (!nearest) return true; // can't find target, skip
      this.moveTarget = nearest;

      // If target tile is blocked (rocks, water), path to a walkable neighbor
      if (gameMap.blocksMovement(nearest.x, nearest.y)) {
        var neighbor = this.findWalkableNeighbor(gameMap, nearest.x, nearest.y);
        if (!neighbor) return true;
        this.pathGoal = neighbor;
      } else {
        this.pathGoal = nearest;
      }
    }

    // Check if adjacent to the target (for blocked features: rocks, water)
    if (Nuglib.isAdjacent(pos.x, pos.y, this.moveTarget.x, this.moveTarget.y)) {
      return true; // arrived adjacent
    }

    // Check if on top of the target (for walkable features)
    if (pos.x === this.moveTarget.x && pos.y === this.moveTarget.y) {
      return true; // arrived
    }

    // Pathfind one step toward goal (walkable neighbor if target is blocked)
    var goal = this.pathGoal || this.moveTarget;
    var dir = Nuglib.getStepToward(gameMap, pos.x, pos.y, goal.x, goal.y);
    if (dir) {
      this.queueMove(world, entity, dir);
    } else {
      return true; // can't reach, give up
    }

    return false; // not done yet, still moving
  }

  findWalkableNeighbor(gameMap, x, y) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = x + dx;
        var ny = y + dy;
        if (nx < 0 || nx >= MAP_COLS || ny < 0 || ny >= MAP_ROWS) continue;
        if (!gameMap.blocksMovement(nx, ny)) return { x: nx, y: ny };
      }
    }
    return null;
  }
```

- [ ] **Step 5: Verify and commit**

Open the sketch in browser. Observe:
- Agent commits to a goal and follows through without flip-flopping between move_to_rock and move_to_sticks
- Agent doesn't abandon long journeys for minor hunger fluctuations
- Agent still switches goals when a need becomes genuinely urgent (e.g., hunger drops very low)

```bash
git add content/goap-survival/needs.js content/goap-survival/main.js
git commit -m "Fix GOAP oscillation: goal hysteresis + plan commitment + pathGoal"
```

---

### Task 2: Shelter & Fishing Data Layer

Adds the FEATURE_SHELTER constant, new inventory fields, and world state keys needed by later tasks.

**Files:**
- Modify: `content/goap-survival/map-gen.js:22-23,46-58` (feature constant + glyph + color)
- Modify: `content/goap-survival/world-state.js:15-88` (new state keys)
- Modify: `content/goap-survival/main.js:697-703` (inventory fields)

- [ ] **Step 1: Add FEATURE_SHELTER to map-gen.js**

In `content/goap-survival/map-gen.js`, after the `FEATURE_FIRE = 5` line (line 22), add:

```javascript
var FEATURE_SHELTER = 6;
```

After the `FEATURE_COLORS[FEATURE_FIRE]` line (line 58), add:

```javascript
FEATURE_GLYPHS[FEATURE_SHELTER] = "H";
FEATURE_COLORS[FEATURE_SHELTER] = [180, 140, 100];
```

At the end of the file (after `removeFeatureAt`), add:

```javascript
function shelterExistsOnMap() {
  for (var i = 0; i < features.length; i++) {
    if (features[i] === FEATURE_SHELTER) return true;
  }
  return false;
}
```

- [ ] **Step 2: Add new inventory fields in main.js**

In `content/goap-survival/main.js`, replace the Inventory component (lines 697-703):

```javascript
  // OLD:
  world.addComponent(agentEntity, "Inventory", {
    sticks: 0,
    stones: 0,
    wood: 0,
    hasAxe: false,
    hasTorch: false,
    hasFood: false,
  });
```

With:

```javascript
  world.addComponent(agentEntity, "Inventory", {
    sticks: 0,
    stones: 0,
    wood: 0,
    hasAxe: false,
    hasTorch: false,
    hasFood: false,
    hasFishingPole: false,
    hasRawFish: false,
    hasCookedFish: false,
  });
```

- [ ] **Step 3: Add world state keys in world-state.js**

In `content/goap-survival/world-state.js`, add `nearShelter` to the variable declarations (after line 19, `var nearWater = false;`):

```javascript
  var nearShelter = false;
```

In the adjacency scan loop (after the `if (feat === FEATURE_FIRE) nearFire = true;` line), add:

```javascript
      if (feat === FEATURE_SHELTER) nearShelter = true;
```

In the `createState` call (lines 69-88), add these keys after `near_water: nearWater,`:

```javascript
    near_shelter: nearShelter,
    has_fishing_pole: inventory.hasFishingPole,
    has_raw_fish: inventory.hasRawFish,
    has_cooked_fish: inventory.hasCookedFish,
```

- [ ] **Step 4: Commit**

```bash
git add content/goap-survival/map-gen.js content/goap-survival/main.js content/goap-survival/world-state.js
git commit -m "Add shelter feature constant, fishing inventory fields, world state keys"
```

---

### Task 3: New GOAP Action Definitions

Adds the 7 new static GOAP actions and 2 new move targets (water, shelter) plus the `findNearestTerrain` helper for water tile search.

**Files:**
- Modify: `content/goap-survival/actions.js:8-69` (SURVIVAL_ACTIONS)
- Modify: `content/goap-survival/actions.js:74-81` (MOVE_TARGETS)
- Modify: `content/goap-survival/actions.js:83-107` (buildMoveToActions)

- [ ] **Step 1: Add new static actions to SURVIVAL_ACTIONS**

In `content/goap-survival/actions.js`, add these entries to the `SURVIVAL_ACTIONS` array, before the closing `];` (after the `flee` action on line 68):

```javascript
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
    name: "eat_raw_fish",
    preconditions: { has_raw_fish: true },
    effects: { hunger: 15, has_raw_fish: false },
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
    effects: { warmth: 20 },
    cost: 1,
  },
```

- [ ] **Step 2: Add water and shelter to MOVE_TARGETS**

In `content/goap-survival/actions.js`, add these entries to `MOVE_TARGETS` (after the `clear` entry, before the closing `];`):

```javascript
  { target: "water", terrain: TERRAIN_WATER, stateKey: "near_water" },
  { target: "shelter", feature: FEATURE_SHELTER, stateKey: "near_shelter" },
```

- [ ] **Step 3: Add findNearestTerrain and update buildMoveToActions**

In `content/goap-survival/actions.js`, add `findNearestTerrain` right before the existing `findNearestFeature` function:

```javascript
function findNearestTerrain(map, ax, ay, terrainType) {
  var best = null;
  var bestDist = Infinity;

  for (var y = 0; y < MAP_ROWS; y++) {
    for (var x = 0; x < MAP_COLS; x++) {
      if (getTerrainAt(x, y) !== terrainType) continue;

      var dist = Math.abs(x - ax) + Math.abs(y - ay);
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: x, y: y };
      }
    }
  }

  return best;
}
```

Then update `buildMoveToActions` to handle the `terrain` field. Replace the `findNearestFeature` call inside the loop (line 88):

```javascript
    // OLD:
    var nearest = findNearestFeature(map, agentX, agentY, mt.feature, mt.target === "clear");
```

With:

```javascript
    var nearest;
    if (mt.terrain !== undefined) {
      nearest = findNearestTerrain(map, agentX, agentY, mt.terrain);
    } else {
      nearest = findNearestFeature(map, agentX, agentY, mt.feature, mt.target === "clear");
    }
```

- [ ] **Step 4: Commit**

```bash
git add content/goap-survival/actions.js
git commit -m "Add GOAP actions for shelter, fishing pole, fish catching/cooking"
```

---

### Task 4: Shelter Execution, Monster Safe Zone & Warmth Decay

Implements the `build_shelter` and `warm_at_shelter` action handlers, makes monsters avoid shelter zones, and halves warmth decay near shelter.

**Files:**
- Modify: `content/goap-survival/main.js:134-183` (PlanExecutionSystem.executeAction switch)
- Modify: `content/goap-survival/main.js:409-434` (MonsterAISystem isBlocked callbacks)
- Modify: `content/goap-survival/needs.js:27-31` (NeedDecaySystem warmth decay)

- [ ] **Step 1: Add shelter action handlers to PlanExecutionSystem.executeAction**

In `content/goap-survival/main.js`, in the `executeAction` switch statement, add these cases before the `default:` case:

```javascript
      case "build_shelter":
        return this.executeBuildShelter(world, entity, pos, inventory, gameMap);

      case "warm_at_shelter":
        needs.warmth = Math.min(100, needs.warmth + 20);
        return true;
```

- [ ] **Step 2: Add executeBuildShelter method**

In `content/goap-survival/main.js`, add this method to PlanExecutionSystem, right after the `executeBuildFire` method:

```javascript
  executeBuildShelter(world, entity, pos, inventory, gameMap) {
    if (inventory.wood < 4 || inventory.sticks < 2) return true;

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

        inventory.wood -= 4;
        inventory.sticks -= 2;
        setFeatureAt(nx, ny, FEATURE_SHELTER);
        world.addComponent(entity, "Action", {
          type: "wait",
          energyCost: 150,
        });
        return true;
      }
    }
    return true;
  }
```

- [ ] **Step 3: Add shelter safe zone to MonsterAISystem**

In `content/goap-survival/main.js`, in the `MonsterAISystem.run` method, find the `isBlocked` callback inside the hunting branch (the one used when `agentVisible && agentPos`, around line 425). Replace:

```javascript
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
```

With:

```javascript
          var dir = Nuglib.getStepToward(
            gameMap, pos.x, pos.y, agentPos.x, agentPos.y,
            {
              isBlocked: function (x, y) {
                if (x === pos.x && y === pos.y) return false;
                if (x === agentPos.x && y === agentPos.y) return false;
                if (blockedPositions.has(x + "," + y)) return true;
                if (getLightAt(x, y) > 0.5) return true;
                // Shelter safe zone: avoid tiles adjacent to shelter
                for (var sdy = -1; sdy <= 1; sdy++) {
                  for (var sdx = -1; sdx <= 1; sdx++) {
                    if (getFeatureAt(x + sdx, y + sdy) === FEATURE_SHELTER) return true;
                  }
                }
                return false;
              },
            }
          );
```

Do the same for the wandering `isBlocked` callback in `doWander` (around line 458). Replace:

```javascript
      isBlocked: function (x, y) {
          if (x === pos.x && y === pos.y) return false;
          if (blockedPositions.has(x + "," + y)) return true;
          if (getLightAt(x, y) > 0.5) return true;
          return false;
        },
```

With:

```javascript
      isBlocked: function (x, y) {
          if (x === pos.x && y === pos.y) return false;
          if (blockedPositions.has(x + "," + y)) return true;
          if (getLightAt(x, y) > 0.5) return true;
          for (var sdy = -1; sdy <= 1; sdy++) {
            for (var sdx = -1; sdx <= 1; sdx++) {
              if (getFeatureAt(x + sdx, y + sdy) === FEATURE_SHELTER) return true;
            }
          }
          return false;
        },
```

- [ ] **Step 4: Halve warmth decay near shelter in NeedDecaySystem**

In `content/goap-survival/needs.js`, replace the warmth decay lines (lines 29-31):

```javascript
      // OLD:
      // Warmth decays faster at night
      var warmthDecay = nightTime ? 2 : 0.5;
      needs.warmth = Math.max(0, needs.warmth - warmthDecay);
```

With:

```javascript
      // Warmth decays faster at night; shelter halves decay
      var warmthDecay = nightTime ? 2 : 0.5;
      var pos = world.getComponent(entity, "Position");
      if (pos) {
        for (var sdy = -1; sdy <= 1; sdy++) {
          for (var sdx = -1; sdx <= 1; sdx++) {
            if (sdx === 0 && sdy === 0) continue;
            if (getFeatureAt(pos.x + sdx, pos.y + sdy) === FEATURE_SHELTER) {
              warmthDecay *= 0.5;
              sdy = 2; sdx = 2; // break both loops
            }
          }
        }
      }
      needs.warmth = Math.max(0, needs.warmth - warmthDecay);
```

- [ ] **Step 5: Verify and commit**

Open the sketch. Manually test by giving the agent enough resources (or waiting for it to gather them) and observing:
- Agent builds a shelter (H glyph appears on map)
- Monsters avoid tiles near the shelter
- Warmth decays slower when agent is adjacent to shelter

```bash
git add content/goap-survival/main.js content/goap-survival/needs.js
git commit -m "Add shelter execution, monster safe zone, warmth decay reduction"
```

---

### Task 5: Fishing Execution & Water Movement

Implements `craft_fishing_pole`, `catch_fish`, `cook_fish`, `eat_raw_fish`, and `eat_cooked_fish` action handlers.

**Files:**
- Modify: `content/goap-survival/main.js:134-183` (PlanExecutionSystem.executeAction switch)

- [ ] **Step 1: Add fishing action handlers to PlanExecutionSystem.executeAction**

In `content/goap-survival/main.js`, in the `executeAction` switch statement, add these cases before the `default:` case (after the shelter cases added in Task 4):

```javascript
      case "craft_fishing_pole":
        if (inventory.sticks >= 2 && inventory.stones >= 1) {
          inventory.sticks -= 2;
          inventory.stones--;
          inventory.hasFishingPole = true;
        }
        return true;

      case "catch_fish":
        return this.executeCatchFish(world, entity, pos, inventory);

      case "cook_fish":
        return this.executeCookFish(world, entity, pos, inventory);

      case "eat_raw_fish":
        if (inventory.hasRawFish) {
          inventory.hasRawFish = false;
          needs.hunger = Math.min(100, needs.hunger + 15);
        }
        return true;

      case "eat_cooked_fish":
        if (inventory.hasCookedFish) {
          inventory.hasCookedFish = false;
          needs.hunger = Math.min(100, needs.hunger + 60);
        }
        return true;
```

- [ ] **Step 2: Add executeCatchFish and executeCookFish methods**

In `content/goap-survival/main.js`, add these methods to PlanExecutionSystem, right after the `executeBuildShelter` method:

```javascript
  executeCatchFish(world, entity, pos, inventory) {
    if (!inventory.hasFishingPole) return true;

    // Check adjacent tiles for water terrain
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = pos.x + dx;
        var ny = pos.y + dy;
        if (getTerrainAt(nx, ny) === TERRAIN_WATER) {
          inventory.hasRawFish = true;
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

  executeCookFish(world, entity, pos, inventory) {
    if (!inventory.hasRawFish) return true;

    // Check adjacent tiles for fire
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = pos.x + dx;
        var ny = pos.y + dy;
        if (getFeatureAt(nx, ny) === FEATURE_FIRE) {
          inventory.hasCookedFish = true;
          inventory.hasRawFish = false;
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
```

- [ ] **Step 3: Commit**

```bash
git add content/goap-survival/main.js
git commit -m "Add fishing pole crafting, fish catching, cooking execution"
```

---

### Task 6: Shelter Goal Selection

Adds the shelter goal to GoalSelectionSystem so the agent proactively builds shelter before nightfall (or reactively when warmth is low).

**Files:**
- Modify: `content/goap-survival/needs.js:80-196` (GoalSelectionSystem.selectGoal)

- [ ] **Step 1: Add shelter goal to selectGoal**

In `content/goap-survival/needs.js`, in `GoalSelectionSystem.selectGoal`, add the shelter goal block right after the night torch goal block (after line 165, before the default preparation goal):

```javascript
    // Shelter goal (only if no shelter exists yet)
    if (!shelterExistsOnMap()) {
      if (foresightMode) {
        // Proactive: build shelter before night
        var cycleTick3 = tick % CYCLE_LENGTH;
        if (cycleTick3 >= 30) {
          candidates.push({
            state: { near_shelter: true },
            priority: 45,
            label: "shelter",
          });
        }
      } else {
        // Reactive: build when warmth is getting low
        if (needs.warmth < 40) {
          candidates.push({
            state: { near_shelter: true },
            priority: 45,
            label: "shelter",
          });
        }
      }
    }
```

- [ ] **Step 2: Commit**

```bash
git add content/goap-survival/needs.js
git commit -m "Add shelter goal to GoalSelectionSystem"
```

---

### Task 7: Rendering & Legend Updates

Adds shelter goal color, fishing inventory display in the panel, and updates the legend.

**Files:**
- Modify: `content/goap-survival/rendering.js:18-26` (GOAL_COLORS)
- Modify: `content/goap-survival/rendering.js:186-199` (panel inventory section)
- Modify: `content/goap-survival/index.md:60-69` (legend)

- [ ] **Step 1: Add goal colors for shelter and fishing**

In `content/goap-survival/rendering.js`, add these entries to `GOAL_COLORS` (after the `"gather wood"` entry, before `none`):

```javascript
  shelter: [180, 140, 100],           // tan
  "craft fishing pole": [100, 200, 100], // green
```

- [ ] **Step 2: Update panel inventory display**

In `content/goap-survival/rendering.js`, replace the inventory display section (lines 188-199):

```javascript
  // OLD:
  if (inventory) {
    fill(150, 150, 150);
    text("Sticks: " + inventory.sticks + "  Stones: " + inventory.stones, px, py);
    py += lineH;
    text("Wood: " + inventory.wood, px, py);
    py += lineH;
    text("Axe: " + (inventory.hasAxe ? "YES" : "no") +
         "  Torch: " + (inventory.hasTorch ? "YES" : "no"), px, py);
    py += lineH;
    text("Food: " + (inventory.hasFood ? "YES" : "no"), px, py);
    py += lineH + 8;
  }
```

With:

```javascript
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
```

- [ ] **Step 3: Update legend in index.md**

In `content/goap-survival/index.md`, replace the legend section (lines 60-69):

```html
        <span style="color: #fff;">@</span> Agent &nbsp;
        <span style="color: #228B22;">T</span> Tree &nbsp;
        <span style="color: #8B4513;">/</span> Sticks &nbsp;
        <span style="color: #808080;">^</span> Rock &nbsp;
        <span style="color: #800080;">b</span> Berries &nbsp;
        <span style="color: #FFA500;">*</span> Fire<br>
        <span style="color: #556B2F;">&clubs;</span> Dense forest &nbsp;
        <span style="color: #4169E1;">~</span> Water &nbsp;
        <span style="color: #2E8B57;">Z</span> Zombie &nbsp;
        <span style="color: #fff;">S</span> Skeleton
```

With:

```html
        <span style="color: #fff;">@</span> Agent &nbsp;
        <span style="color: #228B22;">T</span> Tree &nbsp;
        <span style="color: #8B4513;">/</span> Sticks &nbsp;
        <span style="color: #808080;">^</span> Rock &nbsp;
        <span style="color: #800080;">b</span> Berries &nbsp;
        <span style="color: #FFA500;">*</span> Fire &nbsp;
        <span style="color: #B48C64;">H</span> Shelter<br>
        <span style="color: #556B2F;">&clubs;</span> Dense forest &nbsp;
        <span style="color: #4169E1;">~</span> Water &nbsp;
        <span style="color: #2E8B57;">Z</span> Zombie &nbsp;
        <span style="color: #fff;">S</span> Skeleton
```

- [ ] **Step 4: Commit**

```bash
git add content/goap-survival/rendering.js content/goap-survival/index.md
git commit -m "Add shelter/fishing to panel display, goal colors, and legend"
```
