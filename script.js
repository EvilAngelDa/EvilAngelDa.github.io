const goddess = document.querySelector(".goddess");
const root = document.documentElement;
const sparkleShapes = ["heart", "star", "flower", "moon"];
const sparkleGlyphs = {
  heart: "♥",
  star: "✦",
  flower: "✿",
  moon: "☾",
};

let lastTrailAt = 0;

function updateGaze(clientX, clientY) {
  if (!goddess) return;

  const rect = goddess.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const lookX = Math.max(-1, Math.min(1, (clientX - centerX) / 320));
  const lookY = Math.max(-1, Math.min(1, (clientY - centerY) / 260));

  goddess.style.setProperty("--look-x", lookX.toFixed(3));
  goddess.style.setProperty("--look-y", lookY.toFixed(3));
}

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

if (goddess && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.addEventListener("pointermove", (event) => {
    updateGaze(event.clientX, event.clientY);
    createTrail(event.clientX, event.clientY);
  });

  window.addEventListener("pointerdown", (event) => {
    updateGaze(event.clientX, event.clientY);
    popSparkles(event.clientX, event.clientY);
    root.classList.add("is-clicking");
    window.setTimeout(() => root.classList.remove("is-clicking"), 180);
  });
}
