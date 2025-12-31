// Glyph palette for the map
const palette = new Nuglib.GlyphPalette();
palette.registerGlyph('wall', '#', [128, 128, 128], [0, 0, 0]);
palette.registerGlyph('floor', '.', [64, 64, 64], [0, 0, 0]);
palette.registerGlyph('player', '@', [255, 255, 255], [0, 0, 0]);

let map;
let grid;
let gridRenderer;
let layerManager;
let rooms;
let rng;
let world;
let playerEntity;
let keyRepeat;
let gameOver = false;
let gameWon = false;

// Systems
let awaitingInputSystem;
let aiSystem;
let energyRegenSystem;
let actionExecutionSystem;
let movementSystem;
let viewshedSystem;

// Settings
const fovRange = 10;
const charHeight = 24;
const charWidth = 16;
const cols = 40;
const rows = 25;

// Debug visualization
let showMonsterViewsheds = false;

// Message log
const messageLog = [];
const maxMessages = 4;

// Visual effects
const entityFlashes = new Map(); // entity -> { color, endTime }
const flashDuration = 150; // ms

// Use default key mapper (supports arrows, WASD, vi, and numpad)
const mapKeyToDirection = Nuglib.defaultKeyMapper;

function initGame() {
  gameOver = false;
  gameWon = false;
  messageLog.length = 0;
  entityFlashes.clear();
  renderMessageLog();

  // Create RNG with seed
  const seed = BigInt(Date.now());
  rng = Nuglib.xoroshiro128plus(seed);

  // Create a map with blocking edges
  map = Nuglib.createMap(cols, rows, { edgeBehavior: 'block' });

  // Generate rooms and corridors procedurally
  rooms = Nuglib.generateRoomsAndCorridors(map, rng, {
    maxRooms: 6,
    minRoomSize: 5,
    maxRoomSize: 12,
  });

  console.log(`Generated ${rooms.length} rooms`);

  // Create ECS world
  world = Nuglib.createWorld();

  // Add GameClock resource
  world.addResource('GameClock', Nuglib.createGameClock());

  // Create systems (order matters!)
  awaitingInputSystem = new Nuglib.AwaitingInputSystem();
  aiSystem = new Nuglib.AISystem(map, { rng });
  energyRegenSystem = new Nuglib.EnergyRegenerationSystem();
  movementSystem = new Nuglib.MovementSystem(map);
  actionExecutionSystem = new Nuglib.ActionExecutionSystem(movementSystem);
  viewshedSystem = new Nuglib.ViewshedSystem(map);

  // Add systems in correct phase order
  world.addSystem(awaitingInputSystem);   // early - pauses for player input
  world.addSystem(aiSystem);              // early - AI decides actions
  world.addSystem(energyRegenSystem);     // early - regenerate energy
  world.addSystem(actionExecutionSystem); // update - execute actions
  world.addSystem(movementSystem);        // update - movement logic
  world.addSystem(viewshedSystem);        // late - recalculate FOV

  // Create player entity at first room's center
  const startRoom = rooms[0];
  const startPos = startRoom.center();

  playerEntity = Nuglib.createPlayer(world, startPos.x, startPos.y, {
    maxHp: 15,
    attack: 4,
    defense: 1,
    fovRange: fovRange,
  });

  // Add player's glyph from palette
  world.removeComponent(playerEntity, 'Glyph');
  world.addComponent(playerEntity, 'Glyph', palette.get('player'));

  // Spawn monsters in other rooms
  const monsters = Nuglib.spawnMonstersInRooms(world, {
    rooms,
    excludeRoomIndex: 0, // Don't spawn in player's starting room
    monstersPerRoom: 1,
    templates: [
      Nuglib.MonsterTemplates.goblin,
      Nuglib.MonsterTemplates.goblin,
      Nuglib.MonsterTemplates.orc,
      Nuglib.MonsterTemplates.troll,
    ],
    rng,
  });

  console.log(`Spawned ${monsters.length} monsters`);

  // Sync map to grid for rendering
  syncMapToGrid();
  updateUI();
}

function syncMapToGrid() {
  // Use library utility for fog of war rendering
  Nuglib.syncMapToGridWithFov({
    grid,
    map,
    palette,
    world,
    viewerEntity: playerEntity,
    fovEnabled: true,
    tileGlyphs: new Map([
      [Nuglib.Tiles.Wall, 'wall'],
      [Nuglib.Tiles.Floor, 'floor']
    ])
  });
}

function setup() {
  const gridDims = Nuglib.calculateGridDimensions(
    charWidth * cols,
    charHeight * rows,
    charWidth,
    charHeight
  );

  createCanvas(gridDims.adjustedWidth, gridDims.adjustedHeight);
  background(0);

  // Create grid
  grid = Nuglib.createGrid(cols, rows);

  // Create grid renderer
  gridRenderer = Nuglib.GridRenderer({
    cellHeight: charHeight,
    cellWidth: charWidth,
    backgroundColor: color(0),
  });

  // Create layer manager
  layerManager = new Nuglib.LayerManager(window);
  layerManager.createLayer('grid', Nuglib.createTextLayerConfig(
    width,
    height,
    24,
    'Courier New'
  ));

  // Initialize key repeat handler
  keyRepeat = new Nuglib.KeyRepeatHandler({
    initialDelay: 20,
    repeatDelay: 6
  });

  // Initialize game
  initGame();

  // Bind UI controls
  bindControls();

  // Prevent scroll on movement keys
  Nuglib.preventMovementKeyScroll(mapKeyToDirection);
}

function bindControls() {
  const regenerateBtn = document.getElementById('regenerate-btn');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', () => {
      initGame();
    });
  }

  const viewshedCheckbox = document.getElementById('show-viewsheds-checkbox');
  if (viewshedCheckbox) {
    viewshedCheckbox.addEventListener('change', (e) => {
      showMonsterViewsheds = e.target.checked;
    });
  }
}

function updateUI() {
  if (!world || !playerEntity) return;

  // Check win condition
  const monsters = Array.from(world.query(['AIControlled']));
  if (monsters.length === 0 && !gameWon && !gameOver) {
    gameWon = true;
    addMessage('Victory! All monsters defeated!');
  }
}

function addMessage(msg) {
  if (!msg) return;
  messageLog.push(msg);
  if (messageLog.length > maxMessages) {
    messageLog.shift();
  }
  renderMessageLog();
}

function renderMessageLog() {
  const msgEl = document.getElementById('game-message');
  if (msgEl) {
    msgEl.innerHTML = messageLog
      .map((msg, i) => {
        // Fade older messages
        const opacity = 0.4 + (0.6 * (i + 1) / messageLog.length);
        return `<div style="opacity: ${opacity}">${msg}</div>`;
      })
      .join('');
  }
}

function renderMonsterViewsheds() {
  if (!showMonsterViewsheds || !world || !playerEntity) return;

  // Get player's viewshed to check monster visibility
  const playerViewshed = world.getComponent(playerEntity, 'Viewshed');
  if (!playerViewshed || !playerViewshed.visibleCells) return;

  // Get all AI-controlled entities with viewsheds
  const monsters = Array.from(world.query(['AIControlled', 'Position', 'Viewshed', 'Glyph']));

  for (const monster of monsters) {
    const pos = world.getComponent(monster, 'Position');
    if (!pos) continue;

    // Only show viewshed if monster is visible to player
    const monsterKey = `${pos.x},${pos.y}`;
    if (!playerViewshed.visibleCells.has(monsterKey)) continue;

    const viewshed = world.getComponent(monster, 'Viewshed');
    if (!viewshed || !viewshed.visibleCells) continue;

    // Use the monster's glyph color
    const glyph = world.getComponent(monster, 'Glyph');
    if (!glyph || !glyph.fg) continue;

    const [r, g, b] = glyph.fg;

    // Draw semi-transparent overlay for cells visible to both monster and player
    noStroke();
    fill(r, g, b, 30); // Low alpha for subtle tint

    for (const cellKey of viewshed.visibleCells) {
      // Only draw cells the player can also see
      if (!playerViewshed.visibleCells.has(cellKey)) continue;

      const [cx, cy] = cellKey.split(',').map(Number);
      const screenX = cx * charWidth;
      const screenY = cy * charHeight;
      rect(screenX, screenY, charWidth, charHeight);
    }
  }
}

function renderEntityFlashes() {
  if (!world || !playerEntity) return;

  const now = millis();
  const playerViewshed = world.getComponent(playerEntity, 'Viewshed');

  for (const [entity, flash] of entityFlashes) {
    // Remove expired flashes
    if (now > flash.endTime) {
      entityFlashes.delete(entity);
      continue;
    }

    const pos = world.getComponent(entity, 'Position');
    if (!pos) continue;

    // Only show flash for visible entities
    if (playerViewshed && !playerViewshed.visibleCells.has(`${pos.x},${pos.y}`)) continue;

    const screenX = pos.x * charWidth;
    const screenY = pos.y * charHeight;

    // Fade out the flash
    const remaining = flash.endTime - now;
    const alpha = (remaining / flashDuration) * 150;

    noStroke();
    fill(flash.color[0], flash.color[1], flash.color[2], alpha);
    rect(screenX, screenY, charWidth, charHeight);
  }
}

function renderDeathOverlay() {
  if (!gameOver) return;

  // Pulsing red overlay
  const pulse = (sin(millis() / 200) + 1) / 2; // 0 to 1
  const alpha = 30 + pulse * 40;

  noStroke();
  fill(100, 0, 0, alpha);
  rect(0, 0, width, height);

  // Dark vignette
  fill(0, 0, 0, 100);
  rect(0, 0, width, height);

  // "YOU DIED" text
  fill(200, 0, 0);
  textAlign(CENTER, CENTER);
  textSize(48);
  textFont('Courier New');
  text('YOU DIED', width / 2, height / 2);
}

function renderHealthBars() {
  if (!world || !playerEntity) return;

  // Get player's viewshed to check visibility
  const playerViewshed = world.getComponent(playerEntity, 'Viewshed');
  if (!playerViewshed || !playerViewshed.visibleCells) return;

  // Query all entities with position and combat stats
  const entities = world.query(['Position', 'CombatStats']);

  const barHeight = 2;
  const barPadding = 2; // Pixels above the cell

  for (const entity of entities) {
    const pos = world.getComponent(entity, 'Position');
    const stats = world.getComponent(entity, 'CombatStats');
    if (!pos || !stats) continue;

    // Only show health bars for visible entities
    const cellKey = `${pos.x},${pos.y}`;
    if (!playerViewshed.visibleCells.has(cellKey)) continue;

    const screenX = pos.x * charWidth;
    const screenY = pos.y * charHeight;

    // Calculate bar width based on HP percentage
    const hpPercent = stats.hp / stats.maxHp;
    const barWidth = Math.floor(charWidth * hpPercent);

    // Choose color based on health
    let barColor;
    if (hpPercent > 0.5) {
      barColor = color(0, 200, 0); // Green
    } else if (hpPercent > 0.25) {
      barColor = color(200, 200, 0); // Yellow
    } else {
      barColor = color(200, 0, 0); // Red
    }

    // Draw background (dark)
    noStroke();
    fill(40, 40, 40);
    rect(screenX, screenY - barHeight - barPadding, charWidth, barHeight);

    // Draw health bar
    fill(barColor);
    rect(screenX, screenY - barHeight - barPadding, barWidth, barHeight);
  }
}

function handlePlayerInput(direction) {
  if (!playerEntity || !world || gameOver) return;

  const pos = world.getComponent(playerEntity, 'Position');
  if (!pos) return;

  const targetX = pos.x + direction.dx;
  const targetY = pos.y + direction.dy;

  // Look for entity at target position with CombatStats (attackable)
  let targetEntity = null;
  for (const entity of world.query(['Position', 'CombatStats'])) {
    if (entity === playerEntity) continue;
    const otherPos = world.getComponent(entity, 'Position');
    if (otherPos && otherPos.x === targetX && otherPos.y === targetY) {
      targetEntity = entity;
      break;
    }
  }

  if (targetEntity !== null) {
    // Queue attack action - messages shown after tick based on actual results
    world.addComponent(playerEntity, 'Action', {
      type: 'melee_attack',
      target: targetEntity,
      energyCost: 100
    });
  } else {
    // Queue move action
    world.addComponent(playerEntity, 'Action', {
      type: 'move',
      direction: direction,
      energyCost: 100
    });
  }
}

function checkPlayerDeath() {
  if (!world || !playerEntity || gameOver) return;

  const stats = world.getComponent(playerEntity, 'CombatStats');
  if (!stats || stats.hp <= 0) {
    gameOver = true;
    addMessage('You died! Press "New Game" to try again.');
  }
}

function draw() {
  background(0);

  // Process held keys for continuous movement
  if (movementSystem && playerEntity && keyRepeat && !gameOver) {
    const repeatingKeys = keyRepeat.update();
    for (const { key, keyCode } of repeatingKeys) {
      const direction = mapKeyToDirection(key, keyCode);
      if (direction) {
        handlePlayerInput(direction);
        break; // Only process one direction per frame
      }
    }
  }

  // Track all combatants' HP before tick
  let playerHpBefore = null;
  const monsterHpBefore = new Map(); // entity -> { name, hp, wasAdjacent }
  if (world && playerEntity && !gameOver) {
    const stats = world.getComponent(playerEntity, 'CombatStats');
    if (stats) playerHpBefore = stats.hp;

    const playerPos = world.getComponent(playerEntity, 'Position');

    // Record all monsters and their HP, and whether they're adjacent
    for (const monster of world.query(['AIControlled', 'Position', 'Name', 'CombatStats'])) {
      const monsterStats = world.getComponent(monster, 'CombatStats');
      const monsterName = world.getComponent(monster, 'Name');
      const monsterPos = world.getComponent(monster, 'Position');
      if (monsterStats && monsterName && monsterStats.hp > 0) {
        let wasAdjacent = false;
        if (playerPos && monsterPos) {
          const dx = Math.abs(monsterPos.x - playerPos.x);
          const dy = Math.abs(monsterPos.y - playerPos.y);
          wasAdjacent = dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
        }
        monsterHpBefore.set(monster, { name: monsterName.name, hp: monsterStats.hp, wasAdjacent });
      }
    }
  }

  // Update world systems
  if (world && !gameOver) {
    world.tick();
  }

  // Check what happened during the tick and show messages
  if (world && playerEntity && playerHpBefore !== null) {
    // Check for player attacks (monster HP decreased or monster died)
    for (const [monster, data] of monsterHpBefore) {
      const monsterStats = world.getComponent(monster, 'CombatStats');
      if (!monsterStats) {
        // Monster was destroyed - we killed it
        addMessage(`You killed the ${data.name}!`);
      } else if (monsterStats.hp < data.hp) {
        // Monster took damage
        const damage = data.hp - monsterStats.hp;
        addMessage(`You hit the ${data.name} for ${damage} damage!`);
        entityFlashes.set(monster, { color: [255, 255, 255], endTime: millis() + flashDuration });
      }
    }

    // Check for monster attacks (player HP decreased)
    const playerStats = world.getComponent(playerEntity, 'CombatStats');
    if (playerStats && playerStats.hp < playerHpBefore) {
      const damage = playerHpBefore - playerStats.hp;
      // Find which monster that was adjacent BEFORE the tick is still alive
      for (const [monster, data] of monsterHpBefore) {
        if (!data.wasAdjacent) continue; // Only monsters that were adjacent could attack
        const monsterStats = world.getComponent(monster, 'CombatStats');
        // Only attribute to monsters that are still alive
        if (monsterStats && monsterStats.hp > 0) {
          addMessage(`The ${data.name} hits you for ${damage} damage!`);
          entityFlashes.set(playerEntity, { color: [255, 0, 0], endTime: millis() + flashDuration });
          break;
        }
      }
    }
  }

  // Check for player death after tick
  checkPlayerDeath();

  // Only render if everything is initialized
  if (!grid || !world || !layerManager) {
    return;
  }

  // Sync map to grid
  syncMapToGrid();

  // Render entities with fog of war filtering
  Nuglib.renderEntitiesWithFov(grid, world, playerEntity, true);

  // Render the grid using layer manager
  const gridLayer = layerManager.requireLayer('grid');
  gridRenderer.draw(grid, window, gridLayer);
  layerManager.render();

  // Render monster viewshed overlays (if enabled)
  renderMonsterViewsheds();

  // Render entity flash effects
  renderEntityFlashes();

  // Render health bars above creatures
  renderHealthBars();

  // Render death overlay if game over
  renderDeathOverlay();

  // Update UI
  updateUI();
}

function handleWaitAction() {
  if (!playerEntity || !world || gameOver) return;

  // Queue wait action (skip turn)
  world.addComponent(playerEntity, 'Action', {
    type: 'wait',
    energyCost: 100
  });
}

function keyPressed() {
  if (gameOver) return false;

  // Wait/skip turn with space or period
  if (key === ' ' || key === '.') {
    handleWaitAction();
    return false;
  }

  const direction = mapKeyToDirection(key, keyCode);

  if (direction && playerEntity && keyRepeat) {
    // Track key for repeat
    keyRepeat.onKeyPressed(key, keyCode);

    // Queue immediate movement on first press
    handlePlayerInput(direction);

    return false; // Prevent default browser behavior
  }
}

function keyReleased() {
  const direction = mapKeyToDirection(key, keyCode);

  if (direction && keyRepeat) {
    keyRepeat.onKeyReleased(key, keyCode);
  }

  return false;
}
