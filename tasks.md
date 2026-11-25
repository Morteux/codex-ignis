# Codex Ignis — pending tasks

> Progreso: **96 / 137 tareas (70%)**

Design rules and decisions: `PLANET_SIM_GDD.md` (planet simulator) and `TECH_TREE_GDD.md` (tech tree, sections 30–34), `GAME_FILES_EXTRACTOR.md` (section 25) and `TESTELLARIS_GDD.md` (sections 40–43).
**Sources:** everything comes from the game files extractor (section 25); the wiki is no longer a source (owner, 2026-11-22). **Translations:** all done at the end, in one go, in section 15, from the localisation the extractor reads; no task before it adds languages or hand-translates game names (new interface texts get es/en/jp keys in `js/i18n.js`, game names in English; Testellaris questions use the official es/en/jp names). Finished phases (P0–P8 incl. P7.10, P16.1–P16.12, P9.1–P9.7, P12.1, P13.7, P17, P18 — edicts audit in GDD §5.1, P10.1 — body types audit in GDD §4.1, P10.2, P10.3, P10.4, P10.5, P10.6 except Wilderness, P10.7, P10.8 — GDD §4.2, P10.9, P10.10 — GDD §4.2, P19.1 — branch offices audit in GDD §5.2, P19.2, P19.3, P19.4, P21 — job swaps, audit in GDD §6.1) are in git history.
Decisions taken without the owner, pending review: `DECISIONS_TO_REVIEW.md` (every task adds its own there). Order is a proposal; **P14 is always last**. When a task is done, mark it `[x]` (the automatic loop needs it) and move any new design decision into the GDD. Task ids: `T<phase><step>` = `P<phase>.<step>` (T1305 = P13.5).

## 11 · Comparison & timeline
- [x] **T1101** (P11.1) Scenario A/B comparison with marginal-change highlighting
  - Prueba manual: abre `planet-sim.html`, pulsa «Pin the current planet as scenario A» en el panel «Scenario A/B comparison» y construye un edificio (p. ej. Commercial Zones): las filas que cambian (Trade value, Consumer goods…) salen arriba resaltadas con su cambio B − A en verde o rojo.
- [x] **T1102** (P11.2) Monthly stockpile timeline (1 / 12 / 60 / 120 months)
  - Prueba manual: en `planet-sim.html` construye Commercial Zones y mira el panel «Monthly stockpile timeline»: Consumer goods −2/mes; escribe 100 como reserva inicial y debería verse 98 / 76 / 0 / 0 a 1 / 12 / 60 / 120 meses.
- [x] **T1103** (P11.3) Deficit and stockpile-exhaustion flags
  - Prueba manual: en `planet-sim.html` construye Commercial Zones: en «Monthly stockpile timeline» sale el aviso «Resources in deficit: Consumer goods…»; con reserva inicial 100 la columna Flags dice «deficit: runs out in 50 months» y los valores de 60 y 120 meses salen en rojo.

## 12 · UI icons
- [x] **T1202** (P12.2) Review the StellarisAssets repository and re-apply every available icon by its real in-game meaning (replaces the loose placements of the first pass, e.g. `Faction_support`, `Colony_type_automated`; `Menu_icon_technology` unused). No policy icons exist: policies stay text-only. Advanced Logic has no resource icon yet (uses `modifiers/mod_advanced_logic_produces_add.png`): add a proper one (moved to T1204).
  - Nota: the StellarisAssets repository is outside the project; use `StellarisAssetsFileTree.txt` (its file tree) to find the icons.
  - Prueba manual: abre `planet-sim.html`: la pestaña Sucursales lleva el icono de valor de sucursal, Imperio el de gobierno y, en Imperio, «Tipo de especie» el icono de pop y «Éticas» el de atracción ética; «Resumen de empleos totales» lleva el icono genérico de empleo.
- [x] **T1203** (P12.3) Mark the empire-level tabs (Imperio, Edicts) as saved with the empire profile. Proposal: semi-transparent empire icon as tab background, shared accent line, tooltip "Saved with the empire profile".
  - Prueba manual: abre `planet-sim.html`: las pestañas Imperio y Edicts llevan de fondo el icono de gobierno semitransparente y una línea dorada abajo; al pasar el ratón sale «Se guarda con el perfil de imperio» (cambia con el idioma).

## 13 · Polish & QA
- [x] **T1301** (P13.1) Mobile layout review of all tabs
  - Prueba manual: open `planet-sim.html` with the browser's device mode at 320–375 px wide and go through the six tabs; none should scroll the page sideways, and the A/B and monthly stockpile tables scroll inside their own panel.
- [x] **T1302** (P13.2) i18n parity check for all new strings
  - Modelo: sonnet
  - Prueba manual: run `BLOCK_REMOTE=1 python tests/policies-smoke.py`; the checks "i18n key parity es/en/jp" and "i18n values: same type/arity, none empty, used keys exist" should pass.
- [x] **T1303** (P13.3) Automated UI smoke tests (tabs, save/load, empire switch)
  - Prueba manual: run `BLOCK_REMOTE=1 python tests/policies-smoke.py`; the "tabs:", "save:", "library:", "load:" and "empire switch" checks should pass (each tab shows only its panel, a saved planet reopens identical after a reload, switching empires asks before dropping unsaved changes).
- [x] **T1304** (P13.4) Accessibility pass
  - Prueba manual: open `planet-sim.html`, click the "Planeta" tab and use the Left/Right arrows: focus moves through the tabs and each panel opens; with a screen reader the "−"/"+" district buttons are read with the district name, in the selected language.
- [x] **T1308** (P13.8) Move every data text shown in the UI to i18n keys (es/en/jp, English until P15): planet modifier `notModelled` effects and `source`, body type `infoOnly` lines and any other English string kept in the data files; nothing may be shown in a language other than the selected one
  - Prueba manual: open `planet-sim.html` → Cuerpo celeste: hovering a body card (e.g. Gaia) lists "Not computed by the simulator:" and its effects; a planet modifier such as Tidal Locked still shows "Not modelled: …" and "Source: …" notes, also after switching to ES or JP.
- [x] **T1306** (P13.6) Replace the hand-written es/jp texts (policy group titles/notes/effects, requirement reasons, policy notices, empire-tab policy heading, stacking and trade-conversion texts, P7.8 resource/category names) with the English text
  - Modelo: sonnet
  - Prueba manual: open `planet-sim.html`, switch to ES or JP and open the Empire tab: policy titles, notes, requirement reasons and resource names (Energy, Minerals…) appear in English.
- [x] **T1309** (P13.9) Translate the hard-coded Spanish landmark `aria-label`s of `index.html`, `bingo.html` and the legal pages (`data-i18n-attr` + es/en/jp keys, the `a11y*` keys of P13.4 can be reused)
  - Prueba manual: open `index.html` (also `bingo.html`, `privacy.html`, `cookies.html`, `404.html`, `tech-tree.html`), click EN and inspect the header: its `aria-label` reads "Archive header" and the projects nav "Archive projects"; with ES they go back to "Cabecera del archivo" / "Proyectos del archivo".

## 22 · Site-wide QA (all pages)
Covers the whole site: wiki (`index.html`, `js/app.js`, `js/content.js`), bingo, planet simulator, tech tree page, legal pages and 404. Every bug found is fixed in its task (or added as a new task if large) and gets a smoke test.
- [x] **T2201** (P22.1) QA of the wiki: navigation between articles, URL hashes, search, easter eggs, every block type of `content.js`, language switch, local images that do not exist, console errors
  - Prueba manual: open `index.html`, type "a" in the search (no secret entry appears), then "mugan" (MUGANI? appears); open "Enlaces útiles" in JP and click a link (it opens the real site); open "Diseño de naves mecánicas": the two starbase images show "Imagen no disponible: …".
- [x] **T2202** (P22.2) QA of the bingo: both bingos (origins, principles), marking, PNG download, language switch, missing icons, console errors
  - Prueba manual: open `bingo.html`, mark two origins, switch to Principles and back and to EN (the marks stay), then click "Download as image": a PNG with the icons in colour for the marked cells is downloaded.
- [x] **T2203** (P22.3) QA of the legal pages, 404 and the tech tree placeholder: links, language switch, ads/consent stay disabled (`js/ads-config.js`), `vercel.json` routing of the 404
  - Prueba manual: open `tech-tree.html` and click EN (the "under construction" line and the tab title change); after deploying, open `/a/b/missing` on the Vercel site: the 404 page appears styled and its links go to the site root.
- [x] **T2204** (P22.4) Smoke test that opens every page in es/en/jp and fails on console errors or local resources that do not load (404)
  - Prueba manual: run `BLOCK_REMOTE=1 python tests/policies-smoke.py`: the 21 "all pages (es/en/jp): …" lines end in PASS.
- [x] **T2205** (P22.5) Mobile layout review at 320–375 px of every page other than the simulator (like T1301)
  - Prueba manual: open `index.html` with the browser at 320 px wide (device mode), tap an article of the index: the page scrolls down to the article, nothing scrolls sideways and the header links are easy to tap.
- [x] **T2206** (P22.6) Accessibility pass of every page other than the simulator: keyboard, visible focus, contrast, `alt` texts, landmarks, `lang` attribute following the language (like T1304)
  - Prueba manual: open `index.html#/MUGANI`, press Tab until the portrait of the quote is focused and press Enter: the image opens, Escape closes it and the focus goes back to the portrait; switch to JP and inspect `<html>`: `lang="ja"`.
- [x] **T2207** (P22.7) i18n review of the wiki, bingo and legal pages: no hard-coded interface text, keys used exist in es/en/jp, articles of `content.js` with a missing language listed (never machine-translate: list them in `DECISIONS_TO_REVIEW.md`)
  - Modelo: sonnet
  - Prueba manual: run `node tests/i18n-audit.mjs .`: it ends with "problems 0" and lists the three articles (`diseño-flotas-fauna-espacial`, `flotas-contra-crisis`, `lista-de-deseos-ignis`) whose en/jp are empty; open one of them in EN and it shows in Spanish.
- [x] **T2208** (P22.8) Page metadata of every page: `<title>`, description, favicon, Open Graph, canonical, `lang`; consistent between pages
  - Modelo: sonnet
  - Prueba manual: open `bingo.html` and view the page source: title, description, favicon, `og:*`, `twitter:card` and canonical are in the head; click EN and inspect the head: `og:title`, `og:description` and `og:locale` (en_US) follow the language.
  - ❓ Bloqueada (solo canonical y `og:image` absolutos): what is the production domain? Canonical and `og:image` are relative until it is known (see `DECISIONS_TO_REVIEW.md`, P22.8).
- [x] **T2209** (P22.9) Load performance: measure what each page downloads (`i18n.js`, `content.js`, images, fonts), lazy-load images, avoid loading modules a page does not use; no behaviour change. Larger changes go as new tasks in section 23
  - Prueba manual: run `node tests/load-budget.mjs .`: it lists each page's size (`i18n.js` is the biggest file everywhere) and ends with "problems 0"; open `planet-sim.html` with the Network panel open: the Empire-tab icons are only requested when you open that tab.
- [ ] **T2210** (P22.10) Add the two missing starbase screenshots of the "Diseño de naves mecánicas" article (`img/naves/Base estelar artillada.png`, `img/naves/Base estelar portahangares.png`) and drop them from `known_missing` in the smoke test
  - ❓ Bloqueada: the owner has to provide the two in-game screenshots (artillery and carrier starbase designs); they are not in the repository.
- [ ] **T2211** (P22.11) Contrast of the word highlight colours of `js/highlight-config.js` on the dark background: #375cff (cruiser, herald, 3.8:1), #2c33ff (energy, shield, 2.8:1), #332cff (unbidden, 2.7:1), #ad208c (hardening, 3.1:1), #8900af (dark matter, psionic, 2.5:1) are under 4.5:1; lighten them keeping their hue, or keep them
  - Modelo: sonnet
  - ❓ Bloqueada: the owner chose these colours (in-game class colours); lighten them for readability or keep them as they are?
- [x] **T2212** (P22.12) Bingo on mobile: the `≤ 700 px` rules of `styles.css` for `.bingo-grid` and `.bingo-grid--principles` (smaller cells, 88 / 46 px) never apply because the base rules of the bingo section come later with the same specificity; move them after the base rules and check the mobile smoke tests (found in T2305)
  - Prueba manual: open `bingo.html` in device mode at 320 px wide: Origins shows 3 cells per row (2 before) and Principles 5 (4 before), with no sideways scroll.
- [x] **T2213** (P22.13) Bingo PNG download smoke test times out: in `tests/smoke/bingo.py` the click on `#bingo-download` (origins) never fires a download within 30 s (with and without `BLOCK_REMOTE=1`), which stops `tests/policies-smoke.py` before the legal, site and extractor areas; find whether the page or the test broke and fix it (found in T1906)
  - Prueba manual: run `BLOCK_REMOTE=1 python tests/policies-smoke.py`: every "bingo: PNG download …" line and "bingo: a stalled icon request does not block the PNG download" pass and the legal, site and extractor areas run; on `bingo.html` "Download as image" always gives a PNG within about 5 s, even on a slow connection.


## 23 · Refactoring (whole site)
No behaviour change: every task keeps all smoke tests passing without changing what they check (only how they are organised, in T2306). Runs before the tech tree, which reuses the shared shell.
- [x] **T2301** (P23.1) Refactoring audit of the whole site: duplicated code (header, language selector, applying `data-i18n`, footer, dialogs) between `app.js`, `bingo.js`, `legal.js`, `planet-sim.js`; oversized modules; dead code. Add each concrete refactor found as a new task of this section
  - Findings in `DECISIONS_TO_REVIEW.md` (P23.1); the ones already covered are noted under T2302, T2303, T2304 and T2307, the new ones are T2309 and T2310.
  - Prueba manual: abrir `DECISIONS_TO_REVIEW.md`, sección P23.1, y `tasks.md`, sección 23: cada hallazgo aparece como nota de una tarea existente o como tarea nueva (T2309, T2310).
- [x] **T2302** (P23.2) Shared page shell module (header, language selector, applying `data-i18n` / `data-i18n-attr`, footer) used by every page
  - Audit (T2301): the same `applyTranslations()` lives in `legal.js`, `bingo.js` and `planet-sim.js` (only the latter accepts several `attr:key` pairs separated by `;`), `app.js` translates the index by element id (`applyStaticStrings()`) instead of `data-i18n`; five simulator modules (`planet-sim.js`, `empire.js`, `celestial.js`, `planet-summary.js`, `planet-library-ui.js`) each add their own click listeners to `.lang-btn` and store the language; the header markup differs per page (language buttons have `aria-label`/`lang` only in the simulator, the brand link of the legal pages has no `aria-label`, the simulator header and footer are still inside `<main>`); `bingo.js` and `planet-sim.js` keep a dead meta-description fallback.
  - Prueba manual: abrir index.html, bingo.html, planet-sim.html y privacy.html y pulsar EN y JP en cada una: todo el texto, el título y las etiquetas cambian de idioma, el botón pulsado queda marcado y al pasar a otra página se mantiene el idioma elegido.
- [x] **T2303** (P23.3) Split `js/planet-sim.js` (~235 KB) into modules by responsibility (economy engine, one renderer per tab, events, state) without changing behaviour; update `README.md` and GDD §3
  - Audit (T2301): `computeTotals()` alone is ~850 lines (lines 890–1735), the economy engine; the rest are district/slot rules (~140–890), renderers (~1800–4140) and the refresh/config glue.
  - Prueba manual: abrir planet-sim.html, construir edificios y distritos, cambiar de cuerpo celeste, de idioma y de pestaña, guardar el planeta en la Biblioteca y volver a abrirlo: todo funciona y las cifras son las mismas que antes de la división en módulos.
- [x] **T2304** (P23.4) Split `js/i18n.js` (~430 KB) by area (common, wiki, bingo, simulator, tech tree) so every page loads only what it uses; adapt the parity checks
  - Audit (T2301): the parity checks live twice, in `tests/i18n-audit.mjs` (regex over the source) and in three blocks of `tests/policies-smoke.py` (they rewrite `const strings =` into an export); both have to read the split files.
  - Prueba manual: abrir index.html, bingo.html, planet-sim.html, tech-tree.html y privacy.html con el panel Red abierto y pulsar EN y JP: cada página solo descarga i18n-common.js y sus propios i18n-<área>.js, y todos los textos cambian de idioma; node tests/i18n-audit.mjs . termina con problems 0.
- [x] **T2305** (P23.5) Organise `styles.css` by page/component with shared colour tokens and remove unused selectors
  - Prueba manual: abrir styles.css (índice de secciones y tokens de color en :root) y después index.html, bingo.html, planet-sim.html y privacy.html en escritorio y a 375 px: todo se ve exactamente igual que antes.
- [x] **T2306** (P23.6) Split `tests/policies-smoke.py` (~110 KB) into one file per area with shared helpers and a single runner; update `README.md`
  - Prueba manual: ejecutar BLOCK_REMOTE=1 python tests/policies-smoke.py: salen las mismas comprobaciones que antes (ahora repartidas en tests/smoke/<área>.py) y termina en All passed.
- [x] **T2307** (P23.7) Remove dead code: unused exports, functions, i18n keys and CSS. Unused files in `img/` are only listed in `DECISIONS_TO_REVIEW.md`, never deleted
  - Audit (T2301): exports used nowhere: `REGULAR_BODY_RULES` (`body-type-data.js`), `BRANCH_OFFICE_NEW_JOBS` (`branch-office-data.js`), `getSelectedPolicies` (`empire.js`), `getScenarioA` (`scenario-compare.js`); about 25 more exports are only used inside their own file (the `export` can go unless a test imports them).
  - Prueba manual: abrir DECISIONS_TO_REVIEW.md, sección P23.7: lista lo eliminado y los 21 archivos de img/ sin uso (que siguen en su sitio); después abrir planet-sim.html y cambiar de pestaña e idioma: todo funciona como antes.
- [x] **T2308** (P23.8) Load performance follow-ups from P22.9: serve `fonts/Orbitron-VariableFont_wght.ttf` as WOFF2 (keep the TTF as fallback in `@font-face`) and add `<link rel="modulepreload">` for the simulator's deep import chain (`policy-data.js` → `building-requirements.js` → `empire-data.js` → `civic-rules.js`), with a smoke check that every preloaded module is in the page's graph; compare before/after with `node tests/load-budget.mjs .`
  - Before/after in `DECISIONS_TO_REVIEW.md` (P23.8): font 37.1 → 15.4 KB on every page; simulator import levels 4 → 2 with 15 preloads.
  - Prueba manual: run `node tests/load-budget.mjs .`: planet-sim.html shows "fetch rounds 4 (2 with 15 modulepreload)" and ends with "problems 0"; open any page with the Network panel open: the font requested is `Orbitron-VariableFont_wght.woff2` and the titles still use Orbitron.
- [x] **T2309** (P23.9) Shared simulator text helpers: `sign` / `num` / `pct`, `resourceName()` and `jobName()` (including the job key built from a swap id, also `swapJobI18nKey()` in `job-swaps.js`) are written again in `planet-sim.js`, `edicts-ui.js` and `branch-offices-ui.js`; move them to one module and import it
  - Prueba manual: open `planet-sim.html` and look at the Edicts tab (effect lines such as "+10% …" and resource names), the Sucursales tab (owner effects and job names) and a job swap condition in the jobs list: the texts are the same as before, in ES, EN and JP.
- [x] **T2310** (P23.10) Shared modal helper (overlay, Escape, click outside, focus trap, focus back to the opener) used by `confirmChoice()` and `promptText()` in `js/confirm-dialog.js` and by the wiki image lightbox in `app.js`, which repeat that code three times
  - Prueba manual: open `index.html#/MUGANI` and click the portrait: the image opens; click the dark background and it closes with the focus back on the portrait. In `planet-sim.html` → Biblioteca, rename a planet: Tab cycles field → OK → Cancel and Escape closes the dialog.

## 24 · Generic bingo and new bingos
- [x] **T2401** (P24.1) Generic bingo engine: every bingo is one entry of `js/bingo-data.js` (id, title/description keys, items with image path or `null`, i18n key, tags, DLC), with its own `iconSize` and `layout`: `grid` (default, number of columns), `ordered` (explicit order, e.g. origins as in the game) or `shape` (custom cell positions, e.g. the ethics wheel). Missing images keep a reserved, fixed-size empty slot. Selector, marking and PNG download work with every layout. Origins and principles migrated with no visible change; smoke tests
  - Prueba manual: open `bingo.html`: origins and civics look as before (same cell sizes, names under the origins, tooltip only on civics) with a one-line description under the controls; marks survive switching bingo and language, and the PNG download still has 9 columns.
- [x] **T2403** (P24.3) Ethics bingo with the in-game ethics wheel shape (four axes, fanatic ethics on the outer ring, gestalt in the centre; reuse the simulator's ethics wheel drawing). Icons from `ethics/`, names already in `js/i18n.js`
  - Prueba manual: open `bingo.html` and pick "Éticas": the 17 ethics appear as the in-game wheel (fanatic ones on the outer ring, gestalt consciousness in the centre) with their names; click some, download the PNG and it shows the same 5×5 wheel with the marks.
- [x] **T2404** (P24.4) Authorities bingo from `authorities/` (75 icons): decide which variants are separate cells from the file names and record it in `DECISIONS_TO_REVIEW.md`; names already in `js/i18n.js`
  - Prueba manual: open `bingo.html` and pick "Autoridades": 75 small cells, the 10 base authorities first and then the ascension variants; hovering a variant shows e.g. "Democrática (Sintética: virtual)", and marking it does not mark the base authority.

## 25 · Game files extractor
Replaces the wiki as data source (the wiki cannot be scraped automatically). Python, one script per data set plus `extract_all.py`, so any part can be extracted on its own. Design: `GAME_FILES_EXTRACTOR.md` (T2501). Game files are never committed; the game folder is a parameter.
- [x] **T2501** (P25.1) Write `GAME_FILES_EXTRACTOR.md`: folder layout (`tools/extract/`: shared library, one `extract_<set>.py` per data set, `extract_all.py`), input (game folder by argument or `STELLARIS_GAME_DIR`, default `D:/Program Files (x86)/Steam/steamapps/common/Stellaris`; version read from `launcher-settings.json` as `rulesetId`, today `stellaris-pc-4.5.4`), outputs (`data/generated/<rulesetId>/<set>.json`, icons as PNG written into the StellarisAssets repository `C:/Users/ignis/OneDrive/Documentos/StellarisAssets` (the loop commits there, the owner pushes), a manifest with counts and warnings), mapping of every data set to its game folder (`common/technology`, `pop_jobs`, `buildings`, `districts`, zones and specializations, `colony_types`, `governments/civics`, `governments/authorities`, `ethics`, `planet_classes`, `planet_modifiers`, `static_modifiers`, `deposits`, `edicts`, `policies`, `economic_categories`, `scripted_variables`, `inline_scripts`, `localisation/`, `interface/*.gfx`, `gfx/`, `dlc/`), and what stays unmodelled (complex triggers kept as text)
  - Prueba manual: open `GAME_FILES_EXTRACTOR.md`: it describes the `tools/extract/` layout, the game folder and version input, the `data/generated/<rulesetId>/` outputs and the StellarisAssets icon export, and has a table mapping every data set to its game folders.
- [x] **T2502** (P25.2) Paradox script parser (shared library) with tests on small hand-written samples under `tests/fixtures/game-files/`: key = value, nested blocks, comparison operators, lists, quoted strings, comments, repeated keys, `yes`/`no`, colours, `@variables` (local and `common/scripted_variables`), `@[ ... ]` inline maths, `inline_script` expansion
  - Prueba manual: run `python -m unittest discover -s tests/extract`: the parser tests pass (key = value, operators, lists, colours, `@variables`, `@[ ]` maths and `inline_script` on `tests/fixtures/game-files/`); the browser smoke test lists them as `extractor:` checks.
- [x] **T2503** (P25.3) Localisation reader: `localisation/<language>/*_l_<language>.yml` (BOM, `key:0 "text"`), `replace/` overrides, `$key$` references, colour codes and `£icon£` markers; every language; tests on samples
  - Prueba manual: run `python -m unittest discover -s tests/extract`: the localisation tests pass (BOM, `key:0 "text"`, `replace/` overrides, `$key$` references, colours and icons kept, every language folder of `tests/fixtures/game-files/localisation/`).
- [x] **T2504** (P25.4) Icon exporter: sprite names from `interface/*.gfx` (`spriteType` name → texture file, frames), `.dds` → `.png` with Pillow, folders named like StellarisAssets; tests with a DDS generated by the test
  - Prueba manual: run `python -m unittest discover -s tests/extract`: the icon tests pass (sprites read from `tests/fixtures/game-files/interface/test.gfx`, a DDS generated by the test converted to PNG, first frame of a strip, existing StellarisAssets names reused).
- [x] **T2505** (P25.5) Game files available to the extractor
  - Nota: owner, 2026-11-22: the installed game is **4.5.4** at `D:/Program Files (x86)/Steam/steamapps/common/Stellaris` (`launcher-settings.json`: "Cygnus v4.5.4"); the whole project moves to 4.5.4 (`stellaris-pc-4.5.4`). Default game folder of the extractor; read permission given in `.claude/auto-tasks.json`.
- [x] **T2506** (P25.6) `extract_technologies.py`: every technology (id, area, category, tier, cost from tier variables, prerequisites, weight and modifiers, start / rare / dangerous / event / repeatable flags, `potential` conditions as text, DLC from `host_has_dlc`, icon), names and descriptions from localisation, icons exported
  - Prueba manual: run `python tools/extract/extract_technologies.py` and open `data/generated/stellaris-pc-4.5.4/technologies.json`: 679 technologies with area, category, tier, cost, prerequisites, flags, DLC, English name and icon (e.g. `tech_basic_science_lab_2`, cost 1500, with its Wilderness swap).
- [x] **T2507** (P25.7) `extract_jobs.py`: jobs, outputs, upkeep, categories and job swaps
  - Prueba manual: run `python tools/extract/extract_jobs.py` and open `data/generated/stellaris-pc-4.5.4/jobs.json`: 367 jobs with category, outputs (`miner` produces 4 minerals), upkeep, modifiers, swaps (Scrap Miner, Cave Cleaner...) and icon, plus the pop categories.
- [x] **T2508** (P25.8) `extract_buildings.py`: buildings, cost, upkeep, jobs, effects, requirements as text, upgrades
  - Prueba manual: run `python tools/extract/extract_buildings.py` and open `data/generated/stellaris-pc-4.5.4/buildings.json`: 498 buildings with cost (`building_research_lab_1`: 400 minerals, 2 energy upkeep), jobs, modifiers, requirements as text, upgrades and icon.
- [x] **T2509** (P25.9) `extract_districts.py`: districts, zones and district specializations
  - Prueba manual: run `python tools/extract/extract_districts.py` and open `data/generated/stellaris-pc-4.5.4/`: `districts.json` (147, e.g. Generator District: 300 minerals, slot `slot_energy`), `zones.json` (146 district specializations with their jobs and icon) and `zone_slots.json` (33).
- [x] **T2510** (P25.10) `extract_designations.py`: colony designations (`colony_types`)
  - Prueba manual: run `python tools/extract/extract_designations.py` and open `data/generated/stellaris-pc-4.5.4/designations.json`: 101 colony designations (e.g. `col_mining` Mining World, +15% miner workforce, with its conditional bonuses as text) and their icon from the `GFX_colony_type` sheet.
- [x] **T2511** (P25.11) `extract_civics.py`: civics and origins (with the in-game order of the origins for T2402)
  - Prueba manual: run `python tools/extract/extract_civics.py` and open `data/generated/stellaris-pc-4.5.4/`: `civics.json` (281 civics with modifiers, requirements as text, DLC and icon) and `origins.json` (77 origins with `game_order`, icon and picture).
- [x] **T2512** (P25.12) `extract_authorities.py`: authorities
  - Prueba manual: run `python tools/extract/extract_authorities.py` and open `data/generated/stellaris-pc-4.5.4/authorities.json`: 8 authorities with election data, modifiers and icon, each with its ascension variants in `swaps` (72, e.g. Democratic Augmentocracy with its own icon).
- [x] **T2513** (P25.13) `extract_ethics.py`: ethics and their axes
  - Prueba manual: run `python tools/extract/extract_ethics.py` and open `data/generated/stellaris-pc-4.5.4/ethics.json`: 17 ethics with cost, axis (`category`, `category_value`), fanatic variants, modifiers and icon, plus `axes` (col, xen, mil, spi and hive).
- [x] **T2514** (P25.14) `extract_planets.py`: planet classes and celestial bodies
  - Prueba manual: run `python tools/extract/extract_planets.py` and open `data/generated/stellaris-pc-4.5.4/planet_classes.json`: 69 planet classes and other bodies with `kind` (planet, star, asteroid, artificial, body), climate, size, district set and icon, plus the `random_lists`.
- [x] **T2515** (P25.15) `extract_planet_features.py`: planet modifiers, static modifiers, deposits and blockers
  - Prueba manual: run `python tools/extract/extract_planet_features.py` and open `data/generated/stellaris-pc-4.5.4/`: `planet_modifiers.json` (70, e.g. Hostile Fauna with its modifiers and icon), `static_modifiers.json` (3080) and `deposits.json` (592 deposits; blockers flagged, with their clearing cost and time).
- [x] **T2516** (P25.16) `extract_edicts.py`: edicts
  - Prueba manual: run `python tools/extract/extract_edicts.py` and open `data/generated/stellaris-pc-4.5.4/edicts.json`: 171 edicts, campaigns, ambitions and sacrifices (`group`) with cost and upkeep (Research Subsidies: 30 unity), modifiers, requirements as text and icon.
- [x] **T2517** (P25.17) `extract_policies.py`: policies and their options
  - Prueba manual: run `python tools/extract/extract_policies.py` and open `data/generated/stellaris-pc-4.5.4/policies.json`: 60 policies with their 224 options (names, modifiers, conditions as text; diplomatic stance icons in `diplomatic_stances/`).
- [x] **T2518** (P25.18) `extract_economic_categories.py`: economic categories (what each modifier applies to)
  - Prueba manual: run `python tools/extract/extract_economic_categories.py` and open `data/generated/stellaris-pc-4.5.4/economic_categories.json`: 270 categories with parent, ancestors, children, generated modifiers (`planet_miners_<resource>_produces_mult`...) and the jobs, buildings, districts... they apply to (`used_by`, `used_by_descendants`).
- [x] **T2519** (P25.19) `extract_dlc.py`: DLC list, names and icons (for T3502)
  - Prueba manual: run `python tools/extract/extract_dlc.py` and open `data/generated/stellaris-pc-4.5.4/dlc.json`: 36 DLCs from `dlc_info.txt` with the name used by `host_has_dlc`, category, whether it is installed, Steam id and icon (e.g. Nomads, `dlc/nomads.png`).
- [x] **T2520** (P25.20) Localised names of every data set in every game language (extracted only: not used until P15 is unblocked)
  - Prueba manual: open `data/generated/stellaris-pc-4.5.4/localisation/spanish.json` (or any of the 10 languages): every set lists its names by id, e.g. `jobs.miner` = "Minero", `civics.civic_corvee_system` = "Sistema de trabajo forzado"; `japanese.json` has 鉱山労働者 for the miner.
- [x] **T2521** (P25.21) `extract_all.py`: runs every extractor or a chosen subset (`--only technologies,jobs`), writes the manifest; documented in `README.md`
  - Prueba manual: run `python tools/extract/extract_all.py` (about 5 s): it writes every set and `data/generated/stellaris-pc-4.5.4/manifest.json` with the count and warnings of each; `--only zones,jobs` runs only the jobs and districts extractors; the README section "Extractor de datos del juego" explains it.
- [x] **T2522** (P25.22) Difference report per data set between the generated data and the current simulator data (`js/*-data.js`) in `reports/<rulesetId>/`; the simulator is not changed
  - Prueba manual: run `python tools/extract/report_differences.py` and open `reports/stellaris-pc-4.5.4/README.md`: a table with simulator, game, matched and differing items per set; `buildings.md` lists e.g. Alloy Foundries with 200 metallurgists against the game's 200 foundry jobs.
- [x] **T2524** (P25.24) Icon export of every data set into the StellarisAssets repository (`C:/Users/ignis/OneDrive/Documentos/StellarisAssets`), same folder and file names it already uses (`buildings/`, `jobs/`, `civics/`…); new folders only for new kinds (`technologies/`, `dlc/`); commit there with `git -C`, never push; regenerate `StellarisAssetsFileTree.txt`; list replaced files in the commit message
  - Prueba manual: run `git -C "C:/Users/ignis/OneDrive/Documentos/StellarisAssets" log -1` (commit "Icons exported from the Stellaris 4.5.4 game files" with the 102 replaced files) and open `StellarisAssetsFileTree.txt`: it now lists `technologies/` (812 icons) and `dlc/` (50).
- [x] **T2525** (P25.25) Advanced Logic resource icon (old T1204): export it from the game files into `resources/` of StellarisAssets and use it in `RESOURCES.advanced_logic` of `js/planet-data.js`
  - Prueba manual: after the owner pushes StellarisAssets, open the simulator on a Synaptic Lathe planet: Advanced Logic shows the blue brain icon of the game (`resources/Advanced_logic.png`) in the economy and in the Lathe building costs instead of the modifier icon.
- [ ] **T2523** (P25.23) Switch the simulator data sets to the generated data, one by one
  - ❓ Bloqueada: The owner has to review the T2522 reports first.
- [ ] **T2526** (P25.26) The installed game is now 4.6.0 (Corona Borealis v4.6.0, `stellaris-pc-4.6.0`; found in T3008): every extractor run without `--game` now reads 4.6.0 (683 technologies, 4 new tech icons) while the project data is 4.5.4
  - ❓ Bloqueada: Does the project move to 4.6.0 (regenerate `data/generated/`, the reports and the tech data file as a new version) or stay on 4.5.4 (then the 4.5.4 game files must be kept in another folder and passed with `--game`)?

## 10 · Special planets
Source: the 4.5.4 game files through the extractor (section 25); runs after it.
- [x] **T1006** (P10.6) Wilderness origin, modelled from the extractor output (owner, 2026-11-22; update GDD §10). Needs the Wilderness origin, Mutualistic Intelligence authority, Biomass resource, Communal Biome / Photosynthesis Field / Hollow Mountain / Orchard Forest districts, symbiont job swaps (Photosymbiont, Grubsymbiont, Pollinosymbiont) and the wilderness specializations (Solar Mycolungs, Orespine...).
  - Prueba manual: in `planet-sim.html`, Imperio tab, pick Gestalt Consciousness and Hive Mind, then the Wilderness card of the new «Origin» panel: the authority reads «Mutualistic Intelligence»; on the Planet tab the districts are Communal Biome, Photosynthesis Field, Hollow Mountain and Orchard Forest (tooltip «Cost: 300 Minerals, 50 Biomass»), the capital is Planetary Tendrils, and a Photosynthesis Field adds Photosymbiont jobs instead of Technicians.
- [x] **T1011** (P10.11) Rest of the Wilderness origin from the extractor output: its buildings (`common/buildings/21_wilderness_buildings.txt`: Tendril Cradle, Research Growth, Commensal Clearing, Lithic Bore, Smelting Pool, Avatar Cradle... and their building sets), the effects of the Wilderness designations (`col_wilderness_*`), the other symbiont job swaps (Choirsymbiont, Spindlesymbiont, Immunosymbiont, Evosymbionts, Forgesymbiont, Tamersymbiont, Broodsymbiont...), Pliable Biomass, Biomass production and the Wilderness deposits (`d_wilderness_*`).
  - Prueba manual: in `planet-sim.html`, pick Gestalt Consciousness, Hive Mind and the Wilderness origin, then on the Planet tab → Buildings build a Research Growth: the jobs panel shows Physics / Biology / Engineering Evosymbionts, and choosing the Cogitation World designation raises the research; the Conditions «i» panel explains that this planet's pops add to the Biomass stock.

## 19 · Branch offices (Sucursales tab)
Models another empire placing branch office buildings on this planet; any branch office building can be chosen.
- [x] **T1905** (P19.5) `maxPerColony` of every branch office building, taken from its limits in the game files (extractor output of T2508)
  - Prueba manual: in `planet-sim.html`, raise the capital to tier III, open the Sucursales tab, tick the branch office and pick Commercial Forum in slot 1: in slot 2 the Commercial Forum option is greyed out with «limit: 1 per colony».
- [x] **T1906** (P19.6) Branch office owner taken from a saved empire profile: in the Sucursales tab, an "Owner empire" select lists the saved empire profiles that are megacorporations (Corporate authority) plus "Custom owner" (today's civic checkboxes). Picking a profile copies its civics (only those of `BRANCH_OWNER_CIVICS`, at most 3) into the owner civics, which become read-only; illegal is dropped if it lacks Criminal Heritage. The choice is saved with the planet as optional `ownerEmpireId` / `ownerEmpireName` inside `branchOffice` (plus the copied `ownerCivicIds`; `planet-library.js` sanitizer, `capturePlanetConfig` / `applyPlanetConfig`); planets without them keep loading as before. While the profile exists and is still a megacorporation its current civics and name win (also live, on `onEmpiresChange`); if it is deleted or no longer corporate, the planet keeps the saved copy and the tab says so. Interface texts in es/en/jp; smoke tests in `tests/smoke/sim_branches_swaps.py`; GDD §5.2 and §8 updated
  - Prueba manual: in `planet-sim.html`, Imperio tab, pick the Corporate authority and Criminal Heritage and save the empire as "Mega test"; open the Sucursales tab, tick the branch office and choose "Mega test" in "Owner empire": the owner civics show Criminal Heritage ticked and greyed out, and Illegal can be chosen; save the planet, reload and open it from the Biblioteca: "Mega test" is still the owner. Delete the empire: the tab says it keeps the saved civics.

## 20 · Pop upkeep and living standards
Source: the 4.5.4 game files through the extractor (species rights / living standards in `common/`); runs after section 25.
- [x] **T2001** (P20.1) Extract (new `extract_living_standards.py`) and audit living standards: pop upkeep per standard and stratum/species type, effects (happiness, political power...), availability by ethics/authority/civics
  - Prueba manual: run `python tools/extract/extract_living_standards.py` and open `data/generated/stellaris-pc-4.5.4/living_standards.json`: Decent Conditions lists `pop_upkeep` 1 / 0.5 / 0.25 / 0.25 consumer goods for rulers / specialists / workers / civilians, matching the table of `PLANET_SIM_GDD.md` §5.3.
- [x] **T2002** (P20.2) Living standard saved with the empire profile (optional field), selectable in the Imperio tab
  - Prueba manual: in `planet-sim.html`, Imperio tab, panel "Living standard": Decent Conditions is selected by default and Utopian Abundance is locked until you pick Egalitarian; choose it, save the empire and reload: Utopian Abundance is still selected.
- [x] **T2003** (P20.3) Engine: pop upkeep (food/minerals/energy/consumer goods...) on top of job upkeep, with its own breakdown lines and modifier category
  - Prueba manual: open `planet-sim.html`, build Commercial Zones and click the Consumer goods row of Net: the breakdown shows "Pop upkeep: living standard" −1 (2 Traders × 0.5) on top of the Traders' −2; Food shows "Pop upkeep: species type" −4; in the Imperio tab pick Utopian Abundance (with Egalitarian) and the living standard upkeep grows to 1 per pop.
- [x] **T2004** (P20.4) Edicts with pop upkeep effects (Recycling Campaign, Nutritional Plenitude, Expanded Breeding Program) added to `js/edict-data.js`
  - Prueba manual: in `planet-sim.html`, build Commercial Zones, then in the Edicts tab turn on Recycling Campaign and Nutritional Plenitude: the Net Consumer goods breakdown shows "Pop upkeep: edicts" +10 % of the living standard upkeep (positive), Food shows it −25 % of the species upkeep, and happiness rises by 5.

## 30 · Tech tree: data
Design: `TECH_TREE_GDD.md`. Data comes from the game files extractor (T2506). Until the real data exists, sections 31–34 are built and tested with the fixture version (T3001).
- [x] **T3001** (P30.1) Fixture data version under `tests/fixtures/` with the schema of GDD §4.2: a few dozen invented, clearly fake technologies covering every area, kind, tier, prerequisite chains and requirements; never shown on the site
  - Prueba manual: open `tests/fixtures/tech-tree/tech-data-fixture.js`: 38 technologies `tech_fixture_*` named "Fixture …" in three areas, six fields, tiers 0–5 and every kind; `tech-tree.html` still shows only the placeholder (the fixture is not loaded by any page).
- [x] **T3002** (P30.2) Data validations module and tests: every prerequisite exists, no cycles, unique ids, area / category / tier present (run on the fixture now, on the real data later)
  - Prueba manual: run `node tests/tech-data-check.mjs .`: the fixture gives 38 technologies and 0 problems, every self-test (duplicate id, unknown prerequisite, cycle, missing area / field / tier, unknown kind) says `caught` and it ends with `problems 0`.
- [x] **T3003** (P30.3) Reserved icon slot: every record has its `icon` path (`technologies/<id>.png`, as exported by T2506); nodes and the detail card keep a fixed-size empty frame, images load lazily and a missing file leaves the frame empty with no layout shift
  - Prueba manual: run `node tests/tech-data-check.mjs .` (self-test `no icon` caught) and the browser tests: the `tech tree icon slot` checks pass (40 px node / 72 px card frames, lazy images, a missing file leaves the frame empty without moving the name next to it).
- [x] **T3004** (P30.4) Confirm the data model of GDD §4.2 against the extractor output (ids, kinds, tier gating, event and repeatable techs, DLC) and write it as GDD §4.3
  - Prueba manual: open `TECH_TREE_GDD.md` §4.3: the record fields with the 4.5.4 counts (679 technologies, 13 fields, kinds from the game flags, icons from the texture, variants, repeatable levels); `DECISIONS_TO_REVIEW.md` has the T3004 decisions.
- [x] **T3005** (P30.5) Data file of 4.5.4 generated from the extractor output, every technology including event and repeatable ones
  - Prueba manual: run `python tools/extract/build_tech_data.py` (prints 679 technologies) and open `js/tech-data/stellaris-pc-4.5.4.js`: one technology per line, e.g. `tech_repeatable_lcluster_clue` with `kind: repeatable` and `repeatable.levels: null`; `git diff` shows no change after regenerating.
- [x] **T3006** (P30.6) Register the collection in `js/data-version.js` with status `unverified`
  - Prueba manual: open `js/data-version.js`: `DATA_COLLECTIONS.technologies` points to `js/tech-data/stellaris-pc-4.5.4.js` with `rulesetId` 4.5.4 and status `unverified`; in `planet-sim.html` the tooltip of the data version selector still counts only the simulator collections.
- [x] **T3007** (P30.7) Link unlocks to simulator ids (buildings, jobs, districts) through the game ids
  - Prueba manual: open `js/tech-data/stellaris-pc-4.5.4.js` and find `tech_engineering_1` (Nanomechanics): its unlock Materials Workshop has `sim: {collection: "buildings", id: "materials_workshop"}` and the job `engineer` linked to the simulator `engineer`.
- [x] **T3008** (P30.8) Technology icons: write the PNGs exported by T2506 into the StellarisAssets repository (`technologies/`), commit them there (never push: the owner pushes), regenerate `StellarisAssetsFileTree.txt`, and check with a local file server that nodes and cards show them
  - Prueba manual: in StellarisAssets, `technologies/` has the 812 PNGs of commit `5d5d6a1` (a new export reports them all `unchanged`) and `StellarisAssetsFileTree.txt` lists them; the browser test `tech tree icons: with a local file server…` shows them in 40 px node and 72 px card frames. Online they appear once the owner pushes StellarisAssets.

## 31 · Tech tree: page and drawing
- [x] **T3101** (P31.1) `tech-tree.html` layout with the shared shell: three areas (tabs on mobile), credits section and footer mention (GDD §2), data version visible
  - Prueba manual: open `tech-tree.html`: three panels Physics / Society / Engineering side by side, the line "Data version: stellaris-pc-4.5.4 · Cygnus v4.5.4 (1b4f) · unverified…", a Credits section linking BloodStainedCrow and turanar and the footer mention; narrower than 700 px the areas become three tabs.
- [x] **T3102** (P31.2) Layout by tier columns and field rows; nodes with the reserved icon slot (T3003), name, tier and kind
  - Prueba manual: open `tech-tree.html`: each area panel shows the tier columns Tier 0–5 and one row per field (e.g. Physics: Field Manipulation, Particles, Computing); every node has its icon frame, the English name and "Tier N · Kind" (Red Lasers: "Tier 0 · Starter"), which turns into "Nivel 0 · Inicial" in ES.
- [x] **T3103** (P31.3) Prerequisite lines between nodes (SVG), redrawn on resize
  - Prueba manual: open `tech-tree.html`: curves join each technology with its prerequisites of the same area (e.g. Red Lasers → Blue Lasers in Physics), under the nodes; resize the window or switch a mobile tab and the curves still end on the node edges.
- [x] **T3104** (P31.4) Visual states: normal, selected, prerequisite, unlocked by the selected, kind colours (starter, rare, dangerous, repeatable, event)
  - Prueba manual: open `tech-tree.html` and click Blue Lasers: it is framed in yellow-green, Red Lasers gets the teal dashed prerequisite frame, the lasers it unlocks the orange one, their lines light up, the rest dims and the status line names it; click again or press Escape to clear. The legend shows the kind colours.
- [x] **T3105** (P31.5) Mobile layout at 320–375 px
  - Prueba manual: open `tech-tree.html` on a phone (or the browser's device mode at 320–375 px): three 44 px area tabs, field names written vertically at the left, narrower nodes with their icon frame, and the tree scrolls sideways inside the panel while the page does not; tapping a node selects it.

## 32 · Tech tree: exploration
- [x] **T3201** (P32.1) Detail card on click: base cost, tier, kind, description, prerequisites and other requirements, unlocks (linked to the simulator where T3007 linked them), draw weight as information, DLC, version
  - Prueba manual: open `tech-tree.html` and click Blue Lasers: a card opens in its own column at the right with base cost 1,250, Tier 1 · Normal · Physics · Particles, the description, Red Lasers as a prerequisite button, the techs it leads to, draw weight base 95 with its modifiers, Base game and the 4.5.4 version; Vultaum Reality Computer (Society) links its building to the planet simulator; × or Escape closes it.
- [x] **T3202** (P32.2) Highlight the whole prerequisite chain and everything that depends on the selected tech
  - Prueba manual: open `tech-tree.html` and click Blue Lasers: Red Lasers is framed in teal and every later laser and the techs after them (also in other areas) in orange, with their lines lit; the direct neighbours glow, the rest only have the coloured border, and the status line counts both chains.
- [x] **T3203** (P32.3) Accent-insensitive search by name and filters (area, field, tier, kind, DLC)
  - Prueba manual: open `tech-tree.html` and type `LÁSERS` in Search: the six laser techs are outlined, the rest dimmed, "6 of 679 technologies match" and their buttons appear (one opens its card); choose Area Society + Kind Rare, or DLC The Machine Age, and only those stay lit; Clear filters brings everything back.
- [x] **T3204** (P32.4) Zoom and pan of the tree (mouse, touch, keyboard)
  - Prueba manual: open `tech-tree.html`: the Zoom bar's − / + change the level (60 %, 115 %…) and nodes and lines shrink or grow together; Ctrl + wheel zooms around the pointer, dragging the empty background pans, and after clicking inside a panel the arrows move it and + − 0 zoom; on a phone, pinch with two fingers.
- [x] **T3205** (P32.5) Deep link to a technology (URL hash), also from the wiki articles
  - Prueba manual: open `tech-tree.html#tech_lasers_2`: Blue Lasers is selected, centred and its card is open with a "Link to this technology" link; clicking Red Lasers changes the address to `#tech_lasers_1`, Escape removes it, and `#tech_does_not_exist` says that technology does not exist in this data version.

## 33 · Tech tree: versions
- [x] **T3301** (P33.1) Version selector and per-version data loading (only 4.5.2 exists; tested with a small fixture version under `tests/`)
  - Prueba manual: open `tech-tree.html`: under the intro a "Game version" selector shows "Stellaris PC 4.5.4 · current" and the tree draws its 679 technologies; `tech-tree.html?version=nope` shows the same data with a notice that the version "nope" does not exist.
- [x] **T3302** (P33.2) Procedure to add a new version without losing the previous ones (GDD §5 and the script's help)
  - Modelo: sonnet
  - Prueba manual: run `python tools/extract/build_tech_data.py --help`: the six-step procedure appears after the options; the same steps are in TECH_TREE_GDD.md section 5.
- [x] **T3303** (P33.3) Comparison view between two versions: added, removed, changed cost / tier / prerequisites (tested with the fixture version)
  - Prueba manual: open `tech-tree.html` and scroll below the tree: the "Compare versions" section says there is only one data version (Stellaris PC 4.5.4) and the comparison will come with the next one; with two versions in `js/tech-versions.js`, Compare lists the added, removed and changed technologies with links to their nodes.

## 34 · Tech tree: integration
- [x] **T3401** (P34.1) Interface texts of the tech tree in es/en/jp; game names in English in every language (official names wait for P15)
  - Prueba manual: open `tech-tree.html`, select a technology and switch to ES and JP: every label, button and card heading changes language while technology, field and area names stay in English (inspecting them shows `lang="en"`).
- [x] **T3402** (P34.2) Links from the wiki (`content.js` tech mentions, "Enlaces útiles") and from the simulator (building info) to the tech tree
  - Prueba manual: open the wiki article "Enlaces útiles" (first item opens `tech-tree.html`) and the corvette paragraph of Galactic Nemesis (its weapon names open their tree nodes); in `planet-sim.html`, open a building category: buildings unlocked by research show "Researched with: <technology>" and the link opens that technology in a new tab.
- [x] **T3403** (P34.3) Accessibility of the tech tree: keyboard navigation between nodes, screen-reader names, contrast
  - Prueba manual: open `tech-tree.html`, press Tab until a Physics node is focused and use the arrows, Home and End: the focus moves node to node and stays in view, Enter selects it, and the next Tab leaves the area; with a selection, the dimmed nodes are still readable.
- [x] **T3404** (P34.4) `README.md` (structure, sources, tests, credits) and GDD updated for the finished tech tree
  - Modelo: sonnet
  - Prueba manual: open `README.md`: there is an "Árbol de tecnologías" section, a tech tree subsection under "Pruebas" and credits linking BloodStainedCrow and turanar; `TECH_TREE_GDD.md` says the tree is finished and its sections 6 and 8 describe the page and its tests.
- [x] **T3405** (P34.5) Deep link into the planet simulator to a building or district (e.g. `planet-sim.html#building=<id>` opens its catalogue entry), and use it in the tech tree card's unlock links (today they open `planet-sim.html` only, T3201)
  - Prueba manual: open `tech-tree.html#tech_secrets_vultaum` and click "Vultaum Reality Computer" in the card's unlocks: the simulator opens with that building's category expanded and its entry outlined in green and scrolled into view; `planet-sim.html#district=mining` outlines the mining district card, and `#district=magmaConduit` on a regular planet shows a notice that it is not in the catalogue.
- [ ] **T3406** (P34.6) Flaky tech tree smoke checks: "tech tree compare: following a removed technology opens the older version with it selected" and "tech tree versions: going back to the current version drops ?version= and draws the 4.5.4 data again" each failed once in separate full runs and passed in others (fixed `wait_for_timeout` after a navigation in `tests/smoke/tech_tree.py`); wait for the page state instead (found in T2405)

## 35 · Bingos from game data
- [x] **T2402** (P24.2) Origins bingo in the in-game order (`ordered` layout), order taken from the T2511 output
  - Prueba manual: open `bingo.html` with the origins bingo: Prosperous Unification, Voidfarers, The Sacred Path… come first, in the order of `js/bingo-origin-order.js`; on the civics bingo "Download as image" gives the PNG within a few seconds.
- [x] **T2405** (P24.5) Authorities bingo: replace the draft names of `js/i18n-bingo.js` (Mutualistic Intelligence, Memory Aggregator, Neural Chorus and the 13 `authorityVariant*` labels) with the official es/en/jp names from the T2512 / T2520 output, and check that each `Auth_<path>_<authority>_<variant>.png` icon is the variant `js/bingo-data.js` says (see `DECISIONS_TO_REVIEW.md`, P24.4)
  - Modelo: sonnet
  - Prueba manual: open `bingo.html`, choose the authorities bingo and hover the cells in es, en and jp: variants show the game name and their base authority (e.g. "Democratic Surrogacy (Democratic)"), and Neural Chorus reads 神経コーラス in Japanese.
- [ ] **T2406** (P24.6) Authorities bingo: add the 4 icons the T2524 export added to `authorities/` (`Auth_cyber_dictatorial_collectivist_commander`, `_official`, `_scientist`, `_vacant`: the game's "Dictatorial Alignment" variants by ruler class, `auth_cyber_dictatorial_collectivist_*` in `authorities.json`) as cells with es/en/jp names, and remove them from `PENDING_AUTH_ICONS` of `tests/smoke/bingo.py`
- [ ] **T3501** (P35.1) Rare and dangerous technologies bingo (purple = rare, red = dangerous) from the tech data, with reserved icon slots until T3008
- [ ] **T3502** (P35.2) DLC bingo: list and icons from T2519, reserved icon slots

## 40 · Testellaris: design
Quiz game: consecutive questions of increasing difficulty by tiers, 3 lives, lifelines (50 % and others), shared top 10 "hall of fame" without accounts (MongoDB Atlas behind a Vercel function, decided by the owner on 2026-11-22). Questions in es/en/jp, each tagged with tier and DLC and citing its source; never invented.
- [ ] **T4001** (P40.1) Write `TESTELLARIS_GDD.md`: rules (tiers and how the game advances through them, lives, lifelines: 50 % plus proposals, scoring, end of game), DLC filter, question format, sources, languages, hall of fame (top 10, name of at most 10 characters), anti-abuse; proposals recorded in `DECISIONS_TO_REVIEW.md`

## 41 · Testellaris: questions
Source: only the extractor output (4.5.4 game files and their localisation, including the description texts). Game names inside the questions use the **official es/en/jp names from the game localisation** (owner, 2026-11-22; only Testellaris, the rest of the site keeps English until P15). Each batch aims at about 150 questions spread across all tiers.
- [ ] **T4101** (P41.1) Question bank format and validator in the tests: id, tier, topic, DLC list, source (game file and key), text, four answers and a short explanation in es/en/jp, correct answer; unique ids, four distinct answers, every language present, source present, tier in range
- [ ] **T4111** (P41.11) Question generator from the extractor data (`tools/`): templates in es/en/jp with the official names (which tier is X, what does Y require, which technology unlocks Z, base cost of W, which ethics a civic needs…), tier by how obscure the fact is (rules in the GDD), DLC from the data, source = game file; output into the question bank, validated; re-runnable for new versions
- [ ] **T4102** (P41.2) Questions: origins and civics, including corporate, hive mind and machine civics (from the extractor output, written by hand where a template does not fit)
  - Modelo: sonnet
- [ ] **T4103** (P41.3) Questions: ethics, government, authorities, council and leaders (from the extractor output, written by hand where a template does not fit)
  - Modelo: sonnet
- [ ] **T4104** (P41.4) Questions: technology and research (from the extractor output, written by hand where a template does not fit)
  - Modelo: sonnet
- [ ] **T4105** (P41.5) Questions: planets and colonies: planet classes, planetary features and modifiers, designations, districts, specializations, capital buildings (from the extractor output, written by hand where a template does not fit)
  - Modelo: sonnet
- [ ] **T4106** (P41.6) Questions: economy: resources, jobs, buildings, branch offices, living standards (from the extractor output, written by hand where a template does not fit)
  - Modelo: sonnet
- [ ] **T4107** (P41.7) Questions: policies, edicts, decisions, traditions, ascension perks and ambition (from the extractor output, written by hand where a template does not fit)
  - Modelo: sonnet
- [ ] **T4108** (P41.8) Questions: Shroud, astral rifts, artifacts, subject empires and empire modifiers (from the extractor output, written by hand where a template does not fit)
  - Modelo: sonnet
- [ ] **T4109** (P41.9) Review of the whole bank: duplicates, ambiguous answers, balance per tier and topic, count report
- [ ] **T4110** (P41.10) More topics to reach thousands of questions: new extractors (one script each, added to `extract_all.py`) for species traits, ascension perks, traditions, ship components, megastructures, crises, fallen empires and event texts, and their questions

## 42 · Testellaris: game page
- [ ] **T4201** (P42.1) `testellaris.html` with the shared shell and a start screen (DLC filter), linked from the home page
- [ ] **T4202** (P42.2) Game loop: increasing tiers, random questions without repeats, 3 lives, game over
- [ ] **T4203** (P42.3) Lifelines: 50 % and the others agreed in the GDD, each usable once per game
- [ ] **T4204** (P42.4) Scoring and end screen: score, tier reached, correct answers and the explanation of the failed questions
- [ ] **T4205** (P42.5) Local top 10 (`localStorage`) used when the hall of fame cannot be reached
- [ ] **T4206** (P42.6) Hall of fame: when a score enters the top 10, name input (at most 10 characters) and the top 10 list
- [ ] **T4207** (P42.7) Mobile layout, accessibility, es/en/jp interface, smoke tests and `README.md`

## 43 · Testellaris: hall of fame backend (MongoDB)
- [ ] **T4301** (P43.1) Vercel serverless function `api/hall-of-fame.js`: GET top 10, POST name and score; MongoDB Atlas through the `MONGODB_URI` environment variable (never in the repository); keeps only the top 10; local mock for the tests
- [ ] **T4302** (P43.2) Anti-abuse: name rules (length, allowed characters, word filter), rate limit, plausible-score check, payload validation
- [ ] **T4303** (P43.3) Connect the game to the API with fallback to the local top 10
- [ ] **T4304** (P43.4) Production setup: MongoDB Atlas free cluster, database user, `MONGODB_URI` in the Vercel project, deploy check
  - ❓ Bloqueada: The owner has to create the Atlas account and cluster and set the variable in Vercel (the loop cannot create accounts).

## 15 · Official localization (all at once, before the final check)
- [ ] **T1501** (P15.1) Translation plan from the extractor localisation (T2503, T2520): every game name and text keyed by game id, which languages each page gets, how interface texts without an official string are handled
- [ ] **T1502** (P15.2) Replace es/en/jp game names (civics, buildings, jobs, resources, designations, ethics, authorities, planet types, policies) with official strings keyed by game ids
- [ ] **T1503** (P15.3) All official Stellaris languages for the planet simulator and the tech tree only (wiki and bingo stay es/en/jp); key parity per language
- [ ] **T1504** (P15.4) Review the civics with English placeholder names and the keys that group several civics under one icon

## 14 · Final 4.5.4 data verification (last)
- [ ] **T1401** (P14.1) Run `extract_all.py` on the installed game (check its version first) and use its output and the T2522 reports as the source of the final review
- [ ] **T1402** (P14.2) Review every value (jobs, buildings, districts, designations, ethics, authorities, civics, capital, resources, policies, edicts, branch offices) against them
- [ ] **T1403** (P14.3) Update `verification` statuses (`unverified` → verified against the game files; add that status to `js/data-version.js` if missing)
- [ ] **T1404** (P14.4) Review GDD §9 (assumptions and stacking rules)
- [ ] **T1405** (P14.5) Deliver the final data files
- [ ] **T1406** (P14.6) Review the tech tree data against the extractor output and set its `verification` status
