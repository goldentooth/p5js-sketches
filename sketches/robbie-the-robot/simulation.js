class Simulation {
  constructor(world, robot, lifespan = 200) {
    this.world = world.copy();
    this.robot = robot;
    this.lifespan = lifespan;
    this.score = 0;
    this.x = Math.floor(Math.random() * this.world.width);
    this.y = Math.floor(Math.random() * this.world.height);
  }

  run() {
    while (this.lifespan-- > 0) {
      this.step();
    }
    return this.score;
  }

  step() {
    const idx = this.world.idx(this.x, this.y);
    const state = this.world.getState(idx);
    const action = this.robot.getAction(state);
    this.act(action);
  }

  act(action) {
    const idx = this.world.idx(this.x, this.y);
    switch (action) {
      case 'LEFT':
        if (this.world.hasLeft(idx)) {
          this.x--;
        }
        else {
          this.score -= 1;
        }
        break;
      case 'RIGHT':
        if (this.world.hasRight(idx)) {
          this.x++;
        }
        else {
          this.score -= 1;
        }
        break;
      case 'UP':
        if (this.world.hasUp(idx)) {
          this.y--;
        }
        else {
          this.score -= 1;
        }
        break;
      case 'DOWN':
        if (this.world.hasDown(idx)) {
          this.y++;
        }
        else {
          this.score -= 1;
        }
        break;
      case 'RANDOM':
        const choices = [];
        if (this.world.hasLeft(idx)) { choices.push('LEFT'); }
        if (this.world.hasRight(idx)) { choices.push('RIGHT'); }
        if (this.world.hasUp(idx)) { choices.push('UP'); }
        if (this.world.hasDown(idx)) { choices.push('DOWN'); }
        return this.act(choices[Math.floor(Math.random() * choices.length)]);
      case 'TAKE': {
        let idx = this.world.idx(this.x, this.y);
        if (this.world.hasCan(idx)) {
          this.world.takeCan(idx);
          this.score += 10;
        } else {
          this.score -= 1;
        }
        break;
      }
    }
  }
}