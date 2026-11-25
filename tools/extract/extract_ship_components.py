"""Ship components of common/component_templates (weapons, utilities, strike craft) (T4110), with the
weapon stats of the *.csv files there (they override the .txt values, as in the game):
python tools/extract/extract_ship_components.py [--game DIR] [--icons [DIR]]"""
import csv, os
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, resources, simple_resources, strings

FOLDER = "common/component_templates"
TEMPLATES = {"weapon_component_template": "weapon", "utility_component_template": "utility",
             "strike_craft_component_template": "strike_craft"}


def number(text):
    try:
        v = float(text)
    except (TypeError, ValueError):
        return None
    return int(v) if v.is_integer() else v


def csv_stats(game):
    """{component key: {column: number}} of every *.csv of the folder (later files override)."""
    out = {}
    for path in game.files(FOLDER, ext=".csv"):
        with open(path, encoding="utf-8-sig", errors="replace") as f:
            rows = [r for r in csv.reader(f, delimiter=";") if r and not r[0].startswith("#")]
        if not rows or rows[0][0] != "key":
            continue
        header = rows[0]
        for r in rows[1:]:
            stats = {h: number(v) for h, v in zip(header[1:], r[1:]) if h and h != "end" and number(v) is not None}
            if r[0]:
                out[r[0]] = stats
    return out


def extract(game):
    warnings, items, seen = [], [], {}
    stats = csv_stats(game)
    for file, kind, c in game.folder(FOLDER, repeated=tuple(TEMPLATES)):
        if kind not in TEMPLATES or not isinstance(c, Block) or c.get("key") is None:
            continue
        key = str(c.get("key"))
        if key in seen:
            warnings.append(f"{file}: {key} redefined (first in {seen[key]})")
            items = [i for i in items if i["id"] != key]
        seen[key] = file
        res = resources(c.get("resources"))
        item = {
            "id": key,
            "file": file,
            "template": TEMPLATES[kind],
            **loc(game, key),
            "size": c.get("size"),
            "type": c.get("type"),
            "power": c.get("power"),
            "cost": simple_resources(res, "cost"),
            "upkeep": simple_resources(res, "upkeep"),
            "resources": res,
            "prerequisites": strings(c.get("prerequisites")),
            "component_set": c.get("component_set"),
            "upgrades_to": c.get("upgrades_to"),
            "tags": strings(c.get("tags")),
            "modifier": modifier(c.get("modifier")),
            "ship_modifier": modifier(c.get("ship_modifier")),
            "potential": cond(c.get("potential")),
            "hidden": c.get("hidden") is True,
            "stats": stats.get(key, {}),
            "dlc": dlc(game, c.get("potential")),
            "icon": icon(game, "ship_components", sprite=str(c.get("icon"))) if c.get("icon") else None,
        }
        if key in stats and "power" in stats[key]:
            item["power"] = stats[key]["power"]
        items.append(item)
    return DataSet("ship_components", [FOLDER], items, warnings)


if __name__ == "__main__":
    main(extract, __doc__)
