"""Edicts of common/edicts (edicts, campaigns, ambitions, sacrifices...) (T2516):
python tools/extract/extract_edicts.py [--game DIR] [--icons [DIR]]"""
import os
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, resources, simple_resources, strings, triggered_modifiers


def sprite_icon(game, folder, sprite):
    """Icon named after its sprite in StellarisAssets (GFX_edict_type_policy → edict_type_policy.png)."""
    sprite = str(sprite or "")
    return icon(game, folder, sprite=sprite, aliases=[sprite[4:]] if sprite.startswith("GFX_") else []) if sprite else None


def extract(game):
    warnings, items = [], []
    for file, key, e in game.folder("common/edicts"):
        if not isinstance(e, Block):
            continue
        res = resources(e.get("resources"))
        item = {
            "id": key,
            "file": file,
            # Edicts, campaigns, ambitions, sacrifices...: the file they are defined in (00_edicts → edicts)
            "group": os.path.splitext(os.path.basename(file))[0].split("_", 1)[-1],
            **loc(game, key, keys=["edict_" + key, key]),
            "length": e.get("length"),
            "cost": simple_resources(res, "cost"),
            "upkeep": simple_resources(res, "upkeep"),
            "resources": res,
            "modifier": modifier(e.get("modifier")),
            "triggered_country_modifier": triggered_modifiers(e, "triggered_country_modifier"),
            "prerequisites": strings(e.get("prerequisites")),
            "edict_lock_in_months": e.get("edict_lock_in_months"),
            "is_wartime_edict": e.get("is_wartime_edict") is True,
            "potential": cond(e.get("potential")),
            "allow": cond(e.get("allow")),
            "effect": cond(e.get("effect")),
            "dlc": dlc(game, e.get("potential"), e.get("allow")),
            "icon": sprite_icon(game, "edicts", e.get("icon")),
        }
        if item["icon"] is None:
            warnings.append(f"{key}: icon not found")
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    return DataSet("edicts", ["common/edicts"], items, warnings)


if __name__ == "__main__":
    main(extract, __doc__)
