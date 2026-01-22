// p5.js — "Shared priors collapse communication complexity"
// Press:
//   S  = toggle shared model (shared generator code)
//   +  = increase bit budget
//   -  = decrease bit budget
//
// Idea: The left panel is the "truth" curve held by Alice.
// The right panel is what Bob can reconstruct given a limited message.
//
// If they share a generator (a prior), Alice can send (roughly) just a seed.
// If they don't, Alice must send sampled values; more bits => better recon.

let seed = 4242;
let bitsBudget = 24;       // try 4..256
let sharedModel = true;

const N = 160;             // number of points in the curve
const SEED_BITS = 16;      // assume seed fits in 16 bits
const Y_BITS = 8;          // quantization per transmitted y sample (no indices needed)

function setup() {
  createCanvas(920, 520);
  textFont("monospace");
  noLoop();
}

function draw() {
  background(248);

  // Panels
  const pad = 20;
  const panelW = (width - pad * 3) / 2;
  const panelH = height - pad * 3 - 30;
  const left = { x: pad, y: pad + 30, w: panelW, h: panelH };
  const right = { x: pad * 2 + panelW, y: pad + 30, w: panelW, h: panelH };

  // Truth curve
  const truth = genCurve(seed, N);

  // Reconstruction under bit budget
  const recon = reconstruct(truth, seed, bitsBudget, sharedModel);

  // Draw panels
  drawPanel(left, "Alice has (truth)", truth, [20, 40, 70]);
  drawPanel(right, "Bob reconstructs", recon, [80, 30, 20]);

  // UI text
  drawHUD(truth, recon);
}

function drawPanel(r, title, pts, col) {
  // frame
  stroke(10); strokeWeight(2); noFill();
  rect(r.x, r.y, r.w, r.h);

  // title
  noStroke(); fill(10);
  textSize(13);
  text(title, r.x + 8, r.y - 8);

  // axes
  stroke(220); strokeWeight(1);
  line(r.x, r.y + r.h / 2, r.x + r.w, r.y + r.h / 2);

  // curve
  stroke(col[0], col[1], col[2]); strokeWeight(3); noFill();
  beginShape();
  for (const p of pts) {
    const px = r.x + p.x * r.w;
    const py = r.y + (1 - p.y) * r.h;
    vertex(px, py);
  }
  endShape();
}

function drawHUD(truth, recon) {
  const y = 18;
  fill(10); noStroke();
  textSize(13);

  const mode = sharedModel ? "ON" : "OFF";
  const msg = sharedModel
    ? `message = quantized seed (${min(bitsBudget, SEED_BITS)} bits used)`
    : `message = ${samplesSent(bitsBudget)} quantized samples (${samplesSent(bitsBudget) * Y_BITS} bits used)`;

  text(`Shared model: ${mode}   (press S)`, 20, y);
  text(`Bit budget: ${bitsBudget}   (press +/-)`, 260, y);
  text(msg, 500, y);

  // crude error metric (mean absolute difference)
  const err = meanAbsErr(truth, recon);
  text(`mean |error|: ${nf(err, 1, 4)}`, 20, height - 12);

  // One-line moral
  text(
    sharedModel
      ? "Same prior ⇒ tiny description can reproduce rich structure."
      : "No shared prior ⇒ you pay per detail (more bits → closer fit).",
    260, height - 12
  );
}

// --------- Core idea: a complex-ish curve from a tiny seed ---------

function genCurve(s, n) {
  randomSeed(s);
  noiseSeed(s);

  const a = random(0.6, 1.4);
  const b = random(1.5, 3.5);
  const c = random(0.8, 2.2);
  const phase = random(TWO_PI);

  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const n1 = noise(x * b + 0.1) - 0.5;
    const n2 = noise(x * c + 2.3) - 0.5;
    const y =
      0.5 +
      0.30 * sin((x * 6.0 + 0.2) * a * TWO_PI + phase) +
      0.22 * n1 +
      0.10 * n2;

    pts.push({ x, y: constrain(y, 0, 1) });
  }
  return pts;
}

function reconstruct(truth, s, budgetBits, shared) {
  if (shared) {
    // If both share generator code, Alice can send a seed.
    // With fewer bits, Bob gets a coarser (aliased) seed.
    const qb = constrain(budgetBits, 0, SEED_BITS);
    const sQ = quantizeIntToBits(s, qb, SEED_BITS);
    return genCurve(sQ, truth.length);
  } else {
    // No shared generator: Alice sends sampled y-values under a budget.
    // Both agree on where samples occur (evenly spaced), so indices cost 0 here.
    const m = samplesSent(budgetBits);
    if (m <= 1) {
      // essentially no info: flat line at 0.5
      return truth.map(p => ({ x: p.x, y: 0.5 }));
    }

    // choose m anchor indices evenly
    const anchors = [];
    for (let j = 0; j < m; j++) {
      const idx = round(map(j, 0, m - 1, 0, truth.length - 1));
      anchors.push(idx);
    }

    // transmit quantized y at anchors
    const qY = new Map();
    for (const idx of anchors) {
      qY.set(idx, quantize01(truth[idx].y, Y_BITS));
    }

    // reconstruct by linear interpolation between anchors
    const out = [];
    for (let i = 0; i < truth.length; i++) {
      out.push({ x: truth[i].x, y: interpAnchors(i, anchors, qY) });
    }
    return out;
  }
}

function samplesSent(budgetBits) {
  // only y values are sent; each costs Y_BITS
  return constrain(floor(budgetBits / Y_BITS), 0, N);
}

// --------- Helpers ---------

function quantize01(v, bits) {
  const levels = (1 << bits) - 1;
  const q = round(constrain(v, 0, 1) * levels) / levels;
  return q;
}

// quantize an integer s (assumed within 0..2^maxBits-1) down to qb bits
function quantizeIntToBits(s, qb, maxBits) {
  if (qb <= 0) return 0;
  const shift = maxBits - qb;
  const mask = (1 << maxBits) - 1;
  const clamped = s & mask;
  const coarse = (clamped >> shift) << shift;
  return coarse;
}

function interpAnchors(i, anchors, qY) {
  // find nearest anchors surrounding i
  let lo = anchors[0], hi = anchors[anchors.length - 1];
  for (let k = 0; k < anchors.length - 1; k++) {
    const a = anchors[k], b = anchors[k + 1];
    if (i >= a && i <= b) { lo = a; hi = b; break; }
  }
  const y0 = qY.get(lo);
  const y1 = qY.get(hi);
  if (lo === hi) return y0;
  const t = (i - lo) / (hi - lo);
  return lerp(y0, y1, t);
}

function meanAbsErr(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += abs(a[i].y - b[i].y);
  return sum / a.length;
}

// --------- Interaction ---------

function keyPressed() {
  if (key === 's' || key === 'S') {
    sharedModel = !sharedModel;
    redraw();
  } else if (key === '+' || key === '=') {
    bitsBudget = min(bitsBudget + 8, 512);
    redraw();
  } else if (key === '-' || key === '_') {
    bitsBudget = max(bitsBudget - 8, 0);
    redraw();
  } else if (key === 'r' || key === 'R') {
    seed = floor(random(0, 1 << SEED_BITS));
    redraw();
  }
}
