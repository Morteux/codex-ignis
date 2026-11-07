# GDD: Stellaris Planet Economy Sandbox (Codex Ignis — `planet-sim.html`)

**Purpose of this document:** working context + phase tracker for the planet simulator. It merges the original GDD with the actual state of the code (project zip of 2026-10-20) and the owner's decisions of 2026-10-21.
**Ruleset:** Stellaris PC 4.5.2 "Cygnus" (`stellaris-pc-4.5.2`). Owner decision: ALL data is tagged as 4.5.2. Existing data was transcribed from the wiki (pages for 4.3/4.4) and is flagged `unverified` until the final verification pass (Phase 14).
**Scope:** only the planet simulator. The wiki, bingo and legal pages of Codex Ignis are out of scope for this GDD.
**Rule #1 (owner):** never invent rules, numbers or names. If wiki data is missing or ambiguous, ask. Document every simplification in code and here.

---

## 1. Product goal

Browser sandbox to theorycraft the economy of **one planet**: pick districts, buildings, empire context, then read monthly production, upkeep and net per resource. Not a galaxy or population simulator.

## 2. Core principles

- **Data-driven & versioned:** all gameplay data in data files, each entry tagged `rulesetId: stellaris-pc-4.5.2` + source + verification status.
- **Full staffing (decision b):** every job created by infrastructure is assumed staffed (100%) by default. The per-job slider stays only as an **optional staffing override**. No pop counts, eligibility, growth or unemployment. UI must show "Jobs Created / Jobs Assumed Staffed". (Owner 2026-10-22: the notice box under the summary heading only explains the click controls, not the full-staffing assumption.) Jobs, staffed counts, amenities and housing are displayed in the wiki ×100 scale.
- **Inspectable:** every number explains its source (base, jobs, modifiers, upkeep, net).
- **Honest:** estimated/approximated/manual values are labelled; unsupported mechanics are marked, not faked.
- **Deterministic**, no backend, local persistence only.
- **Legality enforced:** illegal combinations are not allowed (an explicit sandbox override is a late optional feature).

## 3. Current implementation (state of the code)

**Stack:** vanilla JS ES modules, no build. Shared singleton state `js/planet-state.js` (`celestialTypeId, designationId, ethicIds, authorityId, civicIds, speciesType, planetName, planetSize, populationText`). Each tab module has its own language handling over the shared `.lang-btn` (es/en/jp; every `data-i18n` key must exist in all 3). Images come from `STELLARIS_ASSETS_BASE` via `asset-config.js`.

**Files:** `planet-sim.html`; `js/stacking-rules.js`; `js/planet-sim.js` (economy, slots, districts, catalog, jobs, production), `empire.js` (Imperio tab), `celestial.js` (Cuerpo celeste tab), `planet-summary.js` (fixed summary bar); data: `planet-data.js`, `empire-data.js`, `civic-rules.js`, `designation-data.js`, `celestial-data.js`, `building-requirements.js`.

**Conventions:** building/job effects stored ×100 as on the wiki; `divideEffect()` applied once when computing resources; population sliders work in ×100. CSS: never set `display` on an id/class toggled with `hidden` without `:not([hidden])`.

**Implemented**
- Slots: 6 base (slot 1 = capital) +3 per district specialization, hard cap 21; stable slot keys so buildings in a de-specialized slot become inactive, not deleted.
- Capital building: tiers I–V for 3 families (standard 5 entries, hive 4, machine 5), upgrade/downgrade, tier preserved when authority changes.
- Districts: urban (2 specialization slots, 5 options, min 1 copy), generator / mining / agriculture (1 specialization slot each, 2/3/3 options). Total copies limited by editable planet size (default 20). Ctrl/Cmd+click on +/− = max / remove all.
- Catalog: 94 buildings in 10 categories, colony limits, upgrade chains (`upgradesFrom`), building `sets` vs specialization `permittedSets`, requirement rules, job modifiers / efficiency / upkeep multipliers, category dropdowns, target-slot selection.
- Jobs: 28 job types in 4 strata (ruler/specialist/worker/special), base outputs (wiki 4.3 values), gestalt upkeep by species type (organic/lithoid/infernal/machine), non-resource effects (stability, crime, defense armies, naval capacity) as pills.
- Economy: produced / consumed / net columns; 15 resources (incl. influence, volatile motes, rare crystals, exotic gases); housing and amenities totals with amenity breakdown tooltip; strategic-resource upkeep on upgraded buildings.
- Imperio tab: ethics wheel (17 options, 3 points, gestalt exclusive), 7 authorities with exclusion rules, 226-civic catalog with requirement/exclusion rules (max 3), species type. Applied bonuses: unity %, trade %, influence flat; all other effects are shown as informational (dimmed).
- Cuerpo celeste tab: 21 body types (9 "standard", random default); filters designations. 53 planetary designations (job-efficiency and flat bonuses only).
- Fixed summary bar: body icon, designation icon, editable name, size, working population.
- Tabs: Planeta, Imperio, Cuerpo celeste, Sucursales (placeholder). (Armies tab removed in P3.1.)
- Site nav also has a `TECH_TREE` button/page (`tech-tree.html`, empty placeholder, outside this GDD's scope).

**Not implemented (vs. original GDD):** version registry/selector/provenance, planetary conditions (happiness, stability, crime, housing/amenity demand), stability effects, trade-conversion policy, per-resource breakdown, modifiers panel, external-income separation, scenario save/load, JSON import/export, comparison, monthly timeline, special planets' own districts.

**Known gaps in current data** (see Phase 7; value re-verification in Phase 14): district housing/jobs/upkeep and the −200 housing penalty of urban specializations; extra bonuses of Mega-Forges/Nano-Plants/Fabricators/Repli-Complexes (scope unclear on wiki); building cost strings unused and some wrong; origin-gated buildings and Solar Farming Bays habitat-only rule; capital secondary jobs/defense armies; designations are not filtered by ethic/authority/civic requirements (P7.9).

## 4. New features (owner requests)

### 4.1 Empire profiles
- In the **Imperio tab**, the current configuration (ethics, authority, civics, species type) can be **saved under a user-given empire name**.
- At the **right end of `.planet-summary-fixed`** a dropdown lists all saved empires; picking one applies it instantly.
- Editing the Imperio tab with a profile selected does **not** auto-save: changes need an explicit **Save** (a "modified" indicator is shown).
- On switching empire, built buildings that no longer meet their requirements are **deactivated, not deleted** (owner decision 2026-10-23, replacing the earlier "delete" rule): same yellow frame as in P3.4, they reactivate when an empire that meets them is selected again, and demolishing is always a manual action. Every dependent value is recomputed (capital family, requirements, bonuses, civic limits). Show how many buildings ended up inactive.
- A saved planet stores **which empire is selected**.
- Persisted in localStorage; rename / overwrite / delete supported.

### 4.2 Planets and Library
- Terminology: a saved planet configuration is simply a **planet** (no "template" wording anywhere in code, UI or docs). **Renaming a planet and editing the planet name in the summary bar are the same operation**: both apply the same checks (non-empty, unique among saved planets) on save, rename, duplicate and import.
- A planet stores the selected `empireId` **and a raw snapshot of that empire's data**. If the empire is later deleted, the planet keeps the snapshot and is flagged **"no empire"** (it still works from the snapshot).
- New button at the **far left of the main tab list** ("Library") opens a view with **all saved planets and empires as compact cards**.
- Planet card, minimum content: **celestial body image + planet name, selected empire, planet size, planetary designation** (icons wherever possible). More fields will be added iteratively.
- Empire card: **name + icons only** — ethic icons, authority icon, civic icons, shown as images, not text.
- Card actions (minimum): open/load, **duplicate, export (JSON), rename**, delete. Extra ideas are in §10.

### 4.3 Housekeeping
- ~~Remove the **Armies** tab button (HTML + i18n keys `planetSimMainTabArmies`, `planetSimArmiesDisabledTooltip`).~~ Done (P3.1).
- GitHub Actions is not used: owner deletes `.github/`; README must be updated.

## 5. Planetary conditions (from original GDD, still planned)

Inputs without pop simulation: average happiness (0–100, non-gestalt), stability (0–100, manual or **Estimated** with override), amenities and housing demand overrides, crime/deviancy direct input. Rules: happiness is not a direct productivity modifier; crime/deviancy gets no invented penalty; stability effects on job output and trade only where verified for 4.5.2; gestalt uses deviancy rules. Every field labelled Manual / Estimated / Derived.

## 6. Data & save format

- Version registry initially with only `stellaris-pc-4.5.2` ("Stellaris PC 4.5.2 — Cygnus (Current Dataset)"); visible Data Version selector backed by it.
- Every data entry: `rulesetId`, stable id, type, values, source (wiki URL / game file), `verification` (`unverified` | `wiki-verified` | `game-data-verified` | `approximated` | `unsupported`).
- Planet (JSON): `schemaVersion`, `rulesetId`, `name` (unique among saved planets), `celestialTypeId`, `designationId`, `planetSize`, `capitalTier`, districts (counts + specialization choices), built slots (slot key → building id), staffing overrides, `empireId`, `empireSnapshot` (raw empire data, kept even if the empire is deleted), `noEmpire` flag.
- Empire profile (JSON): `schemaVersion`, `rulesetId`, `id`, `name`, `ethicIds`, `authorityId`, `civicIds`, `speciesType`.
- Export/import as JSON; unsupported `rulesetId` → warning, never silently reinterpreted.

## 7. Out of scope
Individual pops, species design, strata assignment, unemployment, growth/assembly/migration, factions/ethic distribution, galaxy, fleets, war, diplomacy, empire-wide AI.

## 8. Phases and progress

Legend: `[x]` done, `[ ]` pending. Phase order is a proposal and can be reordered.

| Phase | Name | Status |
|---|---|---|
| P0 | Foundation | done |
| P1 | Core planet economy | done |
| P2 | Empire context | done |
| P3 | Housekeeping | done |
| P4 | Versioning & provenance | done |
| P5 | Empire profiles | done |
| P6 | Planets & Library | done |
| P7 | Data completeness | done |
| P8 | Transparency (breakdowns, modifiers) | in progress (4/7) |
| P9 | Planetary conditions | pending |
| P10 | Special planets | pending |
| P11 | Comparison & timeline | pending |
| P12 | UI decoration (icons) | in progress |
| P13 | Polish & QA | pending |
| P14 | Final 4.5.2 data verification (last task) | pending |
| P15 | Official localization (all Stellaris languages) | pending |
| P16 | Empire policies and trade conversion (**do next, before P8.5**) | in progress (4/10) |

**Overall: 70/111 tasks (63%)** (tasks are not equal in size; use as a rough indicator.)

### P0 — Foundation (6/6)
- [x] P0.1 Static ES-module app, no build
- [x] P0.2 Terminal-style layout and CSS
- [x] P0.3 i18n es/en/jp with key-parity rule
- [x] P0.4 Asset pipeline via `asset-config.js`
- [x] P0.5 Shared state module `planet-state.js`
- [x] P0.6 Main tab navigation

### P1 — Core planet economy (11/11)
- [x] P1.1 Building slots (6 base, +3 per specialization, cap 21)
- [x] P1.2 Capital building tiers I–V per authority family
- [x] P1.3 Urban district with 2 specialization slots, min 1 copy
- [x] P1.4 Generator / mining / agriculture districts with specializations
- [x] P1.5 Planet size limits total districts
- [x] P1.6 Building catalog, categories, limits, upgrade chains, sets
- [x] P1.7 Target-slot selection, build/demolish
- [x] P1.8 Job catalog, strata, base outputs, gestalt upkeep
- [x] P1.9 Building job modifiers / efficiency / upkeep multipliers
- [x] P1.10 Per-job population sliders (default = full capacity)
- [x] P1.11 Produced/consumed/net panels, housing & amenities, non-resource effects

### P2 — Empire context (9/9)
- [x] P2.1 Ethics wheel (3-point system, gestalt)
- [x] P2.2 Authorities with exclusion rules
- [x] P2.3 Civics catalog with requirement rules, max 3
- [x] P2.4 Species type selector
- [x] P2.5 Building requirements engine
- [x] P2.6 Applied empire bonuses (unity %, trade %, influence flat)
- [x] P2.7 Celestial body type selector (21) filtering designations
- [x] P2.8 Planetary designations (53)
- [x] P2.9 Fixed planet summary bar

### P3 — Housekeeping (4/4)
- [x] P3.1 Remove Armies tab button and its i18n keys
- [x] P3.2 README updated (no GitHub Actions). Owner deletes `.github/` himself.
- [x] P3.3 Staffing UI per decision b: "Jobs Created / Jobs Assumed Staffed", full-staffing notice, slider as optional override (default 100%), drop "population" wording. Implemented: each job row shows "created N" and the staffed count; the slider/±buttons are an optional override and there is no reset button (owner decision 2026-10-22): jobs and the staffed count are shown in the wiki ×100 scale, click = ±10, Ctrl/Cmd+click = ±100, Shift+click = raise to 100% (+) / drop to 0% (−); amenities and housing are also displayed ×100 (computed internally in normal units); the summary panel shows the counter "Jobs created / Jobs assumed staffed" and a short notice (`.planet-staffing-notice`) that only explains the click controls; the fixed bar tooltip reads "Jobs assumed staffed". Also fixed a duplicated element id (`planet-summary-population` was used by both the fixed bar and the jobs panel; the panel counter is now `planet-jobs-counter`).
- [x] P3.4 Buildings that become invalid (specialization change, lost requirements) are **deactivated, not deleted**, and always drawn with the **yellow frame** (`img/ui/blocker_frame_yellow.png`, confirmed by owner 2026-10-21). The red frame is not used Implemented: an inactive building (slot locked, requirements lost, or the slot's specialization no longer permits its building set) is never deleted; it does not count towards jobs/resources, shows the yellow frame and a tooltip with the reason, and can be demolished manually.

### P4 — Versioning & provenance (5/5)
- [x] P4.1 Version registry with the single entry `stellaris-pc-4.5.2` (`js/data-version.js`, `DATA_VERSIONS`)
- [x] P4.2 `rulesetId` + source + verification on every data entry. Implemented per **collection** (`DATA_COLLECTIONS`: buildings, capital buildings, districts, jobs, resources, designations, ethics, authorities, civic rules, celestial types) and resolved per entry with `getProvenance(collection, id)`; per-entry exceptions go in `PROVENANCE_OVERRIDES`. Decision: data files are not stamped entry by entry, to avoid hundreds of duplicated literals.
- [x] P4.3 Data Version selector at the right end of the fixed summary bar (one option; tooltip shows the verification state)
- [x] P4.4 All existing data initially marked `unverified` (wiki-derived)
- [x] P4.5 Version stored in saved data; warning on unsupported version at import. Base in place: `stampRuleset()` adds `schemaVersion` + `rulesetId`, `checkRuleset()` returns `ok` / `missing` / `unsupported`; shared state carries `rulesetId`. Actual save/import arrives in P6.

### P5 — Empire profiles (7/7)
- [x] P5.1 Save current Imperio tab as a named empire ("Perfil de imperio" panel at the top of the Imperio tab; `js/empire-profiles.js`)
- [x] P5.2 Empire dropdown at the right of `.planet-summary-fixed` (first option = no saved empire / unsaved draft; "●" marks unsaved changes)
- [x] P5.3 Switching applies config and recomputes all dependants (`requestSwitchEmpire` → `applyConfig`; anything no longer valid, e.g. an incompatible civic, is dropped, never invented)
- [x] P5.4 Switching empire deactivates (never deletes) the buildings that fail the new empire's requirements and reports how many are inactive (notice under the summary bar). Originally specified as "delete"; changed on 2026-10-23 so that switching back and forth no longer destroys buildings, consistent with P3.4.
- [x] P5.5 localStorage persistence (key `codex-ignis-empires`); rename / overwrite / delete
- [x] P5.6 Planet state tracks the selected `empireId` (and `empireModified`) in `planet-state.js`
- [x] P5.7 Explicit Save when editing a selected profile, with a "modified" indicator (no auto-save); switching empire with unsaved changes opens a confirmation dialog (Save / Don't save / Cancel) (`js/confirm-dialog.js`). `resolveUnsavedEmpireChanges()` is exported so loading a planet (P6) can reuse it.

### P6 — Planets & Library (10/10)
- [x] P6.1 Planet schema (§6), incl. empire snapshot Implemented: Implemented in `js/planet-library.js` (`sanitizePlanetData`; format documented in the file header): `celestialTypeId, designationId, planetSize, capitalTier, districts, built (slot key → building id), staffingOverrides (only reduced jobs, ×100 scale), empireId, empireSnapshot ({name, ethicIds, authorityId, civicIds, speciesType}), noEmpire`, stamped with `schemaVersion` + `rulesetId`. The planet name lives in the summary bar (`planetName`); the shared state now also tracks `planetId` (null = unsaved draft).
- [x] P6.2 Save / load / delete planets (localStorage); name unique, same checks for rename and summary-bar edits Implemented: `createPlanet / updatePlanet / deletePlanet`, localStorage key `codex-ignis-planets`; planets of an unsupported/missing ruleset are kept untouched but not listed. **Save** button in the summary bar and in the Library; with a saved planet loaded it overwrites it (name re-checked), "Save as new" always creates one. Editing the summary-bar name never auto-saves; a name that clashes with another saved planet turns the field red and the exact error shows on save.
- [x] P6.3 Library button at far left of the tab list Implemented: **Library** tab, first (far left) in the main tab list (`js/planet-library-ui.js`, panel `#planet-tab-panel-library`).
- [x] P6.4 Planet cards (body image + name, empire, size, designation) Implemented: Compact cards: body icon + name, designation icon, empire (authority icon + name), size; the planet being edited is highlighted.
- [x] P6.5 Empire cards (name + ethic / authority / civic icons, no text labels) Implemented: Cards show name + ethic / authority / civic icons only (names in tooltips).
- [x] P6.6 Planet card actions: open, duplicate, export, rename, delete Implemented: Open (applies empire → body type → planet; reports how many buildings ended up inactive, none are deleted), duplicate ("name (copy)", made unique), export JSON, rename (dialog `promptText` in `confirm-dialog.js`, same checks as save), delete (confirmation).
- [x] P6.7 Empire card actions: duplicate, export, rename, delete Implemented: Duplicate, export, rename, delete (`empire-profiles.js`: `duplicateEmpire`, `exportEmpire`, `makeUniqueName`). "Apply this empire" is still in the backlog.
- [x] P6.8 JSON export/import of planets and empires with version check Implemented: Import button: accepts `{type: "planet" | "empire"}` files. Missing `rulesetId`, unsupported ruleset or a newer `schemaVersion` → rejected with a message, never reinterpreted; contents are sanitized field by field; new id always assigned. Export file names: `planeta-<slug>.json` / `imperio-<slug>.json`.
- [x] P6.9 Deleted empire: planet keeps its raw empire snapshot and is flagged "no empire" Implemented: `noEmpire` is recomputed whenever the empire list changes (`empireId` set but not found). Loading such a planet applies the stored snapshot as an unsaved empire draft; the card shows a "no empire" badge. If the empire still exists, its CURRENT version is used on load (not the snapshot). Saving with unsaved empire edits asks first (Save / Don't save / Cancel); if discarded, the planet stores the edited config as snapshot with no `empireId`.
- [x] P6.10 Unique-name validation (save, rename, duplicate, import conflicts) Implemented: Single check `checkPlanetName` (trim, 1–60 chars, unique case-insensitive) used by save, rename (card and summary bar), duplicate (auto name) and import (conflict dialog offering a free name like "X 2"). Empires use the same rule through `empire-profiles.js`.

### P7 — Data completeness (9/9)
Built from the wiki pages already supplied; value re-verification happens in P14. Nothing is invented.
- [x] P7.1 Districts: housing/jobs/upkeep and the −200 housing urban-specialization penalty Implemented: `DISTRICTS.*.housing/upkeep` (×100 housing, wiki 4.5 "Districts"). Primary (urban) district +1000 housing (hive +1200, +600 more on a Hive World; machine +1000), −2 energy upkeep; each chosen urban specialization −200 housing per copy; Agrarian Idyll −200. Resource districts +200 housing (+100 gestalt, +300 Agrarian Idyll), −1 energy upkeep. NOT applied (need a decision): the technology/tradition-conditional housing bonuses (Weather Control Systems, Anti-Gravity Engineering, Public Works Division, Optimized Nexus, Extended Hives). Resource-district specializations have no housing penalty on the 4.5 page (the −200 variants belong to Wilderness).
- [x] P7.2 Extra bonuses of Mega-Forges / Nano-Plants / Fabricators / Repli-Complexes (scope to clarify) Resolved with the 4.5 Industry buildings page: the Foundry and Factory tiers have NO extra effects there, only jobs (+200/+400/+600), energy upkeep, strategic-resource upkeep (volatile motes for Foundry tiers, rare crystals for Factory tiers) and cost, all of which are already in `planet-data.js` (upkeep and cost fixed in P7.3). The old `jobBonus` note referred to an earlier wiki version, so nothing is added to those buildings. The 4.5 page does list separate "Industrial job output buildings" (Exotic Gas Refineries, Chemical Plants, Synthetic Crystal Plants, Resource Processing Center, Ancient Refinery) and a Toxoids-DLC block (Relentless Industrialists); they are not in the catalog yet and are part of P7.8.
- [x] P7.3 Building costs: show verified costs or drop the strings Implemented: `cost: { time, items: [{ resource, amount, when? }] }` read from the 4.5 Industry/Resource/Research/Unity/Buildings pages for the 36 buildings whose rows parse unambiguously (shown in the catalog tooltip); the other 18 (resource-output upgrades, Unity/synaptic/uplink chains, Temple chain) had their old cost string dropped. Cross-checking against the 4.5 pages also corrected the upkeep of Mega-Forges/Nano-Plants (volatile motes), Fabricators/Repli-Complexes (rare crystals), Research/Advanced Complexes (exotic gases), Hall of Judgment/Center of Guidance (volatile motes), Stronghold (−1 energy), Fortress (−1 energy, −1 volatile motes) and Paradise Domes (rare crystals).
- [x] P7.4 Missing building rules (Solar Farming Bays habitat-only, origin-gated buildings…) Implemented for district specializations only (`requires` on the options, same rule types as buildings): Solar Farming Bays (Habitat only), Agrarian Villages (Agrarian Idyll, no Anglers), Coastal Hamlets (Agrarian Idyll + Anglers). Unavailable options show disabled with the reason; a chosen specialization that stops being valid is removed with a notice (its buildings turn inactive). Origin-gated items (Subterranean Urbanization) and feature-gated ones (Gravitonic Mines) stay unmodelled; building origin gates remain a gap (origins are in the backlog).
- [x] P7.5 Capital secondary jobs and defense armies Implemented: `defenseArmies` on all capitals (standard 4/8/16/16, hive 4/8/16, machine 4/8/16/16; shown in the non-resource effects panel) and the Colonist job of the Colony Shelter (+5 amenities, +1 of the species resource; its stability/happiness/build-speed effects and the tradition/civic-conditional secondary jobs are not modelled).
- [x] P7.6 Civics catalog aligned with the 4.5.2 wiki Implemented: the 66 "missing" civics turned out to be renamed ones or ones sharing an icon with an existing entry (the wiki lists 238 civics over 226 icons), so no new icons were needed. The 226 icons of `civics/` (StellarisAssets, extracted from the game files and renamed to their final names) are the catalog; keys were renamed `principleXxx` → `civicXxx`; the English name of every key is the wiki name (keys that cover several civics sharing one icon join the names with " / ", e.g. `civicGalacticSovereign`). The key still derives from the icon file name, not from the wiki name. Reference list: `principios_del_juego.md`. Es/jp names of renamed civics still show the English name until P15. The prefix-based authority inference was replaced by the explicit table `CIVIC_AUTHORITIES` in `civic-rules.js`.
- [x] P7.7 Apply more empire effects (worker/specialist efficiency via strata, etc.) Implemented: `{ type: "stratumEfficiency", stratum }` in `empire-data.js` (`collectAppliedEffects` now also returns `stratumEfficiency`). Authoritarian/Fanatic Authoritarian add +5%/+10% worker job efficiency and Egalitarian/Fanatic Egalitarian +5%/+10% specialist job efficiency (values confirmed on the 4.5 Ethics page) to the positive output of every job of that stratum, added to the designation/building efficiency (upkeep is not affected). Still informational: research speed, stability, edict costs, faction output, ship/claim effects and everything else the simulator has no stat for.
- [x] P7.8 Expand the building catalog from supplied wiki pages. Implemented (40 new buildings, all from the 4.5 Industry / Research / Resource / Unity pages; tech, DLC and "anomaly/astral action" requirements are ignored as always, the simulator assumes everything researched). Industrial output (new category): Exotic Gas Refineries, Chemical Plants, Synthetic Crystal Plants (+0.1 of the strategic resource and −0.5 minerals per Metallurgist/Artisan, +0.5 food upkeep with a Catalytic civic), Ministry of Production / Resource Processing Center (+0.2 alloys per Metallurgist, +0.2 consumer goods per Artisan; tier III capital) and Ancient Refinery (same, ×3 strategic resources, −1 mineral, −30 minerals upkeep, +10 % of those resources from jobs). Research: 9 specialized buildings (Physics: Field Dynamics Center → Quantum Relations Annex → Fundamental Research Nexus; Society: Xenobiological Lab → Neurogenetics Institute → Life Systems Complex; Engineering: Materials Workshop → Applied Mechanics Institute → Advanced Engineering Complex; +200 jobs, +0.25/0.5/0.5 research per job, strategic upkeep from tier II, +10 % efficiency at tier III), Research Supply Depot (−10 % researcher upkeep), Data-Driven Theorem Facility (+10 % efficiency), Research Institute / Planetary Supercomputer (+0.5 research per researcher; upkeep per researcher −1 consumer goods individualist, −2 minerals hive, −2 energy machine), Vultaum Reality Computer and the Astral Siphon → Funnel → Nexus chain (physics + astral threads per Physicist, upkeep by authority). Resource: Bio-Reactor / Advanced Bio-Reactor, Baol Organic Plant, Waste Reprocessing Center (gestalt, flat +10 energy +10 minerals). Unity: Auto-Curating Vault (individualist) and the 12 monuments (Autochthon/Heritage/Hypercomms, Corporate Culture/Business Management/Synergy, Sensorium, Simulation: +5/10/15 % unity from jobs). New engine fields in `planet-data.js`: `conditionalJobModifiers` (job bonus only if the `when` rules hold, same rule types as `requires`), `jobResourceMult` (extra % on what jobs produce, tracked per resource in `computeTotals`) and `produces` (flat monthly resource of the building); new resources Minor artifacts and Astral threads. Also fixed: Research Labs/Complexes/Advanced Complexes are now blocked on Penal Colonies too (4.5 page). Assumptions to review in P14: (1) upkeep/cost/time of Chemical Plants and Synthetic Crystal Plants are copied from the Exotic Gas Refineries row (merged cells on the page); (2) "Research" without a type (Auto-Curating Vault, +0.1) is applied as +0.1 of each of the three research types, same convention as Experiment Engineers; (3) Waste Reprocessing Center uses set `origin` (base slots), the wiki also allows Generator districts; Baol Organic Plant uses `food`/`factory` (so it is not allowed in base slots); (4) strategic upkeep of Bio-Reactors and monuments exactly as on the page, monuments have no upkeep outside Memorialist; (5) the settled variant of upkeep/cost is used, nomadic extras ignored; (6) names of the new buildings show the English name in es/jp until P15; the two new resource names and the category name were translated by hand. NOT added (data missing, ambiguous or mechanic not modelled): Automation buildings and the resource-district cap buildings (no automated workforce / district caps), Resource Silos and Subterranean Cache (storage), Betharian Power Plant (needs deposit), Science Director / Archaeo-Engineer / Nanotech Researcher / Bio-Trophy / Manager / High Priest jobs and the buildings that depend on them (Faculty of Archaeostudies, Nanotech labs, Holo-museums, Pinniped Sanctuary, Vault of Acquisitions, Citadel of Faith, Organic Sanctuaries, Creativity Exhibition Vault, Alpha Hub and hive Auto-Curating variant whose cost/upkeep cells are not readable), Memorialist and Entropy-Drinker monument lines, Relentless Industrialist (Toxoids) block, "unity per ascension perk" and civilian-based monument bonuses, and the job swaps of Ministry/Institute/Vultaum (Politician ↔ Science Director).
- [x] P7.9 Designation requirements: today the designation list is filtered only by celestial body type (`allowedDesignationCategories`), so designations that need a specific ethic, authority, civic or species type (e.g. hive/machine-only, spiritualist-only) can be picked with an incompatible empire. Read the requirements from the Designation wiki page, store them as `requires` rules on each designation (reusing the `building-requirements.js` rule types where possible), hide or disable unavailable designations in the dropdown with the reason, and when an empire/ethic/authority change invalidates the selected designation, reset it to "no designation" and report it (buildings stay, as in P5.4; only the designation is reset) Implemented: `requires` on designations (`js/designation-data.js`, rules from the 4.5 Designation page; new rule types `celestial` and `notSpecies`). The dropdown shows unavailable designations disabled with the reason; if an ethic/authority/civic/species/body change invalidates the chosen one it resets to "no designation" with a notice (buildings are kept). Origin-, planet-modifier- and tradition-gated designations remain ungated (documented in the file).

### P8 — Transparency (4/7)
- [x] P8.1 Per-resource breakdown (base, jobs, modifiers, gross, job upkeep, infra upkeep, net) Implemented in the **Net** column of the production panel: every resource row can be clicked (or Enter/Space) to unfold its sources, with the state kept while sliders move or the language changes. `computeTotals()` now returns `breakdown[resource][source]`. Sources, in display order: Jobs base output/upkeep (JOB_OUTPUTS, gestalt upkeep and Colonist already included), Jobs building bonuses (`jobModifiers`/`conditionalJobModifiers`), Jobs efficiency / upkeep change (designation, building and stratum efficiency; building upkeep multipliers), Buildings' % of job output (`jobResourceMult`), Buildings' flat output (`produces`), Planetary designation, Empire ethics/authority multiplier and flat bonuses, Capital building, Districts (upkeep), Buildings (upkeep). Each unfold ends with Gross (sum of positive lines), Costs (sum of negative lines) and Net. Lines are labelled "output" or "upkeep" by their sign. The amenities line only shows what jobs produce (capital/building amenities are still in the header tooltip) and housing is not a resource, so neither has capital/building lines yet. The gross − costs = net check is P8.7.
- [x] P8.2 Modifiers panel (source, stacking, affected category) Implemented: new panel "Active modifiers" (`#planet-modifiers`, between production and jobs summary) fed by `computeTotals().modifiers`. Each row shows source name + source type (Building / Designation / Ethic / Authority), the affected target (job, stratum, resource or stat) and the value; rows are grouped by category with a one-line text explaining how that category stacks today: per-job resource bonus (added per job before efficiency), job efficiency (designation + buildings added together, positive output only), stratum efficiency (ethics/authority, same pool), upkeep change (upkeep only), % of job-produced resource (building `jobResourceMult`), % of a resource's total production (ethics/authority multipliers), monthly flat resource and flat bonuses (designation). Identical modifiers from the same source merge and show ×N. Only modifiers actually applied by the simulator are listed (inactive buildings and unmet conditional bonuses are not); informational ethic/authority effects stay in the Empire tab. The stacking texts are fixed strings for now: P8.3 will move the rules to per-ruleset data.
- [x] P8.3 Stacking rules stored per ruleset Implemented in the new `js/stacking-rules.js`: `STACKING_RULES[rulesetId][category]` gives, per modifier category (per-job flat bonus, job efficiency, stratum efficiency, upkeep change, % of job output, % of total production, monthly flat), how its values combine (`combine`: `add` or `multiply`), the lower limit of the resulting factor (`floor`, 0 for efficiency/upkeep so output never goes negative), the shared pool (designation + building + stratum efficiency are one pool) and the i18n text; `CALCULATION_ORDER[rulesetId]` lists the 7 calculation steps. `computeTotals()` now reads these rules (`stackFactor`/`combineFraction`) instead of hard-coded sums, taking the values from the active-modifier list of P8.2; the modifiers panel shows the calculation order, the rule text with "(add together/multiply together)" and a note that the rules are unverified. A new ruleset only needs a new entry in those two tables. Results are unchanged (everything is additive, floor 0): checked against the previous economy numbers. Provenance: new collection `stackingRules` in `data-version.js`, `unverified`: the 4.5 wiki does not give a stacking formula (it only says job sub-categories inherit multiplicative modifiers of their parent category and a few inherit additive ones), so these are the simulator's own rules, to be checked in P14 against the game files. Not modelled: that parent/sub-category inheritance (e.g. Mega-Forges also affecting Odd Factory Workers).
- [x] P8.4 Planet-produced vs external income separated Implemented: the flat monthly bonuses of ethics and authority (today only +influence: Authoritarian +0.5/+1, Gestalt +1) are empire-level income, so they no longer enter the planet's produced / consumed / net columns or its breakdown. `computeTotals()` returns `externalTotals` (combined with the `resourceFlat` stacking rule) and a new block "External income" under the three production columns (`#planet-production-external`, hidden when empty) lists each resource, the sources that give it, and a "Total with external income" line (planet net + external). The modifiers panel renames that category "Flat monthly external income (empire)" with its own stacking text. The `empireFlat` source was removed from the breakdown. Designation flat bonuses and the ethic/authority % multipliers stay planet-level (they act on what the planet produces). Nothing else counts as external yet: trade conversion is P8.5.
- [ ] P8.5 Trade Value distinct, with explicit conversion policy (owner decision 2026-10-31: the conversion policy is chosen in the Empire tab and saved in empire profiles, default Wealth Creation / Logistics Policy for gestalt; implemented by P16, mark this task done when P16.6 is done)
- [ ] P8.6 Manual / Estimated / Derived labels
- [ ] P8.7 Check: gross − all costs = net for every resource

### P9 — Planetary conditions (0/5)
- [ ] P9.1 Conditions panel (happiness, stability, crime/deviancy, amenities/housing demand overrides)
- [ ] P9.2 Manual vs Estimated stability, override
- [ ] P9.3 Verified stability effects on job output and trade
- [ ] P9.4 Gestalt deviancy rules
- [ ] P9.5 Crime/deviancy display-only unless verified effects exist

### P10 — Special planets (0/8)
Today these body types are only *selectable* and filter designations; they have **no special districts, slot rules or size rules**. Each needs wiki data first.
- [ ] P10.1 Collect wiki data per body type (slots, districts, size, housing, jobs)
- [ ] P10.2 Ecumenopolis and its special districts (arcologies…)
- [ ] P10.3 Ring worlds and shattered ring worlds (segment districts)
- [ ] P10.4 Habitats (habitat districts and station designations)
- [ ] P10.5 Hive worlds, machine worlds, nanite worlds, synaptic lathe
- [ ] P10.6 Gaia / relic / tomb / volcanic specifics; wilderness-origin districts
- [ ] P10.7 Size and district-limit rules for artificial bodies
- [ ] P10.8 Planetary features, blockers, deposits and planet modifiers (Cuerpo celeste tab; icons exist in assets)

### P11 — Comparison & timeline (0/4)
- [ ] P11.1 Scenario A/B comparison with marginal-change highlighting
- [ ] P11.2 Monthly stockpile timeline (1 / 12 / 60 / 120 months)
- [ ] P11.3 Deficit and stockpile-exhaustion flags
- [ ] P11.4 Optional sandbox override for illegal combinations

### P12 — UI decoration (icons) (1/2)
Purely decorative; placed before Polish & QA so any layout side effects can still be adjusted. Icons live in `img/ui/` (owner-supplied).
- [x] P12.1 First pass: `Planet_Size` (summary bar, header stat, library cards), `Pop_job` (staffed jobs in the summary bar), `Housing` (header stat), `Tooltip_building` (slots heading, Buildings tab), `Tooltip_district` (Districts tab, header stat), `Tooltip_zone` (specialization status lines), `Job_clerk` (jobs summary heading), `Focus_development` (production heading), `Planet` / `Icon_council` / `Focus_core` / `Faction_support` / `Menu_icon_planets_and_sectors` (main tabs), `Menu_icon_leaders` / `Menu_icon_traditions` / `Colony_type_automated` (Imperio tab headings). `Faction_support` and `Colony_type_automated` were placed loosely (Sucursales tab, species-type heading); `Menu_icon_technology` is still unused. Markup: `.ui-icon` in `planet-sim.html` (the label text is wrapped in a `<span data-i18n>` so translations don't wipe the icon).
- [ ] P12.2 Owner review of the web and final placement/adjustment of the icons (open: which icon goes where is the owner's call)

### P13 — Polish & QA (0/5)
- [ ] P13.1 Mobile layout review of all tabs
- [ ] P13.2 i18n parity check for all new strings (es/en/jp)
- [ ] P13.3 Automated UI smoke tests (tabs hidden/visible, save/load, empire switch)
- [ ] P13.4 Accessibility pass
- [ ] P13.5 Decide fate of the Sucursales (branch offices) tab

### P14 — Final 4.5.2 data verification (0/4) — last task of the roadmap
- [ ] P14.1 Owner re-uploads the updated wiki files once implementation is finished
- [ ] P14.2 Review every value (jobs, buildings, districts, designations, ethics, authorities, civics, capital, resources) against them
- [ ] P14.3 Update data and `verification` statuses (`unverified` → `wiki-verified`)
- [ ] P14.4 Deliver the final updated data files

### P15 — Official localization (0/4)
Owner will supply the game's own localisation files. Until then es/jp text that is not translated shows the English name (no translations are invented).
- [ ] P15.1 Receive the game localisation files (all official Stellaris languages) and decide the extraction format
- [ ] P15.2 Replace the hand-written es/en/jp names (civics, buildings, jobs, resources, designations, ethics, authorities, planet types) with the official strings, keyed by the game's own ids
- [ ] P15.3 Extend the language selector from es/en/jp to every official Stellaris language (simulator, bingo and wiki UI); keep the key-parity rule per language
- [ ] P15.4 Review the 95 civics whose es/jp names are currently the English placeholder and the keys that group several civics under one icon

### P16 — Empire policies and trade conversion (4/10)
**Owner request (2026-10-31, new wiki with the Policies pages uploaded):** find which policies affect the economy of the planet, list them as options the user can choose in the Empire tab, and save them in the empire profiles. The trade conversion policy must be selectable; **Wealth Creation is the default for normal empires and Logistics Policy (the gestalt name of Trade Policy) the default for Gestalt Consciousness**. Source pages: Economic / Societal / Military / Research / Diplomatic policies and the Policies overview (4.5.2, `Codex_Ignis_Wiki_1.zip`). Rule #1 applies: only what the pages say, no invented rates; everything is `unverified` until P14.

**Audit result (what the pages say; basis for the tasks below):**
- *Affects the planet economy and is modelable* → included:
  - **Economic Policy** (not gestalt): Civilian Economy (+25 % consumer goods from jobs, −25 % alloys from jobs), Mixed Economy (no effect), Militarized Economy (−25 % consumer goods, +25 % alloys from jobs).
  - **Trade Policy** (renamed **Logistics Policy** for gestalt): converts the Trade generated by jobs (and pops, and commercial pacts / branch offices) into resources at an exchange rate: Wealth Creation 50 % trade + 50 % energy (not gestalt); Logistics Policy 100 % trade (gestalt); Consumer Benefits 50 % trade + 25 % consumer goods; Marketplace of Ideas 50 % trade + 12.5 % unity; Mutual Aid 25 % trade + 20 % energy + 20 % minerals + 20 % food + 7.5 % unity (needs Worker Cooperative); Trade League 50 % trade + 15 % energy + 15 % consumer goods + 7.5 % unity; Holy Covenant 50 % trade + 18.75 % unity. Monthly Trades do not count.
  - **Production Policy** (gestalt only): Balanced (no effect), Extraction Focus (+20 % menial drone output, −20 % complex drone output), Manufacturing Focus (the opposite).
  - **Diplomatic Stance**: Isolationist +10 % monthly unity (not Corporate); Mercantile +10 % monthly trade (Corporate, Merchant Guilds or Corporate Dominion, not gestalt, not Inward Perfection). The other stances (Cooperative, Expansionist, Belligerent, Supremacist) have no economic effect.
- *Does not affect the planet economy, or its unlock conditions are not modelled* → deferred (see §10.0.1): Military policies (fleet/starbase only), Research policies (research speed; only Refactored Restrictions, +10 % researcher upkeep, needs a Galactic Community resolution), Societal policies (Slavery, Purge, Cyberization Standards, Synthetic Identities, Virtual Focus, Computation Core Focus, Psionic Choir, Robotic Workers, Genome Tailoring…: pop traits, slaves, robot assembly or DLC authorities the simulator does not have), Industrialism (Toxoids), the rest of the Diplomatic policies.
- The assets repository has **no policy icons**: the UI starts text-only with the existing card style, icons are a later request to the owner.

**Open questions for the owner (needed before P16.2 is closed; the tasks assume the proposal in brackets):**
1. Federation-gated trade options (Trade League, Holy Covenant L3; Consumer Benefits and Marketplace of Ideas are *blocked* by Trade League): the simulator has no federations. [Proposal: Trade League and Holy Covenant are listed disabled with the reason "requires a federation (not modelled)"; Consumer Benefits / Marketplace of Ideas stay available.]
2. Consumer Benefits and Marketplace of Ideas need the *Adaptive Economic Policies* tradition. [Proposal: traditions are not modelled, so they follow the same "everything unlocked" rule as technologies and are available.]
3. Defaults not given by the owner: Economic Policy = Mixed Economy, Production Policy = Balanced Production (both the "no effect" options). Diplomatic Stance: the pages give no default. [Proposal: Expansionist, the stance with no economic effect.]
4. Order of the trade conversion: the pages say the exchange rate applies to "Trade generated from jobs and pops". [Proposal: it applies to the trade the planet's jobs produce after job efficiency and before the empire percentage multipliers; the converted resources then receive those multipliers like any other production; pop trade, commercial pacts and branch offices are not modelled and are documented as missing.]

**Tasks:**
- [x] P16.1 Close the open questions above with the owner and record the answers here (blocks P16.2 only for the options affected). Closed **provisionally**: the owner asked to continue without answering, so the four proposals above are adopted as written (federation-gated options disabled with a reason; tradition-gated options available; defaults Mixed Economy / Balanced Production / Expansionist; trade conversion applied to job trade after efficiency and before the empire % multipliers). They are written as comments in `js/policy-data.js` and can be changed there without touching the engine; confirm or correct them with the owner at the P16.4 review.
- [x] P16.2 **Implemented** (see the note after the task text). New `js/policy-data.js`: catalog `POLICIES` = { economic, trade, production, stance } with, per option: stable id, `i18nKey`, `requires` (same rule types as buildings plus `federation` as "not modelled → disabled with reason"), `effects` (jobResourceMult, stratum output %, resource % multiplier, or `tradeConversion: { trade, energy, ... }` exchange rates), and the id of its default per empire type (`policyDefaults(ethicIds)`: trade = `wealthCreation` for individualist, `logisticsPolicy` for gestalt; economic = `mixedEconomy`, production = `balancedProduction`; stance per question 3). Register the collection `policies` (`unverified`) in `data-version.js` with the Policies pages as sources.
  *P16.2 notes:* 4 groups, 19 options. Economic (3), Trade (7: Wealth Creation, Logistics Policy, Consumer Benefits, Marketplace of Ideas, Mutual Aid, Trade League, Holy Covenant), Production (3), Stance (6: Cooperative, Expansionist, Isolationist, Belligerent, Mercantile, Supremacist; only Isolationist +10 % unity and Mercantile +10 % trade have economic effects, the others are selectable but empty because a stance is always set). Requirements reuse the building rules plus two new ones in `building-requirements.js` (`federation` never met, `notFederation` always met) and an `anyOf` rule local to the policy module (Mercantile: Corporate authority, Merchant Guilds or Corporate Dominion). Helpers: `applicablePolicyGroups(ctx)`, `policyAvailable` / `policyUnmetRules`, `policyDefaults(ctx)` (individualist: Mixed Economy + Wealth Creation + Expansionist; gestalt: Balanced Production + Logistics Policy + Expansionist) and `resolvePolicies(policyIds, ctx)` (fills missing groups with the default, replaces unknown or unavailable options with the default and returns the list of replacements for the notices of P16.3). Registered as the collection `policies` (`unverified`) in `data-version.js`. Checked with a node script: both defaults, gestalt switching (Wealth Creation → Logistics Policy, individualist-only groups dropped), Mutual Aid with/without Worker Cooperative, Mercantile only for Corporate individualists, Trade League blocked, Consumer Benefits available. Nothing is wired into the UI or the economy yet. Not in the new rules: nomad, subject and humiliated conditions of the stances, and the Supremacy tradition (decision 4/2 above).
- [x] P16.3 **Implemented** (see the note after the task text). State: `planet-state.js` gets `policyIds` ({ economic, trade, production, stance }). Rules: a policy that does not apply to the empire type (Economic Policy and Wealth Creation/Trade League/Holy Covenant for gestalt; Production Policy and Logistics Policy for individualist) is not shown; when ethics change between individualist and gestalt, the trade policy is reset to the default of the new type (and economic/production policy swapped) with a notice; when an option stops meeting its requirements (e.g. Mutual Aid after dropping Worker Cooperative) it falls back to the default and a notice is shown, like designations (P7.9).
  *P16.3 notes:* `planet-state.js` now carries `policyIds` (only the groups that apply to the empire type) and a `onPoliciesReset` / `emitPoliciesReset` event. `empire.js` owns the selection (`selectedPolicies`) and normalizes it with `syncPolicies()` at every `refresh()`: missing groups are filled with the default without a notice (individualist: Mixed Economy + Wealth Creation + Expansionist; gestalt: Balanced Production + Logistics Policy + Expansionist); when the empire flips between individualist and gestalt (`lastGestalt`) every choice is discarded and the new type's defaults come back, with a notice only if the user had choices; an option that stops meeting its requirements is replaced by its group default with a notice that names the group, the old and the new option (same notice bar as designations and empire switching, `showNotice` in `planet-sim.js`). New exports for the UI of P16.4: `selectPolicy(groupId, optionId)` (returns false if the group does not apply or the option is unavailable) and `getSelectedPolicies()`. `publishSelection` includes the policies in its change key, so `planet-sim.js` will react to them in P16.6/P16.7. Names of the 19 options and the 5 group titles and the notice texts exist in es/en/jp (option names in English in es/jp until P15; group titles hand-translated, to review in P16.8). Until P16.5, `applyConfig` (switching to a saved empire or loading a planet) resets the policies to the defaults of that empire type without a notice. Checked in the browser: initial state is Wealth Creation; Mutual Aid and Trade League refused; Civilian Economy and Consumer Benefits accepted; Extraction Focus refused for a non-gestalt empire; switching to Gestalt Consciousness shows the notice and gives Logistics Policy + Balanced Production, and switching back gives Wealth Creation; picking Isolationist and then a Corporate authority resets the stance with the notice; no console errors. There is no visible UI for choosing policies yet (P16.4).
- [x] P16.4 **Implemented** (see the note after the task text). Empire tab UI (`empire.js` + `planet-sim.html`): new "Policies" panel after Principles with one group per policy (radio-style cards, one option selected per group, disabled options with the reason, the exchange rates shown on the Trade Policy cards, default option marked). Policy changes count as unsaved empire changes (`isModified` / `configsEqual`, the ● marker, the Save / Don't save / Cancel dialog).
  *P16.4 notes:* new "Policies" panel after Principles (`#empire-policies-list`, `renderPoliciesList()` in `empire.js`): one group per policy that applies to the empire type, Economic / Trade (titled "Logistics Policy" for gestalt) / Production / Diplomatic Stance, each with a one-line note, cards that reuse the authority card style (selected = green frame, unavailable = dimmed with the reason in blue, "Default" badge on the default option). Each card lists its effects as the wiki gives them: exchange rates for the trade options (e.g. "50 % Trade value · 50 % Energy"), "+25 % Consumer goods from jobs", "+20 % Worker output", "+10 % monthly Unity", or "No economic effect". Requirement reasons: ethic / authority / civic / federation ("not modelled"), and "Requires one of: …" for Mercantile. Changes count as unsaved empire changes: `currentConfig()` now carries `policyIds`, `normalizeConfig()` in `empire-profiles.js` fills missing or invalid policies with the defaults of that empire (so profiles saved before P16 compare equal to the same setup with defaults and are NOT flagged as modified), and `applyConfig()` applies the saved policies of a profile (silently replacing invalid ones by the default). The panel says that the effects are not applied to the calculations yet; remove that sentence in P16.6. Checked in the browser: 4 groups / 19 cards, default badges, an old profile without policies loads unmodified, picking Consumer Benefits marks the profile modified (●), saving stores `policyIds` in localStorage, reloading and selecting the profile restores them, unavailable cards (Logistics Policy, Mutual Aid, Trade League, Holy Covenant, Mercantile) are disabled with their reason; no console errors.
- [ ] P16.5 Persistence (**mostly done in P16.4**; what is left: show the selected policies on the library empire cards, check JSON export/import of an empire and of a planet snapshot with and without `policyIds`, document in the README that `policyIds` is optional so `schemaVersion` stays 1, and a regression test with a planet saved before P16). Original text: `empire-profiles.js` `normalizeConfig` / `sanitizeEmpireConfig` / `configsEqual` carry `policyIds`; profiles and planet empire snapshots saved before this phase have no policies and load with the defaults of their empire type (backward compatible, `schemaVersion` stays 1 because the field is optional and ignorable by older readers; document it); JSON export/import validates policy ids (unknown ids are ignored and replaced by the default, never invented); library empire cards show the selected policies as tooltip/text (no icons yet); `applyConfig` in `empire.js` and `loadPlanetEmpire` apply them.
- [ ] P16.6 Engine, economic / production / stance effects: policy modifiers enter `computeTotals()` through the same modifier list as P8.2 (new source kind "Policy", new i18n label), with their rules in `stacking-rules.js` (Economic Policy = `jobResourceMult` on consumer goods and alloys; Production Policy = output % by stratum (worker = menial drones, specialist = complex drones, positive output only); stance = % of monthly unity / trade). Panel and breakdown show them.
- [ ] P16.7 Engine, trade conversion (= P8.5): the Trade produced by jobs is split in the breakdown into "Trade value kept" (× the trade exchange rate) and one "Trade conversion" line per target resource (trade × rate), new breakdown source `tradeConversion`; Trade Value is shown as its own resource with its exchange rate, and the converted resources are tagged with the policy that produced them. Production/consumed/net columns stay consistent (the gross − costs = net check of P8.7 must include this source).
- [ ] P16.8 i18n es/en/jp for the policy names, descriptions, requirement reasons and notices (English names in es/jp until P15, as with the rest of the game names; the policy rules texts are written by hand and listed for review).
- [ ] P16.9 Tests and docs: browser tests for the four defaults (individualist → Wealth Creation, gestalt → Logistics Policy, switching ethics both ways, Mutual Aid with/without Worker Cooperative), save/load of a profile and of a planet (old and new format), export/import, the economy numbers with each trade policy against a hand calculation; README and this GDD updated; the P8.5/P16.7 numbers checked against the hand calculation.
- [ ] P16.10 Verification pass: add the collection `policies` to the P14 checklist and review every exchange rate and effect against the uploaded Policies pages one more time before closing the phase.

## 9. Decisions log and open questions
**Resolved (2026-10-21):** explicit save when editing a profile; unsaved changes trigger a confirmation dialog before switching empire or loading a planet; deleted empire → planet keeps raw snapshot and is flagged "no empire"; saved configurations are called **planets** (not templates), planet name = saved name, unique, same checks for rename and name edits; card actions include duplicate/export/rename; empire cards use icons only; invalid buildings are deactivated and always marked with the yellow frame (`img/ui/`); wiki files are assumed to be 4.5.2 and are re-uploaded for a final full verification as the last task.

**Decisions taken in P5 (small, not game rules):** empire names are trimmed, 1–60 characters and unique (case-insensitive) among saved empires; with no saved empire selected the tab is an "unsaved draft" and switching to a saved empire replaces it without asking; choosing "no saved empire" keeps the current setup as a draft and does not touch buildings; deleting the selected empire keeps its setup as a draft; saved empires with an unsupported or missing `rulesetId` are kept untouched in localStorage but not listed; the last selected empire is not restored on reload (planets will store it in P6).

**Decisions taken in P6 (small, not game rules):** loading a planet replaces the one being edited without asking (only unsaved EMPIRE changes ask); an exported planet keeps its old `empireId` (it will show "no empire" if that empire does not exist in the importing browser, and works from the snapshot); the planet size is raised to the district total if a file has more districts than size.

**Still open:** none. Yellow frame image path confirmed: `img/ui/blocker_frame_yellow.png`.

## 10. Future backlog (beyond the phases)

### 10.0.1 Deferred from the policies audit (P16) — recover and review later
Source: Policies pages of `Codex_Ignis_Wiki_1.zip`. Nothing below was left out because of missing numbers, but because the effect is not on the planet economy or needs a mechanic the simulator does not have.
- Societal: Slavery (slave jobs and Slave Citizenship), Purge/displacement, Cyberization Standards (trait efficiency), Robotic Workers and Genome Tailoring (pop traits), Synthetic Identities (mechanical pops on robot-assembly planets; Machine Age + Synthesization situation), Virtual Focus (virtual authorities), Computation Core Focus (Corporate Recollection/Sapience authorities; per Roboticist and Identity Designer), Psionic Choir (corporeal psionic authority; Shroud patron). All need authorities, traits or situations that do not exist here yet.
- Research: Research Restrictions → Refactored Restrictions (+10 % researcher upkeep; needs a Galactic Community resolution). The other research policies change research speed, not production.
- Military policies (fleet, starbase and army effects) and the remaining Diplomatic policies (War Philosophy, Subjugation terms, First Contact, Pre-FTL, borders, nomad policies): no planet economy effect.
- Federation-gated trade options if the answer to question 1 is "not modelled": Trade League and Holy Covenant level 3.
- Industrialism (Toxoids DLC): Full Steam Ahead / For Science! tied to the Relentless Industrialists block deferred in 10.0.
- **Edicts** (page present in the wiki, not requested yet): several edicts change planet economy (resource output, upkeep, housing). Suggested as a later phase using the same option-in-the-Empire-tab mechanism once P16 exists; ask the owner before starting it.
- Trade pieces the pages mention but the simulator lacks: trade from pops, commercial pacts, branch offices (Trade Policy includes them); Monthly Trades (excluded by the pages).

### 10.0 Deferred from P7.8 — recover and review later
Everything below was left out of the building catalog on purpose (data missing or ambiguous, or the mechanic is not modelled). Nothing in it is invented. Source pages are the 4.5 wiki pages in `Codex_Ignis_Wiki.zip` (Industry/Research/Resource/Unity/Buildings buildings); when a block is picked up again, re-read the page first. Suggested home: after P10 (special planets) for the first three groups, and P14 for the review items.
- **Mechanics that do not exist in the simulator yet (buildings are blocked on them):**
  - Automation buildings (+25 %/+50 % automated workforce) and the resource-district cap buildings (+2/+4/+6/+8 max districts per resource type).
  - Storage: Resource Silos, Subterranean Cache.
  - Planetary deposits/features: Betharian Power Plant (Betharian deposit and specialization), Gravitonic Mines feature gate, Pinniped Sanctuary (anomaly). Tied to P10.8.
  - Ascension perks count (Monuments' "+Unity per ascension perk") and civilians (Monuments' per-civilian bonuses by ethic).
  - Job swaps (Politician ↔ Science Director in Ministry of Production/Research Institute/Vultaum Reality Computer; Biologist ↔ Archaeo-Engineer; Engineer ↔ Nanotech Researcher; Zookeeper/Curator jobs).
  - Specimens/exhibits (Holo-museums), nanites resource, Caravan deal (Waste Reprocessing Center requirement), Archaeo-Engineers bonus (Ancient Refinery +15 %, Baol/Vultaum doubled outputs), nomadic upkeep/cost variants.
- **Jobs missing from `JOBS` (needed by the buildings below):** Science Director, Archaeo-Engineer, Nanotech Researcher, Bio-Trophy, Manager, High Priest, Historical Curator, Wonder Curator, Energy Thrall, Death Chronicler. Their outputs are on the wiki Jobs page; add them with their buildings.
- **Buildings not added:** Faculty of Archaeostudies; Nanotech buildings (Nanotech Researchers); Holo-museums (Aesthetic Wonders, Galactic History, Xeno Geology); Pinniped Sanctuary; Vault of Acquisitions (Manager); Citadel of Faith (High Priest; unclear whether the consumer goods line is production or upkeep); Organic Sanctuary/Paradise (Bio-Trophy); Creativity Exhibition Vault (Rogue Servitor); Alpha Hub (machine Auto-Curating Vault) and the hive Auto-Curating Vault variant (their cost/upkeep cells and species-dependent outputs could not be read); Memorialist monument line and Entropy-Drinker monument line (Death Chronicler / Energy Thrall jobs); Numistic Shrine, Ministry of Culture, First League Offices; the Relentless Industrialist / Toxoids block (tomb-world conversion).
- **Assumptions to verify in P14 (already in the P7.8 entry):** Chemical Plants / Synthetic Crystal Plants cost-upkeep-time copied from the Exotic Gas Refineries row; untyped "Research" (+0.1 on the Auto-Curating Vault) applied as +0.1 of each research type; Waste Reprocessing Center and Baol Organic Plant building sets; monuments with no upkeep outside Memorialist; specialized research buildings with no capital-tier requirement; icons of the Corporate monuments are provisional; hand-made translations of the two new resources and the new category.
- Split `js/planet-sim.js` (≈2000 lines: slots, districts, catalog, jobs, production, library hooks) into smaller modules; do it with browser tests at hand.
- Origins as empire context (many are currently ignored in requirements).
- Traditions, technologies, edicts, governors/leaders and their planet-level effects.
- Branch offices (megacorp) tab.
- Additional ruleset versions and scenario migration.
- Resource valuations, payback/break-even analysis, optimization suggestions.
- Construction queue and timed building.
- Optional crime-event / revolt models if rules can be represented transparently.
- Shareable links and sharing of empires between users.
- Library ideas: search / sort / filter by empire or body type; pin favourites; undo delete; card tags or notes; net-production mini-summary and slot-layout thumbnail on planet cards; "compare with…" shortcut (feeds P11); bulk export/import of the whole library; copy a planet to another empire; "apply this empire" shortcut on empire cards.
