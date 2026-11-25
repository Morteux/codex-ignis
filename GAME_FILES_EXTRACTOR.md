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

## 7. What stays unmodelled

- Triggers and effects (`potential`, `allow`, `possible`, `destroy_trigger`, `on_built`, `triggered_*_modifier` conditions, `weight_modifier` / `ai_weight` modifiers, `convert_to`...): kept as Paradox text, never evaluated. The site keeps deciding what applies with its own rules.
- Scripted triggers and scripted effects are not expanded (their names appear inside the text).
- `script_values` and `complex_trigger_modifier` stay as text or strings.
- AI weights (`ai_weight`) are dropped; other `weight` / `weight_modifier` blocks keep the base number plus the modifiers as text.
- Event, ship, leader and galaxy data are out of scope.
- Values the game computes at run time (tech cost scaling with empire size, job outputs from modifiers of other items) are not computed: only the numbers written in the files.
