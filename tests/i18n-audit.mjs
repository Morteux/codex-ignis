// i18n audit (T2207, split by area in T2304): node tests/i18n-audit.mjs .
// Lists articles of content.js missing a language, keys of es/en/jp that do not
// match in each js/i18n-<area>.js, keys defined in two areas, and keys a page
// uses (data-i18n*, t('key'), i18nKey fields) that are not in the areas it loads.
import fs from 'fs';
import { join, dirname, normalize } from 'path';
import { pathToFileURL } from 'url';

const root = process.argv[2] || '.';
const { knowledgeBase } = await import(pathToFileURL(root + '/js/content.js').href);
let problems = 0;
console.log('articles', knowledgeBase.length);
for (const e of knowledgeBase) {
  const langs = Object.keys(e.i18n || {});
  const miss = ['en', 'jp'].filter(l => !langs.includes(l));
  const partial = [];
  for (const l of langs) {
    const x = e.i18n[l];
    if (!x.title) partial.push(l + ':notitle');
    if (!x.blocks) partial.push(l + ':noblocks');
    else if (x.blocks.length !== e.blocks.length) partial.push(l + ':blocks ' + x.blocks.length + '/' + e.blocks.length);
  }
  console.log(e.slug || e.id, e.hidden ? '(hidden)' : '', 'missing:', miss.join(',') || '-', partial.join(';'));
}

// Keys of every area file, per language
const areaFiles = fs.readdirSync(root + '/js').filter(f => /^i18n-[\w-]+\.js$/.test(f)).map(f => 'js/' + f);
const areaKeys = {};
const owner = new Map();
for (const file of areaFiles) {
  const src = fs.readFileSync(root + '/' + file, 'utf8');
  const keys = {};
  for (const l of ['es', 'en', 'jp']) {
    const m = src.match(new RegExp('^    ' + l + ': \\{([\\s\\S]*?)^    \\},?$', 'm'));
    keys[l] = new Set(m ? [...m[1].matchAll(/^        ([A-Za-z0-9_]+)\s*[:(]/gm)].map(x => x[1]) : []);
  }
  areaKeys[file] = keys.es;
  console.log(file, 'key counts', ...['es', 'en', 'jp'].map(l => l + ':' + keys[l].size));
  for (const l of ['en', 'jp']) {
    const a = [...keys.es].filter(k => !keys[l].has(k));
    const b = [...keys[l]].filter(k => !keys.es.has(k));
    if (a.length) { problems++; console.log('missing in', l, file, a.join(',')); }
    if (b.length) { problems++; console.log('extra in', l, file, b.join(',')); }
  }
  for (const k of keys.es) {
    if (owner.has(k)) { problems++; console.log('KEY IN TWO AREAS', k, owner.get(k), file); }
    owner.set(k, file);
  }
}

// Keys used by each page, against the areas its module graph loads
function moduleGraph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const source = fs.readFileSync(join(root, entry), 'utf8');
  for (const m of source.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+["'](\.[^"']+)["']/gms)) moduleGraph(normalize(join(dirname(entry), m[1])).replace(/\\/g, '/'), seen);
  for (const m of source.matchAll(/^\s*import\s+["'](\.[^"']+)["']/gm)) moduleGraph(normalize(join(dirname(entry), m[1])).replace(/\\/g, '/'), seen);
  return seen;
}
const pages = ['index.html', 'bingo.html', 'planet-sim.html', 'tech-tree.html', 'privacy.html', 'cookies.html', '404.html'];
let usedCount = 0;
for (const page of pages) {
  const html = fs.readFileSync(root + '/' + page, 'utf8');
  const graph = new Set();
  for (const m of html.matchAll(/src[:=]\s*"(js\/[^"]+\.js)"/g)) moduleGraph(m[1], graph);
  const loaded = new Set();
  for (const f of graph) if (areaKeys[f]) areaKeys[f].forEach(k => loaded.add(k));
  const used = new Map();
  const add = (k, f) => { if (!used.has(k)) used.set(k, f); };
  for (const f of [page, ...[...graph].filter(f => !/\/i18n(-[\w-]+)?\.js$/.test(f))]) {
    const s = f === page ? html : fs.readFileSync(root + '/' + f, 'utf8');
    for (const m of s.matchAll(/data-i18n="([^"]+)"/g)) add(m[1], f);
    for (const m of s.matchAll(/data-i18n-attr="([^"]+)"/g)) for (const p of m[1].split(';')) { const k = p.split(':')[1]; if (k) add(k.trim(), f); }
    for (const m of s.matchAll(/\bt\(\s*[a-zA-Z.()]+\s*,\s*["'`]([A-Za-z0-9_]+)["'`]\s*[),]/g)) add(m[1], f);
    for (const m of s.matchAll(/(?:i18nKey|titleKey|emptyKey)\s*:\s*["']([A-Za-z0-9_]+)["']/g)) if (!m[1].endsWith('Xxx')) add(m[1], f);
  }
  usedCount += used.size;
  for (const [k, f] of used) {
    if (!loaded.has(k)) { problems++; console.log('USED BUT NOT LOADED', page, k, f, owner.get(k) || '(no area)'); }
  }
  console.log(page, 'areas', [...graph].filter(f => areaKeys[f]).map(f => f.slice(8, -3)).join(','), 'used keys', used.size);
}
console.log('used keys', usedCount, 'problems', problems);
process.exit(problems ? 1 : 0);
