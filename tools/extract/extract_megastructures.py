"""Megastructures (every stage, habitats and gateways included) of common/megastructures (T4110):
python tools/extract/extract_megastructures.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, resources, simple_resources, strings


def extract(game):
    warnings, items = [], []
    for file, key, m in game.folder("common/megastructures"):
        if not isinstance(m, Block):
            continue
        res = resources(m.get("resources"))
        item = {
            "id": key,
            "file": file,
            **loc(game, key, desc_keys=[key + "_DESC", key + "_desc"]),
            "build_time": m.get("build_time"),
            "cost": simple_resources(res, "cost"),
            "upkeep": simple_resources(res, "upkeep"),
            "resources": res,
            "prerequisites": strings(m.get("prerequisites")),
            "upgrade_from": strings(m.get("upgrade_from")),
            "potential": cond(m.get("potential")),
            "possible": cond(m.get("possible")),
            "country_modifier": modifier(m.get("country_modifier")),
            "system_modifier": modifier(m.get("system_modifier")),
            "dlc": dlc(game, m.get("potential"), m.get("possible")),
            "icon": icon(game, "megastructures", sprite=str(m.get("portrait"))) if m.get("portrait") else None,
        }
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    return DataSet("megastructures", ["common/megastructures"], items, warnings)


if __name__ == "__main__":
    main(extract, __doc__)
