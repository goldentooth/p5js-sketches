// FishbowlAISystem — RPS predation AI for zero-player fishbowl
//
// State machine per monster:
//   Wandering — pick random floor tile, pathfind there, pick new on arrival
//   Hunting   — prey visible in FOV, pathfind toward nearest prey
//   Fleeing   — predator visible in FOV, move away from nearest predator
//
// RPS rules:
//   Goblin hunts Troll, flees Orc
//   Orc hunts Goblin, flees Troll
//   Troll hunts Orc, flees Goblin

// ─── RPS Predation Table ────────────────────────────────────────────────────
const PREDATION = {
  Goblin: { hunts: "Troll", flees: "Orc" },
  Orc: { hunts: "Goblin", flees: "Troll" },
  Troll: { hunts: "Orc", flees: "Goblin" },
};

// ─── FishbowlAISystem ──────────────────────────────────────────────────────
var FishbowlAISystem = class {
  constructor(map, options = {}) {
    this.phase = "early";
    this.map = map;
    this.rng = options.rng || null;
    this.defaultActionCost = options.defaultActionCost || 100;
    // Map of entity -> {x, y} wander destination
    this.destinations = new Map();
  }

  run(world) {
    const clock = world.getResource("GameClock");
    if (clock && clock.paused) return;

    const blockedPositions = this.getBlockedPositions(world);

    for (const entity of world.query(["AIControlled", "Position", "Energy"])) {
      // Skip entities that already have a queued action
      if (world.getComponent(entity, "Action")) continue;

      const pos = world.getComponent(entity, "Position");
      const name = world.getComponent(entity, "Name");
      if (!pos || !name) continue;

      const rules = PREDATION[name.name];
      if (!rules) {
        this.doWander(world, entity, pos, blockedPositions);
        continue;
      }

      // Scan visible monsters for prey and predators
      const { nearestPrey, nearestPredator } = this.scanVisible(
        world,
        entity,
        pos,
        rules
      );

      // Priority: flee > hunt > wander
      if (nearestPredator) {
        this.doFlee(world, entity, pos, nearestPredator, blockedPositions);
      } else if (nearestPrey) {
        this.doHunt(world, entity, pos, nearestPrey, blockedPositions);
      } else {
        this.doWander(world, entity, pos, blockedPositions);
      }
    }
  }

  scanVisible(world, entity, pos, rules) {
    let nearestPrey = null;
    let nearestPreyDist = Infinity;
    let nearestPredator = null;
    let nearestPredatorDist = Infinity;

    for (const other of world.query(["AIControlled", "Position", "Name"])) {
      if (other === entity) continue;

      const otherPos = world.getComponent(other, "Position");
      const otherName = world.getComponent(other, "Name");
      if (!otherPos || !otherName) continue;

      // Check if this entity can see the other
      if (!Nuglib.isVisible(world, entity, otherPos.x, otherPos.y)) continue;

      const dist = Nuglib.distance(pos.x, pos.y, otherPos.x, otherPos.y);

      if (otherName.name === rules.hunts && dist < nearestPreyDist) {
        nearestPrey = { entity: other, pos: otherPos };
        nearestPreyDist = dist;
      }

      if (otherName.name === rules.flees && dist < nearestPredatorDist) {
        nearestPredator = { entity: other, pos: otherPos };
        nearestPredatorDist = dist;
      }
    }

    return { nearestPrey, nearestPredator };
  }

  doFlee(world, entity, pos, predator, blockedPositions) {
    // Clear any wander destination
    this.destinations.delete(entity);

    // Move in the opposite direction from the predator
    const dx = pos.x - predator.pos.x;
    const dy = pos.y - predator.pos.y;

    // Normalize to cardinal direction
    const fleeDir = { dx: Math.sign(dx), dy: Math.sign(dy) };

    // If fleeing direction is (0,0), pick random
    if (fleeDir.dx === 0 && fleeDir.dy === 0) {
      this.queueRandomMove(world, entity);
      return;
    }

    // Try to move in flee direction; if blocked, try a random direction
    const targetX = pos.x + fleeDir.dx;
    const targetY = pos.y + fleeDir.dy;
    const key = targetX + "," + targetY;

    if (
      this.map.isInBounds(targetX, targetY) &&
      !this.map.blocksMovement(targetX, targetY) &&
      !blockedPositions.has(key)
    ) {
      this.queueMove(world, entity, fleeDir);
    } else {
      this.queueRandomMove(world, entity);
    }
  }

  doHunt(world, entity, pos, prey, blockedPositions) {
    // Clear wander destination
    this.destinations.delete(entity);

    // If adjacent, attack
    if (Nuglib.isAdjacent(pos.x, pos.y, prey.pos.x, prey.pos.y)) {
      this.queueAttack(world, entity, prey.entity);
      return;
    }

    // Pathfind toward prey
    const direction = Nuglib.getStepToward(
      this.map,
      pos.x,
      pos.y,
      prey.pos.x,
      prey.pos.y,
      {
        isBlocked: (x, y) => {
          if (x === pos.x && y === pos.y) return false;
          if (x === prey.pos.x && y === prey.pos.y) return false;
          return blockedPositions.has(x + "," + y);
        },
      }
    );

    if (direction) {
      this.queueMove(world, entity, direction);
    } else {
      this.queueRandomMove(world, entity);
    }
  }

  doWander(world, entity, pos, blockedPositions) {
    // Check if we've reached our destination or don't have one
    let dest = this.destinations.get(entity);

    if (!dest || (pos.x === dest.x && pos.y === dest.y)) {
      dest = this.pickRandomFloorTile();
      if (!dest) {
        this.queueRandomMove(world, entity);
        return;
      }
      this.destinations.set(entity, dest);
    }

    // Pathfind toward destination
    const direction = Nuglib.getStepToward(
      this.map,
      pos.x,
      pos.y,
      dest.x,
      dest.y,
      {
        isBlocked: (x, y) => {
          if (x === pos.x && y === pos.y) return false;
          return blockedPositions.has(x + "," + y);
        },
      }
    );

    if (direction) {
      this.queueMove(world, entity, direction);
    } else {
      // Can't reach destination, pick a new one next tick
      this.destinations.delete(entity);
      this.queueRandomMove(world, entity);
    }
  }

  pickRandomFloorTile() {
    // Try up to 50 times to find a walkable tile
    for (let i = 0; i < 50; i++) {
      const x = this.rng
        ? this.rng.nextRange(0, this.map.width)
        : Math.floor(Math.random() * this.map.width);
      const y = this.rng
        ? this.rng.nextRange(0, this.map.height)
        : Math.floor(Math.random() * this.map.height);
      if (!this.map.blocksMovement(x, y)) {
        return { x, y };
      }
    }
    return null;
  }

  getBlockedPositions(world) {
    const blocked = new Set();
    for (const entity of world.query(["Position", "BlocksMovement"])) {
      const pos = world.getComponent(entity, "Position");
      if (pos) {
        blocked.add(pos.x + "," + pos.y);
      }
    }
    return blocked;
  }

  queueMove(world, entity, direction) {
    world.addComponent(entity, "Action", {
      type: "move",
      direction,
      energyCost: this.getMoveCost(world, entity),
    });
  }

  queueAttack(world, entity, target) {
    world.addComponent(entity, "Action", {
      type: "melee_attack",
      target,
      energyCost: this.getAttackCost(world, entity),
    });
  }

  queueRandomMove(world, entity) {
    const direction = Nuglib.randomCardinalDirection(this.rng);
    world.addComponent(entity, "Action", {
      type: "move",
      direction,
      energyCost: this.getMoveCost(world, entity),
    });
  }

  getMoveCost(world, entity) {
    const energy = world.getComponent(entity, "Energy");
    return energy && energy.moveCost ? energy.moveCost : this.defaultActionCost;
  }

  getAttackCost(world, entity) {
    const energy = world.getComponent(entity, "Energy");
    return energy && energy.attackCost
      ? energy.attackCost
      : this.defaultActionCost;
  }

  // Call when map regenerates or entity dies to clean up stale destinations
  clearDestination(entity) {
    this.destinations.delete(entity);
  }

  clearAllDestinations() {
    this.destinations.clear();
  }
};
