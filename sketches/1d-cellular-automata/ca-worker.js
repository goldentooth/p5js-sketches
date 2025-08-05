let cols = 0;
let current = [];
let next = [];

onmessage = (e) => {
  const { rule, type } = e.data;

  if (type === 'init') {
    cols = e.data.cols;
    current = new Array(cols).fill(0);
    next = new Array(cols).fill(0);

    // seed: single ON cell in center
    current[Math.floor(cols / 2)] = 1;

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
