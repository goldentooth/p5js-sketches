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

// Compute the maximum origin-distance the pen can reach for this layer.
// |hypo(t)| <= (R - r) + d, used to derive band period.
function layerMaxRadius(layer) {
  return (layer.R - layer.r) + layer.d;
}

// Mask: divide [0, maxR] into `band_count` equal bands; within each band,
// the first `band_duty` fraction draws and the rest is skipped. `band_phase`
// shifts the pattern (0..band_period).
function isInBand(dist, layer) {
  const maxR = layerMaxRadius(layer);
  const period = maxR / layer.band_count;
  const local = ((dist - layer.band_phase) % period + period) % period;
  return local <= period * layer.band_duty;
}

// `layer` shape (this task): { R, r, d, revs, band_count, band_phase, band_duty }
function drawLayerStatic(buf, layer) {
  if (layer.r >= layer.R) return;
  const steps = 1500;
  buf.stroke(255, 200);
  buf.noFill();
  buf.strokeWeight(1);
  for (let i = 0; i < steps; i++) {
    const t1 = (i / steps) * Math.PI * 2 * layer.revs;
    const t2 = ((i + 1) / steps) * Math.PI * 2 * layer.revs;
    const p1 = hypoPoint(t1, layer.R, layer.r, layer.d);
    const p2 = hypoPoint(t2, layer.R, layer.r, layer.d);
    const midDist = Math.hypot((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    if (isInBand(midDist, layer)) {
      buf.line(p1.x, p1.y, p2.x, p2.y);
    }
  }
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
  drawLayerStatic(testBuf, {
    R: 70, r: 21, d: 50, revs: 7,
    band_count: 4, band_phase: 0, band_duty: 0.5,
  });
}

function draw() {
  background(BG);
  image(testBuf, CANVAS_W / 2 - 140, CANVAS_H / 2 - 140);
}
