# Decisions to review

Decisions Claude took on its own while implementing tasks, pending the owner's review. When the owner confirms or changes one, move it to `PLANET_SIM_GDD.md` (as an owner decision) and remove it from here. Newest first.

## T4504 — Testellaris: unity category colour (2026-11-27)

- **Exact value `#b2f8f7`**: the 4.5.4 files declare no colour for unity (`common/strategic_resources` holds none, and `interface/fonts.gfx` has no unity text colour; the concept texts use the generic yellow highlight), so it is read from the resource icon `gfx/interface/icons/resources/unity.dds` (18 × 18): the value of its most opaque light pixels (rgb 178, 248, 247, alpha 252–253). The rest of the icon goes down to a darker turquoise (e.g. `#4ab8b1`); if that reads closer to the game's unity, it is a one-line change in `styles.css` (`.tq-category--unity`). The tint stays at 10 % like the other categories.

## T4503 — Testellaris: readable source of a question (2026-11-27)

- **Wording (proposal)**: es «Sacada de los archivos del juego de Stellaris 4.5.4.» / «Sacada de la wiki de Stellaris (4.5.2), artículo «…».» (feminine, it agrees with «la pregunta»); en "Taken from…"; jp 「Stellaris 4.5.4のゲームファイルより。」. The detail line reads `File: … · key: …` and, for wiki questions, `Section: …` first.
- **Wiki questions checked against the data** (282 of them also cite a file and key, GDD §5.3) get a third sentence, "…, and checked against the game files of Stellaris 4.5.4.", and their detail line holds the section, the file and the key.
- **The detail line** is the same muted colour, at .66 rem (the sentence is .72 rem), on its own line; screen readers read both.

## T4502 — Testellaris: four lifelines, one per category (2026-11-27)

- **Unity lifeline: Enhanced Recycling** (`tr_adaptability_recycling`, Adaptability tradition: Reciclaje mejorado / 再利用強化), chosen because recycling fits "gives back a spent lifeline". Alternatives of the same tree: Adaptability itself (`tradition_adaptability`), Survival of the Fittest.
- **Physics lifeline name: "Deflectors"** (Deflectores / デフレクター), the official name of `tech_shields_1`: the game has no technology called "Deflector Shields", the name the task used.
- **Engineering lifeline: World Cracker** is the colossus weapon (`PLANET_KILLER_CRACKER`); its icon is the one of the technology that unlocks it, `tech_colossus` (Colossi).
- **Enhanced Recycling does not take the question's lifeline slot** (one lifeline per question): it acts on the lifelines, so it can be used on any question before answering while one is spent; the one it gives back still cannot be used twice on the same question. The lifeline it gives back is drawn at random among the spent ones.
- **The names come from the localisation of the installed game** (4.6.0, T2526); `PLANET_KILLER_CRACKER`, `tech_galactic_administration`, `tech_shields_1` and `tr_adaptability_recycling` exist with the same keys in the 4.5.4 data. No new export was needed: the four icons were already in StellarisAssets.
- **Hall of fame check**: with Enhanced Recycling a game can halve two right answers (World Cracker twice) or skip two questions (Galactic Administration twice), never both; `possibleScores` accepts exactly that.
- **End screen**: a lifeline used twice is listed twice under "Lifelines used".

## T4501 — Testellaris question screen layout (2026-11-27)

- **HUD icons (proposal, T2602 style: game icon before the number, the word as alt text and tooltip):** question number → research `text_icons/text_research.png` (`GFX_text_research`, the game's text icon for research: one more question "researched"); score → unity `concepts/concept_unity.png` (the game's unity concept icon: points accumulate like unity). Alternatives: `text_icons/text_traditions.png` for the score, `technologies/` icons for the number.
- **2 × 2 grid from 360 px wide**: at 320 px two columns leave about 130 px per answer and long Japanese answers wrapped into 5–6 lines, so below 360 px they stack in one column.
- **Panel tint**: the category tint (10 % of its colour) over the panel background plus a border in the category colour, 3 px on top; the label above the question stays.
- **Lives**: the ♥ / ♡ characters stay as the heart icons (no game heart icon was found); a visually hidden "2 lives left" text gives the accessible name. On phones the tier and the hearts share the first line and the counters go centred on a second one.

## T2704 — Index and browser of StellarisAssets (2026-11-27)

- **Names are English only**: the data-set name when one uses the icon, else the English localisation of the sprite key (without `GFX_`), the key or the texture name; 5 054 of 18 486 files have one. Localised es/jp names were left out to keep `index.json` small (4 MB); the site's own pages already have them in `js/game-names/`.
- **Index of every image**, also the older or hand-made files no game texture gives (`source: null`, 425 files), so the browser lists the whole repository; the GitHub tree API stays only as a fallback when `index.json` cannot be loaded.
- **The page shows 240 cards at a time** ("Show more") because 18 000 thumbnails at once froze the browser; the search, folder and sort run over the whole index.
- **The smoke test skips comments** of `js/` (examples such as `civics/Civic_x.png`) and accepts the few game sprites without the `GFX_` prefix (`button_left`, `cursor`…).
- **A cached re-run kept no frame warnings** in `manifest.json` (found while writing the index): the cache now stores them per texture.

## T2703 — Full export of the game images to StellarisAssets (2026-11-27)

- **The images come from the installed game, 4.6.0** (Corona Borealis v4.6.0, T2526): there is no copy of the 4.5.4 files, and images carry no figures, so the export was not blocked; `manifest.json` (and the T2704 `index.json`) write `stellaris-pc-4.6.0`. If the project stays on 4.5.4, run `python tools/extract/export_assets.py --game <4.5.4 copy>` again: it rewrites only the files that differ.
- **56 existing files got new pixels** (same size; `resources/Astral_threads.png` grows from 24 to 32 px): 5 `modifiers/`, 39 `planet_modifiers/`, 8 `technologies/` icons whose older copies did not match the game texture. Their names and links did not change.
- **Six pushes**, none above ~110 MB: portrait backgrounds; event pictures; the rest of `interface/`; loading screens, wallpapers, flags, DLC thumbnails and key icons; the icon folders `achievements`–`leaders`; and `megastructure_modules`–`zones` with `manifest.json`.

## T2701 — Plan of the full export of the game images (2026-11-27)

- **What is in**: every image of `gfx/interface/` (icons and the rest of the interface), event pictures, loading screens, flags, the 2D portrait backgrounds of `gfx/portraits/` (city sets, environments, arkships, leader and species preview backgrounds), key icons, DLC thumbnails and wallpapers: 15 099 game files, 18 286 PNG files once strips are split, about 450 MB. The DLC `.zip` files hold only music and sound, so "DLC folders" are just their thumbnails.
- **Species portrait layers left out for now** (`gfx/models/portraits`, 3 221 files, about 600 MB as PNG): they are parts (bodies per colour, clothes, hair) the game stacks at run time, not finished portraits, and with them StellarisAssets would pass the 1 GB limit of a GitHub Pages site. New task T2705 asks the owner (another repository, a size cap or skip them).
- **Out**: every texture of a 3D model, galaxy map, particle or shader (ships, planets, effects, the 3D UI scenes of `gfx/models/ui`), the galaxy map arrows, fonts, cursors, the portrait colour tables, the launcher and development tool folders, the ebook and soundtrack covers.
- **Folders**: one StellarisAssets folder per `gfx/interface/icons/` folder, flat like the existing ones, reusing every existing folder name (`districs`, `origin_icons`, `planetary_features`, `planets`…) and the data-set folders planned in §3 (`species_traits`, `ship_components`); the rest keeps the game's sub-folders under `interface/`, `event_pictures/`, `loading_screens/`, `flags/`, `portraits/`, `key_icons/`, `dlc_thumbnails/`, `wallpapers/`.
- **Names**: the name a generated data set already uses for the icon, else the sprite key without `GFX_`, else the texture file name (many icon textures have no sprite). Strips give `<name>_<frame>.png` with 1-based frames, as in the game's `£icon|frame£`. Existing files are reused by name or identical pixels and never removed, so the site's current links keep working; the first-frame files earlier exports wrote for strips stay next to the new frame files.
- **Batches**: one commit and push per category, several small ones together, at most about 200 MB per push.

## T2609 — Concept icons in Testellaris and bingo (2026-11-27)

- **Bingo has nothing to change**: its items and tooltips are only game names (origins, civics, technologies, DLC); none names upkeep, output, housing, amenities, stability, build time or strata.
- **Per-template rules, not free word matching** (`js/testellaris-icons.js`): only the templates that ask about a concept get an icon, so game names holding the word ("Communal Housing Outreach", "Improved Production") never do. The icon goes before the visible word (empty alt, word as tooltip), in the question, the explanation and the end-screen list.
- **Upkeep / output icons are per resource** in the game, so only the base upkeep / output questions with one resource get one; the bank now carries that resource (`resource`, new optional field written by `q_economy.py`, 22 questions). The "same resource as…" and "highest output" questions get no icon: the resource icon would give half of the answer away.
- **Job stratum questions**: the stratum icon is on each answer (Elite → ruler, Menial Drone → simple drone…), not in the question text; the explanation shows the right one after answering.
- **Blocker clearing days** use the clock icon too (the game uses the same time icon). Amenities: no template asks about them yet.

## T2608 — Concept icons in the tech tree card (2026-11-27)

- **Unlock type**: building and district unlocks show the game's building / district text icon instead of the word (word as alt and tooltip); other unlock types (deposits, decisions…) keep the word.
- **Build time of an unlock** comes from the 4.5.4 game data (`js/build-time-data.js`, T2601) matched by game id; buildings and districts with no `base_buildtime` there show no time (never a guessed figure).
- **Effect lines** keep the raw game key text and get an icon before it only for planet concepts: build speed, housing, amenities, stability, crime, pop upkeep, per-resource upkeep / production (`modifiers/mod_<res>_*`) and job efficiency without a resource (job icon). Ship, army, leader and country modifiers get none: the T2602 list has no icon for them.

## T2607 — Concept icons in the wiki (2026-11-27)

- **The wiki has no resources, jobs, buildings or districts articles yet** (only ship, fleet and combat articles), so T2607 adds the mechanism and a **draft glossary article** "Planet economy concepts" (`conceptos-economia-planetaria`, es/en/jp, marked as proposal in its first note, no figures) showing every T2602 icon with a one-line explanation. Please review or rewrite its texts; future economy articles can use the same tokens.
- **Token syntax in `js/content.js` texts** (`js/wiki-icons.js`): `[[icon:<concept>]]` puts the icon instead of the word (word as alt and tooltip), `[[icon+:<concept>]]` puts it next to the visible word (decorative icon, word as tooltip), `[[icon:<kind>:<resource>]]` for upkeep / production / efficiency / upkeep change of a resource, optional `|label`. Unknown concepts fall back to the word. Search matches the words, not the token.
- **The two ship upkeep mentions** (Ambition ships article) were left as text: ship upkeep mixes energy and alloys and the game shows it without a concept icon.
- **`[text](planet-sim.html)` links** now render in article texts (same tab), like the tech tree links.

## T2606 — Icons in the modifiers panel, catalogue cards and capital (2026-11-27)

- **Native tooltips cannot hold images**, so the building / district / capital tooltips keep their text; the icons go into visible pills on the catalogue cards, district cards and the capital control (housing, amenities, upkeep per resource, build time), each with its full words as tooltip and alt.
- **Build time of the pills comes from the 4.5.4 game data** (`js/build-time-data.js`, T2601: the building's own tier, the district of the current body), not from the wiki 4.5.2 `cost.time` the cost tooltip still shows; they differ for about 20 buildings (e.g. Alloy Nano-Plant 480 → 600 days) until T2523 moves the simulator data to 4.5.4.
- **District housing has no pill**: the per-copy housing depends on authority, body, civics and technologies (computed in the economy), so only the fixed upkeep and build time are shown on the card.
- **Active modifiers icons**: pop upkeep categories use the pop modifier icon, stability effect the stability icon, trade conversion the trade value icon; otherwise the resource modifier icon of the category kind (bonus `produces_add`, efficiency `produces_mult`, upkeep change `upkeep_mult`), then the stratum or condition icon. Rows with none (building / district upkeep targets) keep text only.

## T2605 — Icons in the header stats, Conditions and jobs summary (2026-11-27)

- **Icon before the word, word kept visible** in the header stats, Conditions rows and stratum headings: those labels are short and carry the value's meaning ("Housing provided", "Housing missing"), so the icon groups them instead of replacing them; the icon is decorative for screen readers (`alt=""`) and its `title` gives the concept word.
- **Special stratum** (colonists, civilians, criminals, test subjects, servants) uses the game's civilian pop category icon; gestalt rulers and specialists use the complex drone icon, workers the simple drone icon, civilians the maintenance drone icon. Deviancy (gestalt crime) uses the crime icon (the game has no separate text icon).
- **Shared helper** `js/concept-icons.js` (concept → StellarisAssets path, gestalt variants) for T2606–T2609; `HEADER_ICONS` of `planet-data.js` (the old `mod_planet_*` header icons) was removed.

## T2604 — Icons in the rest of the planet simulator (2026-11-27)

- **Scope kept to the general pass:** the main tabs, catalogue tabs, fixed summary and most panel headings already had icons; T2604 adds the game's empire modifier icon to the Active modifiers heading and the upgrade icon to the capital Upgrade button (Downgrade has no game icon). Header stats, Conditions and strata (T2605), the modifiers panel, catalogue cards and tooltips (T2606) and the other pages (T2607–T2609) were too big for one task and have their own (added by T2602). Native `title` tooltips cannot hold images, so tooltips keep text.
- The A/B comparison and stockpile timeline headings stay without a game icon (site features, no game equivalent).

## T2603 — Net breakdown icons (2026-11-27)

- **What gets an icon:** only the lines that are an upkeep, a bonus, an efficiency / % of output, an upkeep change or a pop upkeep; the sign decides for the capital, districts, buildings and branch office buildings (negative = upkeep, positive = bonus). The other lines (stability effect, trade conversion, civilians, blockers, designation, Neural Chips, job swaps, workforce scaling) keep their full text.
- **Short labels** drop the kind word and the bracketed explanation ("Districts (upkeep)" → upkeep icon + "Districts"); the full label stays as tooltip and accessible name.
- **Amenities** have no per-resource upkeep icon in the game: their lines use `mod_planet_amenities_add` (upkeep, bonus) and `mod_planet_amenities_mult` (efficiency, upkeep change).
- **Legend** in the production "i" panel shows the Energy version of each icon as the example.

## T2602 — Icons of the site's concepts (2026-11-27)

- **New StellarisAssets folders** `text_icons/` (the game's tooltip icons, `GFX_text_*`) and `pop_categories/` (strata), with the game texture names (`tooltip_stability.png`, `pop_cat_worker.png`): no existing folder held these kinds. The missing resource modifier icons went to the existing `modifiers/`.
- **Icon choice per concept** (`ICONS.md`): upkeep = `mod_<res>_upkeep_add`, bonus = `mod_<res>_produces_add`, efficiency / % of output = `mod_<res>_produces_mult`, upkeep change = `mod_<res>_upkeep_mult`, pop upkeep = the game's pop modifier text icon (`pop_modifier.png`; the game has no dedicated "pop upkeep" icon), strata = the pop category icons. Owner may prefer other icons for pop upkeep and build time.
- **Tasks per area**: T2604 keeps the simulator tabs, headings and summary; the new T2605 (header stats, Conditions, jobs summary), T2606 (modifiers, catalogue, tooltips), T2607 (wiki), T2608 (tech tree card) and T2609 (Testellaris, bingo) split the rest.

## T2601 — Total build time of the planet (2026-11-27)

- **Sequential total only.** The game builds a planet's buildings, districts and zones in one queue whose base "Build Queue Capacity" is engine-coded (not in the game files; only bonuses such as Wilderness +5 are), and a web search found no reliable figure, so the panel shows everything one after another and says the parallel time is not computed. If the owner knows the base capacity (and how a queue of capacity N splits the work), the parallel time can be added.
- **No build speed applied.** The simulator models no build speed modifier and the files do not say how the engine applies `planet_building_build_speed_mult` (divide by 1 + speed, or multiply by 1 − speed) nor whether "Infrastructure Build Speed" also covers districts and zones. The current civics, origin and designation that have one are listed in the panel, not applied.
- **What counts:** capital tiers up to the current one (each tier = one upgrade; tier I has no time in the data and is listed as left out), active buildings with the earlier tiers of an upgrade chain (an Alloy Nano-Plant counts Foundry + Mega-Forge + Nano-Plant), every district copy, every chosen specialization once. Branch office buildings (another empire builds them) and blocker clearing are left out.
- **Placement:** in the fixed planet summary (visible on every tab) as icon + "days (years)" that opens a breakdown panel; years shown to one decimal there and as "X years and Y days" in the panel and tooltip. The icon is `mod_planet_building_time_mult` from StellarisAssets (T2602 may pick another).
- **Matching:** districts of the simulator are mapped to game districts by a hand-kept table in `tools/extract/build_build_times.py` (City / Hive / Nexus by authority, Arcology / Ring World / Hive / Nexus secondary sets 1–3, Habitat, Volcanic, Synaptic Lathe, Wilderness); `paradise_domes` and `habitat_administration` have no game match and are left out.

## T3701 — Tech tree field labels while zoomed (2026-11-26)

- **Fix taken: the column stays stuck at every zoom** (not the fallback of freezing it). Cause: the zoom scales the stack with a CSS transform, and the browser applies the sticky shift before the scale, so the labels moved `zoom` times as fast as the scroll. At 100 % they keep `position: sticky`; at any other zoom they (with the grid corners and the area headings, which had the same bug) switch to `position: relative` and `js/tech-tree-zoom.js` sets their `left` to `scrollLeft / zoom` on every scroll, clamped to their parent box like sticky.
- **Trade-off**: while zoomed the position is set from the `scroll` event, so on fast scrolls a browser may show the column one frame late (a slight wobble) before it settles at the edge.

## T4407 — Engineering questions in tier 1 (2026-11-26)

- **Batch**: 27 generated questions, all tier 1, from four new templates of `q_economy.py`: base output of a job (11), base upkeep of a job (7), base construction cost (5) and base upkeep (4) of a building. All values come from the 4.5.4 extractor data; no wiki questions. Engineering tier 1 goes from 61 to 88 (average 99), so every category is now inside ±20 % overall and in every tier.
- **Numbers in tier 1**: GDD §3.1 puts base costs and job outputs in tier 4; these first-game ones are tier 1, as the task asks (hand-picked lists `BASIC_JOBS`, `BASIC_COSTS`, `BASIC_UPKEEPS`).
- **Resources are not named** ("base output of the job Miner"): the extractor has no official resource names, so only items with one resource in that field are asked. The values are the ones before bonuses, job variants and, for buildings, the nomadic cost.
- **Shared names**: Technician, Miner, Farmer, Bureaucrat, Medical Worker and Soldier share their name only with pre-FTL or overlord jobs and are asked as the player's job; Trader is left out because Merchant has the same Spanish name.
- **Drafts to check** (they are in the bank and are asked; delete or fix the ones that fail):
  - [ ] The base values match what the job and building tooltips show in game (4.x outputs count per job, of 100 workforce; the texts do not say so).

## T4406 — Society questions (2026-11-26)

- **Batch**: 145 wiki questions with category `society` (topic `leaders`): "which civic adds this council position?" (85, tier 4), "which leader class can hold it?" (30, tier 5), veteran classes, leader pool, experience, ethics attraction, ministers and gestalt nodes (articles Council and Leaders); plus 62 generated questions from raised caps of templates that already existed (`civic_combo`, `ethic_authority_civic`, `authority_variant_base` in tier 4; `civic_not_playable`, `authority_variant`, `living_power` in tier 5).
- **Also tier 4** (the task only names tier 5): Society fell below the target there once Unity and Physics grew.
- **No species traits or factions**: the project has no 4.5.4 extractor output for species traits (T4110 is blocked) and the local wiki copy has no Factions or Species traits article.
- **Repetitive block**: the 115 council position questions share two sentences (above the generator's cap of 40 per template). Delete part of them if they feel repetitive; positions whose name two civics share, or that has no single official es/jp name, were left out.
- **Engineering tier 1** is now below the target (the other categories grew): new task T4407.
- **Drafts to check** (they are in the bank and are asked; delete or fix the ones that fail):
  - [ ] Every council position question is tagged Galactic Paragons plus the civic's DLC, following the article's note on additional council positions.
  - [ ] Council position names in es/jp come from the localisation of the installed 4.6.0 game (key `councilor_*`), matched by their English name.

## T4405 — Physics questions (2026-11-26)

- **Batch**: 156 wiki questions with category `physics` (tier 1: planet climates and habitability, celestial objects, research fields, first steps with astral threads, debris and policies; tier 4: stars, special worlds, terraforming, astral actions, the Shroud's mechanics, military policies; tier 5: obscure figures of the same articles) and 64 tier 4 questions from two new generator templates on the technology tree (`tech_chain`: an indirect requirement, 40; `tech_not_needed`: the technology off the path, 24).
- **No new extractors**: the task mentions ship components and megastructures, but the project has no extractor output for them (T4110 is blocked); crises as mechanics only have the facts of the "Celestial object" article, since the local wiki copy has no crisis article.
- **Also tier 5** (about 30 added questions): Physics would have fallen below the target there once Society grows (T4406).
- **Names**: es/jp names the 4.5.4 data does not hold come from the localisation of the installed 4.6.0 game, matched by their English name. **Tiers** chosen by hand (GDD §3.1).
- **Correct answer position**: spread evenly over all the wiki questions (the bank test requires it).
- **Left out**: the Attunement that unlocks a Covenant power after Shaping the Shroud (the article says both 600 and 800).
- **Drafts to check** (they are in the bank and are asked; delete or fix the ones that fail):
  - [ ] DLC tags inferred where the article names none: the cracked egg world of the Voidspawn is tagged Distant Stars Story Pack, the Shroudwalkers question also needs Overlord.
  - [ ] Questions about the base game Shroud (`shroud.wiki.eotc_chance`) say "without Shadows of the Shroud" and carry no DLC tag, as the T4402 ones.

## T4404 — Unity questions (2026-11-26)

- **Batch**: 494 wiki questions with category `unity` from the articles Traditions, Ascension perks, Ambition, Empire modifiers and Origin (tradition trees and their effects and members, ascension perk effects, requirements, tiers, DLC and Shroud patrons, ambition perks, origin stories, which event, dig site or rift gives an empire modifier), plus 24 more generated "which DLC adds this technology" questions (cap of `tech_dlc` raised from 8 to 32 per tier). The new generator templates the task mentions (traditions, ascension perks, crises, fallen empires, events) were not written: the project has no 4.5.4 extractor output for those sets (T4110 is blocked).
- **Target used**: not the category's share at this moment but the end state of T4404–T4406 together (about 98 / 140 / 180 / 259 / 149 unity questions in tiers 1–5), so tier 4 reads slightly above the target until Physics and Society grow.
- **Repetitive blocks**: about 150 "which tradition tree includes X?" questions (up to 49 in one tier, above the generator's cap of 40 per template). Delete part of them if they feel repetitive.
- **Names**: es/jp names the 4.5.4 data does not hold (traditions, perks, ambition perks, places and characters of events) come from the localisation of the installed 4.6.0 game, matched by their English name; empire modifiers and origins use the 4.5.4 data and cite its file and key.
- **Tiers** chosen by hand (GDD §3.1).
- **Drafts to check** (they are in the bank and are asked; delete or fix the ones that fail):
  - [ ] DLC tags inferred where the wiki table names none: the archaeology modifiers are tagged Ancient Relics Story Pack, the Curators' advice Leviathans Story Pack, the paragon and Under One Rule modifiers Galactic Paragons (`events.wiki.modsrc_*`); Mind Over Matter and Synthetic Evolution are left as base game because the article names no DLC.
  - [ ] Defender of the Galaxy is tagged with the Nomads DLC, as in the T4402 batch.
  - [ ] Origin stories are our own summaries of the origin's description (`origins.wiki.tale_*`); check that only one of the four answers fits each.

## T4403 — Thematic categories of Testellaris questions (2026-11-26)

- **Research area colours**: the three research areas reuse the tech tree tints exactly (the unity colour is T4504's).
- **Names**: the official names of the game localisation (Física / Physics / 物理学…, Unidad / Unity / 統合力 from `resourceUnity`), not translated by hand.
- **Default category per topic** (`question_bank.TOPIC_CATEGORY`) and **template overrides** (`generate_questions.TEMPLATE_CATEGORY`), GDD §5.4. Debatable ones: `policies` → engineering as a whole (the owner lists "policies and edicts" under the numbers), except the templates about which ethic, civic, origin or authority a policy or edict needs (→ society); `crises`, `artifacts` and `events` → unity (ambitions, precursors and lore); `shroud` → physics, but the patrons, Covenants and the Reckoning wiki questions → unity; `technology` → physics, but tier, cost, highest tier/cost and draw weight → engineering; every "which DLC adds X" and "which belongs to the content of DLC Y" template → unity (history of the game and its DLCs); jobs of buildings, districts and zones stay in their topic (engineering for economy, physics for planets).
- **Wiki questions** classified one by one: origin stories → unity (except the three about who can lead, the second species and the ruler's trait → society); community slang (AAR, tall, monohull, vassal shelling, diplo-annex) → unity; numeric facts (artifact uses, Behemoth growth, Horizon Needle days, debris progress, research cost per empire size, tradition cost size, Astral Thread storage) → engineering.
- **Balance target**: ±20 % of the average of the four categories, overall and in every tier; "needs" counted by adding one question at a time to the smallest category of that scope. With the first classification (2531 questions): engineering 901, physics 637, society 715, unity 278; follow-up tasks T4404–T4406 list what each thin category needs.
- **Even draw always on**: the game draws the category first, evenly among the chosen ones with questions left in the tier, then the question. The task asks for this "until the bank is balanced"; it is kept always (with a balanced bank it changes little and needs no switch).
- **No categories checked**: Start is disabled and the warning line asks for at least one category. The category is also shown in the failed questions of the end screen.

## T3407 — Undrawn tech tree page in the smoke tests (2026-11-26)

- **Cause found: the test server, not the data `import()`**. The local `ThreadingHTTPServer` of the smoke tests answers HTTP/1.0 (one connection per file) with Python's default listen backlog of 5; the tech tree asks for dozens of ES modules at once and Windows refuses the overflow (`ERR_CONNECTION_REFUSED`). A refused static module fails the whole module graph with no page error, so the page reaches `readyState` complete and never draws. Reproduced 4 times in 20 runs of the compare link; with a backlog of 1 the page never draws; with 128, 0 failures in 30 runs.
- **Fix kept in the tests only**: a shared `LocalServer` (backlog 128) in `tests/smoke/common.py`, used by every local server of the smoke tests. The page itself is unchanged: on the real site (Vercel, HTTP/2) a refused module does not happen this way, so it does not show an error message for a failed module load.

## T4402 — First batch of wiki questions (2026-11-26)

- **Batch**: 156 hand-written questions (`<topic>.wiki.<slug>`), 24/35/34/39/24 in tiers 1–5, from these articles of the local copy: Ambition, Astral threads, Celestial object, Colonization, Empire, Government, Jargon, Leaders, Minor artifacts, Origin, Planetary features, Population, Resources, Technology, The Shroud, Traditions. The copy has no articles of their own for events or fallen empires, so there are few events questions and no `fallen_empires` topic.
- **Installed game is 4.6.0** (T2526): numbers and facts were only cited against the committed 4.5.4 data (origins and planet classes). The official es/jp names that the 4.5.4 data does not hold (ascension perks, crises, patrons, relics, leaders' traits and other terms) were read from the localisation of the installed 4.6.0 game, matched by their English name in the 4.5.2 wiki; they should be checked again if the project stays on 4.5.4.
- **Tier** of each question chosen by hand following the table of GDD §3.1 (how often a player meets the fact).
- **Odd official names kept as the game has them** (es): Behemoth and Juggernaut are both «Gigante».
- **Drafts to check** (they are in the bank and are asked; delete or fix the ones that fail):
  - [ ] Wiki text marked there as last verified for 4.3 (Population): check in game.
    - `species.wiki.founder_purge`: Which species can never be purged? → The empire's founder species
    - `species.wiki.robot_hive`: What do Hive Mind empires do with robots on their worlds? → They always purge them
  - [ ] Player advice or observed behaviour, not a rule (the wiki itself says it may be unintended for the sale).
    - `shroud.wiki.reckoning_corvettes`: According to the wiki, what tends to work better against the stronger versions of the Reckoning? → Swarms of corvettes with autocannons
    - `economy.wiki.market_partial_sale`: According to the wiki, what happens if a monthly sell order asks for more than you have stored? → Nothing is sold that month
  - [ ] From the Jargon article, which may describe an older version.
    - `ships.wiki.jargon_monohull`: Which game patch made single-hull (monohull) fleets far less viable? → 3.6
    - `subjects.wiki.jargon_diplo_annex`: According to the wiki's slang entry, how long must a vassal have been under its overlord to be diplo-annexed? → At least 3600 days
    - `subjects.wiki.jargon_shell`: In player slang, what is vassal shelling? → Ringing an empire with vassals so it cannot expand
  - [ ] Tagged as base game because the section names no DLC, although the content probably needs one (psionic ascension: Utopia or Shadows of the Shroud; the relic, the dig site or the perk may need a DLC too).
    - `shroud.wiki.shroud_nature`: What is the Shroud? → An immaterial realm of pure psionic energy beyond the physical universe
    - `shroud.wiki.shroud_psionic_archive`: Which relic lets an empire delve into the Shroud more often? → Psionic Archive
    - `shroud.wiki.end_of_cycle_one`: If the Shadows of the Shroud expansion is absent, how many empires may ally themselves with the End of the Cycle? → Only one
    - `shroud.wiki.end_of_cycle_mark`: Without Shadows of the Shroud, how long does the Covenant with the End of the Cycle last before the Reckoning? → 50 years
    - `shroud.wiki.chosen_negative_traits`: What happens to a leader who gains a Chosen trait from the Shroud? → It loses its negative traits, except those specific to the Luminary
    - `shroud.wiki.chosen_one_risk`: What is the risk of trying to gain the Chosen One trait during a Shroud delve? → The leader may die and a hostile Corrupted Avatar may appear
    - `shroud.wiki.divine_sovereign_ethics`: When a Chosen leader is declared a deity (Divine Sovereign), which ethics does the empire shift to? → Fanatic Authoritarian and Spiritualist
    - `shroud.wiki.reckoning_exile`: After the Reckoning, the empire that made the Covenant survives only on a newly colonized planet. What is it named? → Exile
    - `shroud.wiki.reckoning_corvettes`: According to the wiki, what tends to work better against the stronger versions of the Reckoning? → Swarms of corvettes with autocannons
    - `leaders.wiki.leader_immortal_trait`: Which of these traits means a leader never dies of old age? → Chosen One
    - `events.wiki.unique_larion`: Which archaeology site can give rise to the Larionessi Consciousness, a fungoid empire? → The Signal
    - `planets.wiki.gaia_perk`: Which ascension perk lets you terraform a regular planet into a Gaia World? → World Shaper
  - [ ] Facts about the Shroud without Shadows of the Shroud: the question says so, but a player with every DLC checked still gets it.
    - `shroud.wiki.end_of_cycle_one`: If the Shadows of the Shroud expansion is absent, how many empires may ally themselves with the End of the Cycle? → Only one
    - `shroud.wiki.end_of_cycle_mark`: Without Shadows of the Shroud, how long does the Covenant with the End of the Cycle last before the Reckoning? → 50 years

## T4401 — Wiki questions in the Testellaris bank (2026-11-26)

- **Source format**: `{"kind": "wiki", "article", "section"}` with optional `file`/`key`/`loc` when a number or name was checked against the extractor data; ids use the template `wiki` (`<topic>.wiki.<slug>`), and the validator requires the template and the wiki source to go together. Game-file sources keep their old shape (no `kind`), so the 2375 generated questions did not change.
- **Article and section** are the Markdown file name and a heading of the local copy (`Codex Ignis Wiki/markdown/v4-5-2`); the validator checks them only when that folder exists, so the checks pass on a machine without the copy.
- **Copy check**: `review_bank.py` fails on a wiki question whose English text, an answer or the explanation shares 8 words in a row with its article (words folded to lower case, image and link markup removed). 8 is a guess: short shared phrases like game names are allowed.
- **DLC tagging**: the data's DLC when the extractor has the item, otherwise the DLC the wiki section names; on disagreement the data wins.
- **Page**: the source line of a wiki question reads "Source: Stellaris Wiki (4.5.2), <article> · <section>" (new key `tqSourceWiki`).

## T3603 — Place of the tech tree detail card (2026-11-26)

- [ ] **A panel floating over the top-right corner of the tree window** (23rem wide, as tall as the window at most, its own scroll), instead of a side drawer or an area under the tree: the tree window keeps its size and position when the card opens or closes, the card stays next to the tree it describes, and the window's scroll bar stays free. A fixed area under the tree would push the rest of the page and be out of sight with the 85 % tall window (T3602); a drawer over the whole tree would hide more of it.
- [ ] **The selected node is never left under the card**: if it would be, the window scrolls sideways just enough to show it beside the card; while the card is open the window gets 24.5rem of extra room on its right so even tier 5 nodes can be shown.
- [ ] **Phones keep the bottom sheet** (55 % of the screen); a node selected near the bottom is scrolled above the sheet (window first, then the page).
- [ ] **Focus**: × and Escape close the card and, if the focus was inside it, put it back on the node; a prerequisite / leads-to button of the card keeps the focus on the redrawn card (it is focusable with tabindex -1).

## T1504 — Civics with English placeholder names and grouped civic keys (2026-11-25)

- [ ] **No English placeholders left**: after T1502 every civic and origin name of es and jp is an official string or a hand translation; the ones that were English (Trawling Operations / Maritime Robotics, Mutagenic Luxury / Luxury Lubrication Pools, Autonomous Drones / Autonomous Symbionts, Hyper Lubrication Basin / Mutagenic Spas, Mutagenic Spas / Lubrication Tanks) were all grouped keys and now take the official names. Gigacorp and Biodrones read the same in English and Spanish in the game itself.
- [ ] **The 11 keys that put several civics on one card keep one card** and their name joins the official name of each civic with " / " in every language (`tools/extract/game_name_overrides.json`): Anglers + Marine Machines, Trawling Operations + Maritime Robotics, Mutagenic Luxury + Luxury Lubrication Pools, Mutagenic Spas + Lubrication Tanks, Galactic Sovereign + Corporate Sovereign, Warrior Culture + Great Khan's Vision (real civics of their own), and Devouring Swarm + Terravore + Devouring Wilderness, Cordyceptic Drones / Autonomous Drones + their Symbionts versions, Rogue Servitor + Hospitality Servitor (alternative names of one civic for Lithoid, Wilderness or Voidborne empires, localisation keys read from the game folder).
- [ ] **To review — split or not**: the grouped cards carry one icon and one rule set for two game civics with their own icons (for example Anglers uses `Civic_anglers.png` while Marine Machines has `Civic_machine_anglers.png`, and the Anglers rule allows Machine Intelligence because of Marine Machines). Splitting them would change the bingo boards and the simulator civic list, so it is left for the owner.
- [ ] **«Hyper Lubrication Basin / Mutagenic Spas»** (`civicMachineToxicBaths`) keeps its second name, which is the regular `civic_toxic_baths` (already its own card, `civicToxicBaths`): it may be a mistake of the original label.
- [ ] **Official strings kept as the game writes them**, including oddities such as the Spanish «Visón del/de la gran kan» (Great Khan's Vision).

## T1503 — Every official game language on the simulator and the tech tree (2026-11-25)

- [ ] **A «More» selector** after the ES / EN / JP buttons lists Português (BR), Français, Deutsch, 한국어, Polski, Русский and 简体中文 (native names, marked with their `lang`); it is highlighted when one of them is chosen. Only `planet-sim.html` and `tech-tree.html` have it.
- [ ] **The tech tree names follow the language**: technologies and their variants, the three areas (game strings `PHYSICS`, `SOCIETY`, `ENGINEERING`: e.g. French «Sciences physiques»), the 13 fields, the unlocks and the "Researched with" links of the simulator; nodes inside a cell are sorted by the name of the language. Descriptions, requirement texts and DLC names stay English. The search finds a technology by its name in the language and in English.
- [ ] **One module per language (~110–160 KB uncompressed)** with the simulator names and the tech tree names together; only the current language is downloaded.
- [ ] **Key parity**: the 10 modules have the same keys in every group, and the game has every name in every language (0 English fallbacks today).
- [ ] **The technology area and field names come from the installed game folder** (4.6.0), like the resources (`data/localisation/game-folder-names.json`, which replaces `resource-names.json`).

## T1502 — Official es/en/jp game names (2026-11-25)

- [ ] **992 names replaced in es, en and jp**, English included: the official English differs from the hand-written one in some 45 cases, e.g. planet types «Continental» → «Continental World», «Habitat» → «Orbital Habitat», resources «Energy» → «Energy Credits», «Physics» → «Physics Research», «Trade value» → «Trade», «Noble Researcher» → «Noble Scientist», the Decrees «Decree: Scientific Revolution», «Urban district» → «City District» (`district_city`). Longer names may need more room in narrow cards.
- [ ] **Kept hand-written**: Colony Shelter (its game key `building_colony_shelter` reads «Reassembled Ship Shelter»), the grouped civic names «A / B» (T1504), and 16 names without a game string (`build_game_names.py --check`): Logistics Drone, Mutagenic Spa Attendant, the two Subterranean jobs, plain Ecumenopolis, Ringworld and Shattered Ringworld, Stellar Culture Shock, Wraith's Dispenser Sack, the two Court of Blossoms and Cheap Thrills variants, Funghi are Friends, Devouring Swarm and Dark Matter Unraveling.
- [ ] **50 hand links** in `tools/extract/game_name_overrides.json` for names the matching misses (e.g. Science Director → `head_researcher`, Medical Worker → `healthcare`, diplomatic stances → `diplo_stance_*`, gestalt production policies → `drone_policy_*`, the minerals quality modifiers → `pm_mineral_*`); where the game has several items with that name, the first or regular one was chosen.
- [ ] **The bingo also gets the official names** (it shares the civic, origin, ethic and authority keys with the simulator), which replaces the 7 base authority names left for P15 in T2405.
- [ ] **Language switch draws at once** with the hand-written names and again when the new language's names arrive (one small module per language); the first draw already has them.

## T1501 — Official localisation plan (2026-11-25)

- [ ] **Generated override modules** (`js/game-names/<code>.js`) on top of the hand-written texts, instead of rewriting the names inside `js/i18n-*.js`: one mechanism for the 10 languages, and the hand-written es/en/jp names stay as the fallback.
- [ ] **Site codes of the new languages**: `pt` (Brazilian Portuguese, `pt-BR`), `fr`, `de`, `ko`, `pl`, `ru`, `zh` (Simplified Chinese, `zh-Hans`); the ES/EN/JP buttons stay and a selector lists the other seven, only on the simulator and the tech tree.
- [ ] **Interface texts of the new languages show English** until T1505 translates them; a new-language visitor on the wiki, bingo or Testellaris gets English.
- [ ] **Resource names come from the installed game folder** (4.6.0 today, T2526), because the 4.5.4 extractor output has no resource set; only names are read and the version is written in the generated file.
- [ ] **Matches by icon are not used** for names (icons are shared), only by id and English name, plus a hand-kept override file.

## T4304 — Hall of fame data in the privacy policy (2026-11-25)

- [ ] **The es/en/jp texts of `privacy.html` are drafts** (not legal advice). They list everything the hall of fame database stores, beyond the items named in the task: also tier reached, questions answered, right answers (total and per tier), DLCs checked and game version. "The database does not store the IP address" says nothing about the hosting provider's own logs.
- [ ] **A second new section, "Data stored in your browser"** (language, simulator empires and planets, tech tree and Testellaris preferences, local top 10), and the "current status" text no longer says the site has no forms.
- [ ] **Removal on request:** the page tells players to use the contact channel to have their entry deleted (the owner deletes it in Atlas, GDD §7.3). The page still gives **no actual contact channel**, controller identity or legal basis: add them before publishing if the applicable law (e.g. GDPR) requires it.
- [ ] **The privacy page has its own "last updated" date** (`privacyLastUpdatedNotice`); `cookies.html`, unchanged, keeps the old one.

## T4303 — Testellaris game connected to the hall of fame (2026-11-25)

- [ ] **The API is used only when the page is served over http(s)** (same origin, `/api/hall-of-fame`); from `file://` the game keeps the local top 10 without trying.
- [ ] **"Cannot be reached" covers** a network error, no answer in 8 s, any non-2xx answer other than a refused name (503, 429 rate limit, 404 on a static server, and a 400 for a score the server finds impossible): the local top 10 is used and the page says so, as in GDD §7.2.
- [ ] **A refused name** (400 `name`, word filter) is not saved anywhere: the form stays open with a generic message (es "Este nombre no se puede usar en el salón de la fama. Elige otro.", en/jp drafts) so the player can change it.
- [ ] **A score overtaken meanwhile** (the server answers `saved: false`) shows "Other players beat your score meanwhile: it no longer enters the hall of fame top 10." and is not saved locally.
- [ ] **The new entry is highlighted with the server's copy** (its date is the server's).

## T4302 — Testellaris hall of fame anti-abuse (2026-11-25)

- [ ] **New entry field `correctByTier`** (right answers of tiers 1–5), needed for the plausible-score check of GDD §7.3; it is stored but not returned by the API. The body must hold exactly `name, score, maxTier, answered, correct, correctByTier, dlcs, rulesetId` (the `date` is the server's); raw name at most 64 code units, `dlcs` at most 64 (sanity bound, not a game figure).
- [ ] **Exact score check, stricter than "not above the maximum":** the score must be Σ right answers × 100 × tier, less half of one right answer's points (Sensor Sweep is once per game), plus 250 per life left only when the game could have completed. Counts also checked: right ≤ answered, at most 3 wrong, no right answer above the tier reached, no tier with more right answers than its questions, answered ≤ bank size.
- [ ] **"Completed" is accepted only if `answered + 1 ≥` the number of base-game questions** of the bank (the DLC filter never removes them; one may be skipped with Hyperlane Jump). The tier-progression rule (5 right answers to move up) is not checked, because a tier emptied by the DLC filter is jumped over.
- [ ] **Word filter is a draft list** (`api/_lib/blocked-words.js`) in two parts: words rejected anywhere in the name, and short words rejected only as a whole word (so Yamashita, Dickens, icono or Peacock pass). Known false positive kept on purpose: "puta" inside "disputa". The owner should review the list.
- [ ] **Rejected names get the generic code `name`**, the same as a name that breaks §7.1, so the player cannot tell which word was found.
- [ ] **Rate limit counts every POST, valid or not** (so the word filter cannot be probed); GET is not limited. Key: SHA-256 of salt + IP (`x-real-ip`, else the first `x-forwarded-for`); salt `HALL_OF_FAME_SALT`, or derived from the secret `MONGODB_URI` when not set, so no extra variable is needed. Collection `rate` with a TTL index of 24 h.

## T4301 — Testellaris hall of fame API (2026-11-25)

- [ ] **API shape:** `GET /api/hall-of-fame?ruleset=<rulesetId>` → `{ rulesetId, entries }`; `POST` → 201 `{ saved: true, entry, entries }` or 200 `{ saved: false, entries }` when the score does not enter the top 10 (nothing is written then). Errors as `{ error: <code> }`: 400, 405, 413 (body over 1 KB), 503 `unavailable` when there is no `MONGODB_URI` or the database fails (no details leak).
- [ ] **The date is set by the server**, not by the browser, so it cannot be backdated to win ties.
- [ ] **One board per ruleset** (GDD §7.1 proposal), and a ruleset is accepted only if its bank `data/testellaris/<id>/questions.json` exists (shipped with the function through `includeFiles` in `vercel.json`); its size per tier is used by the plausible-score check (T4302).
- [ ] **`package.json` with `"type": "module"`** (every JS file of the site is already an ES module) and the `mongodb` driver `^6.12.0` as the only dependency; no lock file in the repository. The server reuses `js/testellaris-scores.js` (order, top 10, name rules), so browser and server cannot disagree.
- [ ] **MongoDB:** database `testellaris` (`MONGODB_DB` to change it), collection `entries` with one compound index in board order; after an insert everything below the 10th of that ruleset is deleted.

## T4207 — Testellaris mobile layout, accessibility and languages (2026-11-25)

- [ ] **Phones (≤ 700 px):** the main buttons take the full width, answers stack in one column (at least 48 px tall), the question icon shrinks to 48 px and the end-screen figures go one under the other.
- [ ] **Accessibility:** a "Skip to the game" link (es "Saltar al juego", jp "ゲームへ移動"), source lines in `--muted` instead of `--muted-dim` (too dim for small text), the hearts hidden from screen readers with the lives also in text, and the focus moved to the question, to Next after answering and to the end-screen title.
- [ ] **Japanese and Spanish interface texts** of the page are Claude's drafts (game names come from the bank); a native review should check them.

## T4206 — Testellaris hall of fame: name and top 10 (2026-11-25)

- [ ] **Name rules in the browser** as the GDD proposal (§7.1): trimmed, NFC, inner spaces collapsed, 1–10 user-perceived characters (`Intl.Segmenter`), letters and digits of any script with their combining marks, space, `-`, `_` and `.`; emoji, symbols, control and invisible characters (such as zero-width spaces) are refused with a message. The input itself allows 40 code units so a name in any script can be typed and then checked; the word filter is server-side (T4302).
- [ ] **The name is asked inline on the end screen**, not in a dialog, and only once per game; the end screen always shows the top 10 below, with the new entry highlighted.
- [ ] **Whether a score enters** is decided against the board loaded at the end of the game (the local one until T4303).

## T4205 — Testellaris local top 10 (2026-11-25)

- [ ] **Until T4303 connects the API, the game always uses the local top 10** and says so on the start screen ("The hall of fame cannot be reached: this is the top 10 of this browser"). `js/testellaris-scores.js` has the slot for the API client (`hallOfFame.client`, with `load` and `submit`); when it fails, the local board is used and the score is kept there, never queued (GDD §7.2).
- [ ] **Local board per ruleset** (`testellaris-top10` = `{ <rulesetId>: [10 entries] }`), as the shared one will be (GDD §7.1 proposal). Damaged data is ignored.
- [ ] **A score of 0 never enters** the top 10, even with room on the board.
- [ ] **Each row** shows rank, name, score, tier reached, right answers / answered, number of DLCs checked and the date in the page language.

## T4204 — Testellaris scoring and end screen (2026-11-25)

- [ ] **Scoring as in the GDD proposal** (§3.5): 100 × tier per right answer, half with Sensor Sweep, 0 for a skipped question, +250 per life left only when the game is completed; a given-up or lost game keeps its score. After each right answer the feedback says how many points it gave.
- [ ] **"Tier reached"** is the highest tier a question was shown from (moving up after the 5th right answer of tier 5 is not possible, and moving up without seeing a question of the new tier does not count).
- [ ] **Failed questions** on the end screen show the answer given as well as the right one, the explanation and the source; a question saved by the shields is not a failed one. When nothing was failed the screen says so.

## T4203 — Testellaris lifelines (2026-11-25)

- [ ] **The three lifelines of the GDD proposal** (§3.4): Sensor Sweep (50 %), Hyperlane Jump (skip) and Deflector Shields (second chance), with the draft names in es (Barrido de sensores, Salto hiperespacial, Escudos deflectores) and jp (センサー掃引, ハイパーレーン・ジャンプ, 偏向シールド).
- [ ] **One lifeline per question includes the jump:** the question that replaces a skipped one cannot take another lifeline, and keeps the number of the skipped one (so "Question n" counts the questions faced, not the ones skipped).
- [ ] **Hyperlane Jump is off** when the tier of the question has no other unasked question.
- [ ] **The shields stay up only for that question**: if the player answers right, they are spent anyway. A crossed-out answer looks like the ones Sensor Sweep removes.

## T4202 — Testellaris game loop (2026-11-25)

- [ ] **A tier that runs out** moves the game up to the next tier with questions, and the count of right answers towards the next tier starts again there (the GDD only says the next question comes from the next tier up).
- [ ] **"Recently asked" list** (`testellaris-recent`, last 200 ids) is written as each question is shown, so a game left half way also counts; those questions are drawn only when a tier has nothing else left.
- [ ] **After the last life** the result and the explanation are still shown, and Next opens the end screen.
- [ ] **The end screen has a second button**, "Change the DLC filter", back to the start screen; Play again keeps the same filter.
- [ ] **No topic weighting** when drawing (T4109 suggested it as an option): every unasked question of the tier has the same chance.

## T4201 — Testellaris page and start screen (2026-11-25)

- [ ] **The page reads the bank JSON itself** (`data/testellaris/stellaris-pc-4.5.4/questions.json`, 2.9 MB, about 330 KB gzipped) after the page is usable, with `XMLHttpRequest` so the `file://` smoke tests can read it too. No minified copy or JS module was generated; if the size matters, the generator could write a compact copy.
- [ ] **DLC filter list** taken from `DLC_BINGO` (`js/bingo-game-items.js`, generated from `dlc.json`) without the portrait packs: 13 expansions, 6 story packs and 7 species packs, with their big icons. The unchecked ones are stored (`testellaris-dlc-off`), so a DLC added later starts checked.
- [ ] **Navigation:** a fourth link `TESTELLARIS` in the header of every page; on phones the links wrap onto a second line so 320 px has no sideways scroll.
- [ ] **Tier names in jp** (原始文明, 宇宙進出, 銀河列強, アセンション, 堕落帝国) and es (Primitiva, Viajera espacial, Potencia galáctica, Ascendida, Imperio caído) are drafts: the extractor output has no localisation of these words, so a native review should check them.

## T4110 — Extractors for the new Testellaris topics (2026-11-25)

- [ ] **Done: the eight extractors**, one script each, in `extract_all.py` and in `refresh_dlc.py`: `species_traits`, `ascension_perks`, `tradition_categories` + `traditions`, `ship_components`, `megastructures`, `crisis_paths` + `crisis_levels` + `menace_perks` + `crisis_objectives`, `fallen_empires` and `events`. **Not done: their questions.** The 4.5.4 data sets cannot be generated because the installed game is 4.6.0, and mixing 4.6.0 data into the 4.5.4 bank would break the "never invent figures" rule. The 4.6.0 output was only checked in a temporary folder and is not committed.
- [ ] **Species traits only**: traits with a `leader_class` (or `leader_trait`) are leader traits and are left out; a leader traits set would belong with the leaders topic (T4103).
- [ ] **Ship components**: each component is identified by its `key` (the same component can be redefined in a later file, and the last one wins). The `*.csv` weapon stats override the `.txt` values, as the game's own note says, and `power` is taken from the CSV when it is there.
- [ ] **Events**: only events with a window (`hide_window` not set) and an English title are kept, since a question can only quote what a player sees. Every top-level `*_event` type counts (`carrier_event`, `situation_event`, …), and subfolders of `events/` are read.
- [ ] **Crisis paths have no localised name** (the game names them through their ascension perk); objectives use the `<id>_name` key.
- [ ] **Fallen empires**: authority, ethics, civics and origin come from the `create_country` inside `create_country_effect`. The hive fallen empire creates its country in a scripted effect, so only its species traits and DLC are read.
- [ ] **New StellarisAssets folders** for when the icons get exported: `species_traits/`, `ascension_perks/`, `traditions/`, `ship_components/`, `megastructures/`. No icons were exported in this task.

## T4109 — Review of the whole bank (2026-11-25)

- [ ] **Review tool** `tools/testellaris/review_bank.py` writes `data/testellaris/stellaris-pc-4.5.4/review.json` (count per topic and tier, base-game count per tier, templates, position of the correct answer, DLC share, duplicates, ambiguous questions, warnings); a test keeps it current and fails on any duplicate or ambiguous question.
- [ ] **Result on 2,375 questions**: 0 duplicates, 0 ambiguous; the correct answer is spread evenly (584 / 611 / 579 / 601); base-game questions per tier 211 / 371 / 424 / 481 / 288, enough for many games without repeats (a game asks 5 per tier).
- [ ] **Ambiguity rule**: a question is ambiguous when a wrong answer is the right answer of another question with the same text, or the same text and answers have another correct answer. The "which of these has the most…" templates (`building_slowest`, `job_most_output`, `living_power_most`, `living_upkeep_most`, `tech_highest_cost`, `tech_highest_tier`) are left out: they compare the four answers, and their generators only take distractors with a strictly lower value, so they have no ties (the first run flagged 59 of these, none real).
- [ ] **Balance left as warnings, not changed**: tier 1 is 9 % of the bank (proposed threshold 10 %); technology is 30 % of the bank; ethics has no tier 4–5 questions, government none in tier 3, modifiers none in tiers 1–3; leaders, traditions, species, ships, megastructures, crises, fallen empires and events have none (T4110 and the 4.5.4 game files they need). The game page (T4202) could weight topics when it draws questions instead of trimming the bank.

## T4108 — Questions about the Shroud, astral content, artifacts, subjects and modifiers (2026-11-25)

- [ ] **Done with the data the extractor has** (`q_shroud.py`, about 270 questions) and tiers: holdings among ordinary buildings (1–2); archaeotechnologies (2); planetary features of one expansion, patron gifts, holdings that raise loyalty and the overlord's civic or origin (3); modifiers of one expansion, what a modifier raises, holding jobs and overlord technology (4); loyalty and modifier values (5).
- [ ] **Left blocked**: relics, astral rifts, the Shroud events and patrons themselves, and subject types (agreements) have no data set in the 4.5.4 extractor output and the installed game is 4.6.0.
- [ ] **New topics** `astral` and `artifacts` in the validator (the Shroud, subjects and modifiers ones already existed).
- [ ] **Content of an expansion** is read from the name of the game file (`..._shroud`, `..._astral_planes`, `..._ancient_relics`, `..._overlord`); the question gets that DLC, and wrong answers come only from files of other content.
- [ ] **Effect names** (stability, happiness, naval capacity, ship fire rate and speed, diplomatic weight, envoys, districts, habitability, command limit, loyalty) are written in plain words in es/en/jp, and "holding" as "edificio de dominador" / "保有施設": the data has no official names of modifiers, so a native review should check them.

## T4107 — Questions about policies and edicts (2026-11-25)

- [ ] **Done with the data the extractor has** (`q_policies.py`, topic `policies`, about 175 questions) and tiers: options of a policy and policy of an option (2, options only non-player empires have 4); ethic and origin an edict requires (2); ethic that closes an option, civic that opens it, edicts sharing an upkeep resource, edict DLC and the technology of the ambitions (3); authority of an edict, base costs and wartime edicts (4); months an edict stays locked (5).
- [ ] **Left blocked**: traditions, ascension perks and decisions have no data set in the 4.5.4 extractor output and the installed game is 4.6.0.
- [ ] **A question about a policy option** has the policy as its source key (options are not items of the data sets).
- [ ] **Draft wording**: "ambition" is written "ambición" / "大望"; the data has no official name of the edict group, so a native review should check it.
- [ ] **Smoke fix**: `tests/smoke/testellaris.py` ignored failures inside `subTest`; they now fail the browser tests too.

## T4106 — Questions about the economy (2026-11-25)

- [ ] **New templates** (`q_economy.py`, topic `economy`, about 240 questions) and tiers: stratum of a job (1, drones 2); which is a branch office building (1); jobs that produce the same resource (2); same upkeep resource, criminal and required civic or origin of branch office buildings, living standard with the highest upkeep (3); highest base output, jobs of a branch office building, slowest building to build, living standard with the most political power (4); build days and political power values (5); living standard of a civic or origin (2).
- [ ] **Resources are never named**: the 4.5.4 extractor output has no official es/en/jp resource names, so the questions compare them ("produces the same resource as X"). Adding them needs the 4.5.4 game files (see T4103).
- [ ] **Job variants** (swaps such as Merchant for Politician) are not asked: their conditions are scripted triggers the data does not resolve, so their DLC list could be incomplete.
- [ ] **Names with game script** such as `[foundry.GetName]` are now rejected by the generator and the validator (an overlord job slipped one into a question).

## T4105 — Questions about planets and colonies (2026-11-25)

- [ ] **New templates** (`q_planets.py`, topic `planets`, about 275 questions) and tiers: shared climate and "which is a blocker" (1–2); features that raise a district maximum and district jobs (2); where a feature appears, designations, specialization and capital jobs (3); blocker days and lost districts, district amounts, workforce bonuses, capital housing and job counts (4); which planet modifier can spawn on a world (5).
- [ ] **Jobs of districts, specializations and capitals** are asked with "can provide": the right answer is a job an ordinary empire (no special civic, tradition or event) gets from it, and no wrong answer is a job it can give under any condition.
- [ ] **Values are the base ones** of the game files (blocker days "before modifiers"); "housing" is written in plain words in es/en/jp (住居), as it is not an item of the data.

## T4104 — Questions about technology and research (2026-11-25)

- [ ] **New templates** (`q_technology.py`) and tiers: starting technology (1); building, district, blocker or edict that needs a technology (2); same research area (2); technology unlocked by another (3); DLC (3); rare (4), highest base cost (4), the two prerequisites (4); dangerous, repeatable with a level limit and base draw weight (5); highest tier (2–5). About 330 new questions on top of the 400 of T4111.
- [ ] **Research areas** are asked as "which technology shares the area of X", because the data has no official es/en/jp names of Physics, Society and Engineering.
- [ ] **Base draw weight** is the number of the technology file, said so in the question ("before modifiers"); it is an obscure fact, so tier 5.
- [ ] **Blocker names** are read without the blocker icon the game writes before them (`£blocker£`).

## T4103 — Questions about ethics and government (2026-11-25)

- [ ] **Done with the data the extractor has** (`q_government.py`): topic `ethics` (points, tier 1–2; legal and illegal pairs, 1–2; civics and origins an ethic rules out, 3) and topic `government` (authority facts, 1–2; which ethics and authorities go together, 2; term length, 4; civic allowed by an authority and an ethic, 4; authority variants, 4–5; the authority players cannot pick, 5). About 200 questions with the opposite ethics of T4111.
- [ ] **Left blocked**: council positions, leader classes and traits, and government type names (`common/governments/*.txt`): no data set holds them, and the installed game is 4.6.0, so they cannot be extracted for 4.5.4 (T2526).
- [ ] **Authority facts** are the fields of `common/governments/authorities` (heir, re-election, mandates, factions, reform, term years); civics or origins that change them are not considered.

## T4102 — Questions about origins and civics (2026-11-25)

- [ ] **New templates** (`q_civics.py`) and tiers: "which is an origin / a civic" (1), megacorporation, hive and machine civics (3), allowed authority (2), civic that requires an ethic, incompatibilities and corporate version (3), origin ethics and starting world (2), authority + ethic combination (4), civics of non-player countries and origins not offered at empire creation (5). Each has its own cap per tier (12–25), so the two topics hold about 400 questions with those of T4111, more than the "about 150" per batch: lower the caps if the bank gets unbalanced (T4109).
- [ ] **Incompatibilities** are proved with the rules of the game files (`rules.py`): a wrong answer is a civic that some legal player empire can take together with the other one (3 ethics points, authority, species archetype, nomadic or not). Civics that require a species class, appearance, trait, planet class or another civic are never used as wrong answers, since compatibility with them is not checked.
- [ ] **Event-granted items** (their `potential` requires the civic or origin itself, or an origin nobody can pick, such as Diadochus) are no longer treated as pickable; "non-player" civics are the ones whose `country_type` excludes `default`.
- [ ] **Not asked**: civic and origin modifier values (the data has no official es/en/jp names of modifiers) and description texts (the extractor only keeps the English ones), so tier 5 uses availability instead.
- [ ] **Wording** drafts, to review (Japanese by a native speaker): "autoridad" / "統治形態" for authority.

## T2527 — DLC of every scripted trigger (2026-11-25)

- [ ] **Which triggers**: every scripted trigger of `common/scripted_triggers` that contains `host_has_dlc`, plus the ones that reach it through another such trigger (`has_genetic_dlc` → `has_space_monster_dlc`, `can_embark_trigger` → `has_nomads_dlc`): 67 in the installed game, not only the `has_<x>` / `has_<x>_dlc` ones. A trigger that also checks other things (`is_disconnected_drone_pop`) still lists its DLC.
- [ ] **Same listing rule as before**: a DLC named only inside a `NOT` / `OR` or through a trigger set to `no` (`has_megacorp_dlc = no`, before T2527 ignored) is listed in `dlc`, as `host_has_dlc` inside a `NOT` already was; `dlc.json` gains `scripted_triggers` (name → DLCs, each `negated` / `alternative`) so the Testellaris generator tells the variants apart.
- [ ] **4.5.4 data refreshed, not re-extracted**: the installed game is now 4.6.0 (T2526, blocked), so instead of re-running the extractors (they would write `stellaris-pc-4.6.0`) the new `tools/extract/refresh_dlc.py` recomputed the `dlc` lists of `data/generated/stellaris-pc-4.5.4/` from the condition texts it already stores, with the trigger map read from the 4.6.0 `common/scripted_triggers`. Changed: 29 civics (e.g. `civic_selective_kinship` → Lithoids Species Pack), 7 origins, 26 technologies (Ancient Relics), 1 edict; then the tech tree data file, the tech bingo and the Testellaris bank (582 → 718 questions) were regenerated. The trigger → DLC map should be the same in 4.5.4, but it was not checked against 4.5.4 files.
- [ ] **Testellaris**: the rule "skip every item with an unresolved `has_… = yes` trigger" is replaced by the trigger map; only an item with a `has_<x>_dlc` trigger the game does not define is still skipped (data without `scripted_triggers` keeps the old rule).

## T4111 — Testellaris question generator (2026-11-25)

- [ ] **Tier rules** of the generator (`TESTELLARIS_GDD.md` §3.1, "Generator rules"): the higher of the template minimum (tech tier and opposite ethic 1; origin DLC, civic ethics, building technology and jobs 2; prerequisites, building upgrades and civic DLC 3; base cost 4) and the obscurity of the item (dangerous/event tech 5, rare 4, tech tier 3+ → 3; gestalt or corporate civics 3).
- [ ] **Cap of 40 questions per template and tier**, chosen by a hash of the id: the uncapped run gives 1 350 questions, 426 of them "what tier is X" and 336 base costs; capped, 582 (tier 1: 48, 2: 174, 3: 193, 4: 73, 5: 94). `--cap 0` writes all of them. Tier 1 is short (only tech tiers and the 8 opposite ethics are that basic): hand-written questions (T4102–T4108) should add to it.
- [ ] **Conservative skips**: every item whose conditions use a scripted trigger `has_… = yes/no` that the extractor does not resolve to a DLC is not asked (191 of 498 buildings and 166 of 679 technologies, mostly for `has_federation`, `has_upgraded_capital`, `has_branch_office`), because its DLC list might be incomplete; T2527 (new) resolves them in the extractor.
- [ ] **DLC names** in the answers are the game's `name` of `dlc.json` (English titles: the localisation has no DLC names except Nomads), the same in es/en/jp.
- [ ] **Wording** (drafts, es/en/jp): the terms of the rest of the site ("principio" / "国是" for civic, "ética" / "倫理観", "nivel" / "ティア", "prerrequisito" / "前提条件", "edificio" / "建造物", "empleo" / "職業", "coste base" / "基本コスト"); the base cost explanation says that the game scales it, as the tech tree does. The Japanese texts need a native review.
- [ ] **Re-runs**: random choices are seeded by the question id, so a new run on the same data gives the same bank (the tests check it) and a new version only changes what its data changes; hand-written questions (`<topic>.hand.<id>`) are kept as they are.

## T4101 — Testellaris question bank format (2026-11-25)

- [ ] **Bank file**: `data/testellaris/<rulesetId>/questions.json` (the path proposed in the GDD), a header `{rulesetId, gameVersion, count}` and the `questions` list; validator in `tools/testellaris/question_bank.py`, so the generator (T4111) and the tests share it.
- [ ] **Strict schema**: unknown fields are errors (a typo such as `explantion` would otherwise pass); `source` may only hold `file`, `key` and `loc`.
- [ ] **Topics**: the validator accepts `origins, civics, ethics, government, leaders, technology, planets, economy, policies, traditions, shroud, subjects, modifiers, species, ships, megastructures, crises, fallen_empires, events` (the topics of section 41 plus the new extractors of T4110); a new topic is added to `TOPICS`.
- [ ] **Extra checks** beyond the task: the id starts with its topic, every `dlc` name exists in `dlc.json`, answers are distinct ignoring case, and no text keeps a game localisation code (`§`, `£`, `$var$`).

## T4001 — Testellaris design (2026-11-25)

Every rule marked **(proposal)** in `TESTELLARIS_GDD.md`:

- [ ] **Tiers** (§3.1): five tiers (Primitive, Spacefaring, Galactic Power, Ascended, Fallen Empire; names are drafts), given by rule from the set, field and rarity of the fact (base game and empire creation → tier 1 … obscure, non-playable and description texts → tier 5).
- [ ] **Advancing** (§3.2): 5 correct answers in a tier move the game up one tier; tier 5 has no ceiling; an empty tier takes questions from the next one; no repeats in a game and the last 200 ids asked kept in `localStorage` to avoid repeats between games; answers shuffled.
- [ ] **Lives** (§3.3): 3 (owner) and no way to win them back.
- [ ] **Lifelines** (§3.4): besides 50 % (owner), Skip ("Hyperlane Jump", another question of the same tier, no score) and Second chance ("Deflector Shields", a wrong answer does not cost a life once); 50 % named "Sensor Sweep". Each once per game, one per question. Rejected: ask the audience (no real statistics), a source hint, an extra life.
- [ ] **Scoring** (§3.5): 100 × tier per correct answer, half with 50 %, 0 when skipped, +250 per life left when the bank is completed; Give up keeps the score; top 10 ties broken by tier reached, fewer questions, earlier date.
- [ ] **No timer** (§3.6), for accessibility (WCAG 2.2.1); alternative: an optional timed mode with its own top 10.
- [ ] **DLC filter** (§4): the 26 installed DLCs with `affects_gameplay` of `dlc.json`, all checked by default and remembered; a question needs all its DLCs checked; a warning under 20 questions in a tier; one shared hall of fame for every filter, each entry storing how many DLCs were checked.
- [ ] **Format** (§5): bank in `data/testellaris/<rulesetId>/questions.json`, stable ids `<topic>.<template|hand>.<game id>`, optional icon; no negative or "all of the above" questions; numbers as the game shows them.
- [ ] **Hall of fame** (§7): name of 1–10 user-perceived characters (owner) with letters and digits of any script, space, `-`, `_`, `.`, no emoji; one board per ruleset (old ones read-only); no queue of scores when the API is down; rate limit of 5 POST per 10 minutes per salted IP hash that expires in 24 h; moderation directly in MongoDB Atlas, no admin page.
- [ ] **New task T4304** (section 43): the privacy page must describe the hall of fame data before it is published.

## T3502 — DLC bingo (2026-11-25)

- [ ] **Which DLCs**: the 32 DLCs of `dlc.json` (4.5.4) installed with the game and with a category (13 expansions, 6 story packs, 7 species packs, 6 cosmetic/portrait packs, including Horizon Signal); store-only extras without a `dlc/` folder (soundtracks, art books) are left out. Order: by category, then release order (dlc id).
- [ ] **Icons**: the big icon of `interface/dlc_icons.gfx` (`dlc/*_big.png`), else the small one; the 6 cosmetic packs have none in the game and keep a reserved empty slot with the name.
- [ ] **Names**: the game has no localised DLC names (only Nomads, in English), so es/en/jp all use the `dlc_info` name; names are always shown under the icon. 8 columns in the PNG. The description text (`bingoDlcDescription`) is a draft.

## T3501 — Rare and dangerous technologies bingo (2026-11-25)

- [ ] **Which technologies**: the 166 technologies of `technologies.json` (4.5.4) that the tech tree draws as rare or dangerous (`build_tech_data.kind`: a dangerous flag wins over rare), including event, story-pack and ascension ones. Order: rare first, then dangerous, each by area (physics, society, engineering), tier and English name.
- [ ] **Icons**: T3008 is already done, so every cell points at its `technologies/` icon (none is `null`); an icon that does not load keeps the empty slot of its cell with the name. Two technologies share `tech_mega_assembly.png` (Robotic Assembly Systems and the robot assembly complex); both stay as cells.
- [ ] **Frame**: purple `#b98cff` (rare) and the red `--danger` (dangerous), the colours of the tech tree kinds, 2 px on screen and 3 px in the PNG; a marked cell keeps its frame and adds the green inner line. 70 px cells, names as tooltip only, 12 columns in the PNG.
- [ ] **Texts**: the 166 official names (es/en/jp, extractor localisation) go to a generated module `js/i18n-bingo-game.js` instead of `js/i18n.js`, like the other generated data. Title and description (`bingoTypeTechnologies`, `bingoTechnologiesDescription` of `js/i18n-bingo.js`) are **drafts**.

## T2406 — Dictatorial Alignment by ruler class (2026-11-25)

- [ ] **Five cells**: the 4 icons (`_official`, `_commander`, `_scientist`, `_vacant`) are added after the old generic `Auth_cyber_dictatorial_collectivist.png` cell, which stays because the bingo has one cell per icon of `authorities/` (79 cells now). Alternative: drop the generic cell (it has no game texture in 4.5.4, see T2405) and keep 78.
- [ ] **Names**: all four share the official name "Dictatorial Alignment", so each cell adds its ruler class after a dash, from a new optional `detailKey` of the bingo items: "Dictatorial Alignment – Commander (Dictatorial)". Official, Commander and Scientist are the game's leader class names (`official`, `commander`, `scientist` of `main_1_l_*.yml`: es "Oficial", "Comandante", "Científico"; jp 役人, 司令官, 科学者). **Draft**: the vacant variant (no ruler) has no game string; it reads es "Sin gobernante", en "No ruler", jp 統治者不在 (`authorityRulerVacant`) until the owner picks one.

## T2405 — Official names of the authorities bingo (2026-11-25)

- [ ] **Cell names**: the game names every variant on its own, so the 13 generic labels (`authorityVariant*`) are gone and each variant cell has its own key with the official name, followed by its base authority in brackets ("Cordant Multiplicity (Democratic)"). The ascension path is no longer written in the name (it stays in the cell's tag). Alternative: the official name alone.
- [ ] **Base names**: only Mutualistic Intelligence, Memory Aggregator and Neural Chorus were replaced (Mutualistic Intelligence also changes in the simulator, whose text it shares: jp 相利共生知性 → 共生的知識; es/en were already official). The other 7 base names are still the simulator's and differ from the game localisation in some cases (es "Democrática" / "Corporativa" / "Inteligencia de Máquina" vs "Democrático" / "Corporación" / "Inteligencia mecánica"; jp "帝政" / "ハイブマインド" / "企業制" vs "君主制" / "集合意識" / "企業"). They are left for P15 unless the owner wants them changed now.
- [ ] **Official texts kept as they are**, even where they look odd: es "Junta de física" (en "Board of Psychics"), "Información imperial" ("Imperial Feedback"), "Manifiesto dictatorial" ("Dictatorial Manifold").
- [ ] **Icon check**: 74 of the 75 icons are the game texture of the authority or swap `auth_<cell id>` (data of `authorities.json` and the T2524 export report), and that swap's trigger matches the path and variant of the cell. `Auth_cyber_dictatorial_collectivist.png` is the exception: 4.5.4 has no texture with that name, it splits the variant by ruler class (`_official`, `_commander`, `_scientist`, `_vacant`, all named "Dictatorial Alignment", images that look the same). The cell keeps the old icon and that name. **For T2406**: adding the 4 icons as cells would give five cells with the same picture and name; the options are to leave them out, or to replace the old cell by them and add the ruler class to the name.

## T2402 — Origins bingo in the in-game order (2026-11-25)

- The order is a generated module, `js/bingo-origin-order.js` (`tools/extract/build_origin_order.py`, from `origins.json`'s `game_order`), and each origin cell carries its game id (`origin`). The cells keep their `i18nKey` as id, so nothing else (marks, simulator) changes. The in-game order is still the definition order assumed in P25.11 (to be checked in game); with 4.5.4 it is the same order the hand-written list already had.
- The bingo keeps one cell per origin icon (54): the origins that share an icon with another one (Subterranean Machines, Subaquatic Machines, Voidforged, Radioactive Rovers, the Under One Rule variants) and the non-playable ones are not cells.
- Found while testing: the PNG download of the civics bingo took over a minute and gave no file, because the grayscale filter was set on the whole PNG canvas (one full-canvas layer per icon). Unmarked icons are now greyed on a small canvas of their own, and the PNG is downloaded from a Blob URL instead of a data URL.

## T3405 — Deep link into the planet simulator (2026-11-25)

- Format: `planet-sim.html#building=<id>` and `#district=<id>`, with the simulator ids of the tech data (`unlock.sim`). The link opens in the same tab, as before (the simulator's links to the tree open a new tab so the edited planet stays open; the other way there is nothing to lose).
- The link never changes the planet: it only opens the tab, the category and highlights the entry (outline in the accent colour, focus, scrolled into view). If the building's requirements are not met with the current empire, or the district belongs to another celestial body (Magma Conduit on a regular planet), the notice banner says it is not in the catalogue instead of switching the empire or body.
- Ids outside the building catalogue that the tech data links: capitals highlight the capital control (the tier is not changed; a capital of another set says it is not available) and branch office buildings open the Branch offices tab with a note to pick them in a slot.
- The highlight stays while the catalogue is redrawn until another deep link (or a hash without one) replaces it.

## T3404 — Documentation of the finished tech tree (2026-11-25)
- [ ] **README**: a new section "Árbol de tecnologías" (features, links, data sources, versions, tests); the module list stays in the structure table, and the tech tree checks got their own subsection under "Pruebas" (same text).
- [ ] **"The GDD" is `TECH_TREE_GDD.md`**: marked finished, the wiki removed as its source (owner's decision of 2026-11-22), page behaviour detailed in §6 and a new §8 on code and tests. `PLANET_SIM_GDD.md` only gets one sentence in §3 about the "Researched with" links.

## T3403 — Accessibility of the tech tree (2026-11-25)
- [ ] **One Tab stop per area (roving tabindex)**: Tab enters each area at its last focused node (at first, the first node; after a selection, the selected one) and the next Tab leaves the area, instead of crossing every node. The panel keeps its own Tab stop for panning with the arrows (T3204).
- [ ] **Arrow keys on a node**: → / ← go to the nearest node (vertically) of the next / previous non-empty tier column, ↓ / ↑ to the next / previous node of the same tier column across fields, Home / End to the first / last node of the area; Enter or Space selects. There is no key to jump along prerequisite lines (the card's prerequisite and "leads to" buttons do that).
- [ ] **Screen readers**: each node is described (`aria-describedby`) by its field label and, while something is selected, by its state text (the legend's texts, translated); the name stays "<technology> Tier N · Kind".
- [ ] **Contrast**: dimmed nodes (unrelated to the selection, or filtered out by the search) no longer use opacity on the whole node, which put the text below 4.5:1; they get muted text, a flat background and a soft border, and only their icon fades (filtered-out names also lose the bold). The kind colours of the left border are not checked as non-text contrast: the kind is also written in every node.

## T3402 — Links from the wiki and the simulator to the tech tree (2026-11-25)
- [ ] **Wiki tech mentions linked** (es/en/jp, first clear mention only): Proton / Neutron Launchers (`tech_energy_torpedoes_1/2`), Growth Chamber (`tech_growth_chamber_1`), Ancient Nano-Missile Cloud Launcher (`tech_archaeo_missiles`) and Disruptors (`tech_disruptors_1`). Ship classes (Corvettes, Titans…), Citadel, Juggernaut, Harbingers… are named as ships or structures in the articles, not as research, so they were not linked; "dark matter, Zro, nanites" and "Archaeotech" name several technologies each and were left alone.
- [ ] **"Useful links" lists our tech tree first** (`tech-tree.html`, same tab) and keeps BloodStainedCrow's tree, renamed "BloodStainedCrow's Stellaris Tech Tree" and described as the inspiration of ours. The intro paragraph still says "external pages" (the owner's text, untouched).
- [ ] **Simulator: a "Researched with: <technology>" line under every building of the catalogue** that a technology unlocks, one link per technology, opening the tech tree in a **new tab** so the planet being edited is not lost. The map comes from the tech data file (`unlocks[].sim`) through a small generated file, `js/tech-unlock-links.js` (`node tools/build-tech-links.mjs`, ~18 KB), instead of loading the 660 KB data file in the simulator. Capitals and branch office buildings (outside the catalogue) and districts get no link yet; the district entries are already in the file.

## T3401 — Interface texts of the tech tree in es/en/jp (2026-11-25)
- [ ] **The interface texts were already all in `js/i18n-tech-tree.js`** (es/en/jp, parity checked by the i18n audit); this task adds no new key. It adds a page check: in es and jp no English interface text and no raw key is visible (text, `aria-label`, `title`, `placeholder`).
- [ ] **Game names are marked `lang="en"`** (node names, field labels, area tabs and headings, the card title, description, area · field line, prerequisite/leads-to buttons, unlock names, variant names, search results, compare links and the area/field/DLC filter options) so screen readers read them with English pronunciation while the page is in es or jp. Area names mixed into translated sentences (zoom panel label) are not marked.
- [ ] **The Spanish search placeholder keeps "(en inglés)"** and the Japanese one "（英語）", since the names you can search are English until P15.

 — Comparison between two versions (2026-11-25)
- [ ] **A section of `tech-tree.html` below the tree** ("Compare versions"), not a separate page: two selectors (from, to; default from the version just older than the shown one to the shown one) and a Compare button. The other data file is downloaded only when Compare is pressed.
- [ ] **Only base cost, tier and prerequisites count as a change** (as the task says); name, description, kind, requirements, unlocks, effects or DLC changes are not reported. A technology whose id changes appears as removed + added.
- [ ] **Every technology links to its node** in the version where it exists (`?version=<id>#<tech id>`): removed ones to the old version, added and changed ones to the new one.
- [ ] **With a single data version** (today: 4.5.4) the section only says the comparison will be available when the next version is added.
- [ ] **A second test version** `tests/fixtures/tech-tree/tech-data-fixture-next.js` (the fixture with one added, one removed and five changed technologies, plus a description change that must be ignored) is what the tests compare; like the fixture, it is never offered on the site.

## T3301 — Version selector and per-version data loading (2026-11-25)
- [ ] **The only real version is 4.5.4**, not 4.5.2 as the task says: the tech tree data comes from the 4.5.4 game files since T3005; there is no 4.5.2 tech data file.
- [ ] **Registry of its own, `js/tech-versions.js`** (id, label, file, verification, current), separate from the simulator's `DATA_VERSIONS` (which is about the 4.5.2 wiki data); a test checks that its current version is the one `js/data-version.js` registers for `technologies`.
- [ ] **Changing version reloads the page** with `?version=<id>` (the current version has no parameter) and keeps the technology in the hash; only the chosen data file is downloaded (dynamic import). Rebuilding the tree in place was not worth it: every module (grid, lines, card, search, zoom) is built once per page.
- [ ] **The last choice is remembered in the browser** (`localStorage`) and used when the URL names no version; an unknown `?version=` shows the current version with a notice. The selector is shown even with one version.
- [ ] **The fixture is never offered on the site**: the tests serve the project locally and rewrite `js/tech-versions.js` to add it. The fixture was brought to the confirmed model (§4.3: `gameVersion`, `flags`, `effects`, `repeatable`) so the page can load it.

## T3205 — Deep link to a technology (2026-11-25)
- [ ] **The hash is the bare game id** (`tech-tree.html#tech_lasers_2`), not `#/tech/…`: short and readable; other anchors of the page (`#tech-credits`) are ignored because they are not ids.
- [ ] **Selecting a technology rewrites the hash with `replaceState`** (no history entry per click), and clearing the selection removes it, so the address bar can always be shared and Back leaves the tree.
- [ ] **An unknown `tech_…` id selects nothing** and the status line says it does not exist in this data version (translated).
- [ ] **The card has a "Link to this technology" link** (`#id`) to copy from the browser's link menu; no copy-to-clipboard button.
- [ ] **Wiki articles link with `[text](tech-tree.html#tech_id)`** (and `links` blocks with that URL); these open in the same tab, unlike external links. No existing article links a technology yet.

## T3204 — Zoom and pan (2026-11-25)
- [ ] **Pan = the panel's own scroll** (scroll bars, wheel, one finger, arrow keys with the panel focused) plus dragging the empty background with the mouse; no separate canvas.
- [ ] **One zoom level for the three areas**, 40 %–160 %, with steps 40/50/60/75/90/100/115/130/145/160 % for the buttons and keys; Ctrl + wheel and the pinch are continuous and zoom around the pointer / fingers.
- [ ] **Zoom with a CSS transform** of each grid inside a wrapper sized to the scaled grid (nodes and lines scale together, lines are not redrawn); at 100 % nothing is transformed. The zoom is not saved.
- [ ] **Keys `+`, `-`, `0`** only while the focus is inside the tree (a node or a panel), so they never interfere with the search box; the panels are now focusable regions named "<Area> tree".

## T3203 — Search and filters (2026-11-25)
- [ ] **Filtering dims, it does not hide**: the tree keeps its tier columns, field rows and lines; what does not match is dimmed (and its lines), search matches get an outline. Hiding would move the nodes and break the lines.
- [ ] **What the search looks at**: the English name, the variant names and the game id; every word must appear (accents and case ignored). Names are English in every language, so the placeholder says so in es/jp.
- [ ] **Result list capped at 30** (sorted by name) under the filters, with "… and N more (highlighted in the tree)"; a result selects the technology and shows it (switches the mobile tab).
- [ ] **Area filter on phones switches to that area's tab**; the field list only shows the fields of the chosen area. The DLC filter has a "Base game" option (technologies without DLC).
- [ ] **Filters are not saved** (reset on reload); the deep link (T3205) only carries the technology.

## T3202 — Whole prerequisite chain and dependents (2026-11-25)
- [ ] **The chain replaces the direct-only states of T3104**: selecting a technology marks every technology before it (teal) and every technology after it (orange), in every area; the direct ones (one step away) keep the glow, the rest only the coloured border. Lines are marked when both ends are in the chain.
- [ ] **Legend and status renamed**: "Prerequisite chain" and "Depends on the selected"; the status line gives the size of both chains ("12 in its prerequisite chain · 40 depend on it"). The card keeps the direct prerequisites and "Leads to".

## T3201 — Detail card of a technology (2026-11-25)
- [ ] **Where the card goes**: on desktop the board gets a second column (23rem, sticky) for the card, so it never covers a node and the three areas get narrower while it is open; on phones it is a bottom sheet (55 % of the screen) and the page gets room below to scroll the tree above it.
- [ ] **Simulator links open `planet-sim.html` only**: the simulator has no deep link to a building or district yet (new task T3405). Linked unlocks are marked "in the simulator" and linked jobs are highlighted; edicts and deposits are plain text (not linked by T3007).
- [ ] **Extra content not named in the task**: game id, area and field, variants (`technology_swap`, with their condition), the technologies it leads to (buttons), effects (`key = value` game lines), game flags (starter, rare, dangerous, insight, event) and the repeatable cost per level and levels.
- [ ] **Requirements and draw weight modifiers are shown as the game's script text** (monospace, `NOT` marked in red), not translated into sentences: the data file keeps them as Paradox text (GDD §4.3).
- [ ] **Area names stay in English** in the card (game names), like the area tabs.
- [ ] **Wording of the notes**: "Base cost: the game scales it with the game settings and the empire size" and "Information only: the research draw is not simulated" (draft texts, es/en/jp).

## T3105 — Tech tree on phones (2026-11-25)
- [ ] **Sideways scroll inside the area panel** instead of a different mobile layout: the grid keeps its tier columns and lines; nodes shrink to 9rem, the 40 px icon slot keeps its size and about one and a half tier columns fit on a 320 px screen.
- [ ] **Field names written vertically** (bottom to top) in a thin sticky column on phones, to leave the width to the nodes.
- [ ] **The site's mobile overflow check ignores elements inside `.tech-area-scroll`**: they are clipped by the panel's own scroll, the page itself does not scroll sideways (checked separately).

## T3104 — Visual states and kind colours (2026-11-25)
- [ ] **Kind colours**: starter green (accent), rare purple, dangerous red, repeatable blue, event yellow, acquisition amber, normal grey, on the left border of the node; the legend only lists the kinds the data file uses (no acquisition in 4.5.4).
- [ ] **State colours**: selected yellow-green with a tinted background, prerequisite teal dashed border, unlocked by the selected orange; the other nodes and lines are dimmed while something is selected.
- [ ] **Direct links only**: prerequisite and unlocked states mark the direct neighbours (the full chain is T3202), also in the other area panels.
- [ ] **Deselect** with a second click on the node or Escape; a live status line ("Selected: … · N prerequisites · unlocks M") summarises the selection until the detail card (T3201) exists.

## T3103 — Prerequisite lines (2026-11-25)
- [ ] **No lines across areas**: 74 of the 568 prerequisites of 4.5.4 link two areas; with the areas in separate panels (tabs on mobile) they cannot be drawn, so they will only be listed in the detail card (T3201).
- [ ] **Line shape**: a curve from the right edge of the prerequisite to the left edge of the technology; same-tier prerequisites (139) loop on the right side, and the 9 prerequisites of a higher tier go from the left edge back.

## T3102 — Tech tree grid and nodes (2026-11-25)
- [ ] **Nodes sorted by English name** inside each field × tier cell (no game order exists for display).
- [ ] **Kind names translated** as interface labels (es: Inicial, Rara, Peligrosa, Repetible, De evento, Adquisición; jp: 初期, レア, 危険, 繰り返し, イベント, 獲得); "Tier" is "Nivel" in Spanish and "ティア" in Japanese. Field and technology names stay in English.
- [ ] **Field labels stay at the left** (sticky) while an area panel scrolls sideways.

## T3101 — Tech tree page layout (2026-11-25)
- [ ] **Three areas side by side inside the 1180 px shell**, each one a panel with its own scroll (max 75 % of the screen height): the full tier grid of an area does not fit in a third of the page, and breaking out of the shell width would overflow on some screens. Zoom and pan (T3204) will make it easier to move around.
- [ ] **Area names stay in English** (Physics, Society, Engineering) in every language, as game names; the tabs and the rest of the interface are translated.
- [ ] **Data version line** shows the data file's `rulesetId`, the game version string of the files and the collection's verification status (there is no version selector yet: section 33).
- [ ] **Credits texts** (es / en / jp) written by Claude: inspiration links, "no code or data reused" and the Paradox notice linking `privacy.html`.

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
