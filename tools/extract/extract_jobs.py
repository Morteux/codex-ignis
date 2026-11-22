"""Jobs of common/pop_jobs and pop categories of common/pop_categories (T2507):
python tools/extract/extract_jobs.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, resources, simple_resources, strings, triggered_modifiers

SOURCES = ["common/pop_jobs", "common/pop_categories"]
JOB_ICONS = "gfx/interface/icons/jobs/"


def job_icon(game, name):
    return icon(game, "jobs", sprite="GFX_job_" + name, textures=[JOB_ICONS + "job_" + name + ".dds"])


def job_loc(game, name):
    return loc(game, name, keys=["job_" + name, name], desc_keys=["job_" + name + "_desc", name + "_desc"])


def extract(game):
    warnings, items = [], []
    for file, key, j in game.folder("common/pop_jobs"):
        if not isinstance(j, Block):
            continue
        swappable = j.get("swappable_data") if isinstance(j.get("swappable_data"), Block) else Block()
        default = swappable.get("default") if isinstance(swappable.get("default"), Block) else Block()
        res = resources(j.get("resources"))
        item = {
            "id": key,
            "file": file,
            **job_loc(game, key),
            "category": j.get("category"),
            "tags": strings(j.get("tags")),
            "produces": simple_resources(res, "produces"),
            "upkeep": simple_resources(res, "upkeep"),
            "resources": res,
            "overlord_resources": resources(j.get("overlord_resources")),
            "planet_modifier": modifier(j.get("planet_modifier")),
            "country_modifier": modifier(j.get("country_modifier")),
            "triggered_planet_modifier": triggered_modifiers(j, "triggered_planet_modifier"),
            "triggered_country_modifier": triggered_modifiers(j, "triggered_country_modifier"),
            "possible_precalc": j.get("possible_precalc"),
            "possible_pre_triggers": cond(j.get("possible_pre_triggers")),
            "possible": cond(j.get("possible")),
            "weight": cond(j.get("weight")),
            "is_capped_by_modifier": j.get("is_capped_by_modifier") is not False,
            "condition_string": default.get("condition_string"),
            "building_icon": default.get("building_icon"),
            "dlc": dlc(game, j.get("possible"), j.get("possible_pre_triggers")),
            "icon": job_icon(game, str(default.get("icon") or key)),
            "swaps": [],
        }
        for s in swappable.get_all("swap_type"):
            if not isinstance(s, Block):
                continue
            name = str(s.get("name") or "")
            item["swaps"].append({
                "id": name,
                **job_loc(game, name),
                "desc_id": s.get("desc"),
                "trigger": cond(s.get("trigger")),
                "weight": s.get("weight"),
                "building_icon": s.get("building_icon"),
                "icon": job_icon(game, str(s.get("icon"))) if s.get("icon") is not None else None,
            })
        if item["icon"] is None:
            warnings.append(f"{key}: icon not found")
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    categories = []
    for file, key, c in game.folder("common/pop_categories"):
        if not isinstance(c, Block):
            continue
        categories.append({
            "id": key,
            **loc(game, key, keys=["pop_cat_" + key, key], desc_keys=["pop_cat_" + key + "_desc", key + "_desc"]),
            "rank": c.get("rank"),
            "display_category": c.get("display_category"),
            "resources": resources(c.get("resources")),
        })
    return DataSet("jobs", SOURCES, items, warnings, {"categories": categories})


if __name__ == "__main__":
    main(extract, __doc__)
