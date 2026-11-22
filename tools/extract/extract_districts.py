"""Districts (common/districts), zones = district specializations (common/zones) and zone slots
(common/zone_slots) (T2509): python tools/extract/extract_districts.py [--game DIR] [--icons [DIR]]"""
from extract_buildings import building_jobs
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, resources, simple_resources, strings, triggered_modifiers

DISTRICT_ICONS = "gfx/interface/icons/districts/"


def costs(res):
    return {"cost": simple_resources(res, "cost"), "upkeep": simple_resources(res, "upkeep"), "produces": simple_resources(res, "produces"), "resources": res}


def districts(game):
    warnings, items = [], []
    for file, key, d in game.folder("common/districts"):
        if not isinstance(d, Block):
            continue
        pm = modifier(d.get("planet_modifier"))
        tpm = triggered_modifiers(d, "triggered_planet_modifier")
        jobs, jobs_conditional = building_jobs(pm, tpm)
        item = {
            "id": key,
            "file": file,
            **loc(game, key),
            "base_buildtime": d.get("base_buildtime"),
            **costs(resources(d.get("resources"))),
            "jobs": jobs,
            "jobs_conditional": jobs_conditional,
            "zone_slots": strings(d.get("zone_slots")),
            "planet_modifier": pm,
            "triggered_planet_modifier": tpm,
            "prerequisites": strings(d.get("prerequisites")),
            "convert_to": strings(d.get("convert_to")),
            "conversion_ratio": d.get("conversion_ratio"),
            "is_uncapped": cond(d.get("is_uncapped")),
            "min_for_deposits_on_planet": d.get("min_for_deposits_on_planet"),
            "max_for_deposits_on_planet": d.get("max_for_deposits_on_planet"),
            "default_starting_district": d.get("default_starting_district") is True,
            "show_on_uncolonized": cond(d.get("show_on_uncolonized")),
            "potential": cond(d.get("potential")),
            "allow": cond(d.get("allow")),
            "dlc": dlc(game, d.get("potential"), d.get("allow")),
            "overlay_icon": d.get("overlay_icon"),
            "icon": icon(game, "districs", textures=[DISTRICT_ICONS + str(d.get("icon") or key) + ".dds"]),
        }
        if item["icon"] is None:
            warnings.append(f"{key}: icon not found")
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    return DataSet("districts", ["common/districts"], items, warnings)


def zones(game):
    warnings, items = [], []
    for file, key, z in game.folder("common/zones"):
        if not isinstance(z, Block):
            continue
        pm = modifier(z.get("planet_modifier"))
        tdpm = triggered_modifiers(z, "triggered_district_planet_modifier")
        jobs, jobs_conditional = building_jobs(pm, tdpm)
        sprite = z.get("icon")
        item = {
            "id": key,
            "file": file,
            **loc(game, key),
            "zone_sets": strings(z.get("zone_sets")),
            "included_building_sets": strings(z.get("included_building_sets")),
            "excluded_building_sets": strings(z.get("excluded_building_sets")),
            "max_buildings": z.get("max_buildings"),
            "planet_limit": z.get("planet_limit"),
            "base_buildtime": z.get("base_buildtime"),
            **costs(resources(z.get("resources"))),
            "jobs": jobs,
            "jobs_conditional": jobs_conditional,
            "planet_modifier": pm,
            "triggered_district_planet_modifier": tdpm,
            "triggered_planet_modifier": triggered_modifiers(z, "triggered_planet_modifier"),
            "swap_type": z.get("swap_type"),
            "swap_type_weight": z.get("swap_type_weight"),
            "convert_to": strings(z.get("convert_to")),
            "potential": cond(z.get("potential")),
            "unlock": cond(z.get("unlock")),
            "dlc": dlc(game, z.get("potential"), z.get("unlock")),
            # StellarisAssets names these icons after the sprite (District_specialization_factory.png)
            "icon": icon(game, "districts_specialization", sprite=sprite, aliases=[str(sprite)[4:]] if str(sprite).startswith("GFX_") else []),
        }
        if item["icon"] is None:
            warnings.append(f"{key}: icon not found")
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    return DataSet("zones", ["common/zones"], items, warnings)


def zone_slots(game):
    items = []
    for file, key, s in game.folder("common/zone_slots"):
        if not isinstance(s, Block):
            continue
        items.append({
            "id": key,
            "file": file,
            "start": s.get("start"),
            "included_zone_sets": strings(s.get("included_zone_sets")),
            "include": strings(s.get("include")),
            "exclude": strings(s.get("exclude")),
            "potential": cond(s.get("potential")),
            "unlock": cond(s.get("unlock")),
        })
    return DataSet("zone_slots", ["common/zone_slots"], items)


def extract(game):
    return [districts(game), zones(game), zone_slots(game)]


if __name__ == "__main__":
    main(extract, __doc__)
