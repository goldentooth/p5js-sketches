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

// === Animated rendering ===
// A specimen "instance" tracks per-layer pen state separately from the genome:
//   instance.tPrev[layerIdx] — pen t at last frame
//   instance.t[layerIdx]     — pen t at current frame
// `specimen` is the genome (palette, k_outer, layers). `instance.layerSpeed[i]`
// is a fixed multiplier so different layers don't all march in lockstep.

function makeInstance(specimen) {
  return {
    specimen,
    t: specimen.layers.map(() => 0),
    layerSpeed: specimen.layers.map((_, i) => 1 + i * 0.13), // slight desync
  };
}

const FADE_ALPHA = 12; // 0..255, lower = longer trail
const SEGMENTS_PER_FULL_REV = 240;

function stepInstance(instance, dt, penSpeed, buf) {
  // 1) Fade overlay — must be in BLEND mode so destination is partially erased.
  buf.push();
  buf.resetMatrix();
  buf.blendMode(BLEND);
  buf.noStroke();
  buf.fill(0, 0, 0, FADE_ALPHA);
  buf.rect(0, 0, buf.width, buf.height);
  buf.pop();

  // 2) Stroke new segments in ADD mode.
  buf.blendMode(ADD);
  buf.colorMode(HSL, 360, 100, 100, 1);
  const { specimen } = instance;
  for (let li = 0; li < specimen.layers.length; li++) {
    const layer = specimen.layers[li];
    if (layer.r >= layer.R) continue;
    const totalT = layer.revs * Math.PI * 2;
    const tPrev = instance.t[li];
    let tNext = tPrev + dt * penSpeed * instance.layerSpeed[li] * 4;
    // Number of mini-segments to stroke this frame, proportional to angle covered.
    const segCount = Math.max(1, Math.ceil((tNext - tPrev) / (Math.PI * 2) * SEGMENTS_PER_FULL_REV));
    for (let s = 0; s < segCount; s++) {
      const tA = tPrev + (s / segCount) * (tNext - tPrev);
      const tB = tPrev + ((s + 1) / segCount) * (tNext - tPrev);
      // wrap each end independently to [0, totalT]
      const wA = ((tA % totalT) + totalT) % totalT;
      const wB = ((tB % totalT) + totalT) % totalT;
      // skip the wrap-around segment (don't draw a chord across the wrap)
      if (wB < wA) continue;
      strokeSegment(buf, layer, specimen, wA, wB);
    }
    instance.t[li] = tNext > totalT ? tNext - totalT : tNext;
  }
  buf.blendMode(BLEND);
}

function strokeSegment(buf, layer, specimen, tA, tB) {
  const totalT = layer.revs * Math.PI * 2;
  const tNormA = tA / totalT;
  const p1 = hypoPoint(tA, layer.R, layer.r, layer.d);
  const p2 = hypoPoint(tB, layer.R, layer.r, layer.d);
  const midDist = Math.hypot((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  if (!isInBand(midDist, layer)) return;
  const [h, s, l] = sampleGradient(specimen.palette, layer.palette_a, layer.palette_b, tNormA);
  buf.stroke(h, s, l, 0.55);
  buf.strokeWeight(layer.stroke_w);
  for (let outer = 0; outer < specimen.k_outer; outer++) {
    const aOuter = (outer / specimen.k_outer) * Math.PI * 2;
    const cosA = Math.cos(aOuter);
    const sinA = Math.sin(aOuter);
    const x1 = p1.x + layer.offset, y1 = p1.y;
    const x2 = p2.x + layer.offset, y2 = p2.y;
    const rx1 = x1 * cosA - y1 * sinA;
    const ry1 = x1 * sinA + y1 * cosA;
    const rx2 = x2 * cosA - y2 * sinA;
    const ry2 = x2 * sinA + y2 * cosA;
    buf.line(rx1 + buf.width / 2, ry1 + buf.height / 2, rx2 + buf.width / 2, ry2 + buf.height / 2);
  }
}

// === Sketch ===
let testBuf;
let testInstance;
let lastFrameMs = 0;

function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.parent('sketch-holder');
  pixelDensity(1);
  testBuf = createGraphics(280, 280);
  testBuf.background(BG);
  testInstance = makeInstance({
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
  lastFrameMs = millis();
}

function draw() {
  background(BG);
  const now = millis();
  const dt = Math.min(0.1, (now - lastFrameMs) / 1000); // clamp first-frame spike
  lastFrameMs = now;
  stepInstance(testInstance, dt, 1.0, testBuf);
  image(testBuf, CANVAS_W / 2 - 140, CANVAS_H / 2 - 140);
}
