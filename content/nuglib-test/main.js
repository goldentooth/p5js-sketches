new p5(p => {
  const W = 600;
  const H = 400;
  const W_SCALE = 32;
  const ASPECT_RATIO = 1.5;
  const H_SCALE = Math.floor(ASPECT_RATIO * W_SCALE);

  // Calculate grid dimensions using utility
  const gridDims = Nuglib.calculateGridDimensions(W, H, W_SCALE, H_SCALE);
  const C = gridDims.cols;
  const R = gridDims.rows;
  const W2 = gridDims.adjustedWidth;
  const H2 = gridDims.adjustedHeight;

  const renderSystemOptions = {
    glyphHeight: H_SCALE,
    glyphWidth: W_SCALE,
    backgroundColor: p.color(20),
  };

  const gridRendererOptions = {
    cellHeight: H_SCALE,
    cellWidth: W_SCALE,
    backgroundColor: p.color(20),
  };

  let worker;
  let world;
  let grid;
  let gridRenderer;
  let layerManager;
  let deltaTimer;

  // Create glyph palette
  const palette = new Nuglib.GlyphPalette();
  palette.registerGlyph('wall', '#', [150, 150, 150], [0, 0, 0]);
  palette.registerGlyph('player', 'A', [255, 0, 0], [0, 0, 0]);

  p.setup = () => {
    p.createCanvas(W2, H2);
    p.background(20);
    p.strokeWeight(2);

    worker = new Worker(`worker.js?t=${Date.now()}`);

    // Create ECS world
    world = Nuglib.createWorld();
    world.registerComponent(Nuglib.Position);
    world.registerComponent(Nuglib.Glyph);
    world.addSystem(Nuglib.RenderSystem(renderSystemOptions));

    gridRenderer = Nuglib.GridRenderer(gridRendererOptions);

    // Initialize grid with palette
    grid = Nuglib.createGrid(C, R);
    grid.init((cell) => {
      cell.value = palette.get('wall');
    });

    // Create entity with random position
    const e = world.createEntity();
    world.addComponent(e, Nuglib.Position, {
      x: Math.floor(Math.random() * C),
      y: Math.floor(Math.random() * R),
    });
    world.addComponent(e, Nuglib.Glyph, palette.get('player'));

    // Create delta timer for smooth time management
    deltaTimer = new Nuglib.DeltaTimer({
      maxDelta: 0.05  // Clamp at 50ms for stability
    });

    // Create layer manager
    layerManager = new Nuglib.LayerManager(p);
    layerManager.createLayer('grid', Nuglib.createTextLayerConfig(
      W2,
      H2,
      H_SCALE,
      'monospace'
    ));
    layerManager.createLayer('entities', Nuglib.createTextLayerConfig(
      W2,
      H2,
      H_SCALE,
      'monospace'
    ));
  };

  p.draw = () => {
    p.background(0);

    // Calculate delta time using DeltaTimer
    const dt = deltaTimer.tick(p.millis() / 1000);

    // Render grid layer
    const gridLayer = layerManager.requireLayer('grid');
    gridRenderer.draw(grid, p, gridLayer);

    // Render entity layer
    const entityLayer = layerManager.requireLayer('entities');
    world.tick(dt, p, entityLayer);

    // Render all layers
    layerManager.render();
  };
});
