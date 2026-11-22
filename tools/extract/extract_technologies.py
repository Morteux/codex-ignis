"""Technologies of common/technology (T2506): python tools/extract/extract_technologies.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, strings

SOURCES = ["common/technology", "common/technology/category", "common/technology/tier"]
TECH_ICONS = "gfx/interface/icons/technologies/"


def tech_icon(game, name):
    return icon(game, "technologies", textures=[TECH_ICONS + name + ".dds"])


def cost(value):
    """(base cost, cost modifiers as text): `cost = 1500` or `cost = { factor = 2500 modifier = {...} }`."""
    if isinstance(value, Block):
        rest = Block([e for e in value if e[0] != "factor"])
        return value.get("factor"), cond(rest) if rest.entries else None
    return value, None


def weight(value):
    if isinstance(value, Block):
        return value.get("factor", value.get("base")), cond(value)
    return value, None


def extract(game):
    warnings = []
    items = []
    for file, key, t in game.folder("common/technology"):
        if not isinstance(t, Block):
            continue
        base_cost, cost_mods = cost(t.get("cost"))
        base_weight, weight_text = weight(t.get("weight"))
        repeatable = t.has("levels") or t.has("cost_per_level")
        start = t.get("start_tech") is True
        item = {
            "id": key,
            "file": file,
            **loc(game, key),
            "area": t.get("area"),
            "category": strings(t.get("category")),
            "tier": t.get("tier"),
            "cost": base_cost,
            "cost_modifiers": cost_mods,
            "cost_per_level": t.get("cost_per_level"),
            "levels": t.get("levels"),
            "prerequisites": strings(t.get("prerequisites")),
            "weight": base_weight,
            "weight_text": weight_text,
            "weight_modifier": cond(t.get("weight_modifier")),
            "modifier": modifier(t.get("modifier")),
            "flags": {
                "start": start,
                "rare": t.get("is_rare") is True,
                "dangerous": t.get("is_dangerous") is True,
                "insight": t.get("is_insight") is True,
                "repeatable": repeatable,
                # Never drawn as a research option: weight 0 (only events, anomalies or other effects give it)
                "event": not start and not repeatable and base_weight == 0,
                "reverse_engineerable": t.get("is_reverse_engineerable") is not False,
            },
            "gateway": t.get("gateway"),
            "feature_flags": strings(t.get("feature_flags")),
            "potential": cond(t.get("potential")),
            "starting_potential": cond(t.get("starting_potential")),
            "dlc": dlc(game, t.get("potential")),
            "icon": tech_icon(game, str(t.get("icon") or key)),
            "swaps": [],
        }
        for s in t.get_all("technology_swap"):
            if not isinstance(s, Block) or s.get("name") is None:
                continue
            name = str(s.get("name"))
            own_icon = s.get("inherit_icon") is False
            item["swaps"].append({
                "id": name,
                **loc(game, name),
                "trigger": cond(s.get("trigger")),
                "inherit_effects": s.get("inherit_effects") is not False,
                "modifier": modifier(s.get("modifier")),
                "icon": tech_icon(game, str(s.get("icon") or name)) if own_icon else None,
            })
        if item["cost"] is None and not start:
            warnings.append(f"{key}: no cost")
        if item["icon"] is None:
            warnings.append(f"{key}: icon not found")
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    known = {i["id"] for i in items}
    for i in items:
        for p in i["prerequisites"]:
            if p not in known:
                warnings.append(f"{i['id']}: unknown prerequisite {p}")
    categories = [{"id": k, **loc(game, k), "icon": icon(game, "technologies", textures=[str(v.get("icon"))]) if isinstance(v, Block) else None}
                  for _, k, v in game.folder("common/technology/category")]
    tiers = [{"tier": int(k) if k.isdigit() else k, "previously_unlocked": v.get("previously_unlocked") if isinstance(v, Block) else None}
             for _, k, v in game.folder("common/technology/tier")]
    return DataSet("technologies", SOURCES, items, warnings, {"categories": categories, "tiers": tiers})


if __name__ == "__main__":
    main(extract, __doc__)
