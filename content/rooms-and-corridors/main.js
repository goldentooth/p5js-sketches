// Glyph palette for the map
const palette = new Nuglib.GlyphPalette();
palette.registerGlyph('wall', '#', [128, 128, 128], [0, 0, 0]);
palette.registerGlyph('floor', '.', [64, 64, 64], [0, 0, 0]);

let map;
let grid;
let gridRenderer;
let layerManager;
let rooms;
let rng;

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

  // Render the grid using layer manager
  const gridLayer = layerManager.requireLayer('grid');
  gridRenderer.draw(grid, window, gridLayer);
  layerManager.render();
}
