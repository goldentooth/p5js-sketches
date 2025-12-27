// Configuration
const CANVAS_SIZE = 500;
const BOUNDARY_RADIUS = 220;
const INITIAL_SPEED = 4;
const SPAWN_COOLDOWN_FRAMES = 30;

// State
let balls = [];
let ballRadius = 8;
let maxBalls = 50;
let centerX, centerY;

class Ball {
  constructor(x, y, vx, vy, radius) {
    this.pos = createVector(x, y);
    this.vel = createVector(vx, vy);
    this.radius = radius;
    this.col = color(
      random(100, 255),
      random(100, 255),
      random(100, 255)
    );
    this.spawnCooldown = SPAWN_COOLDOWN_FRAMES;
  }

  update() {
    this.pos.add(this.vel);
    this.bounceOffBoundary();
    if (this.spawnCooldown > 0) {
      this.spawnCooldown--;
    }
  }

  canSpawn() {
    return this.spawnCooldown === 0;
  }

  resetCooldown() {
    this.spawnCooldown = SPAWN_COOLDOWN_FRAMES;
  }

  bounceOffBoundary() {
    // Vector from center to ball
    const toCenter = createVector(centerX - this.pos.x, centerY - this.pos.y);
    const distFromCenter = toCenter.mag();
    const maxDist = BOUNDARY_RADIUS - this.radius;

    if (distFromCenter > maxDist) {
      // Normal pointing inward (toward center)
      const normal = toCenter.copy().normalize();

      // Reflect velocity: v' = v - 2(v.n)n
      const dot = this.vel.dot(normal);
      if (dot < 0) {
        // Only reflect if moving away from center
        this.vel.sub(p5.Vector.mult(normal, 2 * dot));
      }

      // Push ball back inside
      this.pos = createVector(centerX, centerY)
        .sub(normal.mult(maxDist));

      // Add tiny random jitter to velocity
      this.vel.x += random(-0.2, 0.2);
      this.vel.y += random(-0.2, 0.2);
    }
  }

  draw() {
    fill(this.col);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.radius * 2);
  }

  collidesWith(other) {
    const dist = p5.Vector.dist(this.pos, other.pos);
    return dist < this.radius + other.radius;
  }

  getCollisionPoint(other) {
    // Midpoint between the two ball centers
    return p5.Vector.lerp(this.pos, other.pos, 0.5);
  }
}

function resolveCollision(ball1, ball2) {
  // Get collision normal (from ball1 to ball2)
  const normal = p5.Vector.sub(ball2.pos, ball1.pos);
  const dist = normal.mag();

  // Avoid division by zero if balls are at same position
  if (dist === 0) return false;
  normal.div(dist);

  // Separate balls first to prevent overlap
  const overlap = (ball1.radius + ball2.radius) - dist;
  if (overlap > 0) {
    const separation = p5.Vector.mult(normal, overlap / 2 + 0.5);
    ball1.pos.sub(separation);
    ball2.pos.add(separation);
  }

  // Relative velocity
  const relVel = p5.Vector.sub(ball1.vel, ball2.vel);
  const velAlongNormal = relVel.dot(normal);

  // Don't resolve if velocities are already separating
  if (velAlongNormal < 0) return false;

  // Elastic collision (equal mass): swap velocity components along normal
  ball1.vel.sub(p5.Vector.mult(normal, velAlongNormal));
  ball2.vel.add(p5.Vector.mult(normal, velAlongNormal));

  return true;
}

function spawnBall(x, y) {
  if (balls.length >= maxBalls) return;

  // Random velocity direction
  const angle = random(TWO_PI);
  const speed = random(2, INITIAL_SPEED);
  const vx = cos(angle) * speed;
  const vy = sin(angle) * speed;

  balls.push(new Ball(x, y, vx, vy, ballRadius));
  updateCountDisplay();
}

function updateCountDisplay() {
  const countEl = document.getElementById('ball-count');
  if (countEl) {
    countEl.textContent = `Balls: ${balls.length}`;
  }
}

function createInitialBalls() {
  balls = [];

  // Two balls starting near center with opposite velocities
  const offset = 50;
  balls.push(new Ball(
    centerX - offset,
    centerY,
    INITIAL_SPEED,
    random(-1, 1),
    ballRadius
  ));
  balls.push(new Ball(
    centerX + offset,
    centerY,
    -INITIAL_SPEED,
    random(-1, 1),
    ballRadius
  ));

  updateCountDisplay();
}

function setup() {
  createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  centerX = width / 2;
  centerY = height / 2;

  // Set up sliders
  const sizeSlider = document.getElementById('size-slider');
  const sizeValue = document.getElementById('size-value');
  if (sizeSlider) {
    sizeSlider.addEventListener('input', () => {
      ballRadius = parseInt(sizeSlider.value);
      sizeValue.textContent = ballRadius;
      // Update existing balls
      balls.forEach(ball => ball.radius = ballRadius);
    });
  }

  const limitSlider = document.getElementById('limit-slider');
  const limitValue = document.getElementById('limit-value');
  if (limitSlider) {
    limitSlider.addEventListener('input', () => {
      maxBalls = parseInt(limitSlider.value);
      limitValue.textContent = maxBalls;
    });
  }

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', createInitialBalls);
  }

  createInitialBalls();
}

function draw() {
  background(30);

  // Draw boundary circle
  noFill();
  stroke(100);
  strokeWeight(3);
  ellipse(centerX, centerY, BOUNDARY_RADIUS * 2);

  // Update all balls
  for (const ball of balls) {
    ball.update();
  }

  // Check collisions between balls
  const newBallPositions = [];
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      if (balls[i].collidesWith(balls[j])) {
        const collisionPoint = balls[i].getCollisionPoint(balls[j]);
        const didCollide = resolveCollision(balls[i], balls[j]);
        // Only spawn if both balls can spawn (cooldown expired)
        if (didCollide &&
            balls[i].canSpawn() && balls[j].canSpawn() &&
            balls.length + newBallPositions.length < maxBalls) {
          newBallPositions.push(collisionPoint);
          balls[i].resetCooldown();
          balls[j].resetCooldown();
        }
      }
    }
  }

  // Spawn new balls after collision checks
  for (const pos of newBallPositions) {
    spawnBall(pos.x, pos.y);
  }

  // Draw all balls
  for (const ball of balls) {
    ball.draw();
  }
}
