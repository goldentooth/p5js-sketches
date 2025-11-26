// Glyph palette for the map
const palette = new Nuglib.GlyphPalette();
palette.registerGlyph('wall', '#', [128, 128, 128], [0, 0, 0]);
palette.registerGlyph('floor', '.', [64, 64, 64], [0, 0, 0]);
palette.registerGlyph('player', '@', [255, 255, 0], [0, 0, 0]);

// Monster glyphs
palette.registerGlyph('goblin', 'g', [0, 200, 0], [0, 0, 0]);
palette.registerGlyph('orc', 'o', [0, 150, 0], [0, 0, 0]);
palette.registerGlyph('kobold', 'k', [100, 200, 100], [0, 0, 0]);

let map;
let grid;
let gridRenderer;
let layerManager;
let rooms;
let rng;
let world;
let movementSystem;
let viewshedSystem;
let playerEntity;
let keyRepeat;

// FOV settings (simplified - always enabled for combat testing)
const fovEnabled = true;
const fovRange = 10;
const fovAlgorithm = 'shadowcasting';

const charHeight = 24;
const charWidth = 16;
const cols = 50;  // Larger map for combat
const rows = 30;

// Use default key mapper (supports arrows, WASD, vi, and numpad)
const mapKeyToDirection = Nuglib.defaultKeyMapper;

function initMap() {
  // Create RNG with seed
  const seed = BigInt(Date.now());
  rng = Nuglib.xoroshiro128plus(seed);

  // Create a map with blocking edges
  map = Nuglib.createMap(cols, rows, { edgeBehavior: 'block' });

  // Generate rooms and corridors procedurally
  rooms = Nuglib.generateRoomsAndCorridors(map, rng, {
    maxRooms: 8,
    minRoomSize: 5,
    maxRoomSize: 12,
  });

  console.log(`Generated ${rooms.length} rooms`);

  // Create ECS world
  world = Nuglib.createWorld();

  // Add GameClock resource for turn-based timing
  world.addResource('GameClock', Nuglib.createGameClock());

  // Add systems in correct phase order
  // Early phase: Input handling and energy regeneration
  const awaitingInputSystem = new Nuglib.AwaitingInputSystem();
  world.addSystem(awaitingInputSystem);

  const energyRegenSystem = new Nuglib.EnergyRegenerationSystem();
  world.addSystem(energyRegenSystem);

  // Update phase: Movement and FOV
  movementSystem = new Nuglib.MovementSystem(map);
  world.addSystem(movementSystem);

  const actionExecutionSystem = new Nuglib.ActionExecutionSystem(movementSystem);
  world.addSystem(actionExecutionSystem);

  viewshedSystem = new Nuglib.ViewshedSystem(map);
  world.addSystem(viewshedSystem);

  // Create player entity at first room's center
  const startRoom = rooms[0];
  const startPos = startRoom.center();

  playerEntity = world.createEntity();
  world.addComponent(playerEntity, 'Position', { x: startPos.x, y: startPos.y });
  world.addComponent(playerEntity, 'Glyph', palette.get('player'));
  world.addComponent(playerEntity, 'PlayerControlled', {});

  // Add Energy component for turn-based system
  world.addComponent(playerEntity, 'Energy', {
    current: 100,
    max: 100,
    regenRate: 100, // Regenerate full energy each turn for responsive controls
  });

  // Add Speed component (1.0 = normal speed)
  world.addComponent(playerEntity, 'Speed', {
    multiplier: 1.0,
  });

  // Add FOV components
  world.addComponent(playerEntity, 'Viewshed', {
    range: fovRange,
    algorithm: fovAlgorithm,
    visibleCells: new Set(),
    dirty: true
  });
  world.addComponent(playerEntity, 'Memory', {
    exploredCells: new Set()
  });

  // TODO: Spawn monsters in rooms (Stage 10)
  // spawnMonsters();

  // Sync map to grid for rendering
  syncMapToGrid();
}

function syncMapToGrid() {
  // Use library utility for fog of war rendering
  Nuglib.syncMapToGridWithFov({
    grid,
    map,
    palette,
    world,
    viewerEntity: playerEntity,
    fovEnabled,
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
    initialDelay: 20,  // ~333ms before repeat
    repeatDelay: 6     // ~100ms between repeats
  });

  // Initialize map with rooms
  initMap();

  // Bind UI controls
  bindControls();

  // Prevent scroll on movement keys (using library utility)
  Nuglib.preventMovementKeyScroll(mapKeyToDirection);
}

function bindControls() {
  // Regenerate button
  const regenerateBtn = document.getElementById('regenerate-btn');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', () => {
      initMap();
    });
  }
}

function draw() {
  background(0);

  // Process held keys for continuous movement
  if (world && playerEntity && keyRepeat) {
    const repeatingKeys = keyRepeat.update();
    for (const { key, keyCode } of repeatingKeys) {
      const direction = mapKeyToDirection(key, keyCode);
      if (direction) {
        // Check if player already has an action queued
        const existingAction = world.getComponent(playerEntity, 'Action');
        if (!existingAction) {
          // Add Action component for turn-based movement
          world.addComponent(playerEntity, 'Action', {
            type: 'move',
            direction: direction,
            energyCost: 100, // Movement costs 100 energy
          });
        }
        break; // Only process one direction per frame
      }
    }
  }

  // Update world systems
  if (world) {
    world.tick();
  }

  // Only render if everything is initialized
  if (!grid || !world || !layerManager) {
    return;
  }

  // Sync map to grid
  syncMapToGrid();

  // Render entities with fog of war filtering
  Nuglib.renderEntitiesWithFov(grid, world, playerEntity, fovEnabled);

  // Render the grid using layer manager
  const gridLayer = layerManager.requireLayer('grid');
  gridRenderer.draw(grid, window, gridLayer);
  layerManager.render();
}

function keyPressed() {
  // Handle movement keys
  const direction = mapKeyToDirection(key, keyCode);

  if (direction && world && playerEntity && keyRepeat) {
    // Track key for repeat
    keyRepeat.onKeyPressed(key, keyCode);

    // Check if player already has an action queued
    const existingAction = world.getComponent(playerEntity, 'Action');
    if (!existingAction) {
      // Add Action component for turn-based movement
      world.addComponent(playerEntity, 'Action', {
        type: 'move',
        direction: direction,
        energyCost: 100,
      });
    }

    return false; // Prevent default browser behavior (scrolling, etc.)
  }
}

function keyReleased() {
  const direction = mapKeyToDirection(key, keyCode);

  if (direction && keyRepeat) {
    // Stop tracking key
    keyRepeat.onKeyReleased(key, keyCode);
  }

  return false;
}
