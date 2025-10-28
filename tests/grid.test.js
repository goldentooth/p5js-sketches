import { createGrid } from '../src/';

describe('Grid', () => {
  it('should create a grid', () => {
    const grid = createGrid(5, 6);
    expect(grid.columns).toBe(5);
    expect(grid.rows).toBe(6);
  });
});
