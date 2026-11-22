"""Colony designations of common/colony_types (T2510): python tools/extract/extract_designations.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, triggered_modifiers


def extract(game):
    warnings, items = [], []
    for file, key, c in game.folder("common/colony_types"):
        if not isinstance(c, Block):
            continue
        sprite = str(c.get("icon") or "")
        item = {
            "id": key,
            "file": file,
            **loc(game, key),
            "planet_modifier": modifier(c.get("planet_modifier")),
            "triggered_planet_modifier": triggered_modifiers(c, "triggered_planet_modifier"),
            "potential": cond(c.get("potential")),
            "weight_modifier": cond(c.get("weight_modifier")),
            "dlc": dlc(game, c.get("potential")),
            # One frame of the GFX_colony_type sheet; StellarisAssets file named after the sprite
            "icon": icon(game, "designations", sprite=sprite, aliases=[sprite[4:]] if sprite.startswith("GFX_") else []),
        }
        if item["icon"] is None:
            warnings.append(f"{key}: icon not found")
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    return DataSet("designations", ["common/colony_types"], items, warnings)


if __name__ == "__main__":
    main(extract, __doc__)
