"""Recompute the `dlc` lists of already generated data sets from their stored conditions (T2527):
python tools/extract/refresh_dlc.py [--game DIR] [--data DIR ...]

Every extractor fills `dlc` with pdx.text.dlc() over some condition fields, and keeps those fields
as text in its output. This script reads them back and runs dlc() again with the scripted triggers
of the game folder, and writes the trigger map (`scripted_triggers`) into dlc.json, so a data
folder can follow a change in the DLC resolution without the game version it came from (the
installed game may be newer). Default: every folder of data/generated/. The fields below must be
the ones each extractor passes to dlc() (tests/extract/test_refresh_dlc.py checks them)."""
import argparse, json, os, sys
from pdx.game import GameFiles
from pdx.output import ROOT
from pdx.text import dlc

# set → (path to the items holding `dlc`, condition fields given to dlc())
FIELDS = {
    "authorities": [((), ("playable", "potential", "possible")), (("swaps",), ("trigger",))],
    "buildings": [((), ("potential", "allow"))],
    "civics": [((), ("playable", "potential"))],
    "origins": [((), ("playable", "potential"))],
    "designations": [((), ("potential",))],
    "districts": [((), ("potential", "allow"))],
    "zones": [((), ("potential", "unlock"))],
    "edicts": [((), ("potential", "allow"))],
    "jobs": [((), ("possible", "possible_pre_triggers"))],
    "living_standards": [((), ("potential", "allow"))],
    "deposits": [((), ("potential",))],
    "policies": [((), ("potential",)), (("options",), ("potential", "valid"))],
    "technologies": [((), ("potential",))],
    "species_traits": [((), ("species_potential_add", "species_possible_add"))],
    "ascension_perks": [((), ("potential", "possible"))],
    "tradition_categories": [((), ("potential", "possible"))],
    "traditions": [((), ("possible",))],
    "ship_components": [((), ("potential",))],
    "megastructures": [((), ("potential", "possible"))],
    "menace_perks": [((), ("potential",))],
    "fallen_empires": [((), ("possible", "weight_modifier"))],
    "events": [((), ("trigger", "pre_triggers"))],
}


def _items(items, path):
    if not path:
        yield from items
        return
    for x in items:
        yield from _items(x.get(path[0]) or [], path[1:])


def trigger_map(game):
    return {k: [{"dlc": n, "negated": neg, "alternative": alt} for n, neg, alt in v] for k, v in game.dlc_trigger_mentions.items()}


def refresh_items(game, set_name, items):
    """Recompute `dlc` in place; returns the number of items whose list changed."""
    changed = 0
    for path, fields in FIELDS.get(set_name, []):
        for x in _items(items, path):
            new = dlc(game, *(x.get(f) for f in fields))
            if new != x.get("dlc"):
                changed += 1
            x["dlc"] = new
    return changed


def refresh_folder(game, folder, log=print):
    out = {}
    for name in list(FIELDS) + ["dlc"]:
        path = os.path.join(folder, name + ".json")
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if name == "dlc":
            before = data.get("scripted_triggers")
            rebuilt = {}
            for k, v in data.items():
                if k == "items":
                    rebuilt["scripted_triggers"] = trigger_map(game)
                if k != "scripted_triggers":
                    rebuilt[k] = v
            if "common/scripted_triggers" not in rebuilt.get("sources", []):
                rebuilt.setdefault("sources", []).append("common/scripted_triggers")
            data, changed = rebuilt, int(before != rebuilt["scripted_triggers"])
        else:
            changed = refresh_items(game, name, data["items"])
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
            f.write("\n")
        out[name] = changed
        log(f"{name}: {changed} changed")
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--game", help="game folder (default: STELLARIS_GAME_DIR or the Steam folder)")
    ap.add_argument("--data", nargs="*", help="generated data folders (default: every folder of data/generated)")
    args = ap.parse_args()
    game = GameFiles(args.game)
    base = f"{ROOT}/data/generated"
    folders = args.data or [os.path.join(base, d) for d in sorted(os.listdir(base)) if os.path.isdir(os.path.join(base, d))]
    for folder in folders:
        print(folder)
        refresh_folder(game, folder)


if __name__ == "__main__":
    main()
