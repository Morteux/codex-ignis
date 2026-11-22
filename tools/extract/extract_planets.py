"""Planet classes and other celestial bodies of common/planet_classes (T2514):
python tools/extract/extract_planets.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, icon, loc, modifier, strings

SPRITE_PREFIX = "GFX_planet_type_"


def kind(p):
    """Kind of celestial body: star, asteroid, gas_giant (or other uncolonizable body), artificial or planet."""
    if p.get("star") is True:
        return "star"
    if p.get("asteroid") is True:
        return "asteroid"
    if p.get("ringworld") is True or p.get("habitat") is True or p.get("is_artificial_planet") is True:
        return "artificial"
    if p.get("colonizable") is True:
        return "planet"
    return "body"


def extract(game):
    warnings, items, random_lists = [], [], []
    for file, key, p in game.folder("common/planet_classes"):
        if not isinstance(p, Block):
            continue
        if key == "random_list":
            random_lists.append({"file": file, "name": p.get("name"), "planets": strings(p.get("planets"))})
            continue
        sprite = str(p.get("icon") or "")
        item = {
            "id": key,
            "file": file,
            **loc(game, key),
            "kind": kind(p),
            "climate": p.get("climate"),
            "colonizable": p.get("colonizable") is True,
            "initial": p.get("initial") is True,
            "ideal": p.get("ideal") is True,
            "starting_planet": p.get("starting_planet") is not False,
            "ringworld": p.get("ringworld") is True,
            "habitat": p.get("habitat") is True,
            "artificial": p.get("is_artificial_planet") is True,
            "planet_size": p.get("planet_size"),
            "district_set": p.get("district_set"),
            "starting_district": p.get("starting_district"),
            "carry_cap_per_free_district": p.get("carry_cap_per_free_district"),
            "can_be_capital": p.get("can_be_capital") is not False,
            "can_be_invaded": p.get("can_be_invaded") is not False,
            "spawn_odds": p.get("spawn_odds"),
            "modifier": modifier(p.get("modifier")),
            "potential": cond(p.get("potential")),
            "picture": p.get("picture") or key,
            # Frame of the planet_type_icons sheet; StellarisAssets names: pc_arid → Planet_arid.png
            # (by class, then by sprite: GFX_planet_type_arid → Planet_arid.png)
            "icon": icon(game, "planets", sprite=sprite, aliases=["planet_" + key[3:] if key.startswith("pc_") else "planet_" + key]
                         + (["planet_" + sprite[len(SPRITE_PREFIX):]] if sprite.startswith(SPRITE_PREFIX) else [])),
        }
        if item["icon"] is None:
            warnings.append(f"{key}: icon not found")
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    return DataSet("planet_classes", ["common/planet_classes"], items, warnings, {"random_lists": random_lists})


if __name__ == "__main__":
    main(extract, __doc__)
