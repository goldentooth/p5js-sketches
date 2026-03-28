# Pathfinding Fishbowl — Design Spec

## Overview

A zero-player roguelike fishbowl where monsters roam a procedurally generated dungeon, hunting and fleeing each other based on rock-paper-scissors predation rules. The viewer watches emergent ecosystem dynamics unfold — population ebbs and flows as predator-prey relationships play out. Dead monsters respawn to maintain a target population.

This sketch demonstrates nuglib's ECS, pathfinding, map generation, and FOV systems working together in an autonomous simulation.

## AI Behavior

### State Machine

Each monster has three AI states:

- **Wandering** — No prey or predator visible. Pick a random walkable tile as a destination, pathfind there. On arrival, pick a new destination.
- **Hunting** — Prey visible in FOV. Pathfind toward nearest prey. Attack if adjacent.
- **Fleeing** — Predator visible in FOV. Move away from nearest predator (pathfind toward a tile that increases distance).

**Priority:** Fleeing overrides hunting. A monster that sees both prey and a predator will flee.

### Rock-Paper-Scissors Predation

| Monster | Hunts | Flees From |
|---------|-------|------------|
| Goblin (green `g`) | Trolls | Orcs |
| Orc (orange `o`) | Goblins | Trolls |
| Troll (red `T`) | Orcs | Goblins |

No type dominates — the circular predation creates self-balancing population dynamics.

### Combat

Uses the existing CombatStats and ActionExecutionSystem. Combat is lethal — dead monsters are removed from the world. Damage calculation follows the existing formula (attacker.attack - defender.defense, minimum 0).

### Respawning

Each tick, if the current population is below the target (set by the population slider), one new monster spawns in a random room. Monster type is chosen randomly (equal probability). One spawn per tick maximum to avoid clumps.

## Map

Procedurally generated using `generateRoomsAndCorridors()` (40x25, 6 rooms max, 5-12 tile size). "Regenerate Map" button creates a fresh dungeon and respawns all monsters at the target population.

## Rendering

God view — no fog of war on the camera. All tiles and monsters are always visible. The FOV system still runs under the hood so monsters only react to what they can see, but the viewer sees everything.

Roguelike glyph rendering: walls as `#`, floors as `·`, monsters with their template glyphs and colors. Same tile size as the monsters sketch (16x24px). Uses LayerManager and grid rendering from nuglib.

## ECS Setup

Systems in execution order:

1. **FishbowlAISystem** (sketch-local, new) — Handles wandering/hunting/fleeing with RPS rules. Replaces the existing AISystem. Lives in the sketch's `ai.js`, not in nuglib.
2. **EnergyRegenerationSystem** (existing) — Ticks the game clock and regenerates entity energy.
3. **ActionExecutionSystem** (existing) — Executes queued actions when entities have sufficient energy.
4. **MovementSystem** (existing) — Validates and applies movement.
5. **ViewshedSystem** (existing) — Recalculates FOV for dirty viewsheds.

No AwaitingInputSystem — the clock never pauses. No player entity.

## Controls

Hugo frontmatter controls pattern (below the canvas):

- **Population slider** (5-40, default 20) — Target monster count. Respawner maintains this number.
- **Speed slider** (1-30, default 10) — Ticks per second.
- **Play / Pause / Step** buttons — Standard playback controls.
- **Regenerate Map** button — New dungeon, respawn all monsters at target population.

## Stats

Live readout in the controls area (monospace):

- Per-type counts: Goblins: N | Orcs: N | Trolls: N
- Total: N / target
- Kills: N (running total since last map reset)

## File Structure

```
content/pathfinding-fishbowl/
  index.md    — Hugo frontmatter (title, description, controls, technical_details, scripts)
  ai.js       — FishbowlAISystem class (RPS rules, wandering/hunting/fleeing)
  main.js     — Setup, draw loop, ECS wiring, rendering, controls, respawning
```

Scripts loaded in order: `ai.js` then `main.js`.
