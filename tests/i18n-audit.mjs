// i18n audit (T2207): node tests/i18n-audit.mjs .
// Lists articles of content.js missing a language, keys of es/en/jp that do not
// match, and keys used by the wiki/bingo/legal pages that do not exist.
import fs from 'fs';
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
const src = fs.readFileSync(root + '/js/i18n.js', 'utf8');
const keys = {};
for (const l of ['es', 'en', 'jp']) {
  const re = new RegExp('^    ' + l + ': \\{([\\s\\S]*?)^    \\},?$', 'm');
  const m = src.match(re);
  keys[l] = new Set([...m[1].matchAll(/^        ([A-Za-z0-9_]+)\s*[:(]/gm)].map(x => x[1]));
}
console.log('key counts', ...['es', 'en', 'jp'].map(l => l + ':' + keys[l].size));
for (const l of ['en', 'jp']) {
  const a = [...keys.es].filter(k => !keys[l].has(k));
  const b = [...keys[l]].filter(k => !keys.es.has(k));
  if (a.length) { problems++; console.log('missing in', l, a.join(',')); }
  if (b.length) { problems++; console.log('extra in', l, b.join(',')); }
}
const files = ['index.html', 'bingo.html', 'cookies.html', 'privacy.html', 'tech-tree.html', '404.html', 'js/app.js', 'js/bingo.js', 'js/legal.js', 'js/ads.js', 'js/confirm-dialog.js'];
const used = new Map();
for (const f of files) {
  const s = fs.readFileSync(root + '/' + f, 'utf8');
  const add = (k) => { if (!used.has(k)) used.set(k, new Set()); used.get(k).add(f); };
  for (const m of s.matchAll(/data-i18n(?:-html|-title|-placeholder)?="([^"]+)"/g)) add(m[1]);
  for (const m of s.matchAll(/data-i18n-attr="([^"]+)"/g)) for (const p of m[1].split(';')) { const k = p.split(':')[1]; if (k) add(k.trim()); }
  for (const m of s.matchAll(/\bt\(\s*[a-zA-Z.]+\s*,\s*["'`]([A-Za-z0-9_]+)["'`]/g)) add(m[1]);
  for (const m of s.matchAll(/\bt\(\s*["'`]([A-Za-z0-9_]+)["'`]/g)) add(m[1]);
}
for (const [k, f] of used) {
  const bad = ['es', 'en', 'jp'].filter(l => !keys[l].has(k));
  if (bad.length) { problems++; console.log('USED BUT MISSING', k, bad.join(','), [...f].join(',')); }
}
for (const f of ['js/bingo-data.js', 'js/bingo.js']) {
  const s = fs.readFileSync(root + '/' + f, 'utf8');
  for (const m of s.matchAll(/(?:i18nKey|titleKey|emptyKey)\s*:\s*["']([A-Za-z0-9_]+)["']/g)) {
    if (m[1].endsWith('Xxx')) continue; // placeholder in a doc comment
    const bad = ['es', 'en', 'jp'].filter(l => !keys[l].has(m[1]));
    if (bad.length) { problems++; console.log('USED BUT MISSING', m[1], bad.join(','), f); }
  }
}
console.log('used keys', used.size, 'problems', problems);
process.exit(problems ? 1 : 0);
