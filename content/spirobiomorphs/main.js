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
  const phase = layer.band_phase * period;
  const local = ((dist - phase) % period + period) % period;
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

// === RNG ===
// Seeded RNG (mulberry32) so breeding history is reproducible.
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngInt(rng, lo, hi) { return Math.floor(rng() * (hi - lo + 1)) + lo; }
function rngFloat(rng, lo, hi) { return rng() * (hi - lo) + lo; }
function rngPick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function rngSign(rng) { return rng() < 0.5 ? -1 : 1; }

// === Gene metadata ===
// type: 'int' | 'qfloat' | 'cfloat' (continuous float)
// range: [min, max] inclusive
// step: amount per ±1 mutation (defined for qfloat/int; cfloat uses 5% of range)
const SPECIMEN_GENES = [
  { name: 'k_outer',  type: 'int', range: [1, 12] },
  { name: 'n_layers', type: 'int', range: [1, 5] },
];
// palette: 4 slots × (H, S, L). Treated as a flat list of 12 cfloat genes for mutation.
const PALETTE_SLOTS = 4;
const PALETTE_GENE_DEFS = [
  { name: 'H', type: 'cfloat', range: [0, 360] },
  { name: 'S', type: 'cfloat', range: [0, 100] },
  { name: 'L', type: 'cfloat', range: [0, 100] },
];

const LAYER_GENES = [
  { name: 'R',          type: 'int',    range: [20, 120] },
  { name: 'r',          type: 'int',    range: [5, 60]   },
  { name: 'd',          type: 'int',    range: [1, 80]   },
  { name: 'revs',       type: 'int',    range: [1, 30]   },
  { name: 'offset',     type: 'cfloat', range: [0, 60]   },
  { name: 'band_count', type: 'int',    range: [1, 8]    },
  { name: 'band_phase', type: 'cfloat', range: [0, 1]    }, // normalized 0..1, multiplied by band period at render
  { name: 'band_duty',  type: 'qfloat', range: [0.1, 0.9], step: 0.1 },
  { name: 'palette_a',  type: 'int',    range: [0, 3]    },
  { name: 'palette_b',  type: 'int',    range: [0, 3]    },
  { name: 'stroke_w',   type: 'qfloat', range: [0.5, 4.0], step: 0.5 },
];

// === Genome ops ===
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function randomGenome(rng) {
  const palette = [];
  for (let i = 0; i < PALETTE_SLOTS; i++) {
    palette.push([
      rngFloat(rng, 0, 360),
      rngFloat(rng, 30, 90),
      rngFloat(rng, 30, 75),
    ]);
  }
  const n = rngInt(rng, 1, 5);
  const layers = [];
  for (let i = 0; i < n; i++) layers.push(randomLayer(rng));
  return {
    k_outer: rngInt(rng, 1, 12),
    n_layers: n,
    palette,
    layers,
  };
}

function randomLayer(rng) {
  const layer = {};
  for (const g of LAYER_GENES) {
    if (g.type === 'int') layer[g.name] = rngInt(rng, g.range[0], g.range[1]);
    else if (g.type === 'qfloat') {
      const steps = Math.round((g.range[1] - g.range[0]) / g.step);
      layer[g.name] = g.range[0] + rngInt(rng, 0, steps) * g.step;
    } else {
      layer[g.name] = rngFloat(rng, g.range[0], g.range[1]);
    }
  }
  // sanity: ensure r < R (otherwise layer renders nothing)
  if (layer.r >= layer.R) layer.r = Math.max(5, layer.R - 5);
  return layer;
}

// "Curated" seed: tighter ranges so the initial parent is plausible, not noise.
function curatedSeedGenome(rng) {
  const palette = [];
  for (let i = 0; i < PALETTE_SLOTS; i++) {
    palette.push([
      rngFloat(rng, 0, 360),
      rngFloat(rng, 50, 80),
      rngFloat(rng, 45, 65),
    ]);
  }
  const n = rngInt(rng, 2, 3);
  const layers = [];
  for (let i = 0; i < n; i++) {
    layers.push({
      R: rngInt(rng, 50, 90),
      r: rngInt(rng, 12, 30),
      d: rngInt(rng, 25, 55),
      revs: rngInt(rng, 7, 17),
      offset: rngFloat(rng, 0, 30),
      band_count: rngInt(rng, 2, 5),
      band_phase: rngFloat(rng, 0, 1),
      band_duty: 0.5,
      palette_a: rngInt(rng, 0, 3),
      palette_b: rngInt(rng, 0, 3),
      stroke_w: 1.0,
    });
  }
  return { k_outer: rngInt(rng, 4, 8), n_layers: n, palette, layers };
}

// Returns a flat list of {scope, layerIdx, name, geneDef} entries that mutation
// picks from uniformly. Only ACTIVE genes are listed (layers beyond n_layers
// are excluded).
function activeGeneList(genome) {
  const list = [];
  for (const g of SPECIMEN_GENES) list.push({ scope: 'specimen', name: g.name, def: g });
  for (let p = 0; p < PALETTE_SLOTS; p++) {
    for (const g of PALETTE_GENE_DEFS) list.push({ scope: 'palette', slot: p, name: g.name, def: g });
  }
  for (let li = 0; li < genome.n_layers; li++) {
    for (const g of LAYER_GENES) list.push({ scope: 'layer', layerIdx: li, name: g.name, def: g });
  }
  return list;
}

function mutateGene(genome, entry, rng) {
  const { def, scope } = entry;
  const sign = rngSign(rng);
  if (scope === 'specimen') {
    if (entry.name === 'n_layers') {
      // special: ±1, with structural side effect
      const cur = genome.n_layers;
      const next = clamp(cur + sign, def.range[0], def.range[1]);
      if (next > cur) {
        // append a "neutral" layer (median of each gene's range)
        const layer = {};
        for (const lg of LAYER_GENES) {
          if (lg.type === 'int') layer[lg.name] = Math.round((lg.range[0] + lg.range[1]) / 2);
          else if (lg.type === 'qfloat') {
            const steps = Math.round((lg.range[1] - lg.range[0]) / lg.step);
            layer[lg.name] = lg.range[0] + Math.round(steps / 2) * lg.step;
          } else layer[lg.name] = (lg.range[0] + lg.range[1]) / 2;
        }
        if (layer.r >= layer.R) layer.r = Math.max(5, layer.R - 5);
        genome.layers.push(layer);
      } else if (next < cur) {
        genome.layers.pop();
      }
      genome.n_layers = next;
      return;
    }
    genome[entry.name] = clamp(genome[entry.name] + sign, def.range[0], def.range[1]);
    return;
  }
  if (scope === 'palette') {
    const slot = genome.palette[entry.slot];
    const idx = entry.name === 'H' ? 0 : entry.name === 'S' ? 1 : 2;
    const step = (def.range[1] - def.range[0]) * 0.05;
    if (entry.name === 'H') slot[idx] = (slot[idx] + sign * step + 360) % 360;
    else slot[idx] = clamp(slot[idx] + sign * step, def.range[0], def.range[1]);
    return;
  }
  if (scope === 'layer') {
    const layer = genome.layers[entry.layerIdx];
    if (def.type === 'int') {
      layer[entry.name] = clamp(layer[entry.name] + sign, def.range[0], def.range[1]);
      // keep r < R for renderability
      if (entry.name === 'r' && layer.r >= layer.R) layer.r = layer.R - 1;
    } else if (def.type === 'qfloat') {
      layer[entry.name] = clamp(
        Math.round((layer[entry.name] + sign * def.step) / def.step) * def.step,
        def.range[0], def.range[1]
      );
    } else {
      const step = (def.range[1] - def.range[0]) * 0.05;
      layer[entry.name] = clamp(layer[entry.name] + sign * step, def.range[0], def.range[1]);
    }
  }
}

// Returns a deep copy of `parent` with N mutations applied using `rng`.
function mutate(parent, n, rng) {
  const child = JSON.parse(JSON.stringify(parent));
  for (let i = 0; i < n; i++) {
    const list = activeGeneList(child);
    const entry = list[Math.floor(rng() * list.length)];
    mutateGene(child, entry, rng);
  }
  return child;
}

// 32-bit FNV-1a hash → 4-char hex.
function fingerprint(genome) {
  const json = JSON.stringify(genome, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v);
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) & 0xffff).toString(16).padStart(4, '0');
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

let specimens = [];
let lastFrameMs = 0;

function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.parent('sketch-holder');
  pixelDensity(1);
  const initialSeed = (Math.random() * 0xffffffff) >>> 0;
  const seedRng = makeRng(initialSeed);
  const parentGenome = curatedSeedGenome(seedRng);
  const childRng = makeRng((initialSeed + 1) >>> 0);
  const grid = new Array(9);
  grid[4] = new Specimen(parentGenome);
  for (let i = 0; i < 9; i++) {
    if (i === 4) continue;
    grid[i] = new Specimen(mutate(parentGenome, 1, childRng));
  }
  specimens = grid;
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
