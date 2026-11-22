"""Ethics of common/ethics and their axes (common/ethic_categories) (T2513):
python tools/extract/extract_ethics.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, icon, loc, modifier, strings, triggered_modifiers

ETHIC_ICONS = "gfx/interface/icons/ethics/"


def extract(game):
    warnings, items = [], []
    for file, key, e in game.folder("common/ethics"):
        if not isinstance(e, Block):
            continue
        item = {
            "id": key,
            "file": file,
            **loc(game, key),
            "cost": e.get("cost"),
            "category": e.get("category"),
            "category_value": e.get("category_value"),
            "category_opposite": e.get("category_opposite") is True,
            "fanatic": e.get("regular_variant") is not None,
            "regular_variant": e.get("regular_variant"),
            "fanatic_variant": e.get("fanatic_variant"),
            "use_for_pops": e.get("use_for_pops") is not False,
            "tags": strings(e.get("tags")),
            "country_modifier": modifier(e.get("country_modifier")),
            "triggered_country_modifier": triggered_modifiers(e, "triggered_country_modifier"),
            "random_weight": cond(e.get("random_weight")),
            # StellarisAssets names: ethic_fanatic_militarist → Fanatic_militarist.png
            "icon": icon(game, "ethics", sprite="GFX_" + key, textures=[ETHIC_ICONS + key + ".dds"], aliases=[key[6:]] if key.startswith("ethic_") else []),
        }
        if item["icon"] is None:
            warnings.append(f"{key}: icon not found")
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    axes = []
    for _, key, _ in game.folder("common/ethic_categories"):
        members = [i for i in items if i["category"] == key]
        regular = sorted((i for i in members if not i["fanatic"]), key=lambda i: (i["category_value"] is None, i["category_value"]))
        axes.append({"id": key, "ethics": [i["id"] for i in regular], "fanatic": [i["id"] for i in members if i["fanatic"]]})
    return DataSet("ethics", ["common/ethics", "common/ethic_categories"], items, warnings, {"axes": axes})


if __name__ == "__main__":
    main(extract, __doc__)
