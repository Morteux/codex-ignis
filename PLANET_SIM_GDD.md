# GDD: Stellaris Planet Economy Sandbox (Codex Ignis — `planet-sim.html`)

Design rules and decisions of the planet simulator. Pending work lives in `tasks.md`; the full history of finished tasks is in git (GDD before 2026-11-19).

- **Ruleset:** Stellaris PC 4.5.2 "Cygnus" (`stellaris-pc-4.5.2`). All data is tagged 4.5.2 and stays `unverified` until P14 (some values come from 4.3/4.4 pages, e.g. base job outputs).
- **Scope:** only the simulator. Wiki, bingo, legal pages and tech tree (`tech_tree.md`) are out.
- **Rule #1:** never invent rules, numbers or names. Missing or ambiguous wiki data → ask. Every simplification is documented in code and in §8.

## 1. Goal
Browser sandbox to theorycraft the economy of **one planet**: districts, buildings, empire context → monthly production, upkeep and net per resource. Not a galaxy or pop simulator.

## 2. Principles
- **Data-driven & versioned:** gameplay data in data files; provenance per collection (`DATA_COLLECTIONS` in `data-version.js`, exceptions in `PROVENANCE_OVERRIDES`): `rulesetId`, source, `verification` (`unverified` | `wiki-verified` | `game-data-verified` | `approximated` | `unsupported`).
- **Full staffing:** every job created is staffed; one pop per job. The per-job slider is only an optional override. Extra pops come only from the manual Civilians input.
- **Inspectable and honest:** every number explains its source; manual/estimated values are labelled; unmodelled mechanics are listed, never faked.
- **Deterministic**, no backend, localStorage only.
- **Legality enforced:** illegal combinations are never allowed (no sandbox mode).
- **Unlock assumptions:** all technologies researched; no tradition unlocked (exception: tradition-gated policy options are available); DLC requirements ignored.
- **Language:** es/en/jp UI. Until P15 no new es/jp translations: every new text is English (from the wiki) in all three languages. Key parity between languages is mandatory.

## 3. Architecture
- Vanilla JS ES modules, no build. Shared state `js/planet-state.js` (body, designation, ethics, authority, civics, species type, policies, planet name/id, empire id/modified, `rulesetId`).
- Modules: `planet-sim.js` (economy, slots, districts, catalog, jobs, production, conditions; split it whenever convenient), `empire.js` (Imperio tab, policies), `empire-profiles.js`, `celestial.js`, `planet-summary.js`, `planet-library.js` / `planet-library-ui.js`, `confirm-dialog.js`, `stacking-rules.js`, `data-version.js`. Data: `planet-data.js`, `empire-data.js`, `civic-rules.js`, `designation-data.js`, `celestial-data.js`, `building-requirements.js`, `policy-data.js`.
- Images from `STELLARIS_ASSETS_BASE` (`asset-config.js`); UI icons in `img/ui/`.
- Conventions: building/job effects stored ×100 as on the wiki, `divideEffect()` once when computing; jobs, pops, housing and amenities are **displayed ×100** (100 = 1 pop) and calculated in real units. CSS: never set `display` on an element toggled with `hidden` without `:not([hidden])`.
- Test: `tests/policies-smoke.py` (Playwright, English UI, run from the project root).

## 4. Planet model
- **Slots:** 6 base (slot 1 = capital) +3 per district specialization, cap 21. Stable slot keys.
- **Capital:** tiers I–V for 3 families (standard, hive, machine); tier kept when the authority changes.
- **Districts:** urban (2 specialization slots, min 1 copy), generator/mining/agriculture (1 slot each). Total copies ≤ planet size (editable, default 20). Housing: urban +1000 (hive +1200, +600 more on Hive World; machine +1000), −200 per chosen urban specialization, Agrarian Idyll −200; resource districts +200 (gestalt +100, Agrarian Idyll +300). Technology housing bonuses apply (listed in the housing breakdown); tradition ones do not.
- **District body types:** a district or building with no body-type requirement on the wiki is available on every body type.
- **Inactive, never deleted:** a building whose slot is locked, whose requirements are lost or whose slot specialization no longer permits its set stays built but inactive (no jobs/resources), drawn with `img/ui/blocker_frame_yellow.png`, tooltip with the reason; demolishing is always manual. Applies to empire switches and planet loads (report how many became inactive).
- **Invalid choices reset with a notice:** designation → "no designation"; district specialization removed (its buildings turn inactive); policy option → group default.
- **Jobs UI:** "Jobs created / Jobs assumed staffed"; click ±10, Ctrl/Cmd ±100, Shift = 100 %/0 %; no reset button; the notice under the summary explains only the click controls.

## 5. Empire
- Ethics wheel (3 points, gestalt exclusive), 7 authorities, civics (max 3) with requirement/exclusion rules; civic keys derive from the icon file name (`principios_del_juego.md`), English name = wiki name.
- Applied effects: unity %, trade %, influence flat (external income), stratum efficiency (Authoritarian/Fanatic +5/+10 % worker, Egalitarian/Fanatic +5/+10 % specialist). Everything else is informational.
- **Policies** (`policy-data.js`): Economic (individualist), Trade (gestalt name: Logistics Policy), Production (gestalt), Diplomatic Stance. Defaults: Mixed Economy, Wealth Creation (individualist) / Logistics Policy (gestalt), Balanced Production, Expansionist. Switching individualist ↔ gestalt resets to the new defaults. Trade League and Holy Covenant are selectable with a note of the federation they need. Federations otherwise not modelled.
- **Edicts:** own tab before Sucursales, saved with the empire profile.
- **Empire profiles:** saved by name (trimmed, 1–60 chars, unique case-insensitive). No auto-save: editing shows "●"; switching empire or loading a planet with unsaved changes asks Save / Don't save / Cancel. No profile selected = unsaved draft. The last selected empire is restored on reload. Policies, edicts and every empire-level setting count as empire changes. Empire-level tabs (Imperio, Edicts) are visually marked as saved with the profile.

## 6. Economy calculation
- **Order** (`CALCULATION_ORDER` in `stacking-rules.js`, texts `modifierOrder*`): 1 job base output/upkeep → 2 per-job building bonuses → 3 efficiency (designation + building + stratum + Production Policy, one pool, floor 0, positive output only) or upkeep change, × staffed jobs → 4 % of job output (buildings, Economic Policy) → 4b trade conversion → 5 flat outputs (buildings, designation) and upkeep (capital, districts, buildings) → 6 ethic/authority/stance multipliers on accumulated positive production → 7 empire flat bonuses (external income). The stability effect (P9.4) acts on job output and gets its own step.
- **Stacking:** modifiers of the same category **add** (owner decision, kept until P14 verifies against game files).
- **Stability effect:** +0.6 % per point above 50, −1 % per point below, on resources produced by jobs only; not on planetary modifiers, and amenities count as a modifier (not affected).
- **Trade conversion:** trade from jobs and civilians, after job efficiency and before empire %; trade kept = trade × rate, the rest becomes the policy's resources (breakdown lines per resource). Branch-office trade will join it. Monthly Trades excluded.
- **External income:** empire flat bonuses (influence) are shown apart from planet net, with a "total with external income" line.
- **Consistency:** produced + consumed = sum of breakdown lines = net (tolerance 0.001), otherwise a bug warning.
- **Panels:** per-resource breakdown (click a Net row), active-modifiers panel (source, target, value, category), "i" explanation panels (`.info-btn` + `createInfoPanel`, open state kept across re-renders/language).

## 7. Planetary conditions
- Pops = staffed jobs + manual Civilians (default 0, no cap; they consume housing and amenities).
- Housing usage 1/pop; amenities provided = buildings (rounded) + jobs (rounded down) − 5 lost; usage 1/pop.
- **Happiness** (non-gestalt): 50 + amenities effect (bonus min(+20, 20·avail/usage) points, penalty max(−50, 200/3·avail/usage)), clamped 0–100.
- **Stability:** 50 + approval bonus (approval = floor(happiness); +0.6/pt above 50 rounded down, −1/pt below) − housing penalty 40·missing/pops, clamped 0–100. Gestalt: no happiness; amenities effect applies to stability directly.
- Crime from low happiness is display-only (no invented penalty). Every value labelled Manual / Estimated / Derived; manual extra happiness/stability for unmodelled sources.

## 8. Saved data
- localStorage keys `codex-ignis-empires`, `codex-ignis-planets`. JSON export/import (`{type: "planet" | "empire"}`); missing/unsupported `rulesetId` or newer `schemaVersion` → rejected; fields sanitized; new id on import; unknown ids replaced by defaults, never invented.
- Planet: `schemaVersion` (1), `rulesetId`, unique `name`, `celestialTypeId`, `designationId`, `planetSize`, `capitalTier`, districts, `built` (slot key → building id), `staffingOverrides`, `empireId`, `empireSnapshot`, `noEmpire`. Optional fields added later (`policyIds`, edicts, civilians, branch offices) keep `schemaVersion` 1 if older readers can ignore them.
- Empire: `schemaVersion`, `rulesetId`, `id`, `name`, `ethicIds`, `authorityId`, `civicIds`, `speciesType`, `policyIds`.
- Deleted empire: the planet keeps the snapshot and shows "no empire". If the empire exists, its current version is used on load. Loading a planet replaces the current one without asking (only unsaved empire changes ask). A file with more districts than size raises the size.

## 9. Known simplifications and assumptions (verify in P14)
- Stacking rules are the simulator's own (all additive); parent/sub-category job inheritance not modelled.
- P7.8 data assumptions: Chemical/Synthetic Crystal Plants cost-upkeep-time copied from Exotic Gas Refineries; untyped "Research" = +0.1 of each research type; Waste Reprocessing Center set `origin`, Baol Organic Plant `food`/`factory`; monuments with no upkeep outside Memorialist; settled (not nomadic) variants; Corporate monument icons provisional.
- Production Policy treated as stratum efficiency.
- Policy requirement columns partly unreadable on the wiki (tradition/federation conditions as documented).
- Amenity-usage modifiers, crime/deviancy effect on stability, edicts (until P18), factions, events, traits, origins, leaders: not modelled.

## 10. Not modelled / deferred (recover later)
- Mechanics: automation buildings, district-cap buildings, storage (Resource Silos, Subterranean Cache), deposits/features (Betharian, Gravitonic Mines, Pinniped Sanctuary), ascension-perk and civilian-based monument bonuses, job swaps (Politician ↔ Science Director, etc.), specimens, nanites, caravan deals, Archaeo-Engineer bonuses, origins, traditions, leaders, commercial pacts.
- Jobs missing: Science Director, Archaeo-Engineer, Nanotech Researcher, Bio-Trophy, Manager, High Priest, Historical/Wonder Curator, Energy Thrall, Death Chronicler (+ their buildings: Faculty of Archaeostudies, Nanotech labs, Holo-museums, Vault of Acquisitions, Citadel of Faith, Organic Sanctuary/Paradise, Creativity Exhibition Vault, Alpha Hub, hive Auto-Curating Vault, Memorialist/Entropy-Drinker monuments, Numistic Shrine, Ministry of Culture, First League Offices, Relentless Industrialist block).
- Policies with no planet effect: military, research (Refactored Restrictions needs Galactic Community), societal (slavery, purge, cyberization, synthetic identities, virtual/computation/psionic focus, robotic workers, genome tailoring), Industrialism (Toxoids), other diplomatic policies.
- Ideas: resource valuations / payback, construction queue, crime-event models, shareable links, Library search/sort/filter, favourites, undo delete, card notes, net mini-summary on cards, bulk export, "apply this empire" on empire cards.

## 11. Out of scope
Individual pops, species design, strata assignment, unemployment simulation, growth/migration, factions, galaxy, fleets, war, diplomacy, AI.
