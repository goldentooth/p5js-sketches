let worker;
let caState = [];
let cols = 800;
let cellSize = 1;
let gen = 0;
let rule = [];

let ruleInput, setRuleButton, detailSelect;

function ruleFromDecimal(n) {
  let bin = n.toString(2).padStart(8, '0');
  return bin.split('').map(bit => parseInt(bit, 10));
}

function setup() {
  createCanvas(cols * cellSize, 400);
  noStroke();
  frameRate(30);

  // Get HTML elements
  ruleInput = document.getElementById('rule-input');
  setRuleButton = document.getElementById('set-rule-button');
  detailSelect = document.getElementById('detail-select');

  // Add event listeners
  setRuleButton.addEventListener('click', applyRule);
  ruleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') applyRule();
  });
  detailSelect.addEventListener('change', updateDetailLevel);

  // Start CA
  applyRule();
}

function updateDetailLevel() {
  const detailLevel = detailSelect.value;
  
  switch(detailLevel) {
    case 'low':
      cols = 100;
      cellSize = 8;
      break;
    case 'medium':
      cols = 200;
      cellSize = 4;
      break;
    case 'high':
      cols = 400;
      cellSize = 2;
      break;
    case 'ultra':
    default:
      cols = 800;
      cellSize = 1;
      break;
  }
  
  // Resize canvas and restart simulation
  resizeCanvas(cols * cellSize, 400);
  applyRule();
}

function applyRule() {
  const ruleNum = constrain(parseInt(ruleInput.value) || 0, 0, 255);
  rule = ruleFromDecimal(ruleNum);

  gen = 0;
  clear();

  if (worker) worker.terminate();
  worker = new Worker(`ca-worker.js?v=${Date.now()}`);
  worker.postMessage({ type: 'init', cols });

  worker.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === 'state') {
      caState = msg.state;
      drawRow(caState, gen);
      gen++;
    }
  };
}

function draw() {
  worker.postMessage({
    type: 'step',
    rule,
  });
}

function drawRow(state, row) {
  for (let x = 0; x < state.length; x++) {
    fill(state[x] ? 0 : 255);
    rect(x * cellSize, row * cellSize, cellSize, cellSize);
  }
}
