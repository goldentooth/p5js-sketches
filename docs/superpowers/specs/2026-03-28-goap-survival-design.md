# GOAP Survival — Design Spec

## Overview

An educational single-agent survival sketch demonstrating Goal-Oriented Action Planning. A lone survivor navigates a procedurally generated wilderness, managing hunger, warmth, and health across a day/night cycle with full light simulation. The viewer watches the GOAP planner reason through multi-step action chains (gather sticks → craft axe → chop tree → build fire) via a real-time plan inspector panel.

The key educational feature is a **foresight toggle** that switches between proactive planning (agent anticipates future needs) and reactive planning (agent only responds to current conditions), letting the viewer see the difference GOAP makes over simple state machines.

This is the first of three planned GOAP sketches (educational → interactive → fishbowl). The GOAP planner lives in nuglib; scenario logic is sketch-local.

## GOAP Planner (nuglib — `src/goap/`)

A generic, domain-agnostic planning engine. It knows nothing about survival — it operates on abstract world states, actions, and goals.

### World State

A key-value map (`Map<string, number | boolean>`) representing facts about the world. The planner compares states, computes deltas, and checks preconditions against them.

### Action Definition

Each action has:
- **name** — identifier string (e.g. `"chop_tree"`)
- **preconditions** — world state entries that must be true/met to attempt this action
- **effects** — world state changes that result from completing this action. Numeric effects use relative deltas (e.g. `{ wood_count: "+2" }`)
- **cost** — numeric cost for A* search (default 1)

### Goal

A partial world state the agent wants to achieve (e.g. `{ hunger: 100 }` or `{ has_axe: true }`).

### Planning Algorithm

Regressive A* search (standard GOAP):
1. Start from the goal state
2. Find actions whose effects satisfy unsatisfied goal conditions
3. Add that action's preconditions as new sub-goals
4. Repeat until all preconditions are met by the current world state
5. Return the action sequence (reversed) as the plan
6. Return null if no valid plan exists

### Replanning Triggers

The planner runs when:
- The agent has no plan
- The current plan step's preconditions become invalid
- The current goal is achieved and a new one is needed
- A threat becomes visible (interrupt for flee)

### Exported API

- `GoapState` — `Map<string, number | boolean>` type
- `GoapAction` — `{ name, preconditions, effects, cost }` type
- `GoapGoal` — `{ state: GoapState, priority: number }` type
- `GoapPlan` — `{ actions: GoapAction[], goal: GoapGoal }` type
- `createPlanner(actions: GoapAction[])` — register available actions, returns a planner instance
- `plan(planner, currentState: GoapState, goal: GoapGoal)` — returns a `GoapPlan` or null
- `validatePlan(planner, currentState: GoapState, plan: GoapPlan)` — checks if plan is still valid given current state

### Files

- `src/goap/types.ts` — Type definitions
- `src/goap/planner.ts` — Regressive A* planner implementation
- `src/goap/index.ts` — Re-exports

## Agent Needs

Three numeric values that decay over time:

| Need | Range | Decay Rate | Critical At | Death At |
|------|-------|------------|-------------|----------|
| Hunger | 0–100 | −1/tick | 25 | 0 |
| Warmth | 0–100 | −0.5/tick (day), −2/tick (night) | 25 | 0 |
| Health | 0–100 | No natural decay (only monster attacks) | 25 | 0 |

When any need hits 0, the agent dies. Death triggers a full world restart (new map, fresh agent). A death counter persists across restarts.

## World State Keys

The flat key-value snapshot the planner operates on:

```
hunger, warmth, health              — current need values (number)
has_axe, has_torch, has_food        — inventory booleans
wood_count, stick_count, stone_count — inventory quantities (number)
near_tree, near_rock, near_water,
  near_berries, near_sticks,
  near_fire, near_clear             — adjacency booleans (computed each tick by scanning adjacent tiles)
                                      near_clear is true when an adjacent grass tile has no feature on it
is_night                            — time of day (boolean)
threat_visible                      — monster in FOV (boolean)
```

Proximity booleans are computed each tick by scanning tiles adjacent to the agent's position. This keeps the planner's state flat — no pathfinding inside the planner.

## Goal Selection

A utility function scores candidate goals based on current needs and picks the highest priority:

| Condition | Goal | Priority |
|-----------|------|----------|
| `threat_visible` | `{ threat_visible: false }` | 100 (always highest) |
| `hunger < 50` | `{ hunger: 100 }` | `100 - hunger` |
| `warmth < 50` | `{ warmth: 100 }` | `100 - warmth` |
| `is_night && !has_torch` | `{ has_torch: true }` | 60 |
| Default | `{ has_axe: true }` or `{ wood_count: "+1" }` | 20 (proactive prep) |

### Foresight Toggle

- **Proactive mode** (default): The agent also considers future states. "Night is approaching in 20 ticks" triggers torch/fire goals early. "Hunger will be critical in 30 ticks" triggers foraging before it's urgent.
- **Reactive mode**: The agent only responds to current conditions. Goals only fire when thresholds are already crossed.

The toggle is a control below the canvas. Switching modes triggers an immediate replan.

## Actions

| Action | Preconditions | Effects | Cost |
|--------|---------------|---------|------|
| `gather_stick` | `near_sticks: true` | `stick_count: +1` | 1 |
| `gather_stone` | `near_rock: true` | `stone_count: +1` | 1 |
| `gather_berries` | `near_berries: true` | `has_food: true` | 1 |
| `eat_food` | `has_food: true` | `hunger: +30, has_food: false` | 1 |
| `craft_axe` | `stick_count: ≥1, stone_count: ≥1` | `has_axe: true, stick_count: −1, stone_count: −1` | 2 |
| `craft_torch` | `stick_count: ≥1, wood_count: ≥1` | `has_torch: true, stick_count: −1, wood_count: −1` | 2 |
| `chop_tree` | `has_axe: true, near_tree: true` | `wood_count: +2` | 3 |
| `build_fire` | `wood_count: ≥2, near_clear: true` | `near_fire: true, wood_count: −2` | 3 |
| `warm_at_fire` | `near_fire: true` | `warmth: +40` | 1 |
| `flee` | `threat_visible: true` | `threat_visible: false` | 0 |
| `move_to(target)` | *(none)* | `near_<target>: true` | pathfinding distance |

### Key Action Chains

- **Hungry?** → `move_to(berries)` → `gather_berries` → `eat_food`
- **Cold?** → needs fire → needs wood → needs axe → `move_to(rock)` → `gather_stone` → `move_to(sticks)` → `gather_stick` → `craft_axe` → `move_to(tree)` → `chop_tree` → `build_fire` → `warm_at_fire`
- **Night coming (proactive)?** → craft torch chain before darkness falls

### move_to

`move_to` is a meta-action. The planner treats it as a single action with distance-based cost. The plan execution system translates it into actual pathfinding steps (one tile per tick using `getStepToward`). This keeps the planner's search space manageable — it plans *what* to do, not *how to walk there*.

## Map

### Generation

A custom wilderness generator. The map is open terrain with impassable features creating natural corridors and chokepoints.

- **Size:** 50×30 tiles
- **Terrain:** Grass (walkable), Dense Forest (impassable), Water (impassable), Rock outcrop (impassable, harvestable)
- **Resources:** Trees (walkable, choppable), Berry bushes, Stick piles, Clear ground (for campfires)
- **Algorithm:** Fill with grass, place water bodies and dense forest clusters as obstacles, scatter resources with minimum spacing

### Glyphs & Colors

| Feature | Glyph | Color | Notes |
|---------|-------|-------|-------|
| Grass | `·` | dark green | Walkable |
| Dense forest | `♣` | dark green | Impassable wall |
| Water | `~` | blue | Impassable |
| Tree | `T` | green | Walkable, choppable with axe |
| Berry bush | `b` | purple | Walkable, forageable |
| Stick pile | `/` | brown | Walkable, gatherable |
| Rock outcrop | `^` | gray | Impassable, harvestable from adjacent |
| Campfire | `*` | orange/yellow | Created by agent, emits light+warmth |
| Agent | `@` | varies by goal | See visualization section |
| Zombie | `Z` | dark green | Slow, tough |
| Skeleton | `S` | white | Fast, fragile |

## Day/Night Cycle

120 ticks per full cycle: 60 day, 60 night.

### Light Simulation

- **Sun light level:** Sinusoidal curve, 1.0 at noon → 0.0 at midnight, with smooth dawn/dusk transitions
- **Light sources:** Sun (global), campfires (radius 5, warm orange falloff), torches (radius 3, carried by agent)
- **Per-tile light level:** `max(sunlight, nearestFireLight, torchLight)` where fire/torch light falls off with distance
- **Rendering:** Each tile's color is multiplied by its light level. Unlit night areas go nearly black. Fires create warm glowing islands.
- **FOV interaction:** Agent viewshed range is 8 during day, shrinks to 3 at night unless carrying a torch (stays at 8). Monsters have full night vision (range 6 always).

### Monsters

- Spawn at night only, one every ~10 ticks at a random dark tile (light < 0.2) outside agent FOV
- Despawn at dawn
- **Zombie:** slow (moveCost 150), tough (15 hp, 3 attack, 2 defense)
- **Skeleton:** fast (moveCost 80), fragile (5 hp, 4 attack, 0 defense)
- AI: path toward agent if visible, wander otherwise (reuse simple hunt/wander from fishbowl pattern)
- Monsters avoid tiles with light level > 0.5 (stay in shadows)

## Rendering

### Canvas Layout

- **Left: Map** — 50×30 tiles at 12×18px = 600×540px
- **Right: Plan Inspector** — ~250px wide, rendered as p5.js graphics (not DOM)
- **Total canvas:** ~850×540px

### Plan Inspector Panel

Rendered each frame showing the agent's current GOAP state:

- **Current goal** — name and priority score
- **Plan steps** — completed (✓), current (→), upcoming (indented)
- **Need bars** — hunger, warmth, health as colored bars with numeric values
- **Inventory** — booleans and counts
- **Time** — day/night phase, tick within phase
- **Stats** — alive ticks, death count, replan count

### Agent Glyph Coloring

The `@` glyph color reflects the current goal type:
- Orange = hunger-related
- Blue = warmth-related
- Red = fleeing/safety
- Green = proactive preparation
- White = idle/no plan

## ECS Setup

Systems in execution order:

1. **NeedDecaySystem** (sketch-local, early) — Tick needs down based on time of day, check death condition
2. **GoalSelectionSystem** (sketch-local, early) — Score candidate goals, pick highest priority, trigger replan if goal changed
3. **GoapPlanningSystem** (sketch-local, early) — Run nuglib planner if needed, store plan on entity
4. **PlanExecutionSystem** (sketch-local, early) — Translate current plan step into ECS Action (move, interact, craft)
5. **EnergyRegenerationSystem** (existing nuglib)
6. **ActionExecutionSystem** (existing nuglib)
7. **MovementSystem** (existing nuglib)
8. **MonsterAISystem** (sketch-local, early) — Simple hunt/wander for zombies and skeletons
9. **ViewshedSystem** (existing nuglib)
10. **LightingSystem** (sketch-local, late) — Recalculate per-tile light levels from sun + fires + torch

## Controls

Hugo frontmatter controls (below canvas):

- **Speed slider** (1–30 tps, default 5) — slower default to follow reasoning
- **Play / Pause / Step** — standard playback
- **Foresight toggle** — "Proactive" / "Reactive" button. Switches goal selection mode, triggers immediate replan.
- **Regenerate** — fresh world + agent restart

## Stats

Live readout in controls area:

- Survived: N ticks
- Deaths: N
- Plans made: N
- Current goal + action

## Death & Restart

When any need hits 0, the agent dies. The entire world regenerates (new map, new agent, fresh needs). Death count persists. This is a clean restart — no world state carries over.

## File Structure

### Nuglib additions

```
src/goap/
  types.ts    — GoapState, GoapAction, GoapGoal, GoapPlan type definitions
  planner.ts  — Regressive A* planner: createPlanner(), plan(), validatePlan()
  index.ts    — Re-exports
```

### Sketch files

```
content/goap-survival/
  index.md      — Hugo frontmatter, controls HTML, scripts list
  actions.js    — Survival action definitions (preconditions, effects, costs)
  world-state.js — World state snapshot builder (scans ECS + map proximity)
  needs.js      — NeedDecaySystem, GoalSelectionSystem, foresight logic
  map-gen.js    — Wilderness map generator
  lighting.js   — Day/night cycle, per-tile light calculation, light sources
  rendering.js  — Map rendering with lighting, plan inspector panel, glyph coloring
  main.js       — Setup, draw loop, ECS wiring, controls, MonsterAISystem
```

Scripts loaded in order: `actions.js`, `world-state.js`, `needs.js`, `map-gen.js`, `lighting.js`, `rendering.js`, `main.js`.
