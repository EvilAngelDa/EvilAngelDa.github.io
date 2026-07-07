const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const hud = {
  health: document.getElementById("healthValue"),
  level: document.getElementById("levelValue"),
  kills: document.getElementById("killsValue"),
  time: document.getElementById("timeValue"),
  xpBar: document.getElementById("xpBar"),
  dashBar: document.getElementById("dashBar"),
  levelUpModal: document.getElementById("levelUpModal"),
  upgradeOptions: document.getElementById("upgradeOptions"),
  gameOverModal: document.getElementById("gameOverModal"),
  gameOverSummary: document.getElementById("gameOverSummary"),
  restartButton: document.getElementById("restartButton"),
};

const WORLD = {
  width: 2600,
  height: 2600,
};

const keys = new Set();

const upgradePool = [
  {
    id: "fireRate",
    name: "高频刀盘",
    desc: "攻击间隔降低 18%，清怪更快。",
    apply: (state) => {
      state.player.fireCooldownBase *= 0.82;
    },
  },
  {
    id: "bulletDamage",
    name: "重型刀片",
    desc: "子弹伤害 +12。",
    apply: (state) => {
      state.player.bulletDamage += 12;
    },
  },
  {
    id: "moveSpeed",
    name: "涡轮底盘",
    desc: "移动速度 +32。",
    apply: (state) => {
      state.player.speed += 32;
    },
  },
  {
    id: "maxHealth",
    name: "强化装甲",
    desc: "最大生命 +25，并立即恢复。",
    apply: (state) => {
      state.player.maxHealth += 25;
      state.player.health = Math.min(state.player.maxHealth, state.player.health + 25);
    },
  },
  {
    id: "magnet",
    name: "磁吸收割",
    desc: "经验吸附范围显著提升。",
    apply: (state) => {
      state.player.pickupRadius += 38;
    },
  },
  {
    id: "dash",
    name: "液压冲刺",
    desc: "冲刺更远，冷却更短。",
    apply: (state) => {
      state.player.dashCooldownBase *= 0.84;
      state.player.dashPower += 60;
    },
  },
];

function createState() {
  return {
    time: 0,
    paused: false,
    gameOver: false,
    kills: 0,
    cameraShake: 0,
    spawnTimer: 0,
    healOrbTimer: 12,
    projectiles: [],
    enemies: [],
    pickups: [],
    particles: [],
    player: {
      x: WORLD.width / 2,
      y: WORLD.height / 2,
      radius: 24,
      speed: 220,
      dashSpeed: 0,
      dashPower: 320,
      dashCooldownBase: 4.5,
      dashCooldown: 0,
      dashDuration: 0,
      facing: 0,
      fireCooldownBase: 0.4,
      fireCooldown: 0,
      bulletDamage: 28,
      bulletSpeed: 540,
      maxHealth: 100,
      health: 100,
      xp: 0,
      level: 1,
      xpToNext: 75,
      pickupRadius: 90,
      hurtCooldown: 0,
    },
  };
}

let game = createState();
let lastTime = performance.now();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function pickUpgrades(count) {
  const pool = [...upgradePool];
  const picks = [];
  while (picks.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (side === 0) {
    x = randomRange(0, WORLD.width);
    y = -80;
  } else if (side === 1) {
    x = WORLD.width + 80;
    y = randomRange(0, WORLD.height);
  } else if (side === 2) {
    x = randomRange(0, WORLD.width);
    y = WORLD.height + 80;
  } else {
    x = -80;
    y = randomRange(0, WORLD.height);
  }

  const wave = 1 + Math.floor(game.time / 18);
  game.enemies.push({
    x,
    y,
    radius: randomRange(18, 30),
    speed: randomRange(46, 76) + wave * 3,
    health: 32 + wave * 10,
    maxHealth: 32 + wave * 10,
    damage: 12 + wave * 1.4,
    tint: Math.random() > 0.84 ? "#f9b24b" : "#8ddf64",
  });
}

function spawnHealOrb() {
  game.pickups.push({
    x: randomRange(120, WORLD.width - 120),
    y: randomRange(120, WORLD.height - 120),
    radius: 12,
    type: "heal",
    value: 18,
  });
}

function fireProjectile() {
  const target = findNearestEnemy();
  if (!target) {
    return;
  }

  const dir = normalize(target.x - game.player.x, target.y - game.player.y);
  game.player.facing = Math.atan2(dir.y, dir.x);
  game.projectiles.push({
    x: game.player.x + dir.x * 22,
    y: game.player.y + dir.y * 22,
    vx: dir.x * game.player.bulletSpeed,
    vy: dir.y * game.player.bulletSpeed,
    radius: 7,
    damage: game.player.bulletDamage,
    life: 1.05,
  });
}

function findNearestEnemy() {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const enemy of game.enemies) {
    const d = distance(game.player, enemy);
    if (d < nearestDistance) {
      nearestDistance = d;
      nearest = enemy;
    }
  }
  return nearest;
}

function gainXp(amount) {
  game.player.xp += amount;
  while (game.player.xp >= game.player.xpToNext) {
    game.player.xp -= game.player.xpToNext;
    game.player.level += 1;
    game.player.xpToNext = Math.round(game.player.xpToNext * 1.34);
    openUpgradeModal();
  }
}

function openUpgradeModal() {
  game.paused = true;
  hud.levelUpModal.classList.remove("hidden");
  hud.upgradeOptions.innerHTML = "";

  for (const upgrade of pickUpgrades(3)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-card";
    button.innerHTML = `<h3>${upgrade.name}</h3><p>${upgrade.desc}</p>`;
    button.addEventListener("click", () => {
      upgrade.apply(game);
      hud.levelUpModal.classList.add("hidden");
      game.paused = false;
    });
    hud.upgradeOptions.appendChild(button);
  }
}

function endGame() {
  game.gameOver = true;
  game.paused = true;
  hud.gameOverSummary.textContent = `你存活了 ${game.time.toFixed(1)} 秒，击杀 ${game.kills} 只僵尸，达到 ${game.player.level} 级。`;
  hud.gameOverModal.classList.remove("hidden");
}

function resetGame() {
  game = createState();
  hud.levelUpModal.classList.add("hidden");
  hud.gameOverModal.classList.add("hidden");
  lastTime = performance.now();
}

function updatePlayer(dt) {
  const inputX = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
  const inputY = (keys.has("arrowdown") || keys.has("s") ? 1 : 0) - (keys.has("arrowup") || keys.has("w") ? 1 : 0);
  const dir = normalize(inputX, inputY);

  if (game.player.dashCooldown > 0) {
    game.player.dashCooldown -= dt;
  }

  if (game.player.dashDuration > 0) {
    game.player.dashDuration -= dt;
    game.player.x += Math.cos(game.player.facing) * game.player.dashSpeed * dt;
    game.player.y += Math.sin(game.player.facing) * game.player.dashSpeed * dt;
  } else if (inputX !== 0 || inputY !== 0) {
    game.player.facing = Math.atan2(dir.y, dir.x);
    game.player.x += dir.x * game.player.speed * dt;
    game.player.y += dir.y * game.player.speed * dt;
  }

  game.player.x = clamp(game.player.x, 40, WORLD.width - 40);
  game.player.y = clamp(game.player.y, 40, WORLD.height - 40);

  if (game.player.fireCooldown > 0) {
    game.player.fireCooldown -= dt;
  } else {
    fireProjectile();
    game.player.fireCooldown = game.player.fireCooldownBase;
  }

  if (game.player.hurtCooldown > 0) {
    game.player.hurtCooldown -= dt;
  }
}

function updateEnemies(dt) {
  for (const enemy of game.enemies) {
    const dir = normalize(game.player.x - enemy.x, game.player.y - enemy.y);
    enemy.x += dir.x * enemy.speed * dt;
    enemy.y += dir.y * enemy.speed * dt;

    const hitDistance = enemy.radius + game.player.radius;
    if (distance(enemy, game.player) < hitDistance && game.player.hurtCooldown <= 0) {
      game.player.health -= enemy.damage;
      game.player.hurtCooldown = 0.55;
      game.cameraShake = 10;
      if (game.player.health <= 0) {
        game.player.health = 0;
        endGame();
      }
    }
  }
}

function updateProjectiles(dt) {
  for (const projectile of game.projectiles) {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
  }

  for (const projectile of game.projectiles) {
    for (const enemy of game.enemies) {
      if (distance(projectile, enemy) < projectile.radius + enemy.radius) {
        enemy.health -= projectile.damage;
        projectile.life = 0;
        game.particles.push({
          x: enemy.x,
          y: enemy.y,
          life: 0.25,
          size: 10,
          color: "#ffe98a",
        });
        break;
      }
    }
  }

  game.projectiles = game.projectiles.filter((projectile) => projectile.life > 0);
}

function updateParticles(dt) {
  for (const particle of game.particles) {
    particle.life -= dt;
    particle.size *= 0.97;
  }
  game.particles = game.particles.filter((particle) => particle.life > 0);
}

function updatePickups(dt) {
  for (const pickup of game.pickups) {
    const d = distance(game.player, pickup);
    if (d < game.player.pickupRadius) {
      const dir = normalize(game.player.x - pickup.x, game.player.y - pickup.y);
      pickup.x += dir.x * 220 * dt;
      pickup.y += dir.y * 220 * dt;
    }

    if (d < pickup.radius + game.player.radius) {
      pickup.collected = true;
      if (pickup.type === "xp") {
        gainXp(pickup.value);
      }
      if (pickup.type === "heal") {
        game.player.health = Math.min(game.player.maxHealth, game.player.health + pickup.value);
      }
    }
  }

  game.pickups = game.pickups.filter((pickup) => !pickup.collected);
}

function cleanupDefeatedEnemies() {
  const survivors = [];
  for (const enemy of game.enemies) {
    if (enemy.health > 0) {
      survivors.push(enemy);
      continue;
    }

    game.kills += 1;
    game.cameraShake = 6;
    game.pickups.push({
      x: enemy.x,
      y: enemy.y,
      radius: 8,
      type: "xp",
      value: 18,
    });
    if (Math.random() > 0.88) {
      game.pickups.push({
        x: enemy.x + randomRange(-8, 8),
        y: enemy.y + randomRange(-8, 8),
        radius: 10,
        type: "heal",
        value: 10,
      });
    }
  }

  game.enemies = survivors;
}

function updateSpawning(dt) {
  const spawnInterval = Math.max(0.22, 1.05 - game.time * 0.012);
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    const count = game.time > 40 ? 3 : game.time > 20 ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      spawnEnemy();
    }
    game.spawnTimer = spawnInterval;
  }

  game.healOrbTimer -= dt;
  if (game.healOrbTimer <= 0) {
    spawnHealOrb();
    game.healOrbTimer = randomRange(10, 16);
  }
}

function updateHud() {
  hud.health.textContent = Math.round(game.player.health);
  hud.level.textContent = game.player.level;
  hud.kills.textContent = game.kills;
  hud.time.textContent = `${game.time.toFixed(1)}s`;
  hud.xpBar.style.width = `${(game.player.xp / game.player.xpToNext) * 100}%`;
  const dashPercent = game.player.dashCooldown <= 0
    ? 100
    : ((game.player.dashCooldownBase - game.player.dashCooldown) / game.player.dashCooldownBase) * 100;
  hud.dashBar.style.width = `${clamp(dashPercent, 0, 100)}%`;
}

function worldToScreen(x, y, camera) {
  return {
    x: x - camera.x,
    y: y - camera.y,
  };
}

function drawBackground(camera) {
  ctx.fillStyle = "#163229";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grid = 80;
  const offsetX = -(camera.x % grid);
  const offsetY = -(camera.y % grid);
  ctx.strokeStyle = "rgba(202, 255, 153, 0.08)";
  ctx.lineWidth = 1;

  for (let x = offsetX; x < canvas.width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = offsetY; y < canvas.height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  for (let i = 0; i < 36; i += 1) {
    const wx = (i * 197) % WORLD.width;
    const wy = (i * 317) % WORLD.height;
    const pos = worldToScreen(wx, wy, camera);
    ctx.fillStyle = "rgba(51, 81, 61, 0.6)";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(camera) {
  const pos = worldToScreen(game.player.x, game.player.y, camera);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(game.player.facing);

  ctx.fillStyle = game.player.hurtCooldown > 0 ? "#ffd3d3" : "#d8ff7a";
  ctx.beginPath();
  ctx.roundRect(-24, -18, 48, 36, 12);
  ctx.fill();

  ctx.fillStyle = "#223228";
  ctx.fillRect(6, -6, 28, 12);
  ctx.fillStyle = "#f8b84c";
  ctx.beginPath();
  ctx.arc(-8, 0, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.strokeStyle = "rgba(183, 255, 133, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, game.player.pickupRadius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawEnemies(camera) {
  for (const enemy of game.enemies) {
    const pos = worldToScreen(enemy.x, enemy.y, camera);
    ctx.fillStyle = enemy.tint;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#17331b";
    ctx.beginPath();
    ctx.arc(pos.x - enemy.radius * 0.25, pos.y - 3, 3.6, 0, Math.PI * 2);
    ctx.arc(pos.x + enemy.radius * 0.25, pos.y - 3, 3.6, 0, Math.PI * 2);
    ctx.fill();

    const hpWidth = enemy.radius * 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(pos.x - hpWidth / 2, pos.y - enemy.radius - 12, hpWidth, 5);
    ctx.fillStyle = "#ff7d7d";
    ctx.fillRect(pos.x - hpWidth / 2, pos.y - enemy.radius - 12, hpWidth * (enemy.health / enemy.maxHealth), 5);
  }
}

function drawProjectiles(camera) {
  for (const projectile of game.projectiles) {
    const pos = worldToScreen(projectile.x, projectile.y, camera);
    ctx.fillStyle = "#ffe88c";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPickups(camera) {
  for (const pickup of game.pickups) {
    const pos = worldToScreen(pickup.x, pickup.y, camera);
    ctx.fillStyle = pickup.type === "xp" ? "#8bf39b" : "#ff8d8d";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pickup.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(camera) {
  for (const particle of game.particles) {
    const pos = worldToScreen(particle.x, particle.y, camera);
    ctx.globalAlpha = particle.life * 3;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMinimap() {
  const width = 180;
  const height = 130;
  const x = canvas.width - width - 22;
  const y = 22;

  ctx.fillStyle = "rgba(4, 10, 8, 0.5)";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 18);
  ctx.fill();

  ctx.strokeStyle = "rgba(183, 255, 133, 0.18)";
  ctx.stroke();

  const px = x + (game.player.x / WORLD.width) * width;
  const py = y + (game.player.y / WORLD.height) * height;

  for (const enemy of game.enemies.slice(0, 35)) {
    ctx.fillStyle = "rgba(255, 105, 105, 0.8)";
    ctx.fillRect(
      x + (enemy.x / WORLD.width) * width,
      y + (enemy.y / WORLD.height) * height,
      3,
      3,
    );
  }

  ctx.fillStyle = "#d8ff79";
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();
}

function render() {
  const shakeX = game.cameraShake > 0 ? randomRange(-game.cameraShake, game.cameraShake) : 0;
  const shakeY = game.cameraShake > 0 ? randomRange(-game.cameraShake, game.cameraShake) : 0;
  const camera = {
    x: clamp(game.player.x - canvas.width / 2 + shakeX, 0, WORLD.width - canvas.width),
    y: clamp(game.player.y - canvas.height / 2 + shakeY, 0, WORLD.height - canvas.height),
  };

  drawBackground(camera);
  drawPickups(camera);
  drawEnemies(camera);
  drawProjectiles(camera);
  drawParticles(camera);
  drawPlayer(camera);
  drawMinimap();

  ctx.fillStyle = "rgba(4, 10, 8, 0.42)";
  ctx.beginPath();
  ctx.roundRect(22, 22, 228, 82, 18);
  ctx.fill();
  ctx.fillStyle = "#f4ffe9";
  ctx.font = "700 22px Trebuchet MS";
  ctx.fillText("Zombie Mower", 40, 54);
  ctx.font = "16px Trebuchet MS";
  ctx.fillStyle = "#a5b8a7";
  ctx.fillText(`波次强度 ${1 + Math.floor(game.time / 18)}`, 40, 82);
  ctx.fillText(`场上僵尸 ${game.enemies.length}`, 40, 102);
}

function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  if (!game.paused) {
    game.time += dt;
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    cleanupDefeatedEnemies();
    updatePickups(dt);
    updateParticles(dt);
    updateSpawning(dt);
    updateHud();
    if (game.cameraShake > 0) {
      game.cameraShake *= 0.86;
    }
  }

  render();
  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);

  if (event.key === "Shift" && game.player.dashCooldown <= 0 && !game.paused) {
    game.player.dashDuration = 0.18;
    game.player.dashCooldown = game.player.dashCooldownBase;
    game.player.dashSpeed = game.player.speed + game.player.dashPower;
    game.cameraShake = 4;
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

hud.restartButton.addEventListener("click", resetGame);

updateHud();
requestAnimationFrame(tick);
