"""Official game names of the site, keyed by game id (P15, LOCALISATION_PLAN.md):

python tools/extract/build_game_names.py [--data DIR] [--simulator FILE] [--resources] [--game DIR] [--check]

1. Links every i18n key of a game name to `<set>/<gameId>` with the T2522 matching
   (report_differences.py: simulator id, then English name; icon matches are not used), plus the
   resource names and the hand-kept tools/extract/game_name_overrides.json. Written to
   data/localisation/game-name-keys.json.
2. Writes js/game-names/<code>.js for every site language: {key: official name}, the same keys in
   every language; a key the game has no string for in a language takes the official English name
   and is listed in `fallback`.

Resources are not an extractor data set: --resources reads their names from the game folder
(--game, default the installed game) into data/localisation/resource-names.json, with the game
version read; later runs use that file. --check only prints the keys whose official English name
differs from the hand-written one, and the simulator names left without an official string.
"""
import argparse, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import report_differences as rd  # noqa: E402

ROOT = rd.ROOT
KEYS_FILE = f"{ROOT}/data/localisation/game-name-keys.json"
RESOURCES_FILE = f"{ROOT}/data/localisation/resource-names.json"
OVERRIDES_FILE = f"{ROOT}/tools/extract/game_name_overrides.json"
OUT_DIR = f"{ROOT}/js/game-names"

# Site language code → game language folder (LOCALISATION_PLAN.md §4).
LANGUAGES = {"es": "spanish", "en": "english", "jp": "japanese"}

# Simulator resource id → game localisation key.
RESOURCE_KEYS = {
    "energy": "energy", "minerals": "minerals", "food": "food", "alloys": "alloys",
    "consumer_goods": "consumer_goods", "unity": "unity", "influence": "influence",
    "physics": "physics_research", "society": "society_research", "engineering": "engineering_research",
    "amenities": "PLANET_AMENITIES_TITLE", "trade": "trade", "volatile_motes": "volatile_motes",
    "rare_crystals": "rare_crystals", "exotic_gases": "exotic_gases", "minor_artifacts": "minor_artifacts",
    "astral_threads": "astral_threads", "advanced_logic": "advanced_logic", "nanites": "nanites",
    "zro": "sr_zro", "biomass": "biomass",
}

_COLOUR = re.compile(r"§[^!]|§!")
_ICON = re.compile(r"£[^£\s]+£\s*")


def clean(text):
    """A display name: no colour codes or icon markers; None if empty or with an unresolved $key$."""
    if not isinstance(text, str):
        return None
    text = re.sub(r"\s{2,}", " ", _ICON.sub("", _COLOUR.sub("", text))).strip()
    return text if text and "$" not in text else None


def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path, value):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write("\n")


def read_resources(game_arg):
    """Resource names of every game language from the game folder."""
    from pdx.game import GameFiles
    game = GameFiles(game_arg)
    loc = game.localisation
    names = {lang: {rid: clean(loc.get(key, lang)) for rid, key in RESOURCE_KEYS.items()} for lang in loc.languages()}
    value = {"gameVersion": game.version, "rulesetId": game.ruleset_id, "keys": RESOURCE_KEYS, "names": names}
    write_json(RESOURCES_FILE, value)
    print(f"resource names read from {game.version} into {RESOURCES_FILE}")
    return value


def load_sets(data_dir):
    sets = {}
    for file in sorted(os.listdir(data_dir)):
        if file.endswith(".json") and file != "manifest.json":
            data = load_json(os.path.join(data_dir, file))
            sets[data["set"]] = data
    return sets


def key_map(sim, sets, resources):
    """{i18n key: "set/gameId"} and the simulator keys left without one: ({...}, [(set, key, en name)])."""
    sims = rd.sim_items(sim)
    keys, unmatched = {}, []
    for set_name in rd.PREFIXES:
        if set_name not in sets:
            continue
        pairs, _ = rd.match(set_name, sims[set_name], rd.game_items(set_name, sets[set_name], sets))
        for s, g, how in pairs:
            if not s.key:
                continue
            if g is not None and how in ("id", "name"):
                game_set = "static_modifiers" if g.get("static") else set_name
                keys.setdefault(s.key, f"{game_set}/{g['id']}")
            elif s.key not in keys:
                unmatched.append((set_name, s.key, s.name))
    for rid, res in sim["modules"]["planet-data.js"]["RESOURCES"].items():
        if rid in resources["keys"] and res.get("i18nKey"):
            keys[res["i18nKey"]] = f"resources/{rid}"
    for key, target in (load_json(OVERRIDES_FILE, {}) or {}).items():
        if key.startswith("_"):
            continue
        if target is None:
            keys.pop(key, None)
        else:
            keys[key] = target
    # Only keys of a hand-written text; grouped names ("Anglers / Marine Machines") stay hand-written (T1504).
    keys = {k: v for k, v in keys.items() if k in sim["en"] and " / " not in sim["en"][k]}
    seen, rest = set(), []
    for u in unmatched:
        if u[1] not in keys and u[1] not in seen:
            seen.add(u[1])
            rest.append(u)
    return dict(sorted(keys.items())), rest


def official(loc_sets, resources, lang_folder, target):
    set_name, gid = target.split("/", 1)
    if set_name == "resources":
        return clean(resources["names"].get(lang_folder, {}).get(gid))
    return clean((loc_sets.get(set_name) or {}).get(gid))


def build(data_dir, keys, resources):
    """{code: ({key: name}, [fallback keys])}; keys with no English string are dropped."""
    loc = {code: load_json(f"{data_dir}/localisation/{folder}.json")["sets"] for code, folder in LANGUAGES.items()}
    english = {k: official(loc["en"], resources, "english", t) for k, t in keys.items()}
    out = {}
    for code, folder in LANGUAGES.items():
        names, fallback = {}, []
        for key, target in keys.items():
            if not english[key]:
                continue
            name = official(loc[code], resources, folder, target)
            if not name:
                name = english[key]
                fallback.append(key)
            names[key] = name
        out[code] = (names, fallback)
    return out, [k for k, v in english.items() if not v]


def write_module(code, names, fallback, ruleset, resources):
    lines = [f"// Generated by tools/extract/build_game_names.py from data/generated/{ruleset}/localisation/{LANGUAGES[code]}.json",
             f"// and data/localisation/resource-names.json ({resources['gameVersion']}) (P15, LOCALISATION_PLAN.md). Do not edit by hand.",
             "// Official game names by i18n key; js/game-names.js loads the current language's module over the hand-written texts.",
             "export const names = " + json.dumps(names, ensure_ascii=False, indent=2) + ";",
             "",
             "// Keys the game has no string for in this language: they carry the official English name.",
             "export const fallback = " + json.dumps(fallback, ensure_ascii=False) + ";", ""]
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(f"{OUT_DIR}/{code}.js", "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Official game names of the site, keyed by game id")
    p.add_argument("--data", help="data/generated/<rulesetId> folder (default: the newest)")
    p.add_argument("--simulator", help="JSON dump of tools/extract/dump_simulator_data.mjs (default: made now with node)")
    p.add_argument("--resources", action="store_true", help="read the resource names from the game folder first")
    p.add_argument("--game", help="game folder for --resources (default: the installed game)")
    p.add_argument("--check", action="store_true", help="only list the names that change and the unmatched ones")
    args = p.parse_args()
    data_dir = (args.data or rd.newest_data_dir()).rstrip("/")
    ruleset = os.path.basename(data_dir)
    resources = read_resources(args.game) if args.resources else load_json(RESOURCES_FILE)
    if resources is None:
        raise SystemExit(f"{RESOURCES_FILE} is missing: run with --resources once")
    sim = rd.load_simulator(args.simulator)
    keys, unmatched = key_map(sim, load_sets(data_dir), resources)
    built, no_english = build(data_dir, keys, resources)
    if args.check:
        en = built["en"][0]
        for key in keys:
            if key in en and sim["en"].get(key) != en[key]:
                print(f"changes  {key}: {sim['en'].get(key)!r} -> {en[key]!r} ({keys[key]})")
        for set_name, key, name in unmatched:
            print(f"no match {set_name} {key}: {name!r}")
        for key in no_english:
            print(f"no English string {key} ({keys[key]})")
        return
    write_json(KEYS_FILE, {"rulesetId": ruleset, "count": len(keys), "keys": keys})
    for code, (names, fallback) in built.items():
        write_module(code, names, fallback, ruleset, resources)
        print(f"{code}: {len(names)} names, {len(fallback)} with the English fallback")
    print(f"{len(keys)} keys in {KEYS_FILE}; {len(unmatched)} simulator names without an official string")


if __name__ == "__main__":
    main()
