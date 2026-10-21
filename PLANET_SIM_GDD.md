# GDD: Stellaris Planet Economy Sandbox (Codex Ignis — `planet-sim.html`)

**Purpose of this document:** working context + phase tracker for the planet simulator. It merges the original GDD with the actual state of the code (project zip of 2026-10-20) and the owner's decisions of 2026-10-21.
**Ruleset:** Stellaris PC 4.5.2 "Cygnus" (`stellaris-pc-4.5.2`). Owner decision: ALL data is tagged as 4.5.2. Existing data was transcribed from the wiki (pages for 4.3/4.4) and is flagged `unverified` until the final verification pass (Phase 13).
**Scope:** only the planet simulator. The wiki, bingo and legal pages of Codex Ignis are out of scope for this GDD.
**Rule #1 (owner):** never invent rules, numbers or names. If wiki data is missing or ambiguous, ask. Document every simplification in code and here.

---

## 1. Product goal

Browser sandbox to theorycraft the economy of **one planet**: pick districts, buildings, empire context, then read monthly production, upkeep and net per resource. Not a galaxy or population simulator.

## 2. Core principles

- **Data-driven & versioned:** all gameplay data in data files, each entry tagged `rulesetId: stellaris-pc-4.5.2` + source + verification status.
- **Full staffing (decision b):** every job created by infrastructure is assumed staffed (100%) by default. The per-job slider stays only as an **optional staffing override**. No pop counts, eligibility, growth or unemployment. UI must show "Jobs Created / Jobs Assumed Staffed" and a visible full-staffing notice.
- **Inspectable:** every number explains its source (base, jobs, modifiers, upkeep, net).
- **Honest:** estimated/approximated/manual values are labelled; unsupported mechanics are marked, not faked.
- **Deterministic**, no backend, local persistence only.
- **Legality enforced:** illegal combinations are not allowed (an explicit sandbox override is a late optional feature).

## 3. Current implementation (state of the code)

**Stack:** vanilla JS ES modules, no build. Shared singleton state `js/planet-state.js` (`celestialTypeId, designationId, ethicIds, authorityId, civicIds, speciesType, planetName, planetSize, populationText`). Each tab module has its own language handling over the shared `.lang-btn` (es/en/jp; every `data-i18n` key must exist in all 3). Images come from `STELLARIS_ASSETS_BASE` via `asset-config.js`.

**Files:** `planet-sim.html`; `js/planet-sim.js` (economy, slots, districts, catalog, jobs, production), `empire.js` (Imperio tab), `celestial.js` (Cuerpo celeste tab), `planet-summary.js` (fixed summary bar); data: `planet-data.js`, `empire-data.js`, `civic-rules.js`, `designation-data.js`, `celestial-data.js`, `building-requirements.js`.

**Conventions:** building/job effects stored ×100 as on the wiki; `divideEffect()` applied once when computing resources; population sliders work in ×100. CSS: never set `display` on an id/class toggled with `hidden` without `:not([hidden])`.

**Implemented**
- Slots: 6 base (slot 1 = capital) +3 per district specialization, hard cap 21; stable slot keys so buildings in a de-specialized slot become inactive, not deleted.
- Capital building: tiers I–V for 3 families (standard 5 entries, hive 4, machine 5), upgrade/downgrade, tier preserved when authority changes.
- Districts: urban (2 specialization slots, 5 options, min 1 copy), generator / mining / agriculture (1 specialization slot each, 2/3/3 options). Total copies limited by editable planet size (default 20). Ctrl/Cmd+click on +/− = max / remove all.
- Catalog: 54 buildings in 9 categories, colony limits, upgrade chains (`upgradesFrom`), building `sets` vs specialization `permittedSets`, requirement rules, job modifiers / efficiency / upkeep multipliers, category dropdowns, target-slot selection.
- Jobs: 28 job types in 4 strata (ruler/specialist/worker/special), base outputs (wiki 4.3 values), gestalt upkeep by species type (organic/lithoid/infernal/machine), non-resource effects (stability, crime, defense armies, naval capacity) as pills.
- Economy: produced / consumed / net columns; 15 resources (incl. influence, volatile motes, rare crystals, exotic gases); housing and amenities totals with amenity breakdown tooltip; strategic-resource upkeep on upgraded buildings.
- Imperio tab: ethics wheel (17 options, 3 points, gestalt exclusive), 7 authorities with exclusion rules, 226-civic catalog with requirement/exclusion rules (max 3), species type. Applied bonuses: unity %, trade %, influence flat; all other effects are shown as informational (dimmed).
- Cuerpo celeste tab: 21 body types (9 "standard", random default); filters designations. 53 planetary designations (job-efficiency and flat bonuses only).
- Fixed summary bar: body icon, designation icon, editable name, size, working population.
- Tabs: Planeta, Imperio, Cuerpo celeste, Ejércitos (disabled — to be removed), Sucursales (placeholder).

**Not implemented (vs. original GDD):** version registry/selector/provenance, planetary conditions (happiness, stability, crime, housing/amenity demand), stability effects, trade-conversion policy, per-resource breakdown, modifiers panel, external-income separation, scenario save/load, JSON import/export, comparison, monthly timeline, special planets' own districts.

**Known gaps in current data** (see Phase 7; value re-verification in Phase 13): district housing/jobs/upkeep and the −200 housing penalty of urban specializations; extra bonuses of Mega-Forges/Nano-Plants/Fabricators/Repli-Complexes (scope unclear on wiki); building cost strings unused and some wrong; origin-gated buildings and Solar Farming Bays habitat-only rule; capital secondary jobs/defense armies; 66 civics missing from the catalog (12 standard, 12 hive, 18 machine, 24 corporate; no icons yet); changing a slot's specialization to one that no longer permits an already-built building does not invalidate it (fix in P3.4).

## 4. New features (owner requests)

### 4.1 Empire profiles
- In the **Imperio tab**, the current configuration (ethics, authority, civics, species type) can be **saved under a user-given empire name**.
- At the **right end of `.planet-summary-fixed`** a dropdown lists all saved empires; picking one applies it instantly.
- Editing the Imperio tab with a profile selected does **not** auto-save: changes need an explicit **Save** (a "modified" indicator is shown).
- On switching empire, **all built buildings that no longer meet their requirements are deleted** (not just deactivated), and every dependent value is recomputed (capital family, requirements, bonuses, civic limits). Show how many buildings were removed.
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
- Remove the **Armies** tab button (HTML + i18n keys `planetSimMainTabArmies`, `planetSimArmiesDisabledTooltip`).
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
| P3 | Housekeeping | pending |
| P4 | Versioning & provenance | pending |
| P5 | Empire profiles | pending |
| P6 | Planets & Library | pending |
| P7 | Data completeness | pending |
| P8 | Transparency (breakdowns, modifiers) | pending |
| P9 | Planetary conditions | pending |
| P10 | Special planets | pending |
| P11 | Comparison & timeline | pending |
| P12 | Polish & QA | pending |
| P13 | Final 4.5.2 data verification (last task) | pending |

**Overall: 26/93 tasks (28%)** (tasks are not equal in size; use as a rough indicator.)

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

### P3 — Housekeeping (0/4)
- [ ] P3.1 Remove Armies tab button and its i18n keys
- [ ] P3.2 Owner removes `.github/`; README updated (no GitHub Actions)
- [ ] P3.3 Staffing UI per decision b: "Jobs Created / Jobs Assumed Staffed", full-staffing notice, slider as optional override (default 100%), drop "population" wording
- [ ] P3.4 Buildings that become invalid (specialization change, lost requirements) are **deactivated, not deleted**, and always drawn with the **yellow frame** (`blocker_frame_yellow`, expected in `img/ui/`; exact filename to confirm when implementing). The red frame is not used

### P4 — Versioning & provenance (0/5)
- [ ] P4.1 Version registry with the single entry `stellaris-pc-4.5.2`
- [ ] P4.2 `rulesetId` + source + verification on every data entry (buildings, districts, jobs, resources, designations, ethics, authorities, civic rules, celestial types)
- [ ] P4.3 Data Version selector in the scenario/summary bar (one option)
- [ ] P4.4 All existing data initially marked `unverified` (wiki-derived)
- [ ] P4.5 Version stored in saved data; warning on unsupported version at import

### P5 — Empire profiles (0/7)
- [ ] P5.1 Save current Imperio tab as a named empire
- [ ] P5.2 Empire dropdown at the right of `.planet-summary-fixed`
- [ ] P5.3 Switching applies config and recomputes all dependants
- [ ] P5.4 Switching deletes all buildings that fail requirements and reports the count
- [ ] P5.5 localStorage persistence; rename / overwrite / delete
- [ ] P5.6 Planet state tracks the selected `empireId`
- [ ] P5.7 Explicit Save when editing a selected profile, with a "modified" indicator (no auto-save); switching empire or loading a planet with unsaved changes opens a confirmation dialog (Save / Don't save / Cancel)

### P6 — Planets & Library (0/10)
- [ ] P6.1 Planet schema (§6), incl. empire snapshot
- [ ] P6.2 Save / load / delete planets (localStorage); name unique, same checks for rename and summary-bar edits
- [ ] P6.3 Library button at far left of the tab list
- [ ] P6.4 Planet cards (body image + name, empire, size, designation)
- [ ] P6.5 Empire cards (name + ethic / authority / civic icons, no text labels)
- [ ] P6.6 Planet card actions: open, duplicate, export, rename, delete
- [ ] P6.7 Empire card actions: duplicate, export, rename, delete
- [ ] P6.8 JSON export/import of planets and empires with version check
- [ ] P6.9 Deleted empire: planet keeps its raw empire snapshot and is flagged "no empire"
- [ ] P6.10 Unique-name validation (save, rename, duplicate, import conflicts)

### P7 — Data completeness (0/8)
Built from the wiki pages already supplied; value re-verification happens in P13. Nothing is invented.
- [ ] P7.1 Districts: housing/jobs/upkeep and the −200 housing urban-specialization penalty
- [ ] P7.2 Extra bonuses of Mega-Forges / Nano-Plants / Fabricators / Repli-Complexes (scope to clarify)
- [ ] P7.3 Building costs: show verified costs or drop the strings
- [ ] P7.4 Missing building rules (Solar Farming Bays habitat-only, origin-gated buildings…)
- [ ] P7.5 Capital secondary jobs and defense armies
- [ ] P7.6 Add the 66 missing civics (+ icons)
- [ ] P7.7 Apply more empire effects (worker/specialist efficiency via strata, etc.)
- [ ] P7.8 Expand the building catalog from supplied wiki pages

### P8 — Transparency (0/7)
- [ ] P8.1 Per-resource breakdown (base, jobs, modifiers, gross, job upkeep, infra upkeep, net)
- [ ] P8.2 Modifiers panel (source, stacking, affected category)
- [ ] P8.3 Stacking rules stored per ruleset
- [ ] P8.4 Planet-produced vs external income separated
- [ ] P8.5 Trade Value distinct, with explicit conversion policy
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

### P12 — Polish & QA (0/5)
- [ ] P12.1 Mobile layout review of all tabs
- [ ] P12.2 i18n parity check for all new strings (es/en/jp)
- [ ] P12.3 Automated UI smoke tests (tabs hidden/visible, save/load, empire switch)
- [ ] P12.4 Accessibility pass
- [ ] P12.5 Decide fate of the Sucursales (branch offices) tab

### P13 — Final 4.5.2 data verification (0/4) — last task of the roadmap
- [ ] P13.1 Owner re-uploads the updated wiki files once implementation is finished
- [ ] P13.2 Review every value (jobs, buildings, districts, designations, ethics, authorities, civics, capital, resources) against them
- [ ] P13.3 Update data and `verification` statuses (`unverified` → `wiki-verified`)
- [ ] P13.4 Deliver the final updated data files

## 9. Decisions log and open questions
**Resolved (2026-10-21):** explicit save when editing a profile; unsaved changes trigger a confirmation dialog before switching empire or loading a planet; deleted empire → planet keeps raw snapshot and is flagged "no empire"; saved configurations are called **planets** (not templates), planet name = saved name, unique, same checks for rename and name edits; card actions include duplicate/export/rename; empire cards use icons only; invalid buildings are deactivated and always marked with the yellow frame (`img/ui/`); wiki files are assumed to be 4.5.2 and are re-uploaded for a final full verification as the last task.

**Still open:** none. (Confirm the exact filename of the yellow frame image in `img/ui/` when implementing P3.4.)

## 10. Future backlog (beyond the phases)
- Origins as empire context (many are currently ignored in requirements).
- Traditions, technologies, edicts, governors/leaders and their planet-level effects.
- Branch offices (megacorp) tab.
- Additional ruleset versions and scenario migration.
- Resource valuations, payback/break-even analysis, optimization suggestions.
- Construction queue and timed building.
- Optional crime-event / revolt models if rules can be represented transparently.
- Shareable links and sharing of empires between users.
- Library ideas: search / sort / filter by empire or body type; pin favourites; undo delete; card tags or notes; net-production mini-summary and slot-layout thumbnail on planet cards; "compare with…" shortcut (feeds P11); bulk export/import of the whole library; copy a planet to another empire; "apply this empire" shortcut on empire cards.
