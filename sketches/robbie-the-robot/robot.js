const Actions = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'RANDOM', 'TAKE'];

const stateLength = 5; // Left, Right, Up, Down, Here
const genomeLength = Math.pow(3, stateLength); // 3 possible per position: 0,1,2

function randomGenome() {
  return Array.from({ length: genomeLength }, () =>
    Actions[Math.floor(Math.random() * Actions.length)]
  );
}

class Robot {
  constructor(genome) {
    this.genome = Array.isArray(genome) ? genome : randomGenome();
  }

  static fromRandom() {
    return new Robot(randomGenome());
  }

  static fromParents(r1, r2) {
    const split = Math.floor(Math.random() * genomeLength);
    return new Robot([...r1.genome.slice(0, split), ...r2.genome.slice(split)]);
  }

  mutate(rate = 0.01) {
    for (let i = 0; i < this.genome.length; i++) {
      if (Math.random() < rate) {
        this.genome[i] = Actions[Math.floor(Math.random() * Actions.length)];
      }
    }
  }

  getGeneIdx(state) {
    return state[0] * 81 + state[1] * 27 + state[2] * 9 + state[3] * 3 + state[4];
  }

  getAction(state) {
    return this.genome[this.getGeneIdx(state)];
  }
}
