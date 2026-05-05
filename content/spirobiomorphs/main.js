// === Spirobiomorphs ===
// Layered hypotrochoid biomorphs bred via Dawkins-style 3x3 selection.

const CANVAS_W = 900;
const CANVAS_H = 900;
const BG = '#0d0d0f';

// === Hypotrochoid math ===
// Pen position for a hypotrochoid (small gear of radius r rolling inside
// large gear of radius R, pen offset d from small gear center):
//   x = (R - r) cos(t) + d cos((R-r)/r * t)
//   y = (R - r) sin(t) - d sin((R-r)/r * t)
function hypoPoint(t, R, r, d) {
  const k = R - r;
  return {
    x: k * Math.cos(t) + d * Math.cos((k / r) * t),
    y: k * Math.sin(t) - d * Math.sin((k / r) * t),
  };
}

// Draw a full hypotrochoid layer into `buf`, centered at buf's translate origin.
// `layer` shape (this task): { R, r, d, revs }
function drawLayerStatic(buf, layer) {
  if (layer.r >= layer.R) return; // degenerate, skip
  const steps = 1500;
  buf.stroke(255, 200);
  buf.noFill();
  buf.strokeWeight(1);
  buf.beginShape();
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * layer.revs;
    const p = hypoPoint(t, layer.R, layer.r, layer.d);
    buf.vertex(p.x, p.y);
  }
  buf.endShape();
}

// === Sketch ===
let testBuf;

function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.parent('sketch-holder');
  pixelDensity(1);
  testBuf = createGraphics(280, 280);
  testBuf.translate(140, 140);
  testBuf.background(BG);
  drawLayerStatic(testBuf, { R: 70, r: 21, d: 50, revs: 7 });
}

function draw() {
  background(BG);
  image(testBuf, CANVAS_W / 2 - 140, CANVAS_H / 2 - 140);
}
