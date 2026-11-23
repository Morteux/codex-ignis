"""Buildings of common/buildings (T2508): python tools/extract/extract_buildings.py [--game DIR] [--icons [DIR]]"""
import re
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, resources, simple_resources, strings, triggered_modifiers

SOURCES = ["common/buildings"]
BUILDING_ICONS = "gfx/interface/icons/buildings/"
_JOB = re.compile(r"^job_(.+)_add$")


def jobs_of(mod):
    """{job: amount} of the job_<id>_add statements of a modifier."""
    return {m.group(1): v for k, v in (mod or {}).items() if (m := _JOB.match(k)) and isinstance(v, (int, float))}


def building_jobs(planet_modifier, triggered):
    """Jobs a building gives: unconditional ones and the ones behind a condition."""
    jobs = jobs_of(planet_modifier)
    conditional = []
    for t in triggered:
        j = jobs_of(t.get("modifier"))
        if j:
            conditional.append({"potential": t.get("potential"), "jobs": j})
    return jobs, conditional


def extract(game):
    warnings, items = [], []
    for file, key, b in game.folder("common/buildings"):
        if not isinstance(b, Block):
            continue
        res = resources(b.get("resources"))
        pm = modifier(b.get("planet_modifier"))
        tpm = triggered_modifiers(b, "triggered_planet_modifier")
        jobs, jobs_conditional = building_jobs(pm, tpm)
        item = {
            "id": key,
            "file": file,
            **loc(game, key),
            "category": b.get("category"),
            "cost": simple_resources(res, "cost"),
            "upkeep": simple_resources(res, "upkeep"),
            "produces": simple_resources(res, "produces"),
            "resources": res,
            "base_buildtime": b.get("base_buildtime"),
            "jobs": jobs,
            "jobs_conditional": jobs_conditional,
            "prerequisites": strings(b.get("prerequisites")),
            "upgrades": strings(b.get("upgrades")),
            "convert_to": strings(b.get("convert_to")),
            "building_sets": strings(b.get("building_sets")),
            "planet_limit": b.get("planet_limit"),
            "base_cap_amount": b.get("base_cap_amount"),
            "empire_limit": b.get("empire_limit"),
            "capital": b.get("capital") is True,
            "capital_tier": b.get("capital_tier"),
            "owner_type": b.get("owner_type"),
            "can_build": b.get("can_build") is not False,
            "can_demolish": b.get("can_demolish") is not False,
            "can_be_ruined": b.get("can_be_ruined") is not False,
            "is_essential": b.get("is_essential") is True,
            "planet_modifier": pm,
            "country_modifier": modifier(b.get("country_modifier")),
            "triggered_planet_modifier": tpm,
            "triggered_country_modifier": triggered_modifiers(b, "triggered_country_modifier"),
            "potential": cond(b.get("potential")),
            "allow": cond(b.get("allow")),
            "destroy_trigger": cond(b.get("destroy_trigger")),
            "dlc": dlc(game, b.get("potential"), b.get("allow")),
            "icon": icon(game, "buildings", textures=[BUILDING_ICONS + str(b.get("icon") or key) + ".dds"]),
        }
        if item["icon"] is None:
            warnings.append(f"{key}: icon not found")
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    known = {i["id"] for i in items}
    for i in items:
        for u in i["upgrades"] + i["convert_to"]:
            if u not in known:
                warnings.append(f"{i['id']}: unknown building {u}")
    return DataSet("buildings", SOURCES, items, warnings)


if __name__ == "__main__":
    main(extract, __doc__)
