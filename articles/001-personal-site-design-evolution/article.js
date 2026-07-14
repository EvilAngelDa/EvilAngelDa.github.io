const progressBar = document.querySelector("[data-reading-progress]");
const articleBody = document.querySelector("[data-article-body]");
const tocLinks = [...document.querySelectorAll(".article-toc a")];
const observedHeadings = tocLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

let progressFrame = 0;

function updateReadingProgress() {
  progressFrame = 0;
  if (!progressBar || !articleBody) return;

  const articleRect = articleBody.getBoundingClientRect();
  const start = window.scrollY + articleRect.top - window.innerHeight * 0.28;
  const end = start + articleBody.offsetHeight - window.innerHeight * 0.42;
  const progress = Math.min(1, Math.max(0, (window.scrollY - start) / Math.max(1, end - start)));
  progressBar.style.transform = `scaleX(${progress})`;
}

function scheduleProgressUpdate() {
  if (!progressFrame) {
    progressFrame = requestAnimationFrame(updateReadingProgress);
  }
}

const headingObserver = new IntersectionObserver((entries) => {
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

  if (!visible) return;

  tocLinks.forEach((link) => {
    const isCurrent = link.getAttribute("href") === `#${visible.target.id}`;
    link.classList.toggle("is-current", isCurrent);
    if (isCurrent) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}, {
  rootMargin: "-18% 0px -68% 0px",
  threshold: 0,
});

observedHeadings.forEach((heading) => headingObserver.observe(heading));
window.addEventListener("scroll", scheduleProgressUpdate, { passive: true });
window.addEventListener("resize", scheduleProgressUpdate);
updateReadingProgress();
