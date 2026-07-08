const root = document.documentElement;
const pageBody = document.body;
const openButtons = [...document.querySelectorAll("[data-open]")];
const closeButtons = [...document.querySelectorAll("[data-close]")];
const centerButtons = [...document.querySelectorAll("[data-center]")];
const windows = [...document.querySelectorAll(".app-window")];
const filterInputs = [...document.querySelectorAll("[data-filter]")];
const clock = document.querySelector("#system-clock");
const windowLayer = document.querySelector(".window-layer");
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
let pendingOpenTimer = 0;
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
  root.classList.toggle("has-open-window", hasOpenWindow);
  pageBody.classList.toggle("has-open-window", hasOpenWindow);
  windowLayer?.classList.toggle("is-active", hasOpenWindow);
}

function centerWindow(panel, options = {}) {
  if (!panel) {
    return;
  }

  const key = panel.dataset.window || "";
  const state = windowState.get(key);

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

function openWindow(key) {
  const panel = getWindowByKey(key);
  if (!panel) {
    return;
  }

  window.clearTimeout(pendingOpenTimer);

  if (panel.classList.contains("is-open")) {
    focusWindow(panel);
    syncWindowEnvironment();
    return;
  }

  const currentOpenPanel = windows.find((item) => item.classList.contains("is-open"));

  if (currentOpenPanel && currentOpenPanel !== panel) {
    closeWindow(currentOpenPanel.dataset.window || "");
    pendingOpenTimer = window.setTimeout(() => {
      applyWindowPlacement(panel);
      panel.classList.add("is-open");
      panel.setAttribute("aria-hidden", "false");
      focusWindow(panel);
      syncWindowEnvironment();
    }, 150);
    return;
  }

  applyWindowPlacement(panel);
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  focusWindow(panel);
  syncWindowEnvironment();
}

function closeWindow(key) {
  const panel = getWindowByKey(key);
  if (!panel) {
    return;
  }

  panel.classList.remove("is-open", "is-focused", "is-dragging");
  panel.setAttribute("aria-hidden", "true");

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
  windows.forEach((panel) => {
    const state = windowState.get(panel.dataset.window || "");
    if (!panel.classList.contains("is-open")) {
      return;
    }

    if (!state?.dragged) {
      centerWindow(panel);
    }
  });
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

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.addEventListener("pointermove", (event) => {
    createTrail(event.clientX, event.clientY);
  });

  window.addEventListener("pointerdown", (event) => {
    popSparkles(event.clientX, event.clientY);
    root.classList.add("is-clicking");
    window.setTimeout(() => root.classList.remove("is-clicking"), 180);
  });
}

syncWindowEnvironment();
