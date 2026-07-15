import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const articlesRoot = path.dirname(fileURLToPath(import.meta.url));

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseFrontMatter(source) {
  const normalized = source.replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) {
    return { attributes: {}, body: normalized };
  }

  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    return { attributes: {}, body: normalized };
  }

  const attributes = {};
  let currentList = "";

  normalized.slice(4, end).split("\n").forEach((line) => {
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      const [, key, rawValue] = keyMatch;
      currentList = rawValue ? "" : key;
      attributes[key] = rawValue || [];
      return;
    }

    const itemMatch = line.match(/^\s+-\s+(.+)$/);
    if (itemMatch && currentList && Array.isArray(attributes[currentList])) {
      attributes[currentList].push(itemMatch[1].trim());
    }
  });

  return {
    attributes,
    body: normalized.slice(end + 5).trim(),
  };
}

function renderInline(source) {
  const tokens = [];
  const stash = (html) => {
    const token = `@@${tokens.length}@@`;
    tokens.push(html);
    return token;
  };

  let output = escapeHtml(source);
  output = output.replace(/`([^`]+)`/g, (_, code) => stash(`<code>${code}</code>`));
  output = output.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_, label, href) => (
    stash(`<a href="${href}">${label}</a>`)
  ));
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/_([^_]+)_/g, "<em>$1</em>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  output = output.replace(/@@(\d+)@@/g, (_, index) => tokens[Number(index)]);
  return output;
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isTableDivider(line) {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isBlockStart(lines, index) {
  const line = lines[index] || "";
  return /^#{1,6}\s+/.test(line)
    || /^```/.test(line)
    || /^>\s?/.test(line)
    || /^!\[[^\]]*]\([^)]+\)\s*$/.test(line)
    || /^\d+\.\s+/.test(line)
    || /^[-+*]\s+/.test(line)
    || (line.includes("|") && isTableDivider(lines[index + 1] || ""));
}

function createSlug(text, usedSlugs) {
  const base = text
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "section";
  const count = usedSlugs.get(base) || 0;
  usedSlugs.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}

function renderMarkdown(markdown, pageTitle) {
  const lines = markdown.split("\n");
  const html = [];
  const headings = [];
  const usedSlugs = new Map();
  let index = 0;
  let skippedTitle = false;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```([^\s]*)\s*$/);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      const language = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : "";
      html.push(`<pre><code${language}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      index += 1;

      if (level === 1 && !skippedTitle && text === pageTitle) {
        skippedTitle = true;
        continue;
      }

      const id = createSlug(text, usedSlugs);
      if (level === 2 || level === 3) {
        headings.push({ level, text, id });
      }
      html.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
      continue;
    }

    const image = line.match(/^!\[([^\]]*)]\(([^)]+)\)\s*$/);
    if (image) {
      const [, alt, src] = image;
      let caption = "";
      const captionIndex = lines[index + 1]?.trim() ? index + 1 : index + 2;
      const nextLine = lines[captionIndex]?.trim() || "";
      const captionMatch = nextLine.match(/^\*(.+)\*$/);
      if (captionMatch) {
        caption = `<figcaption>${renderInline(captionMatch[1])}</figcaption>`;
        index = captionIndex;
      }
      html.push(`<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">${caption}</figure>`);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote><p>${renderInline(quote.join(" "))}</p></blockquote>`);
      continue;
    }

    if (line.includes("|") && isTableDivider(lines[index + 1] || "")) {
      const headers = splitTableRow(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      html.push([
        '<div class="table-scroll"><table>',
        `<thead><tr>${headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead>`,
        `<tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>`,
        "</table></div>",
      ].join(""));
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    const unordered = line.match(/^[-+*]\s+(.+)$/);
    if (ordered || unordered) {
      const tag = ordered ? "ol" : "ul";
      const matcher = ordered ? /^\d+\.\s+(.+)$/ : /^[-+*]\s+(.+)$/;
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(matcher);
        if (!item) break;
        items.push(`<li>${renderInline(item[1])}</li>`);
        index += 1;
      }
      html.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  return { html: html.join("\n"), headings };
}

function renderToc(headings) {
  return headings.map(({ level, text, id }) => (
    `<a class="toc-level-${level}" href="#${id}">${escapeHtml(text)}</a>`
  )).join("\n");
}

function pageTemplate(directoryName, attributes, rendered, sourceLength) {
  const title = attributes.title || directoryName;
  const description = attributes.description || "";
  const date = attributes.date || "";
  const cover = attributes.cover || "";
  const tags = Array.isArray(attributes.tags) ? attributes.tags : [];
  const articleNumber = directoryName.match(/^\d+/)?.[0] || "001";
  const readingMinutes = Math.max(1, Math.ceil(sourceLength / 520));

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | yangyangnao OS</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="theme-color" content="#07090f">
    <link rel="stylesheet" href="./article.css?v=20260714-reader1">
    <script src="./article.js?v=20260714-reader1" defer></script>
  </head>
  <body>
    <div class="reading-progress" aria-hidden="true"><i data-reading-progress></i></div>
    <header class="reader-bar">
      <a class="reader-home" href="../../index.html?open=articles" aria-label="返回我的文章"><span aria-hidden="true">←</span> 返回我的文章</a>
      <span class="reader-id">ARTICLE / ${escapeHtml(articleNumber)}</span>
      <a class="reader-source" href="./index.md">查看 MD 源文</a>
    </header>

    <main>
      <section class="article-hero">
        <p class="article-eyebrow">DESIGN LOG <span></span> <time datetime="${escapeHtml(date)}">${escapeHtml(date)}</time> <span></span> 约 ${readingMinutes} 分钟</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="article-deck">${escapeHtml(description)}</p>
        <ul class="article-tags" aria-label="文章标签">${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>
        ${cover ? `<figure class="article-cover"><img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}的交互系统总览"></figure>` : ""}
      </section>

      <div class="article-layout">
        <aside class="article-toc" aria-label="文章目录">
          <p>ON THIS PAGE</p>
          <nav>${renderToc(rendered.headings)}</nav>
        </aside>
        <article class="article-body" data-article-body>
          ${rendered.html}
        </article>
      </div>
    </main>

    <footer class="reader-footer">
      <p>写于 ${escapeHtml(date)} · 本文持续记录个人网站的设计与实现。</p>
      <a href="../../index.html?open=articles">返回我的文章 <span aria-hidden="true">→</span></a>
    </footer>
  </body>
</html>
`;
}

async function buildArticle(directory) {
  const sourcePath = path.join(articlesRoot, directory, "index.md");
  await access(sourcePath);
  const source = await readFile(sourcePath, "utf8");
  const { attributes, body } = parseFrontMatter(source);
  const title = attributes.title || directory;
  const rendered = renderMarkdown(body, title);
  const html = pageTemplate(directory, attributes, rendered, body.replace(/\s/g, "").length);
  await writeFile(path.join(articlesRoot, directory, "index.html"), html, "utf8");
  return directory;
}

const entries = await readdir(articlesRoot, { withFileTypes: true });
const articleDirectories = entries
  .filter((entry) => entry.isDirectory() && /^\d{3}-/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

const built = [];
for (const directory of articleDirectories) {
  try {
    built.push(await buildArticle(directory));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

console.log(`Built ${built.length} article page${built.length === 1 ? "" : "s"}: ${built.join(", ")}`);
