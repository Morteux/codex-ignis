// Load budget report (P22.9): what every page downloads before it is usable.
// Follows the static `import` graph of each page's module scripts and adds the
// stylesheet, the font each `@font-face` downloads (its first `src`, WOFF2 since
// P23.8; the TTF after it is only a fallback) and the local images written in the HTML.
// Images created by scripts (wiki articles, bingo, simulator icons) are not
// counted: they are lazy-loaded and depend on what the user opens.
// `<link rel="modulepreload">` (P23.8): every preloaded module must be in the
// page's graph; "fetch rounds" is how many import levels the browser discovers
// one after another, with and without the preloads.
// Usage: node tests/load-budget.mjs [root]   (sizes in KB, raw / gzip)
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, normalize } from "node:path";
import { gzipSync } from "node:zlib";

const root = process.argv[2] || ".";
const PAGES = ["index.html", "bingo.html", "planet-sim.html", "tech-tree.html", "testellaris.html", "privacy.html", "cookies.html", "404.html"];

const kb = (n) => (n / 1024).toFixed(1);
const sizes = new Map();
function sizeOf(path) {
  if (!sizes.has(path)) {
    const data = readFileSync(join(root, path));
    sizes.set(path, { raw: data.length, gzip: gzipSync(data).length });
  }
  return sizes.get(path);
}

const importsOf = new Map();
function imports(file) {
  if (!importsOf.has(file)) {
    const source = existsSync(join(root, file)) ? readFileSync(join(root, file), "utf8") : "";
    const pattern = /^\s*(?:import|export)\s[^;]*?from\s+["'](\.[^"']+)["']|^\s*import\s+["'](\.[^"']+)["']/gms;
    importsOf.set(file, [...source.matchAll(pattern)].map((m) => normalize(join(dirname(file), m[1] || m[2])).replace(/\\/g, "/")));
  }
  return importsOf.get(file);
}

// Breadth-first: round 1 are the roots, round n the modules first found by round n − 1.
function fetchRounds(roots) {
  const round = new Map(roots.map((file) => [file, 1]));
  let queue = [...round.keys()];
  while (queue.length) {
    const next = [];
    for (const file of queue) for (const dep of imports(file)) if (!round.has(dep)) { round.set(dep, round.get(file) + 1); next.push(dep); }
    queue = next;
  }
  return round;
}

const css = readFileSync(join(root, "styles.css"), "utf8");
const fonts = [...css.matchAll(/@font-face\s*{[^}]*?url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]);

let problems = 0;
for (const page of PAGES) {
  const html = readFileSync(join(root, page), "utf8");
  const scripts = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  const preloads = [...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const graph = fetchRounds(scripts);
  const modules = new Set(graph.keys());
  const images = [...html.matchAll(/<img[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]).filter((src) => src && !/^(https?:)?\/\//.test(src));
  const icons = [...html.matchAll(/<link[^>]*rel="icon"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const usesCss = /href="styles\.css"/.test(html);
  const files = [page, ...(usesCss ? ["styles.css", ...fonts] : []), ...modules, ...new Set([...images, ...icons])];
  const rows = files.map((file) => {
    if (!existsSync(join(root, file))) { problems += 1; return [file, null]; }
    return [file, sizeOf(file)];
  });
  const total = rows.reduce((sum, [, s]) => ({ raw: sum.raw + (s?.raw || 0), gzip: sum.gzip + (s?.gzip || 0) }), { raw: 0, gzip: 0 });
  console.log(`\n${page}: ${files.length} files, ${kb(total.raw)} KB raw / ${kb(total.gzip)} KB gzip (${modules.size} JS modules)`);
  rows.sort((a, b) => (b[1]?.raw || 0) - (a[1]?.raw || 0)).slice(0, 8).forEach(([file, s]) => {
    console.log(s ? `  ${kb(s.raw).padStart(7)} / ${kb(s.gzip).padStart(6)}  ${file}` : `  MISSING  ${file}`);
  });
  if (modules.size) {
    const depth = (map) => Math.max(...[...map.entries()].filter(([file]) => modules.has(file)).map(([, n]) => n));
    const outside = preloads.filter((file) => !modules.has(file));
    problems += outside.length;
    console.log(`  fetch rounds ${depth(graph)}` + (preloads.length ? ` (${depth(fetchRounds([...scripts, ...preloads]))} with ${preloads.length} modulepreload)` : ""));
    outside.forEach((file) => console.log(`  PRELOAD NOT IN GRAPH  ${file}`));
  }
}
console.log(`\nproblems ${problems}`);
process.exit(problems ? 1 : 0);
