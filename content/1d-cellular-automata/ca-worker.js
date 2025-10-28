let cols = 0;
let current = [];
let next = [];

function generatePattern(pattern, cols) {
  const state = new Array(cols).fill(0);

  switch(pattern) {
    case 'single':
      state[Math.floor(cols / 2)] = 1;
      break;
    case 'random':
      for (let i = 0; i < cols; i++) {
        state[i] = Math.random() > 0.5 ? 1 : 0;
      }
      break;
    case 'alternating':
      for (let i = 0; i < cols; i++) {
        state[i] = i % 2;
      }
      break;
    case 'pairs':
      for (let i = 0; i < cols; i++) {
        state[i] = Math.floor(i / 2) % 2;
      }
      break;
    case 'quads':
      for (let i = 0; i < cols; i++) {
        state[i] = Math.floor(i / 4) % 2;
      }
      break;
    default:
      state[Math.floor(cols / 2)] = 1;
  }

  return state;
}

onmessage = (e) => {
  const { rule, type } = e.data;

  if (type === 'init') {
    cols = e.data.cols;
    const pattern = e.data.pattern || 'single';
    current = generatePattern(pattern, cols);
    next = new Array(cols).fill(0);

    postMessage({ type: 'state', state: current });
  }

  if (type === 'step') {
    for (let i = 0; i < cols; i++) {
      const left = current[(i - 1 + cols) % cols];
      const self = current[i];
      const right = current[(i + 1) % cols];
      const idx = (left << 2) | (self << 1) | right;
      next[i] = rule[7 - idx]; // rules stored high-bit first
    }
    [current, next] = [next, current]; // swap

    postMessage({ type: 'state', state: current });
  }
};
