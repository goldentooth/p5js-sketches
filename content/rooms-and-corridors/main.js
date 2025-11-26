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
let movementSystem;
let viewshedSystem;
let playerEntity;
let keyRepeat;

// FOV settings
let fovEnabled = true;
let fovRange = 10;
let fovAlgorithm = 'shadowcasting';
let permissiveness = 2;

// Column settings
let columnsEnabled = true;
let columnDensity = 0.6;

// Map generation settings
let roomCount = 6;
let minRoomSize = 5;
let maxRoomSize = 12;

const charHeight = 24;
const charWidth = 16;
const cols = 40;
const rows = 25;

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
    maxRooms: roomCount,
    minRoomSize: minRoomSize,
    maxRoomSize: maxRoomSize,
  });

  console.log(`Generated ${rooms.length} rooms`);

  // Log room sizes for debugging
  rooms.forEach((room, i) => {
    console.log(`  Room ${i}: ${room.width}x${room.height}`);
  });

  // Generate columns/pillars in rooms if enabled
  if (columnsEnabled) {
    const columnsByRoom = Nuglib.generateColumns(map, rooms, rng, {
      minRoomSize: { width: 7, height: 7 },
      columnSize: { min: 1, max: 2 },
      spacing: { min: 3, max: 4 },
      density: columnDensity,
      edgeBuffer: 1,
      corridorBuffer: 1,  // Reduced from 2 to allow columns in smaller rooms
    });

    let totalColumns = 0;
    columnsByRoom.forEach(cols => totalColumns += cols.length);
    console.log(`Generated ${totalColumns} columns in ${columnsByRoom.size} rooms (min room size: 7x7, density: ${Math.round(columnDensity * 100)}%)`);
  }

  // Create ECS world
  world = Nuglib.createWorld();

  // Add movement system
  movementSystem = new Nuglib.MovementSystem(map);
  world.addSystem(movementSystem);

  // Add viewshed system
  viewshedSystem = new Nuglib.ViewshedSystem(map);
  world.addSystem(viewshedSystem);

  // Create player entity at first room's center
  const startRoom = rooms[0];
  const startPos = startRoom.center();

  playerEntity = world.createEntity();
  world.addComponent(playerEntity, 'Position', { x: startPos.x, y: startPos.y });
  world.addComponent(playerEntity, 'Glyph', palette.get('player'));
  world.addComponent(playerEntity, 'PlayerControlled', {});

  // Add FOV components
  world.addComponent(playerEntity, 'Viewshed', {
    range: fovRange,
    algorithm: fovAlgorithm,
    visibleCells: new Set(),
    dirty: true,
    permissiveness: permissiveness
  });
  world.addComponent(playerEntity, 'Memory', {
    exploredCells: new Set()
  });

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
  // FOV toggle checkbox
  const fovCheckbox = document.getElementById('fov-enabled');
  if (fovCheckbox) {
    fovCheckbox.addEventListener('change', (e) => {
      fovEnabled = e.target.checked;
    });
  }

  // Algorithm dropdown
  const algorithmSelect = document.getElementById('algorithm-select');
  if (algorithmSelect) {
    algorithmSelect.addEventListener('change', (e) => {
      fovAlgorithm = e.target.value;
      updateViewshedSettings();
      updatePermissivenessVisibility();
    });
  }

  // Range slider
  const rangeSlider = document.getElementById('range-slider');
  const rangeValue = document.getElementById('range-value');
  if (rangeSlider && rangeValue) {
    rangeSlider.addEventListener('input', (e) => {
      fovRange = parseInt(e.target.value);
      rangeValue.textContent = fovRange;
      updateViewshedSettings();
    });
  }

  // Permissiveness slider
  const permissivenessSlider = document.getElementById('permissiveness-slider');
  const permissivenessValue = document.getElementById('permissiveness-value');
  if (permissivenessSlider && permissivenessValue) {
    permissivenessSlider.addEventListener('input', (e) => {
      permissiveness = parseInt(e.target.value);
      permissivenessValue.textContent = permissiveness;
      updateViewshedSettings();
    });
  }

  // Regenerate button
  const regenerateBtn = document.getElementById('regenerate-btn');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', () => {
      initMap();
    });
  }

  // Columns toggle checkbox
  const columnsCheckbox = document.getElementById('columns-enabled');
  if (columnsCheckbox) {
    columnsCheckbox.addEventListener('change', (e) => {
      columnsEnabled = e.target.checked;
      initMap(); // Regenerate map with/without columns
    });
  }

  // Column density slider
  const densitySlider = document.getElementById('density-slider');
  const densityValue = document.getElementById('density-value');
  if (densitySlider && densityValue) {
    densitySlider.addEventListener('input', (e) => {
      columnDensity = parseFloat(e.target.value);
      densityValue.textContent = Math.round(columnDensity * 100) + '%';
      if (columnsEnabled) {
        initMap(); // Regenerate map with new density
      }
    });
  }

  // Room count slider
  const roomCountSlider = document.getElementById('room-count-slider');
  const roomCountValue = document.getElementById('room-count-value');
  if (roomCountSlider && roomCountValue) {
    roomCountSlider.addEventListener('input', (e) => {
      roomCount = parseInt(e.target.value);
      roomCountValue.textContent = roomCount;
      initMap(); // Regenerate map with new room count
    });
  }

  // Min room size slider
  const minRoomSlider = document.getElementById('min-room-slider');
  const minRoomValue = document.getElementById('min-room-value');
  if (minRoomSlider && minRoomValue) {
    minRoomSlider.addEventListener('input', (e) => {
      minRoomSize = parseInt(e.target.value);
      minRoomValue.textContent = minRoomSize;
      // Ensure min doesn't exceed max
      if (minRoomSize > maxRoomSize) {
        maxRoomSize = minRoomSize;
        const maxSlider = document.getElementById('max-room-slider');
        const maxValue = document.getElementById('max-room-value');
        if (maxSlider) maxSlider.value = maxRoomSize;
        if (maxValue) maxValue.textContent = maxRoomSize;
      }
      initMap(); // Regenerate map with new size
    });
  }

  // Max room size slider
  const maxRoomSlider = document.getElementById('max-room-slider');
  const maxRoomValue = document.getElementById('max-room-value');
  if (maxRoomSlider && maxRoomValue) {
    maxRoomSlider.addEventListener('input', (e) => {
      maxRoomSize = parseInt(e.target.value);
      maxRoomValue.textContent = maxRoomSize;
      // Ensure max doesn't go below min
      if (maxRoomSize < minRoomSize) {
        minRoomSize = maxRoomSize;
        const minSlider = document.getElementById('min-room-slider');
        const minValue = document.getElementById('min-room-value');
        if (minSlider) minSlider.value = minRoomSize;
        if (minValue) minValue.textContent = minRoomSize;
      }
      initMap(); // Regenerate map with new size
    });
  }

  // Set initial permissiveness visibility
  updatePermissivenessVisibility();
}

function updatePermissivenessVisibility() {
  const permissivenessControl = document.getElementById('permissiveness-control');
  if (permissivenessControl) {
    permissivenessControl.style.display = fovAlgorithm === 'permissive' ? 'block' : 'none';
  }
}

function draw() {
  background(0);

  // Process held keys for continuous movement
  if (movementSystem && playerEntity && keyRepeat) {
    const repeatingKeys = keyRepeat.update();
    for (const { key, keyCode } of repeatingKeys) {
      const direction = mapKeyToDirection(key, keyCode);
      if (direction) {
        movementSystem.queueCommand(playerEntity, {
          type: 'move',
          direction: direction
        });
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

function updateViewshedSettings() {
  if (!playerEntity || !world) return;

  // Use library utility to update viewshed
  Nuglib.updateViewshedSettings(world, playerEntity, {
    range: fovRange,
    algorithm: fovAlgorithm,
    permissiveness: permissiveness
  });
}

function keyPressed() {
  // Handle movement keys
  const direction = mapKeyToDirection(key, keyCode);

  if (direction && movementSystem && playerEntity && keyRepeat) {
    // Track key for repeat
    keyRepeat.onKeyPressed(key, keyCode);

    // Queue immediate movement on first press
    movementSystem.queueCommand(playerEntity, {
      type: 'move',
      direction: direction
    });

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
