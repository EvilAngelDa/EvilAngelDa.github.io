let THREE;
const scenes = [...document.querySelectorAll("[data-sphere-scene]")];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const palettes = {
  inside: [
    ["#1a2a6c", "#3f8cff", "#f6d365"],
    ["#24115c", "#9b5cff", "#f4f1ff"],
    ["#00272b", "#00b7c2", "#f8b84e"],
    ["#3d102c", "#f04f8b", "#ffd166"],
  ],
  outside: [
    ["#ff7a45", "#ffd35a", "#52d273"],
    ["#5d5cff", "#48d5ff", "#f4fbff"],
    ["#111827", "#00c8ff", "#9dff7a"],
    ["#ff4ca3", "#7c5cff", "#ffd36e"],
  ],
};

function makeLabelTexture(title, meta, colors, actionLabel = "") {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.55, colors[1]);
  gradient.addColorStop(1, colors[2]);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glow = ctx.createRadialGradient(760, 120, 20, 760, 120, 520);
  glow.addColorStop(0, "rgba(255,255,255,0.32)");
  glow.addColorStop(0.42, "rgba(255,255,255,0.08)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  for (let x = 0; x < canvas.width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 42px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText(meta, 64, 92);

  if (actionLabel) {
    ctx.fillStyle = "rgba(4,12,24,0.66)";
    ctx.fillRect(734, 48, 226, 72);
    ctx.strokeStyle = "rgba(130,240,255,0.92)";
    ctx.lineWidth = 2;
    ctx.strokeRect(734, 48, 226, 72);
    ctx.fillStyle = "rgba(235,253,255,0.98)";
    ctx.font = "700 27px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(actionLabel, 847, 84);
    ctx.textAlign = "start";
  }

  ctx.font = "900 86px Avenir Next, PingFang SC, Microsoft YaHei, sans-serif";
  ctx.textBaseline = "bottom";
  wrapText(ctx, title, 64, canvas.height - 110, 820, 92);

  ctx.fillStyle = "rgba(255,255,255,0.56)";
  ctx.fillRect(64, canvas.height - 72, 240, 8);
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = [...text];
  let line = "";
  const lines = [];

  chars.forEach((char) => {
    const nextLine = `${line}${char}`;
    if (ctx.measureText(nextLine).width > maxWidth && line) {
      lines.push(line);
      line = char;
      return;
    }
    line = nextLine;
  });

  lines.push(line);
  lines.slice(-2).forEach((item, index, arr) => {
    ctx.fillText(item, x, y - (arr.length - index - 1) * lineHeight);
  });
}

function makeCurvedPanelGeometry(width, height, radius, direction) {
  const geometry = new THREE.PlaneGeometry(width, height, 32, 8);
  const positions = geometry.attributes.position;

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const angle = x / radius;
    positions.setX(index, Math.sin(angle) * radius);
    positions.setZ(index, (Math.cos(angle) - 1) * radius * direction);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const glow = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);

  glow.addColorStop(0, "rgba(255,255,255,0.95)");
  glow.addColorStop(0.16, "rgba(125,190,255,0.62)");
  glow.addColorStop(0.48, "rgba(90,100,255,0.18)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeCrystalTexture(colors) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);

  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.52, colors[1]);
  gradient.addColorStop(1, colors[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 8) {
    ctx.fillStyle = y % 32 === 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.055)";
    ctx.fillRect(0, y, canvas.width, y % 32 === 0 ? 2 : 1);
  }

  ctx.strokeStyle = "rgba(225,241,255,0.2)";
  ctx.lineWidth = 2;
  for (let x = 36; x < canvas.width; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 46, canvas.height);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(380, 110, 10, 380, 110, 300);
  glow.addColorStop(0, "rgba(255,255,255,0.42)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.1, 1.1);
  return texture;
}

function makeCrystalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-1, -0.72);
  shape.lineTo(0, 0.98);
  shape.lineTo(1, -0.72);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-0.36, -0.34);
  hole.lineTo(0.36, -0.34);
  hole.lineTo(0, 0.38);
  hole.closePath();
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.2,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.035,
    bevelSegments: 4,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

class SphereExperience {
  constructor(canvas) {
    this.canvas = canvas;
    this.mode = canvas.dataset.sphereScene;
    this.windowEl = canvas.closest(".immersive-window");
    this.scrollArea = canvas.closest(".immersive-scroll");
    this.gallery = this.windowEl?.querySelector(`[data-sphere-gallery="${this.mode}"]`);
    this.cards = [...(this.gallery?.children || [])];
    this.meshes = [];
    this.angleStep = this.mode === "inside" ? 0.7 : 0.76;
    this.activeIndex = 0;
    this.targetRotation = 0;
    this.rotation = 0;
    this.angularVelocity = 0;
    this.pointer = new THREE.Vector2(0, 0);
    this.pointerTarget = new THREE.Vector2(0, 0);
    this.raycaster = new THREE.Raycaster();
    this.hoveredIndex = -1;
    this.pointerDown = null;
    this.baseCameraZ = this.mode === "inside" ? 0.55 : 8.2;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    this.camera.position.set(0, 0, this.baseCameraZ);

    this.rig = new THREE.Group();
    this.scene.add(this.rig);
    this.guideGroup = new THREE.Group();
    this.scene.add(this.guideGroup);

    this.addLights();
    this.addPanels();
    this.addGuideSphere();
    this.addAtmosphere();
    this.addCoreCrystal();
    this.bind();
    this.resize();
    this.windowEl?.classList.add("sphere-ready");
    this.animate();
  }

  addLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 4, 5);
    this.scene.add(key);
    const rim = new THREE.PointLight(0x8fd3ff, 18, 18);
    rim.position.set(-4, 1.5, 2);
    this.scene.add(rim);
  }

  addGuideSphere() {
    const radius = this.mode === "inside" ? 5.65 : 5.2;
    const geometry = new THREE.SphereGeometry(radius, 56, 28);
    const material = new THREE.MeshBasicMaterial({
      color: this.mode === "inside" ? 0x5870ff : 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: this.mode === "inside" ? 0.07 : 0.05,
      side: THREE.DoubleSide,
    });
    this.guideGroup.add(new THREE.Mesh(geometry, material));

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: this.mode === "inside" ? 0x6d7dff : 0xaedcff,
      transparent: true,
      opacity: 0.13,
    });

    [0, Math.PI / 2].forEach((rotation, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.008, 4, 160), ringMaterial);
      ring.rotation.x = rotation;
      ring.rotation.y = index === 0 ? Math.PI / 2 : 0;
      this.guideGroup.add(ring);
    });

    this.addNetworkSignals(radius);
  }

  addNetworkSignals(radius) {
    const connectionCount = (this.mode === "inside" ? 16 : 20) * 20;
    const pathSegmentCount = 48;
    const tailSegmentCount = 8;
    const linkColors = this.mode === "inside"
      ? [0x7286ff, 0x9c8cff, 0x6bb7ff]
      : [0x62c9ff, 0x6ce9d0, 0x8198ff];
    const linkPositions = new Float32Array(connectionCount * pathSegmentCount * 2 * 3);
    const linkVertexColors = new Float32Array(connectionCount * pathSegmentCount * 2 * 3);
    const signalPositions = new Float32Array(connectionCount * tailSegmentCount * 2 * 3);
    const signalColors = new Float32Array(connectionCount * tailSegmentCount * 2 * 3);
    const signalHeadPositions = new Float32Array(connectionCount * 3);
    const signalHeadColors = new Float32Array(connectionCount * 3);
    const nodePositions = new Float32Array(connectionCount * 2 * 3);
    const linkMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: this.mode === "inside" ? 0.032 : 0.038,
      depthWrite: false,
      depthTest: true,
    });
    const signalMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: this.mode === "inside" ? 0.58 : 0.66,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });
    const signalHeadMaterial = new THREE.PointsMaterial({
      map: makeGlowTexture(),
      color: 0xffffff,
      vertexColors: true,
      size: this.mode === "inside" ? 0.075 : 0.09,
      sizeAttenuation: true,
      transparent: true,
      opacity: this.mode === "inside" ? 0.62 : 0.7,
      alphaTest: 0.015,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });
    const networkGroup = new THREE.Group();
    const randomDirection = () => {
      const y = Math.random() * 2 - 1;
      const angle = Math.random() * Math.PI * 2;
      const horizontal = Math.sqrt(1 - y * y);

      return new THREE.Vector3(
        Math.cos(angle) * horizontal,
        y,
        Math.sin(angle) * horizontal,
      );
    };

    this.networkSignals = [];

    for (let index = 0; index < connectionCount; index += 1) {
      const start = randomDirection();
      let end = randomDirection();
      let attempts = 0;

      while ((start.dot(end) > 0.72 || start.dot(end) < -0.62) && attempts < 12) {
        end = randomDirection();
        attempts += 1;
      }

      const angle = Math.acos(THREE.MathUtils.clamp(start.dot(end), -0.999, 0.999));
      const sinAngle = Math.sin(angle);
      const lift = 0.06 + Math.random() * 0.18;
      const pathPoints = [];

      for (let step = 0; step <= pathSegmentCount; step += 1) {
        const progress = step / pathSegmentCount;
        const startWeight = Math.sin((1 - progress) * angle) / sinAngle;
        const endWeight = Math.sin(progress * angle) / sinAngle;
        const point = start.clone().multiplyScalar(startWeight).add(
          end.clone().multiplyScalar(endWeight),
        );

        point.normalize().multiplyScalar(radius + Math.sin(Math.PI * progress) * lift);
        pathPoints.push(point);
      }

      const color = new THREE.Color(linkColors[index % linkColors.length]);
      const linkBrightness = 0.58 + Math.random() * 0.42;
      const linkVertexBase = index * pathSegmentCount * 2;

      for (let segmentIndex = 0; segmentIndex < pathSegmentCount; segmentIndex += 1) {
        for (let endpoint = 0; endpoint < 2; endpoint += 1) {
          const vertexIndex = linkVertexBase + segmentIndex * 2 + endpoint;
          const arrayIndex = vertexIndex * 3;
          const point = pathPoints[segmentIndex + endpoint];

          linkPositions[arrayIndex] = point.x;
          linkPositions[arrayIndex + 1] = point.y;
          linkPositions[arrayIndex + 2] = point.z;
          linkVertexColors[arrayIndex] = color.r * linkBrightness;
          linkVertexColors[arrayIndex + 1] = color.g * linkBrightness;
          linkVertexColors[arrayIndex + 2] = color.b * linkBrightness;
        }
      }

      const startNode = start.clone().multiplyScalar(radius + 0.015);
      const endNode = end.clone().multiplyScalar(radius + 0.015);
      const nodeArrayIndex = index * 6;

      nodePositions[nodeArrayIndex] = startNode.x;
      nodePositions[nodeArrayIndex + 1] = startNode.y;
      nodePositions[nodeArrayIndex + 2] = startNode.z;
      nodePositions[nodeArrayIndex + 3] = endNode.x;
      nodePositions[nodeArrayIndex + 4] = endNode.y;
      nodePositions[nodeArrayIndex + 5] = endNode.z;
      this.networkSignals.push({
        pathPoints,
        color,
        vertexOffset: index * tailSegmentCount * 2,
        tailSegmentCount,
        duration: 5.2 + Math.random() * 5.8,
        delay: Math.random() * 12,
        activeWindow: 0.3 + Math.random() * 0.18,
        direction: Math.random() > 0.5 ? 1 : -1,
        tailStep: 0.009 + Math.random() * 0.006,
      });
    }

    const linkGeometry = new THREE.BufferGeometry();
    linkGeometry.setAttribute("position", new THREE.BufferAttribute(linkPositions, 3));
    linkGeometry.setAttribute("color", new THREE.BufferAttribute(linkVertexColors, 3));
    const links = new THREE.LineSegments(linkGeometry, linkMaterial);
    const signalGeometry = new THREE.BufferGeometry();
    signalGeometry.setAttribute("position", new THREE.BufferAttribute(signalPositions, 3));
    signalGeometry.setAttribute("color", new THREE.BufferAttribute(signalColors, 3));
    const signals = new THREE.LineSegments(signalGeometry, signalMaterial);
    const signalHeadGeometry = new THREE.BufferGeometry();
    signalHeadGeometry.setAttribute("position", new THREE.BufferAttribute(signalHeadPositions, 3));
    signalHeadGeometry.setAttribute("color", new THREE.BufferAttribute(signalHeadColors, 3));
    const signalHeads = new THREE.Points(signalHeadGeometry, signalHeadMaterial);
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    this.networkNodeMaterial = new THREE.PointsMaterial({
      color: this.mode === "inside" ? 0x9da8ff : 0x9ce9ff,
      size: this.mode === "inside" ? 0.018 : 0.022,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });
    const nodes = new THREE.Points(nodeGeometry, this.networkNodeMaterial);

    links.renderOrder = -20;
    nodes.renderOrder = -19;
    signals.renderOrder = -18;
    signalHeads.renderOrder = -17;
    signals.frustumCulled = false;
    signalHeads.frustumCulled = false;
    networkGroup.add(links, nodes, signals, signalHeads);
    this.networkSignalGeometry = signalGeometry;
    this.networkSignalHeadGeometry = signalHeadGeometry;
    this.networkGroup = networkGroup;
    this.guideGroup.add(networkGroup);
  }

  addAtmosphere() {
    const count = 260;
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const radius = 3.4 + Math.random() * 5.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.cos(phi);
      positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: this.mode === "inside" ? 0x91a2ff : 0xc9efff,
      size: this.mode === "inside" ? 0.035 : 0.045,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.atmosphere = new THREE.Points(geometry, material);
    this.scene.add(this.atmosphere);
  }

  addCoreCrystal() {
    this.coreCrystal = null;

    if (this.mode !== "outside") {
      return;
    }

    const geometry = makeCrystalGeometry();
    const palette = ["#31384f", "#b9c5e8", "#ffffff"];
    const texture = makeCrystalTexture(palette);
    const primary = new THREE.Color("#ff3b58");
    const accent = new THREE.Color("#ffd8de");
    const group = new THREE.Group();
    const mainMaterial = new THREE.MeshPhysicalMaterial({
      map: texture,
      emissiveMap: texture,
      color: 0xdce8ff,
      emissive: primary,
      emissiveIntensity: 0.48,
      metalness: 0.08,
      roughness: 0.14,
      transmission: 0.38,
      thickness: 0.58,
      ior: 1.38,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: primary,
      transparent: true,
      opacity: 0.2,
      wireframe: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const main = new THREE.Mesh(geometry, mainMaterial);
    const inner = new THREE.Mesh(geometry, innerMaterial);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 24), edgeMaterial);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      color: primary,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }));
    geometry.computeBoundingBox();
    const geometrySize = geometry.boundingBox.getSize(new THREE.Vector3());
    const baseScale = 1;

    inner.scale.set(0.86, 0.86, 0.86);
    inner.position.z = -0.15;
    halo.scale.set(2.15, 2.15, 1);
    halo.position.z = -0.28;
    main.renderOrder = 10;
    inner.renderOrder = 8;
    edges.renderOrder = 12;
    group.add(halo, inner, main, edges);
    group.position.set(0, 0, 0);
    group.rotation.set(-0.04, -0.16, 0.018);
    group.scale.setScalar(baseScale);

    this.coreCrystal = {
      group,
      mainMaterial,
      innerMaterial,
      edgeMaterial,
      haloMaterial: halo.material,
      baseScale,
      geometrySize,
      displayColor: new THREE.Color(),
      highlightColor: new THREE.Color(0xffffff),
      rainbowColors: [
        new THREE.Color("#ff3b58"),
        new THREE.Color("#ff8a2a"),
        new THREE.Color("#ffe45c"),
        new THREE.Color("#3ee88b"),
        new THREE.Color("#38e8e0"),
        new THREE.Color("#4b78ff"),
        new THREE.Color("#a855f7"),
      ],
    };
    this.scene.add(group);
  }

  addPanels() {
    const radius = this.mode === "inside" ? 5.45 : 5.0;
    const width = this.mode === "inside" ? 3.05 : 2.72;
    const height = this.mode === "inside" ? 1.88 : 1.7;
    const geometry = makeCurvedPanelGeometry(width, height, 5.8, this.mode === "inside" ? -1 : 1);
    const colors = palettes[this.mode];

    this.cards.forEach((card, index) => {
      const title = card.querySelector("h3")?.textContent?.trim() || `Item ${index + 1}`;
      const meta = card.querySelector("time, .project-tag")?.textContent?.trim() || `#00${index + 1}`;
      const articleUrl = card.dataset.articleUrl?.trim() || "";
      const material = new THREE.MeshStandardMaterial({
        map: makeLabelTexture(title, meta, colors[index % colors.length], articleUrl ? "阅读全文  ↗" : ""),
        emissive: new THREE.Color(colors[index % colors.length][1]),
        emissiveIntensity: 0.05,
        roughness: 0.42,
        metalness: 0.18,
        transparent: true,
        opacity: 0.94,
        side: THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const angle = index * this.angleStep;
      const z = this.mode === "inside" ? -Math.cos(angle) * radius : Math.cos(angle) * radius;
      mesh.position.set(Math.sin(angle) * radius, 0, z);
      mesh.rotation.y = this.mode === "inside" ? -angle : angle;
      mesh.userData.baseAngle = angle;
      mesh.userData.radius = radius;
      mesh.userData.baseY = 0;
      mesh.userData.index = index;
      mesh.userData.articleUrl = articleUrl;
      this.meshes.push(mesh);
      this.rig.add(mesh);
    });
  }

  pickActiveArticleMesh(event) {
    if (this.mode !== "inside" || !this.canvas || !this.camera) {
      return null;
    }

    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    this.scene.updateMatrixWorld(true);
    this.raycaster.setFromCamera(pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(this.meshes, false);

    return intersections.find(({ object }) => (
      object.userData.index === this.activeIndex && object.userData.articleUrl
    ))?.object || null;
  }

  setArticleHover(mesh) {
    const nextIndex = mesh?.userData.index ?? -1;
    if (nextIndex === this.hoveredIndex) return;

    this.hoveredIndex = nextIndex;
    if (this.scrollArea) {
      this.scrollArea.dataset.sphereCardHover = nextIndex >= 0 ? "true" : "false";
    }
  }

  bind() {
    this.scrollArea?.addEventListener("scroll", () => this.syncFromScroll());
    this.scrollArea?.addEventListener("sphereindexchange", (event) => {
      this.activeIndex = event.detail?.index || 0;
    });
    this.scrollArea?.addEventListener("pointermove", (event) => {
      const rect = this.scrollArea.getBoundingClientRect();
      this.pointerTarget.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      this.pointerTarget.y = 0;
      const isMoving = this.windowEl?.classList.contains("is-sphere-moving");
      this.setArticleHover(isMoving ? null : this.pickActiveArticleMesh(event));
    });
    this.scrollArea?.addEventListener("pointerdown", (event) => {
      if (event.target instanceof Element && event.target.closest("a, button")) return;
      const mesh = this.pickActiveArticleMesh(event);
      this.pointerDown = mesh ? {
        x: event.clientX,
        y: event.clientY,
        index: mesh.userData.index,
      } : null;
    });
    this.scrollArea?.addEventListener("pointerup", (event) => {
      if (!this.pointerDown) return;
      const pointerDown = this.pointerDown;
      this.pointerDown = null;

      if (event.target instanceof Element && event.target.closest("a, button")) return;
      if (this.windowEl?.classList.contains("is-sphere-moving")) return;

      const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
      const mesh = distance <= 8 ? this.pickActiveArticleMesh(event) : null;
      if (!mesh || mesh.userData.index !== pointerDown.index) return;

      window.location.assign(mesh.userData.articleUrl);
    });
    this.scrollArea?.addEventListener("pointercancel", () => {
      this.pointerDown = null;
      this.setArticleHover(null);
    });
    this.scrollArea?.addEventListener("pointerleave", () => {
      this.pointerTarget.set(0, 0);
      this.pointerDown = null;
      this.setArticleHover(null);
    });
    window.addEventListener("resize", () => this.resize());
  }

  syncFromScroll() {
    if (!this.scrollArea) {
      return;
    }
    const targetCard = this.cards[0];
    const nextCard = this.cards[1] || this.cards[0];

    if (!targetCard || !nextCard) {
      return;
    }

    const galleryRect = this.gallery.getBoundingClientRect();
    const scrollRect = this.scrollArea.getBoundingClientRect();
    const galleryLeft = galleryRect.left - scrollRect.left + this.scrollArea.scrollLeft;
    const targetCenter = galleryLeft + targetCard.offsetLeft + targetCard.offsetWidth / 2;
    const nextCenter = galleryLeft + nextCard.offsetLeft + nextCard.offsetWidth / 2;
    const baseScroll = targetCenter - this.scrollArea.clientWidth / 2;
    const step = Math.max(1, Math.abs(nextCenter - targetCenter));
    const progress = (this.scrollArea.scrollLeft - baseScroll) / step;
    const direction = this.mode === "inside" ? 1 : -1;
    this.targetRotation = direction * progress * this.angleStep;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const aspect = width / height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.75 ? 64 : 44;
    this.camera.updateProjectionMatrix();
    this.fitCoreCrystalToViewport();
    this.syncFromScroll();
  }

  fitCoreCrystalToViewport() {
    if (!this.coreCrystal) {
      return;
    }

    const { group, geometrySize } = this.coreCrystal;
    const distance = Math.max(0.1, Math.abs(this.baseCameraZ - group.position.z));
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const visibleHeight = 2 * Math.tan(verticalFov / 2) * distance;
    const visibleWidth = visibleHeight * this.camera.aspect;
    const targetFill = 0.86;
    const fittedScale = Math.min(
      visibleWidth * targetFill / geometrySize.x,
      visibleHeight * targetFill / geometrySize.y,
    );

    this.coreCrystal.baseScale = fittedScale;
    group.scale.setScalar(fittedScale);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (!this.windowEl?.classList.contains("is-open")) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    if (Math.round(rect.width) !== Math.round(this.renderer.domElement.width / this.renderer.getPixelRatio())
      || Math.round(rect.height) !== Math.round(this.renderer.domElement.height / this.renderer.getPixelRatio())) {
      this.resize();
    }

    this.pointer.lerp(this.pointerTarget, 0.075);

    const previousRotation = this.rotation;
    const isWheelFollowing = this.windowEl?.classList.contains("is-wheel-following");
    const response = prefersReducedMotion ? 0.32 : isWheelFollowing ? 0.46 : 0.22;
    this.rotation += (this.targetRotation - this.rotation) * response;
    this.angularVelocity = this.rotation - previousRotation;

    const displayRotation = this.rotation;
    const speed = Math.min(1, Math.abs(this.angularVelocity) * 18);
    const elapsed = performance.now() * 0.001;
    this.rig.rotation.y = displayRotation;
    this.rig.rotation.x += (0 - this.rig.rotation.x) * 0.07;
    this.camera.position.x += (this.pointer.x * 0.08 - this.camera.position.x) * 0.055;
    this.camera.position.y += (0 - this.camera.position.y) * 0.055;
    this.camera.position.z += (this.baseCameraZ + (this.mode === "outside" ? speed * 0.34 : -speed * 0.05) - this.camera.position.z) * 0.05;
    this.guideGroup.rotation.y += 0.00028;
    this.guideGroup.rotation.x = Math.sin(elapsed * 0.16) * 0.025;

    if (this.atmosphere) {
      this.atmosphere.rotation.y -= 0.00042;
      this.atmosphere.rotation.x = Math.sin(elapsed * 0.12) * 0.04;
    }

    if (this.networkSignals?.length) {
      const positions = this.networkSignalGeometry.attributes.position;
      const colors = this.networkSignalGeometry.attributes.color;
      const headPositions = this.networkSignalHeadGeometry.attributes.position;
      const headColors = this.networkSignalHeadGeometry.attributes.color;
      const positionArray = positions.array;
      const colorArray = colors.array;
      const headPositionArray = headPositions.array;
      const headColorArray = headColors.array;

      colorArray.fill(0);
      headColorArray.fill(0);
      this.networkSignals.forEach((signal, signalIndex) => {
        const cycle = ((elapsed + signal.delay) % signal.duration) / signal.duration;
        const active = cycle < signal.activeWindow;

        if (!active) {
          return;
        }

        const activeProgress = active ? cycle / signal.activeWindow : 0;
        const head = signal.direction > 0 ? activeProgress : 1 - activeProgress;
        const envelope = Math.sin(Math.PI * activeProgress);
        const flicker = 0.88 + Math.sin(elapsed * 18 + signalIndex * 2.1) * 0.12;

        for (let segmentIndex = 0; segmentIndex < signal.tailSegmentCount; segmentIndex += 1) {
          for (let endpoint = 0; endpoint < 2; endpoint += 1) {
            const tailIndex = segmentIndex + endpoint;
            const progress = THREE.MathUtils.clamp(
              head - signal.direction * tailIndex * signal.tailStep,
              0,
              1,
            );
            const scaledPoint = progress * (signal.pathPoints.length - 1);
            const pointIndex = Math.min(signal.pathPoints.length - 2, Math.floor(scaledPoint));
            const pointMix = scaledPoint - pointIndex;
            const startPoint = signal.pathPoints[pointIndex];
            const endPoint = signal.pathPoints[pointIndex + 1];
            const vertexIndex = signal.vertexOffset + segmentIndex * 2 + endpoint;
            const arrayIndex = vertexIndex * 3;
            const tailFade = Math.pow(1 - tailIndex / (signal.tailSegmentCount + 1), 1.7);
            const brightness = envelope * tailFade * flicker;

            positionArray[arrayIndex] = startPoint.x + (endPoint.x - startPoint.x) * pointMix;
            positionArray[arrayIndex + 1] = startPoint.y + (endPoint.y - startPoint.y) * pointMix;
            positionArray[arrayIndex + 2] = startPoint.z + (endPoint.z - startPoint.z) * pointMix;
            colorArray[arrayIndex] = signal.color.r * brightness;
            colorArray[arrayIndex + 1] = signal.color.g * brightness;
            colorArray[arrayIndex + 2] = signal.color.b * brightness;

            if (tailIndex === 0) {
              const headArrayIndex = signalIndex * 3;
              const headBrightness = Math.min(1, brightness * 1.28);

              headPositionArray[headArrayIndex] = positionArray[arrayIndex];
              headPositionArray[headArrayIndex + 1] = positionArray[arrayIndex + 1];
              headPositionArray[headArrayIndex + 2] = positionArray[arrayIndex + 2];
              headColorArray[headArrayIndex] = signal.color.r * headBrightness;
              headColorArray[headArrayIndex + 1] = signal.color.g * headBrightness;
              headColorArray[headArrayIndex + 2] = signal.color.b * headBrightness;
            }
          }
        }
      });

      positions.needsUpdate = true;
      colors.needsUpdate = true;
      headPositions.needsUpdate = true;
      headColors.needsUpdate = true;
      this.networkNodeMaterial.opacity = 0.135 + Math.sin(elapsed * 0.7) * 0.025;
    }

    if (this.coreCrystal) {
      const spin = prefersReducedMotion ? 0 : 1;
      const {
        group,
        mainMaterial,
        innerMaterial,
        edgeMaterial,
        haloMaterial,
        baseScale,
        displayColor,
        highlightColor,
        rainbowColors,
      } = this.coreCrystal;
      const targetScale = baseScale * (1 + speed * 0.025);
      const nextScale = group.scale.x + (targetScale - group.scale.x) * 0.08;
      const colorPosition = (elapsed % 28) / 28 * rainbowColors.length;
      const colorIndex = Math.floor(colorPosition);
      const nextColorIndex = (colorIndex + 1) % rainbowColors.length;
      const colorMix = colorPosition - colorIndex;

      displayColor.copy(rainbowColors[colorIndex]).lerp(rainbowColors[nextColorIndex], colorMix);

      group.position.y = Math.sin(elapsed * 0.72) * 0.075 * spin;
      group.rotation.x = -0.04 + Math.sin(elapsed * 0.42) * 0.045 * spin;
      group.rotation.y = -0.16 + elapsed * 0.105 * spin + displayRotation * 0.16;
      group.rotation.z = 0.018 + Math.sin(elapsed * 0.34) * 0.022 * spin;
      group.scale.setScalar(nextScale);

      mainMaterial.opacity = 0.58 + speed * 0.08;
      mainMaterial.emissiveIntensity = 0.44 + speed * 0.18;
      mainMaterial.color.copy(displayColor).lerp(highlightColor, 0.22);
      mainMaterial.emissive.copy(displayColor);
      innerMaterial.opacity = 0.18 + speed * 0.07;
      innerMaterial.color.copy(displayColor);
      edgeMaterial.opacity = 0.82 + speed * 0.12;
      edgeMaterial.color.copy(displayColor).lerp(highlightColor, 0.38);
      haloMaterial.opacity = 0.16 + speed * 0.08;
      haloMaterial.color.copy(displayColor);
    }

    this.meshes.forEach((mesh, index) => {
      const worldAngle = this.mode === "inside"
        ? mesh.userData.baseAngle - displayRotation
        : mesh.userData.baseAngle + displayRotation;
      const normalizedDistance = Math.abs(worldAngle) / this.angleStep;
      const focus = Math.pow(Math.max(0, 1 - normalizedDistance), 3.3);
      const hover = index === this.hoveredIndex ? 1 : 0;
      const scale = (0.46 + focus * 0.64) * (1 + hover * 0.025);
      mesh.scale.setScalar(scale);
      mesh.material.opacity = 0.07 + focus * 0.93;
      mesh.material.emissiveIntensity = 0.035 + focus * 0.16 + hover * 0.08;
      mesh.position.y = mesh.userData.baseY
        + (prefersReducedMotion ? 0 : Math.sin(elapsed * 0.55 + index * 0.9) * 0.025 * focus);
      mesh.rotation.z = Math.sin(worldAngle) * -0.045;
      mesh.renderOrder = Math.round(focus * 100);
    });

    this.renderer.render(this.scene, this.camera);
  }
}

async function bootSphereScenes() {
  if (scenes.length === 0) {
    return;
  }

  try {
    THREE = await loadThree();
  } catch (error) {
    scenes.forEach((canvas) => canvas.closest(".immersive-window")?.classList.add("sphere-fallback"));
    console.warn("Three.js failed to load. Falling back to the readable card layout.", error);
    return;
  }

  const experiences = [];
  scenes.forEach((canvas) => {
    try {
      experiences.push(new SphereExperience(canvas));
    } catch (error) {
      canvas.closest(".immersive-window")?.classList.add("sphere-fallback");
      console.warn("3D sphere scene failed to initialize", error);
    }
  });

  window.__sphereExperiences = experiences;
}

async function loadThree() {
  const sources = [
    "https://fastly.jsdelivr.net/npm/three@0.165.0/build/three.module.js",
    "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js",
  ];
  let lastError;

  for (const source of sources) {
    try {
      return await import(source);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

bootSphereScenes();
