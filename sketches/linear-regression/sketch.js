const MARGIN = 10;
const WIDTH = 400;
const HEIGHT = 400;
const NUMBER_OF_POINTS = 30;
const STEPS_PER_FRAME = 100;

let currentTrick = "simple";
let trickSelector;
let datapoints;
let predictedWeight;
let predictedBias;
let isTraining = false;

function regenerate() {
  datapoints = [];
  const randomWeight = random(-1, 1);
  const randomBias = random(-20, 20);
  predictedWeight = random(-1, 1);
  predictedBias = random(-20, 20);
  for (let i = 0; i < NUMBER_OF_POINTS; i++) {
    let x = random(-WIDTH / 2, WIDTH / 2);
    let y = (randomWeight * x + randomBias) + random(-30, 30);
    datapoints.push([x, y]);
  }
}

function trainStep() {

  for (let i = 0; i < STEPS_PER_FRAME; i++) {
    const [x, y] = random(datapoints);
    const yHat = predict(x);
    const error = y - yHat;

    if (currentTrick === "simple") {
      // Same quadrant-based update
      const ETA = 0.0002;
      const ETA2 = 0.008;
      if (y > yHat && x > 0) {
        predictedWeight += ETA;
        predictedBias += ETA2;
      } else if (y > yHat && x < 0) {
        predictedWeight -= ETA;
        predictedBias += ETA2;
      } else if (y < yHat && x > 0) {
        predictedWeight -= ETA;
        predictedBias -= ETA2;
      } else {
        predictedWeight += ETA;
        predictedBias -= ETA2;
      }
    }

    else if (currentTrick === "square") {
      const ETA = 0.00000005;
      const ETA2 = 0.0005;
      // ∇(error²) = -2 * error
      predictedWeight += ETA * error * x;
      predictedBias += ETA2 * error;
    }

    else if (currentTrick === "absolute") {
      const ETA = 0.000005;
      const ETA2 = 0.005;
      // ∇(|error|) = sign(error)
      const sign = Math.sign(error);
      predictedWeight += ETA * sign * x;
      predictedBias += ETA2 * sign;
    }
  }
}

function predict(x) {
  return predictedWeight * x + predictedBias;
}

function setup() {
  createCanvas(WIDTH, HEIGHT);

  // Wire up HTML controls
  document.getElementById('regenerate-btn').addEventListener('click', regenerate);
  document.getElementById('train-btn').addEventListener('click', () => isTraining = !isTraining);
  document.getElementById('algorithm-select').addEventListener('change', (e) => {
    currentTrick = e.target.value;
  });

  regenerate();
}

function draw() {
  background(220);
  translate(width / 2, height / 2);
  scale(1, -1);

  // Axes
  stroke(0);
  strokeWeight(1);
  line(-width, 0, width, 0);
  line(0, -height, 0, height);

  // Datapoints
  stroke(0);
  strokeWeight(5);
  for (let [x, y] of datapoints) {
    point(x, y);
  }

  // Regression line
  stroke(255, 0, 0);
  strokeWeight(2);
  line(-width, predict(-width), width, predict(width));

  // Training step
  if (isTraining) {
    trainStep();
  }
}
