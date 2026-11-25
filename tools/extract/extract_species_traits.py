"""Species traits of common/traits (T4110); leader traits (the ones with a leader_class) are left out:
python tools/extract/extract_species_traits.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, icon, loc, modifier, strings, triggered_modifiers

TRAIT_ICONS = "gfx/interface/icons/traits/"


def is_leader_trait(t):
    return t.get("leader_class") is not None or t.get("leader_trait") is not None


def extract(game):
    warnings, items = [], []
    for file, key, t in game.folder("common/traits"):
        if not isinstance(t, Block) or is_leader_trait(t):
            continue
        item = {
            "id": key,
            "file": file,
            **loc(game, key),
            "cost": t.get("cost") if isinstance(t.get("cost"), (int, float)) else None,
            "category": t.get("category"),
            "allowed_archetypes": strings(t.get("allowed_archetypes")),
            "opposites": strings(t.get("opposites")),
            "tags": strings(t.get("tags")),
            "initial": t.get("initial") is not False,
            "randomized": t.get("randomized") is not False,
            "modification": t.get("modification") is not False,
            "advanced_trait": t.get("advanced_trait") is True,
            "allowed_planet_classes": strings(t.get("allowed_planet_classes")),
            "allowed_civics": strings(t.get("allowed_civics")),
            "allowed_origins": strings(t.get("allowed_origins")),
            "forbidden_origins": strings(t.get("forbidden_origins")),
            "modifier": modifier(t.get("modifier")),
            "triggered_planet_modifier": triggered_modifiers(t, "triggered_planet_modifier"),
            "species_potential_add": cond(t.get("species_potential_add")),
            "species_possible_add": cond(t.get("species_possible_add")),
            "species_possible_remove": cond(t.get("species_possible_remove")),
            "dlc": dlc(game, t.get("species_potential_add"), t.get("species_possible_add")),
            "icon": icon(game, "species_traits", textures=[str(t.get("icon") or TRAIT_ICONS + key + ".dds")]),
        }
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        items.append(item)
    return DataSet("species_traits", ["common/traits"], items, warnings)


if __name__ == "__main__":
    main(extract, __doc__)
