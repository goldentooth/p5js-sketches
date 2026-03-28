// Example maps for the pathfinding visualizer.
// Each map: { name, description, width, height, tiles, start: {x,y}, goal: {x,y} }
// tiles: flat array, row-major order, 0 = wall, 1 = floor
// Outer ring is always walls.

function makeGrid(width, height, fillFn) {
  const tiles = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles.push(fillFn(x, y));
    }
  }
  return tiles;
}

function idx(x, y, width) {
  return y * width + x;
}

// ─── Map 1: Open Room ────────────────────────────────────────────────────────
// 30x20, outer walls only. Demonstrates uniform BFS expansion.
const openRoom = (() => {
  const W = 30, H = 20;
  const tiles = makeGrid(W, H, (x, y) => {
    if (x === 0 || x === W - 1 || y === 0 || y === H - 1) return 0;
    return 1;
  });
  return {
    name: "Open Room",
    description: "A wide-open room with only outer walls. Watch how BFS expands uniformly in all directions, while A* heads straight for the goal.",
    width: W,
    height: H,
    tiles,
    start: { x: 2, y: 10 },
    goal: { x: 27, y: 10 },
  };
})();

// ─── Map 2: Bottleneck ───────────────────────────────────────────────────────
// 30x20, two rooms with a narrow corridor gap at y=9,10.
const bottleneck = (() => {
  const W = 30, H = 20;
  const tiles = makeGrid(W, H, (x, y) => {
    // Outer walls
    if (x === 0 || x === W - 1 || y === 0 || y === H - 1) return 0;
    // Dividing wall at x=14 and x=15 (two tiles wide), gap at y=9 and y=10
    if ((x === 14 || x === 15) && y !== 9 && y !== 10) return 0;
    return 1;
  });
  return {
    name: "Bottleneck",
    description: "Two rooms connected by a narrow two-tile corridor. Algorithms must funnel through the gap — shows how heuristics handle chokepoints.",
    width: W,
    height: H,
    tiles,
    start: { x: 5, y: 10 },
    goal: { x: 24, y: 10 },
  };
})();

// ─── Map 3: Maze ─────────────────────────────────────────────────────────────
// 31x21, serpentine corridors with dead-end stubs.
// Horizontal corridors on odd rows; vertical connectors alternate left/right.
const maze = (() => {
  const W = 31, H = 21;
  // Start all walls
  const tiles = new Array(W * H).fill(0);

  function carve(x, y) {
    tiles[idx(x, y, W)] = 1;
  }

  // Carve horizontal corridors on rows 1, 3, 5, ... 19
  for (let row = 1; row < H - 1; row += 2) {
    for (let x = 1; x < W - 1; x++) {
      carve(x, row);
    }
  }

  // Connect horizontal corridors with vertical connectors alternating sides.
  // Between row r and row r+2 (i.e. at column positions):
  //   - Even corridor index (0-based): connect at x=1 (left side)
  //   - Odd corridor index: connect at x=W-2 (right side)
  const corridorRows = [];
  for (let row = 1; row < H - 1; row += 2) corridorRows.push(row);

  for (let ci = 0; ci < corridorRows.length - 1; ci++) {
    const r1 = corridorRows[ci];
    const r2 = corridorRows[ci + 1];
    const connectX = ci % 2 === 0 ? 1 : W - 2;
    carve(connectX, r1 + 1); // the wall row between
  }

  // Block off one end of each corridor to make dead ends (except first and last).
  // Even corridors: block at x=W-2 (right end open for connector, so block left beyond connector)
  // Odd corridors: block at x=1
  // Actually: add a dead-end stub by carving a short stub into the opposite wall.
  // Stubs on even corridors at x=W-2 going right (already at wall), add stub going down
  // Instead let's add short perpendicular dead-end stubs in the middle of some corridors.
  const stubPositions = [
    { x: 8,  y: 1 }, { x: 8,  y: 2 },   // stub going down from row 1
    { x: 22, y: 3 }, { x: 22, y: 4 },   // stub going down from row 3
    { x: 8,  y: 5 }, { x: 8,  y: 6 },   // stub going down from row 5
    { x: 22, y: 7 }, { x: 22, y: 8 },   // stub going down from row 7
    { x: 15, y: 9 }, { x: 15, y: 10 },  // stub going down from row 9
    { x: 8,  y: 11 }, { x: 8, y: 12 },  // stub going down from row 11
    { x: 22, y: 13 }, { x: 22, y: 14 }, // stub going down from row 13
    { x: 15, y: 15 }, { x: 15, y: 16 }, // stub going down from row 15
    { x: 8,  y: 17 }, { x: 8, y: 18 },  // stub going down from row 17
  ];
  for (const { x, y } of stubPositions) {
    if (x > 0 && x < W - 1 && y > 0 && y < H - 1) {
      carve(x, y);
    }
  }

  return {
    name: "Maze",
    description: "Serpentine corridors with dead-end stubs. BFS must explore every dead end; A* avoids many with its heuristic.",
    width: W,
    height: H,
    tiles,
    start: { x: 1, y: 1 },
    goal: { x: 29, y: 19 },
  };
})();

// ─── Map 4: U-Trap ───────────────────────────────────────────────────────────
// 30x20, U-shaped wall enclosing the goal. Opening is at the bottom (y=16).
// Algorithms that greedily move toward the goal get trapped and must backtrack.
const uTrap = (() => {
  const W = 30, H = 20;
  const tiles = makeGrid(W, H, (x, y) => {
    // Outer walls
    if (x === 0 || x === W - 1 || y === 0 || y === H - 1) return 0;
    // U-shape: left arm x=17, y=4..16; right arm x=23, y=4..16; top bar y=4, x=17..23
    if (x === 17 && y >= 4 && y <= 16) return 0;
    if (x === 23 && y >= 4 && y <= 16) return 0;
    if (y === 4 && x >= 17 && x <= 23) return 0;
    return 1;
  });
  return {
    name: "U-Trap",
    description: "A U-shaped wall around the goal with the opening at the bottom. Greedy algorithms get trapped — only A* and BFS reliably escape.",
    width: W,
    height: H,
    tiles,
    start: { x: 14, y: 10 },
    goal: { x: 20, y: 10 },
  };
})();

// ─── Map 5: Pillars ──────────────────────────────────────────────────────────
// 30x20, single-tile pillar obstacles placed every 4 tiles in a regular grid.
const pillars = (() => {
  const W = 30, H = 20;
  const tiles = makeGrid(W, H, (x, y) => {
    if (x === 0 || x === W - 1 || y === 0 || y === H - 1) return 0;
    // Pillars at positions where both x and y are multiples of 4 (offset by 4)
    if (x % 4 === 0 && y % 4 === 0) return 0;
    return 1;
  });
  return {
    name: "Pillars",
    description: "A regular grid of single-tile pillar obstacles. Paths must weave between pillars — shows how algorithms navigate structured environments.",
    width: W,
    height: H,
    tiles,
    start: { x: 2, y: 2 },
    goal: { x: 27, y: 17 },
  };
})();

// ─── Export ──────────────────────────────────────────────────────────────────
const EXAMPLE_MAPS = [openRoom, bottleneck, maze, uTrap, pillars];
