# GDD: Stellaris Tech Tree Explorer (Codex Ignis — `tech-tree.html`)

Design rules and decisions of the tech tree. Pending work lives in `tasks.md` (sections 30–34); finished tasks are in git. Replaces the old Spanish plan `tech_tree.md` (same content, phases moved to `tasks.md`).

- **Ruleset:** Stellaris PC 4.5.4 "Cygnus" (`stellaris-pc-4.5.4`), read from the installed game files (owner, 2026-11-22). Data stays `unverified` until the final data review (T1406).
- **Scope:** only `tech-tree.html` and its modules. The planet simulator has its own GDD (`PLANET_SIM_GDD.md`).
- **Rule #1 (as in the simulator):** never invent rules, numbers or names. Everything comes from the wiki pages; missing or ambiguous data → the task is marked blocked with the question.
- **Status:** in progress. Data of 4.5.4 done (section 30); the page is being built (section 31). The owner decided on 2026-11-22 to start it now (the simulator only has tasks waiting for the owner left).

## 1. Goal
Turn the Stellaris wiki technology pages into an **explorable tech tree** inside Codex Ignis: see the technologies by area, field and tier, follow prerequisites and what each one unlocks, search and filter, and consult **previous versions** of the tree as the game is updated.

## 2. Credits and inspiration
Inspired by the *Stellaris Tech Tree* of **BloodStainedCrow** (https://bloodstainedcrow.github.io/stellaris-tech-tree/) and its older, outdated version by *turanar* (https://turanar.github.io/stellaris-tech-tree/index.html), already linked in "Enlaces útiles" of `js/content.js`.

- **No code or data is reused** from those projects: the tree is written from scratch and fed by the wiki. Only the idea is taken (layout by area and tier, prerequisite lines, explore on click).
- Credits are visible: a "Credits" section in `tech-tree.html` (links to both projects), a mention in `README.md` and in the page footer.
- Game data and names belong to Paradox Interactive (legal notice already in `privacy.html`). Data comes from the Stellaris wiki (`WIKI_URLS.md`), whose terms allow its use (confirmed by the owner on 2026-11-19); it is cited as the source.

## 3. Principles (inherited from the simulator)
- **Data-driven and versioned:** data lives in its own files, one per game version, never inside the drawing logic. Reuses the `js/data-version.js` registry (`DATA_VERSIONS`, `rulesetId`, verification statuses `unverified` → `wiki-verified`).
- **Honest:** whatever is not modelled is shown as such; nothing is filled in by eye.
- **No build step**, ES modules, the same terminal look and the shared page shell of the rest of the site.
- **Languages:** interface texts in `js/i18n-tech-tree.js` (the tech tree area of `js/i18n.js`, P23.4) with es/en/jp keys. Game names (technologies, buildings, components…) stay in **English** in every language until official localisation (P15) is unblocked; no hand translations.
- **Icons** from the assets repository (`STELLARIS_ASSETS_BASE`, `js/asset-config.js`; file list in `StellarisAssetsFileTree.txt`). The repository has **no technology icons** today; the extractor exports them (T2506) and the owner uploads them (T3008). Until then every node and card keeps a **reserved, fixed-size empty icon slot** (never a made-up placeholder): each record already carries its `icon` path (`technologies/<id>.png`), images load lazily, and a missing file leaves the frame empty without moving anything, so the icons appear on their own once uploaded.
- **No code or data from other tech tree projects** (owner, 2026-11-22): the data comes from our own game files extractor (`GAME_FILES_EXTRACTOR.md`).
- **Testable:** every task ends with browser checks in the smoke tests (load the page, open a node, search, switch version), like the simulator.

## 4. Sources and data model

### 4.1 Sources
**Primary source: the game files**, through `tools/extract/extract_technologies.py` (section 25 of `tasks.md`, design in `GAME_FILES_EXTRACTOR.md`): `common/technology/` (with `common/scripted_variables/` for tier costs), `localisation/` for names and descriptions, `interface/*.gfx` + `gfx/` for the icons. This gives the real game ids, base costs, weights, prerequisites and the start / rare / dangerous / event / repeatable flags, and it is repeatable for every new version. The owner decided on 2026-11-22 not to depend on the wiki, which cannot be extracted automatically.

**The wiki is no longer a source** (owner, 2026-11-22). The saved 4.5.2 pages in `../Codex Ignis Wiki/` were used to design the model; their structure is kept below for reference only.

| Page | Use |
|---|---|
| *Technology* | General rules: areas and fields, tech cards, research alternatives, tier gating, research speed (text for the info panel, no simulation). |
| *Physics research* | Fields Computing, Field Manipulation, Particles, plus "event technologies" tables. |
| *Society research* | Fields Biology, Military Theory, New Worlds, Statecraft, Psionics, Archaeostudies, plus event technologies. |
| *Engineering research* | Fields Industry, Materials, Propulsion, Voidcraft, plus event technologies. |
| *Research policies*, *Research buildings* | Context only (links); not part of the tree. |

Table columns per field: icon, **Technology** (name; description after `;`; authority-specific names in parentheses, e.g. "Administrative AI (Hive Mind Synaptic Enhancers; Machine Intelligence Academic Optimization)"), **Cost**, **Tier**, **Effects / unlocks**, **Prerequisites**, **Draw weight** (base + modifiers; missing in the event tables), **DLC**.

Known pitfalls of the wiki tables (relevant for the cross-check):
- **Row colour = kind** (Starter, Acquisition, Rare, Dangerous, Repeatable). The Markdown drops the colour: read it from the HTML.
- **Ids:** the wiki shows no technology id. The icon file name (`Tech_pd_tracking_2.png` → `tech_pd_tracking_2`) usually matches the game id, but some rows share an icon (e.g. *Automated Exploration Protocols* and *Autonomous Exploration Algorithms*, variants by authority). The id scheme is decided in T3001 and must be unique and stable across versions.
- **Prerequisites** mix technologies (icon `Tech_…`), resource access ("Access to Exotic Gases…"), years, authorities, origins and "not" requirements (red cross `No.png`). Only technology prerequisites draw lines; the rest is kept as requirement text.
- **Cost** can be empty (starter techs) and is the *base* cost (the game scales it with settings and empire size): shown as "base cost".
- **Tier gating:** researching tier N needs six or more techs of tier N−1 (*Physics research*, table notes). Shown as a rule, not simulated.

### 4.2 Model (proposal, confirmed in T3004 against the extractor output)
One record per technology: `id` (game id), `name` (English), `area` (`physics` / `society` / `engineering`), `field`, `tier`, `baseCost` (number or null), `kind` (`normal` / `starter` / `acquisition` / `rare` / `dangerous` / `repeatable` / `event`), `prerequisites` (tech ids), `requirements` (non-tech conditions, as text with a `not` flag), `unlocks` (text entries, optionally linked to simulator ids), `drawWeight` (base number + modifier lines as text, information only), `dlc` (list), `icon` (assets path, always filled: `technologies/<id>.png`, even before the file exists), `description` (English), `variants` (authority-specific names).

Automatic validations: every prerequisite exists, no cycles, no duplicate ids, every tech has an area, field and tier.

### 4.3 Confirmed model (T3004, against the extractor output of 4.5.4)
Checked on `data/generated/stellaris-pc-4.5.4/technologies.json` (679 technologies: 168 physics, 312 society, 199 engineering; tiers 0–5). The §4.2 model holds with these precisions; the data file (T3005, `tools/extract/build_tech_data.py`) writes exactly this, and `js/tech-tree-validate.js` checks it. Decisions taken without the owner are in `DECISIONS_TO_REVIEW.md` (T3004).

**Data file** (`js/tech-data/<rulesetId>.js`, `export const TECH_DATA`): `rulesetId`, `gameVersion` (e.g. `Cygnus v4.5.4 (1b4f)`), `source`, `areas` (`physics`, `society`, `engineering`), `fields` (`{id, area, name, icon}`; 13 used fields, each one in a single area), `tiers` (`{tier, previouslyUnlocked}`: the game's tier gating, 6 techs of the previous tier from tier 2 on, 0 for tier 1), `technologies`.

**Technology record:**
- `id`: the game key (`tech_…`). Unique in 4.5.4 (no duplicate), stable across versions. Variant ids are *not* nodes (see `variants`).
- `name`, `description`: English localisation (the extractor resolves `$key$` references).
- `area`, `field`: every technology has exactly one area and **one category** in 4.5.4, so `field` is a single id (the game allows a list; the first one is used if a later version adds more).
- `tier`: always present (0–5). Starter techs are tier 0 (38) or tier 1 (4).
- `baseCost`: number, or `null` when the game gives none (5 techs: four starters and `tech_asteroidal_carapace`). Base cost only; the game scales it.
- `kind`: one value per technology for the node colour, from the game flags with this priority: `repeatable` > `starter` (`start_tech`) > `event` (`is_event_tech`) > `dangerous` > `rare` > `normal`. Flags combine in the game (e.g. 41 rare + dangerous, 35 event + rare), so **all of them are also kept** in `flags` (`start`, `rare`, `dangerous`, `insight`, `repeatable`, `event`).
- **`acquisition` has no game flag**: the wiki colours it by hand. The 4.5.4 data file never uses it; it stays in the enum (the fixture uses it) in case a later rule derives it. The closest game notions are `insight` (13 techs, weight 0, obtained from insights) and the event techs.
- `prerequisites`: technology ids only; every one exists in 4.5.4 and there are no cycles.
- `requirements`: the `potential` block (376 techs: DLC, authority, origin, civic and game rule checks), one entry per top-level statement as Paradox text, `NOT = { … }` → `{text, not: true}`. `starting_potential` (19 techs, who starts with it) is not a requirement and is not shown yet.
- `unlocks`: not in the technology file; built from the other extracted sets that name the technology as a prerequisite (buildings, districts, edicts, deposits): `{type, id, name}` with the game id. **Simulator links (T3007):** when the simulator has the item, `sim: {collection, id}` (collection = the `js/data-version.js` key: `buildings`, `districts`) with the simulator id; buildings and districts also list the jobs they give (always or under a condition) as `jobs: [{id, sim?}]` (game job id, simulator job id when it has it). The links come from the matcher of `tools/extract/report_differences.py` (game id with the set prefix, then English name, then icon), so the data file is rebuilt when the simulator data changes. In 4.5.4: 133 of 238 building, 6 of 18 district and 251 of 547 job links; edicts and deposits are not linked. Ship components and other unlocks are not extracted yet.
- `effects`: the technology `modifier` block (243 techs) as `key = value` lines with game modifier keys; tooltips and effects kept as text.
- `drawWeight`: `base` (`weight`; `null` for 38 techs, 100 techs have 0 — event, insight and `tech_subspace_drive`) and `modifiers` (the `weight_modifier` statements as text). Information only.
- `dlc`: DLC names derived from the requirements (13 DLCs in 4.5.4, e.g. The Machine Age 28 techs).
- `icon`: the extractor's asset path. It is **not always `technologies/<id>.png`**: 5 techs reuse another texture (e.g. `tech_archeology_lab_ancrel` → `technologies/tech_archeology_lab.png`), so the rule is `technologies/<texture name>.png`, always filled.
- `variants`: the game `technology_swap` blocks (180 techs, 206 swaps): `{id, name, condition}`. 127 swaps have their own icon and 32 swap ids are also ids of other technologies, so variants are only shown inside their base node, never as nodes.
- `repeatable` (only repeatable techs, 26): `{costPerLevel, levels}` with `levels: null` for unlimited (21 techs, game `-1`) and 5 for the capped ones.
- Not kept: `gateway` (52 techs, a research grouping of the AI), `feature_flags`, `reverse_engineerable`, `cost_modifiers` (resolution factors; information for later).

## 5. Versions
- One data file per version (`rulesetId`, e.g. `stellaris-pc-4.5.2`); a new wiki version is **added as a new file, never overwriting the previous one**.
- Version selector in the page (same pattern as the simulator) and the version shown in every card. **Done in T3301:** the versions are listed in `js/tech-versions.js` (one entry per data file, the newest marked `isCurrent`); the page loads only the chosen file, picked from `?version=<id>`, then the last choice stored in the browser, then the current version; choosing another one reloads the page with `?version=` and keeps the technology in the hash.
- Comparison between two versions: added, removed, and changed cost, tier or prerequisites.
- Procedure for a new version (T3302; also in `python tools/extract/build_tech_data.py --help`), which never overwrites a previous version because every step is named after the new `rulesetId`:
  1. `extract_all.py` on the game files of the new version → `data/generated/<rulesetId>/` (a new folder next to the old ones).
  2. Run the validations on that folder (`report_differences.py`).
  3. `build_tech_data.py --data data/generated/<rulesetId>` → `js/tech-data/<rulesetId>.js` (a new file; never pass `--out` pointing at an old one).
  4. Add one entry to `js/tech-versions.js` (id, label, file, `verification: "unverified"`), move `isCurrent` to it and keep the old entries.
  5. Upload the new icons to StellarisAssets, regenerate `StellarisAssetsFileTree.txt`, register the version in `data-version.js`.
  6. Run the smoke tests and update `README.md` if the structure changed.

## 6. Page
- Shared page shell (header, language selector, footer) of the rest of the site.
- Three areas side by side (tabs on mobile); inside each area, columns by tier and rows grouped by field.
- Nodes: name, tier and kind; prerequisite lines in SVG.
- States: normal, selected, prerequisite of the selected, unlocked by the selected, and kind colours (rare, dangerous, starter, repeatable, event).
- Detail card: base cost, tier, kind, description, prerequisites and requirements, unlocks, draw weight, DLC, version.
- Exploration: highlight the whole prerequisite chain and everything that depends on the selected tech; accent-insensitive search; filters (area, field, tier, kind, DLC); zoom and pan; deep link by URL hash.

## 7. Not modelled / ideas for later
- Mark techs as researched and compute what is left to reach a goal; save/export a research path (JSON, like the simulator's planets).
- Let the planet simulator hide buildings not unlocked yet (today it assumes all research done).
- Research draw simulation (weights, alternatives): out of scope, weights are shown as information only.
