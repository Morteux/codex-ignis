# GDD: Stellaris Planet Economy Sandbox (Codex Ignis — `planet-sim.html`)

Design rules and decisions of the planet simulator. Pending work lives in `tasks.md`; the full history of finished tasks is in git (GDD before 2026-11-19).

- **Ruleset:** Stellaris PC 4.5.2 "Cygnus" (`stellaris-pc-4.5.2`). All data is tagged 4.5.2 and stays `unverified` until P14 (some values come from 4.3/4.4 pages, e.g. base job outputs).
- **Scope:** only the simulator. Wiki, bingo, legal pages and tech tree (`tech_tree.md`) are out.
- **Rule #1:** never invent rules, numbers or names. Missing or ambiguous wiki data → ask. Every simplification is documented in code and in §8.
- **Wiki requirement columns:** a red-cross icon (`No.png`) before a requirement means "not" (not available on / not with). Markdown generated before 2026-11-19 drops the icon (read those requirement columns from the HTML); the parser now keeps every image as `![label](file.ext)`, e.g. `![No](24px-No.png)`.

## 1. Goal
Browser sandbox to theorycraft the economy of **one planet**: districts, buildings, empire context → monthly production, upkeep and net per resource. Not a galaxy or pop simulator.

## 2. Principles
- **Data-driven & versioned:** gameplay data in data files; provenance per collection (`DATA_COLLECTIONS` in `data-version.js`, exceptions in `PROVENANCE_OVERRIDES`): `rulesetId`, source, `verification` (`unverified` | `wiki-verified` | `game-data-verified` | `approximated` | `unsupported`).
- **Full staffing:** every job created is staffed; one pop per job. The per-job slider is only an optional override. Extra pops come only from the manual Civilians input.
- **Inspectable and honest:** every number explains its source; manual/estimated values are labelled; unmodelled mechanics are listed, never faked.
- **Deterministic**, no backend, localStorage only.
- **Legality enforced:** illegal combinations are never allowed (no sandbox mode).
- **Unmodelled requirements are shown, never hidden** (owner rule 2026-11-19): a requirement the simulator does not model and has no plan to model (origin, planetary feature, planet modifier, relic attunement...) never blocks the option, but is listed next to it as "Requirement not modelled: ..." (`{ type: "unmodelled", i18nKey }` in `requires`).
- **Unlock assumptions:** all technologies researched; no tradition unlocked (exception: tradition-gated policy options and edicts are available); DLC requirements ignored.
- **Language:** es/en/jp UI. Until P15 no new es/jp translations: every new text is English (from the wiki) in all three languages. Key parity between languages is mandatory.

## 3. Architecture
- Vanilla JS ES modules, no build. Shared state `js/planet-state.js` (body, designation, ethics, authority, civics, species type, policies, planet name/id, empire id/modified, `rulesetId`).
- Modules: `planet-sim.js` (economy, slots, districts, catalog, jobs, production, conditions; split it whenever convenient), `empire.js` (Imperio tab, policies), `empire-profiles.js`, `celestial.js`, `planet-summary.js`, `planet-library.js` / `planet-library-ui.js`, `confirm-dialog.js`, `info-panels.js`, `stacking-rules.js`, `data-version.js`. Data: `planet-data.js`, `body-type-data.js`, `empire-data.js`, `civic-rules.js`, `designation-data.js`, `celestial-data.js`, `building-requirements.js`, `policy-data.js`, `edict-data.js`.
- Images from `STELLARIS_ASSETS_BASE` (`asset-config.js`); UI icons in `img/ui/`.
- Conventions: building/job effects stored ×100 as on the wiki, `divideEffect()` once when computing; jobs, pops, housing and amenities are **displayed ×100** (100 = 1 pop) and calculated in real units. CSS: never set `display` on an element toggled with `hidden` without `:not([hidden])`.
- Test: `tests/policies-smoke.py` (Playwright, English UI, run from the project root).

## 4. Planet model
- **Slots:** 6 base (slot 1 = capital) +3 per district specialization, cap 21. Stable slot keys.
- **Capital:** tiers I–V for 3 families (standard, hive, machine); tier kept when the authority changes. Habitats use their own capitals for every empire (P10.4): Habitat Administration / Central Control / System Control, tiers II–IV, jobs by authority, +300 amenities if gestalt; additional jobs by civic/species, Worker Cooperative Stewards and max districts per system body are not modelled. Switching body keeps the closest tier not above the current one (tier I → II on a habitat).
- **Districts:** urban (2 specialization slots, min 1 copy), generator/mining/agriculture (1 slot each). The four groups keep their keys on every body; their definitions come from the body type (§4.1): on an Ecumenopolis the primary is the Residential Arcology (+1500 housing, +300 Clerks or gestalt +900 Logistic Drones, +300 with Anti-Gravity Engineering) and the three secondary groups are Unspecialized Arcology sets (+1500 housing, one urban specialization each, its housing loss ×3). Specialization jobs ×3 per copy on an Ecumenopolis. Ring World: City / Hive / Nexus Segment primary by authority (+2500/+3000/+2500 housing; +300 Clerks +200 Enforcers / +1500 Logistic Drones +200 Synapse Drones / +1000 Logistic Drones +200 Tech-Drones; Anti-Gravity Engineering +500 Logistic Drones on Hive/Nexus) and three Unspecialized Segment sets (+2500 housing) taking urban specializations, Energy Generation or Agricultural Focus (−200 housing like the urban ones); specialization jobs and the secondary housing loss ×5. Habitat (P10.4): Habitation District primary (+1000 housing, no jobs, urban specializations except the research ones) and the three secondary groups hold the Reactor District (generator specializations), Astro-Mining Bay (mining specializations) and Research District (no specializations, unlocks no building slots), each +300 housing; each habitat resource district has a manual cap (orbital deposits: 1 + half of the deposit size), optional field `districts.<key>.cap` saved with the planet, empty = no limit; districts above the cap stay built (+ disabled). The second primary specialization needs Habitat Expansion (researched). Void Dwellers / Voidborne ×1.5 not modelled. Megastructures and habitats have a fixed size (Ring World 10, Shattered Ring World 25, Habitat 6): the size input is disabled and the user's size comes back on other bodies; districts above the size stay built (the + button is disabled). The Shattered Ring World keeps the regular districts (its resource districts are uncapped; deposit caps are not modelled anyway). Switching body type resets the specializations the new districts do not offer (notice); their buildings turn inactive. Urban specializations: Mixed/Heavy/Civilian Industry, Military Defenses, Commercial Nexus, Research Enclave and the Engineering/Physics/Society research specializations (not on a Habitat primary district). Total copies ≤ planet size (editable, default 20). Housing: urban +1000 (hive +1200, +600 more on Hive World; machine +1000), −200 per chosen urban specialization, Agrarian Idyll −200; resource districts +200 (gestalt +100, Agrarian Idyll +300). Technology housing bonuses apply per copy (listed in the housing tooltip of the header): Weather Control Systems +100 urban; Anti-Gravity Engineering +200 city, +100 nexus/hive cluster (not with Agrarian Idyll, which cannot research it); Agrarian Utopias +200 agriculture (Agrarian Idyll only). Tradition ones (Public Works Division) do not.
- **District body types:** a district or building with no body-type requirement on the wiki is available on every body type.
- **Inactive, never deleted:** a building whose slot is locked, whose requirements are lost or whose slot specialization no longer permits its set stays built but inactive (no jobs/resources), drawn with `img/ui/blocker_frame_yellow.png`, tooltip with the reason; demolishing is always manual. Applies to empire switches and planet loads (report how many became inactive).
- **Invalid choices reset with a notice:** designation → "no designation"; district specialization removed (its buildings turn inactive); policy option → group default.
- **Jobs UI:** "Jobs created / Jobs assumed staffed"; click ±10, Ctrl/Cmd ±100, Shift = 100 %/0 %; no reset button; the notice under the summary explains only the click controls.

### 4.1 Body types audit (P10.1, wiki 4.5.2 *Celestial object*, *Districts*, *District specialization*, *Capital building*)
Data in `js/body-type-data.js` (`bodyTypeRules` collection); the engine reads the bodies wired in so far (P10.2 Ecumenopolis, P10.3 Ring Worlds, P10.4 Habitats, P10.5 Hive / Machine / Nanite Worlds, Synaptic Lathe districts and capitals). Regular planets: capacity +400 per free district, current district model. "Resources from jobs" = step 4 (% of job output).

| Body | Applied effects | Districts | Size / slots | Info only |
|---|---|---|---|---|
| Regular (9) | — | urban primary + generator/mining/agriculture | 12–25 (moons 10–15) | capacity +400 |
| Volcanic | +5 % alloys from jobs | Geothermal Powerplant (+200 Technicians), Magma Conduit (+200 Thermoforgers: +5 minerals +0.5 alloys, −1 energy), Thermotechnic Forum (+200 Thermotechnic Mentors) | regular | capacity +400 |
| Gaia | +10 % resources from jobs, +10 happiness | regular | regular | capacity +600, growth, resettlement |
| Tomb / Relic | — | regular; Relic: Collapsed Spire blocker locks the first primary specialization, cleared → Central Spire (P10.6/P10.8) | regular | capacity +300 / +400, habitability |
| Ecumenopolis | +20 % resources from jobs | Residential Arcology primary (+1500 housing, +300 Clerks / gestalt +900 Logistic Drones, −5 energy) + 3 Unspecialized Arcology secondary sets (+1500 housing, −5 energy, one urban specialization each) | regular | capacity +600 |
| Hive World | +10 % resources from jobs | Hive Cluster (+600 on Hive World, already modelled) + 3 Unspecialized Cluster sets (+1800 housing) | regular | capacity +600 |
| Machine / Nanite World | Machine: +10 % resources from jobs, −10 % pop housing usage (housing needed = pops × 0.9: extra row in the conditions panel, used for the missing housing and its stability penalty) | Central Nexus + 3 Unspecialized Nexus sets (+1000 housing) | regular | Machine capacity +300; Nanite: no capacity on the wiki |
| Ring World | — | City / Hive / Nexus Segment primary (+2500/+3000/+2500 housing, jobs, −5 energy) + 3 Unspecialized Segment sets (+2500 housing) | fixed 10 | capacity +600 |
| Shattered Ring World | — | regular, resource districts uncapped | fixed 25 | Repair decision |
| Habitat | — | Habitation District primary (+1000 housing, −2 energy −0.5 alloys) + Reactor District / Astro-Mining Bay / Research District (+300 housing, +100 Technicians / +100 Miners / +30 of each researcher); habitat capitals II–IV | fixed 6 | capacity +300, habitability by tier, deposits cap |
| Synaptic Lathe | — | Neural Gate / Ampliative Speculator (+1 building slot, +1500 housing, −50 energy), no specializations; Processing Unit capitals II–IV | fixed 2, +2 districts per capital level | Neural Chips, purge, no branch offices |

Specialization multipliers (*District specialization*): jobs ×3 on Ecumenopolis/Hive/Machine/Nanite, ×5 on Ring World, ×2 on secondary urban districts; housing removed by secondary specializations ×3 / ×5. Technology bonuses: Weather Control Systems and Anti-Gravity Engineering apply per copy (values per district in the data file); Productivity Simulations and Public Works Division are traditions, Optimized Nexus / Extended Hives / Modular Superstructures are on no technology page — none applied.

New jobs needed: Clerk (+3 trade, +3 amenities, +1 % trade from jobs), Thermoforger (Miner swap), Thermotechnic Mentor (+1 research +1 unity, scaling bonuses), Neural Chip (output × chips/2000, upkeep × chips/4000).

**Owner decisions (2026-11-19):**
- Specialization jobs: the body multiplier (×3 / ×5) applies to the specialization jobs of every district copy, primary and secondary; the wiki's "×2 for secondary urban districts" is not a separate multiplier (it is the per-copy sum).
- Research Enclave and the three research specializations are available everywhere except a Habitat primary district (red cross on the wiki), so Unspecialized Arcologies can take them.
- Mineral Extraction is not available on Ring Worlds; Agricultural Focus not on Machine/Nanite Worlds (red crosses).
- Habitat resource districts: manual cap per district (orbital deposits), saved with the planet (P10.4).
- Synaptic Lathe (P10.5): the district cap is two districts per capital level (not the size 2). Neural Chip scaling needs the total chips (all pops).
- Synaptic Lathe (P10.5, reading): district slots = 2 + the capital's Max Districts (Processing Unit 2, Parallelized 4, Vectorial 6; owner-confirmed 2026-11-19); primary group = Neural Gate (minimum 0 copies), generator group = Ampliative Speculator, mining/agriculture groups emptied and hidden. Capitals II–IV for every empire; their stability (+10/+10/+15) is a conditions row. The Cosmogenesis ascension perk of tiers III–IV is shown as an unmodelled requirement (capital name and upgrade tooltip), never blocks. Neural Chips (P10.5): manual count ×100 (optional planet field `neuralChips`, replaces the civilians row on a Lathe, civilians ignored there); per chip job (100 chips) output ×(chips/2000) and upkeep ×(chips/4000), counted as job output; Neural Gate +0.75 research per 100 chips per copy read as each of physics/society/engineering (owner-confirmed), Ampliative Speculator +0.02 Advanced Logic (new resource, modifier icon).
- Nanite World (P10.5): the wiki gives no planet capacity or "resources from jobs": nothing applied (bonuses may come from the species or a tradition).

**Open questions (owner) — block the task that uses them:**
8. (P10.4) Research Station requires "Can build Zero-G Research Districts": is it the habitat Research District? Owner checking; until then shown as an unmodelled requirement.
7. (P10.3) Ring World secondary Commercial/Research etc. swaps: same urban list as regular worlds?

## 5. Empire
- Ethics wheel (3 points, gestalt exclusive), 7 authorities, civics (max 3) with requirement/exclusion rules; civic keys derive from the icon file name (`principios_del_juego.md`), English name = wiki name.
- Applied effects: unity %, trade %, influence flat (external income), stratum efficiency (Authoritarian/Fanatic +5/+10 % worker, Egalitarian/Fanatic +5/+10 % specialist). Everything else is informational.
- **Policies** (`policy-data.js`): Economic (individualist), Trade (gestalt name: Logistics Policy), Production (gestalt), Diplomatic Stance. Defaults: Mixed Economy, Wealth Creation (individualist) / Logistics Policy (gestalt), Balanced Production, Expansionist. Switching individualist ↔ gestalt resets to the new defaults. Trade League and Holy Covenant are selectable (membership assumed) with a note of the federation they need; Consumer Benefits / Marketplace of Ideas stay available (their federation block is never met). Federations otherwise not modelled.
- **Edicts:** own tab before Sucursales (`js/edicts-ui.js`), any number active, saved with the empire profile (`edictIds`, optional field, catalog order). Unknown/unavailable ids are dropped on load (no default); edicts that lose their requirements after an empire edit are deactivated with a notice.
- **Living standard** (P20): saved with the empire profile; drives pop upkeep.
- **Empire profiles:** saved by name (trimmed, 1–60 chars, unique case-insensitive). No auto-save: editing shows "●"; switching empire or loading a planet with unsaved changes asks Save / Don't save / Cancel. No profile selected = unsaved draft. The last selected empire is restored on reload. Policies, edicts and every empire-level setting count as empire changes. Empire-level tabs (Imperio, Edicts) are visually marked as saved with the profile.

### 5.1 Edicts audit (P18.1, wiki 4.5.2 *Edicts*)
Included: edicts with at least one effect on this planet's economy or conditions that the simulator can compute, and whose requirements are empire data (ethics, authority, civics, gestalt, consumer goods). Technologies and "Communications with another empire" count as met; tradition requirements count as met (same exception as policy options; owner decision 2026-11-19); edict cost/upkeep (unity, empire-size scaling, Edict Fund) is empire-level: shown, never charged to the planet. Jobs are ×100, so "per 100 X" = per staffed job. Effects marked *info* are listed on the card but not computed. Edicts never limit each other except Storm Attraction/Repulsion (excluded) and Sacrifices (excluded); the page gives no edict cap.

| Edict | Applied | Info only | Requirement (modelled) |
|---|---|---|---|
| Capacity / Mining / Farming Subsidies | +20 % Technician / Miner / Farmer efficiency; −0.5 trade upkeep per job | — | — |
| Forge Subsidies | +10 % Metallurgist efficiency; −1 trade per job | — | — |
| Industrial Subsidies | +10 % Artisan efficiency; −1 trade per job | — | uses consumer goods |
| Research Subsidies | +10 % Physicist/Engineer/Biologist efficiency; −1 trade per job each | — | tradition (met) |
| Synaptic Reinforcement / Industrial Maintenance | +1 trade per Maintenance Drone (gestalt civilians) | — | Hive Mind / Machine Intelligence |
| Extended Shifts | +10 % worker efficiency | −15 % worker happiness (one happiness for all pops); slaves | tradition (met) |
| Veneration of Saints | +5 % Priest efficiency | ethics attraction | Spiritualist |
| Information Quarantine | +5 stability | ethics attraction | Authoritarian |
| Peace Festivals | +5 happiness | ethics attraction | Pacifist |
| Enhanced Surveillance | +5 stability, −10 happiness | encryption, attraction | not gestalt |
| Tracking Implants | −10 crime, −10 happiness | encryption, attraction | not gestalt |
| Thought Enforcement | −10 happiness | −0.3 crime per Telepath (job not modelled), encryption | not gestalt |
| Thought Pre-Emption | −10 % upkeep of all jobs, −5 stability | −0.3 deviancy per Telepath, encryption | gestalt |
| Omnifarious Acquisition (decree) | +25 % monthly minerals (settled) | nomadic effects | — |
| Scientific Revolution (decree) | +10 % researcher efficiency | +1 research alternative | — |
| Decentralized Research | −10 % researcher efficiency (settled) | research stations | Galactic Curators (all variants) |
| Fear Campaign | +10 % monthly unity | attraction | Xenophobe |
| Inner Focus | +10 % monthly unity | — | Sovereign Guardianship (all variants) |
| Nanite Actuators | +10 % researcher upkeep | +10 % research speed | — |
| Baryonic Insight / Dark Matter Forging / Unraveling | +10 % physics / +5 % alloys / +10 % energy | — | Dark Consortium, Shadow Corporation |
| Coordinated Nanocomplexes / Nanoconnected Generators | +15 % alloys / +25 % energy | — | tradition (met) |

Percent happiness/stability/crime values are treated as points (as for amenities). "Monthly X" = step 6 (`resourceMult`). Excluded: edicts with no planet effect (fleet, intel, survey, leaders, ethics attraction only, megastructures, strategic-resource ship edicts, campaigns other than Fear, network edicts — Hyper Relay systems not modelled — and the rest); edicts gated by origins, situations, anomalies, relics, astral actions/rifts, minor patrons, caravan deals, ambitions, federations or cybernetic authorities (none modelled); Sacrifices (random multiplier, killed pops); pop-upkeep edicts (Nutritional Plenitude, Expanded Breeding Program, Recycling Campaign: pop upkeep is not modelled yet, only job upkeep; they come with P20, pop upkeep from living standards); amenity-usage edicts (Drone/Symbiont Overdrive need Wilderness, Networked Amenities); Galactic Dowsing, Centrifugal Siphoning, Energy Drain (jobs/resources not modelled).

## 6. Economy calculation
- **Order** (`CALCULATION_ORDER` in `stacking-rules.js`, texts `modifierOrder*`): 1 job base output/upkeep → 2 per-job building bonuses, then per-job edict outputs/upkeep (own breakdown line) → 3 efficiency (designation + building + stratum + Production Policy + edicts, one pool, floor 0, positive output only) or upkeep change (per job + edicts on all jobs), × staffed jobs → 4 % of job output (buildings, Economic Policy) → 4a stability effect → 4b trade conversion → 5 flat outputs (buildings, designation) and upkeep (capital, districts, buildings) → 6 ethic/authority/stance/edict multipliers on accumulated positive production → 7 empire flat bonuses (external income).
- **Stacking:** modifiers of the same category **add** (owner decision, kept until P14 verifies against game files).
- **Stability effect** (step 4a, category `stabilityEffect`): +0.6 % per point above 50, −1 % per point below (unrounded stability), on the positive output of jobs after steps 1–4 (the step-4 % is not compounded); not on planetary modifiers, and amenities count as a modifier (not affected). It comes before the trade conversion, so converted trade includes it. Conditions are therefore computed before step 4a (designation flat housing/amenities counted in advance). Shown in Conditions, the modifiers panel and the breakdown.
- **Trade conversion:** trade from jobs and civilians, after job efficiency and before empire %; trade kept = trade × rate, the rest becomes the policy's resources (breakdown lines per resource). Branch-office trade will join it. Monthly Trades excluded.
- **External income:** empire flat bonuses (influence) are shown apart from planet net, with a "total with external income" line.
- **Consistency:** produced + consumed = sum of breakdown lines = net (tolerance 0.001), otherwise a bug warning.
- **Panels:** per-resource breakdown (click a Net row), active-modifiers panel (source, target, value, category), "i" explanation panels (`js/info-panels.js`: static `.info-btn` + `createInfoPanel`, also on the Imperio tab; open state kept across re-renders/language; texts use the current numbers where they apply, e.g. the trade conversion of the Production panel).

## 7. Planetary conditions
- Pops = staffed jobs + manual Civilians (Conditions panel, ×100, default 0, no cap, labelled Manual; they consume housing and amenities). Civilian output (wiki 4.5.2 *Jobs* → Special jobs, per pop): Civilian +0.5 amenities, +1 trade; gestalt Maintenance Drone +4 amenities, +1 trade. Their trade gets the stability effect and enters the trade conversion; no stratum efficiency or job % bonuses. Hedonist/Tourist job swaps not modelled.
- Housing usage 1/pop; amenities provided = buildings (rounded) + jobs (rounded down) − 5 lost; usage 1/pop.
- **Edicts** (P18.4): happiness, stability and crime points (category `conditionFlat`) are added before clamping and shown as an "Edicts" row when non-zero (happiness ignored in gestalt; crime only with pops). Per-civilian edict trade (Maintenance Drones) gets the stability effect and the trade conversion like civilian trade.
- **Happiness** (non-gestalt): 50 + amenities effect (bonus min(+20, 20·avail/usage) points, penalty max(−50, 200/3·avail/usage)), clamped 0–100.
- **Stability:** 50 + approval bonus (approval = floor(happiness); +0.6/pt above 50 rounded down, −1/pt below) + stability from jobs − housing penalty 40·missing/pops, clamped 0–100. Job stability (`JOB_EFFECTS`, e.g. Enforcer, Soldier) × staffed jobs is a modifier like amenities: neither the stability effect nor job efficiency changes it. Gestalt: no happiness; amenities effect applies to stability directly.
- **Crime from low happiness** (display only, no invented penalty): wiki 4.5.2 *Colony management* — each pop produces 0 at 100 happiness up to +2 at 0, i.e. 0.02 × (100 − happiness) per pop (the old task text "per point below 50" contradicted the wiki). Shown in Conditions (from pops, job reductions, total ≥ 0) and next to the enforcer/educator crime in the jobs non-resource effects. Gestalt: named Deviancy; with no happiness, deviancy from pops is not modelled (only job reductions). Every value labelled **Manual** (entered by the user), **Estimated** (relies on a simplification: 1 amenity per pop, all pops alike, approval = happiness) or **Derived** (straight from data and wiki rules). Manual extra happiness and stability (default 0, −100…100) for unmodelled sources; they enter happiness/stability before clamping (manual happiness ignored in gestalt) and are saved with the planet.

## 8. Saved data
- localStorage keys `codex-ignis-empires`, `codex-ignis-planets`. JSON export/import (`{type: "planet" | "empire"}`); missing/unsupported `rulesetId` or newer `schemaVersion` → rejected; fields sanitized; new id on import; unknown ids replaced by defaults, never invented.
- Planet: `schemaVersion` (1), `rulesetId`, unique `name`, `celestialTypeId`, `designationId`, `planetSize`, `capitalTier`, districts, `built` (slot key → building id), `staffingOverrides`, `empireId`, `empireSnapshot`, `noEmpire`. Optional fields added later (`manualConditions` {happiness, stability}, `policyIds`, `civilians` (×100 integer), `neuralChips` (×100 integer, Synaptic Lathe), edicts, branch offices) keep `schemaVersion` 1 if older readers can ignore them.
- Empire: `schemaVersion`, `rulesetId`, `id`, `name`, `ethicIds`, `authorityId`, `civicIds`, `speciesType`, `policyIds`, `edictIds`.
- Last selected empire: id in `codex-ignis-last-empire`; restored on reload if it still exists (otherwise the default draft). Not exported.
- Deleted empire: the planet keeps the snapshot and shows "no empire". If the empire exists, its current version is used on load. Loading a planet replaces the current one without asking (only unsaved empire changes ask). A file with more districts than size raises the size.

## 9. Known simplifications and assumptions (verify in P14)
- Stacking rules are the simulator's own (all additive); parent/sub-category job inheritance not modelled.
- P7.8 data assumptions: Chemical/Synthetic Crystal Plants cost-upkeep-time copied from Exotic Gas Refineries; untyped "Research" = +0.1 of each research type; Waste Reprocessing Center set `origin`, Baol Organic Plant `food`/`factory`; monuments with no upkeep outside Memorialist; settled (not nomadic) variants; Corporate monument icons provisional.
- Production Policy treated as stratum efficiency.
- P10.4: habitat designations "Can build Reactor Districts / Astro-Mining Bays" are locked only when that district's manual cap is 0.
- P7.10: Agrarian Utopias uses the Districts page value (+200); *Society research* says +100. Optimized Nexus and Extended Hives are not on any technology page (they look like gestalt variants of Public Works Division) and are not applied.
- Policy requirement columns partly unreadable on the wiki (tradition/federation conditions as documented).
- Amenity-usage modifiers, crime/deviancy effect on stability, factions, events, traits, origins, leaders: not modelled.

## 10. Not modelled / deferred (recover later)
- Mechanics: automation buildings, district-cap buildings, storage (Resource Silos, Subterranean Cache), deposits/features (Betharian, Gravitonic Mines, Pinniped Sanctuary), ascension-perk and civilian-based monument bonuses, job swaps (Politician ↔ Science Director, etc.), specimens, nanites, caravan deals, Archaeo-Engineer bonuses, origins, traditions, leaders, commercial pacts.
- Jobs missing: Science Director, Archaeo-Engineer, Nanotech Researcher, Bio-Trophy, Manager, High Priest, Historical/Wonder Curator, Energy Thrall, Death Chronicler (+ their buildings: Faculty of Archaeostudies, Nanotech labs, Holo-museums, Vault of Acquisitions, Citadel of Faith, Organic Sanctuary/Paradise, Creativity Exhibition Vault, Alpha Hub, hive Auto-Curating Vault, Memorialist/Entropy-Drinker monuments, Numistic Shrine, Ministry of Culture, First League Offices, Relentless Industrialist block).
- Policies with no planet effect: military, research (Refactored Restrictions needs Galactic Community), societal (slavery, purge, cyberization, synthetic identities, virtual/computation/psionic focus, robotic workers, genome tailoring), Industrialism (Toxoids), other diplomatic policies.
- Ideas: resource valuations / payback, construction queue, crime-event models, shareable links, Library search/sort/filter, favourites, undo delete, card notes, net mini-summary on cards, bulk export, "apply this empire" on empire cards.

## 11. Out of scope
Individual pops, species design, strata assignment, unemployment simulation, growth/migration, factions, galaxy, fleets, war, diplomacy, AI.
