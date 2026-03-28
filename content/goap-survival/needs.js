// needs.js — NeedDecaySystem, GoalSelectionSystem, foresight logic
//
// Needs: hunger, warmth, health (0-100). Agent dies when any hits 0.
// Goal selection uses utility scoring. Foresight toggle changes behavior.

var foresightMode = true; // true = proactive, false = reactive

// ─── NeedDecaySystem ───────────────────────────────────────────────────────

var NeedDecaySystem = class {
  constructor() {
    this.phase = "early";
  }

  run(world) {
    var clock = world.getResource("GameClock");
    if (clock && clock.paused) return;

    var tick = clock ? clock.tick : 0;
    var nightTime = isNight(tick);

    for (var entity of world.query(["Needs", "Position"])) {
      var needs = world.getComponent(entity, "Needs");
      if (!needs) continue;

      // Hunger decays at constant rate (0.5/tick)
      needs.hunger = Math.max(0, needs.hunger - 0.5);

      // Warmth decays faster at night; shelter halves decay
      var warmthDecay = nightTime ? 1.5 : 0.5;
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

      // Health doesn't decay naturally (only from attacks)

      // Check death
      if (needs.hunger <= 0 || needs.warmth <= 0 || needs.health <= 0) {
        world.addComponent(entity, "Dead", { cause: getCauseOfDeath(needs) });
      }
    }
  }
};

function getCauseOfDeath(needs) {
  if (needs.hunger <= 0) return "starvation";
  if (needs.warmth <= 0) return "hypothermia";
  if (needs.health <= 0) return "killed";
  return "unknown";
}

// ─── GoalSelectionSystem ───────────────────────────────────────────────────

var GoalSelectionSystem = class {
  constructor() {
    this.phase = "early";
  }

  run(world) {
    var clock = world.getResource("GameClock");
    if (clock && clock.paused) return;

    var tick = clock ? clock.tick : 0;

    for (var entity of world.query(["Needs", "Inventory", "GoapAgent", "Position"])) {
      var needs = world.getComponent(entity, "Needs");
      var agent = world.getComponent(entity, "GoapAgent");
      if (!needs || !agent) continue;

      var best = this.selectGoal(needs, world, entity, tick);

      // Goal hysteresis: if executing a plan, require significant priority
      // jump to switch goals (prevents oscillation on minor need fluctuations).
      // Exception: bypass hysteresis when any need is critically low (<15),
      // since the agent needs to react immediately to survive.
      var critical = needs.hunger < 15 || needs.warmth < 15;
      var shouldSwitch = true;
      if (!critical && agent.currentGoal && agent.currentPlan &&
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
    }
  }

  selectGoal(needs, world, entity, tick) {
    var candidates = [];

    // Check for visible threats (always highest priority)
    var worldState = buildWorldState(world, world.getResource("map"), entity, tick);
    if (worldState.get("threat_visible")) {
      candidates.push({
        state: { threat_visible: false },
        priority: 100,
        label: "flee",
      });
    }

    // Hunger goal
    if (foresightMode) {
      // Proactive: trigger when hunger < 50 OR will be critical in 30 ticks
      var futureHunger = needs.hunger - 15; // 30 ticks * 0.5 decay/tick
      if (needs.hunger < 50 || futureHunger < 25) {
        candidates.push({
          state: { hunger: 100 },
          priority: 100 - needs.hunger,
          label: "eat",
        });
      }
    } else {
      // Reactive: only when threshold crossed
      if (needs.hunger < 50) {
        candidates.push({
          state: { hunger: 100 },
          priority: 100 - needs.hunger,
          label: "eat",
        });
      }
    }

    // Warmth goal
    if (foresightMode) {
      var nightTime = isNight(tick);
      var warmthDecay = nightTime ? 1.5 : 0.5;
      var futureWarmth = needs.warmth - (30 * warmthDecay);
      // Also trigger if night is approaching (within 20 ticks)
      var cycleTick = tick % CYCLE_LENGTH;
      var nightApproaching = cycleTick >= 40 && cycleTick < 60;

      if (needs.warmth < 50 || futureWarmth < 25 || (nightApproaching && needs.warmth < 70)) {
        // Warmth priority boosted at night since decay is 4x faster
        var warmthPriority = 100 - needs.warmth;
        if (nightTime) warmthPriority = Math.min(100, warmthPriority + 20);
        candidates.push({
          state: { warmth: 100 },
          priority: warmthPriority,
          label: "warmth",
        });
      }
    } else {
      if (needs.warmth < 50) {
        candidates.push({
          state: { warmth: 100 },
          priority: 100 - needs.warmth,
          label: "warmth",
        });
      }
    }

    // Night torch goal
    if (foresightMode) {
      var cycleTick2 = tick % CYCLE_LENGTH;
      var nightSoon = cycleTick2 >= 40;
      var inv = world.getComponent(
        entity,
        "Inventory"
      );
      if (nightSoon && inv && !inv.hasTorch) {
        candidates.push({
          state: { has_torch: true },
          priority: 60,
          label: "craft torch",
        });
      }
    } else {
      var inv2 = world.getComponent(entity, "Inventory");
      if (isNight(tick) && inv2 && !inv2.hasTorch) {
        candidates.push({
          state: { has_torch: true },
          priority: 60,
          label: "craft torch",
        });
      }
    }

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

    // Default proactive preparation goal
    if (candidates.length === 0) {
      var inv3 = world.getComponent(entity, "Inventory");
      if (inv3 && !inv3.hasAxe) {
        candidates.push({
          state: { has_axe: true },
          priority: 20,
          label: "craft axe",
        });
      } else if (inv3 && !inv3.hasFishingPole) {
        candidates.push({
          state: { has_fishing_pole: true },
          priority: 20,
          label: "craft fishing pole",
        });
      } else {
        // Gather wood for future fires
        candidates.push({
          state: { wood_count: 4 },
          priority: 20,
          label: "gather wood",
        });
      }
    }

    // Pick highest priority
    candidates.sort(function (a, b) { return b.priority - a.priority; });
    var chosen = candidates[0];

    var goal = Nuglib.createGoal({
      state: chosen.state,
      priority: chosen.priority,
    });
    setGoalLabel(goal, chosen.label);
    return goal;
  }
};

function goalsEqual(a, b) {
  if (!a || !b) return false;
  if (a.state.size !== b.state.size) return false;
  for (var entry of a.state) {
    if (b.state.get(entry[0]) !== entry[1]) return false;
  }
  return true;
}

// ─── Goal Label (for display) ──────────────────────────────────────────────
// The label is stored alongside the goal for the plan inspector.
// We use a parallel map since GoapGoal doesn't have a label field.

var goalLabels = new Map();

function setGoalLabel(goal, label) {
  // Use state key as identifier
  var key = "";
  for (var entry of goal.state) {
    key += entry[0] + "=" + entry[1] + ";";
  }
  goalLabels.set(key, label);
}

function getGoalLabel(goal) {
  if (!goal) return "none";
  var key = "";
  for (var entry of goal.state) {
    key += entry[0] + "=" + entry[1] + ";";
  }
  return goalLabels.get(key) || "unknown";
}
