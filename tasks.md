# Codex Ignis — pending tasks

> Progreso: **12 / 69 tareas (17%)**

Design rules and decisions: `PLANET_SIM_GDD.md` (planet simulator) and `TECH_TREE_GDD.md` (tech tree, sections 30–34).
**Translations on hold:** official localisation (P15) stays blocked. No task adds languages or hand-translates game names for the simulator or the tech tree; new interface texts get es/en/jp keys in `js/i18n.js` (game names in English). Finished phases (P0–P8 incl. P7.10, P16.1–P16.12, P9.1–P9.7, P12.1, P13.7, P17, P18 — edicts audit in GDD §5.1, P10.1 — body types audit in GDD §4.1, P10.2, P10.3, P10.4, P10.5, P10.6 except Wilderness, P10.7, P10.8 — GDD §4.2, P10.9, P10.10 — GDD §4.2, P19.1 — branch offices audit in GDD §5.2, P19.2, P19.3, P19.4, P21 — job swaps, audit in GDD §6.1) are in git history.
Decisions taken without the owner, pending review: `DECISIONS_TO_REVIEW.md` (every task adds its own there). Order is a proposal; **P14 is always last**. When a task is done, mark it `[x]` (the automatic loop needs it) and move any new design decision into the GDD. Task ids: `T<phase><step>` = `P<phase>.<step>` (T1305 = P13.5).

## 10 · Special planets
Sources: *Celestial object* page (base modifiers per body type); Requirements column of the Districts/buildings pages (no body-type requirement = all bodies).
- [ ] **T1006** (P10.6) Wilderness-origin districts — **on hold, owner decides later** (not modelled for now, see GDD §10). Needs the Wilderness origin, Mutualistic Intelligence authority, Biomass resource, Communal Biome / Photosynthesis Field / Hollow Mountain / Orchard Forest districts, symbiont job swaps (Photosymbiont, Grubsymbiont, Pollinosymbiont) and the wilderness specializations (Solar Mycolungs, Orespine...).
  - ❓ Bloqueada: Owner decides later whether to model the Wilderness origin (GDD §10).

## 19 · Branch offices (Sucursales tab)
Models another empire placing branch office buildings on this planet; any branch office building can be chosen.
- [ ] **T1905** (P19.5) Owner marks which branch office buildings are limited to one per colony (`maxPerColony`); until then all are repeatable
  - ❓ Bloqueada: Which branch office buildings are limited to one per colony?

## 20 · Pop upkeep and living standards
Needs the 4.5.2 *Living standards* wiki page (owner provides it when this task starts).
- [ ] **T2001** (P20.1) Audit living standards: pop upkeep per standard and stratum/species type, effects (happiness, political power...), availability by ethics/authority/civics
  - ❓ Bloqueada: Owner must provide the 4.5.2 *Living standards* wiki page.
- [ ] **T2002** (P20.2) Living standard saved with the empire profile (optional field), selectable in the Imperio tab
  - ❓ Bloqueada: Waits for P20.1 (Living standards wiki page).
- [ ] **T2003** (P20.3) Engine: pop upkeep (food/minerals/energy/consumer goods...) on top of job upkeep, with its own breakdown lines and modifier category
  - ❓ Bloqueada: Waits for P20.1 (Living standards wiki page).
- [ ] **T2004** (P20.4) Edicts with pop upkeep effects (Recycling Campaign, Nutritional Plenitude, Expanded Breeding Program) added to `js/edict-data.js`
  - ❓ Bloqueada: Waits for P20.1 (Living standards wiki page).

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
- [ ] **T1204** (P12.4) Proper Advanced Logic resource icon (replaces `modifiers/mod_advanced_logic_produces_add.png` in `RESOURCES.advanced_logic` of `js/planet-data.js`)
  - ❓ Bloqueada: StellarisAssets has no `resources/Advanced_logic.png` and the wiki image could not be downloaded from here; can the owner add the in-game resource icon to `StellarisAssets/resources/`?
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
- [ ] **T2201** (P22.1) QA of the wiki: navigation between articles, URL hashes, search, easter eggs, every block type of `content.js`, language switch, local images that do not exist, console errors
- [ ] **T2202** (P22.2) QA of the bingo: both bingos (origins, principles), marking, PNG download, language switch, missing icons, console errors
- [ ] **T2203** (P22.3) QA of the legal pages, 404 and the tech tree placeholder: links, language switch, ads/consent stay disabled (`js/ads-config.js`), `vercel.json` routing of the 404
- [ ] **T2204** (P22.4) Smoke test that opens every page in es/en/jp and fails on console errors or local resources that do not load (404)
- [ ] **T2205** (P22.5) Mobile layout review at 320–375 px of every page other than the simulator (like T1301)
- [ ] **T2206** (P22.6) Accessibility pass of every page other than the simulator: keyboard, visible focus, contrast, `alt` texts, landmarks, `lang` attribute following the language (like T1304)
- [ ] **T2207** (P22.7) i18n review of the wiki, bingo and legal pages: no hard-coded interface text, keys used exist in es/en/jp, articles of `content.js` with a missing language listed (never machine-translate: list them in `DECISIONS_TO_REVIEW.md`)
  - Modelo: sonnet
- [ ] **T2208** (P22.8) Page metadata of every page: `<title>`, description, favicon, Open Graph, canonical, `lang`; consistent between pages
  - Modelo: sonnet
- [ ] **T2209** (P22.9) Load performance: measure what each page downloads (`i18n.js`, `content.js`, images, fonts), lazy-load images, avoid loading modules a page does not use; no behaviour change. Larger changes go as new tasks in section 23

## 23 · Refactoring (whole site)
No behaviour change: every task keeps all smoke tests passing without changing what they check (only how they are organised, in T2306). Runs before the tech tree, which reuses the shared shell.
- [ ] **T2301** (P23.1) Refactoring audit of the whole site: duplicated code (header, language selector, applying `data-i18n`, footer, dialogs) between `app.js`, `bingo.js`, `legal.js`, `planet-sim.js`; oversized modules; dead code. Add each concrete refactor found as a new task of this section
- [ ] **T2302** (P23.2) Shared page shell module (header, language selector, applying `data-i18n` / `data-i18n-attr`, footer) used by every page
- [ ] **T2303** (P23.3) Split `js/planet-sim.js` (~235 KB) into modules by responsibility (economy engine, one renderer per tab, events, state) without changing behaviour; update `README.md` and GDD §3
- [ ] **T2304** (P23.4) Split `js/i18n.js` (~430 KB) by area (common, wiki, bingo, simulator, tech tree) so every page loads only what it uses; adapt the parity checks
- [ ] **T2305** (P23.5) Organise `styles.css` by page/component with shared colour tokens and remove unused selectors
- [ ] **T2306** (P23.6) Split `tests/policies-smoke.py` (~110 KB) into one file per area with shared helpers and a single runner; update `README.md`
- [ ] **T2307** (P23.7) Remove dead code: unused exports, functions, i18n keys and CSS. Unused files in `img/` are only listed in `DECISIONS_TO_REVIEW.md`, never deleted

## 30 · Tech tree: data
Design: `TECH_TREE_GDD.md`. Sources: `../Codex Ignis Wiki/v4-5-2/*.html` and `../Codex Ignis Wiki/markdown/v4-5-2/` (*Technology*, *Physics research*, *Society research*, *Engineering research*).
- [ ] **T3001** (P30.1) Audit the 4.5.2 technology pages and confirm the data model of GDD §4.2: id scheme (icon names repeated by variants), row kinds from the HTML colours, prerequisites vs other requirements, event technologies, empty costs. Write the audit as GDD §4.3
- [ ] **T3002** (P30.2) Re-runnable extraction script (Python, next to `parser wiki/`) that reads the pages of one version and writes its data file with a given `rulesetId`
- [ ] **T3003** (P30.3) Data file of 4.5.2 (`js/tech-data-4.5.2.js` or as decided in T3001) generated by the script, every technology of the three areas including event technologies
- [ ] **T3004** (P30.4) Automatic validations in the tests: every prerequisite exists, no cycles, unique ids, area/field/tier present, counts per area match the wiki tables
- [ ] **T3005** (P30.5) Register the collection in `js/data-version.js` with status `unverified`
- [ ] **T3006** (P30.6) Link unlocks to simulator ids (buildings, jobs, districts) only where the wiki names them, so the tech tree can link to the simulator
- [ ] **T3007** (P30.7) Technology icons in the nodes and the detail card
  - ❓ Bloqueada: StellarisAssets has no technology icons (`StellarisAssetsFileTree.txt`). Can the owner add them (e.g. `technologies/Tech_*.png`, the names used by the wiki)?

## 31 · Tech tree: page and drawing
- [ ] **T3101** (P31.1) `tech-tree.html` layout with the shared shell: three areas (tabs on mobile), credits section and footer mention (GDD §2), data version visible
- [ ] **T3102** (P31.2) Layout by tier columns and field rows; nodes with name, tier and kind (no tech icon until T3007)
- [ ] **T3103** (P31.3) Prerequisite lines between nodes (SVG), redrawn on resize
- [ ] **T3104** (P31.4) Visual states: normal, selected, prerequisite, unlocked by the selected, kind colours (starter, rare, dangerous, repeatable, event)
- [ ] **T3105** (P31.5) Mobile layout at 320–375 px

## 32 · Tech tree: exploration
- [ ] **T3201** (P32.1) Detail card on click: base cost, tier, kind, description, prerequisites and other requirements, unlocks (linked to the simulator where T3006 linked them), draw weight as information, DLC, version
- [ ] **T3202** (P32.2) Highlight the whole prerequisite chain and everything that depends on the selected tech
- [ ] **T3203** (P32.3) Accent-insensitive search by name and filters (area, field, tier, kind, DLC)
- [ ] **T3204** (P32.4) Zoom and pan of the tree (mouse, touch, keyboard)
- [ ] **T3205** (P32.5) Deep link to a technology (URL hash), also from the wiki articles

## 33 · Tech tree: versions
- [ ] **T3301** (P33.1) Version selector and per-version data loading (only 4.5.2 exists; tested with a small fixture version under `tests/`)
- [ ] **T3302** (P33.2) Procedure to add a new version without losing the previous ones (GDD §5 and the script's help)
  - Modelo: sonnet
- [ ] **T3303** (P33.3) Comparison view between two versions: added, removed, changed cost / tier / prerequisites (tested with the fixture version)

## 34 · Tech tree: integration
- [ ] **T3401** (P34.1) Interface texts of the tech tree in es/en/jp; game names in English in every language (official names wait for P15)
- [ ] **T3402** (P34.2) Links from the wiki (`content.js` tech mentions, "Enlaces útiles") and from the simulator (building info) to the tech tree
- [ ] **T3403** (P34.3) Accessibility of the tech tree: keyboard navigation between nodes, screen-reader names, contrast
- [ ] **T3404** (P34.4) `README.md` (structure, sources, tests, credits) and GDD updated for the finished tech tree
  - Modelo: sonnet

## 15 · Official localization
- [ ] **T1501** (P15.1) Receive the game localisation files (owner) and decide the extraction format
  - ❓ Bloqueada: Owner must provide the game localisation files.
- [ ] **T1502** (P15.2) Replace es/en/jp game names (civics, buildings, jobs, resources, designations, ethics, authorities, planet types, policies) with official strings keyed by game ids
  - ❓ Bloqueada: Waits for P15.1 (localisation files).
- [ ] **T1503** (P15.3) All official Stellaris languages for the planet simulator and the tech tree only (wiki and bingo stay es/en/jp); key parity per language
  - ❓ Bloqueada: Waits for P15.1 (localisation files).
- [ ] **T1504** (P15.4) Review the civics with English placeholder names and the keys that group several civics under one icon
  - ❓ Bloqueada: Waits for P15.1 (localisation files).

## 14 · Final 4.5.2 data verification (last)
- [ ] **T1401** (P14.1) Owner re-uploads the updated wiki files
  - ❓ Bloqueada: Owner must re-upload the updated wiki files.
- [ ] **T1402** (P14.2) Review every value (jobs, buildings, districts, designations, ethics, authorities, civics, capital, resources, policies, edicts, branch offices) against them
  - ❓ Bloqueada: Waits for P14.1 (updated wiki files).
- [ ] **T1403** (P14.3) Update `verification` statuses (`unverified` → `wiki-verified`)
  - ❓ Bloqueada: Waits for P14.1 (updated wiki files).
- [ ] **T1404** (P14.4) Review GDD §9 (assumptions and stacking rules)
  - ❓ Bloqueada: Waits for P14.1 (updated wiki files).
- [ ] **T1405** (P14.5) Deliver the final data files
  - ❓ Bloqueada: Waits for P14.1 (updated wiki files).
- [ ] **T1406** (P14.6) Review the tech tree data against the updated wiki technology pages and set its `verification` status
  - ❓ Bloqueada: Waits for P14.1 (updated wiki files).
