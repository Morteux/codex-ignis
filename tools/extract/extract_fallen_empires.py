"""Fallen empire types of common/fallen_empires (T4110): the authority, ethics, civics, origin and
traits their create_country_effect gives them:
python tools/extract/extract_fallen_empires.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc


def walk(block, key):
    """Every value of `key` anywhere inside a block."""
    for k, op, v in block.entries:
        if k == key:
            yield v
        if isinstance(v, Block):
            yield from walk(v, key)


def first_block(block, key):
    return next((v for v in walk(block, key) if isinstance(v, Block)), None)


def extract(game):
    warnings, items = [], []
    for file, key, f in game.folder("common/fallen_empires"):
        if not isinstance(f, Block):
            continue
        effect = f.get("create_country_effect")
        effect = effect if isinstance(effect, Block) else Block()
        # Some (the hive fallen empire) create their country in a scripted effect: only the species is read
        country = first_block(effect, "create_country") or Block()
        ethos, civics = country.get("ethos"), country.get("civics")
        traits = {str(v) for v in walk(effect, "add_trait")} | {str(v) for v in walk(effect, "trait")}
        item = {
            "id": key,
            "file": file,
            "graphical_culture": f.get("graphical_culture"),
            "initializer": f.get("initializer"),
            "type": country.get("type"),
            "authority": country.get("authority"),
            "ethics": [str(v) for v in ethos.get_all("ethic")] if isinstance(ethos, Block) else [],
            "civics": [str(v) for v in civics.get_all("civic")] if isinstance(civics, Block) else [],
            "origin": str(country.get("origin")) if country.get("origin") else None,
            "species_traits": sorted(t for t in traits if t.startswith("trait_")),
            "weight_modifier": cond(f.get("weight_modifier")),
            "possible": cond(f.get("possible")),
            "dlc": dlc(game, f.get("possible"), f.get("weight_modifier")),
        }
        if not item["ethics"]:
            warnings.append(f"{key}: no ethic in create_country_effect")
        items.append(item)
    return DataSet("fallen_empires", ["common/fallen_empires"], items, warnings)


if __name__ == "__main__":
    main(extract, __doc__)
