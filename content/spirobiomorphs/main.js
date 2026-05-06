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
  { name: 'n_layers', type: 'int', range: [1, 5]  },
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

// === Specimen ===
// Each cell owns a p5.Graphics buffer. `warmup()` rasterizes the full path of
// every layer once on creation (additive blend against near-black) so the cell
// is visible from frame 1. `step()` then continues advancing each layer's pen
// every frame on top — additive ink, no fade. Live drawing reaches already-
// saturated pixels along the path, so net visual change is subtle (pen position
// and sub-pixel resampling give the "still alive" feel without the cell ever
// emptying).

const CELL_PX = 280;
const SEGMENTS_PER_FULL_REV = 240;

class Specimen {
  constructor(genome) {
    this.genome = genome;
    this.buffer = createGraphics(CELL_PX, CELL_PX);
    this.buffer.background(BG);
    this.t = genome.layers.map(() => 0);
    this.layerSpeed = genome.layers.map((_, i) => 1 + i * 0.13);
    this.warmup();
  }
  warmup() {
    const buf = this.buffer;
    buf.background(BG);
    rasterizeFullPath(this.genome, buf);
    // pick up live drawing near end-of-path so step() continues smoothly
    for (let li = 0; li < this.genome.layers.length; li++) {
      this.t[li] = this.genome.layers[li].revs * Math.PI * 2 * 0.9;
    }
  }
  step(dt, penSpeed) {
    const buf = this.buffer;
    // Live drawing uses BLEND so the pen repaints at the gradient color rather
    // than ADD-ing to existing pixels (which would steadily lighten everything
    // it passes over toward white). Warmup keeps ADD for the glow base.
    buf.blendMode(BLEND);
    buf.colorMode(HSL, 360, 100, 100, 1);
    const g = this.genome;
    for (let li = 0; li < g.layers.length; li++) {
      const layer = g.layers[li];
      if (layer.r >= layer.R) continue;
      const totalT = layer.revs * Math.PI * 2;
      const tPrev = this.t[li];
      let tNext = tPrev + dt * penSpeed * this.layerSpeed[li] * 1.2;
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

// === Breeding ===
// History entry: { genome, seed }. The seed is the RNG used to mutate
// children — storing it makes navigation deterministic (same parent +
// same seed → same children).
let history = [];      // committed past parents (oldest at index 0)
let historyForward = []; // entries undone by Back, available for Forward
let parentGenome = null;
let parentSeed = null;
let mutationsPerOffspring = 1;
let penSpeed = 1.0;
let transition = null; // { fromCol, fromRow, durationMs, elapsedMs }

function startTransition(fromIdx) {
  transition = {
    fromCol: fromIdx % GRID,
    fromRow: Math.floor(fromIdx / GRID),
    durationMs: 300,
    elapsedMs: 0,
  };
}

function rebuildChildren() {
  const rng = makeRng(parentSeed);
  for (let i = 0; i < 9; i++) {
    if (i === 4) continue;
    specimens[i] = new Specimen(mutate(parentGenome, mutationsPerOffspring, rng));
  }
}

function commitParent(genome, seed) {
  parentGenome = genome;
  parentSeed = seed;
  specimens[4] = new Specimen(genome);
  rebuildChildren();
  updateStatus();
}

function applyMutationCount(n) {
  mutationsPerOffspring = n;
  const sl = document.getElementById('mut-slider');
  const lbl = document.getElementById('mut-value');
  if (sl) sl.value = String(n);
  if (lbl) lbl.textContent = String(n);
}

function setParent(genome) {
  // brand-new parent (initial, reset, random) — clears forward history
  if (parentGenome) history.push({ genome: parentGenome, seed: parentSeed, mutationCount: mutationsPerOffspring });
  historyForward.length = 0;
  commitParent(genome, (Math.random() * 0xffffffff) >>> 0);
}

function breedFromCell(cellIdx) {
  if (cellIdx === 4) return;
  history.push({ genome: parentGenome, seed: parentSeed, mutationCount: mutationsPerOffspring });
  historyForward.length = 0;
  const newParentGenome = specimens[cellIdx].genome;
  startTransition(cellIdx);
  commitParent(newParentGenome, (Math.random() * 0xffffffff) >>> 0);
}

function goBack() {
  if (history.length === 0) return;
  historyForward.push({ genome: parentGenome, seed: parentSeed, mutationCount: mutationsPerOffspring });
  const prev = history.pop();
  applyMutationCount(prev.mutationCount ?? mutationsPerOffspring);
  commitParent(prev.genome, prev.seed);
}

function goForward() {
  if (historyForward.length === 0) return;
  history.push({ genome: parentGenome, seed: parentSeed, mutationCount: mutationsPerOffspring });
  const next = historyForward.pop();
  applyMutationCount(next.mutationCount ?? mutationsPerOffspring);
  commitParent(next.genome, next.seed);
}

function updateStatus() {
  const el = document.getElementById('status-line');
  if (!el || !parentGenome) return;
  el.textContent = `Generation: ${history.length}  ·  Layers: ${parentGenome.n_layers}  ·  k=${parentGenome.k_outer}  ·  fingerprint: ${fingerprint(parentGenome)}`;
  const backBtn = document.getElementById('back-btn');
  const fwdBtn = document.getElementById('forward-btn');
  if (backBtn) backBtn.disabled = history.length === 0;
  if (fwdBtn) fwdBtn.disabled = historyForward.length === 0;
}

function buildControls() {
  const buttonRow = document.getElementById('control-row-buttons');
  buttonRow.innerHTML = '';
  const mkBtn = (label, onClick, id) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = 'control-button';
    b.id = id;
    b.addEventListener('click', onClick);
    buttonRow.appendChild(b);
    return b;
  };
  mkBtn('◀ Back',         goBack,                   'back-btn');
  mkBtn('Forward ▶',      goForward,                'forward-btn');
  mkBtn('Reset',          () => doReset(),          'reset-btn');
  mkBtn('Random',         () => doRandom(),         'random-btn');
  mkBtn('💾 Save Parent', () => savePinned(),       'save-btn');

  const sliderRow = document.getElementById('control-row-sliders');
  sliderRow.innerHTML = `
    <label>Mutations per offspring: <span id="mut-value">1</span></label>
    <input type="range" id="mut-slider" class="control-slider" min="1" max="5" value="1">
    <label>Pen speed: <span id="speed-value">1.0×</span></label>
    <input type="range" id="speed-slider" class="control-slider" min="25" max="400" value="100">
  `;
  const mutSlider = document.getElementById('mut-slider');
  const mutValue  = document.getElementById('mut-value');
  mutSlider.addEventListener('input', () => {
    mutationsPerOffspring = parseInt(mutSlider.value, 10);
    mutValue.textContent = mutationsPerOffspring;
    rebuildChildren();
  });
  const speedSlider = document.getElementById('speed-slider');
  const speedValue  = document.getElementById('speed-value');
  speedSlider.addEventListener('input', () => {
    penSpeed = parseInt(speedSlider.value, 10) / 100;
    speedValue.textContent = penSpeed.toFixed(2) + '×';
  });
}

function doReset() {
  history.length = 0;
  historyForward.length = 0;
  parentGenome = null;
  parentSeed = null;
  const seedRng = makeRng((Math.random() * 0xffffffff) >>> 0);
  setParent(curatedSeedGenome(seedRng));
}

function doRandom() {
  const seedRng = makeRng((Math.random() * 0xffffffff) >>> 0);
  setParent(randomGenome(seedRng));
}

// === Saved gallery ===
const STORAGE_KEY = 'spirobiomorphs:saved';
const THUMB_PX = 120;

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function persistSaved(arr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch {}
}

function savePinned() {
  if (!parentGenome) return;
  const arr = loadSaved();
  arr.push(JSON.parse(JSON.stringify(parentGenome)));
  persistSaved(arr);
  renderSavedStrip();
}

// Render a static thumbnail by stepping a Specimen long enough that the
// pen has traced the full path at least once for every layer.
function renderThumbnail(genome) {
  const buf = createGraphics(THUMB_PX, THUMB_PX);
  buf.background(BG);
  rasterizeFullPath(genome, buf);
  const url = buf.canvas.toDataURL('image/png');
  buf.remove();
  return url;
}

// === Fullscreen view ===
// Click the parent (or press 5/Enter) to render the parent genome at high
// resolution and display it as an overlay. Click anywhere or press Escape
// to dismiss.
const HIRES_PX = 4096;

function openFullscreen() {
  if (!parentGenome) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed', 'inset:0',
    'background:rgba(0,0,0,0.94)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'flex-direction:column', 'gap:12px',
    'z-index:10000', 'cursor:zoom-out',
  ].join(';');

  const status = document.createElement('div');
  status.textContent = `Rendering at ${HIRES_PX}×${HIRES_PX}…`;
  status.style.cssText = 'color:#aaa;font-family:monospace;font-size:0.9em;';
  overlay.appendChild(status);
  document.body.appendChild(overlay);

  const close = () => {
    if (overlay.parentNode) document.body.removeChild(overlay);
    document.removeEventListener('keydown', escHandler);
  };
  const escHandler = (e) => { if (e.key === 'Escape') close(); };
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', escHandler);

  // Defer to next frame so the overlay paints before we block on rendering.
  requestAnimationFrame(() => {
    const buf = createGraphics(HIRES_PX, HIRES_PX);
    buf.background(BG);
    rasterizeFullPath(parentGenome, buf);

    const img = document.createElement('img');
    img.src = buf.canvas.toDataURL('image/png');
    const dim = Math.min(window.innerWidth, window.innerHeight) - 60;
    img.style.cssText = `width:${dim}px;height:${dim}px;display:block;border-radius:8px;`;
    img.title = 'Right-click → Save Image to keep at full resolution';

    const hint = document.createElement('div');
    hint.textContent = `Click anywhere (or press Esc) to close · right-click → Save Image for full ${HIRES_PX}px`;
    hint.style.cssText = 'color:#888;font-family:monospace;font-size:0.8em;';

    overlay.removeChild(status);
    overlay.appendChild(img);
    overlay.appendChild(hint);

    buf.remove();
  });
}

function renderSavedStrip() {
  const strip = document.getElementById('saved-strip');
  strip.innerHTML = '';
  const arr = loadSaved();
  arr.forEach((genome, idx) => {
    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    wrap.style.cursor = 'pointer';
    wrap.style.flex = '0 0 auto';
    wrap.title = `fingerprint: ${fingerprint(genome)}`;
    const img = document.createElement('img');
    img.src = renderThumbnail(genome);
    img.style.width = THUMB_PX + 'px';
    img.style.height = THUMB_PX + 'px';
    img.style.borderRadius = '6px';
    img.style.display = 'block';
    img.addEventListener('click', () => setParent(JSON.parse(JSON.stringify(genome))));
    const xBtn = document.createElement('button');
    xBtn.textContent = '×';
    xBtn.style.position = 'absolute';
    xBtn.style.top = '4px';
    xBtn.style.right = '4px';
    xBtn.style.opacity = '0';
    xBtn.style.transition = 'opacity 0.2s';
    xBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const updated = loadSaved();
      updated.splice(idx, 1);
      persistSaved(updated);
      renderSavedStrip();
    });
    wrap.addEventListener('mouseenter', () => xBtn.style.opacity = '1');
    wrap.addEventListener('mouseleave', () => xBtn.style.opacity = '0');
    wrap.appendChild(img);
    wrap.appendChild(xBtn);
    strip.appendChild(wrap);
  });
}

function cellAt(mx, my) {
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const pos = cellPosition(col, row);
      if (mx >= pos.x && mx < pos.x + CELL_PX && my >= pos.y && my < pos.y + CELL_PX) {
        return row * GRID + col;
      }
    }
  }
  return -1;
}

function mousePressed() {
  const idx = cellAt(mouseX, mouseY);
  if (idx === 4) { openFullscreen(); return; }
  if (idx >= 0) breedFromCell(idx);
}

function keyPressed() {
  // Numpad-layout grid mapping: 7 8 9 / 4 5 6 / 1 2 3 (5 = parent → fullscreen)
  const numpadMap = { '7': 0, '8': 1, '9': 2, '4': 3, '6': 5, '1': 6, '2': 7, '3': 8 };
  if (key === '5' || key === 'Enter') { openFullscreen(); return; }
  if (numpadMap[key] !== undefined) { breedFromCell(numpadMap[key]); return; }
  if (key === 'z' || key === 'Z') { goBack(); return; }
  if (key === 'x' || key === 'X') { goForward(); return; }
  if (key === 'r' || key === 'R') { doReset(); return; }
  if (key === 'n' || key === 'N') { doRandom(); return; }
  if (key === 's' || key === 'S') { savePinned(); return; }
  if (key === '+' || key === '=') {
    const sl = document.getElementById('mut-slider');
    sl.value = Math.min(5, parseInt(sl.value, 10) + 1);
    sl.dispatchEvent(new Event('input'));
    return;
  }
  if (key === '-' || key === '_') {
    const sl = document.getElementById('mut-slider');
    sl.value = Math.max(1, parseInt(sl.value, 10) - 1);
    sl.dispatchEvent(new Event('input'));
    return;
  }
}

function strokeSegment(buf, layer, specimen, tA, tB, scale = 1) {
  const totalT = layer.revs * Math.PI * 2;
  const tNormA = tA / totalT;
  const p1 = hypoPoint(tA, layer.R, layer.r, layer.d);
  const p2 = hypoPoint(tB, layer.R, layer.r, layer.d);
  const midDist = Math.hypot((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  if (!isInBand(midDist, layer)) return;
  const [h, s, l] = sampleGradient(specimen.palette, layer.palette_a, layer.palette_b, tNormA);
  buf.stroke(h, s, l, 0.55);
  buf.strokeWeight(layer.stroke_w * scale);
  // With k_outer = 1 there's no rotational symmetry to balance an asymmetric
  // offset, so the whole composition would slide off-center. Treat offset as 0.
  const effectiveOffset = specimen.k_outer === 1 ? 0 : layer.offset;
  for (let outer = 0; outer < specimen.k_outer; outer++) {
    const aOuter = (outer / specimen.k_outer) * Math.PI * 2;
    const cosA = Math.cos(aOuter);
    const sinA = Math.sin(aOuter);
    const x1 = (p1.x + effectiveOffset) * scale, y1 = p1.y * scale;
    const x2 = (p2.x + effectiveOffset) * scale, y2 = p2.y * scale;
    const rx1 = x1 * cosA - y1 * sinA;
    const ry1 = x1 * sinA + y1 * cosA;
    const rx2 = x2 * cosA - y2 * sinA;
    const ry2 = x2 * sinA + y2 * cosA;
    buf.line(rx1 + buf.width / 2, ry1 + buf.height / 2, rx2 + buf.width / 2, ry2 + buf.height / 2);
  }
}

// Rasterize the full path of every layer of `genome` into `buf`. The geometry
// is scaled by buf.width / CELL_PX so it fills the buffer regardless of size.
// Used by Specimen.warmup (CELL_PX), renderThumbnail (THUMB_PX), and
// openFullscreen (HIRES_PX). Segment count grows with scale so high-res
// renders stay smooth.
function rasterizeFullPath(genome, buf) {
  const scale = buf.width / CELL_PX;
  buf.blendMode(ADD);
  buf.colorMode(HSL, 360, 100, 100, 1);
  const N = Math.max(800, Math.round(800 * scale));
  for (let li = 0; li < genome.layers.length; li++) {
    const layer = genome.layers[li];
    if (layer.r >= layer.R) continue;
    const totalT = layer.revs * Math.PI * 2;
    for (let s = 0; s < N; s++) {
      const tA = (s / N) * totalT;
      const tB = ((s + 1) / N) * totalT;
      strokeSegment(buf, layer, genome, tA, tB, scale);
    }
  }
  buf.blendMode(BLEND);
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
  c.parent('sketch-container');
  pixelDensity(1);
  buildControls();
  specimens = new Array(9);
  const seedRng = makeRng((Math.random() * 0xffffffff) >>> 0);
  setParent(curatedSeedGenome(seedRng));
  lastFrameMs = millis();
  renderSavedStrip();
}

function draw() {
  background(BG);
  const now = millis();
  const dt = Math.min(0.1, (now - lastFrameMs) / 1000);
  lastFrameMs = now;
  if (transition) {
    transition.elapsedMs += dt * 1000;
    if (transition.elapsedMs >= transition.durationMs) transition = null;
  }
  for (let i = 0; i < 9; i++) {
    const col = i % GRID;
    const row = Math.floor(i / GRID);
    specimens[i].step(dt, penSpeed);
    let pos = cellPosition(col, row);
    let tintAlpha = 255;
    if (transition) {
      const u = Math.min(1, transition.elapsedMs / transition.durationMs);
      // children other than parent fade out as transition runs
      if (i !== 4) tintAlpha = 255 * (1 - u * 0.6);
      // the parent slides from the source cell into the center as it appears
      if (i === 4) {
        const src = cellPosition(transition.fromCol, transition.fromRow);
        const dst = cellPosition(1, 1);
        pos = { x: src.x + (dst.x - src.x) * u, y: src.y + (dst.y - src.y) * u };
        tintAlpha = 255 * u;
      }
    }
    if (tintAlpha < 255) {
      tintImage(specimens[i], pos.x, pos.y, tintAlpha);
    } else {
      specimens[i].render(pos.x, pos.y);
    }
    if (i === 4 && !transition) {
      push();
      noFill(); stroke(180, 180, 180, 200); strokeWeight(2);
      rect(pos.x - 2, pos.y - 2, CELL_PX + 4, CELL_PX + 4);
      pop();
    }
  }
}

function tintImage(spec, x, y, alpha) {
  push();
  tint(255, alpha);
  spec.render(x, y);
  pop();
}
