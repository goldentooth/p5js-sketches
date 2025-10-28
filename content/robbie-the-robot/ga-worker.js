importScripts('world.js', 'robot.js', 'simulation.js');

onmessage = function (e) {
  const { type, popSize, generations, worldWidth, worldHeight, cans } = e.data;
  if (type === 'start') {
    runGA(popSize, generations, worldWidth, worldHeight, cans);
  }
};

const TRIALS_PER_BOT = 10;

function runGA(popSize, generations, worldWidth, worldHeight, cans) {
  let population = Array.from({ length: popSize }, () => Robot.fromRandom());

  for (let gen = 0; gen < generations; gen++) {
    let scored = population.map(bot => {
      let score = 0;
      for (let trial = 0; trial < TRIALS_PER_BOT; trial++) {
        score += new Simulation(World.fromRandom(worldWidth, worldHeight, cans), bot).run();
      }
      return { bot, score: Math.floor(score / TRIALS_PER_BOT) };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    const worst = scored[scored.length - 1];

    postMessage({
      type: 'status',
      gen,
      bestScore: best.score,
      bestBot: best.bot.genome,
      worstScore: worst.score,
    });

    const newPop = [best.bot];
    while (newPop.length < popSize) {
      const p1 = scored[Math.floor(Math.random() * 10)].bot;
      const p2 = scored[Math.floor(Math.random() * 10)].bot;
      const child = Robot.fromParents(p1, p2);
      child.mutate();
      newPop.push(child);
    }
    population = newPop;
  }

  postMessage({ type: 'done' });
}
