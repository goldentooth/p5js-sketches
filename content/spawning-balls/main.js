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
let trailsEnabled = false;
let trailLength = 20;

class Ball {
  constructor(x, y, vx, vy, radius, parentColor1 = null, parentColor2 = null) {
    this.pos = createVector(x, y);
    this.vel = createVector(vx, vy);
    this.radius = radius;
    this.col = this.generateColor(parentColor1, parentColor2);
    this.spawnCooldown = SPAWN_COOLDOWN_FRAMES;
    this.trail = [];
    this.spawnScale = 1.8; // Start enlarged for pulse effect
  }

  generateColor(parent1, parent2) {
    if (parent1 && parent2) {
      // Blend parent colors with slight random variation
      const r = (red(parent1) + red(parent2)) / 2 + random(-20, 20);
      const g = (green(parent1) + green(parent2)) / 2 + random(-20, 20);
      const b = (blue(parent1) + blue(parent2)) / 2 + random(-20, 20);
      return color(constrain(r, 50, 255), constrain(g, 50, 255), constrain(b, 50, 255));
    }
    return color(random(100, 255), random(100, 255), random(100, 255));
  }

  update() {
    // Track trail
    this.trail.push(this.pos.copy());
    if (this.trail.length > trailLength) {
      this.trail.shift();
    }

    this.pos.add(this.vel);
    this.bounceOffBoundary();

    if (this.spawnCooldown > 0) {
      this.spawnCooldown--;
    }

    // Decay spawn pulse
    if (this.spawnScale > 1) {
      this.spawnScale = lerp(this.spawnScale, 1, 0.15);
      if (this.spawnScale < 1.01) this.spawnScale = 1;
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

  drawTrail() {
    if (!trailsEnabled || this.trail.length < 2) return;

    noFill();
    for (let i = 1; i < this.trail.length; i++) {
      const alpha = map(i, 0, this.trail.length, 0, 150);
      const weight = map(i, 0, this.trail.length, 1, this.radius * 1.5);
      stroke(red(this.col), green(this.col), blue(this.col), alpha);
      strokeWeight(weight);
      line(this.trail[i - 1].x, this.trail[i - 1].y, this.trail[i].x, this.trail[i].y);
    }
  }

  draw() {
    this.drawTrail();

    // Apply spawn pulse scale
    const displayRadius = this.radius * this.spawnScale;

    fill(this.col);
    noStroke();
    ellipse(this.pos.x, this.pos.y, displayRadius * 2);

    // Glow effect during pulse
    if (this.spawnScale > 1.05) {
      const glowAlpha = map(this.spawnScale, 1, 1.8, 0, 100);
      fill(red(this.col), green(this.col), blue(this.col), glowAlpha);
      ellipse(this.pos.x, this.pos.y, displayRadius * 3);
    }
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

function spawnBall(x, y, parentColor1 = null, parentColor2 = null) {
  if (balls.length >= maxBalls) return;

  // Random velocity direction
  const angle = random(TWO_PI);
  const speed = random(2, INITIAL_SPEED);
  const vx = cos(angle) * speed;
  const vy = sin(angle) * speed;

  balls.push(new Ball(x, y, vx, vy, ballRadius, parentColor1, parentColor2));
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
  const ball1 = new Ball(
    centerX - offset,
    centerY,
    INITIAL_SPEED,
    random(-1, 1),
    ballRadius
  );
  ball1.spawnScale = 1; // No pulse for initial balls

  const ball2 = new Ball(
    centerX + offset,
    centerY,
    -INITIAL_SPEED,
    random(-1, 1),
    ballRadius
  );
  ball2.spawnScale = 1; // No pulse for initial balls

  balls.push(ball1, ball2);
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
      // Remove excess balls (keep the oldest ones)
      if (balls.length > maxBalls) {
        balls.length = maxBalls;
        updateCountDisplay();
      }
    });
  }

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', createInitialBalls);
  }

  const trailsCheckbox = document.getElementById('trails-checkbox');
  if (trailsCheckbox) {
    trailsCheckbox.addEventListener('change', () => {
      trailsEnabled = trailsCheckbox.checked;
    });
  }

  const trailSlider = document.getElementById('trail-slider');
  const trailValue = document.getElementById('trail-value');
  if (trailSlider) {
    trailSlider.addEventListener('input', () => {
      trailLength = parseInt(trailSlider.value);
      trailValue.textContent = trailLength;
    });
  }

  createInitialBalls();
}

function mousePressed() {
  // Check if click is inside the canvas
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;

  // Check if click is inside the boundary circle
  const distFromCenter = dist(mouseX, mouseY, centerX, centerY);
  if (distFromCenter > BOUNDARY_RADIUS - ballRadius) return;

  // Zap a random ball if at limit
  if (balls.length >= maxBalls) {
    const idx = floor(random(balls.length));
    balls.splice(idx, 1);
  }

  spawnBall(mouseX, mouseY);
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
  const newBallSpawns = [];
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      if (balls[i].collidesWith(balls[j])) {
        const collisionPoint = balls[i].getCollisionPoint(balls[j]);
        const didCollide = resolveCollision(balls[i], balls[j]);
        // Only spawn if both balls can spawn (cooldown expired)
        if (didCollide &&
            balls[i].canSpawn() && balls[j].canSpawn() &&
            balls.length + newBallSpawns.length < maxBalls) {
          newBallSpawns.push({
            pos: collisionPoint,
            color1: balls[i].col,
            color2: balls[j].col
          });
          balls[i].resetCooldown();
          balls[j].resetCooldown();
        }
      }
    }
  }

  // Spawn new balls after collision checks
  for (const spawn of newBallSpawns) {
    spawnBall(spawn.pos.x, spawn.pos.y, spawn.color1, spawn.color2);
  }

  // Draw all balls
  for (const ball of balls) {
    ball.draw();
  }
}
