# Official localisation plan (P15)

Plan of section 15 of `tasks.md` (T1501). It decides where the official game strings come from, how
they reach the pages, which languages each page offers and what happens to the texts the game has
no string for. Decisions taken without the owner are listed in `DECISIONS_TO_REVIEW.md` (T1501).

## 1. Source

- The official strings are the extractor output (T2503, T2520):
  `data/generated/<rulesetId>/localisation/<language>.json`, `{set: {gameId: name}}` for the 10 game
  languages and 19 data sets (jobs, buildings, districts, designations, civics, origins, ethics,
  authorities, planet classes, planet modifiers, deposits, policies, edicts, technologies…).
  A `null` name means the game has no string in that language.
- The ruleset is the project one (`stellaris-pc-4.5.4`). The generated folder is never regenerated
  from another game version for this section (the installed game is 4.6.0, T2526).
- Resources and the technology areas and fields are not data sets of the extractor. Their names
  (`energy`, `minerals`, `food`, `alloys`, `consumer_goods`, `unity`, the three research kinds,
  `amenities`, `trade`…, `PHYSICS`…, `field_manipulation`…) are read with the same localisation reader
  (`tools/extract/pdx/localisation.py`) from the game folder into
  `data/localisation/game-folder-names.json`, with the game version read. Only names are taken from
  it, never figures.

## 2. Keys: every game name keyed by its game id

- The pages keep their i18n keys (`jobMiner`, `civicCorveeSystem`, `resourceEnergy`…). A generated map
  `data/localisation/game-name-keys.json` links each key to `<set>/<gameId>` (`jobMiner` →
  `jobs/miner`).
- `tools/extract/build_game_names.py` builds the map from the T2522 matching
  (`tools/extract/report_differences.py`): simulator item → game item by id, then by English name.
  Icon matches are not used (icons are shared, the name would be wrong). Keys the matching cannot
  find, or finds wrongly, are fixed in `tools/extract/game_name_overrides.json`
  (`{"key": "set/gameId"}`, or `null` to keep the hand-written text).
- Only names that are exactly one game item get an official string. Hand-made labels that combine
  several items ("Miner (Wilderness)"), group several civics under one card (T1504) or describe
  something the game does not name stay hand-written.

## 3. Output and loading

- The script writes one generated module per site language, `js/game-names/<code>.js`
  (`export const names = {key: "official name"}`), with the same keys in every language
  (key parity, T1503). A key with no string in a language takes the official English name and is
  listed in that file's `fallback` export.
- `js/game-names.js` loads only the current language's module (dynamic `import()`), adds it on top of
  the hand-written texts, and loads the new module before the page redraws on a language change. The
  pages that show game names are marked `<html data-game-names>` and `js/page-shell.js` imports it
  before any page script draws (simulator, tech tree, bingo). The hand-written es/en/jp values stay
  as the fallback when a generated module fails to load.
- Technologies keep their English name in `js/tech-data/<rulesetId>.js`; the same generated modules
  hold, by game id, the technologies and their variants (`technologies`), areas (`techAreas`), fields
  (`techFields`) and unlocks (`unlocks`, `"<type>/<id>"`), and `js/tech-tree-names.js` puts the names
  of the current language on the data (the English one stays in `nameEn` for the search).

## 4. Languages per page

| Page | Languages |
| --- | --- |
| Planet simulator (`planet-sim.html`) | The 10 official game languages |
| Tech tree (`tech-tree.html`) | The 10 official game languages |
| Wiki (`index.html`), bingo, Testellaris, legal pages, 404 | es, en, jp |

Site codes: `es` (spanish), `en` (english), `jp` (japanese, `<html lang="ja">`), `pt` (braz_por,
`pt-BR`), `fr` (french), `de` (german), `ko` (korean), `pl` (polish), `ru` (russian),
`zh` (simp_chinese, `zh-Hans`). The pages offering all languages keep the ES / EN / JP buttons and add
a selector with the other seven. A page offers the languages of its own selector; if the stored or
browser language is not one of them, an official game language falls back to English and anything
else to Spanish (the site default).

## 5. Interface texts without an official string

- Game names: the official string of the language, else the official English one.
- Interface texts of es / en / jp: the hand-written texts in `js/i18n-<area>.js`, as now.
- Interface texts of the seven new languages: English until they are translated (`t()` falls back to
  English, then Spanish). Translating the simulator and tech tree interface into those languages is a
  separate task (T1505); it is text work only.
- Texts that mix interface and game names ("Cost: {cost}") keep their template in the interface
  texts and insert the official name.
- Draft English texts for data the simulator models but the game does not name (the P13.8
  "not modelled" lines) stay English in every language until T1505.

## 6. Checks

- `tests/i18n-audit.mjs`: every `js/game-names/<code>.js` has the same keys, and every key exists in
  the area that owns it.
- `tests/policies-smoke.py`: switching the planet simulator and the tech tree to a new language shows
  official names (for example the Miner job in French, a technology name in German).
