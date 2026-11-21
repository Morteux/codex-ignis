# Planet Simulator — pending tasks

> Progreso: **9 / 28 tareas (32%)**

Design rules and decisions: `PLANET_SIM_GDD.md`. Finished phases (P0–P8 incl. P7.10, P16.1–P16.12, P9.1–P9.7, P12.1, P13.7, P17, P18 — edicts audit in GDD §5.1, P10.1 — body types audit in GDD §4.1, P10.2, P10.3, P10.4, P10.5, P10.6 except Wilderness, P10.7, P10.8 — GDD §4.2, P10.9, P10.10 — GDD §4.2, P19.1 — branch offices audit in GDD §5.2, P19.2, P19.3, P19.4, P21 — job swaps, audit in GDD §6.1) are in git history.
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
- [ ] **T1308** (P13.8) Move every data text shown in the UI to i18n keys (es/en/jp, English until P15): planet modifier `notModelled` effects and `source`, body type `infoOnly` lines and any other English string kept in the data files; nothing may be shown in a language other than the selected one
- [ ] **T1306** (P13.6) Replace the hand-written es/jp texts (policy group titles/notes/effects, requirement reasons, policy notices, empire-tab policy heading, stacking and trade-conversion texts, P7.8 resource/category names) with the English text
  - Modelo: sonnet
- [ ] **T1309** (P13.9) Translate the hard-coded Spanish landmark `aria-label`s of `index.html`, `bingo.html` and the legal pages (`data-i18n-attr` + es/en/jp keys, the `a11y*` keys of P13.4 can be reused)

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
