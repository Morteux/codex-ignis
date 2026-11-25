"""Ascension perks (ascension paths included) of common/ascension_perks (T4110):
python tools/extract/extract_ascension_perks.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, strings, triggered_modifiers

PERK_ICONS = "gfx/interface/icons/ascension_perks/"


def extract(game):
    warnings, items = [], []
    for file, key, p in game.folder("common/ascension_perks"):
        if not isinstance(p, Block):
            continue
        item = {
            "id": key,
            "file": file,
            **loc(game, key),
            "category": p.get("category"),
            "modifier": modifier(p.get("modifier")),
            "triggered_modifier": triggered_modifiers(p, "triggered_modifier"),
            "potential": cond(p.get("potential")),
            "possible": cond(p.get("possible")),
            "on_enabled": cond(p.get("on_enabled")),
            "prerequisites": strings(p.get("prerequisites")),
            "dlc": dlc(game, p.get("potential"), p.get("possible")),
            "icon": icon(game, "ascension_perks", textures=[str(p.get("icon") or PERK_ICONS + key + ".dds")]),
        }
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    return DataSet("ascension_perks", ["common/ascension_perks"], items, warnings)


if __name__ == "__main__":
    main(extract, __doc__)
