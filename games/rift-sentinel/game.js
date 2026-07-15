(() => {
  "use strict";

  const GAME_WIDTH = 720;
  const GAME_HEIGHT = 1080;
  const DEFENSE_LINE = 1018;
  const ui = {
    loading: document.querySelector("[data-loading]"),
    startOverlay: document.querySelector("[data-start-overlay]"),
    pauseOverlay: document.querySelector("[data-pause-overlay]"),
    upgradeOverlay: document.querySelector("[data-upgrade-overlay]"),
    upgradeOptions: document.querySelector("[data-upgrade-options]"),
    gameOver: document.querySelector("[data-game-over]"),
    startButton: document.querySelector("[data-start]"),
    restartButton: document.querySelector("[data-restart]"),
    resumeButton: document.querySelector("[data-resume]"),
    pauseButton: document.querySelector("[data-pause]"),
    audioButton: document.querySelector("[data-audio]"),
    moveLeft: document.querySelector("[data-move-left]"),
    moveRight: document.querySelector("[data-move-right]"),
    engineStatus: document.querySelector("[data-engine-status]"),
    runState: document.querySelector("[data-run-state]"),
    score: document.querySelector("[data-score]"),
    highScore: document.querySelector("[data-high-score]"),
    healthText: document.querySelector("[data-health-text]"),
    healthBar: document.querySelector("[data-health-bar]"),
    shieldText: document.querySelector("[data-shield-text]"),
    shieldBar: document.querySelector("[data-shield-bar]"),
    xpText: document.querySelector("[data-xp-text]"),
    xpBar: document.querySelector("[data-xp-bar]"),
    wave: document.querySelector("[data-wave]"),
    level: document.querySelector("[data-level]"),
    kills: document.querySelector("[data-kills]"),
    combo: document.querySelector("[data-combo]"),
    weaponRank: document.querySelector("[data-weapon-rank]"),
    damage: document.querySelector("[data-damage]"),
    fireRate: document.querySelector("[data-fire-rate]"),
    shotCount: document.querySelector("[data-shot-count]"),
    pierce: document.querySelector("[data-pierce]"),
    crit: document.querySelector("[data-crit]"),
    speed: document.querySelector("[data-speed]"),
    missionLog: document.querySelector("[data-mission-log]"),
    announcement: document.querySelector("[data-announcement]"),
    bossHud: document.querySelector("[data-boss-hud]"),
    bossHealthText: document.querySelector("[data-boss-health-text]"),
    bossHealthBar: document.querySelector("[data-boss-health-bar]"),
    finalScore: document.querySelector("[data-final-score]"),
    finalWave: document.querySelector("[data-final-wave]"),
    finalKills: document.querySelector("[data-final-kills]"),
    fps: document.querySelector("[data-fps-label]"),
  };

  const audioState = {
    enabled: true,
    context: null,
    lastShotAt: 0,
  };
  let activeScene = null;
  let touchDirection = 0;
  let announcementTimer = 0;

  function readHighScore() {
    try {
      return Number.parseInt(localStorage.getItem("rift-sentinel-high-score") || "0", 10) || 0;
    } catch {
      return 0;
    }
  }

  function saveHighScore(score) {
    try {
      localStorage.setItem("rift-sentinel-high-score", String(score));
    } catch {
      // The run remains playable when storage is unavailable.
    }
  }

  function padScore(value) {
    return Math.max(0, Math.round(value)).toString().padStart(6, "0");
  }

  function setMeter(element, ratio) {
    if (element) {
      element.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio || 0))})`;
    }
  }

  function romanRank(value) {
    const ranks = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return ranks[Math.min(ranks.length - 1, Math.max(0, value - 1))];
  }

  function renderHud(state) {
    if (!state) return;

    ui.score.textContent = padScore(state.score);
    ui.highScore.textContent = padScore(Math.max(state.highScore, state.score));
    ui.healthText.textContent = `${Math.ceil(state.health)} / ${state.maxHealth}`;
    ui.shieldText.textContent = `${Math.ceil(state.shield)} / ${state.maxShield}`;
    ui.xpText.textContent = `${state.xp} / ${state.nextXp}`;
    ui.wave.textContent = String(state.wave).padStart(2, "0");
    ui.level.textContent = String(state.level).padStart(2, "0");
    ui.kills.textContent = String(state.kills).padStart(3, "0");
    ui.combo.textContent = `x${Math.max(1, state.combo)}`;
    ui.weaponRank.textContent = `MK-${romanRank(Math.min(10, 1 + Math.floor(state.weaponPower / 2)))}`;
    ui.damage.textContent = Math.round(state.damage);
    ui.fireRate.textContent = `${(1000 / state.fireRate).toFixed(1)}/s`;
    ui.shotCount.textContent = state.shots;
    ui.pierce.textContent = state.pierce;
    ui.crit.textContent = `${Math.round(state.crit * 100)}%`;
    ui.speed.textContent = Math.round(state.moveSpeed);
    setMeter(ui.healthBar, state.health / state.maxHealth);
    setMeter(ui.shieldBar, state.shield / state.maxShield);
    setMeter(ui.xpBar, state.xp / state.nextXp);

    if (state.boss) {
      const ratio = state.boss.health / state.boss.maxHealth;
      ui.bossHud.hidden = false;
      ui.bossHealthText.textContent = `${Math.max(0, Math.ceil(ratio * 100))}%`;
      ui.bossHealthBar.style.transform = `scaleX(${Math.max(0, ratio)})`;
    } else {
      ui.bossHud.hidden = true;
    }
  }

  function setRunState(label, mode = "idle") {
    ui.runState.textContent = label;
    ui.runState.dataset.mode = mode;
  }

  function logEvent(message, code = "SYS") {
    const item = document.createElement("li");
    const time = document.createElement("time");
    const text = document.createElement("span");
    time.textContent = code;
    text.textContent = message;
    item.append(time, text);
    ui.missionLog.prepend(item);

    while (ui.missionLog.children.length > 6) {
      ui.missionLog.lastElementChild?.remove();
    }
  }

  function announce(message, duration = 1500) {
    window.clearTimeout(announcementTimer);
    ui.announcement.textContent = message;
    ui.announcement.classList.add("is-visible");
    announcementTimer = window.setTimeout(() => {
      ui.announcement.classList.remove("is-visible");
    }, duration);
  }

  function ensureAudio() {
    if (!audioState.enabled) return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!audioState.context) audioState.context = new AudioContext();
    if (audioState.context.state === "suspended") audioState.context.resume();
    return audioState.context;
  }

  function playTone(kind) {
    if (!audioState.enabled) return;
    const context = ensureAudio();
    if (!context) return;

    const now = context.currentTime;
    if (kind === "shot" && now - audioState.lastShotAt < 0.075) return;
    if (kind === "shot") audioState.lastShotAt = now;

    const settings = {
      shot: { frequency: 480, end: 220, duration: 0.055, volume: 0.014, type: "square" },
      hit: { frequency: 150, end: 90, duration: 0.06, volume: 0.02, type: "sawtooth" },
      damage: { frequency: 92, end: 48, duration: 0.18, volume: 0.045, type: "sawtooth" },
      upgrade: { frequency: 420, end: 880, duration: 0.22, volume: 0.035, type: "sine" },
      pickup: { frequency: 620, end: 920, duration: 0.12, volume: 0.025, type: "triangle" },
      boss: { frequency: 72, end: 38, duration: 0.42, volume: 0.055, type: "sawtooth" },
    }[kind];
    if (!settings) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = settings.type;
    oscillator.frequency.setValueAtTime(settings.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(settings.end, now + settings.duration);
    gain.gain.setValueAtTime(settings.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + settings.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + settings.duration);
  }

  const upgrades = [
    {
      id: "damage",
      code: "DMG+",
      title: "聚能弹头",
      description: "每发子弹伤害 +5。",
      max: 8,
      apply(scene) { scene.weapon.damage += 5; },
    },
    {
      id: "rate",
      code: "RAPID",
      title: "脉冲加速器",
      description: "射击间隔缩短 13%。",
      max: 7,
      apply(scene) { scene.weapon.fireRate = Math.max(118, scene.weapon.fireRate * 0.87); },
    },
    {
      id: "shots",
      code: "MULTI",
      title: "分裂弹道",
      description: "每轮额外发射一条弹道。",
      max: 4,
      apply(scene) { scene.weapon.shots = Math.min(5, scene.weapon.shots + 1); },
    },
    {
      id: "pierce",
      code: "PHASE",
      title: "相位穿透",
      description: "子弹可额外穿透一个目标。",
      max: 3,
      apply(scene) { scene.weapon.pierce += 1; },
    },
    {
      id: "crit",
      code: "CRIT",
      title: "弱点测算",
      description: "暴击率 +8%，暴击造成双倍伤害。",
      max: 5,
      apply(scene) { scene.weapon.crit = Math.min(0.48, scene.weapon.crit + 0.08); },
    },
    {
      id: "mobility",
      code: "MOVE",
      title: "侧向推进器",
      description: "左右移动速度 +45。",
      max: 4,
      apply(scene) { scene.weapon.moveSpeed = Math.min(560, scene.weapon.moveSpeed + 45); },
    },
    {
      id: "armor",
      code: "HULL",
      title: "纳米装甲",
      description: "最大生命 +20，并立刻修复 20。",
      max: 5,
      apply(scene) {
        scene.maxHealth += 20;
        scene.health = Math.min(scene.maxHealth, scene.health + 20);
      },
    },
    {
      id: "shield",
      code: "SHIELD",
      title: "折射护盾",
      description: "护盾上限 +15，并补充 35 护盾。",
      max: 5,
      apply(scene) {
        scene.maxShield += 15;
        scene.shield = Math.min(scene.maxShield, scene.shield + 35);
      },
    },
    {
      id: "caliber",
      code: "CORE",
      title: "扩容能量芯",
      description: "弹体尺寸 +16%，伤害额外 +2。",
      max: 4,
      apply(scene) {
        scene.weapon.bulletScale += 0.16;
        scene.weapon.damage += 2;
      },
    },
    {
      id: "repair",
      code: "REPAIR",
      title: "紧急修复",
      description: "立即恢复 40 点生命。",
      max: Number.POSITIVE_INFINITY,
      apply(scene) { scene.health = Math.min(scene.maxHealth, scene.health + 40); },
    },
  ];

  function createGeneratedTextures(scene) {
    if (scene.textures.exists("sentinel-player")) return;

    const player = scene.add.graphics();
    player.fillStyle(0x07101f, 0.95).fillTriangle(48, 2, 39, 88, 57, 88);
    player.fillStyle(0x50e9ff, 1).fillPoints([
      new Phaser.Geom.Point(48, 2),
      new Phaser.Geom.Point(62, 54),
      new Phaser.Geom.Point(89, 82),
      new Phaser.Geom.Point(58, 76),
      new Phaser.Geom.Point(48, 101),
      new Phaser.Geom.Point(38, 76),
      new Phaser.Geom.Point(7, 82),
      new Phaser.Geom.Point(34, 54),
    ], true);
    player.fillStyle(0x5673ff, 1).fillTriangle(34, 54, 7, 82, 39, 72);
    player.fillStyle(0xff5ebc, 1).fillTriangle(62, 54, 89, 82, 57, 72);
    player.fillStyle(0xeaffff, 1).fillTriangle(48, 5, 41, 55, 55, 55);
    player.fillStyle(0x163c72, 1).fillEllipse(48, 42, 12, 29);
    player.lineStyle(2, 0xd9ffff, 0.9).strokeTriangle(48, 4, 37, 78, 59, 78);
    player.fillStyle(0xffffff, 1).fillCircle(48, 25, 3);
    player.fillStyle(0x8ef4ff, 1).fillRoundedRect(34, 83, 9, 17, 4);
    player.fillStyle(0xff8ad5, 1).fillRoundedRect(53, 83, 9, 17, 4);
    player.generateTexture("sentinel-player", 96, 104).destroy();

    const bullet = scene.add.graphics();
    bullet.fillStyle(0xffffff, 1).fillRoundedRect(5, 0, 8, 28, 4);
    bullet.fillStyle(0x50e9ff, 0.74).fillRoundedRect(2, 8, 14, 28, 7);
    bullet.generateTexture("sentinel-bullet", 18, 38).destroy();

    const basic = scene.add.graphics();
    basic.fillStyle(0xff587d, 1).fillCircle(32, 32, 27);
    basic.lineStyle(3, 0xffcad5, 0.9).strokeCircle(32, 32, 23);
    basic.fillStyle(0x120710, 1).fillCircle(23, 27, 5).fillCircle(41, 27, 5);
    basic.fillStyle(0xffffff, 1).fillCircle(24, 26, 2).fillCircle(42, 26, 2);
    basic.generateTexture("enemy-basic", 64, 64).destroy();

    const swift = scene.add.graphics();
    swift.fillStyle(0x5ee6b5, 1).fillPoints([
      new Phaser.Geom.Point(26, 0),
      new Phaser.Geom.Point(52, 28),
      new Phaser.Geom.Point(26, 56),
      new Phaser.Geom.Point(0, 28),
    ], true);
    swift.lineStyle(3, 0xd7fff2, 0.88).strokeCircle(26, 28, 11);
    swift.fillStyle(0x06120e, 1).fillCircle(26, 28, 5);
    swift.generateTexture("enemy-swift", 52, 58).destroy();

    const tank = scene.add.graphics();
    tank.fillStyle(0xffa654, 1).fillPoints([
      new Phaser.Geom.Point(18, 2),
      new Phaser.Geom.Point(60, 2),
      new Phaser.Geom.Point(78, 38),
      new Phaser.Geom.Point(60, 76),
      new Phaser.Geom.Point(18, 76),
      new Phaser.Geom.Point(0, 38),
    ], true);
    tank.lineStyle(5, 0xffe0bb, 0.9).strokeCircle(39, 38, 18);
    tank.fillStyle(0x231207, 1).fillCircle(39, 38, 9);
    tank.generateTexture("enemy-tank", 78, 78).destroy();

    const boss = scene.add.graphics();
    boss.fillStyle(0x7e4cff, 0.98).fillCircle(65, 65, 59);
    boss.lineStyle(8, 0xff5ebc, 0.96).strokeCircle(65, 65, 48);
    boss.lineStyle(4, 0x50e9ff, 0.92).strokeCircle(65, 65, 34);
    boss.fillStyle(0xffffff, 1).fillCircle(65, 65, 13);
    boss.fillStyle(0x081426, 1).fillCircle(65, 65, 6);
    boss.generateTexture("enemy-boss", 130, 130).destroy();

    const grid = scene.add.graphics();
    grid.lineStyle(1, 0x4ccde7, 0.16);
    for (let line = 0; line <= 128; line += 32) {
      grid.lineBetween(line, 0, line, 128);
      grid.lineBetween(0, line, 128, line);
    }
    grid.generateTexture("rift-grid", 128, 128).destroy();

    [
      ["pickup-health", 0xff526f, "+"],
      ["pickup-shield", 0x50e9ff, "S"],
      ["pickup-overclock", 0xffad55, "⚡"],
    ].forEach(([key, color]) => {
      const pickup = scene.add.graphics();
      pickup.fillStyle(0x07121d, 0.96).fillCircle(24, 24, 22);
      pickup.lineStyle(3, color, 1).strokeCircle(24, 24, 18);
      pickup.generateTexture(key, 48, 48).destroy();
    });
  }

  class RiftSentinelScene extends Phaser.Scene {
    constructor() {
      super({ key: "RiftSentinel" });
    }

    init(data = {}) {
      this.autoStart = Boolean(data.autoStart);
    }

    create() {
      createGeneratedTextures(this);
      activeScene = this;
      this.highScore = readHighScore();
      this.score = 0;
      this.wave = 0;
      this.level = 1;
      this.kills = 0;
      this.combo = 0;
      this.comboExpiresAt = 0;
      this.xp = 0;
      this.nextXp = 8;
      this.health = 100;
      this.maxHealth = 100;
      this.shield = 20;
      this.maxShield = 60;
      this.weapon = {
        damage: 12,
        fireRate: 360,
        shots: 1,
        pierce: 0,
        crit: 0.08,
        bulletScale: 1,
        moveSpeed: 360,
      };
      this.upgradeLevels = {};
      this.weaponPower = 0;
      this.started = false;
      this.ended = false;
      this.pendingUpgrade = false;
      this.manualPaused = false;
      this.waveTransitioning = false;
      this.spawnTotal = 0;
      this.spawned = 0;
      this.enemySequence = 0;
      this.nextShotAt = 0;
      this.invulnerableUntil = 0;
      this.overclockUntil = 0;
      this.lastHudAt = 0;
      this.lastFpsAt = 0;

      this.createBattlefield();
      this.createActors();
      this.createInput();
      this.createCollisions();
      this.physics.pause();

      ui.loading.hidden = true;
      ui.gameOver.hidden = true;
      ui.pauseOverlay.hidden = true;
      ui.upgradeOverlay.hidden = true;
      ui.startOverlay.hidden = this.autoStart;
      ui.engineStatus.classList.add("is-online");
      ui.engineStatus.lastChild.textContent = " ONLINE";
      setRunState(this.autoStart ? "作战中" : "待命", this.autoStart ? "active" : "idle");
      logEvent("防线引擎连接完成", "SYS");
      this.emitHud(true);

      if (this.autoStart) this.startRun();
    }

    createBattlefield() {
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050812).setDepth(-20);
      this.grid = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, "rift-grid")
        .setAlpha(0.62)
        .setDepth(-18);

      const riftGlow = this.add.ellipse(GAME_WIDTH / 2, 56, 360, 150, 0x684cff, 0.12).setDepth(-16);
      riftGlow.setStrokeStyle(3, 0x50e9ff, 0.28);
      this.tweens.add({
        targets: riftGlow,
        scaleX: 1.12,
        scaleY: 0.84,
        alpha: 0.2,
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });

      const laneGraphics = this.add.graphics().setDepth(-15);
      laneGraphics.lineStyle(2, 0x62def5, 0.12);
      [180, 360, 540].forEach((x) => {
        for (let y = 80; y < DEFENSE_LINE; y += 34) laneGraphics.lineBetween(x, y, x, y + 16);
      });
      laneGraphics.lineStyle(3, 0xff5ebc, 0.28).lineBetween(0, DEFENSE_LINE, GAME_WIDTH, DEFENSE_LINE);

      this.stars = [];
      for (let index = 0; index < 72; index += 1) {
        const star = this.add.circle(
          Phaser.Math.Between(10, GAME_WIDTH - 10),
          Phaser.Math.Between(0, GAME_HEIGHT),
          Phaser.Math.FloatBetween(0.8, 2.2),
          index % 5 === 0 ? 0xff74cf : 0x8beaff,
          Phaser.Math.FloatBetween(0.2, 0.7),
        ).setDepth(-14);
        star.setData("speed", Phaser.Math.FloatBetween(18, 74));
        this.stars.push(star);
      }
    }

    createActors() {
      this.player = this.physics.add.sprite(GAME_WIDTH / 2, 965, "sentinel-player")
        .setDepth(10)
        .setCollideWorldBounds(true)
        .setImmovable(true);
      this.player.body.setSize(58, 70).setOffset(19, 14);

      this.bullets = this.physics.add.group({ maxSize: 140 });
      this.enemies = this.physics.add.group({ maxSize: 90 });
      this.pickups = this.physics.add.group({ maxSize: 20 });
    }

    createInput() {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys("A,D");
      this.pointerTargetX = null;

      this.input.on("pointerdown", (pointer) => {
        if (this.started && !this.ended && !this.pendingUpgrade) {
          this.pointerTargetX = Phaser.Math.Clamp(pointer.worldX, 38, GAME_WIDTH - 38);
        }
      });
      this.input.on("pointermove", (pointer) => {
        if (pointer.isDown && this.started && !this.ended && !this.pendingUpgrade) {
          this.pointerTargetX = Phaser.Math.Clamp(pointer.worldX, 38, GAME_WIDTH - 38);
        }
      });
      this.input.on("pointerup", () => {
        this.pointerTargetX = null;
      });
    }

    createCollisions() {
      this.physics.add.overlap(this.bullets, this.enemies, this.handleProjectileHit, undefined, this);
      this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, undefined, this);
      this.physics.add.overlap(this.player, this.pickups, this.collectPickup, undefined, this);
    }

    startRun() {
      if (this.started || this.ended) return;
      ensureAudio();
      this.started = true;
      this.physics.resume();
      ui.startOverlay.hidden = true;
      setRunState("作战中", "active");
      announce("DEFENSE NODE ONLINE");
      logEvent("哨兵部署完成，自动攻击上线", "RUN");
      this.startNextWave();
    }

    startNextWave() {
      if (this.ended) return;
      this.wave += 1;
      this.spawned = 0;
      this.waveTransitioning = false;
      const bossWave = this.wave % 5 === 0;
      this.spawnTotal = bossWave ? 6 + Math.floor(this.wave / 2) : 7 + this.wave * 2;
      const delay = Math.max(260, 820 - this.wave * 26);

      announce(bossWave ? `WARNING / BOSS WAVE ${this.wave}` : `WAVE ${String(this.wave).padStart(2, "0")}`);
      logEvent(bossWave ? `波次 ${this.wave} 检测到裂隙霸主` : `波次 ${this.wave} 开始`, bossWave ? "BOSS" : "WAVE");
      if (bossWave) playTone("boss");

      this.spawnEvent = this.time.addEvent({
        delay,
        callback: () => this.spawnEnemy(bossWave && this.spawned === 0 ? "boss" : undefined),
        callbackScope: this,
        repeat: this.spawnTotal - 1,
      });
      this.emitHud(true);
    }

    spawnEnemy(forcedType) {
      if (this.ended) return;
      this.spawned += 1;
      const roll = Math.random();
      let type = forcedType || "basic";

      if (!forcedType) {
        if (this.wave >= 3 && roll > 0.82) type = "tank";
        else if (this.wave >= 2 && roll > 0.56) type = "swift";
      }

      const definitions = {
        basic: { texture: "enemy-basic", health: 18, speed: 70, score: 70, xp: 2, damage: 12, scale: 1 },
        swift: { texture: "enemy-swift", health: 12, speed: 126, score: 95, xp: 2, damage: 10, scale: 1 },
        tank: { texture: "enemy-tank", health: 52, speed: 48, score: 165, xp: 4, damage: 20, scale: 1 },
        boss: { texture: "enemy-boss", health: 420, speed: 28, score: 1600, xp: 12, damage: 38, scale: 1 },
      };
      const definition = definitions[type];
      const healthScale = type === "boss" ? 1 + this.wave * 0.16 : 1 + this.wave * 0.11;
      const maxHealth = Math.round(definition.health * healthScale);
      const x = type === "boss" ? GAME_WIDTH / 2 : Phaser.Math.Between(58, GAME_WIDTH - 58);
      const enemy = this.enemies.create(x, type === "boss" ? -90 : -48, definition.texture);
      if (!enemy) return;

      enemy
        .setScale(definition.scale)
        .setDepth(type === "boss" ? 8 : 6);
      const drift = type === "boss" ? 42 : Phaser.Math.Between(-38, 38);

      enemy.setData({
        id: ++this.enemySequence,
        type,
        health: maxHealth,
        maxHealth,
        score: definition.score,
        xp: definition.xp,
        damage: definition.damage,
        drift,
      });
      enemy.setVelocity(drift, definition.speed + this.wave * (type === "boss" ? 1.4 : 3.4));

      if (type === "tank" || type === "boss") {
        const bar = this.add.graphics().setDepth(9);
        enemy.setData("healthBar", bar);
      }
    }

    update(time, delta) {
      if (!this.started || this.ended || this.pendingUpgrade || this.manualPaused) return;

      this.updateBackground(delta);
      this.updatePlayer();
      this.updateProjectiles();
      this.updateEnemies();
      this.updatePickups();

      if (time >= this.nextShotAt) this.fireWeapon(time);
      if (this.combo > 0 && time > this.comboExpiresAt) this.combo = 0;

      if (this.spawned >= this.spawnTotal && this.enemies.countActive(true) === 0 && !this.waveTransitioning) {
        this.completeWave();
      }

      if (time - this.lastHudAt > 90) {
        this.lastHudAt = time;
        this.emitHud();
      }
      if (time - this.lastFpsAt > 600) {
        this.lastFpsAt = time;
        ui.fps.textContent = `${Math.round(this.game.loop.actualFps || 60)} FPS`;
      }
    }

    updateBackground(delta) {
      this.grid.tilePositionY -= delta * 0.018;
      this.stars.forEach((star) => {
        star.y += star.getData("speed") * delta / 1000;
        if (star.y > GAME_HEIGHT + 5) {
          star.y = -5;
          star.x = Phaser.Math.Between(8, GAME_WIDTH - 8);
        }
      });
    }

    updatePlayer() {
      const left = this.cursors.left.isDown || this.keys.A.isDown || touchDirection < 0;
      const right = this.cursors.right.isDown || this.keys.D.isDown || touchDirection > 0;
      let velocity = 0;

      if (left !== right) {
        velocity = (left ? -1 : 1) * this.weapon.moveSpeed;
        this.pointerTargetX = null;
      } else if (this.pointerTargetX !== null) {
        const distance = this.pointerTargetX - this.player.x;
        velocity = Phaser.Math.Clamp(distance * 7, -this.weapon.moveSpeed, this.weapon.moveSpeed);
        if (Math.abs(distance) < 3) this.pointerTargetX = null;
      }

      this.player.setVelocityX(velocity);
      this.player.setRotation(Phaser.Math.Clamp(velocity / this.weapon.moveSpeed, -1, 1) * 0.08);
    }

    updateProjectiles() {
      this.bullets.getChildren().forEach((bullet) => {
        if (bullet.active && (bullet.y < -60 || bullet.x < -60 || bullet.x > GAME_WIDTH + 60)) bullet.destroy();
      });
    }

    updateEnemies() {
      this.enemies.getChildren().forEach((enemy) => {
        if (!enemy.active) return;
        const type = enemy.getData("type");

        if (enemy.x < 42 || enemy.x > GAME_WIDTH - 42) {
          const drift = -enemy.getData("drift");
          enemy.setData("drift", drift);
          enemy.setVelocityX(drift);
        }

        if (type === "swift") enemy.rotation += 0.035;
        if (type === "boss") enemy.rotation += 0.004;
        this.updateEnemyHealthBar(enemy);

        if (enemy.y > DEFENSE_LINE + 35) {
          const damage = enemy.getData("damage");
          this.removeEnemy(enemy);
          this.damagePlayer(damage);
          logEvent(`怪物突破防线，装甲 -${damage}`, "LEAK");
        }
      });
    }

    updatePickups() {
      this.pickups.getChildren().forEach((pickup) => {
        if (pickup.active) {
          pickup.rotation += 0.025;
          const label = pickup.getData("label");

          if (label?.active) {
            label.setPosition(pickup.x, pickup.y);
            label.setRotation(-pickup.rotation);
          }

          if (pickup.y > GAME_HEIGHT + 40) {
            label?.destroy();
            pickup.destroy();
          }
        }
      });
    }

    updateEnemyHealthBar(enemy) {
      const bar = enemy.getData("healthBar");
      if (!bar) return;
      const width = enemy.getData("type") === "boss" ? 104 : 58;
      const ratio = Math.max(0, enemy.getData("health") / enemy.getData("maxHealth"));
      bar.clear();
      bar.fillStyle(0x071019, 0.8).fillRect(enemy.x - width / 2, enemy.y - enemy.displayHeight / 2 - 13, width, 5);
      bar.fillStyle(enemy.getData("type") === "boss" ? 0xff5e88 : 0xffad55, 1)
        .fillRect(enemy.x - width / 2, enemy.y - enemy.displayHeight / 2 - 13, width * ratio, 5);
    }

    findPriorityTarget() {
      let target = null;
      let threat = Number.NEGATIVE_INFINITY;
      this.enemies.getChildren().forEach((enemy) => {
        if (!enemy.active) return;
        const score = enemy.y - Math.abs(enemy.x - this.player.x) * 0.11 + (enemy.getData("type") === "boss" ? 130 : 0);
        if (score > threat) {
          threat = score;
          target = enemy;
        }
      });
      return target;
    }

    fireWeapon(time) {
      const target = this.findPriorityTarget();
      if (!target) return;
      const overclocked = time < this.overclockUntil;
      this.nextShotAt = time + this.weapon.fireRate * (overclocked ? 0.58 : 1);
      const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 32, target.x, target.y);
      const spread = 0.105;

      for (let index = 0; index < this.weapon.shots; index += 1) {
        const offset = (index - (this.weapon.shots - 1) / 2) * spread;
        const angle = baseAngle + offset;
        const critical = Math.random() < this.weapon.crit;
        const bullet = this.bullets.create(this.player.x, this.player.y - 56, "sentinel-bullet");
        if (!bullet) continue;

        bullet
          .setScale(this.weapon.bulletScale)
          .setDepth(7)
          .setRotation(angle + Math.PI / 2);
        bullet.setData({
          damage: this.weapon.damage * (critical ? 2 : 1),
          critical,
          remainingHits: this.weapon.pierce + 1,
          hitIds: new Set(),
        });
        this.physics.velocityFromRotation(angle, 780, bullet.body.velocity);
      }

      const flash = this.add.circle(this.player.x, this.player.y - 58, 8, 0x8effff, 0.9).setDepth(12);
      this.tweens.add({ targets: flash, scale: 2.8, alpha: 0, duration: 95, onComplete: () => flash.destroy() });
      playTone("shot");
    }

    handleProjectileHit(bullet, enemy) {
      if (!bullet.active || !enemy.active) return;
      const hitIds = bullet.getData("hitIds");
      const enemyId = enemy.getData("id");
      if (hitIds.has(enemyId)) return;
      hitIds.add(enemyId);

      const damage = bullet.getData("damage");
      enemy.setData("health", enemy.getData("health") - damage);
      bullet.setData("remainingHits", bullet.getData("remainingHits") - 1);
      this.createImpact(enemy.x, enemy.y, bullet.getData("critical"));
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(45, () => {
        if (enemy.active) enemy.clearTint();
      });

      if (bullet.getData("critical")) this.showDamageText(enemy.x, enemy.y, damage, true);
      if (bullet.getData("remainingHits") <= 0) bullet.destroy();
      if (enemy.getData("health") <= 0) this.killEnemy(enemy);
    }

    handleEnemyCollision(player, enemy) {
      if (!enemy.active) return;
      const damage = enemy.getData("damage");
      this.removeEnemy(enemy);
      this.damagePlayer(damage);
    }

    createImpact(x, y, critical) {
      const color = critical ? 0xffd76a : 0x50e9ff;
      const impact = this.add.circle(x, y, critical ? 12 : 7, color, 0.78).setDepth(14);
      this.tweens.add({
        targets: impact,
        scale: critical ? 3.6 : 2.4,
        alpha: 0,
        duration: critical ? 190 : 120,
        onComplete: () => impact.destroy(),
      });
    }

    showDamageText(x, y, damage, critical) {
      const label = this.add.text(x, y - 18, critical ? `CRIT ${Math.round(damage)}` : String(Math.round(damage)), {
        fontFamily: "ui-monospace, monospace",
        fontSize: critical ? "19px" : "14px",
        fontStyle: "bold",
        color: critical ? "#ffe985" : "#dffcff",
      }).setOrigin(0.5).setDepth(16);
      this.tweens.add({ targets: label, y: y - 68, alpha: 0, duration: 520, onComplete: () => label.destroy() });
    }

    killEnemy(enemy) {
      if (!enemy.active) return;
      const type = enemy.getData("type");
      const baseScore = enemy.getData("score");
      const comboMultiplier = 1 + Math.min(20, this.combo) * 0.05;
      this.combo += 1;
      this.comboExpiresAt = this.time.now + 2500;
      this.kills += 1;
      this.score += Math.round(baseScore * comboMultiplier * (1 + this.wave * 0.03));
      this.xp += enemy.getData("xp");
      this.createExplosion(enemy.x, enemy.y, type === "boss");

      if (type === "boss") {
        this.score += this.wave * 220;
        this.shield = this.maxShield;
        announce("RIFT OVERLORD DESTROYED", 2200);
        logEvent("裂隙霸主已清除，护盾完全充能", "BOSS");
        playTone("upgrade");
      } else if (Math.random() < 0.085) {
        this.spawnPickup(enemy.x, enemy.y);
      }

      this.removeEnemy(enemy);
      this.checkLevelUp();
      this.emitHud(true);
    }

    createExplosion(x, y, large) {
      const count = large ? 12 : 5;
      for (let index = 0; index < count; index += 1) {
        const angle = Math.PI * 2 * index / count + Math.random() * 0.4;
        const distance = (large ? 90 : 38) + Math.random() * (large ? 70 : 34);
        const spark = this.add.circle(x, y, large ? 9 : 5, index % 2 ? 0xff5ebc : 0x50e9ff, 0.9).setDepth(15);
        this.tweens.add({
          targets: spark,
          x: x + Math.cos(angle) * distance,
          y: y + Math.sin(angle) * distance,
          scale: 0.15,
          alpha: 0,
          duration: large ? 620 : 320,
          ease: "Cubic.Out",
          onComplete: () => spark.destroy(),
        });
      }
      if (large) this.cameras.main.shake(260, 0.008);
    }

    removeEnemy(enemy) {
      enemy.getData("healthBar")?.destroy();
      enemy.destroy();
    }

    spawnPickup(x, y) {
      const roll = Math.random();
      const type = roll < 0.42 ? "health" : roll < 0.78 ? "shield" : "overclock";
      const pickup = this.pickups.create(x, y, `pickup-${type}`).setDepth(8);
      if (!pickup) return;

      pickup.setData("type", type);
      pickup.setVelocity(Phaser.Math.Between(-28, 28), 150);
      pickup.setAngularVelocity(95);

      const label = type === "health" ? "+" : type === "shield" ? "S" : "⚡";
      const text = this.add.text(x, y, label, {
        fontFamily: "ui-monospace, monospace",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(9);
      pickup.setData("label", text);
    }

    collectPickup(player, pickup) {
      const type = pickup.getData("type");
      pickup.getData("label")?.destroy();
      pickup.destroy();

      if (type === "health") {
        this.health = Math.min(this.maxHealth, this.health + 28);
        announce("REPAIR +28");
        logEvent("拾取维修模块，恢复 28 生命", "DROP");
      } else if (type === "shield") {
        this.shield = Math.min(this.maxShield, this.shield + 30);
        announce("SHIELD +30");
        logEvent("拾取护盾模块，补充 30 护盾", "DROP");
      } else {
        this.overclockUntil = this.time.now + 8000;
        announce("OVERCLOCK / 8 SEC");
        logEvent("武器超频 8 秒", "DROP");
      }
      playTone("pickup");
      this.emitHud(true);
    }

    damagePlayer(amount) {
      if (this.ended || this.time.now < this.invulnerableUntil) return;
      this.invulnerableUntil = this.time.now + 420;
      let remaining = amount;

      if (this.shield > 0) {
        const absorbed = Math.min(this.shield, remaining);
        this.shield -= absorbed;
        remaining -= absorbed;
      }
      if (remaining > 0) this.health = Math.max(0, this.health - remaining);

      this.combo = 0;
      this.player.setTintFill(0xff5271);
      this.time.delayedCall(150, () => {
        if (this.player.active) this.player.clearTint();
      });
      this.cameras.main.shake(130, 0.006);
      this.cameras.main.flash(90, 255, 40, 74, false);
      playTone("damage");
      this.emitHud(true);

      if (this.health <= 0) this.endRun();
    }

    completeWave() {
      this.waveTransitioning = true;
      const reward = 80 + this.wave * 35;
      this.score += reward;
      this.shield = Math.min(this.maxShield, this.shield + 8);
      announce(`WAVE ${this.wave} CLEAR / +${reward}`);
      logEvent(`波次 ${this.wave} 清理完成，护盾 +8`, "CLEAR");
      this.emitHud(true);
      this.time.delayedCall(1650, () => this.startNextWave());
    }

    checkLevelUp() {
      if (this.pendingUpgrade || this.xp < this.nextXp) return;
      this.xp -= this.nextXp;
      this.level += 1;
      this.nextXp = Math.round(this.nextXp * 1.3 + 3);
      this.pendingUpgrade = true;
      this.scene.pause();
      setRunState("升级选择", "upgrade");
      playTone("upgrade");
      showUpgradeChoices(this);
    }

    chooseUpgrade(id) {
      if (!this.pendingUpgrade) return;
      const upgrade = upgrades.find((item) => item.id === id);
      if (!upgrade) return;

      upgrade.apply(this);
      this.upgradeLevels[id] = (this.upgradeLevels[id] || 0) + 1;
      this.weaponPower += 1;
      this.pendingUpgrade = false;
      ui.upgradeOverlay.hidden = true;
      setRunState("作战中", "active");
      logEvent(`${upgrade.title} 已同步`, "LEVEL");
      announce(`${upgrade.code} / UPGRADE COMPLETE`);
      this.scene.resume();
      this.emitHud(true);
      this.time.delayedCall(0, () => this.checkLevelUp());
    }

    endRun() {
      if (this.ended) return;
      this.ended = true;
      this.spawnEvent?.remove(false);
      this.physics.pause();
      this.highScore = Math.max(this.highScore, this.score);
      saveHighScore(this.highScore);
      setRunState("防线失守", "danger");
      ui.finalScore.textContent = Math.round(this.score).toLocaleString("zh-CN");
      ui.finalWave.textContent = String(this.wave);
      ui.finalKills.textContent = String(this.kills);
      ui.gameOver.hidden = false;
      logEvent("防线失守，运行数据已归档", "FAIL");
      this.emitHud(true);
    }

    emitHud() {
      const boss = this.enemies?.getChildren().find((enemy) => enemy.active && enemy.getData("type") === "boss");
      renderHud({
        score: this.score,
        highScore: this.highScore,
        health: this.health,
        maxHealth: this.maxHealth,
        shield: this.shield,
        maxShield: this.maxShield,
        xp: this.xp,
        nextXp: this.nextXp,
        wave: this.wave,
        level: this.level,
        kills: this.kills,
        combo: this.combo,
        weaponPower: this.weaponPower,
        ...this.weapon,
        boss: boss ? { health: boss.getData("health"), maxHealth: boss.getData("maxHealth") } : null,
      });
    }
  }

  function showUpgradeChoices(scene) {
    const available = upgrades.filter((upgrade) => {
      const level = scene.upgradeLevels[upgrade.id] || 0;
      if (upgrade.id === "repair" && scene.health >= scene.maxHealth * 0.92) return false;
      return level < upgrade.max;
    });
    const choices = Phaser.Utils.Array.Shuffle([...available]).slice(0, 3);

    if (choices.length < 3) {
      upgrades.filter((item) => !choices.includes(item)).slice(0, 3 - choices.length).forEach((item) => choices.push(item));
    }

    ui.upgradeOptions.replaceChildren(...choices.map((upgrade) => {
      const button = document.createElement("button");
      const code = document.createElement("b");
      const title = document.createElement("span");
      const description = document.createElement("small");
      button.className = "upgrade-option";
      button.type = "button";
      button.dataset.upgrade = upgrade.id;
      code.textContent = upgrade.code;
      title.textContent = upgrade.title;
      description.textContent = upgrade.description;
      button.append(code, title, description);
      return button;
    }));
    ui.upgradeOverlay.hidden = false;
  }

  function togglePause(forceResume = false) {
    const scene = activeScene;
    if (!scene?.started || scene.ended || scene.pendingUpgrade) return;

    if (scene.manualPaused || forceResume) {
      scene.manualPaused = false;
      ui.pauseOverlay.hidden = true;
      setRunState("作战中", "active");
      scene.scene.resume();
      return;
    }

    scene.manualPaused = true;
    setRunState("已暂停", "paused");
    ui.pauseOverlay.hidden = false;
    scene.scene.pause();
  }

  function bindHoldControl(button, direction) {
    const release = () => {
      if (touchDirection === direction) touchDirection = 0;
      button.classList.remove("is-pressed");
    };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      touchDirection = direction;
      button.classList.add("is-pressed");
      button.setPointerCapture?.(event.pointerId);
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }

  function bootGame() {
    if (!window.Phaser) {
      ui.loading.innerHTML = "<p>游戏引擎加载失败</p><small>请检查网络连接后刷新页面</small>";
      ui.engineStatus.textContent = "ENGINE OFFLINE";
      return;
    }

    new Phaser.Game({
      type: Phaser.AUTO,
      parent: "game-root",
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: "#050812",
      antialias: true,
      pixelArt: false,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: RiftSentinelScene,
    });
  }

  ui.startButton.addEventListener("click", () => activeScene?.startRun());
  ui.restartButton.addEventListener("click", () => {
    ui.gameOver.hidden = true;
    ui.pauseOverlay.hidden = true;
    ui.upgradeOverlay.hidden = true;
    activeScene?.scene.restart({ autoStart: true });
  });
  ui.resumeButton.addEventListener("click", () => togglePause(true));
  ui.pauseButton.addEventListener("click", () => togglePause());
  ui.audioButton.addEventListener("click", () => {
    audioState.enabled = !audioState.enabled;
    ui.audioButton.classList.toggle("is-muted", !audioState.enabled);
    ui.audioButton.setAttribute("aria-label", audioState.enabled ? "关闭游戏音效" : "开启游戏音效");
    if (audioState.enabled) playTone("pickup");
  });
  ui.upgradeOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-upgrade]");
    if (button) activeScene?.chooseUpgrade(button.dataset.upgrade);
  });
  bindHoldControl(ui.moveLeft, -1);
  bindHoldControl(ui.moveRight, 1);

  window.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", " "].includes(event.key) && activeScene?.started) event.preventDefault();
    if (event.key.toLowerCase() === "p" || event.key === "Escape") togglePause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && activeScene?.started && !activeScene.manualPaused && !activeScene.pendingUpgrade && !activeScene.ended) {
      togglePause();
    }
  });

  renderHud({
    score: 0,
    highScore: readHighScore(),
    health: 100,
    maxHealth: 100,
    shield: 20,
    maxShield: 60,
    xp: 0,
    nextXp: 8,
    wave: 0,
    level: 1,
    kills: 0,
    combo: 0,
    weaponPower: 0,
    damage: 12,
    fireRate: 360,
    shots: 1,
    pierce: 0,
    crit: 0.08,
    moveSpeed: 360,
    boss: null,
  });
  bootGame();
})();
