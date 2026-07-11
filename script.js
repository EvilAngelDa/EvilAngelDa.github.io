const root = document.documentElement;
const pageBody = document.body;
const openButtons = [...document.querySelectorAll("[data-open]")];
const closeButtons = [...document.querySelectorAll("[data-close]")];
const centerButtons = [...document.querySelectorAll("[data-center]")];
const windows = [...document.querySelectorAll(".app-window")];
const filterInputs = [...document.querySelectorAll("[data-filter]")];
const clock = document.querySelector("#system-clock");
const windowLayer = document.querySelector(".window-layer");
const sphereGalleries = [...document.querySelectorAll("[data-sphere-gallery]")];
const sphereNavigationState = new WeakMap();
const sparkleShapes = ["heart", "star", "flower", "moon"];
const sparkleGlyphs = {
  heart: "♥",
  star: "✦",
  flower: "✿",
  moon: "☾",
};

let activeWindowKey = "";
let topZIndex = 20;
let lastTrailAt = 0;
let lastCollapseAt = 0;
let pendingOpenTimer = 0;
let homeGlitchTimer = 0;
const homeGlitchReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

function syncLauncherState() {
  openButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.open === activeWindowKey);
  });
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
    panel.style.top = "";
    panel.style.right = "";
    panel.style.bottom = "";

    if (state) {
      state.dragged = false;
      state.left = null;
      state.top = null;
    }

    return;
  }

  const rect = panel.getBoundingClientRect();
  const panelWidth = rect.width || panel.offsetWidth;
  const panelHeight = rect.height || panel.offsetHeight;
  const nextLeft = Math.max(12, Math.round((window.innerWidth - panelWidth) / 2));
  const nextTop = Math.max(76, Math.round((window.innerHeight - panelHeight) / 2));

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

function clearHomeGlitchTransition(panel) {
  window.clearTimeout(homeGlitchTimer);
  homeGlitchTimer = 0;
  panel?.classList.remove("is-home-glitch-entering");
  document.querySelector(".home-glitch-overlay")?.remove();
}

function createHomeGlitchClone(panel, className) {
  const clone = panel.cloneNode(true);

  clone.removeAttribute("id");
  clone.removeAttribute("data-window");
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");
  clone.className = `app-window is-open ${className}`;
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

function playHomeGlitchTransition(panel) {
  if (!panel || homeGlitchReducedMotion) {
    return;
  }

  clearHomeGlitchTransition(panel);
  panel.getBoundingClientRect();
  panel.classList.add("is-home-glitch-entering");

  const rect = panel.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) {
    panel.classList.remove("is-home-glitch-entering");
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
    panel.classList.remove("is-home-glitch-entering");
    overlay.remove();
    homeGlitchTimer = 0;
  }, 980);
}

function openWindow(key) {
  const panel = getWindowByKey(key);
  if (!panel) {
    return;
  }

  window.clearTimeout(pendingOpenTimer);

  if (panel.classList.contains("is-open")) {
    focusWindow(panel);
    syncWindowEnvironment();
    if (key === "home") {
      playHomeGlitchTransition(panel);
    }
    return;
  }

  const currentOpenPanel = windows.find((item) => item.classList.contains("is-open"));

  if (currentOpenPanel && currentOpenPanel !== panel) {
    closeWindow(currentOpenPanel.dataset.window || "");
    pendingOpenTimer = window.setTimeout(() => {
      applyWindowPlacement(panel);
      panel.classList.add("is-open");
      panel.setAttribute("aria-hidden", "false");
      syncWindowEnvironment();
      resetImmersiveScroll(panel);
      focusWindow(panel);
      if (key === "home") {
        playHomeGlitchTransition(panel);
      }
      requestAnimationFrame(updateSphereGalleries);
    }, 150);
    return;
  }

  applyWindowPlacement(panel);
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  syncWindowEnvironment();
  resetImmersiveScroll(panel);
  focusWindow(panel);
  if (key === "home") {
    playHomeGlitchTransition(panel);
  }
  requestAnimationFrame(updateSphereGalleries);
}

function closeWindow(key) {
  const panel = getWindowByKey(key);
  if (!panel) {
    return;
  }

  panel.classList.remove("is-open", "is-focused", "is-dragging");
  panel.setAttribute("aria-hidden", "true");

  if (key === "home") {
    clearHomeGlitchTransition(panel);
  }

  if (activeWindowKey === key) {
    activeWindowKey = "";
  }

  syncLauncherState();
  syncWindowEnvironment();
}

openButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openWindow(button.dataset.open);
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
    const currentNode = copy.querySelector("[data-sphere-current]");
    const totalNode = copy.querySelector("[data-sphere-total]");
    const progress = copy.querySelector("[data-sphere-progress]");
    const dots = [...copy.querySelectorAll(".sphere-dot")];

    if (metaNode) metaNode.textContent = meta;
    if (titleNode) titleNode.textContent = title;
    if (descriptionNode) descriptionNode.textContent = description;
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
    createTrail(event.clientX, event.clientY);
  });

  window.addEventListener("pointerdown", (event) => {
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
