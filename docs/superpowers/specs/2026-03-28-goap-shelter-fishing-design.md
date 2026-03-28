# GOAP Shelter & Fishing Goals Design

## Summary

Add four new goal chains to the GOAP survival sketch: building a permanent shelter (monster protection + warmth preservation), crafting a fishing pole, catching fish adjacent to water, and cooking fish near fire. These deepen the agent's survival strategy beyond the current gather → craft → eat/warm loop.

## Files Affected

- `content/goap-survival/map-gen.js` — new `FEATURE_SHELTER` constant, glyph, color
- `content/goap-survival/actions.js` — new GOAP actions, new move targets
- `content/goap-survival/world-state.js` — new state keys
- `content/goap-survival/needs.js` — shelter warmth decay reduction, new goal selection entries
- `content/goap-survival/main.js` — new execution logic in `PlanExecutionSystem`, shelter safe zone in `MonsterAISystem`, new inventory fields
- `content/goap-survival/rendering.js` — shelter goal color, panel display for new inventory
- `content/goap-survival/lighting.js` — no changes

## New Map Feature

- `FEATURE_SHELTER` (value 6)
- Glyph: `H`
- Color: `[180, 140, 100]` (tan/brown)
- Not generated during map gen — placed only by agent via `build_shelter` action
- Walkable tile (does not block movement for the agent)

## Inventory Extensions

New fields on the Inventory component:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `hasFishingPole` | boolean | false | Crafted from 2 sticks + 1 stone |
| `hasRawFish` | boolean | false | Caught adjacent to water with pole |
| `hasCookedFish` | boolean | false | Cooked near fire |

## World State Extensions

New keys added to `buildWorldState`:

| Key | Type | Source |
|-----|------|--------|
| `has_fishing_pole` | boolean | `inventory.hasFishingPole` |
| `has_raw_fish` | boolean | `inventory.hasRawFish` |
| `has_cooked_fish` | boolean | `inventory.hasCookedFish` |
| `near_shelter` | boolean | Adjacent tile scan for `FEATURE_SHELTER` |
| `near_water` | boolean | Already exists — adjacent tile scan for `TERRAIN_WATER` |

## New GOAP Actions

### Crafting

| Action | Preconditions | Effects | Cost |
|--------|--------------|---------|------|
| `craft_fishing_pole` | `stick_count: 2, stone_count: 1` | `has_fishing_pole: true, stick_count: -2, stone_count: -1` | 2 |
| `build_shelter` | `wood_count: 4, stick_count: 2, near_clear: true` | `near_shelter: true, wood_count: -4, stick_count: -2` | 5 |

### Fishing Chain

| Action | Preconditions | Effects | Cost |
|--------|--------------|---------|------|
| `catch_fish` | `has_fishing_pole: true, near_water: true` | `has_raw_fish: true` | 2 |
| `cook_fish` | `has_raw_fish: true, near_fire: true` | `has_cooked_fish: true, has_raw_fish: false` | 1 |
| `eat_raw_fish` | `has_raw_fish: true` | `hunger: 15, has_raw_fish: false` | 1 |
| `eat_cooked_fish` | `has_cooked_fish: true` | `hunger: 60, has_cooked_fish: false` | 1 |

### Shelter Warmth

| Action | Preconditions | Effects | Cost |
|--------|--------------|---------|------|
| `warm_at_shelter` | `near_shelter: true` | `warmth: 20` | 1 |

### Movement

| Action | Preconditions | Effects | Cost |
|--------|--------------|---------|------|
| `move_to_water` | (none) | `near_water: true` | dynamic (distance) |
| `move_to_shelter` | (none) | `near_shelter: true` | dynamic (distance) |

## Hunger Balance

| Food Source | Hunger Restored | Cost to Obtain |
|-------------|----------------|----------------|
| Berries | +30 | Walk to bush, gather |
| Raw fish | +15 | Craft pole (2 sticks + 1 stone), walk to water, catch |
| Cooked fish | +60 | Craft pole, walk to water, catch, walk to fire, cook |

Cooked fish is the best hunger restoration but requires the longest action chain. The GOAP planner naturally prefers it when the prerequisites are met because fewer eat actions are needed to satisfy the hunger goal.

## Monster Protection (Safe Zone)

Monsters treat tiles adjacent to a shelter (8 neighbors) as blocked in their pathfinding. Implementation:

In `MonsterAISystem`, the `isBlocked` callback passed to `Nuglib.getStepToward` adds a shelter adjacency check: for each candidate tile `(x, y)`, scan its 8 neighbors — if any has `FEATURE_SHELTER`, treat the tile as blocked.

Effects:
- Monsters physically cannot path through the ~9-tile zone around a shelter
- If the agent is adjacent to their shelter, monsters cannot reach them
- Monsters can still wander and hunt elsewhere normally
- The agent walks through the zone freely (only monster AI is affected)
- Shelter safe zone stacks with light avoidance — shelter near a fire creates a large no-go zone

## Warmth Decay Reduction

In `NeedDecaySystem`, when the agent is adjacent to a shelter (`near_shelter` check via adjacency scan), warmth decay is halved:
- Night: 2 → 1 per tick
- Day: 0.5 → 0.25 per tick

This stacks with fire (fire restores warmth via `warm_at_fire`, shelter slows loss). A shelter near a fire is the optimal warmth strategy.

## Goal Selection

### Shelter Goal

**Foresight mode:** Triggers when `cycleTick >= 30` (afternoon, before night) AND no shelter exists on the map. Priority: 45 (below urgent hunger/warmth, above craft axe default).

**Reactive mode:** Triggers when `warmth < 40` AND no shelter exists on the map.

The agent builds at most one shelter per map (goal checks global feature scan, not just adjacency).

### Fishing Integration

No new explicit fishing goal needed. The existing `eat` goal (state: `hunger: 100`) naturally discovers the fishing chain through GOAP planning when:
- Agent has a fishing pole → planner finds catch → cook → eat_cooked_fish path
- Agent doesn't have a pole but has materials → planner includes craft_fishing_pole

The planner's cost optimization prefers cooked fish (+60) over berries (+30) when the prerequisites are already met, because fewer total actions are needed to reach `hunger: 100`.

## Execution Details

### `build_shelter` Execution

Same pattern as `build_fire`: scan adjacent tiles for clear walkable grass, place `FEATURE_SHELTER`, deduct 4 wood + 2 sticks, queue wait action with energyCost 150.

### `catch_fish` Execution

Scan adjacent tiles for `TERRAIN_WATER`. If found, set `inventory.hasRawFish = true`, queue wait action with energyCost 100. Water is infinite (no feature consumed).

### `cook_fish` Execution

Scan adjacent tiles for `FEATURE_FIRE`. If found, set `inventory.hasCookedFish = true`, set `inventory.hasRawFish = false`, queue wait action with energyCost 50.

### `move_to_water` Execution

Added to `MOVE_TARGETS` array. In `executeMoveToAction`, target type `"water"` checks terrain type instead of feature type. Since water tiles are Wall tiles (impassable), the agent paths to a walkable neighbor — same adjacency arrival pattern used for rocks.

### `move_to_shelter` Execution

Added to `MOVE_TARGETS` array. Shelter is a walkable feature, so agent paths directly onto it or adjacent. Arrival when adjacent to shelter tile.

## Rendering

- `FEATURE_SHELTER` glyph `H`, color `[180, 140, 100]`
- New `GOAL_COLORS` entry: `shelter: [180, 140, 100]` (tan)
- New `GOAL_COLORS` entry: `"craft fishing pole": [100, 200, 100]` (green, same as other crafting)
- Panel inventory section extended to show: `Pole: YES/no`, `Fish: raw/cooked/no`
