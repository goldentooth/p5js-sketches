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
let playerEntity;

const charHeight = 24;
const charWidth = 16;
const cols = 40;
const rows = 25;

function initMap() {
  // Create RNG with seed
  const seed = BigInt(Date.now());
  rng = Nuglib.xoroshiro128plus(seed);

  // Create a map with blocking edges
  map = Nuglib.createMap(cols, rows, { edgeBehavior: 'block' });

  // Generate rooms and corridors procedurally
  rooms = Nuglib.generateRoomsAndCorridors(map, rng, {
    maxRooms: 6,
    minRoomSize: 3,
    maxRoomSize: 8,
  });

  console.log(`Generated ${rooms.length} rooms`);

  // Create ECS world
  world = Nuglib.createWorld();

  // Add movement system
  movementSystem = new Nuglib.MovementSystem(map);
  world.addSystem(movementSystem);

  // Create player entity at first room's center
  const startRoom = rooms[0];
  const startPos = startRoom.center();

  playerEntity = world.createEntity();
  world.addComponent(playerEntity, 'Position', { x: startPos.x, y: startPos.y });
  world.addComponent(playerEntity, 'Glyph', palette.get('player'));
  world.addComponent(playerEntity, 'PlayerControlled', {});

  // Sync map to grid for rendering
  syncMapToGrid();
}

function syncMapToGrid() {
  grid.init((cell) => {
    const tile = map.getTile(cell.x, cell.y);
    if (tile === Nuglib.Tiles.Wall) {
      cell.value = palette.get('wall');
    } else if (tile === Nuglib.Tiles.Floor) {
      cell.value = palette.get('floor');
    }
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

  // Initialize map with rooms
  initMap();
}

function draw() {
  background(0);

  // Update world systems
  world.tick();

  // Sync map to grid
  syncMapToGrid();

  // Render entities with Position and Glyph components
  for (const entity of world.query(['Position', 'Glyph'])) {
    const pos = world.getComponent(entity, 'Position');
    const glyph = world.getComponent(entity, 'Glyph');
    if (pos && glyph) {
      const cell = grid.getCell(pos.x, pos.y);
      if (cell) {
        cell.value = glyph;
      }
    }
  }

  // Render the grid using layer manager
  const gridLayer = layerManager.requireLayer('grid');
  gridRenderer.draw(grid, window, gridLayer);
  layerManager.render();
}

function keyPressed() {
  // Map keys to directions
  let direction = null;

  // Arrow keys
  if (keyCode === LEFT_ARROW) {
    direction = Nuglib.Cardinal.WEST;
  } else if (keyCode === RIGHT_ARROW) {
    direction = Nuglib.Cardinal.EAST;
  } else if (keyCode === UP_ARROW) {
    direction = Nuglib.Cardinal.NORTH;
  } else if (keyCode === DOWN_ARROW) {
    direction = Nuglib.Cardinal.SOUTH;
  }
  // WASD
  else if (key === 'a' || key === 'A') {
    direction = Nuglib.Cardinal.WEST;
  } else if (key === 'd' || key === 'D') {
    direction = Nuglib.Cardinal.EAST;
  } else if (key === 'w' || key === 'W') {
    direction = Nuglib.Cardinal.NORTH;
  } else if (key === 's' || key === 'S') {
    direction = Nuglib.Cardinal.SOUTH;
  }
  // Vi keys
  else if (key === 'h') {
    direction = Nuglib.Cardinal.WEST;
  } else if (key === 'l') {
    direction = Nuglib.Cardinal.EAST;
  } else if (key === 'k') {
    direction = Nuglib.Cardinal.NORTH;
  } else if (key === 'j') {
    direction = Nuglib.Cardinal.SOUTH;
  }
  // Numpad (diagonals)
  else if (key === '4') {
    direction = Nuglib.Cardinal.WEST;
  } else if (key === '6') {
    direction = Nuglib.Cardinal.EAST;
  } else if (key === '8') {
    direction = Nuglib.Cardinal.NORTH;
  } else if (key === '2') {
    direction = Nuglib.Cardinal.SOUTH;
  } else if (key === '7') {
    direction = Nuglib.Diagonal.NORTHWEST;
  } else if (key === '9') {
    direction = Nuglib.Diagonal.NORTHEAST;
  } else if (key === '1') {
    direction = Nuglib.Diagonal.SOUTHWEST;
  } else if (key === '3') {
    direction = Nuglib.Diagonal.SOUTHEAST;
  }

  // Queue movement command if direction was set
  if (direction) {
    movementSystem.queueCommand(playerEntity, {
      type: 'move',
      direction: direction
    });
    return false; // Prevent default behavior
  }
}
