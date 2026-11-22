"""Planet modifiers (common/planet_modifiers), static modifiers (common/static_modifiers), deposits
and blockers (common/deposits, common/deposit_categories) (T2515):
python tools/extract/extract_planet_features.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, resources, simple_resources, strings, triggered_modifiers

STATIC_SKIP = ("icon", "icon_frame", "custom_tooltip", "show_only_custom_tooltip", "apply_modifier_to_other_planets", "hide_modifiers")


def static_modifiers(game):
    items = []
    for file, key, m in game.folder("common/static_modifiers"):
        if not isinstance(m, Block):
            continue
        mods = modifier(Block([e for e in m if e[0] not in STATIC_SKIP]))
        items.append({
            "id": key,
            "file": file,
            **loc(game, key),
            "modifier": mods,
            "custom_tooltip": m.get("custom_tooltip"),
            "icon_texture": m.get("icon"),
            "icon_frame": m.get("icon_frame"),
        })
    return DataSet("static_modifiers", ["common/static_modifiers"], items)


def planet_modifiers(game, statics):
    warnings, items = [], []
    for file, key, p in game.folder("common/planet_modifiers"):
        if not isinstance(p, Block) or p.get("is_null") is True:
            continue
        mod_id = p.get("modifier")
        static = statics.get(mod_id) or {}
        texture = static.get("icon_texture") or f"gfx/interface/icons/planet_modifiers/{key}.dds"
        item = {
            "id": key,
            "file": file,
            # The name and effects are those of the static modifier the planet modifier applies
            **loc(game, str(mod_id), keys=[str(mod_id), key]),
            "static_modifier": mod_id,
            "modifier": static.get("modifier"),
            "spawn_chance": cond(p.get("spawn_chance")),
            "icon": icon(game, "planet_modifiers", textures=[str(texture)]),
        }
        if not static:
            warnings.append(f"{key}: unknown static modifier {mod_id}")
        if item["icon"] is None:
            warnings.append(f"{key}: icon not found")
        items.append(item)
    return DataSet("planet_modifiers", ["common/planet_modifiers", "common/static_modifiers"], items, warnings)


def deposits(game):
    categories = {}
    for _, key, c in game.folder("common/deposit_categories"):
        categories[key] = {"id": key, "blocker": isinstance(c, Block) and c.get("blocker") is True, "important": isinstance(c, Block) and c.get("important") is True}
    warnings, items = [], []
    for file, key, d in game.folder("common/deposits"):
        if not isinstance(d, Block) or d.get("is_null") is True:
            continue
        res = resources(d.get("resources"))
        cat = categories.get(d.get("category"), {})
        item = {
            "id": key,
            "file": file,
            **loc(game, key),
            "category": d.get("category"),
            "blocker": cat.get("blocker", False),
            "important": cat.get("important", False),
            "orbital": d.get("station") is not None,
            "station": d.get("station"),
            "is_for_colonizable": d.get("is_for_colonizable") is True,
            # Blockers: `cost` is the cost to clear them, `time` the clearing time in days
            "cost": simple_resources(res, "cost"),
            "produces": simple_resources(res, "produces"),
            "upkeep": simple_resources(res, "upkeep"),
            "resources": res,
            "time": d.get("time"),
            "prerequisites": strings(d.get("prerequisites")),
            "planet_modifier": modifier(d.get("planet_modifier")),
            "triggered_planet_modifier": triggered_modifiers(d, "triggered_planet_modifier"),
            "country_modifier": modifier(d.get("country_modifier")),
            "habitat_modifier": modifier(d.get("habitat_modifier")),
            "potential": cond(d.get("potential")),
            "can_be_cleared": cond(d.get("can_be_cleared")),
            "on_cleared": cond(d.get("on_cleared")),
            "drop_weight": cond(d.get("drop_weight")),
            "terraforming_swap_types": cond(d.get("terraforming_swap_types")),
            "blocker_swap_types": cond(d.get("blocker_swap_types")),
            "dlc": dlc(game, d.get("potential")),
            "icon": icon(game, "planetary_features", textures=[f"gfx/interface/icons/deposits/{d.get('icon') or key}.dds"]),
        }
        if item["icon"] is None:
            warnings.append(f"{key}: icon not found")
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    return DataSet("deposits", ["common/deposits", "common/deposit_categories"], items, warnings, {"categories": list(categories.values())})


def extract(game):
    statics = static_modifiers(game)
    by_id = {s["id"]: s for s in statics.items}
    return [planet_modifiers(game, by_id), statics, deposits(game)]


if __name__ == "__main__":
    main(extract, __doc__)
