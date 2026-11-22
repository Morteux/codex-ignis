"""Policies of common/policies and their options (T2517): python tools/extract/extract_policies.py [--game DIR] [--icons [DIR]]"""
from extract_edicts import sprite_icon
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, loc, modifier, strings


def option_icon(game, sprite):
    """Diplomatic stances already have their folder in StellarisAssets; the other options go to policies/."""
    folder = "diplomatic_stances" if str(sprite).startswith("GFX_diplomatic_stance") else "policies"
    return sprite_icon(game, folder, sprite)


def extract(game):
    warnings, items = [], []
    for file, key, p in game.folder("common/policies"):
        if not isinstance(p, Block):
            continue
        options = []
        for o in p.get_all("option"):
            if not isinstance(o, Block):
                continue
            name = str(o.get("name") or "")
            opt = {
                "id": name,
                **loc(game, name),
                "policy_flags": strings(o.get("policy_flags")),
                "modifier": modifier(o.get("modifier")),
                "potential": cond(o.get("potential")),
                "valid": cond(o.get("valid")),
                "on_enabled": cond(o.get("on_enabled")),
                "on_disabled": cond(o.get("on_disabled")),
                "dlc": dlc(game, o.get("potential"), o.get("valid")),
                "icon": option_icon(game, o.get("icon")) if o.get("icon") else None,
            }
            if opt["name"] is None:
                warnings.append(f"{key}/{name}: no English name")
            options.append(opt)
        items.append({
            "id": key,
            "file": file,
            **loc(game, "policy_" + key, keys=["policy_" + key, key], desc_keys=["policy_" + key + "_desc", key + "_desc"]),
            "category": p.get("category"),
            "potential": cond(p.get("potential")),
            "allow": cond(p.get("allow")),
            "dlc": dlc(game, p.get("potential")),
            "options": options,
        })
        if items[-1]["name"] is None:
            warnings.append(f"{key}: no English name")
    return DataSet("policies", ["common/policies"], items, warnings)


if __name__ == "__main__":
    main(extract, __doc__)
