new p5(p => {
  const W = 600;
  const H = 400;
  const W_SCALE = 32;
  const ASPECT_RATIO = 1.5;
  const H_SCALE = Math.floor(ASPECT_RATIO * W_SCALE);
  const C = Math.floor(W / W_SCALE);
  const W2 = C * W_SCALE;
  const R = Math.floor(H / H_SCALE);
  const H2 = R * H_SCALE;

  const renderSystemOptions = {
    glyphHeight: H_SCALE,
    glyphWidth: W_SCALE,
  }
  const gridRendererOptions = {
    cellHeight: H_SCALE,
    cellWidth: W_SCALE,
  };

  let worker;
  let world;
  let grid;
  let gridRenderer;
  p.setup = () => {
    p.createCanvas(W2, H2);
    p.background(20);
    p.strokeWeight(2);

    worker = new Worker(`worker.js?t=${Date.now()}`);

    world = Nuglib.createWorld();
    world.registerComponent(Nuglib.Position);
    world.registerComponent(Nuglib.Glyph);
    world.addSystem(Nuglib.RenderSystem(renderSystemOptions));

    gridRenderer = Nuglib.GridRenderer(gridRendererOptions);

    grid = Nuglib.createGrid(C, R);

    grid.init((cell) => {
      cell.value = Nuglib.withColor('#', [150, 150, 150], [0, 0, 0]);
    });

    const e = world.createEntity();
    world.addComponent(e, Nuglib.Position, {
      x: Math.floor(Math.random() * C),
      y: Math.floor(Math.random() * R),
    });
    world.addComponent(e, Nuglib.Glyph, Nuglib.withColor('A', [255, 0, 0], [0, 0, 0]));
  };
  let last = 0;
  let gridLayer = p.createGraphics(W2, H2);
  gridLayer.textFont('monospace', H_SCALE);
  let entityLayer = p.createGraphics(W2, H2);
  entityLayer.textFont('monospace', H_SCALE);
  p.draw = () => {
    p.background(0);
    const now = p.millis() / 1000;
    const dt = last ? Math.min(now - last, 0.05) : 0; // clamp for stability
    last = now;
    gridRenderer.draw(grid, p, gridLayer);
    world.tick(dt, p, entityLayer);
    p.image(gridLayer, 0, 0);
    p.image(entityLayer, 0, 0);
  };
});