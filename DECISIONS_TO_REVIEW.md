# Decisions to review

Decisions Claude took on its own while implementing tasks, pending the owner's review. When the owner confirms or changes one, move it to `PLANET_SIM_GDD.md` (as an owner decision) and remove it from here. Newest first.

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
