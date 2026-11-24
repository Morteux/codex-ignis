# Decisions to review

Decisions Claude took on its own while implementing tasks, pending the owner's review. When the owner confirms or changes one, move it to `PLANET_SIM_GDD.md` (as an owner decision) and remove it from here. Newest first.

## T3007 — Tech unlocks linked to simulator ids (2026-11-25)
- [ ] **Matcher of the difference report** (`report_differences.py`: game id with prefix, then English name, then icon) decides the links; a wrong name match there is also a wrong link here.
- [ ] **Jobs linked through the unlocked buildings and districts** (`jobs: [{id, sim?}]`, conditional jobs included): no game job names a technology as prerequisite, so a tech never unlocks a job directly.
- [ ] **Edicts and deposits are not linked** (the task only asks for buildings, jobs and districts).
- [ ] **The data file depends on the simulator data**: it is rebuilt when the simulator changes; the browser test fails if it is stale.
- [ ] **Fixture unlocks** changed to the same `{type, id, name, sim, jobs}` shape as the real data.

## T3004 — Tech tree data model confirmed against the extractor (2026-11-25)
- [ ] **One `kind` per node by priority** repeatable > starter > event > dangerous > rare > normal; the game flags combine (rare + dangerous, event + rare…), so all of them are also kept in `flags` for later filters.
- [ ] **`acquisition` is never produced** from the 4.5.4 files: the game has no such flag (the wiki colours it by hand). It stays in the kind list; `insight` techs are kept only as a flag.
- [ ] **Icon path from the game texture**, not always `technologies/<id>.png` (5 techs share another tech's texture); the T3003 slot and the validations accept any `technologies/<name>.png`.
- [ ] **Variants are never nodes** (32 swap ids are also other tech ids); shown inside their base node.
- [ ] **Not kept in the data file**: `gateway`, `feature_flags`, `reverse_engineerable`, `cost_modifiers` and `starting_potential`.

## T2004 — Pop upkeep edicts (2026-11-25)
- [ ] **Source**: the three edicts come from the 4.5.4 game files (`common/edicts/00_edicts.txt`), not the 4.5.2 wiki like the rest of `js/edict-data.js`.
- [ ] **"Organics" upkeep as every pop upkeep**: `planet_pops_organics_{food,minerals,alloys}_upkeep_mult` is applied to all pop upkeep of those resources; only organic / lithoid / infernal species pay them, so it is the same unless robots are added.
- [ ] **Infernal pops get the +5 happiness** (assumed BIOLOGICAL archetype for `biological_pop_happiness`); points, like the other edict happiness.
- [ ] **Hive variant**: `nutritional_plenitude_hive` is its own card with the same name, locked unless Hive Mind; Expanded Breeding Program needs Rogue Servitor (its happiness never applies: gestalt). Gene Crops / Planetary Unification count as researched.
- [ ] **Own breakdown line** "Pop upkeep: edicts" for the change, instead of folding it into the species / living standard lines; the change stacks additively with floor 0 (`popUpkeepMult`).
- [ ] **Names in es / jp** from the game localisation 4.5.4 (the other edict names are still English in every language).

## T2213 — Bingo PNG download smoke test timeout (2026-11-25)
- [ ] **Cause not reproduced**: on the current tree the full suite passes with and without `BLOCK_REMOTE=1` (and the bingo area alone too), so the T1906 timeout was not a deterministic page or test break. The only way found for the page to never fire the download is an icon request that never settles: `buildBingoCanvas` waited for every icon with no limit, leaving the button disabled forever.
- [ ] **Icon wait capped at 5 s** (`ICON_WAIT_MS` in `js/bingo.js`): after that the PNG is drawn and icons still loading are left as empty cells (only fully loaded icons are drawn).
- [ ] **Test no longer stops the suite**: a download that does not arrive within 30 s is a FAIL check with the pending icons, button state and status text, and the remaining areas still run.

## T1906 — Branch office owner from a saved empire profile (2026-11-25)
- [ ] **Corporate authority only**: the "Owner empire" select lists the profiles whose authority is Corporate; the Corporate Sovereign civic (also allowed to own branch offices in the game) is not checked.
- [ ] **Civic order**: when a profile has more than 3 owner civics (not possible with today's 3-civic cap, but kept as a guard), the first ones in the profile's order are kept and later incompatible ones are dropped.
- [ ] **Custom owner after a profile**: switching back to "Custom owner" keeps the copied civics as an editable starting point instead of clearing them.
- [ ] **Unsaved Imperio edits**: the owner follows the saved profile, not unsaved changes in the Imperio tab.
- [ ] **Texts**: the new Sucursales texts have es and jp translations written by Claude (the older Sucursales texts are still English in every language).

## T2003 — Pop upkeep in the engine (2026-11-24)
- [ ] **Colonists without stratum**: the simulator's Colonist job is special stratum, so Colonists pay only the species upkeep (no living standard consumer goods); the 4.5.4 game files list Colonist as a worker job (+0.25 consumer goods each with Decent Conditions). Left as is until the jobs data set is switched to the extracted data (T2523).
- [ ] **"No deficit" assumed**: living standard effects that need no consumer goods deficit (happiness, Academic Privilege research) always apply, even if the planet itself runs a consumer goods deficit (the deficit is empire-wide in the game).
- [ ] **Living standard trade as pop output**: it gets the stability effect and the trade conversion like job trade; ethics/authority multipliers apply to it as to all positive output.
- [ ] **Tests**: the existing economy, A/B comparison and timeline checks were updated to the new numbers (2 Traders under Decent Conditions: +0.66 trade, −1 consumer goods; 4 organic pops: −4 food).

## T2002 — Living standard in the Imperio tab (2026-11-23)
- [ ] **Panel**: a "Living standard" panel after Civics with one card per standard (`js/living-standard-data.js`), locked cards explain the missing requirement; the default gets the "Default" badge. Names in es / jp from the game localisation 4.5.4.
- [ ] **Silent fallback**: a standard the empire loses after an edit (e.g. Utopian Abundance after dropping Egalitarian) becomes the default without a notice (policies and edicts show one); the selected card makes the change visible.
- [ ] **Machine species in an individualist empire** counts as individual machines (Utopian Abundance, Academic Privilege, Social Welfare allowed); Chemical Bliss stays locked for machine species, as in the game.
- [ ] **Subdermal Stimulation** (Chemical Bliss) assumed researched, like every technology.

## T2001 — Living standards audit (2026-11-23)
- [ ] **Founder species only**: the simulator models one species with full citizenship, so only the standards that species can take are offered (GDD §5.3): Decent Conditions, Social Welfare, Utopian Abundance, Academic Privilege, Stratified Economy, Decadent Lifestyle, Chemical Bliss, the three civic standards and Drone for gestalt. Basic Subsistence (slaves / limited citizenship / displacement only), slavery, purge, assimilation, robot servitude and origin standards are left out.
- [ ] **Units**: the game values are per pop group of 100 pops, read as per simulator pop (the simulator's pops are ×100, like jobs); happiness `0.1` read as +10 points, as for edicts.
- [ ] **Default**: Decent Conditions (individualist), Drone (gestalt), the civic's own standard with Shared Burdens, Worker Cooperative or Dystopian Society (the game's starting standard is not read from the files).

## T1905 — Branch office building limits (2026-11-23)
- [ ] **`base_cap_amount = 1`** (Experimentation Offices, Living Metal Enhancement Clinic: no `planet_limit` in `14_branch_office_buildings.txt`) read as one per colony too; no `building_*_max` modifier in `common/` raises it. The extractor now exports `base_cap_amount` in `buildings.json`.
- [ ] **Duplicates**: a slot cannot pick a building already chosen in another slot (the option is disabled with «limit: 1 per colony»); a duplicate restored from an older save stays in its slot but inactive, the first slot keeping the effects.

## T1011 — Rest of the Wilderness origin (2026-11-23)
- [ ] **Buildings** (`WILDERNESS_BUILDINGS` in `js/planet-data.js`, game files 4.5.4 `21_wilderness_buildings.txt`): costs, upkeep, jobs, limits and modifiers as in the game; jobs in the simulator's ids (Coordinator = Synapse Drone, research drones = Physicist / Biologist / Engineer, Agri / Tech / Mining Drone = Farmer / Technician / Miner, Fabricator = Metallurgist, Warrior Drone = Soldier, Logistics Drone = Logistic Drone); the Fallen Empire jobs of the same tables (`fe_acolyte_*`) left out. Upgrades follow the chains of the game with the capital tier of their `allow` (upgraded = II, major = III, fully = IV); technology prerequisites not modelled, as for every other building. Game modifiers read as: `planet_<category>_<resource>_produces_add` = per-job bonus (`jobModifiers`), `pop_<job>_bonus_workforce_mult` and `planet_bureaucrats_produces_mult` = job efficiency, `planet_pops_trade_produces_mult` = % trade from jobs. Building sets: government = base slots ("origin"), farming / generator / mining = their extraction specialization only.
- [ ] **Avatar Chamber** limited to one per planet (its game `potential` refuses a planet that already has one); the extra amenities of each Avatar Cradle while an Avatar Chamber / Forest / Cortex stands are not modelled (shown in its tooltip).
- [ ] **Not added**: Subterranean Cache (storage, GDD §10) and Planetary Shield Canopy (orbital bombardment / storm damage only, like the Planetary Shield Generator, which the simulator does not have). Storm Relief Center: only its +800 amenities.
- [ ] **New jobs** Spawning Drone (Cradle of Rebirth; upkeep 5 food / 5 minerals / 2 alloys by species, pop growth not modelled), Chem-Drone, Lensing Drone, Refinery Drone (Wilderness strategic buildings; +2 motes / crystals / gases, −10 minerals, non-catalytic values). With the Spawning Drone in the simulator its other swaps (Offspring, Genomic Drone) are now listed (their conditions stay unmodelled).
- [ ] **Symbiont swaps**: in the game they only rename the base job (no own output), so each copies its base job's simulator output and inherits its gestalt upkeep; weights from the game. Neurosymbiont is info only (Transference Drone not modelled). The swaps of the Mote Harvesting / Crystal Mining / Gas Extraction Drones are not added (swaps of swaps): as in the game, the Photosymbiont / Grubsymbiont / Pollinosymbiont (weight 10 / 10 / 100) outweigh them, so on a strategic specialization a Wilderness empire gets the symbiont, not the strategic job. Icons: the game's own when it has one, the base job's otherwise.
- [ ] **Designation effects**: only the base `planet_modifier`, as the other designations; `planet_<job>_produces_mult` read as job efficiency (Photosynthesis / Lithic / Pollinating World +25 %, Cogitation +10 % research, Crucible +10 % Metallurgists, Refining +15 % refinery drones, Tranquil World +10 % Synapse Drones); Weaver World = +10 % trade from jobs. Hunter World and the build speed bonuses are not modelled; Heart World (capital) is not in the catalogue, like the other capital designations.
- [ ] **Pliable Biomass**: unemployed pops of a Wilderness empire are Pliable Biomass (no output) instead of Maintenance Drones, and the edicts that add resources per Maintenance Drone do not apply to them.
- [ ] **Biomass production**: the game has none; `on_biomass_monthly` sets the empire stock to "the amount of Wilderness pops". The conditions panel shows it as info, with this planet's pops (×100, as shown everywhere) as its share — the unit (pop amount = displayed pops) is my reading of that comment.
- [ ] **Wilderness deposits** (`d_wilderness_*`): every one only removes districts (and Invasive Thicket −5 % food for other empires), so they are not selectable: covered by the manual planet size, as decided for the other such blockers (2026-11-20).
- [ ] **Names** of the new buildings and jobs in es / jp come from the game localisation 4.5.4 (not English everywhere as the other P13.8 data texts); the info texts are written in the three languages.

## P10.6 — Wilderness origin (2026-11-23)
- [ ] **Origin selector**: a new "Origin" panel in the Imperio tab lists only the modelled origins (Wilderness); none chosen = no modelled origin (`originId` null). The origin is saved with the empire profile and the planet's empire snapshot (optional field, older files read as none).
- [ ] **Wilderness `possible`** applied: Hive Mind authority and none of the 13 excluded hive civics (they disappear from the civics list while it is chosen; choosing one first locks the origin card). Graphical culture, "no Volcanic homeworld" and the DLC are not modelled. Leaving Hive Mind drops the origin.
- [ ] **Mutualistic Intelligence is not a separate authority**: the authority stays `hiveMind` and its card shows the Mutualistic Intelligence (name, icon, effects) when the origin is Wilderness; its effects replace the Hive Mind ones (`inherit_effects = no`) and are all info only (empire size, diplomatic weight). Blurbs of the origin and the authority are proposals.
- [ ] **Districts only on the standard district set**: the four Wilderness districts replace the regular ones on regular planets, Gaia, Tomb and Relic Worlds (the game's `uses_district_set = standard`); Volcanic, Hive, Machine, Nanite Worlds, Ecumenopolis, Ring Worlds, Habitats and the Synaptic Lathe keep their own districts for a Wilderness empire (not checked against the game: the Wilderness has no districts there).
- [ ] **District values from the game files**: Communal Biome +100 housing, −2 energy, no jobs, 2 specialization slots; Photosynthesis Field / Hollow Mountain / Orchard Forest +100 housing, +200 Technician / Miner / Farmer jobs, upkeep −1 energy / −1 food / −1 energy. Tradition bonuses (Public Works +50 housing, Purity finish) not applied, as for the other districts. Deposit features keep the regular rules (the game has Wilderness deposits `d_wilderness_*`, not modelled).
- [ ] **Specializations**: the urban district offers only the 7 Wilderness urban zones (Heartgrove, Moltgut, Thinkstem, Singing Cliffs, Harmonic Core, Threadway, Command Bulb), in both slots (no primary-only one: the Wilderness has no secondary urban districts); each resource district offers its Wilderness zone plus the regular strategic ones (motes, crystals, gases, Betharian; their zones do not exclude the Wilderness). Jobs are the gestalt ones in the simulator's ids; none changes housing (the game zones have no housing modifier). Building sets follow the regular zone with the same game set.
- [ ] **Capitals**: Planetary Tendrils (I), Root Bundle (II), Root Complex (III), Root Nexus (IV) and Imperial Complex (V) replace the Hive capitals (tier kept on switch); game `coordinator` read as the Synapse Drone, as in the Hive Core. Imperial Complex reuses the Hive one's name key (same game name) and the tier IV icon (the game has no fifth icon).
- [ ] **Biomass** is only a cost (district and capital tooltips): no job or modelled building produces it in the game files (Broodsymbiont / Pliable Biomass are not modelled), so it never appears in the economy.
- [ ] **Buildings and designations the game forbids** (`is_wilderness_empire = no` in their potential: 41 buildings, 8 designations, Hive capitals) are locked by a modelled `notOrigin` rule; the Wilderness designations (and Tranquil / Weaver World) need the origin and are now offered on every natural body (before: only Volcanic, Gaia, Tomb and Relic). The Wilderness buildings and the designation effects are not modelled yet: new task T1011.
- [ ] **Symbiont swaps**: Photosymbiont, Grubsymbiont and Pollinosymbiont now apply (origin condition modelled; empire type gestalt, as their base jobs are drones). The other Wilderness swaps of the game (Choirsymbiont, Spindlesymbiont, Immunosymbiont, Evosymbionts, Forgesymbiont, Tamersymbiont...) are not in the simulator data: part of T1011.

## P25.25 — Advanced Logic resource icon (2026-11-23)
- [ ] **`resources/Advanced_logic.png`** is the game's `gfx/interface/icons/resources/advanced_logic_large.dds` (32 px, like the other resource icons; the small `advanced_logic.dds` is 20 px), committed in StellarisAssets (not pushed: until the owner pushes, the published site shows the icon as missing). `RESOURCES.advanced_logic` uses it instead of the modifier icon `modifiers/mod_advanced_logic_produces_add.png`.

## P25.24 — Icon export into StellarisAssets (2026-11-23)
- [ ] **Full export committed in StellarisAssets** (not pushed): 1069 new files (812 in the new `technologies/`, 50 in the new `dlc/`, 44 in `designations/` and 2 in the new `edicts/`, plus new icons in the existing folders), 102 replaced with the game version (all with the same size as before: authorities, the science buildings, 18 origin icons, 14 planets, 8 planet modifiers...), 210 kept because the existing file is larger (civics and ethics from the wiki). The replaced list is in the StellarisAssets commit message and in `reports/stellaris-pc-4.5.4/icon_export.json`.
- [ ] **`edicts/` is a new folder** (the edicts had no folder; only 2 edicts have an icon file of their own in the game).
- [ ] **4 new authority icons** (`Auth_cyber_dictatorial_collectivist_*`) are not in the authorities bingo yet: new task T2406; the bingo smoke check ignores them until then.

## P25.22 — Difference report against the simulator data (2026-11-23)
- [ ] **Format**: one Markdown file per data set in `reports/stellaris-pc-4.5.4/` (differences table, simulator-only items, game-only items, matched items without differences), a `README.md` summary and `summary.json`; written by `tools/extract/report_differences.py`, committed so the owner can read them on GitHub.
- [ ] **Matching** of simulator items to game items: simulator id in snake_case with the game prefix, then English name (from the `en` texts of `js/i18n-*.js`), then icon only for items without an English name. A wrong match by name is possible (e.g. 104 of the 153 buildings matched by name); the table shows how each pair was matched.
- [ ] **What counts as a difference**: a simulator value equal to a game value under a condition (nomadic cost, gestalt or fallen empire jobs, triggered outputs) is not one; names that contain each other ("Continental" / "Continental World", "Anglers / Marine Machines" / "Anglers") are not one; icons are only compared within the same folder (the origins use other art in the simulator). Job amenities are divided by 100 (`planet_amenities_add` is per pop: politician 300 = 3 in the simulator).
- [ ] **Job swaps** of the game have no outputs in the generated data, so a simulator job matched to a swap (e.g. `priest`) only compares name and icon.
- [ ] **Simulator data sources**: the civics and origins lists are `PRINCIPLE_BINGO` / `ORIGIN_BINGO` of `js/bingo-items.js`; the technologies are the ones the simulator data refers to (3); the policy groups come from `getPolicyGroup()` of `js/policy-data.js` (they are not exported as a list).

## P25.20 — Localised names in every game language (2026-11-22)
- [ ] **Names only**: `data/generated/stellaris-pc-4.5.4/localisation/<language>.json` holds `{set: {id: name}}` for the 10 game languages (about 0.4 MB each), including the swaps, options and categories inside the sets. Descriptions stay English-only in the set files (P15 only needs the names, T1502); they can be added the same way if the owner wants them.
- [ ] **Missing translations stay `null`** (no English fallback), so P15 can tell an untranslated name from a translated one.

## P25.11 — Civics and origins extractor (2026-11-22)
- [ ] **In-game order of the origins** (`game_order`, for T2402) = their definition order in `common/governments/civics` (`00_origins.txt`, then `01_origins_non_playable.txt`): the files have no sort key, and the empire creation screen lists them as loaded. To be checked in game.
- [ ] **Two sets**: `civics.json` (281) and `origins.json` (77, `is_origin = yes`), from the same folder. Origin icons go to `origin_icons/` (game texture name, e.g. `Origins_default.png`) and the origin pictures (`picture = GFX_origin_x`) to `origins/`, named after the sprite as that folder already does; Prosperous Unification uses `GFX_evt_metropolis`, so its picture would be a new `GFX_evt_metropolis.png` next to the existing `GFX_origin_default.png`.

## P25.10 — Designations extractor (2026-11-22)
- [ ] **Designation icons go to a new `designations/` folder** named after the sprite (`colony_type_mine.png`, 44 files: several designations share one icon, e.g. Nest World uses `colony_type_urban`). StellarisAssets only had `resources/Colony_type_habitat.png`, which the site does not use; it is left as it is.

## P25.8 — Buildings extractor (2026-11-22)
- [ ] **`cost` / `upkeep` / `produces` summaries** (buildings, jobs and the next sets) are the amounts of a regular empire: unconditional entries plus the ones whose only condition is `is_nomadic = no` (the `nomadic_cost_switcher` inline script puts every building cost behind it). All entries, with their conditions as text, stay in `resources`.
- [ ] **Jobs of a building** are read from the `job_<id>_add` statements of `planet_modifier` (`jobs`) and of each `triggered_planet_modifier` (`jobs_conditional`, with the condition as text). The amounts are the game numbers as written (e.g. `foundry = 200`), not divided into jobs.

## P25.6 — Technologies extractor (2026-11-22)
- [ ] **Generated data is committed** in `data/generated/stellaris-pc-4.5.4/` (the simulator will read it, T2523): it holds the English names and descriptions of the game localisation, as the site already shows game texts; the game files themselves are never committed.
- [ ] **"Event" technology** = not a start technology, not repeatable and `weight = 0` (never drawn as a research option; events, anomalies, relics or other effects give it). 99 technologies in 4.5.4. The game has no explicit flag for it.
- [ ] **DLC** of a technology: the DLC names of `host_has_dlc` and of the `has_<dlc>_dlc` scripted triggers (resolved through `common/scripted_triggers`) found in its `potential`, as the game writes them ("The Machine Age"); a DLC named inside a `NOT` is listed too (the `potential` text tells the rest).
- [ ] **Cost**: the number written in the file with the `@tierXcostY` variables resolved; the 10 technologies with `cost = { factor = ... modifier = {...} }` keep `factor` as the cost and the modifiers as text (`cost_modifiers`). The game's cost scaling (empire size, research speed) is not applied.
- [ ] **Technology swaps** (`technology_swap`, e.g. the Wilderness versions) are kept inside their technology (`swaps`), with their own icon when `inherit_icon = no`.
- [ ] **Icons** go to the new `technologies/` folder of StellarisAssets with the game texture name (`tech_basic_science_lab_2.png`), plus the category icons (`category_computing.png`): 812 files.
- [ ] **Never a smaller icon**: when StellarisAssets already has a bigger image for an icon (many come from the wiki, e.g. civics 48 px against 29 px in the game), the exporter keeps it and lists it as `kept_larger`; it only replaces an icon by one of the same size or larger.

## P24.4 — Authorities bingo (2026-11-22)
- [ ] **Every icon is its own cell (75)**: the file names read `Auth_<authority>.png` (10 base authorities: democratic, oligarchic, dictatorial, imperial, corporate, hive mind, machine intelligence, mutualistic intelligence, memory aggregator, neural chorus) and `Auth_<path>_<authority>_<variant>.png` for the ascension variants: `bio` × cloning / evopred / mutation / purity (6 authorities incl. hive), `cyber` × collectivist / individualist (5 non-gestalt) and integrated / volitional (hive), `cyber_creed` (5 non-gestalt), `synth` × physical / virtual (5 non-gestalt), `shroud` × corporeal / transcendent (7 incl. hive and machine). Each variant looks different in game and is a different way to have played, so it is a separate cell instead of being merged into its base authority. If the owner prefers a short bingo, the 10 base cells alone are the first row (filter by the absence of tags).
- [ ] **Meaning of the variants guessed from the file names** (path = ascension path: bio → biological, cyber → cybernetic, cyber_creed → the Cybernetic Creed origin, synth → synthetic, shroud → psionic; the variant words as they are). It must be checked against the game files (`common/governments/authorities`, T2512).
- [ ] **Names are drafts**: only the 7 base authorities of the simulator had names (moved from `js/i18n-simulator.js` to `js/i18n-empire-names.js`, unchanged). Mutualistic Intelligence, Memory Aggregator, Neural Chorus and the 13 variant labels (`authorityVariant*`, e.g. "Biological: cloning") are drafts in es/en/jp in `js/i18n-bingo.js`, to be replaced by the official localisation (new task T2405).
- [ ] **Engine**: items may have their own `id` (marks, order) and a `variantKey` shown in brackets after the name, because the variants share the name of their base authority. Layout `ordered`, 10 columns in the PNG (the first row is the 10 base authorities), small cells (`iconSize` 70) with the name as tooltip, as the civics. Tags: the ascension path (`biological`, `cybernetic`, `synthetic`, `psionic`).
- [ ] **Texts to review**: `bingoTypeAuthorities` (Autoridades / Authorities / 統治形態) and the draft description `bingoAuthoritiesDescription`; PNG file `bingo-autoridades-stellaris.png`.

## P24.3 — Ethics bingo (2026-11-22)
- [ ] **Shared wheel**: `ETHIC_WHEEL` (positions) and `ETHIC_ICONS` moved from `js/empire-data.js` to the new `js/ethic-wheel.js`, which `empire-data.js` re-exports; the bingo builds its `shape` layout from it, so both wheels always match. The simulator's round buttons are not reused: the bingo keeps its square cards with the name visible under the icon (`iconSize` 90).
- [ ] **Names moved**: the 17 `ethic*` names moved from `js/i18n-simulator.js` to `js/i18n-empire-names.js` (loaded by both pages), so the bingo page does not download the simulator texts. No text changed.
- [ ] **Texts to review**: `bingoTypeEthics` (Éticas / Ethics / 倫理観) and the draft description `bingoEthicsDescription`; the file name of the PNG is `bingo-eticas-stellaris.png`.
- [ ] **Tags**: `fanatic` for the 8 fanatic ethics, `gestalt` for gestalt consciousness.

## P24.1 — Generic bingo engine (2026-11-22)
- [ ] **Data split**: `BINGOS` (the bingos) is in `js/bingo-data.js`; the origin and civic item lists moved to the new `js/bingo-items.js`, because the simulator (`empire.js`, `planet-library-ui.js`) imports them and must not load the bingo page texts (the i18n audit requires it).
- [ ] **Layouts**: `grid` keeps the array order, fills the screen with as many columns as fit (as before) and uses `columns` (9) only in the PNG; `ordered` follows `order` (list of i18n keys; unlisted items go last) and otherwise works like `grid`; `shape` puts each cell at `cells[key] = [row, col]` on screen and in the PNG, and hides items without a position. Origins use `ordered` with the current list order (assumed to be the in-game order); civics use `grid`.
- [ ] **`iconSize`** is the minimum cell width in px (110 origins, 58 civics); on mobile it is 80% of it (88 and 46.4 px; it was 46). Below 80 px the board also gets the tighter gaps and padding the civics had.
- [ ] **Description**: each bingo has a one-line description under the controls (new, small and muted; the only visible change). The texts are drafts in es/en/jp to review (`bingoOriginsDescription`, `bingoPrinciplesDescription`). `bingoTypeEmpty` now says "this bingo has no tiles yet" instead of naming the civics.
- [ ] **Tags and DLC**: civics get a tag from their icon name (`corporate`, `hive`, `machine`); no DLC is filled in yet (it needs the game data). Both are written on the card as `data-tags` / `data-dlc`, unused for now.
- [ ] **Selector**: the options are built from `BINGOS`, so the browser no longer restores the last selected bingo after a reload (it opens on the first one); the marks are now kept per i18n key instead of per position.

## P23.10 — Shared modal helper (2026-11-22)
- [ ] **New module `js/modal.js`** (`openModal(overlay, { focusables, initialFocus, onCancel, onKeyDown, onClose })`, returns `close()`), used by `confirmChoice()` and `promptText()` (`js/confirm-dialog.js`) and the wiki image lightbox (`js/app.js`). The dialogs are still built on the fly and removed on close; the lightbox stays in `index.html` and only its `hidden` flag changes.
- [ ] **Unified details** (no visible change): the Tab trap always moves the focus itself (the confirmation dialog only did it at the first and last button; inside it the result is the same); the focus goes back to the opener only if it is still in the page (as the lightbox did); the lightbox now handles Escape in the capture phase and stops it, like the dialogs, and its keydown listener only exists while it is open.
- [ ] **New smoke checks**: Tab / Shift+Tab wrap, Escape and click outside in both dialogs, the validation message of `promptText()`, and closing the lightbox by clicking outside the image or on ×.

## P23.9 — Shared simulator text helpers (2026-11-22)
- [ ] **New module `js/sim-text-helpers.js`** (`sign`, `num`, `pct`, `swapJobI18nKey`, `resourceName(lang, id)`, `jobName(lang, id)`), imported by `edicts-ui.js`, `branch-offices-ui.js`, `job-swaps.js` and `planet-sim-text.js` (where `planet-sim.js`'s copies went in P23.3; it keeps `jobName(id)` / `resourceName(id)` in the page language as one-line wrappers). It only imports `i18n.js` and `planet-data.js`, so the Edicts tab does not pull in the simulator.
- [ ] **Unified fallbacks**: a job without a JOBS entry is named by its built key everywhere (before, only the Sucursales tab and the job swap conditions did; the other places would have thrown); a non-resource id is shown as is (the Sucursales tab keeps its "naval capacity" / "all research" names for its two owner effects). No text shown today changes.
- [ ] **Not merged**: `signed` in `planet-sim-conditions-ui.js` (spaces after the sign, `formatAmount`), `sign` in `planet-sim-body-tab.js` (ASCII minus) and `signedPercentText` in `empire.js` format differently; merging them would change the text shown.
- [ ] **Preload**: the new module is found at the third import level, so it joins the `modulepreload` list of P23.8 (the smoke test now requires 2 fetch rounds, so a new deep module without its preload fails).

## P23.8 — WOFF2 font and simulator modulepreload (2026-11-22)
- [ ] **Font**: `fonts/Orbitron-VariableFont_wght.woff2` made from the TTF with fontTools (same 266 glyphs and the `wght` axis); `@font-face` lists it first and keeps the TTF as fallback. Every page downloads 15.4 KB instead of 37.1 KB (19.5 KB if the server gzips the TTF).
- [ ] **Preloaded modules**: the chain named in the task (`policy-data.js` → … → `civic-rules.js`) no longer exists after the P23.3 split; the simulator now has 4 import levels (`planet-sim.js` → `planet-sim-state.js` → `job-swaps.js` → `job-swap-data.js`). The 15 modules the browser only found at level 3 or 4 have a `<link rel="modulepreload">` in `planet-sim.html`, so it finds every module in 2 rounds. Level-2 modules are not preloaded (they are found in the first round of imports anyway). The other pages (3–4 levels, 5–10 small modules) get no preloads.
- [ ] **Budget script fixed**: `tests/load-budget.mjs` missed side-effect imports (`import "./i18n-wiki.js"`), so since P23.4 it did not count the `i18n-<area>.js` files; with them the simulator downloads 52 modules, 1339.5 KB raw / 361.8 KB gzip (index 421.5 / 109.8, bingo 187.2 / 56.0). It now also counts only the first font of each `@font-face` (the one browsers download) and fails if a preloaded module is not in the page's graph.

## P23.7 — Dead code removed (2026-11-22)
- [ ] **Removed, used nowhere**: `REGULAR_BODY_RULES` (`body-type-data.js`: capacity 400, standard layout and size range 12–25 / moons 10–15 of regular planets; the size tooltip text keeps the ranges), `BRANCH_OFFICE_NEW_JOBS` (`branch-office-data.js`, a note of the jobs added in P19.3), `designationUnmetRules()` (`designation-data.js`), `getSelectedPolicies()` (`empire.js`), `getScenarioA()` (`scenario-compare.js`), and the i18n keys `planetSimComingSoonGeneric` and `breakdownEmpireFlat` (es/en/jp).
- [ ] **`export` dropped** from 24 functions and constants only used inside their own file (data-version, job-swaps, policy-data, stacking-rules, stockpile-timeline, scenario-compare, page shell `setLanguage`, `getStoredLang`...). The four exports the smoke test imports (`compareSnapshots`, `projectStockpile`, `exhaustionMonth`, `timelineRows`) stay. No module imports a name it does not use.
- [ ] **i18n keys**: the 150 keys no source names literally are built at run time and all reachable (job swap names `job<Id>`, `effect_<label>`, `modifierSourceKind_<kind>`, `planetModifierGroup_<group>`, `featuresPerJobCategory_<category>`, `policyGroupNote_<group>`, `edictLine_<stat>`, the conditions source tooltips); every other key appears as a string in a script or in a `data-i18n*` attribute.
- [ ] **CSS**: no unused selector (see P23.5); the bingo mobile rules that never apply are T2212.
- [ ] **Files of `img/` that nothing references** (not deleted; delete them or tell what they are for): `img/discord.png`, `img/twitch icon.png`, `img/youtube icon.png`, `img/Wallpaper banner.png`, `img/we want you.jpg`, `img/naves/Crucero portahangares con defensas de corto alcance.png`, and in `img/ui/`: `blocker_frame_red.png`, `building_slot_bg.png`, `building_slot_used_bg.png`, `Colony_type_automated.png`, `Diplomacy_opinion.png`, `Diplomacy_restore_community.png`, `Faction_support.png`, `Focus_core.png`, `Focus_development.png`, `Job_clerk.png`, `Menu_icon_leaders.png`, `Menu_icon_technology.png`, `Menu_icon_traditions.png`, `No.png`, `Yes.png`.

## P23.6 — Smoke test split by area (2026-11-22)
- [ ] **`tests/policies-smoke.py` stays the only entry point** (same command, same output) and runs the 13 area files of `tests/smoke/` in order; helpers shared by several areas (`check`, `approx`, simulator actions such as `tab`, `net`, `ethic`, `body`) are in `tests/smoke/common.py`. The code of every check moved as it was: the run gives the same 483 checks in the same order.
- [ ] **The simulator areas are not independent**: they share one page and each starts from the state the previous one leaves (as before the split). Making them independent (each one reloading a clean planet) would change what they check, so it was left for later if wanted.

## P23.5 — styles.css organised by page and component (2026-11-22)
- [ ] **One file, nine numbered sections** with a table of contents at the top (base and tokens, page shell, wiki, legal pages, shared mobile layout, bingo, simulator, simulator mobile layout, reduced motion). Rules were not reordered beyond moving the footer into the shell section: in CSS a later rule with the same specificity wins, so moving blocks can change the look; the computed style of every element of every page (desktop and 375 px, every simulator tab) was compared before and after and is the same.
- [ ] **New colour tokens** in `:root` for the colours used more than once: `--danger`, `--warning`, `--caution`, `--muted-dim`, `--panel-shade`, `--accent-tint`, `--accent-faint`, `--grid-line`, `--shadow-modal`. Colours used once stay literal.
- [ ] **No unused selector found**: every class and id of `styles.css` is named in an HTML or JS file (also the ones built as `is-${...}`). Found instead: the mobile rules of the bingo grid never apply (overridden by later base rules); kept as they are and added as T2212, since fixing them changes the mobile look.

## P23.4 — Split of js/i18n.js by area (2026-11-22)
- [ ] **Areas decided by usage**: a key belongs to the only page area whose sources name it (wiki, bingo, simulator, tech tree, legal pages); keys named by several pages go to `i18n-common.js` (7 header/footer keys), except the 280 origin and civic names used by both the bingo and the simulator, which got their own area `i18n-empire-names.js` so the wiki and legal pages do not load them. The 152 keys no source names literally (built at run time: job swap names, effect and modifier source labels...) went to the simulator; T2307 checks which are really dead.
- [ ] **Legal pages are an area of their own** (`i18n-legal.js`, privacy, cookies and 404) although the task listed five areas, and the tech tree got its own page script `js/tech-tree.js` (it used `legal.js`) so it loads only its texts.
- [ ] **How areas load**: `js/i18n.js` keeps the API and always merges `i18n-common.js`; every other area file calls `addStrings()` when imported, and each page script imports its areas (the five simulator page scripts all import theirs, so none depends on the script order). Download: wiki 846 → 426 KB, bingo 571 → 152 KB, legal pages ~533 → 116 KB, simulator 1346 → 940 KB raw (`node tests/load-budget.mjs .`).
- [ ] **Comments of `i18n.js` and the section comments** (`// privacy.html`, `// bingo.html`...) stayed with the first key that followed them; the header of `i18n.js` is now in English.

## P23.3 — Split of js/planet-sim.js (2026-11-22)
- [ ] **16 flat modules `js/planet-sim-*.js` instead of a folder**, same naming as the other simulator files; the split was mechanical (every top-level function moved as it was, only imports/exports added). The Planet tab is too big for one renderer, so it has one view per panel (planet-ui, catalog-ui, jobs-ui, production-ui, conditions-ui); the Celestial body and Branch offices tabs have their own (`body-tab`, `branch-tab`); the other tabs already had their modules (`empire.js`, `celestial.js`, `edicts-ui.js`, `planet-library-ui.js`).
- [ ] **Values that several modules reassign live in one object** `sim` of `planet-sim-state.js` (active sub-tab, district filter, capital tier, designation, size, target slot, civilians, Neural Chips, catalog signature, user size): an imported `let` cannot be assigned from another module. Constants, Maps and Sets are imported as they are; the language is read with `getLang()` of the page shell.
- [ ] **`planet-sim.js` stays the page entry and keeps its exports** (`showNotice`, `capturePlanetConfig`, `applyPlanetConfig` are re-exported) so `planet-library-ui.js` and saved pages do not change. The swapped jobs are now registered in `planet-sim-state.js`, the first simulator module evaluated.

## P23.2 — Shared page shell (2026-11-22)
- [ ] **The shell is a module, the markup stays in the HTML**: `js/page-shell.js` keeps the language, applies `data-i18n` / `data-i18n-attr` (several `attr:key` pairs separated by `;` on every page now), `<html lang>`, Open Graph and `aria-pressed`, and listens to the language buttons once; page scripts read `getLang()` and redraw in `onLanguageChange()`. The header and footer are not generated by JavaScript, so they show before any script runs and the 404 page (which injects its script late) keeps them; their markup is now the same on every page.
- [ ] **Markup unified**: every language button has `lang` and `aria-label` (as the simulator already had), the brand link of the legal pages and the 404 has the translated `aria-label`, and the simulator header and footer moved out of `<main>` (the wrapper is a `<div class="terminal-shell">`, same look). The footers keep their per-page links.
- [ ] **Index translated by `data-i18n`** instead of `applyStaticStrings()` by element id; the footer text is plain text in every language (the Spanish default had an `aria-hidden` middle dot that JavaScript already replaced). The dead meta-description fallbacks of `bingo.js` and `planet-sim.js` and the unused `#intro-prompt-text` lookup of `app.js` are gone.

## P23.1 — Refactoring audit of the whole site (2026-11-22)
- [ ] **Duplicated page shell**: header, language buttons and the `data-i18n` / `data-i18n-attr` sweep are copied in `legal.js`, `bingo.js`, `planet-sim.js` and (by element id) `app.js`; five simulator modules listen to the language buttons on their own. Kept in T2302 (shared shell), with the details noted there.
- [ ] **Duplicated helpers**: the sign/number/percent formatters and the resource/job name lookups exist in three simulator modules → new task T2309. The modal scaffolding (overlay, Escape, focus trap, focus return) exists three times (`confirmChoice`, `promptText`, wiki lightbox) → new task T2310.
- [ ] **Oversized modules**: `i18n.js` (424 KB, T2304), `content.js` (280 KB), `planet-sim.js` (229 KB, T2303, with an ~850-line `computeTotals()`), `planet-data.js` (107 KB), `styles.css` (65 KB, T2305), `tests/policies-smoke.py` (142 KB, one 1400-line function, T2306). **`content.js` and `planet-data.js` are not split**: they are data, the wiki search needs every article loaded at once, and splitting them would only add requests.
- [ ] **Dead code** found by a scan of exports and top-level functions: four exports used nowhere and ~25 exports used only in their own file (listed under T2307); no unused top-level function and no JS file outside every page graph.

## P22.9 — Load performance (2026-11-22)
- [ ] **Measured with `tests/load-budget.mjs`** (static import graph + stylesheet + font + local images in the HTML; raw / gzip): wiki 845 / 227 KB, bingo 571 / 165 KB, simulator 1346 / 363 KB (33 modules), tech tree and legal pages ~533 / 156 KB, 404 3 / 1 KB. `js/i18n.js` (424 / 119 KB) is ~75% of every page except the simulator and the wiki, where `content.js` (280 / 61 KB) and `planet-sim.js` (229 / 58 KB) follow. Splitting `i18n.js` per page is already T2304.
- [ ] **Only lazy-loading was added**: the 12 static heading icons of the simulator tabs hidden at start (Library, Empire, Celestial body, Edicts, Branch offices) and the ethics/authority icons of the Empire tab. Every other script-created image was already lazy; the bingo keeps `eager` where the PNG download needs the images.
- [ ] **No module was removed from any page**: every module in each graph is used by that page. `ads.js` + `ads-config.js` (~2 KB) stay on the wiki so ads can be turned on by config alone.
- [x] **Done in T2308**: the Orbitron font as WOFF2 (needs the `brotli` Python package, not installed) and `<link rel="modulepreload">` for the simulator's five-level import chain.

## P22.8 — Page metadata of every page (2026-11-22)
- [ ] **Same metadata on every page**: `<title>`, description, PNG favicon (it was declared `image/x-icon` but the file is a PNG), `theme-color`, Open Graph (`og:type`, `og:site_name`, `og:title`, `og:description`, `og:locale`, `og:image`), `twitter:card` and `rel="canonical"`. The 404 page gets a description (new key `notFoundMetaDescription`), `theme-color`, Open Graph and `noindex`, but no canonical or `og:image`. The index title and description are now also marked with `data-i18n` / `data-i18n-attr`.
- [ ] **`og:title`, `og:description` and `og:locale` follow the language** through `syncSocialMeta()` in `js/i18n.js` (es_ES / en_US / ja_JP), called by `app.js`, `bingo.js`, `planet-sim.js` and `legal.js`. Crawlers that do not run JavaScript see the Spanish text.
- [ ] **Canonical and `og:image` are relative** (`bingo`, `./`, `img/Ignis Stellaris.png`) because the production domain is not in the repository. Social crawlers need absolute URLs: once the domain is known, replace them with `https://<domain>/...` and add `og:url`. The image used is `img/Ignis Stellaris.png`; pick a 1200×630 card if you want a better preview.

## P22.7 — i18n review of the wiki, bingo and legal pages (2026-11-22)
- [ ] **Audit tool** `tests/i18n-audit.mjs` (`node tests/i18n-audit.mjs .`): checks that es/en/jp of `js/i18n.js` have the same 2048 keys, that every key used by `data-i18n*`, `t(...)` and the bingo data exists in the three languages, and lists the articles of `js/content.js` without a translation. No hard-coded interface text was found in the wiki, bingo, legal, 404 and tech tree pages (the Spanish text in the HTML is the default that `applyStaticStrings()` / `js/legal.js` replace), so no code changed.
- [ ] **Articles of `content.js` without an English and a Japanese translation** (their `i18n` has empty `en: {}` / `jp: {}` placeholders, so they show in Spanish in every language; not machine-translated, they need a human translation): `diseño-flotas-fauna-espacial` (39 blocks), `flotas-contra-crisis` (43 blocks), `lista-de-deseos-ignis` (hidden easter egg, 4 blocks). The other 12 articles have en and jp with the same number of blocks as the Spanish one.

## P22.6 — Accessibility pass of the other pages (2026-11-22)
- [ ] **`<html lang="ja">` for Japanese** (new `htmlLangCode()` in `js/i18n.js`): the site's own code stays `jp` (buttons, storage, `strings.jp`), but "jp" is not a language tag, so screen readers did not switch to Japanese. Applied to the simulator too, for consistency.
- [ ] **A Japanese browser (`ja-JP`) now opens the site in JP**: `detectInitialLang()` compared "ja" with "jp" and fell back to Spanish.
- [ ] **Landmarks**: `<main>` used to wrap the whole page (header and footer included). The page wrapper is now a `<div>` (same classes), the header and footer are outside `<main>`; on the legal pages and the 404 the language bar is the `<header>` and the eyebrow + title moved into `<main>` (class `legal-heading`, same look).
- [ ] **Wiki images and quote portraits are buttons** (`entry-image-zoom`, `entry-quote-zoom`) so the lightbox opens with the keyboard; the lightbox is a modal dialog (new key `a11yImageViewer`), focus goes to Close, Tab stays on it and closing returns focus. Images without alt text get "Enlarge image" (new key `a11yZoomImage`).
- [ ] **ARIA fixes**: the "online" indicator gets `role="status"`; the entry count uses a hidden text label instead of `aria-label` on a `<span>`; the inline ad slot is an `<aside>`.
- [ ] **Contrast**: the search placeholder goes from #5c7765 (3.8:1) to #6f8c78 (5:1); everything else passed. The highlight colours of `js/highlight-config.js` were left alone (owner's palette, new task T2211).
- [ ] **Visible focus on the wiki search**: the search box shows the focus ring on its frame (the input itself has no outline).
- [ ] **Brand link at least 24 px tall** on mobile (with `lang="ja"` it measured 23 px).

## P22.5 — Mobile layout of the other pages (2026-11-22)
- [ ] **No page overflowed sideways** at 320/375 px in es/en/jp; the only issue was **tap targets under 24 px** (WCAG 2.5.8): header nav links (13 px tall), footer links and the wiki search box. Under 700 px they now get at least 24 px of height (desktop unchanged).
- [ ] **Wiki on mobile scrolls to the article** after tapping an index entry (the article is below the whole index in the one-column layout). Only for index taps under 700 px; opening by URL or the back button does not scroll.

## P22.3 — Legal pages, 404 and tech tree placeholder QA (2026-11-22)
- [ ] **404 at nested paths**: Vercel serves `404.html` for any missing URL keeping the path, so at `/a/b/missing` its relative `styles.css` and `js/legal.js` resolved to `/a/b/…` and the page showed unstyled and untranslated. It now adds `<base href="/">` (only over http/https, so it still works from disk) and injects the stylesheet, icon and script after it. Without JavaScript the 404 page is unstyled.
- [ ] **`hasAdConsent()` returns false** (was true) until a CMP is integrated: setting `adsConfig.enabled = true` alone no longer loads AdSense without consent. Activating ads now needs the CMP check too.
- [ ] **Tech tree placeholder translated**: new keys `techTreePageTitle`, `techTreeMetaDescription`, `techTreeHeading` ("Tech Tree" in every language, like the nav) and a proposed "under construction" line `techTreeComingSoon` (es/en/jp).

## P22.2 — Bingo QA (2026-11-22)
- [ ] **Icons requested with CORS** (`crossOrigin="anonymous"`): without it the remote icons tainted the canvas and the PNG download failed silently. This relies on the asset API (GitHub Pages) sending `Access-Control-Allow-Origin: *`; if a future host does not, the icons would stop showing (could not be checked from here: no network access).
- [ ] **The download no longer hangs on a missing icon** (it waited forever for an image that had already failed); the missing cell is drawn empty in the PNG.
- [ ] **A missing icon shows the name on its card** (class `is-image-missing`) instead of a broken image.
- [ ] **Download error message** (new key `bingoDownloadError`, shown under the controls in a `role=status` line) if the PNG cannot be generated.
- [ ] **PNG title from `bingoHeading`** (upper case) instead of a hard-coded es/en/jp map; same text as before.
- [ ] **The grid starts from the select value**, so a browser that restores the select after a reload no longer shows origins under "Principles".

## P22.1 — Wiki QA (2026-11-22)
- [ ] **Easter eggs need 3+ characters for partial matches**: a query revealed an easter egg if any trigger *contained* it, so typing "a", "s" or "3" listed every secret entry. Now a query shorter than 3 characters only reveals one when it contains a whole trigger (e.g. "30"); "mugan", "wishlist" or "clase 30" still work.
- [ ] **Triggers of a translation count**: the JP translation of "Singularidad de clase 30" had its own `triggers` (特異点, クラス30) that were ignored; triggers in `i18n.<lang>` are now added to the original ones (in every language). Its stray `hidden`/`icon` fields in the JP translation were removed (unused).
- [ ] **Fixed EN/JP title of "Diseño de flotas mecánicas"**: it was a copy of the titans article title ("About titans and their auras"). Proposed: EN "Mechanical Fleet Design", JP "機械艦隊の設計" (same pattern as 生体艦隊の設計). The article text was already the right one.
- [ ] **Translated quotes get the portrait of the Spanish one** (MUGANI, Class 30 Singularity), with EN/JP `portraitAlt` "Prethoryn Queen" / "Contingency" / "コンティンジェンシー".
- [ ] **Missing images show a notice** ("Image not available: <alt>", new key `imageMissing`) instead of a broken image; a missing quote portrait is just hidden.
- [ ] **Hashes**: only `#/slug` opens an entry; other hashes (the skip link's `#archivo`) no longer close the open article.
- [ ] **Search marker** ignores accents like the search itself ("dano" marks "daño") and, like the word colours, never touches tags, attributes or entities (searching "color" or "https" used to break the coloured words and links).
- [ ] **Renamed `img/bionaves/Tejedor de apoyo con evasion y dano de largo alcance..png`** (double dot) so the article finds it.

## P13.9 — Landmark aria-labels of the other pages translated (2026-11-21)
- [ ] **Also `404.html` and `tech-tree.html`**: they use the same `js/legal.js` and had the same hard-coded Spanish labels, so they were included.
- [ ] **New keys** `a11yOnlineStatus`, `a11yArchiveExplorer`, `a11yKnowledgeNav`, `a11yEntryCount`, `a11yAdSlot`, `a11yLegalNav`, `a11yCloseImage`, `a11yBingoGrid`, with proposed EN/JP translations (e.g. JP "ビンゴのマス", "広告用の予約スペース"); the header, home link, projects nav and language switch reuse the P13.4 keys.
- [ ] **`js/app.js` now applies `data-i18n-attr`** (single "attr:key" pair, like `js/legal.js` and `js/bingo.js`).

## P13.8 — Data texts moved to i18n keys (2026-11-21)
- [ ] **English in es, en and jp** for the 253 new keys (planet modifier not-modelled effects and sources, body type info lines, job swap names, unmodelled swap conditions and not-modelled swap effects) until the official localisation (P15).
- [ ] **Key names**: `<modifier i18nKey>NotModelled<n>` / `<modifier i18nKey>Source`, `bodyInfo<Body><n>`, `job<PascalCase swap id>` (the name already used by modelled swaps), and `swapReq…` / `swapNotModelled…` built from the first words of the English text.
- [ ] **Data fields renamed** so raw text cannot slip back in: `notModelledKeys`, `sourceKey`, `infoOnlyKeys`; swaps lose `name`; `um(kind, i18nKey)` like the other unmodelled requirements.
- [ ] **Body type info lines are now shown**: they were in the data but displayed nowhere; they appear in the tooltip of each body card in the Cuerpo celeste tab under "Not computed by the simulator:" (English label, like the other planet-modifier labels).
- [ ] **Colonial Spirit / Fresh Consciousness**: the not-modelled effect that the wiki import had split at a comma inside parentheses ("+10% Pop growth or assembly speed (Pop growth speed, Mechanical pop assembly speed)") is one line again. No figure changed.
- [ ] **Swap not-modelled effects stay hidden** (as before): they are now keys, but no screen lists them yet.

## P13.4 — Accessibility pass (2026-11-21)
- [ ] **Scope: the planet simulator only** (`planet-sim.html`); the wiki, bingo and legal pages still have hard-coded Spanish landmark labels (new task T1309).
- [ ] **WAI-ARIA tabs pattern** for the main tabs and Buildings/Districts: `role=tab`/`tabpanel`, `aria-selected`, roving `tabindex` (only the active tab is in the Tab order), Left/Right (also Up/Down), Home and End move between tabs and **activate them at once** (automatic activation, as the panels render instantly).
- [ ] **Screen-reader labels** for the "−"/"+" district and job buttons name the district or job ("Remove one district: City district", "More Clerks staffed"); the count control is a labelled group with the built count; specialization selects, the empire name field, the species select and the planet name field get labels; landmark labels follow the language.
- [ ] **Language buttons** keep the visible "ES/EN/JP" but are read as their own language names (Español, English, 日本語), not translated.
- [ ] **Reduced motion**: with `prefers-reduced-motion: reduce` every transition and animation is turned off.
- [ ] **Not changed**: colours and contrast (the terminal palette is part of the design; no audit tool run), focus styles (the global `:focus-visible` outline was already there), the confirm dialogs (already trap focus, close with Escape and return the focus).
- [ ] **Districts catalog on mobile**: the new Districts check showed long specialization names widening the cards past 320 px; the cards now shrink and the selects are capped at the card width.

## P13.1 — Mobile layout review of all tabs (2026-11-21)
- [ ] **Target width 320 px** (the page's `min-width`): every tab is checked by the smoke test to never scroll sideways at that width.
- [ ] **Wide tables scroll inside their panel**: the A/B comparison and the monthly stockpile tables get their own horizontal scroll instead of being reflowed into cards.
- [ ] **Under 700 px**: tighter panel and tab padding, a smaller ethics wheel (2.8rem cells instead of 3.4rem), header stats laid out as label/value rows, and the summary bar selects shrink to the screen width.

## P12.3 — Empire-level tabs marked as saved with the empire profile (2026-11-21)
- [ ] **Proposal applied as is**: Imperio and Edicts get the government category icon (`modifiers/mod_cat_government.png`, the same as the Imperio tab icon) at 18 % opacity as background, a shared 3 px gold accent line (`#d8b45a`, distinct from the active-tab accent) and the tooltip "Saved with the empire profile" (es/en/jp).
- [ ] **Library tab not marked**, although it lists saved empires: it holds planets too, and it is not where the empire is edited.

## P12.2 — UI icons by in-game meaning (2026-11-21)
- [ ] **Government category icon** (`modifiers/mod_cat_government.png`) for the Imperio tab, the empire profile, saved empires and civics (no generic civic icon exists); authorities keep `Icon_council`.
- [ ] **Branch offices** use `modifiers/mod_branch_office_value_mult.png` (was `Faction_support`); **species type** uses `Icon_pop` (was `Colony_type_automated`); **ethics** use `modifiers/mod_ethic_attraction_mult.png`; **jobs summary** uses the generic `Pop_job` (was the specific `Job_clerk`).
- [ ] **Celestial body** tab and heading use `planets/Planet_continental.png` as a generic planet (was `Focus_core`, a council focus icon).
- [ ] **Production** uses `Empire_economy`; **stockpile timeline** uses `modifiers/mod_cat_economy.png`; **conditions** use `resources/Stability.png`; **policies** heading uses `Menu_icon_policies` (the in-game Policies & Edicts menu; single policies stay text-only).
- [ ] **No matching icon → text-only**: the A/B comparison and active modifiers headings lost their loose icons (`Focus_development`, `Menu_icon_traditions`).
- [ ] **Left unused** in `img/ui/`: `Menu_icon_technology` (nothing in the simulator is about technology; the site nav has no icons), `Faction_support`, `Colony_type_automated`, `Focus_core`, `Focus_development`, `Menu_icon_traditions`, `Menu_icon_leaders`, `Job_clerk`, `Diplomacy_*`. Files not deleted.
- [ ] **Advanced Logic icon** split into T1204 (blocked): the wiki image could not be downloaded from this environment.

## P11.3 — Deficit and stockpile-exhaustion flags (2026-11-21, GDD §6)
- [ ] **Deficit = negative planet net** of a stockpiled resource, even when the empire's other planets or external income would cover it (the simulator only sees this planet).
- [ ] **Exhaustion month = ceil(start / −net)**: the first whole month after which the stockpile is 0; a stockpile starting at 0 is "empty" right away.
- [ ] **Deficit penalties not modelled**: the 4.5.2 *Resources* page could not be read, so the flags only warn and change nothing in the economy or the conditions.

## P11.2 — Monthly stockpile timeline (2026-11-21, GDD §6)
- [ ] **Linear projection of the current planet**: start + net × months; no pop growth, construction, events or monthly changes.
- [ ] **Storage caps not modelled**: the 4.5.2 *Resources* page could not be read (the wiki did not load), so no cap figure is used; stockpiles only stop at 0.
- [ ] **Resources left out**: research (physics / society / engineering), amenities and trade (already converted into other resources by the trade policy). Advanced Logic, strategic resources, nanites and Zro are treated as stockpiles.
- [ ] **Planet net only** (no external empire income, which is not this planet's); starting stockpiles kept in memory only, not saved with the planet or the empire.
- [ ] **Only resources the planet produces or consumes** get a row (plus any with a starting stockpile already entered).

## P11.1 — Scenario A/B comparison (2026-11-21, GDD §6)
- [ ] **A is a pinned snapshot, B is the live planet**: no comparison between two saved planets (that would need running the engine on a second configuration); to compare a saved planet, load it, pin it, then load or edit the other.
- [ ] **Snapshot only in memory**: lost on reload, not saved with the planet nor exported.
- [ ] **Values compared**: planet net resources (without the empire's external income) plus stability, happiness, crime, free housing and pops. "Better" = more of a resource (also for upkeep-only resources), more stability / happiness / free housing / pops, less crime.

## P21 — Job swaps (2026-11-21, GDD §6.1)
- [ ] **Unmodelled swap conditions are never met** (origins, habitability, buildings / zones / features not in the simulator): the swap is listed in "Job swaps not applied", not applied. Opposite of building requirements, where they never block. Otherwise every Wilderness / origin swap (Photosymbiont...) would always apply.
- [ ] **Stacking "save exceptions"**: only the changes listed on the winning job ("With X swap conditions") are added; nothing else stacks.
- [ ] **Weight `null` = 0** for the swaps with no weight on the wiki (event jobs: Subterranean, Dimensional Portal, Vent Researcher, Titan Hunter... and Devoted Adept); ties keep data order.
- [ ] **Angler for any empire**: the wiki Empire column says Individualist, but its condition lists Marine Machines / Maritime Robotics (kept as in P10.10).
- [ ] **Hedonist / Tourist not applied**: civilians are a manual count, not jobs.
- [ ] **Jobs created directly as a swapped job stay as created** (Temple Priests, State Academy Educators, zone Gas Extractors, branch Merchants / Prosperity Preachers); their stacked changes still apply. In the game they may be base jobs that swap.
- [ ] **"A; B" in wiki conditions read as AND**, except where the items cannot hold together (Scrap Miner, Culture Worker, Zookeeper, Science Director, Merchant: one of). Dimensional Portal Researcher read as AND (both unmodelled).
- [ ] **Numistic Priest trade**: wiki +6 output and −2 upkeep stored as net +4.
- [ ] **Pyromancer**: the wiki lists the Death Chronicler block twice; counted once.
- [ ] **Untyped "+1 Research"** of Science Director / Noble Researcher / Tech Visionary / Technophant read as +1 of each research type.
- [ ] **"Job swaps not applied" list** includes a swap when every unmet condition involves an unmodelled one, even if a modelled alternative exists in the same "one of" (e.g. Science Director shows the Quantum Innovation Nexus while Technocracy is not chosen).
- [ ] **Civic job bonuses not modelled** (Catalytic Processing on Artificers / Pearl Divers, robotic founder species): listed as not modelled.
