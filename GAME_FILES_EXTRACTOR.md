# Game files extractor

Design of the extractor of section 25 of `tasks.md`: Python scripts that read the installed Stellaris game files and write the data sets and icons the site uses. It replaces the wiki as data source (the wiki cannot be scraped automatically). The game files are only read, never modified, and never committed to this repository.

## 1. Folder layout

```
tools/extract/
  pdx/                      shared library (a Python package)
    __init__.py
    parser.py               Paradox script parser (§4)
    localisation.py         localisation reader (§5)
    icons.py                sprites of interface/*.gfx and DDS → PNG export (§6)
    assets.py               full export of the game's 2D images: categories, names, export, index (§6e)
    game.py                 GameFiles: game folder, rulesetId, scripted variables, inline scripts,
                            cached parsing of a common/ folder, localisation, icon lookup
    output.py               JSON writing, warnings, manifest
    text.py                 helpers shared by the extractors (blocks kept as text, resources, DLC)
  extract_technologies.py   one script per data set (§3)
  extract_jobs.py
  ...
  extract_all.py            runs every extractor or a subset and writes the manifest
  refresh_dlc.py            recomputes the `dlc` lists of generated data from its stored conditions (T2527)
tests/extract/              unit tests (python -m unittest discover -s tests/extract)
tests/fixtures/game-files/  small hand-written samples that mimic the game folder
data/generated/<rulesetId>/ generated data (committed: the simulator will read it, T2523)
reports/<rulesetId>/        difference reports against the simulator data (T2522)
```

Every `extract_<set>.py` exposes `extract(game) -> dict` and a `main()` with the common command line, so any data set can be extracted on its own:

```
python tools/extract/extract_jobs.py [--game DIR] [--out DIR] [--icons [DIR]]
python tools/extract/extract_all.py  [--game DIR] [--out DIR] [--icons [DIR]] [--only technologies,jobs]
```

Python 3.10 or newer; the only dependency is Pillow (icons).

## 2. Input and outputs

**Game folder**: `--game DIR`, else the `STELLARIS_GAME_DIR` environment variable, else `D:/Program Files (x86)/Steam/steamapps/common/Stellaris`.

**Version**: `launcher-settings.json` → `rawVersion` (`v4.5.4`) gives the `rulesetId` `stellaris-pc-4.5.4` (`stellaris-pc-` + the version without the `v`). Every output carries it, and the output folder is named after it, so two game versions never mix.

**Data**: `data/generated/<rulesetId>/<set>.json` (or `--out DIR`), UTF-8, keys in the game's order:

```json
{
  "set": "jobs",
  "rulesetId": "stellaris-pc-4.5.4",
  "gameVersion": "Cygnus v4.5.4 (1b4f)",
  "sources": ["common/pop_jobs"],
  "count": 250,
  "items": [ { "id": "miner", "file": "common/pop_jobs/03_worker_jobs.txt", "name": "Miner", ... } ],
  "warnings": ["..."]
}
```

- `id` is the game key; `file` is the game file it comes from (relative to the game folder).
- `name` / `desc` are the English localisation with `$key$` references resolved; colour codes and `£icon£` markers are kept as they are (the site renders them, see §5).
- Numbers stay numbers; scripted variables (`@tier1cost3`) and inline maths are resolved; when a value cannot be resolved it is kept as a string and a warning is added.
- Conditions (`potential`, `allow`, `possible`, `trigger`, weight `modifier` blocks...) are kept as **text** (the block re-printed in Paradox syntax), never interpreted.
- `dlc`: the DLC names (as the game writes them) of the `host_has_dlc` of the item's conditions and of every scripted trigger of `common/scripted_triggers` that checks a DLC, directly or through another trigger (`has_lithoids`, `has_ancrel`, `has_genetic_dlc`…; T2527), set to `yes` or `no`. A DLC named only inside a `NOT` or an `OR` is listed too; `dlc.json` keeps the map of those triggers (`scripted_triggers`: name → DLCs, each `negated` / `alternative`) for whoever needs the details. `refresh_dlc.py` recomputes the `dlc` lists of an already generated folder from its stored condition texts (used when the installed game is a newer version than the data).
- `icon`: `{ "sprite": "GFX_...", "texture": "gfx/....dds", "asset": "jobs/job_miner.png" }` (`asset` = path inside StellarisAssets), or `null`.

**Localisation of every language** (T2520): `data/generated/<rulesetId>/localisation/<language>.json` with `{ "rulesetId": ..., "language": ..., "sets": { "<set>": { "<id>": "name" } } }` (names only, `null` when the language has no text; swaps and options included) for the 10 game languages (`english`, `braz_por`, `french`, `german`, `japanese`, `korean`, `polish`, `russian`, `simp_chinese`, `spanish`). Not used by the site until phase P15 is unblocked.

**Icons**: only with `--icons [DIR]`; `DIR` defaults to the StellarisAssets repository `C:/Users/ignis/OneDrive/Documentos/StellarisAssets`. Each `.dds` is converted to `.png` (first frame of multi-frame sprites) into the folder that kind already uses there, with the file name that folder already uses (§6). The loop commits in StellarisAssets with `git -C`, the owner pushes; after an export `StellarisAssetsFileTree.txt` of this project is regenerated.

**Manifest**: `data/generated/<rulesetId>/manifest.json`, written by `extract_all.py`: `rulesetId`, `gameVersion`, the date, and for every set its file, `count`, `warnings` and, with `--icons`, the exported / replaced / missing icon counts.

## 3. Data sets and game folders

| Set (`<set>.json`) | Script | Game folders | Icons (game → StellarisAssets) |
|---|---|---|---|
| `technologies` | `extract_technologies.py` | `common/technology` (+ `category/`, `tier/`) | `gfx/interface/icons/technologies` → `technologies/` (new) |
| `jobs` | `extract_jobs.py` | `common/pop_jobs`, `common/pop_categories` | `gfx/interface/icons/jobs` → `jobs/` |
| `buildings` | `extract_buildings.py` | `common/buildings` | `gfx/interface/icons/buildings` → `buildings/` |
| `districts`, `zones` (the district specializations), `zone_slots` | `extract_districts.py` | `common/districts`, `common/zones`, `common/zone_slots` | `gfx/interface/icons/districts` → `districs/` (sic, the existing folder); zones (sprite `GFX_district_specialization_*`) → `districts_specialization/`, named after the sprite |
| `designations` | `extract_designations.py` | `common/colony_types` | frames of the `GFX_colony_type` sheet (`gfx/interface/planetview/colony_type.dds`) → `designations/` (new), named after the sprite (`colony_type_mine.png`) |
| `civics`, `origins` | `extract_civics.py` | `common/governments/civics` | `gfx/interface/icons/governments/civics` → `civics/`; `gfx/interface/icons/origins` → `origin_icons/` |
| `authorities` | `extract_authorities.py` | `common/governments/authorities` | `gfx/interface/icons/governments/authorities` → `authorities/` |
| `ethics` | `extract_ethics.py` | `common/ethics`, `common/ethic_categories` | `gfx/interface/icons/ethics` → `ethics/` |
| `planet_classes` | `extract_planets.py` | `common/planet_classes` | `gfx/interface/icons/planet_backgrounds`… → `planets/` |
| `planet_modifiers`, `static_modifiers`, `deposits` | `extract_planet_features.py` | `common/planet_modifiers`, `common/static_modifiers`, `common/deposits`, `common/deposit_categories` | `gfx/interface/icons/planet_modifiers` → `planet_modifiers/`; `gfx/interface/icons/deposits` → `planetary_features/` |
| `edicts` | `extract_edicts.py` | `common/edicts` | `gfx/interface/icons/edicts` → `edicts/` (new) |
| `policies` | `extract_policies.py` | `common/policies` | → `policies/` (new) |
| `living_standards` (+ `species_upkeep`) | `extract_living_standards.py` | `common/species_rights/living_standards`, `common/pop_categories` (trade per living standard), `common/traits` (species type upkeep) | none |
| `economic_categories` | `extract_economic_categories.py` | `common/economic_categories` | none |
| `dlc` | `extract_dlc.py` | `dlc/*/*.dlc`, `interface/dlc_icons.gfx` | `gfx/interface/icons/dlc` → `dlc/` (new) |
| `species_traits` (T4110) | `extract_species_traits.py` | `common/traits` (leader traits, with a `leader_class`, left out) | `gfx/interface/icons/traits` → `species_traits/` (new) |
| `ascension_perks` (T4110) | `extract_ascension_perks.py` | `common/ascension_perks` | `gfx/interface/icons/ascension_perks` → `ascension_perks/` (new) |
| `tradition_categories`, `traditions` (T4110) | `extract_traditions.py` | `common/tradition_categories`, `common/traditions` | `gfx/interface/icons/traditions` → `traditions/` (new) |
| `ship_components` (T4110) | `extract_ship_components.py` | `common/component_templates` (`*_component_template` blocks by `key`; the `*.csv` weapon stats override the `.txt` values) | the component sprite → `ship_components/` (new) |
| `megastructures` (T4110) | `extract_megastructures.py` | `common/megastructures` (every stage) | the `portrait` sprite → `megastructures/` (new) |
| `crisis_paths`, `crisis_levels`, `menace_perks`, `crisis_objectives` (T4110) | `extract_crises.py` | `common/crisis_paths`, `common/crisis_levels`, `common/menace_perks`, `common/crisis_objectives` | none |
| `fallen_empires` (T4110) | `extract_fallen_empires.py` | `common/fallen_empires` (authority, ethics, civics, origin and traits of `create_country_effect`) | none |
| `events` (T4110) | `extract_events.py` | `events/**` (every `*_event` with a window and an English title: title, descriptions, option names) | none |
| `resources` (icons only, T2525) | `extract_economic_categories.py` | `common/strategic_resources` | `gfx/interface/icons/resources` → `resources/` |

Shared inputs, read by the library for every set:

- `common/scripted_variables/*.txt`: global `@variables` (§4).
- `common/inline_scripts/**.txt`: expanded where an `inline_script` appears (§4).
- `localisation/<language>/**/*_l_<language>.yml` and `localisation/<language>/replace/` (§5).
- `interface/**/*.gfx`: sprite name → texture file (§6).
- `gfx/**.dds`: the textures.
- `launcher-settings.json`: version.

The exact folders of the "…" icon rows are confirmed by the task of each set (the icon of an item comes from its `icon` field or the sprite naming convention of that kind, e.g. `GFX_job_<id>`, `GFX_<building>`), and the set's JSON records the sprite actually used.

## 4. Paradox script parser

`pdx.parser.parse(text, variables=None, inline_scripts=None) -> list[(key, op, value)]`.

- A file is a list of statements `key op value`; `op` is one of `=`, `<`, `>`, `<=`, `>=`, `!=`, `==`, `?=`. A value is a scalar, a quoted string or a block `{ ... }`.
- A block is kept as a `Block`: an ordered list of statements plus the bare values of a list (`category = { computing }`, `prerequisites = { "a" "b" }`). Repeated keys are all kept, in order (`modifier = {...}` three times); `block.get(key)`, `block.get_all(key)`, `block.values` and `block.to_python()` (dict where a repeated key becomes a list) read it.
- Scalars: `yes` / `no` → `True` / `False`, integers and decimals → numbers, the rest → strings. Quoted strings stay strings (`"10"` stays `"10"`) and keep their contents untouched.
- Colours: `rgb { 255 0 0 }`, `hsv { 0.5 0.2 0.8 }`, `hsv360 { ... }` → `Color(space, values)`.
- Comments `# ...` up to the end of the line, outside quoted strings. BOM ignored.
- `@name = value` at top level defines a local variable; `@name` used as a value is replaced by the local, then the global (`common/scripted_variables`) value; unknown names stay as the string `@name` and are reported.
- Inline maths `@[ expr ]` (`+ - * /`, brackets, numbers and variable names with or without `@`) is evaluated.
- `inline_script = "path"` or `inline_script = { script = path PARAM = value }` is replaced by the statements of `common/inline_scripts/<path>.txt`, with every `$PARAM$` substituted (and `$PARAM|default$`), recursively.
- `pdx.parser.to_text(block)` re-prints a block in Paradox syntax (used to keep conditions as text).

## 5. Localisation reader

- Files `localisation/<language>/**/*_l_<language>.yml`, UTF-8 with BOM, first line `l_<language>:`, then `key:0 "text"` (the number is a version, ignored; it may be absent). The text runs to the last `"` of the line; inner quotes are not escaped by the game. `#` comments outside the text are ignored.
- Files under `localisation/<language>/replace/` (and any file whose folder is named `replace`) override the others; otherwise a later file overrides an earlier one in path order.
- `$key$` references are resolved recursively (cycles stop and keep the reference); `$key|Y$`-style formatting suffixes are dropped; unknown keys stay as `$key$`.
- Colour codes `§X ... §!` and icon markers `£icon£` / `£icon|frame£` are kept in `name` / `desc`; `pdx.localisation.plain(text)` strips them for comparisons (T2522).
- `Localisation(game_dir).language('english')` loads one language lazily; `languages()` lists the folders found (all 10 are extracted).

## 6. Icon exporter

- Every `interface/**/*.gfx` is parsed; each `spriteType` (also `frameAnimatedSpriteType`, `corneredTileSpriteType`) gives `name` → `texturefile` (+ `noOfFrames`). A sprite of a sprite sheet (`sprite_sheet_sprite_type = "GFX_sheet"`, `default_frame = n`, 1-based) uses frame `n` of the sheet's texture.
- An item's icon is found by its sprite (`GFX_...`) when the game script names one, otherwise by the kind's convention (for example `gfx/interface/icons/jobs/job_<id>.dds`). Case and `\` / `/` are normalised.
- `.dds` → `.png` with Pillow (DXT1/3/5, BC7 and uncompressed DDS). Multi-frame strips are cropped to the first frame (width / frames).
- File name in StellarisAssets: if the target folder already has a file whose name matches case-insensitively (or after the folder's known prefix change, such as `ethic_authoritarian` → `Authoritarian`, `civic_x` → `Civic_x`, `d_x` → `D_x`), that exact name is reused and the file is replaced; otherwise the new file follows the folder's style (capitalised first letter if every file there has one). Replaced and new files are listed in the export report (for the commit message, T2524): `extract_all.py --icons` writes it to `reports/<rulesetId>/icon_export.json` (`new`, `replaced`, `unchanged`, `kept_larger`, `missing`).
- After an export: commit in StellarisAssets with `git -C` (never push) and regenerate `StellarisAssetsFileTree.txt` with `node tools/extract/assets_file_tree.mjs` (files known to git there, folders first, `localeCompare` order).

## 6b. Difference report (T2522)

`python tools/extract/report_differences.py [--data DIR] [--out DIR] [--simulator FILE]` compares the generated data with the simulator data and writes `reports/<rulesetId>/<set>.md`, `README.md` (summary table) and `summary.json`. The simulator data comes from `node tools/extract/dump_simulator_data.mjs` (every export of `js/*-data.js`, `js/bingo-items.js` and `js/civic-rules.js`, the policy groups and the English texts of the `js/i18n-*.js` areas); nothing in `js/` changes.

- Matching: the simulator id in snake_case with the set's game prefix (`capacitySubsidies` → `capacity_subsidies`, `researchLab` → `building_research_lab`), then the English name, then the icon (only for items without a name, since icons are shared). The job swaps and authority variants are items of their own; the planet modifiers are also matched against the named static modifiers.
- Compared: job outputs (produces minus upkeep, research as `physics` / `society` / `engineering`, job amenities divided by 100), building and district jobs, cost, build time, upkeep and housing, ethic cost, edict cost and upkeep, the name and the icon (same folder only). Game values under a condition are shown as `(conditional: ...)` and a simulator value equal to one of them is not a difference.
- Sets the simulator does not model (`zones`, `zone_slots`, `static_modifiers`, `economic_categories`, `dlc`) only appear in the summary.

## 6c. Build times of the simulator (T2601)

`python tools/extract/build_build_times.py [--data DIR] [--simulator FILE] [--check]` writes `js/build-time-data.js`: the `base_buildtime` of every simulator building and capital (T2522 matching, with the `upgrades` chain of each building), district (hand-kept table simulator district → game district in the script) and specialization (zones matched by icon), plus the civics, origins and designations of the simulator whose game modifier changes the build speed or the Build Queue Capacity. Items with no game time stay `null` and the script prints them. See `PLANET_SIM_GDD.md` §6.2.

## 6d. Interface icons of the site's concepts (T2602)

`python tools/extract/export_ui_icons.py [--game DIR] [--assets DIR] [--check]` exports the tooltip text icons (`GFX_text_*` → StellarisAssets `text_icons/`, named after the game texture), the pop category (stratum) icons (`gfx/interface/icons/pop_categories/` → `pop_categories/`) and the four resource modifier icons of every simulator resource (`GFX_mod_<res>_produces_add|produces_mult|upkeep_add|upkeep_mult` → `modifiers/`). The concept → icon → page list is `ICONS.md`.

## 6e. Full export of the game's 2D images (section 27)

Goal: every 2D image of the game in StellarisAssets, sorted in folders and indexed, so any page can use any icon without a new export. The rules live in `tools/extract/pdx/assets.py` (`classify`); `python tools/extract/inventory_assets.py [--game DIR] [--json FILE]` prints the inventory below.

**Inventory (4.5.4, T2701)**: 23 484 image files (`.dds`, `.tga`, `.png`, `.bmp`; 19.1 GB). The DLC folders hold only their `thumbnail.png`: their `.zip` files have music and sound, no image. 8 955 sprites in `interface/**/*.gfx` (15 name a texture that does not exist); 1 089 textures are strips of 2 to 70 frames (most are 3-frame buttons).

| Category (StellarisAssets folder) | Game folder | Files | DDS MB | Output PNG files |
|---|---|---:|---:|---:|
| one folder per `gfx/interface/icons/<folder>` (61 folders, see below) | `gfx/interface/icons/` | 9 777 | 201 | 11 337 |
| `interface/<folder>/` | the other `gfx/interface/` folders (buttons, tiles, planetview, council_view, fleet_view, shroud…) | 2 680 | 460 | 4 307 |
| `event_pictures/` | `gfx/event_pictures` | 662 | 153 | 662 |
| `loading_screens/` | `gfx/loadingscreens` | 21 | 78 | 21 |
| `flags/<folder>/` | `flags/` (emblems by set + `backgrounds/`) | 1 259 | 128 | 1 259 |
| `portraits/<folder>/` | `gfx/portraits/` (city sets, environments, arkships, leader and species preview backgrounds) | 587 | 678 | 587 |
| `key_icons/` | `gfx/keyicons` | 72 | 0.1 | 72 |
| `dlc_thumbnails/` | `dlc/<dlc>/thumbnail.png` | 33 | 3 | 33 |
| `wallpapers/` | `wallpaper/` | 8 | 5 | 8 |
| **included** | | **15 099** | **1 705** | **18 286** |
| left out: species portrait layers | `gfx/models/portraits` | 3 221 | 1 517 | (T2705) |
| left out: 3D textures | `gfx/models` (ships, planets, effects, 3D UI scenes), `gfx/map`, `gfx/particles`, `gfx/FX`, `gfx/worldgfx`, `gfx/arrows` | 4 944 | 15 834 | — |
| left out: other | `gfx/fonts`, `gfx/cursors`, `gfx/portraits/misc` (colour tables), launcher and tool folders (`pdx_launcher`, `pdx_online_assets`, `previewer_assets`, `tweakergui_assets`, `assets`), `ebook`, `soundtrack`, `gfx/*.dds` | 220 | 42 | — |

Icon folders (`gfx/interface/icons/<folder>` → StellarisAssets): the folders StellarisAssets already uses keep their names (`buildings`, `jobs`, `districts` → `districs`, `districts/district_specialization_icons` → `districts_specialization`, `governments/civics` → `civics`, `governments/authorities` → `authorities`, `origins` → `origin_icons`, `ethics`, `modifiers`, `planet_modifiers`, `deposits` → `planetary_features`, `planet_backgrounds` → `planets`, `pop_categories`, `resources`, `technologies`, `text_icons`, `dlc`, `diplomatic_stance` → `diplomatic_stances`); the data-set folders planned in §3 too (`traits` → `species_traits`, `ship_parts` → `ship_components`, `ascension_perks`, `traditions`, `megastructures`); every other one gets a folder of its own name (`achievements`, `patrons`, `specimens`, `relics`, `mutations`, `situation_log`, `message`, `crisis`…; spaces become `_`), and the loose files of `gfx/interface/icons/` go to `icons/`. The StellarisAssets folders not fed by a game folder (`designations`, `origins`, `edicts`) are left as they are.

**Layout and names**:

- Icon folders are **flat** (like the existing ones): `<folder>/<name>.png`, whatever game sub-folder the texture is in. The other categories keep the game's sub-folders below their folder (`interface/buttons/…`, `flags/human/…`, `portraits/city_sets/…`).
- `<name>`: the name a generated data set already gives the icon (`icon.asset` of `data/generated/<rulesetId>/*.json`), else the **sprite key** of the `.gfx` without its `GFX_` prefix (the sprite named after the texture when several share it, else the first by name), else the texture's file name (most building, job, modifier, technology and flag textures have no sprite: the game finds them by convention). Characters other than letters, digits, `_`, `-` and `.` become `_`.
- In the folders StellarisAssets already had, an existing file with the same name (case-insensitive) or the same pixels is reused, and new files follow the folder's capitalisation (§6).
- **Sprite strips** (`noOfFrames` > 1) are split: one file per frame, `<name>_<frame>.png` with the frame **1-based** like the game's `£icon|frame£` and `default_frame`. The sprites of a sprite sheet (`sprite_sheet_sprite_type`) get no file of their own: the index (T2704) points them to the frame file. A texture is written once even if several sprites use it; the other sprite keys are aliases in the index.
- Two textures that would get the same name in a flat folder: the second (path order) is prefixed with its game sub-folder (`<sub>_<name>`), then numbered.

**Size budget**: StellarisAssets is served by GitHub Pages, whose published site must stay **under 1 GB**; GitHub also refuses files over 100 MB and recommends repositories under 1 GB. The included categories, converted to PNG, are about 450 MB (sampled ratios PNG / DDS: icons 0.42, event pictures 0.5, loading screens 0.62, portrait backgrounds 0.16, flags 0.08, interface 0.05–0.25), the largest file a few MB. The species portrait layers alone would add about 600 MB and push the site over 1 GB, so they wait for the owner (T2705). Pushes go in batches of at most about 200 MB: one category per commit and push, or several small ones together (T2703).

**Out**: 3D meshes and every texture of a 3D model, map, particle or shader, videos, sounds and music, fonts, cursors, the launcher and the development tools.

**Export script (T2702)**: `python tools/extract/export_assets.py [--game DIR] [--assets DIR] [--only CAT,CAT] [--list] [--report FILE]`.

- `--only` takes category names (the StellarisAssets folder: `buildings`, `flags`, `interface`, `event_pictures`…; `--list` prints them with their sizes in the game files). Names are always chosen over every category, so exporting one category at a time gives the same files as exporting all.
- DDS (DXT1/3/5, BC7, uncompressed), TGA, PNG and BMP → RGBA PNG (Pillow, `optimize`). Strips are cut into `width / frames` columns (a width that is not a multiple is a warning).
- **Idempotent**: a planned file that exists with the same pixels is left untouched; with other pixels it is replaced, unless the old one is larger (kept, like §6); nothing is ever deleted. A cache outside both repositories (`.cache/asset_export_<rulesetId>.json`, git-ignored: size and date of each game file and the file written for each frame, plus the pixel hashes of the older folders) skips decoding unchanged textures; without it the pixels are compared, with the same result.
- **Manifest**: `manifest.json` at the root of StellarisAssets, rewritten only when it changes: `generator`, `rulesetId`, `gameVersion`, per category `textures`, `files`, `bytes`, and `warnings` per category (unreadable files, strips whose width is not a multiple of the frames) plus `sprites` (sprites whose texture is not in the game files). With `--only`, the other categories keep what the manifest had.
- Report: counts of `new`, `replaced`, `unchanged`, `reused` (an older file with the same pixels), `kept_larger`, `failed`; `--report FILE` writes the lists.
- Tests: `tests/extract/test_assets.py` on the samples of `tests/fixtures/game-files/` (`interface/assets_samples.gfx`, a 3-frame strip and a sprite sheet sprite, two textures with the same name, a TGA flag, an event picture with two sprites, a DLC thumbnail, a 3D texture left out and an unreadable file).

## 7. What stays unmodelled

- Triggers and effects (`potential`, `allow`, `possible`, `destroy_trigger`, `on_built`, `triggered_*_modifier` conditions, `weight_modifier` / `ai_weight` modifiers, `convert_to`...): kept as Paradox text, never evaluated. The site keeps deciding what applies with its own rules.
- Scripted triggers and scripted effects are not expanded (their names appear inside the text).
- `script_values` and `complex_trigger_modifier` stay as text or strings.
- AI weights (`ai_weight`) are dropped; other `weight` / `weight_modifier` blocks keep the base number plus the modifiers as text.
- Event, ship, leader and galaxy data are out of scope.
- Values the game computes at run time (tech cost scaling with empire size, job outputs from modifiers of other items) are not computed: only the numbers written in the files.
