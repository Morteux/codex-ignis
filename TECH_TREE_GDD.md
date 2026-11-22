# GDD: Stellaris Tech Tree Explorer (Codex Ignis — `tech-tree.html`)

Design rules and decisions of the tech tree. Pending work lives in `tasks.md` (sections 30–34); finished tasks are in git. Replaces the old Spanish plan `tech_tree.md` (same content, phases moved to `tasks.md`).

- **Ruleset:** Stellaris PC 4.5.4 "Cygnus" (`stellaris-pc-4.5.4`), read from the installed game files (owner, 2026-11-22). Data stays `unverified` until the final data review (T1406).
- **Scope:** only `tech-tree.html` and its modules. The planet simulator has its own GDD (`PLANET_SIM_GDD.md`).
- **Rule #1 (as in the simulator):** never invent rules, numbers or names. Everything comes from the wiki pages; missing or ambiguous data → the task is marked blocked with the question.
- **Status:** not started. `tech-tree.html` is a placeholder page. The owner decided on 2026-11-22 to start it now (the simulator only has tasks waiting for the owner left).

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
- **Languages:** interface texts in `js/i18n.js` with es/en/jp keys. Game names (technologies, buildings, components…) stay in **English** in every language until official localisation (P15) is unblocked; no hand translations.
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

## 5. Versions
- One data file per version (`rulesetId`, e.g. `stellaris-pc-4.5.2`); a new wiki version is **added as a new file, never overwriting the previous one**.
- Version selector in the page (same pattern as the simulator) and the version shown in every card.
- Comparison between two versions: added, removed, and changed cost, tier or prerequisites.
- Procedure for a new version (T3302): run `extract_technologies.py` (or `extract_all.py`) on the game files of the new version with its `rulesetId`, run the validations, upload the new icons, register it in `data-version.js`.

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
