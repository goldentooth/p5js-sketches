
new p5(p => {
  const W = 600;
  const H = 400;
  const W_SCALE = 8;
  const H_SCALE = 12;
  const C = W / W_SCALE;
  const R = H / H_SCALE;
  let worker;
  let world;
  let grid;
  p.setup = () => {
    p.createCanvas(W, H);
    p.background(20);
    p.strokeWeight(2);
    worker = new Worker(`worker.js?t=${Date.now()}`);
    world = Nuglib.createWorld();
    world.registerComponent(Nuglib.Position);
    world.registerComponent(Nuglib.Glyph);
    world.addSystem(Nuglib.RenderSystem());
    grid = Nuglib.createGrid(C, R);
    grid.init((index, x, y) => {
      return {
        x,
        y,
        value: {
          glyph: '#',
          fg: [99, 99, 56],
          bg: [255, 255, 255],
        },
        draw(p, layer) {
          layer.textAlign(layer.CENTER, layer.CENTER);
          layer.stroke(50);
          layer.fill(100);
          layer.text('#', this.x * W_SCALE, this.y * H_SCALE);
        }
      };
    });
    const e = world.createEntity();
    world.addComponent(e, Nuglib.Position, { x: Math.floor(Math.random() * C) * W_SCALE, y: Math.floor(Math.random() * R) * H_SCALE });
    world.addComponent(e, Nuglib.Glyph, { glyph: 'A', fg: [255, 0, 0], bg: [0, 0, 0], size: H_SCALE });
  };
  let last = 0;
  let gridLayer = p.createGraphics(W, H);
  gridLayer.textFont('monospace', H_SCALE);
  let entityLayer = p.createGraphics(W, H);
  entityLayer.textFont('monospace', H_SCALE);
  p.draw = () => {
    p.background(0);
    const now = p.millis() / 1000;
    const dt = last ? Math.min(now - last, 0.05) : 0; // clamp for stability
    last = now;
    grid.draw(p, gridLayer);
    world.tick(dt, p, entityLayer);
    p.image(gridLayer, 0, 0);
    p.image(entityLayer, 0, 0);
  };
});