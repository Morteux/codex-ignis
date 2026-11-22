"""Civics and origins of common/governments/civics (T2511):
python tools/extract/extract_civics.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, strings

CIVIC_ICONS = "gfx/interface/icons/governments/civics/"


def civic(game, file, key, c):
    origin = c.get("is_origin") is True
    item = {
        "id": key,
        "file": file,
        **loc(game, key),
        "effects": game.localisation.get(str(c.get("description"))) if c.get("description") else None,
        "is_origin": origin,
        "modification": c.get("modification") is not False,
        "modifier": modifier(c.get("modifier")),
        "playable": cond(c.get("playable")),
        "potential": cond(c.get("potential")),
        "possible": cond(c.get("possible")),
        "random_weight": cond(c.get("random_weight")),
        "alternate_civic_version": c.get("alternate_civic_version"),
        "flags": strings(c.get("flags")),
        "traits": cond(c.get("traits")),
        "advanced_start": c.get("advanced_start") is True,
        "max_once_global": c.get("max_once_global") is True,
        "starting_colony": c.get("starting_colony"),
        "habitability_preference": c.get("habitability_preference"),
        "swaps": [
            {"trigger": cond(s.get("trigger")), "modifier": modifier(s.get("modifier")), "name": s.get("name"), "description": s.get("description")}
            for s in c.get_all("swap_type") if isinstance(s, Block)
        ],
        "dlc": dlc(game, c.get("playable"), c.get("potential")),
    }
    if origin:
        texture = str(c.get("icon") or "gfx/interface/icons/origins/" + key + ".dds")
        item["icon"] = icon(game, "origin_icons", textures=[texture])
        picture = c.get("picture")
        # The origin picture: StellarisAssets names it after its sprite (GFX_origin_x.png)
        item["picture"] = icon(game, "origins", sprite=str(picture), aliases=[str(picture)]) if picture else None
    else:
        texture = str(c.get("icon") or CIVIC_ICONS + key + ".dds")
        item["icon"] = icon(game, "civics", textures=[texture if texture.endswith(".dds") else CIVIC_ICONS + texture + ".dds"])
    return item


def extract(game):
    warnings, civics, origins = [], [], []
    for file, key, c in game.folder("common/governments/civics"):
        if not isinstance(c, Block):
            continue
        item = civic(game, file, key, c)
        if item["is_origin"]:
            # Order of the origin list in the empire creation screen = definition order in the files
            item["game_order"] = len(origins)
            origins.append(item)
        else:
            civics.append(item)
        if item["icon"] is None:
            warnings.append(f"{key}: icon not found")
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
    return [DataSet("civics", ["common/governments/civics"], civics, warnings), DataSet("origins", ["common/governments/civics"], origins)]


if __name__ == "__main__":
    main(extract, __doc__)
