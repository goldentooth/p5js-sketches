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

const FADE_ALPHA = 12; // 0..255, lower = longer trail
const SEGMENTS_PER_FULL_REV = 240;

// === Specimen ===
const CELL_PX = 280;

class Specimen {
  constructor(genome) {
    this.genome = genome;
    this.buffer = createGraphics(CELL_PX, CELL_PX);
    this.buffer.background(BG);
    this.t = genome.layers.map(() => 0);
    this.layerSpeed = genome.layers.map((_, i) => 1 + i * 0.13);
  }
  resetBuffer() {
    this.buffer.background(BG);
    this.t = this.genome.layers.map(() => 0);
  }
  step(dt, penSpeed) {
    const buf = this.buffer;
    buf.push();
    buf.resetMatrix();
    buf.blendMode(BLEND);
    buf.noStroke();
    buf.fill(0, 0, 0, FADE_ALPHA);
    buf.rect(0, 0, buf.width, buf.height);
    buf.pop();
    buf.blendMode(ADD);
    buf.colorMode(HSL, 360, 100, 100, 1);
    const g = this.genome;
    for (let li = 0; li < g.layers.length; li++) {
      const layer = g.layers[li];
      if (layer.r >= layer.R) continue;
      const totalT = layer.revs * Math.PI * 2;
      const tPrev = this.t[li];
      let tNext = tPrev + dt * penSpeed * this.layerSpeed[li] * 4;
      const segCount = Math.max(1, Math.ceil((tNext - tPrev) / (Math.PI * 2) * SEGMENTS_PER_FULL_REV));
      for (let s = 0; s < segCount; s++) {
        const tA = tPrev + (s / segCount) * (tNext - tPrev);
        const tB = tPrev + ((s + 1) / segCount) * (tNext - tPrev);
        const wA = ((tA % totalT) + totalT) % totalT;
        const wB = ((tB % totalT) + totalT) % totalT;
        if (wB < wA) continue;
        strokeSegment(buf, layer, g, wA, wB);
      }
      this.t[li] = tNext > totalT ? tNext - totalT : tNext;
    }
    buf.blendMode(BLEND);
  }
  render(x, y) {
    image(this.buffer, x, y);
  }
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

const GRID = 3;
const GUTTER = 30;
const GRID_ORIGIN = (CANVAS_W - GRID * CELL_PX - (GRID - 1) * GUTTER) / 2;

function cellPosition(col, row) {
  return {
    x: GRID_ORIGIN + col * (CELL_PX + GUTTER),
    y: GRID_ORIGIN + row * (CELL_PX + GUTTER),
  };
}

// Produces a hand-written placeholder genome with mild variation per cell.
// Real random/curated/mutate land in the next task — this is just so the grid
// shows 9 distinct things for verification.
function placeholderGenome(seed) {
  return {
    k_outer: 4 + (seed % 5),
    palette: [[30, 80, 65], [340, 60, 60], [200, 70, 55], [80, 60, 55]],
    layers: [
      { R: 60 + (seed * 3) % 30, r: 17, d: 40, revs: 11 + (seed % 7), offset: 25,
        band_count: 3, band_phase: 0, band_duty: 0.5,
        palette_a: seed % 4, palette_b: (seed + 1) % 4, stroke_w: 1 },
    ],
  };
}

let specimens = [];
let lastFrameMs = 0;

function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.parent('sketch-holder');
  pixelDensity(1);
  for (let i = 0; i < 9; i++) {
    specimens.push(new Specimen(placeholderGenome(i)));
  }
  lastFrameMs = millis();
}

function draw() {
  background(BG);
  const now = millis();
  const dt = Math.min(0.1, (now - lastFrameMs) / 1000);
  lastFrameMs = now;
  for (let i = 0; i < 9; i++) {
    const col = i % GRID;
    const row = Math.floor(i / GRID);
    specimens[i].step(dt, 1.0);
    const pos = cellPosition(col, row);
    specimens[i].render(pos.x, pos.y);
    // parent indicator
    if (col === 1 && row === 1) {
      noFill();
      stroke(180, 180, 180, 200);
      strokeWeight(2);
      rect(pos.x - 2, pos.y - 2, CELL_PX + 4, CELL_PX + 4);
    }
  }
}
