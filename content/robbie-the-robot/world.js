class World {
  constructor(width, height, cells) {
    this.width = width;
    this.height = height;
    this.cells = cells;
  }

  static fromRandom(width, height, cans) {
    const cells = new Array(width * height).fill(false);
    while (cans > 0) {
      let idx = Math.floor(Math.random() * cells.length);
      if (!cells[idx]) {
        cells[idx] = true;
        cans--;
      }
    }
    return new World(width, height, cells);
  }

  copy() {
    return new World(this.width, this.height, [...this.cells]);
  }

  idx(x, y) {
    return y * this.width + x;
  }

  xy(idx) {
    return [idx % this.width, Math.floor(idx / this.width)];
  }

  has(idx) {
    return idx >= 0 && idx < this.cells.length;
  }

  hasLeft(idx) {
    let [x] = this.xy(idx);
    return x > 0;
  }

  hasRight(idx) {
    let [x] = this.xy(idx);
    return x < this.width - 1;
  }

  hasUp(idx) {
    let [, y] = this.xy(idx);
    return y > 0;
  }

  hasDown(idx) {
    let [, y] = this.xy(idx);
    return y < this.height - 1;
  }

  getLeft(idx) { return this.idx(this.xy(idx)[0] - 1, this.xy(idx)[1]); }
  getRight(idx) { return this.idx(this.xy(idx)[0] + 1, this.xy(idx)[1]); }
  getUp(idx) { return this.idx(this.xy(idx)[0], this.xy(idx)[1] - 1); }
  getDown(idx) { return this.idx(this.xy(idx)[0], this.xy(idx)[1] + 1); }

  hasCan(idx) { return this.cells[idx]; }

  getStateBit(idx) {
    if (!this.has(idx)) return 0;
    return this.hasCan(idx) ? 2 : 1;
  }

  getState(idx) {
    return [
      this.hasLeft(idx) ? this.getStateBit(this.getLeft(idx)) : 0,
      this.hasRight(idx) ? this.getStateBit(this.getRight(idx)) : 0,
      this.hasUp(idx) ? this.getStateBit(this.getUp(idx)) : 0,
      this.hasDown(idx) ? this.getStateBit(this.getDown(idx)) : 0,
      this.getStateBit(idx),
    ];
  }

  takeCan(idx) {
    this.cells[idx] = false;
  }
}
