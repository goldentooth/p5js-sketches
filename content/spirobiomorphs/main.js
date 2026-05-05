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

// === Palette ===
// Palette is an array of 4 [H, S, L] triples. H in [0, 360), S/L in [0, 100].
// Layer gradient samples between palette[layer.palette_a] and palette[layer.palette_b]
// linearly along curve parameter t (i / steps).
function sampleGradient(palette, a, b, tNorm) {
  const [h1, s1, l1] = palette[a];
  const [h2, s2, l2] = palette[b];
  // shortest hue path
  let dh = h2 - h1;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const h = (h1 + dh * tNorm + 360) % 360;
  const s = s1 + (s2 - s1) * tNorm;
  const l = l1 + (l2 - l1) * tNorm;
  return [h, s, l];
}

// Renders one layer, rotated by aOuter and translated by `offset` along x.
// (The outer rotation is applied to the whole composition; offset places
// the layer at radius `offset` from origin before stamping.)
function drawLayerInto(buf, layer, aOuter, palette) {
  if (layer.r >= layer.R) return;
  const steps = 1200;
  const cosA = Math.cos(aOuter);
  const sinA = Math.sin(aOuter);
  buf.colorMode(HSL, 360, 100, 100, 1);
  buf.strokeWeight(layer.stroke_w);
  for (let i = 0; i < steps; i++) {
    const tNorm = i / steps;
    const t1 = tNorm * Math.PI * 2 * layer.revs;
    const t2 = ((i + 1) / steps) * Math.PI * 2 * layer.revs;
    const p1 = hypoPoint(t1, layer.R, layer.r, layer.d);
    const p2 = hypoPoint(t2, layer.R, layer.r, layer.d);
    const midDist = Math.hypot((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    if (!isInBand(midDist, layer)) continue;
    const [h, s, l] = sampleGradient(palette, layer.palette_a, layer.palette_b, tNorm);
    buf.stroke(h, s, l, 0.6);
    const x1 = p1.x + layer.offset, y1 = p1.y;
    const x2 = p2.x + layer.offset, y2 = p2.y;
    const rx1 = x1 * cosA - y1 * sinA;
    const ry1 = x1 * sinA + y1 * cosA;
    const rx2 = x2 * cosA - y2 * sinA;
    const ry2 = x2 * sinA + y2 * cosA;
    buf.line(rx1, ry1, rx2, ry2);
  }
}

// `specimen` (this task): { k_outer, palette, layers: [...] }
function drawSpecimenStatic(buf, specimen) {
  buf.blendMode(ADD);
  for (let outer = 0; outer < specimen.k_outer; outer++) {
    const aOuter = (outer / specimen.k_outer) * Math.PI * 2;
    for (const layer of specimen.layers) {
      drawLayerInto(buf, layer, aOuter, specimen.palette);
    }
  }
  buf.blendMode(BLEND);
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
  drawSpecimenStatic(testBuf, {
    k_outer: 6,
    palette: [[30, 80, 65], [340, 60, 60], [200, 70, 55], [80, 60, 55]],
    layers: [
      { R: 60, r: 17, d: 40, revs: 17, offset: 25, band_count: 4, band_phase: 0, band_duty: 0.5,
        palette_a: 0, palette_b: 1, stroke_w: 0.5 },
      { R: 75, r: 26, d: 30, revs: 13, offset: 10, band_count: 3, band_phase: 0, band_duty: 0.6,
        palette_a: 2, palette_b: 0, stroke_w: 1.5 },
      { R: 50, r: 11, d: 35, revs: 11, offset: 0,  band_count: 2, band_phase: 0, band_duty: 0.7,
        palette_a: 3, palette_b: 1, stroke_w: 2.5 },
    ],
  });
}

function draw() {
  background(BG);
  image(testBuf, CANVAS_W / 2 - 140, CANVAS_H / 2 - 140);
}
