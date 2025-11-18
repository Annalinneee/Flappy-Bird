const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

let gravity = 0.55;
let flapStrength = -9;
let pipeGap = 150;
let pipeWidth = 60;
let pipeSpeed = 2.5;
let spawnInterval = 1500;

let bird, pipes, score, bestScore, lastSpawn, running, restartBtn;
restartBtn = document.getElementById('restartBtn');

const colorPalette = [
  '#ffeb3b','#ff7043','#ff5252','#7c4dff',
  '#29b6f6','#66bb6a','#ffb74d','#f06292'
];

function createBird() {
  return {
    x: Math.floor(W * 0.28),
    y: Math.floor(H / 2),
    vy: 0,
    radius: 16,
    rotation: 0,
    colorIndex: 0,
    color: colorPalette[0],
    alive: true,
    flap() { this.vy = flapStrength; },
    update() {
      this.vy += gravity;
      this.y += this.vy;
      this.rotation = Math.max(-0.6, Math.min(1.2, this.vy / 12));
      if (this.y + this.radius > H) {
        this.y = H - this.radius;
        this.alive = false;
      }
      if (this.y - this.radius < 0) {
        this.y = this.radius;
        this.vy = 0;
      }
    },
    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI*2);
      ctx.fillStyle = this.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(6, -4, 4, 0, Math.PI*2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(7, -4, 1.8, 0, Math.PI*2);
      ctx.fillStyle = '#000';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-this.radius, -2);
      ctx.lineTo(-this.radius - 10, 0);
      ctx.lineTo(-this.radius, 6);
      ctx.fillStyle = '#ffb74d';
      ctx.fill();

      ctx.restore();
    }
  };
}

function createPipe(x) {
  const topH = Math.floor(Math.random() * (H - 220 - pipeGap)) + 60;
  return {
    x,
    w: pipeWidth,
    topH,
    bottomY: topH + pipeGap,
    passed: false,
    update() { this.x -= pipeSpeed; },
    draw(ctx) {
      ctx.fillStyle = '#2e7d32';
      roundRect(ctx, this.x, 0, this.w, this.topH, 8, true, false);
      roundRect(ctx, this.x, this.bottomY, this.w, H - this.bottomY, 8, true, false);

      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(this.x + 6, 6, this.w - 12, Math.max(this.topH - 12,0));
      ctx.fillRect(this.x + 6, this.bottomY + 6, this.w - 12, Math.max(H - this.bottomY - 12,0));
    }
  };
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function reset() {
  bird = createBird();
  pipes = [];
  score = 0;
  bestScore = Number(localStorage.getItem('flappy_best') || 0);
  lastSpawn = performance.now();
  running = true;
  restartBtn.style.display = 'none';

  pipes.push(createPipe(W + 40));
  pipes.push(createPipe(W + 40 + 220));
  updateBirdColor();
}

function updateBirdColor() {
  const idx = Math.min(colorPalette.length - 1, Math.floor(score / 5));
  bird.colorIndex = idx;
  bird.color = colorPalette[idx];
}

function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) < (r * r);
}

let lastTime = 0;
function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = ts - lastTime;
  lastTime = ts;

  if (ts - lastSpawn > spawnInterval) {
    pipes.push(createPipe(W + 40));
    lastSpawn = ts;
  }

  bird.update();
  for (let p of pipes) p.update();

  pipes = pipes.filter(p => p.x + p.w > -50);

  for (let p of pipes) {
    if (!p.passed && p.x + p.w < bird.x) {
      p.passed = true;
      score++;
      updateBirdColor();
      if (score % 10 === 0) pipeSpeed += 0.2;
    }
    if (
      circleRectCollision(bird.x, bird.y, bird.radius, p.x, 0, p.w, p.topH) ||
      circleRectCollision(bird.x, bird.y, bird.radius, p.x, p.bottomY, p.w, H - p.bottomY)
    ) {
      bird.alive = false;
    }
  }

  if (!bird.alive) running = false;

  drawScene();

  if (running) requestAnimationFrame(loop);
  else gameOver();
}

function drawScene() {
  ctx.clearRect(0,0,W,H);

  for (let i = 0; i < 6; i++) {
    const cx = (i * 123 + (performance.now()/30 % 480)) % (W + 200) - 100;
    ctx.beginPath();
    ctx.ellipse(cx, 80 + (i%2)*18, 40, 18, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
  }

  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(0, H - 48, W, 48);

  for (let p of pipes) p.draw(ctx);

  bird.draw(ctx);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(score, W/2, 90);

  ctx.font = '12px sans-serif';
  ctx.fillText('Color: ' + (bird.colorIndex + 1), 60, 28);
}

function gameOver() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('flappy_best', bestScore);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0,0,W,H);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', W/2, H/2 - 40);

  ctx.font = '20px sans-serif';
  ctx.fillText('Score: ' + score, W/2, H/2);
  ctx.fillText('Best score: ' + bestScore, W/2, H/2 + 30);

  restartBtn.style.display = 'block';
}

function flap() {
  if (!running) return;
  bird.flap();
}

function startOrFlap() {
  if (!running) {
    reset();
    lastTime = 0;
    requestAnimationFrame(loop);
  } else {
    flap();
  }
}

window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    startOrFlap();
  }
});

canvas.addEventListener('mousedown', e => {
  e.preventDefault();
  startOrFlap();
});
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  startOrFlap();
});

restartBtn.addEventListener('click', () => {
  reset();
  lastTime = 0;
  requestAnimationFrame(loop);
});

reset();
drawScene();
