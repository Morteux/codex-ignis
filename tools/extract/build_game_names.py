"""Official game names of the site, keyed by game id (P15, LOCALISATION_PLAN.md):

python tools/extract/build_game_names.py [--data DIR] [--simulator FILE] [--game-folder] [--game DIR] [--check]

1. Links every i18n key of a game name to `<set>/<gameId>` with the T2522 matching
   (report_differences.py: simulator id, then English name; icon matches are not used), plus the
   resource names and the hand-kept tools/extract/game_name_overrides.json. Written to
   data/localisation/game-name-keys.json.
2. Writes js/game-names/<code>.js for each of the 10 site languages (T1503):
   - `names`: {i18n key: official name} (planet simulator, bingo);
   - `technologies`: {technology or variant id: name}, `techAreas` and `techFields`: {id: name} and
     `unlocks`: {"<type>/<id>": name} of every js/tech-data/ file (tech tree, simulator links).
   Every language has the same keys; a name the game lacks in a language takes the official
   English one and its key is listed in `fallback`.

Resources and technology areas and fields are not extractor data sets: --game-folder reads their names
from the game folder (--game, default the installed game) into
data/localisation/game-folder-names.json, with the game version read; later runs use that file.
--check only prints the keys whose official English name differs from the hand-written one, and
the simulator names left without an official string.
"""
import argparse, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import report_differences as rd  # noqa: E402

ROOT = rd.ROOT
KEYS_FILE = f"{ROOT}/data/localisation/game-name-keys.json"
GAME_FOLDER_FILE = f"{ROOT}/data/localisation/game-folder-names.json"
OVERRIDES_FILE = f"{ROOT}/tools/extract/game_name_overrides.json"
TECH_DATA_DIR = f"{ROOT}/js/tech-data"
OUT_DIR = f"{ROOT}/js/game-names"

# Site language code → game language folder (LOCALISATION_PLAN.md §4).
LANGUAGES = {
    "es": "spanish", "en": "english", "jp": "japanese", "pt": "braz_por", "fr": "french",
    "de": "german", "ko": "korean", "pl": "polish", "ru": "russian", "zh": "simp_chinese",
}

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
# Technology area → game localisation key.
TECH_AREA_KEYS = {"physics": "PHYSICS", "society": "SOCIETY", "engineering": "ENGINEERING"}
# Technology unlock type → localisation set of the extractor.
UNLOCK_SETS = {"building": "buildings", "district": "districts", "edict": "edicts", "deposit": "deposits"}

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


def tech_data_files():
    """The data of every js/tech-data/<rulesetId>.js."""
    out = []
    for file in sorted(os.listdir(TECH_DATA_DIR)):
        if file.endswith(".js"):
            with open(os.path.join(TECH_DATA_DIR, file), encoding="utf-8") as f:
                src = f.read()
            out.append(json.loads(src[src.index("{"):src.rindex("}") + 1]))
    return out


def read_game_folder(game_arg):
    """Resource and technology field names of every game language, from the game folder."""
    from pdx.game import GameFiles
    game = GameFiles(game_arg)
    loc = game.localisation
    fields = sorted({f["id"] for data in tech_data_files() for f in data["fields"]})
    groups = {"resources": RESOURCE_KEYS, "techAreas": TECH_AREA_KEYS, "techFields": {fid: fid for fid in fields}}
    names = {lang: {group: {item: clean(loc.get(key, lang)) for item, key in keys.items()} for group, keys in groups.items()}
             for lang in loc.languages()}
    value = {"gameVersion": game.version, "rulesetId": game.ruleset_id, "keys": groups, "names": names}
    write_json(GAME_FOLDER_FILE, value)
    print(f"resource and field names read from {game.version} into {GAME_FOLDER_FILE}")
    return value


def load_sets(data_dir):
    sets = {}
    for file in sorted(os.listdir(data_dir)):
        if file.endswith(".json") and file != "manifest.json":
            data = load_json(os.path.join(data_dir, file))
            sets[data["set"]] = data
    return sets


def key_map(sim, sets, folder):
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
        if rid in folder["keys"]["resources"] and res.get("i18nKey"):
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


def tech_targets():
    """Technology, field and unlock targets of every tech data file: {group: {key: "set/gameId"}}."""
    techs, fields, unlocks = {}, {}, {}
    for data in tech_data_files():
        for f in data["fields"]:
            fields[f["id"]] = f"techFields/{f['id']}"
        for tech in data["technologies"]:
            techs[tech["id"]] = f"technologies/{tech['id']}"
            for v in tech.get("variants") or []:
                techs[v["id"]] = f"technologies/{v['id']}"
            for u in tech.get("unlocks") or []:
                if u.get("type") in UNLOCK_SETS:
                    unlocks[f"{u['type']}/{u['id']}"] = f"{UNLOCK_SETS[u['type']]}/{u['id']}"
    areas = {a: f"techAreas/{a}" for a in TECH_AREA_KEYS}
    return {"technologies": dict(sorted(techs.items())), "techAreas": areas, "techFields": fields, "unlocks": dict(sorted(unlocks.items()))}


def official(loc_sets, folder, lang_folder, target):
    set_name, gid = target.split("/", 1)
    if set_name in ("resources", "techAreas", "techFields"):
        return clean(folder["names"].get(lang_folder, {}).get(set_name, {}).get(gid))
    return clean((loc_sets.get(set_name) or {}).get(gid))


def build(data_dir, groups, folder):
    """{code: ({group: {key: name}}, [fallback keys])} and the keys with no English string (dropped)."""
    loc = {code: load_json(f"{data_dir}/localisation/{folder_name}.json")["sets"] for code, folder_name in LANGUAGES.items()}
    english = {g: {k: official(loc["en"], folder, "english", t) for k, t in keys.items()} for g, keys in groups.items()}
    out = {}
    for code, folder_name in LANGUAGES.items():
        result, fallback = {}, []
        for group, keys in groups.items():
            result[group] = {}
            for key, target in keys.items():
                if not english[group][key]:
                    continue
                name = official(loc[code], folder, folder_name, target)
                if not name:
                    name = english[group][key]
                    fallback.append(key if group == "names" else f"{group}:{key}")
                result[group][key] = name
        out[code] = (result, fallback)
    missing = [f"{g}:{k}" for g, names in english.items() for k, v in names.items() if not v]
    return out, missing


def write_module(code, groups, fallback, ruleset, folder):
    dump = lambda v: json.dumps(v, ensure_ascii=False, indent=2)
    lines = [f"// Generated by tools/extract/build_game_names.py from data/generated/{ruleset}/localisation/{LANGUAGES[code]}.json",
             f"// and data/localisation/game-folder-names.json ({folder['gameVersion']}) (P15, LOCALISATION_PLAN.md). Do not edit by hand.",
             "// js/game-names.js loads the current language's module over the hand-written texts.",
             "",
             "// Official game names by i18n key (planet simulator, bingo).",
             "export const names = " + dump(groups["names"]) + ";",
             "",
             "// Technologies and their variants by id, technology areas and fields by id, technology unlocks by \"<type>/<id>\".",
             "export const technologies = " + dump(groups["technologies"]) + ";",
             "export const techAreas = " + dump(groups["techAreas"]) + ";",
             "export const techFields = " + dump(groups["techFields"]) + ";",
             "export const unlocks = " + dump(groups["unlocks"]) + ";",
             "",
             "// Keys the game has no string for in this language (\"<group>:<key>\" outside `names`): they carry the official English name.",
             "export const fallback = " + json.dumps(fallback, ensure_ascii=False) + ";", ""]
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(f"{OUT_DIR}/{code}.js", "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Official game names of the site, keyed by game id")
    p.add_argument("--data", help="data/generated/<rulesetId> folder (default: the newest)")
    p.add_argument("--simulator", help="JSON dump of tools/extract/dump_simulator_data.mjs (default: made now with node)")
    p.add_argument("--game-folder", action="store_true", help="read the resource and technology field names from the game folder first")
    p.add_argument("--game", help="game folder for --game-folder (default: the installed game)")
    p.add_argument("--check", action="store_true", help="only list the names that change and the unmatched ones")
    args = p.parse_args()
    data_dir = (args.data or rd.newest_data_dir()).rstrip("/")
    ruleset = os.path.basename(data_dir)
    folder = read_game_folder(args.game) if args.game_folder else load_json(GAME_FOLDER_FILE)
    if folder is None:
        raise SystemExit(f"{GAME_FOLDER_FILE} is missing: run with --game-folder once")
    sim = rd.load_simulator(args.simulator)
    keys, unmatched = key_map(sim, load_sets(data_dir), folder)
    groups = {"names": keys, **tech_targets()}
    built, no_english = build(data_dir, groups, folder)
    if args.check:
        en = built["en"][0]["names"]
        for key in keys:
            if key in en and sim["en"].get(key) != en[key]:
                print(f"changes  {key}: {sim['en'].get(key)!r} -> {en[key]!r} ({keys[key]})")
        for set_name, key, name in unmatched:
            print(f"no match {set_name} {key}: {name!r}")
        for key in no_english:
            print(f"no English string {key}")
        return
    write_json(KEYS_FILE, {"rulesetId": ruleset, "count": len(keys), "keys": keys})
    for code, (result, fallback) in built.items():
        write_module(code, result, fallback, ruleset, folder)
        print(f"{code}: " + ", ".join(f"{len(v)} {g}" for g, v in result.items()) + f"; {len(fallback)} with the English fallback")
    print(f"{len(keys)} keys in {KEYS_FILE}; {len(unmatched)} simulator names without an official string")


if __name__ == "__main__":
    main()
