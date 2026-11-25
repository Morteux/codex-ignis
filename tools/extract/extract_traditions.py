"""Tradition trees of common/tradition_categories and traditions of common/traditions (T4110):
python tools/extract/extract_traditions.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, strings, triggered_modifiers

TRADITION_ICONS = "gfx/interface/icons/traditions/"


def desc_keys(block):
    """Localisation keys of the `desc = key` or `desc = { text = key trigger = {...} }` entries."""
    out = []
    for d in block.get_all("desc"):
        k = d.get("text") if isinstance(d, Block) else d
        if k is not None and str(k) not in out:
            out.append(str(k))
    return out


def extract(game):
    warnings, categories, traditions = [], [], []
    category_of = {}
    for file, key, c in game.folder("common/tradition_categories"):
        if not isinstance(c, Block):
            continue
        members = strings(c.get("traditions"))
        adopt, finish = c.get("adoption_bonus"), c.get("finish_bonus")
        for t in members + [str(x) for x in (adopt, finish) if x]:
            category_of.setdefault(t, key)
        descs = desc_keys(c)
        item = {
            "id": key,
            "file": file,
            **loc(game, key, desc_keys=descs + [key + "_desc"]),
            "traditions": members,
            "adoption_bonus": str(adopt) if adopt else None,
            "finish_bonus": str(finish) if finish else None,
            "tree_template": c.get("tree_template"),
            "potential": cond(c.get("potential")),
            "possible": cond(c.get("possible")),
            "dlc": dlc(game, c.get("potential"), c.get("possible")),
            "icon": icon(game, "traditions", textures=[TRADITION_ICONS + key + ".dds"]),
        }
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        categories.append(item)
    for file, key, t in game.folder("common/traditions"):
        if not isinstance(t, Block):
            continue
        category = category_of.get(key)
        kind = "adopt" if key.endswith("_adopt") else "finish" if key.endswith("_finish") else "tradition"
        item = {
            "id": key,
            "file": file,
            **loc(game, key),
            "category": category,
            "kind": kind,
            "modifier": modifier(t.get("modifier")),
            "triggered_modifier": triggered_modifiers(t, "triggered_modifier"),
            "possible": cond(t.get("possible")),
            "on_enabled": cond(t.get("on_enabled")),
            "swaps": [{"name": s.get("name"), "trigger": cond(s.get("trigger")), "modifier": modifier(s.get("modifier"))}
                      for s in t.get_all("tradition_swap") if isinstance(s, Block)],
            "dlc": dlc(game, t.get("possible")),
            "icon": icon(game, "traditions", textures=[str(t.get("icon") or TRADITION_ICONS + key + ".dds")]),
        }
        if category is None:
            warnings.append(f"{key}: in no tradition category")
        if item["name"] is None and kind == "tradition":
            warnings.append(f"{key}: no English name")
        traditions.append(item)
    return [DataSet("tradition_categories", ["common/tradition_categories"], categories, warnings),
            DataSet("traditions", ["common/traditions"], traditions)]


if __name__ == "__main__":
    main(extract, __doc__)
