"""Authorities of common/governments/authorities (T2512): python tools/extract/extract_authorities.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, strings

AUTH_ICONS = "gfx/interface/icons/governments/authorities/"


def auth_icon(game, name, explicit=None):
    return icon(game, "authorities", textures=[str(explicit) if explicit else AUTH_ICONS + name + ".dds"])


def extract(game):
    warnings, items = [], []
    for file, key, a in game.folder("common/governments/authorities"):
        if not isinstance(a, Block):
            continue
        item = {
            "id": key,
            "file": file,
            **loc(game, key),
            "election_type": a.get("election_type"),
            "election_term_years": a.get("election_term_years"),
            "re_election_allowed": a.get("re_election_allowed") is True,
            "has_heir": a.get("has_heir") is True,
            "has_agendas": a.get("has_agendas") is True,
            "has_factions": a.get("has_factions") is not False,
            "can_reform": a.get("can_reform") is not False,
            "uses_mandates": a.get("uses_mandates") is True,
            "ruler_council_position": a.get("ruler_council_position"),
            "localization_postfix": a.get("localization_postfix"),
            "tags": strings(a.get("tags")),
            "country_modifier": modifier(a.get("country_modifier")),
            "playable": cond(a.get("playable")),
            "potential": cond(a.get("potential")),
            "possible": cond(a.get("possible")),
            "dlc": dlc(game, a.get("playable"), a.get("potential"), a.get("possible")),
            "icon": auth_icon(game, key, a.get("icon")),
            "swaps": [],
        }
        for s in a.get_all("advanced_authority_swap"):
            if not isinstance(s, Block) or s.get("name") is None:
                continue
            name = str(s.get("name"))
            item["swaps"].append({
                "id": name,
                **loc(game, name, desc_keys=[str(s.get("description") or name + "_desc")]),
                "trigger": cond(s.get("trigger")),
                "inherit_effects": s.get("inherit_effects") is not False,
                "modifier": modifier(s.get("modifier")),
                "dlc": dlc(game, s.get("trigger")),
                "icon": auth_icon(game, name) if s.get("inherit_icon") is False else None,
            })
        if item["icon"] is None:
            warnings.append(f"{key}: icon not found")
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    return DataSet("authorities", ["common/governments/authorities"], items, warnings)


if __name__ == "__main__":
    main(extract, __doc__)
