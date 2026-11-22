// Load budget report (P22.9): what every page downloads before it is usable.
// Follows the static `import` graph of each page's module scripts and adds the
// stylesheet, the fonts it declares and the local images written in the HTML.
// Images created by scripts (wiki articles, bingo, simulator icons) are not
// counted: they are lazy-loaded and depend on what the user opens.
// Usage: node tests/load-budget.mjs [root]   (sizes in KB, raw / gzip)
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, normalize } from "node:path";
import { gzipSync } from "node:zlib";

const root = process.argv[2] || ".";
const PAGES = ["index.html", "bingo.html", "planet-sim.html", "tech-tree.html", "privacy.html", "cookies.html", "404.html"];

const kb = (n) => (n / 1024).toFixed(1);
const sizes = new Map();
function sizeOf(path) {
  if (!sizes.has(path)) {
    const data = readFileSync(join(root, path));
    sizes.set(path, { raw: data.length, gzip: gzipSync(data).length });
  }
  return sizes.get(path);
}

function moduleGraph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const source = readFileSync(join(root, entry), "utf8");
  for (const match of source.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+["'](\.[^"']+)["']/gms)) {
    moduleGraph(normalize(join(dirname(entry), match[1])).replace(/\\/g, "/"), seen);
  }
  return seen;
}

const css = readFileSync(join(root, "styles.css"), "utf8");
const fonts = [...css.matchAll(/url\(["']?([^"')]+\.(?:ttf|woff2?|otf))["']?\)/g)].map((m) => m[1]);

let problems = 0;
for (const page of PAGES) {
  const html = readFileSync(join(root, page), "utf8");
  const modules = new Set();
  for (const match of html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)) moduleGraph(match[1], modules);
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
}
console.log(`\nproblems ${problems}`);
process.exit(problems ? 1 : 0);
