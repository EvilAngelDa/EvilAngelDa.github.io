const root = document.documentElement;
const openButtons = document.querySelectorAll("[data-open]");
const windows = document.querySelectorAll("[data-window]");
const filterInputs = document.querySelectorAll("[data-filter]");
const clock = document.querySelector("#system-clock");
const sparkleShapes = ["heart", "star", "flower", "moon"];
const sparkleGlyphs = {
  heart: "♥",
  star: "✦",
  flower: "✿",
  moon: "☾",
};

let lastTrailAt = 0;

function focusWindow(id) {
  const target = document.querySelector(`#${id}`);

  openButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.open === id);
  });

  windows.forEach((windowPanel) => {
    windowPanel.classList.toggle("is-active-window", windowPanel.id === id);
  });

  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

openButtons.forEach((button) => {
  button.addEventListener("click", () => {
    focusWindow(button.dataset.open);
  });
});

filterInputs.forEach((input) => {
  input.addEventListener("input", () => {
    const list = document.querySelector(`[data-list="${input.dataset.filter}"]`);
    const query = input.value.trim().toLowerCase();
    if (!list) return;

    list.querySelectorAll("[data-keywords]").forEach((card) => {
      const haystack = `${card.textContent} ${card.dataset.keywords}`.toLowerCase();
      card.classList.toggle("is-hidden", !haystack.includes(query));
    });
  });
});

function updateClock() {
  if (!clock) return;

  clock.textContent = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

updateClock();
window.setInterval(updateClock, 30 * 1000);

function createTrail(clientX, clientY) {
  const now = performance.now();
  if (now - lastTrailAt < 34) return;
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
