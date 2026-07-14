const root = document.documentElement;
const pageBody = document.body;
const openButtons = [...document.querySelectorAll("[data-open]")];
const closeButtons = [...document.querySelectorAll("[data-close]")];
const centerButtons = [...document.querySelectorAll("[data-center]")];
const windows = [...document.querySelectorAll(".app-window")];
const filterInputs = [...document.querySelectorAll("[data-filter]")];
const clock = document.querySelector("#system-clock");
const windowLayer = document.querySelector(".window-layer");
const desktopShell = document.querySelector(".desktop-shell");
const sphereGalleries = [...document.querySelectorAll("[data-sphere-gallery]")];
const aboutTimeline = document.querySelector("[data-about-timeline]");
const aboutTimelineCube = document.querySelector("[data-about-timeline-cube]");
const aboutTimelineFaces = [...document.querySelectorAll("[data-about-timeline-face]")];
const aboutTimelineList = document.querySelector("[data-about-timeline-list]");
const aboutTimelineItems = [...document.querySelectorAll("[data-about-timeline-item]")]
  .sort((left, right) => (right.dataset.date || "").localeCompare(left.dataset.date || ""));
const aboutTimelineCurrent = document.querySelector("[data-about-timeline-current]");
const aboutTimelineAngle = document.querySelector("[data-about-timeline-angle]");
const aboutTimelineTotals = [...document.querySelectorAll("[data-about-timeline-total]")];
const aboutNetworkField = document.querySelector("[data-about-network]");
const gameLibraryScroll = document.querySelector("#window-games .game-ui-scroll");
const gameCarousel = document.querySelector("[data-game-carousel]");
const gameEntries = [...document.querySelectorAll("#window-games [data-game-entry]")];
const gamePrevButton = document.querySelector("[data-game-prev]");
const gameNextButton = document.querySelector("[data-game-next]");
const gameCounter = document.querySelector("[data-game-counter]");
const gameDots = [...document.querySelectorAll("[data-game-dot]")];
const sphereNavigationState = new WeakMap();
const sparkleShapes = ["heart", "star", "flower", "moon"];
const sparkleGlyphs = {
  heart: "♥",
  star: "✦",
  flower: "✿",
  moon: "☾",
};
const aboutCubeColors = [
  ["#ff3b5c", "255 59 92"],
  ["#ff6b57", "255 107 87"],
  ["#ff8a2a", "255 138 42"],
  ["#ffb020", "255 176 32"],
  ["#ffe04b", "255 224 75"],
  ["#b8ff3d", "184 255 61"],
  ["#39e66b", "57 230 107"],
  ["#20d99a", "32 217 154"],
  ["#55f2c4", "85 242 196"],
  ["#22d3c5", "34 211 197"],
  ["#35e7ff", "53 231 255"],
  ["#45bfff", "69 191 255"],
  ["#3f7cff", "63 124 255"],
  ["#3155ff", "49 85 255"],
  ["#5b50ff", "91 80 255"],
  ["#8f5cff", "143 92 255"],
  ["#ba55ff", "186 85 255"],
  ["#ec46ff", "236 70 255"],
  ["#ff3fc5", "255 63 197"],
  ["#ff5f9e", "255 95 158"],
  ["#ff4f74", "255 79 116"],
  ["#ffd166", "255 209 102"],
  ["#4fffe1", "79 255 225"],
  ["#d7ff4f", "215 255 79"],
];

let activeWindowKey = "";
let topZIndex = 20;
let lastTrailAt = 0;
let lastCollapseAt = 0;
let pendingOpenTimer = 0;
let homeGlitchTimer = 0;
let gamePortalTimers = [];
let gameVhsFrame = 0;
let gameVhsLastPaint = 0;
let gameCarouselIndex = 0;
let gameCarouselWheelDelta = 0;
let gameCarouselWheelIdleTimer = 0;
let gameCarouselTransitionTimer = 0;
let gameCarouselLastWheelAt = 0;
let gameCarouselLocked = false;
let gameCarouselPointerStart = null;
let gameCarouselSuppressClick = false;
let gameCarouselClickResetTimer = 0;
let isGamePortalTransitioning = false;
let isWindowSwitching = false;
let aboutTransitionTimers = [];
let aboutTimelineIndex = 0;
let aboutTimelineQuarter = 0;
let aboutTimelineWheelDelta = 0;
let aboutTimelineWheelConsumed = false;
let aboutTimelineWheelIdleTimer = 0;
let aboutTimelineAnimationTimer = 0;
let aboutTimelineAutoTimer = 0;
let aboutTimelineAutoPaused = false;
let aboutTimelinePendingIndex = null;
let aboutTimelinePointerStart = null;
let lastAboutCubePrimary = -1;
const homeGlitchReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const GAME_PORTAL_TRAVEL_DURATION = 420;
const GAME_PORTAL_TOTAL_DURATION = 1780;
const GAME_CLOSE_COLLAPSE_DURATION = 620;
const GAME_CAROUSEL_DURATION = 680;
const GAME_CAROUSEL_WHEEL_THRESHOLD = 140;
const GAME_CAROUSEL_WHEEL_QUIET = 150;
const DEFAULT_WINDOW_CLOSE_DURATION = 180;
const WINDOW_SWITCH_GAP = 34;
const ABOUT_LASER_DURATION = 600;
const ABOUT_OPEN_DURATION = 760;
const ABOUT_CLOSE_DURATION = 640;
const ABOUT_TIMELINE_DURATION = 720;
const ABOUT_TIMELINE_WHEEL_THRESHOLD = 44;
const ABOUT_TIMELINE_AUTO_DELAY = 5600;
const windowState = new Map(
  windows.map((panel) => [
    panel.dataset.window || "",
    {
      dragged: false,
      left: null,
      top: null,
    },
  ]),
);

function getWindowByKey(key) {
  return document.querySelector(`.app-window[data-window="${key}"]`);
}

function setGameEntryVisible(entry, isVisible) {
  entry.classList.toggle("is-game-visible", isVisible);

  if (!isVisible) {
    return;
  }

  entry.querySelectorAll("img[data-src]").forEach((image) => {
    image.src = image.dataset.src || "";
    image.removeAttribute("data-src");
  });
}

function wrapGameCarouselIndex(index) {
  return (index + gameEntries.length) % gameEntries.length;
}

function syncGameCarousel() {
  if (!gameEntries.length) {
    return;
  }

  gameEntries.forEach((entry, index) => {
    let offset = wrapGameCarouselIndex(index - gameCarouselIndex);

    if (offset > gameEntries.length / 2) {
      offset -= gameEntries.length;
    }

    const position = offset === 0 ? "current" : offset === -1 ? "prev" : offset === 1 ? "next" : "far";
    const isCurrent = position === "current";

    entry.dataset.carouselPosition = position;
    entry.setAttribute("aria-hidden", String(!isCurrent));
    entry.toggleAttribute("inert", !isCurrent);
    if (isCurrent) {
      entry.setAttribute("aria-current", "true");
    } else {
      entry.removeAttribute("aria-current");
    }
    setGameEntryVisible(entry, isCurrent);
  });

  gameDots.forEach((dot, index) => {
    const isCurrent = index === gameCarouselIndex;
    dot.classList.toggle("is-active", isCurrent);
    if (isCurrent) {
      dot.setAttribute("aria-current", "true");
    } else {
      dot.removeAttribute("aria-current");
    }
  });

  if (gameCounter) {
    gameCounter.textContent = `${String(gameCarouselIndex + 1).padStart(2, "0")} / ${String(gameEntries.length).padStart(2, "0")}`;
  }
}

function unlockGameCarouselWhenSettled() {
  const wheelQuietFor = performance.now() - gameCarouselLastWheelAt;

  if (gameCarouselLastWheelAt && wheelQuietFor < GAME_CAROUSEL_WHEEL_QUIET) {
    gameCarouselTransitionTimer = window.setTimeout(
      unlockGameCarouselWhenSettled,
      GAME_CAROUSEL_WHEEL_QUIET - wheelQuietFor,
    );
    return;
  }

  gameCarouselLocked = false;
  gameCarousel?.classList.remove("is-game-card-rotating");
}

function goToGameCarousel(index) {
  const nextIndex = wrapGameCarouselIndex(index);

  if (gameCarouselLocked || nextIndex === gameCarouselIndex) {
    return;
  }

  gameCarouselLocked = true;
  gameCarouselIndex = nextIndex;
  gameCarousel?.classList.add("is-game-card-rotating");
  syncGameCarousel();

  window.clearTimeout(gameCarouselTransitionTimer);
  gameCarouselTransitionTimer = window.setTimeout(unlockGameCarouselWhenSettled, GAME_CAROUSEL_DURATION);
}

function moveGameCarousel(step) {
  goToGameCarousel(gameCarouselIndex + step);
}

function setupGameLibrary() {
  if (!gameLibraryScroll || !gameCarousel || !gameEntries.length) {
    return;
  }

  gameEntries.forEach((entry) => {
    entry.querySelectorAll("img").forEach((image) => {
      image.loading = "lazy";
      image.decoding = "async";
      image.fetchPriority = "low";
    });
  });

  syncGameCarousel();

  gameCarousel.addEventListener("wheel", (event) => {
    event.preventDefault();
    gameCarouselLastWheelAt = performance.now();

    if (gameCarouselLocked) {
      return;
    }

    const pageScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? gameCarousel.clientHeight : 1;
    const normalizedDelta = Math.max(-90, Math.min(90, event.deltaY * pageScale));

    gameCarouselWheelDelta += normalizedDelta;
    window.clearTimeout(gameCarouselWheelIdleTimer);
    gameCarouselWheelIdleTimer = window.setTimeout(() => {
      gameCarouselWheelDelta = 0;
    }, 180);

    if (Math.abs(gameCarouselWheelDelta) < GAME_CAROUSEL_WHEEL_THRESHOLD) {
      return;
    }

    const direction = Math.sign(gameCarouselWheelDelta);
    gameCarouselWheelDelta = 0;
    moveGameCarousel(direction);
  }, { passive: false });

  gameCarousel.addEventListener("pointerdown", (event) => {
    const target = event.target instanceof Element ? event.target : null;

    if (event.button !== 0 || target?.closest("button")) {
      return;
    }

    gameCarouselPointerStart = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  });

  gameCarousel.addEventListener("pointerup", (event) => {
    if (!gameCarouselPointerStart || gameCarouselPointerStart.id !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - gameCarouselPointerStart.x;
    const deltaY = event.clientY - gameCarouselPointerStart.y;
    gameCarouselPointerStart = null;

    if (Math.abs(deltaY) >= 54 && Math.abs(deltaY) > Math.abs(deltaX) * 1.15) {
      event.preventDefault();
      gameCarouselSuppressClick = true;
      window.clearTimeout(gameCarouselClickResetTimer);
      gameCarouselClickResetTimer = window.setTimeout(() => {
        gameCarouselSuppressClick = false;
      }, 120);
      moveGameCarousel(deltaY > 0 ? -1 : 1);
    }
  });

  gameCarousel.addEventListener("pointercancel", () => {
    gameCarouselPointerStart = null;
  });

  gameCarousel.addEventListener("click", (event) => {
    if (!gameCarouselSuppressClick) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }, true);

  gameLibraryScroll.addEventListener("keydown", (event) => {
    if (["ArrowDown", "PageDown"].includes(event.key)) {
      event.preventDefault();
      moveGameCarousel(1);
    } else if (["ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      moveGameCarousel(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goToGameCarousel(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goToGameCarousel(gameEntries.length - 1);
    }
  });

  gamePrevButton?.addEventListener("click", () => moveGameCarousel(-1));
  gameNextButton?.addEventListener("click", () => moveGameCarousel(1));
  gameDots.forEach((dot, index) => {
    dot.addEventListener("click", () => goToGameCarousel(index));
  });
}

function syncLauncherState() {
  openButtons.forEach((button) => {
    const panel = getWindowByKey(button.dataset.open || "");
    const isPanelOpen = Boolean(panel?.classList.contains("is-open"));
    const isDisabled = isWindowSwitching || isPanelOpen;

    button.classList.toggle("is-active", isPanelOpen);
    button.setAttribute("aria-disabled", String(isDisabled));
    if ("disabled" in button) {
      button.disabled = isDisabled;
    }
  });
}

function setWindowSwitching(isSwitching) {
  isWindowSwitching = isSwitching;
  root.classList.toggle("is-window-switching", isSwitching);
  pageBody.classList.toggle("is-window-switching", isSwitching);
  windowLayer?.setAttribute("aria-busy", String(isSwitching));
  syncLauncherState();
}

function syncWindowEnvironment() {
  const hasOpenWindow = windows.some((item) => item.classList.contains("is-open"));
  const hasImmersiveWindow = windows.some((item) => item.classList.contains("is-open") && item.classList.contains("immersive-window"));
  root.classList.toggle("has-open-window", hasOpenWindow);
  root.classList.toggle("has-immersive-window", hasImmersiveWindow);
  pageBody.classList.toggle("has-open-window", hasOpenWindow);
  pageBody.classList.toggle("has-immersive-window", hasImmersiveWindow);
  windowLayer?.classList.toggle("is-active", hasOpenWindow);
}

function centerWindow(panel, options = {}) {
  if (!panel) {
    return;
  }

  const key = panel.dataset.window || "";
  const state = windowState.get(key);

  if (panel.classList.contains("immersive-window")) {
    panel.style.left = "";
    panel.style.top = "";
    panel.style.right = "";
    panel.style.bottom = "";
    return;
  }

  if (window.innerWidth <= 920) {
    panel.style.left = "";
    panel.style.top = `${Math.max(12, Math.round((window.innerHeight - panel.offsetHeight) / 2))}px`;
    panel.style.right = "";
    panel.style.bottom = "auto";

    if (state) {
      state.dragged = false;
      state.left = null;
      state.top = null;
    }

    return;
  }

  const desktopScale = Number.parseFloat(
    window.getComputedStyle(root).getPropertyValue("--desktop-scale"),
  ) || 1;
  const panelWidth = (panel.offsetWidth || panel.getBoundingClientRect().width) * desktopScale;
  const panelHeight = (panel.offsetHeight || panel.getBoundingClientRect().height) * desktopScale;
  const nextLeft = Math.max(12 / desktopScale, Math.round((window.innerWidth - panelWidth) / 2 / desktopScale));
  const nextTop = Math.max(76 / desktopScale, Math.round((window.innerHeight - panelHeight) / 2 / desktopScale));

  panel.style.left = `${nextLeft}px`;
  panel.style.top = `${nextTop}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";

  if (state) {
    state.dragged = Boolean(options.rememberPosition);
    state.left = options.rememberPosition ? nextLeft : null;
    state.top = options.rememberPosition ? nextTop : null;
  }
}

function applyWindowPlacement(panel) {
  const key = panel?.dataset.window || "";
  const state = windowState.get(key);

  if (!panel) {
    return;
  }

  if (key !== "articles" && key !== "works") {
    centerWindow(panel);
    return;
  }

  if (panel.classList.contains("immersive-window")) {
    panel.style.left = "";
    panel.style.top = "";
    panel.style.right = "";
    panel.style.bottom = "";
    return;
  }

  if (window.innerWidth <= 920) {
    panel.style.left = "";
    panel.style.top = "";
    panel.style.right = "";
    panel.style.bottom = "";
    return;
  }

  if (state?.dragged && state.left !== null && state.top !== null) {
    panel.style.left = `${state.left}px`;
    panel.style.top = `${state.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    return;
  }

  centerWindow(panel);
}

function focusWindow(panel) {
  if (!panel) {
    return;
  }

  activeWindowKey = panel.dataset.window || "";
  topZIndex += 1;
  panel.style.zIndex = String(topZIndex);

  windows.forEach((item) => {
    item.classList.toggle("is-focused", item === panel);
  });

  syncLauncherState();
}

function clearAboutTransitionTimers() {
  aboutTransitionTimers.forEach((timer) => window.clearTimeout(timer));
  aboutTransitionTimers = [];
}

function queueAboutTransition(callback, delay) {
  const timer = window.setTimeout(callback, delay);
  aboutTransitionTimers.push(timer);
  return timer;
}

function syncAboutCubeGeometry(panel = getWindowByKey("about")) {
  if (panel) {
    const panelWidth = panel.offsetWidth || panel.getBoundingClientRect().width;

    if (panelWidth) {
      panel.style.setProperty("--about-window-depth", `${Math.round(panelWidth / 2)}px`);
    }
  }

  if (aboutTimeline && aboutTimelineCube) {
    const cubeHeight = aboutTimelineCube.clientHeight || Math.max(180, aboutTimeline.clientHeight - 28);

    aboutTimeline.style.setProperty("--about-timeline-depth", `${Math.round(cubeHeight / 2)}px`);
  }
}

function applyRandomAboutCubePalette() {
  if (!aboutTimeline || aboutCubeColors.length < 3) {
    return;
  }

  const candidates = aboutCubeColors.map((_, index) => index).filter((index) => index !== lastAboutCubePrimary);
  const primaryIndex = candidates[Math.floor(Math.random() * candidates.length)];
  const secondaryCandidates = candidates.filter((index) => index !== primaryIndex);
  const secondaryIndex = secondaryCandidates[Math.floor(Math.random() * secondaryCandidates.length)];
  const tertiaryCandidates = secondaryCandidates.filter((index) => index !== secondaryIndex);
  const tertiaryIndex = tertiaryCandidates[Math.floor(Math.random() * tertiaryCandidates.length)];
  const [primaryHex, primaryRgb] = aboutCubeColors[primaryIndex];
  const [secondaryHex, secondaryRgb] = aboutCubeColors[secondaryIndex];
  const [tertiaryHex, tertiaryRgb] = aboutCubeColors[tertiaryIndex];

  lastAboutCubePrimary = primaryIndex;
  aboutTimeline.style.setProperty("--about-cube-primary", primaryHex);
  aboutTimeline.style.setProperty("--about-cube-primary-rgb", primaryRgb);
  aboutTimeline.style.setProperty("--about-cube-secondary", secondaryHex);
  aboutTimeline.style.setProperty("--about-cube-secondary-rgb", secondaryRgb);
  aboutTimeline.style.setProperty("--about-cube-tertiary", tertiaryHex);
  aboutTimeline.style.setProperty("--about-cube-tertiary-rgb", tertiaryRgb);
}

function setupAboutNetworkField() {
  if (!aboutNetworkField || aboutNetworkField.childElementCount) {
    return;
  }

  const fragment = document.createDocumentFragment();

  for (let index = 0; index < 42; index += 1) {
    const link = document.createElement("span");
    const pulse = document.createElement("i");

    link.className = "about-network-link";
    link.style.setProperty("--network-x", `${Math.round(-8 + Math.random() * 100)}%`);
    link.style.setProperty("--network-y", `${Math.round(4 + Math.random() * 92)}%`);
    link.style.setProperty("--network-length", `${Math.round(70 + Math.random() * 190)}px`);
    link.style.setProperty("--network-angle", `${Math.round(-72 + Math.random() * 144)}deg`);
    link.style.setProperty("--network-delay", `${Math.round(-9000 + Math.random() * 9000)}ms`);
    link.style.setProperty("--network-duration", `${Math.round(2100 + Math.random() * 4300)}ms`);
    link.style.setProperty("--network-opacity", (0.12 + Math.random() * 0.22).toFixed(2));
    link.appendChild(pulse);
    fragment.appendChild(link);
  }

  for (let index = 0; index < 24; index += 1) {
    const node = document.createElement("span");

    node.className = "about-network-node";
    node.style.left = `${Math.round(3 + Math.random() * 94)}%`;
    node.style.top = `${Math.round(4 + Math.random() * 92)}%`;
    node.style.setProperty("--node-delay", `${Math.round(-5000 + Math.random() * 5000)}ms`);
    fragment.appendChild(node);
  }

  aboutNetworkField.replaceChildren(fragment);
}

function wrapAboutTimelineIndex(index) {
  const count = aboutTimelineItems.length;

  if (!count) {
    return 0;
  }

  return ((index % count) + count) % count;
}

function getAboutTimelineEntry(index) {
  const item = aboutTimelineItems[wrapAboutTimelineIndex(index)];

  if (!item) {
    return null;
  }

  return {
    code: item.dataset.code || "TIMELINE / SIGNAL",
    date: item.dataset.date || "----.--.--",
    description: item.dataset.description || "",
    index: wrapAboutTimelineIndex(index),
    title: item.dataset.title || item.textContent.trim(),
  };
}

function populateAboutTimelineFace(face, entryIndex) {
  const entry = getAboutTimelineEntry(entryIndex);

  if (!face || !entry) {
    return;
  }

  face.dataset.entryIndex = String(entry.index);
  const number = face.querySelector("[data-about-detail-number]");
  const code = face.querySelector("[data-about-detail-code]");
  const date = face.querySelector("[data-about-detail-date]");
  const title = face.querySelector("[data-about-detail-title]");
  const description = face.querySelector("[data-about-detail-description]");

  if (number) number.textContent = String(entry.index + 1).padStart(2, "0");
  if (code) code.textContent = entry.code;
  if (date) date.textContent = entry.date;
  if (title) title.textContent = entry.title;
  if (description) description.textContent = entry.description;
}

function syncAboutTimelineSelection(options = {}) {
  aboutTimelineItems.forEach((item, index) => {
    const isActive = index === aboutTimelineIndex;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-current", isActive ? "step" : "false");
  });

  if (aboutTimelineCurrent) {
    aboutTimelineCurrent.textContent = String(aboutTimelineIndex + 1).padStart(2, "0");
  }

  aboutTimelineTotals.forEach((total) => {
    total.textContent = String(aboutTimelineItems.length).padStart(2, "0");
  });

  const activeItem = aboutTimelineItems[aboutTimelineIndex];
  if (!aboutTimelineList || !activeItem || options.scroll === false) {
    return;
  }

  const nextTop = Math.max(0, activeItem.offsetTop - (aboutTimelineList.clientHeight - activeItem.offsetHeight) / 2);
  if (options.immediate) {
    aboutTimelineList.scrollTop = nextTop;
  } else {
    aboutTimelineList.scrollTo({ top: nextTop, behavior: "smooth" });
  }
}

function updateAboutTimelineFaceState() {
  const activeSlot = ((aboutTimelineQuarter % aboutTimelineFaces.length) + aboutTimelineFaces.length) % aboutTimelineFaces.length;

  aboutTimelineFaces.forEach((face, index) => {
    const isActive = index === activeSlot;
    face.classList.toggle("is-active", isActive);
    face.setAttribute("aria-hidden", String(!isActive));
  });

  if (aboutTimelineAngle) {
    aboutTimelineAngle.textContent = `${String(activeSlot * 90).padStart(3, "0")}°`;
  }
}

function clearAboutTimelineAuto() {
  window.clearTimeout(aboutTimelineAutoTimer);
  aboutTimelineAutoTimer = 0;
  aboutTimeline?.classList.remove("is-auto-counting");
}

function scheduleAboutTimelineAuto() {
  clearAboutTimelineAuto();
  const panel = getWindowByKey("about");

  if (aboutTimelineAutoPaused || !panel?.classList.contains("is-open") || panel.classList.contains("is-about-closing")) {
    return;
  }

  aboutTimeline?.getBoundingClientRect();
  aboutTimeline?.classList.add("is-auto-counting");
  aboutTimelineAutoTimer = window.setTimeout(() => {
    navigateAboutTimeline(1, { source: "auto" });
  }, ABOUT_TIMELINE_AUTO_DELAY);
}

function setAboutTimelineAutoPaused(isPaused) {
  aboutTimelineAutoPaused = isPaused;

  if (isPaused) {
    clearAboutTimelineAuto();
  } else {
    scheduleAboutTimelineAuto();
  }
}

function renderAboutTimeline(nextIndex, options = {}) {
  if (!aboutTimeline || !aboutTimelineCube || !aboutTimelineFaces.length || !aboutTimelineItems.length) {
    return false;
  }

  const targetIndex = wrapAboutTimelineIndex(nextIndex);

  if (options.immediate) {
    aboutTimelineQuarter = 0;
    aboutTimelineIndex = targetIndex;
    aboutTimelinePendingIndex = null;
    applyRandomAboutCubePalette();
    aboutTimelineFaces.forEach((face, slot) => {
      const entryIndex = slot === aboutTimelineFaces.length - 1
        ? targetIndex - 1
        : targetIndex + slot;
      populateAboutTimelineFace(face, entryIndex);
    });
    aboutTimelineCube.classList.add("is-immediate");
    aboutTimelineCube.style.setProperty("--about-timeline-angle", "0deg");
    updateAboutTimelineFaceState();
    syncAboutTimelineSelection({ immediate: true });
    aboutTimelineCube.getBoundingClientRect();
    aboutTimelineCube.classList.remove("is-immediate", "is-rotating");
    return true;
  }

  if (aboutTimelineCube.classList.contains("is-rotating")) {
    aboutTimelinePendingIndex = targetIndex;
    return false;
  }

  if (targetIndex === aboutTimelineIndex) {
    syncAboutTimelineSelection();
    scheduleAboutTimelineAuto();
    return false;
  }

  const forwardDistance = wrapAboutTimelineIndex(targetIndex - aboutTimelineIndex);
  const backwardDistance = wrapAboutTimelineIndex(aboutTimelineIndex - targetIndex);
  const direction = options.direction || (forwardDistance <= backwardDistance ? 1 : -1);
  const nextQuarter = aboutTimelineQuarter + direction;
  const incomingSlot = ((nextQuarter % aboutTimelineFaces.length) + aboutTimelineFaces.length) % aboutTimelineFaces.length;

  applyRandomAboutCubePalette();
  populateAboutTimelineFace(aboutTimelineFaces[incomingSlot], targetIndex);
  aboutTimelineIndex = targetIndex;
  aboutTimelineQuarter = nextQuarter;
  syncAboutTimelineSelection();
  updateAboutTimelineFaceState();

  window.clearTimeout(aboutTimelineAnimationTimer);
  aboutTimelineCube.classList.remove("is-rotating");
  aboutTimelineCube.getBoundingClientRect();
  aboutTimelineCube.classList.add("is-rotating");
  aboutTimelineCube.style.setProperty("--about-timeline-angle", `${aboutTimelineQuarter * -90}deg`);
  clearAboutTimelineAuto();

  aboutTimelineAnimationTimer = window.setTimeout(() => {
    aboutTimelineCube.classList.remove("is-rotating");
    if (aboutTimelinePendingIndex !== null && aboutTimelinePendingIndex !== aboutTimelineIndex) {
      const pendingIndex = aboutTimelinePendingIndex;
      aboutTimelinePendingIndex = null;
      renderAboutTimeline(pendingIndex);
    } else {
      aboutTimelinePendingIndex = null;
      scheduleAboutTimelineAuto();
    }
  }, ABOUT_TIMELINE_DURATION);
  return true;
}

function navigateAboutTimeline(direction, options = {}) {
  return renderAboutTimeline(aboutTimelineIndex + direction, {
    ...options,
    direction,
  });
}

function resetAboutTimeline() {
  window.clearTimeout(aboutTimelineWheelIdleTimer);
  window.clearTimeout(aboutTimelineAnimationTimer);
  clearAboutTimelineAuto();
  aboutTimelineWheelDelta = 0;
  aboutTimelineWheelConsumed = false;
  aboutTimelinePendingIndex = null;
  aboutTimelinePointerStart = null;
  syncAboutCubeGeometry();
  renderAboutTimeline(0, { immediate: true });
}

function setupAboutTimeline() {
  if (!aboutTimeline || !aboutTimelineCube || !aboutTimelineFaces.length || !aboutTimelineItems.length) {
    return;
  }

  aboutTimelineList?.replaceChildren(...aboutTimelineItems);
  setupAboutNetworkField();

  aboutTimelineItems.forEach((item, index) => {
    item.addEventListener("click", (event) => {
      event.stopPropagation();
      renderAboutTimeline(index);
    });
  });

  aboutTimelineList?.addEventListener("wheel", (event) => {
    event.stopPropagation();
  });

  aboutTimeline.addEventListener("wheel", (event) => {
    event.preventDefault();
    event.stopPropagation();

    window.clearTimeout(aboutTimelineWheelIdleTimer);
    aboutTimelineWheelIdleTimer = window.setTimeout(() => {
      aboutTimelineWheelDelta = 0;
      aboutTimelineWheelConsumed = false;
    }, 150);

    if (aboutTimelineWheelConsumed) {
      return;
    }

    const deltaScale = event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? aboutTimeline.clientHeight : 1;
    const dominantDelta = event.deltaY || event.deltaX;
    aboutTimelineWheelDelta += dominantDelta * deltaScale;

    if (Math.abs(aboutTimelineWheelDelta) < ABOUT_TIMELINE_WHEEL_THRESHOLD) {
      return;
    }

    navigateAboutTimeline(aboutTimelineWheelDelta > 0 ? 1 : -1, { source: "wheel" });
    aboutTimelineWheelDelta = 0;
    aboutTimelineWheelConsumed = true;
  }, { passive: false });

  aboutTimeline.addEventListener("keydown", (event) => {
    const direction = ["ArrowDown", "ArrowRight", "PageDown"].includes(event.key)
      ? 1
      : ["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)
        ? -1
        : 0;

    if (!direction) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    navigateAboutTimeline(direction, { source: "keyboard" });
  });

  aboutTimeline.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }

    aboutTimelinePointerStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    aboutTimeline.setPointerCapture?.(event.pointerId);
  });

  aboutTimeline.addEventListener("pointerup", (event) => {
    if (!aboutTimelinePointerStart || aboutTimelinePointerStart.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - aboutTimelinePointerStart.x;
    const deltaY = event.clientY - aboutTimelinePointerStart.y;
    aboutTimelinePointerStart = null;

    if (Math.abs(deltaY) < 42 || Math.abs(deltaY) < Math.abs(deltaX)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    navigateAboutTimeline(deltaY < 0 ? 1 : -1, { source: "swipe" });
  });

  aboutTimeline.addEventListener("pointercancel", () => {
    aboutTimelinePointerStart = null;
  });

  [aboutTimeline, aboutTimelineList].filter(Boolean).forEach((region) => {
    region.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") {
        setAboutTimelineAutoPaused(true);
      }
    });
    region.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") {
        setAboutTimelineAutoPaused(false);
      }
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearAboutTimelineAuto();
    } else {
      scheduleAboutTimelineAuto();
    }
  });

  resetAboutTimeline();
}

function activateWindowPanel(panel) {
  applyWindowPlacement(panel);
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  syncWindowEnvironment();
  resetImmersiveScroll(panel);
  focusWindow(panel);
  requestAnimationFrame(updateSphereGalleries);
}

function finalizeWindowClose(panel, key) {
  panel.classList.remove(
    "is-open",
    "is-focused",
    "is-dragging",
    "is-about-cutting",
    "is-about-opening",
    "is-about-closing",
  );
  panel.setAttribute("aria-hidden", "true");

  if (key === "home") {
    clearHomeGlitchTransition(panel);
  }

  if (key === "about") {
    clearAboutTransitionTimers();
    clearAboutTimelineAuto();
  }

  if (activeWindowKey === key) {
    activeWindowKey = "";
  }

  syncLauncherState();
  syncWindowEnvironment();
}

function startAboutOpen(panel) {
  clearAboutTransitionTimers();
  aboutTimelineAutoPaused = false;
  panel.classList.remove("is-about-cutting", "is-about-opening", "is-about-closing", "is-about-finalizing");
  activateWindowPanel(panel);
  resetAboutTimeline();
  syncAboutCubeGeometry(panel);
  panel.getBoundingClientRect();
  panel.classList.add("is-about-cutting");

  queueAboutTransition(() => {
    if (!panel.classList.contains("is-open")) {
      return;
    }
    panel.classList.remove("is-about-cutting");
    panel.classList.add("is-about-opening");
  }, ABOUT_LASER_DURATION);

  queueAboutTransition(() => {
    panel.classList.remove("is-about-opening");
    scheduleAboutTimelineAuto();
  }, ABOUT_LASER_DURATION + ABOUT_OPEN_DURATION);
}

function startAboutClose(panel, key) {
  clearAboutTransitionTimers();
  clearAboutTimelineAuto();
  panel.classList.remove("is-about-cutting", "is-about-opening");
  panel.classList.add("is-about-closing");

  if (activeWindowKey === key) {
    activeWindowKey = "";
  }
  syncLauncherState();

  queueAboutTransition(() => {
    panel.classList.add("is-about-finalizing");
    finalizeWindowClose(panel, key);
  }, ABOUT_CLOSE_DURATION);

  return ABOUT_CLOSE_DURATION;
}

function showWindow(panel, key) {
  if (key === "about") {
    startAboutOpen(panel);
    return;
  }

  activateWindowPanel(panel);
  if (key === "home") {
    playHomeGlitchTransition(panel);
  }
}

function clearHomeGlitchTransition(panel) {
  window.clearTimeout(homeGlitchTimer);
  homeGlitchTimer = 0;
  panel?.classList.remove("is-home-glitch-entering");
  document.querySelector(".home-glitch-overlay")?.remove();
  document.querySelector(".home-page-glitch-overlay")?.remove();
  root.classList.remove("is-home-transition-locked");
  pageBody.classList.remove("is-home-transition-locked");
}

function sanitizeHomeGlitchClone(clone) {
  clone.removeAttribute("id");
  clone.removeAttribute("data-window");
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");
  clone.querySelectorAll("[id], [data-open], [data-close], [data-center], [data-filter]").forEach((item) => {
    item.removeAttribute("id");
    item.removeAttribute("data-open");
    item.removeAttribute("data-close");
    item.removeAttribute("data-center");
    item.removeAttribute("data-filter");
    item.setAttribute("tabindex", "-1");
  });

  return clone;
}

function createHomeGlitchClone(panel, className) {
  const clone = sanitizeHomeGlitchClone(panel.cloneNode(true));

  clone.className = `app-window is-open ${className}`;

  return clone;
}

function createHomePageGlitchOverlay() {
  if (!desktopShell || homeGlitchReducedMotion) {
    return null;
  }

  const overlay = document.createElement("div");
  const channels = ["red", "green", "blue"];

  overlay.className = "home-page-glitch-overlay";
  overlay.setAttribute("aria-hidden", "true");

  channels.forEach((channel) => {
    const clone = sanitizeHomeGlitchClone(desktopShell.cloneNode(true));

    clone.className = `desktop-shell home-page-glitch-channel is-${channel}`;
    clone.style.zoom = window.getComputedStyle(desktopShell).zoom;
    clone.querySelectorAll(".app-window:not(.is-open)").forEach((windowPanel) => windowPanel.remove());
    clone.querySelectorAll("canvas").forEach((canvas) => canvas.remove());
    overlay.appendChild(clone);
  });

  for (let index = 0; index < 24; index += 1) {
    const tear = document.createElement("span");

    tear.className = "home-page-glitch-tear";
    tear.style.top = `${Math.round(2 + Math.random() * 95)}%`;
    tear.style.height = `${Math.round(2 + Math.random() * 14)}px`;
    tear.style.setProperty("--tear-shift", `${Math.round(-110 + Math.random() * 220)}px`);
    tear.style.setProperty("--tear-delay", `${Math.round(Math.random() * 360)}ms`);
    overlay.appendChild(tear);
  }

  pageBody.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-active"));
  return overlay;
}

function beginHomeGlitchTransition(panel) {
  clearHomeGlitchTransition(panel);
  root.classList.add("is-home-transition-locked");
  pageBody.classList.add("is-home-transition-locked");
  createHomePageGlitchOverlay();

  homeGlitchTimer = window.setTimeout(() => {
    clearHomeGlitchTransition(panel);
  }, homeGlitchReducedMotion ? 240 : 1250);
}

function playHomeGlitchTransition(panel) {
  if (!panel) {
    return;
  }

  window.clearTimeout(homeGlitchTimer);
  document.querySelector(".home-glitch-overlay")?.remove();

  if (homeGlitchReducedMotion) {
    homeGlitchTimer = window.setTimeout(() => clearHomeGlitchTransition(panel), 240);
    return;
  }

  panel.classList.remove("is-home-glitch-entering");
  panel.getBoundingClientRect();
  panel.classList.add("is-home-glitch-entering");

  const rect = panel.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) {
    clearHomeGlitchTransition(panel);
    return;
  }

  const overlay = document.createElement("div");
  const channels = ["red", "green", "blue"];

  overlay.className = "home-glitch-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.borderRadius = window.getComputedStyle(panel).borderRadius;

  channels.forEach((channel) => {
    const ghost = createHomeGlitchClone(panel, `home-glitch-channel is-${channel}`);
    overlay.appendChild(ghost);
  });

  const fragmentColumns = rect.width < 560 ? 6 : 7;
  const fragmentRows = rect.width < 560 ? 7 : 5;
  const scatterRadius = Math.max(rect.width, rect.height);
  const columnStep = 100 / fragmentColumns;
  const rowStep = 100 / fragmentRows;
  const vertices = Array.from({ length: fragmentRows + 1 }, (_, row) => (
    Array.from({ length: fragmentColumns + 1 }, (_, column) => {
      const edgeColumn = column === 0 || column === fragmentColumns;
      const edgeRow = row === 0 || row === fragmentRows;
      const x = column * columnStep + (edgeColumn ? 0 : (Math.random() * 2 - 1) * columnStep * 0.2);
      const y = row * rowStep + (edgeRow ? 0 : (Math.random() * 2 - 1) * rowStep * 0.2);

      return { x, y };
    })
  ));
  const fragmentFilters = [
    "grayscale(1) sepia(1) saturate(8) hue-rotate(310deg) contrast(1.35)",
    "grayscale(1) sepia(1) saturate(7) hue-rotate(72deg) contrast(1.3)",
    "grayscale(1) sepia(1) saturate(8) hue-rotate(176deg) contrast(1.35)",
    "contrast(1.12) saturate(1.18)",
  ];

  for (let row = 0; row < fragmentRows; row += 1) {
    for (let column = 0; column < fragmentColumns; column += 1) {
      const topLeft = vertices[row][column];
      const topRight = vertices[row][column + 1];
      const bottomRight = vertices[row + 1][column + 1];
      const bottomLeft = vertices[row + 1][column];
      const triangles = Math.random() > 0.5
        ? [[topLeft, topRight, bottomRight], [topLeft, bottomRight, bottomLeft]]
        : [[topLeft, topRight, bottomLeft], [topRight, bottomRight, bottomLeft]];

      triangles.forEach((points) => {
        const piece = createHomeGlitchClone(panel, "home-glitch-fragment");
        const centerX = points.reduce((total, point) => total + point.x, 0) / points.length;
        const centerY = points.reduce((total, point) => total + point.y, 0) / points.length;
        const outwardAngle = Math.atan2(centerY - 50, centerX - 50);
        const angle = Number.isFinite(outwardAngle)
          ? outwardAngle + (Math.random() * 2 - 1) * 0.78
          : Math.random() * Math.PI * 2;
        const distance = scatterRadius * (0.38 + Math.random() * 0.72);

        piece.style.clipPath = `polygon(${points.map((point) => `${point.x}% ${point.y}%`).join(", ")})`;
        piece.style.setProperty("--fragment-x", `${Math.round(Math.cos(angle) * distance)}px`);
        piece.style.setProperty("--fragment-y", `${Math.round(Math.sin(angle) * distance)}px`);
        piece.style.setProperty("--fragment-z", `${Math.round(-420 + Math.random() * 840)}px`);
        piece.style.setProperty("--fragment-rotate", `${Math.round(-180 + Math.random() * 360)}deg`);
        piece.style.setProperty("--fragment-delay", `${Math.round(Math.random() * 145)}ms`);
        piece.style.setProperty(
          "--fragment-filter",
          fragmentFilters[Math.floor(Math.random() * fragmentFilters.length)],
        );
        overlay.appendChild(piece);
      });
    }
  }

  for (let index = 0; index < 14; index += 1) {
    const tear = document.createElement("span");

    tear.className = "home-glitch-tear";
    tear.style.top = `${Math.round(4 + Math.random() * 90)}%`;
    tear.style.height = `${Math.round(2 + Math.random() * 9)}px`;
    tear.style.setProperty("--tear-shift", `${Math.round(-42 + Math.random() * 84)}px`);
    tear.style.setProperty("--tear-delay", `${Math.round(Math.random() * 220)}ms`);
    overlay.appendChild(tear);
  }

  pageBody.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-active"));

  homeGlitchTimer = window.setTimeout(() => {
    clearHomeGlitchTransition(panel);
  }, 980);
}

function queueGamePortalTransition(callback, delay) {
  const timer = window.setTimeout(callback, delay);
  gamePortalTimers.push(timer);
  return timer;
}

function clearGamePortalTransition() {
  gamePortalTimers.forEach((timer) => window.clearTimeout(timer));
  gamePortalTimers = [];

  if (gameVhsFrame) {
    window.cancelAnimationFrame(gameVhsFrame);
    gameVhsFrame = 0;
  }

  gameVhsLastPaint = 0;

  document.querySelector(".game-gravity-layer")?.remove();
  document.querySelector(".game-vhs-overlay")?.remove();
  document.querySelector(".game-close-singularity")?.remove();

  windows.forEach((panel) => {
    panel.classList.remove(
      "is-game-gravity-consumed",
      "is-game-portal-revealing",
      "is-game-portal-reveal-active",
      "is-game-portal-measuring",
      "is-game-closing",
      "is-game-close-finalizing",
    );
    panel.style.removeProperty("--game-gravity-shift-x");
    panel.style.removeProperty("--game-gravity-shift-y");
  });

  root.classList.remove("is-game-portal-locked");
  pageBody.classList.remove("is-game-portal-locked");
  isGamePortalTransitioning = false;
}

function getGamePortalOrigin(event) {
  if (
    Number.isFinite(event?.clientX)
    && Number.isFinite(event?.clientY)
    && (event.clientX !== 0 || event.clientY !== 0 || event.detail > 0)
  ) {
    return { x: event.clientX, y: event.clientY };
  }

  const triggerRect = event?.currentTarget?.getBoundingClientRect?.();
  if (triggerRect?.width) {
    return {
      x: triggerRect.left + triggerRect.width / 2,
      y: triggerRect.top + triggerRect.height / 2,
    };
  }

  return {
    x: Math.max(34, window.innerWidth * 0.12),
    y: Math.max(90, window.innerHeight * 0.28),
  };
}

function getGamePortalTargetRect(panel) {
  const panelRect = panel.getBoundingClientRect();
  const panelScale = getPanelScale(panel);
  const panelWidth = Math.min(panelRect.width || (panel.offsetWidth || 820) * panelScale, window.innerWidth - 32);
  const panelHeight = Math.min(panelRect.height || (panel.offsetHeight || 560) * panelScale, window.innerHeight - 96);

  return {
    left: (window.innerWidth - panelWidth) / 2,
    top: Math.max(48, (window.innerHeight - panelHeight) / 2),
    width: panelWidth,
    height: panelHeight,
    centerX: window.innerWidth / 2,
    centerY: Math.max(48, (window.innerHeight - panelHeight) / 2) + panelHeight / 2,
  };
}

function createGameGravityLayer(origin, targetRect) {
  const layer = document.createElement("div");
  const aperture = document.createElement("span");
  const well = document.createElement("span");
  const orb = document.createElement("span");

  layer.className = "game-gravity-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.style.setProperty("--gravity-origin-x", `${origin.x}px`);
  layer.style.setProperty("--gravity-origin-y", `${origin.y}px`);
  layer.style.setProperty("--gravity-target-x", `${targetRect.centerX}px`);
  layer.style.setProperty("--gravity-target-y", `${targetRect.centerY}px`);
  layer.style.setProperty("--gravity-mid-x", `${(origin.x + targetRect.centerX) / 2}px`);
  layer.style.setProperty(
    "--gravity-mid-y",
    `${Math.min(origin.y, targetRect.centerY) - Math.max(84, Math.abs(targetRect.centerX - origin.x) * 0.15)}px`,
  );

  aperture.className = "game-gravity-aperture";
  aperture.style.left = `${targetRect.left}px`;
  aperture.style.top = `${targetRect.top}px`;
  aperture.style.width = `${targetRect.width}px`;
  aperture.style.height = `${targetRect.height}px`;

  well.className = "game-gravity-well";
  orb.className = "game-gravity-orb";
  orb.appendChild(document.createElement("i"));
  well.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
  layer.append(aperture, well, orb);
  pageBody.appendChild(layer);

  requestAnimationFrame(() => layer.classList.add("is-traveling"));
  return layer;
}

function paintGameVhsNoise(canvas) {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    return;
  }

  const width = Math.min(320, Math.max(160, Math.ceil(window.innerWidth / 6)));
  const height = Math.min(180, Math.max(96, Math.ceil(window.innerHeight / 6)));
  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = false;
  const frame = context.createImageData(width, height);
  const pixels = frame.data;

  const paint = (time) => {
    if (!canvas.isConnected || !isGamePortalTransitioning) {
      return;
    }

    if (time - gameVhsLastPaint >= 50) {
      gameVhsLastPaint = time;

      for (let y = 0; y < height; y += 1) {
        const rowPulse = Math.random() < 0.055 ? (Math.random() > 0.5 ? 84 : -72) : 0;
        for (let x = 0; x < width; x += 1) {
          const offset = (y * width + x) * 4;
          const spark = Math.random();
          const base = spark > 0.985 ? 255 : spark < 0.018 ? 0 : Math.floor(Math.random() * 190 + 28);
          const value = Math.max(0, Math.min(255, base + rowPulse));

          pixels[offset] = value;
          pixels[offset + 1] = value;
          pixels[offset + 2] = value;
          pixels[offset + 3] = 255;
        }
      }

      context.putImageData(frame, 0, 0);
    }

    gameVhsFrame = window.requestAnimationFrame(paint);
  };

  gameVhsFrame = window.requestAnimationFrame(paint);
}

function createGameVhsOverlay() {
  const overlay = document.createElement("div");
  const canvas = document.createElement("canvas");
  const scanlines = document.createElement("span");

  overlay.className = "game-vhs-overlay";
  overlay.setAttribute("aria-hidden", "true");
  canvas.className = "game-vhs-noise";
  scanlines.className = "game-vhs-scanlines";
  overlay.append(canvas, scanlines);

  for (let index = 0; index < 18; index += 1) {
    const band = document.createElement("span");
    const shift = Math.round(-80 + Math.random() * 160);

    band.className = "game-vhs-band";
    band.style.setProperty("--vhs-y", `${Math.round(Math.random() * 98)}%`);
    band.style.setProperty("--vhs-height", `${Math.round(2 + Math.random() * 14)}px`);
    band.style.setProperty("--vhs-shift", `${shift}px`);
    band.style.setProperty("--vhs-shift-back", `${Math.round(shift * -0.5)}px`);
    band.style.setProperty("--vhs-shift-soft", `${Math.round(shift * 0.32)}px`);
    band.style.setProperty("--vhs-delay", `${Math.round(Math.random() * -520)}ms`);
    band.style.setProperty("--vhs-speed", `${Math.round(170 + Math.random() * 360)}ms`);
    overlay.appendChild(band);
  }

  pageBody.appendChild(overlay);
  paintGameVhsNoise(canvas);
  requestAnimationFrame(() => overlay.classList.add("is-active"));
  return overlay;
}

function prepareGamePortalSource(panel, targetRect) {
  if (!panel) {
    return;
  }

  const rect = panel.getBoundingClientRect();
  const scale = getPanelScale(panel);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  panel.style.setProperty("--game-gravity-shift-x", `${(targetRect.centerX - centerX) / scale}px`);
  panel.style.setProperty("--game-gravity-shift-y", `${(targetRect.centerY - centerY) / scale}px`);
}

function revealGamePortalPanel(panel, gravityLayer) {
  panel.classList.add("is-game-portal-revealing");
  activateWindowPanel(panel);
  panel.getBoundingClientRect();
  gravityLayer?.classList.add("is-releasing");

  requestAnimationFrame(() => {
    panel.classList.add("is-game-portal-reveal-active");
  });
}

function createGameCloseSingularity(panel) {
  document.querySelector(".game-close-singularity")?.remove();

  const rect = panel.getBoundingClientRect();
  const singularity = document.createElement("span");

  singularity.className = "game-close-singularity";
  singularity.setAttribute("aria-hidden", "true");
  singularity.style.left = `${rect.left + rect.width / 2}px`;
  singularity.style.top = `${rect.top + rect.height / 2}px`;
  pageBody.appendChild(singularity);
  requestAnimationFrame(() => singularity.classList.add("is-active"));
}

function startGameCollapseClose(panel, key) {
  if (homeGlitchReducedMotion) {
    finalizeWindowClose(panel, key);
    return DEFAULT_WINDOW_CLOSE_DURATION;
  }

  clearGamePortalTransition();
  isGamePortalTransitioning = true;
  root.classList.add("is-game-portal-locked");
  pageBody.classList.add("is-game-portal-locked");
  createGameCloseSingularity(panel);

  panel.classList.remove("is-game-close-finalizing");
  panel.getBoundingClientRect();
  panel.classList.add("is-game-closing");

  queueGamePortalTransition(() => {
    panel.classList.add("is-game-close-finalizing");
  }, GAME_CLOSE_COLLAPSE_DURATION - 24);

  queueGamePortalTransition(() => {
    finalizeWindowClose(panel, key);
    clearGamePortalTransition();
  }, GAME_CLOSE_COLLAPSE_DURATION);

  return GAME_CLOSE_COLLAPSE_DURATION;
}

function startGamePortalTransition(panel, event) {
  window.clearTimeout(pendingOpenTimer);
  clearGamePortalTransition();

  const currentOpenPanel = windows.find((item) => item.classList.contains("is-open") && item !== panel) || null;

  if (homeGlitchReducedMotion) {
    if (currentOpenPanel) {
      finalizeWindowClose(currentOpenPanel, currentOpenPanel.dataset.window || "");
    }
    showWindow(panel, "games");
    return;
  }

  if (currentOpenPanel?.dataset.window === "home") {
    clearHomeGlitchTransition(currentOpenPanel);
  }
  if (currentOpenPanel?.dataset.window === "about") {
    clearAboutTransitionTimers();
    clearAboutTimelineAuto();
    currentOpenPanel.classList.remove(
      "is-about-cutting",
      "is-about-opening",
      "is-about-closing",
      "is-about-finalizing",
    );
  }

  isGamePortalTransitioning = true;
  root.classList.add("is-game-portal-locked");
  pageBody.classList.add("is-game-portal-locked");

  applyWindowPlacement(panel);
  const targetRect = getGamePortalTargetRect(panel);
  const gravityLayer = createGameGravityLayer(getGamePortalOrigin(event), targetRect);
  prepareGamePortalSource(currentOpenPanel, targetRect);

  queueGamePortalTransition(() => {
    gravityLayer.classList.add("is-absorbing");
    currentOpenPanel?.classList.add("is-game-gravity-consumed");
  }, GAME_PORTAL_TRAVEL_DURATION);

  let vhsOverlay = null;
  queueGamePortalTransition(() => {
    vhsOverlay = createGameVhsOverlay();
  }, 640);

  queueGamePortalTransition(() => {
    if (currentOpenPanel) {
      const sourceKey = currentOpenPanel.dataset.window || "";
      finalizeWindowClose(currentOpenPanel, sourceKey);
      currentOpenPanel.classList.remove("is-game-gravity-consumed");
      currentOpenPanel.style.removeProperty("--game-gravity-shift-x");
      currentOpenPanel.style.removeProperty("--game-gravity-shift-y");
    }
  }, 900);

  queueGamePortalTransition(() => {
    revealGamePortalPanel(panel, gravityLayer);
  }, 920);

  queueGamePortalTransition(() => {
    vhsOverlay?.classList.add("is-clearing");
  }, 1100);

  queueGamePortalTransition(() => {
    gravityLayer.classList.add("is-finished");
  }, 1460);

  queueGamePortalTransition(() => {
    clearGamePortalTransition();
  }, GAME_PORTAL_TOTAL_DURATION);
}

function startRequestedWindow(panel, key, triggerEvent) {
  if (key === "games") {
    startGamePortalTransition(panel, triggerEvent);
    return;
  }

  if (key === "home") {
    beginHomeGlitchTransition(panel);
  }

  showWindow(panel, key);
}

function openWindow(key, triggerEvent) {
  if (isGamePortalTransitioning || isWindowSwitching) {
    return;
  }

  const panel = getWindowByKey(key);
  if (!panel) {
    return;
  }

  window.clearTimeout(pendingOpenTimer);
  pendingOpenTimer = 0;

  if (panel.classList.contains("is-open")) {
    focusWindow(panel);
    syncWindowEnvironment();
    return;
  }

  const currentOpenPanel = windows.find((item) => item.classList.contains("is-open"));

  if (currentOpenPanel && currentOpenPanel !== panel) {
    const triggerOrigin = getGamePortalOrigin(triggerEvent);
    setWindowSwitching(true);
    const closeDelay = closeWindow(currentOpenPanel.dataset.window || "");

    pendingOpenTimer = window.setTimeout(() => {
      pendingOpenTimer = 0;
      setWindowSwitching(false);
      startRequestedWindow(panel, key, {
        clientX: triggerOrigin.x,
        clientY: triggerOrigin.y,
        detail: 1,
      });
    }, Math.max(WINDOW_SWITCH_GAP, closeDelay + WINDOW_SWITCH_GAP));
    return;
  }

  startRequestedWindow(panel, key, triggerEvent);
}

function closeWindow(key) {
  if (isGamePortalTransitioning) {
    return GAME_PORTAL_TOTAL_DURATION;
  }

  const panel = getWindowByKey(key);
  if (!panel) {
    return 0;
  }

  if (!panel.classList.contains("is-open")) {
    return 0;
  }

  if (key === "games") {
    return startGameCollapseClose(panel, key);
  }

  if (key === "about") {
    if (panel.classList.contains("is-about-closing")) {
      return ABOUT_CLOSE_DURATION;
    }
    return startAboutClose(panel, key);
  }

  finalizeWindowClose(panel, key);
  return DEFAULT_WINDOW_CLOSE_DURATION;
}

setupAboutTimeline();
setupGameLibrary();

openButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    openWindow(button.dataset.open, event);
  });
});

closeButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    closeWindow(button.dataset.close);
  });
});

centerButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const panel = getWindowByKey(button.dataset.center);
    centerWindow(panel);
    focusWindow(panel);
  });
});

windows.forEach((panel) => {
  panel.addEventListener("pointerdown", () => {
    if (panel.classList.contains("is-open")) {
      focusWindow(panel);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeWindowKey) {
    closeWindow(activeWindowKey);
  }
});

window.addEventListener("resize", () => {
  document.querySelectorAll(".immersive-scroll").forEach(reflowSphereGallery);
  syncAboutCubeGeometry();

  windows.forEach((panel) => {
    const state = windowState.get(panel.dataset.window || "");
    if (!panel.classList.contains("is-open")) {
      return;
    }

    if (!state?.dragged) {
      centerWindow(panel);
    }
  });
  requestAnimationFrame(updateSphereGalleries);
});

filterInputs.forEach((input) => {
  input.addEventListener("input", () => {
    const list = document.querySelector(`[data-list="${input.dataset.filter}"]`);
    const query = input.value.trim().toLowerCase();

    if (!list) {
      return;
    }

    list.querySelectorAll("[data-keywords]").forEach((card) => {
      const haystack = `${card.textContent} ${card.dataset.keywords}`.toLowerCase();
      card.classList.toggle("is-hidden", !haystack.includes(query));
    });
  });
});

function updateClock() {
  if (!clock) {
    return;
  }

  clock.textContent = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

updateClock();
window.setInterval(updateClock, 30 * 1000);

function getPanelScale(panel) {
  const rect = panel.getBoundingClientRect();
  const width = panel.offsetWidth || rect.width;

  if (!width) {
    return 1;
  }

  return rect.width / width || 1;
}

function getPanelPosition(panel) {
  const styles = window.getComputedStyle(panel);
  const scale = getPanelScale(panel);
  const left = Number.parseFloat(styles.left);
  const top = Number.parseFloat(styles.top);

  if (Number.isFinite(left) && Number.isFinite(top)) {
    return { left, top, scale };
  }

  const rect = panel.getBoundingClientRect();
  return {
    left: rect.left / scale,
    top: rect.top / scale,
    scale,
  };
}

function makeWindowDraggable(panel) {
  const handle = panel.querySelector("[data-drag-handle]");

  if (!handle) {
    return;
  }

  if (panel.classList.contains("immersive-window")) {
    return;
  }

  handle.addEventListener("pointerdown", (event) => {
    if (window.innerWidth <= 920) {
      return;
    }

    if (event.target.closest("button, input, a")) {
      return;
    }

    focusWindow(panel);

    const rect = panel.getBoundingClientRect();
    const { left: startLeft, top: startTop, scale } = getPanelPosition(panel);
    const startX = event.clientX;
    const startY = event.clientY;
    const panelWidth = panel.offsetWidth || rect.width / scale;
    const panelHeight = panel.offsetHeight || rect.height / scale;

    event.preventDefault();

    panel.classList.add("is-dragging");
    panel.style.left = `${startLeft}px`;
    panel.style.top = `${startTop}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";

    function onPointerMove(moveEvent) {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;
      const maxLeft = Math.max(12, window.innerWidth / scale - panelWidth - 12);
      const maxTop = Math.max(76, window.innerHeight / scale - panelHeight - 96);
      const nextLeft = Math.min(Math.max(12, startLeft + deltaX), maxLeft);
      const nextTop = Math.min(Math.max(76, startTop + deltaY), maxTop);

      panel.style.left = `${nextLeft}px`;
      panel.style.top = `${nextTop}px`;
    }

    function onPointerUp() {
      const state = windowState.get(panel.dataset.window || "");
      const finalLeft = Number.parseFloat(panel.style.left);
      const finalTop = Number.parseFloat(panel.style.top);

      if (state) {
        state.dragged = true;
        state.left = Math.round(finalLeft);
        state.top = Math.round(finalTop);
      }

      panel.classList.remove("is-dragging");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  });
}

windows.forEach(makeWindowDraggable);

document.querySelectorAll(".immersive-scroll").forEach(setupSphereNavigation);

function getSphereNavigationState(scrollArea) {
  if (!sphereNavigationState.has(scrollArea)) {
    sphereNavigationState.set(scrollArea, {
      activeIndex: 0,
      targetIndex: 0,
      isAnimating: false,
      animationFrame: 0,
      snapTimer: 0,
      wheelActive: false,
      wheelIdleTimer: 0,
      targetScrollLeft: 0,
      copyTimer: 0,
    });
  }

  return sphereNavigationState.get(scrollArea);
}

function getSphereElements(scrollArea) {
  const gallery = scrollArea.querySelector("[data-sphere-gallery]");

  return {
    gallery,
    cards: [...(gallery?.children || [])],
    copy: scrollArea.querySelector("[data-sphere-copy]"),
    panel: scrollArea.closest(".immersive-window"),
  };
}

function setupSphereNavigation(scrollArea) {
  const state = getSphereNavigationState(scrollArea);
  const { cards, copy } = getSphereElements(scrollArea);
  const dots = copy?.querySelector("[data-sphere-dots]");

  syncSphereGalleryBounds(scrollArea);

  if (dots) {
    const fragment = document.createDocumentFragment();

    cards.forEach((card, index) => {
      const button = document.createElement("button");
      const title = card.querySelector("h3")?.textContent?.trim() || `第 ${index + 1} 项`;

      button.className = "sphere-dot";
      button.type = "button";
      button.setAttribute("aria-label", `展示 ${title}`);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        navigateSphereToIndex(scrollArea, index);
      });
      fragment.appendChild(button);
    });

    dots.replaceChildren(fragment);
  }

  navigateSphereToIndex(scrollArea, 0, { immediate: true });

  scrollArea.addEventListener("wheel", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (Math.abs(delta) < 1) {
      return;
    }

    const { gallery, cards, copy, panel } = getSphereElements(scrollArea);
    if (!gallery || cards.length === 0) {
      return;
    }

    const wasWheelActive = state.wheelActive;
    if (!wasWheelActive) {
      window.cancelAnimationFrame(state.animationFrame);
      window.clearTimeout(state.copyTimer);
      state.animationFrame = 0;
      state.targetScrollLeft = scrollArea.scrollLeft;
      copy?.classList.remove("is-changing", "is-arriving");
      renderSphereCopy(scrollArea, state.activeIndex);
    }

    const deltaUnit = event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? scrollArea.clientWidth
        : 1;
    const normalizedDelta = delta * deltaUnit;
    const isWorksCarousel = panel?.classList.contains("works-experience");
    const wheelSensitivity = isWorksCarousel ? 1.08 : 1.35;
    const maxMovementRatio = isWorksCarousel ? 0.26 : 0.32;
    const maxMovement = Math.max(48, scrollArea.clientWidth * maxMovementRatio);
    const movement = Math.min(
      Math.max(normalizedDelta * wheelSensitivity, -maxMovement),
      maxMovement,
    );
    const maxScroll = Math.max(0, scrollArea.scrollWidth - scrollArea.clientWidth);

    state.wheelActive = true;
    state.isAnimating = true;
    scrollArea.scrollTop = 0;
    scrollArea.scrollLeft = Math.min(Math.max(0, scrollArea.scrollLeft + movement), maxScroll);
    state.targetScrollLeft = scrollArea.scrollLeft;
    panel?.classList.add("is-sphere-moving", "is-wheel-following");
    syncSphereCopyToNearest(scrollArea);

    window.clearTimeout(state.wheelIdleTimer);
    state.wheelIdleTimer = window.setTimeout(() => {
      state.wheelActive = false;
      state.isAnimating = false;
      panel?.classList.remove("is-wheel-following");
      snapSphereToNearest(scrollArea, { duration: 420 });
    }, 90);
  }, { passive: false });

  scrollArea.addEventListener("keydown", (event) => {
    const keyDirections = {
      ArrowLeft: -1,
      ArrowRight: 1,
      PageUp: -1,
      PageDown: 1,
    };

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      navigateSphereToIndex(scrollArea, event.key === "Home" ? 0 : cards.length - 1);
      return;
    }

    if (keyDirections[event.key]) {
      event.preventDefault();
      navigateSphereToIndex(scrollArea, state.targetIndex + keyDirections[event.key]);
    }
  });

  scrollArea.addEventListener("scroll", () => {
    if (scrollArea.scrollTop !== 0) {
      scrollArea.scrollTop = 0;
    }

    requestAnimationFrame(updateSphereGalleries);

    if (state.isAnimating) {
      return;
    }

    syncSphereCopyToNearest(scrollArea);

    window.clearTimeout(state.snapTimer);
    state.snapTimer = window.setTimeout(() => snapSphereToNearest(scrollArea), 140);
  });
}

function syncSphereGalleryBounds(scrollArea) {
  const gallery = scrollArea.querySelector("[data-sphere-gallery]");
  const cards = [...(gallery?.children || [])];
  const firstCard = cards[0];
  const lastCard = cards.at(-1);

  if (!gallery || !firstCard || !lastCard) {
    return;
  }

  gallery.style.paddingLeft = "0px";
  gallery.style.paddingRight = "0px";

  const viewportCenter = scrollArea.clientWidth / 2;
  const firstCenter = getSphereCardCenter(firstCard, gallery, scrollArea);
  gallery.style.paddingLeft = `${Math.max(0, viewportCenter - firstCenter)}px`;

  const lastCenter = getSphereCardCenter(lastCard, gallery, scrollArea);
  const spaceAfterLast = scrollArea.scrollWidth - lastCenter;
  gallery.style.paddingRight = `${Math.max(0, viewportCenter - spaceAfterLast)}px`;
}

function getSphereCardCenter(card, gallery, scrollArea) {
  const galleryRect = gallery.getBoundingClientRect();
  const scrollRect = scrollArea.getBoundingClientRect();
  const galleryLeft = galleryRect.left - scrollRect.left + scrollArea.scrollLeft;

  return galleryLeft + card.offsetLeft + card.offsetWidth / 2;
}

function getSphereTargetLeft(scrollArea, gallery, card) {
  const target = getSphereCardCenter(card, gallery, scrollArea) - scrollArea.clientWidth / 2;
  const maxScroll = Math.max(0, scrollArea.scrollWidth - scrollArea.clientWidth);

  return Math.min(Math.max(0, target), maxScroll);
}

function getNearestSphereIndex(scrollArea, requestedLeft = scrollArea.scrollLeft) {
  const { gallery, cards } = getSphereElements(scrollArea);
  if (!gallery || cards.length === 0) {
    return 0;
  }

  const viewportCenter = requestedLeft + scrollArea.clientWidth / 2;
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  cards.forEach((card, index) => {
    const distance = Math.abs(getSphereCardCenter(card, gallery, scrollArea) - viewportCenter);
    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
    }
  });

  return nearestIndex;
}

function syncSphereCopyToNearest(scrollArea) {
  const state = getSphereNavigationState(scrollArea);
  const { copy } = getSphereElements(scrollArea);
  const nearestIndex = getNearestSphereIndex(scrollArea);

  if (nearestIndex === state.activeIndex) {
    return;
  }

  state.activeIndex = nearestIndex;
  state.targetIndex = nearestIndex;
  copy?.classList.remove("is-arriving");
  copy?.classList.add("is-changing");
  window.clearTimeout(state.copyTimer);
  state.copyTimer = window.setTimeout(() => {
    renderSphereCopy(scrollArea, nearestIndex);
    copy?.classList.remove("is-changing");
    copy?.classList.add("is-arriving");
    dispatchSphereIndexChange(scrollArea, nearestIndex);
    state.copyTimer = window.setTimeout(() => copy?.classList.remove("is-arriving"), 420);
  }, 80);
}

function renderSphereCopy(scrollArea, index) {
  const { cards, copy } = getSphereElements(scrollArea);
  const card = cards[index];

  if (!card) {
    return;
  }

  const meta = card.querySelector("time, .project-tag")?.textContent?.trim() || `${index + 1}`;
  const title = card.querySelector("h3")?.textContent?.trim() || `第 ${index + 1} 项`;
  const description = card.querySelector("p")?.textContent?.trim() || "";
  const total = cards.length;

  if (copy) {
    const metaNode = copy.querySelector("[data-sphere-meta]");
    const titleNode = copy.querySelector("[data-sphere-title]");
    const descriptionNode = copy.querySelector("[data-sphere-description]");
    const actionNode = copy.querySelector("[data-sphere-action]");
    const currentNode = copy.querySelector("[data-sphere-current]");
    const totalNode = copy.querySelector("[data-sphere-total]");
    const progress = copy.querySelector("[data-sphere-progress]");
    const dots = [...copy.querySelectorAll(".sphere-dot")];

    if (metaNode) metaNode.textContent = meta;
    if (titleNode) titleNode.textContent = title;
    if (descriptionNode) descriptionNode.textContent = description;
    if (actionNode) {
      const articleUrl = card.dataset.articleUrl?.trim() || "";

      actionNode.hidden = !articleUrl;
      if (articleUrl) {
        actionNode.href = articleUrl;
        actionNode.setAttribute("aria-label", `阅读全文：${title}`);
      } else {
        actionNode.removeAttribute("href");
        actionNode.removeAttribute("aria-label");
      }
    }
    if (currentNode) currentNode.textContent = String(index + 1).padStart(2, "0");
    if (totalNode) totalNode.textContent = String(total).padStart(2, "0");
    if (progress) progress.style.transform = `scaleX(${total ? (index + 1) / total : 0})`;

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === index;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });
  }

  cards.forEach((item, itemIndex) => {
    item.classList.toggle("is-active", itemIndex === index);
  });
}

function dispatchSphereIndexChange(scrollArea, index) {
  scrollArea.dispatchEvent(new CustomEvent("sphereindexchange", {
    detail: { index },
  }));
}

function navigateSphereToIndex(scrollArea, requestedIndex, options = {}) {
  const { gallery, cards, copy, panel } = getSphereElements(scrollArea);
  if (!gallery || cards.length === 0) {
    return;
  }

  const state = getSphereNavigationState(scrollArea);
  const index = Math.min(Math.max(0, requestedIndex), cards.length - 1);
  const targetLeft = getSphereTargetLeft(scrollArea, gallery, cards[index]);
  const startLeft = scrollArea.scrollLeft;
  const distance = targetLeft - startLeft;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.cancelAnimationFrame(state.animationFrame);
  window.clearTimeout(state.snapTimer);
  window.clearTimeout(state.wheelIdleTimer);
  window.clearTimeout(state.copyTimer);
  state.animationFrame = 0;
  state.wheelActive = false;
  state.targetIndex = index;
  state.targetScrollLeft = targetLeft;

  if (options.immediate || reduceMotion || Math.abs(distance) < 1) {
    state.isAnimating = false;
    state.animationFrame = 0;
    state.activeIndex = index;
    scrollArea.scrollTop = 0;
    scrollArea.scrollLeft = targetLeft;
    panel?.classList.remove("is-sphere-moving", "is-wheel-following");
    copy?.classList.remove("is-changing", "is-arriving");
    renderSphereCopy(scrollArea, index);
    updateSphereGalleries();
    dispatchSphereIndexChange(scrollArea, index);
    return;
  }

  state.isAnimating = true;
  panel?.classList.add("is-sphere-moving");
  copy?.classList.remove("is-arriving");
  copy?.classList.add("is-changing");

  const startTime = performance.now();
  const duration = options.duration || 760;
  let copySwapped = false;

  function animateScroll(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    scrollArea.scrollTop = 0;
    scrollArea.scrollLeft = startLeft + distance * eased;

    if (!copySwapped && progress >= 0.42) {
      copySwapped = true;
      renderSphereCopy(scrollArea, index);
      copy?.classList.remove("is-changing");
      copy?.classList.add("is-arriving");
    }

    if (progress < 1) {
      state.animationFrame = requestAnimationFrame(animateScroll);
      return;
    }

    state.isAnimating = false;
    state.animationFrame = 0;
    state.activeIndex = index;
    scrollArea.scrollLeft = targetLeft;
    panel?.classList.remove("is-sphere-moving", "is-wheel-following");

    if (!copySwapped) {
      renderSphereCopy(scrollArea, index);
      copy?.classList.remove("is-changing");
      copy?.classList.add("is-arriving");
    }

    state.copyTimer = window.setTimeout(() => copy?.classList.remove("is-arriving"), 520);
    dispatchSphereIndexChange(scrollArea, index);
  }

  state.animationFrame = requestAnimationFrame(animateScroll);
}

function snapSphereToNearest(scrollArea, options = {}) {
  navigateSphereToIndex(scrollArea, getNearestSphereIndex(scrollArea), options);
}

function reflowSphereGallery(scrollArea) {
  const state = getSphereNavigationState(scrollArea);
  syncSphereGalleryBounds(scrollArea);
  navigateSphereToIndex(scrollArea, state.activeIndex, { immediate: true });
}

function resetImmersiveScroll(panel) {
  const scrollArea = panel.querySelector(".immersive-scroll");
  if (!scrollArea) {
    return;
  }

  const state = getSphereNavigationState(scrollArea);
  syncSphereGalleryBounds(scrollArea);
  navigateSphereToIndex(scrollArea, state.activeIndex, { immediate: true });
}

function updateSphereGalleries() {
  sphereGalleries.forEach((gallery) => {
    const scrollArea = gallery.closest(".immersive-scroll");
    const cards = [...gallery.children];

    if (!scrollArea || cards.length === 0) {
      return;
    }

    const centerX = scrollArea.scrollLeft + scrollArea.clientWidth / 2;
    const galleryRect = gallery.getBoundingClientRect();
    const scrollRect = scrollArea.getBoundingClientRect();
    const galleryLeft = galleryRect.left - scrollRect.left + scrollArea.scrollLeft;
    const mode = gallery.dataset.sphereGallery;
    const firstCenter = galleryLeft + cards[0].offsetLeft + cards[0].offsetWidth / 2;
    const secondCard = cards[1] || cards[0];
    const secondCenter = galleryLeft + secondCard.offsetLeft + secondCard.offsetWidth / 2;
    const step = Math.max(1, Math.abs(secondCenter - firstCenter));

    cards.forEach((card) => {
      const cardCenter = galleryLeft + card.offsetLeft + card.offsetWidth / 2;
      const rawOffset = (cardCenter - centerX) / step;
      const offset = Math.max(-1.6, Math.min(1.6, rawOffset));
      const focus = Math.pow(Math.max(0, 1 - Math.abs(offset)), 3.3);
      const scale = mode === "inside"
        ? 0.5 + focus * 0.58
        : 0.46 + focus * 0.62;
      const depth = mode === "inside"
        ? -290 + focus * 248
        : -250 + focus * 370;
      const opacity = 0.08 + focus * 0.92;

      card.style.setProperty("--sphere-offset", offset.toFixed(3));
      card.style.setProperty("--sphere-scale", scale.toFixed(3));
      card.style.setProperty("--sphere-depth", `${Math.round(depth)}px`);
      card.style.setProperty("--sphere-opacity", opacity.toFixed(3));
    });
  });
}

function createTrail(clientX, clientY) {
  const now = performance.now();
  if (now - lastTrailAt < 34) {
    return;
  }

  lastTrailAt = now;

  const trail = document.createElement("span");
  trail.className = "cursor-trail";
  trail.style.left = `${clientX}px`;
  trail.style.top = `${clientY}px`;
  trail.style.setProperty("--trail-size", `${8 + Math.random() * 11}px`);
  trail.style.setProperty("--trail-hue", `${165 + Math.random() * 58}deg`);
  document.body.appendChild(trail);

  trail.addEventListener("animationend", () => trail.remove(), { once: true });
}

function popSparkles(clientX, clientY) {
  const count = 5 + Math.floor(Math.random() * 4);

  for (let i = 0; i < count; i += 1) {
    const shape = sparkleShapes[Math.floor(Math.random() * sparkleShapes.length)];
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.7;
    const distance = 28 + Math.random() * 48;
    const sparkle = document.createElement("span");

    sparkle.className = `click-sparkle is-${shape}`;
    sparkle.textContent = sparkleGlyphs[shape];
    sparkle.style.left = `${clientX}px`;
    sparkle.style.top = `${clientY}px`;
    sparkle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    sparkle.style.setProperty("--dy", `${Math.sin(angle) * distance - 22}px`);
    sparkle.style.setProperty("--spin", `${Math.random() > 0.5 ? 1 : -1}`);
    document.body.appendChild(sparkle);

    sparkle.addEventListener("animationend", () => sparkle.remove(), { once: true });
  }
}

function createCollapseParticles(clientX, clientY) {
  const now = performance.now();
  if (now - lastCollapseAt < 42) {
    return;
  }

  lastCollapseAt = now;

  for (let i = 0; i < 7; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 22 + Math.random() * 58;
    const particle = document.createElement("span");

    particle.className = "particle-collapse";
    particle.style.left = `${clientX}px`;
    particle.style.top = `${clientY}px`;
    particle.style.setProperty("--start-x", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--start-y", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--particle-size", `${3 + Math.random() * 5}px`);
    particle.style.setProperty("--particle-hue", `${190 + Math.random() * 90}deg`);
    document.body.appendChild(particle);

    particle.addEventListener("animationend", () => particle.remove(), { once: true });
  }
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.addEventListener("pointermove", (event) => {
    if (isGamePortalTransitioning) {
      return;
    }
    createTrail(event.clientX, event.clientY);
  });

  window.addEventListener("pointerdown", (event) => {
    if (isGamePortalTransitioning || event.target?.closest?.('[data-open="games"]')) {
      return;
    }
    popSparkles(event.clientX, event.clientY);
    root.classList.add("is-clicking");
    window.setTimeout(() => root.classList.remove("is-clicking"), 180);
  });

  document.querySelectorAll("[data-particle-zone]").forEach((zone) => {
    zone.addEventListener("pointermove", (event) => {
      createCollapseParticles(event.clientX, event.clientY);
    });
  });
}

syncWindowEnvironment();
