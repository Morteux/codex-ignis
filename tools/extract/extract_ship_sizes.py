"""Ship sizes of common/ship_sizes (hulls, bio-ship growth stages, stations) with the cost of their
sections from common/section_templates (T2533):
python tools/extract/extract_ship_sizes.py [--game DIR]

The cost of a ship is its section plus its components (common/component_templates, data set
`ship_components`); a section `cost` block may hold `mult` (bio-ship sections convert their alloy
figure to food with @alloy_to_food_cost_ratio), which is applied here."""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, loc, resources, simple_resources, strings

FIELDS = ("class", "ship_category", "ship_family_name", "growth_stage_descriptor", "construction_type",
          "upgrades_to", "max_hitpoints", "max_speed", "base_buildtime", "fleet_slot_size", "size_multiplier")


def scalar(value):
    if isinstance(value, bool) or isinstance(value, (int, float)):
        return value
    return None if value is None or isinstance(value, Block) else str(value)


def section_cost(block):
    """{resource: amount} of a section's resources.cost blocks, each one times its `mult`."""
    total = {}
    res = block.get("resources") if isinstance(block, Block) else None
    if not isinstance(res, Block):
        return total
    for cost in res.get_all("cost"):
        if not isinstance(cost, Block):
            continue
        mult = cost.get("mult", 1)
        mult = mult if isinstance(mult, (int, float)) and not isinstance(mult, bool) else 1
        for k, op, v in cost:
            if k not in (None, "mult", "trigger") and isinstance(v, (int, float)) and not isinstance(v, bool):
                amount = v * mult
                total[k] = round(total.get(k, 0) + amount, 4)
    return {k: int(v) if float(v).is_integer() else v for k, v in total.items()}


def sections_by_size(game):
    out = {}
    for file, key, s in game.folder("common/section_templates", repeated=("ship_section_template",)):
        if key != "ship_section_template" or not isinstance(s, Block) or s.get("ship_size") is None:
            continue
        out.setdefault(str(s.get("ship_size")), []).append({"key": str(s.get("key")), "file": file, "cost": section_cost(s)})
    return out


def extract(game):
    warnings, items = [], []
    sections = sections_by_size(game)
    for file, key, s in game.folder("common/ship_sizes"):
        if not isinstance(s, Block):
            continue
        res = resources(s.get("resources"))
        own = sections.get(key, [])
        costs = [x["cost"] for x in own if x["cost"]]
        item = {
            "id": key,
            "file": file,
            **loc(game, key, desc_keys=[key + "_desc", key + "_DESC"]),
            **{f: scalar(s.get(f)) for f in FIELDS},
            "is_bio_ship": s.get("is_bio_ship") is True,
            "growth_required": scalar(s.get("bioship_growth_progress_required")),
            "prerequisites": strings(s.get("prerequisites")),
            "cost": simple_resources(res, "cost"),
            "upkeep": simple_resources(res, "upkeep"),
            "logistics": simple_resources(res, "logistics"),
            "resources": res,
            "min_upgrade_cost": {k: v for k, _, v in s.get("min_upgrade_cost")} if isinstance(s.get("min_upgrade_cost"), Block) else {},
            "sections": own,
            "section_cost": min(costs, key=lambda c: sum(c.values())) if costs else {},
            "potential": cond(s.get("potential")),
            "dlc": dlc(game, s.get("potential")),
        }
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    return DataSet("ship_sizes", ["common/ship_sizes", "common/section_templates"], items, warnings)


if __name__ == "__main__":
    main(extract, __doc__)
