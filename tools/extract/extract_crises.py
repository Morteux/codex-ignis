"""Player crises (T4110): paths of common/crisis_paths, levels of common/crisis_levels, menace perks of
common/menace_perks and objectives of common/crisis_objectives:
python tools/extract/extract_crises.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, loc, modifier, strings


def named(game, folder, fields, name_suffix="", needs_name=True):
    """Items of a folder with their name and the fields `fields` ({name: function of the block})."""
    warnings, items = [], []
    for file, key, b in game.folder(folder):
        if not isinstance(b, Block):
            continue
        names = loc(game, key, keys=[key + name_suffix, key], desc_keys=[key + "_desc"])
        item = {"id": key, "file": file, **names, **{k: f(b) for k, f in fields.items()}}
        if item["name"] is None and needs_name:
            warnings.append(f"{key}: no English name")
        items.append(item)
    return items, warnings


def extract(game):
    paths, w1 = named(game, "common/crisis_paths", {
        "crisis_currency": lambda b: b.get("crisis_currency"),
        "levels": lambda b: strings(b.get("levels")),
        "objectives": lambda b: strings(b.get("objectives")),
    }, needs_name=False)  # paths have no localised name (the game names them through their ascension perk)
    levels, w2 = named(game, "common/crisis_levels", {
        "required_crisis_currency": lambda b: b.get("required_crisis_currency"),
        "perks": lambda b: strings(b.get("perks")),
        "allow": lambda b: cond(b.get("allow")),
    })
    for i, level in enumerate(levels):
        level["order"] = i  # levels unlock in file order
    perks, w3 = named(game, "common/menace_perks", {
        "modifier": lambda b: modifier(b.get("modifier")),
        "potential": lambda b: cond(b.get("potential")),
        "dlc": lambda b: dlc(game, b.get("potential")),
    })
    objectives, w4 = named(game, "common/crisis_objectives", {
        "potential": lambda b: cond(b.get("potential")),
    }, name_suffix="_name")
    return [DataSet("crisis_paths", ["common/crisis_paths"], paths, w1),
            DataSet("crisis_levels", ["common/crisis_levels"], levels, w2),
            DataSet("menace_perks", ["common/menace_perks"], perks, w3),
            DataSet("crisis_objectives", ["common/crisis_objectives"], objectives, w4)]


if __name__ == "__main__":
    main(extract, __doc__)
