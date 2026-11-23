"""Living standards of common/species_rights/living_standards with the pop upkeep they set (T2001):

python tools/extract/extract_living_standards.py [--game DIR]

Every item keeps its modifier blocks (`pop_group_modifier`, `triggered_pop_group_modifier`...) and its
conditions as text, plus summaries read from the modifier names:

- `pop_upkeep`: {stratum: {resource: amount}} of `pop_category_<stratum>_<resource>_upkeep_add`
  (unconditional modifiers only; the triggered ones stay in `triggered_pop_group_modifier`);
- `political_power`: {stratum: amount} of `pop_cat_<stratum>_political_power`;
- `trade`: {pop category: trade per pop} of the `produces` blocks of the pop categories that test
  `has_living_standard` (`common/pop_categories`, through the `living_standard_*_production` inline scripts).

The data set also carries `species_upkeep`: the upkeep the species type traits give every pop
(food, minerals, alloys or energy), which the living standard adds to.
"""
import re
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc, loc, modifier, resources, triggered_modifiers

FOLDER = "common/species_rights/living_standards"
MODIFIER_KEYS = ("pop_group_modifier", "pop_modifier", "planet_modifier", "country_modifier")
TRIGGERED_KEYS = tuple("triggered_" + k for k in MODIFIER_KEYS)
CONDITION_KEYS = ("potential", "allow", "in_breach_of", "ai_will_do")
# Species type traits whose `resources` give the upkeep of every pop of the species
SPECIES_TRAITS = ("trait_organic", "trait_lithoid", "trait_infernal", "trait_machine_unit", "trait_mechanical")
RESOURCES = ("consumer_goods", "food", "minerals", "energy", "alloys", "unity", "trade", "influence")
_UPKEEP = re.compile(r"^pop_category_([a-z_]+?)_(" + "|".join(RESOURCES) + r")_upkeep_add$")
_POWER = re.compile(r"^pop_cat_([a-z_]+?)_political_power$")
_HAS_STANDARD = re.compile(r"has_living_standard\s*=\s*\{\s*type\s*=\s*([a-z_]+)\s*\}")


def summaries(mods):
    upkeep, power = {}, {}
    for k, v in (mods or {}).items():
        m = _UPKEEP.match(k)
        if m:
            upkeep.setdefault(m.group(1), {})[m.group(2)] = v
        m = _POWER.match(k)
        if m:
            power[m.group(1)] = v
    return upkeep, power


def category_trade(game):
    """{living standard: {pop category: trade}} from the pop categories' `produces` blocks."""
    out = {}
    for _file, key, cat in game.folder("common/pop_categories"):
        if not isinstance(cat, Block):
            continue
        for res in cat.get_all("resources"):
            if not isinstance(res, Block):
                continue
            for p in res.get_all("produces"):
                if not isinstance(p, Block):
                    continue
                m = _HAS_STANDARD.search(cond(p.get("trigger")) or "")
                if m and isinstance(p.get("trade"), (int, float)):
                    out.setdefault(m.group(1), {})[key] = p.get("trade")
    return out


def species_upkeep(game, warnings):
    traits = {k: v for _f, k, v in game.folder("common/traits") if k in SPECIES_TRAITS}
    out = []
    for t in SPECIES_TRAITS:
        if t not in traits:
            warnings.append(f"species trait {t} not found")
            continue
        out.append({"id": t, **loc(game, t), "allowed_archetypes": [str(v) for v in (traits[t].get("allowed_archetypes").values if isinstance(traits[t].get("allowed_archetypes"), Block) else [])],
                    "resources": resources(traits[t].get("resources"))})
    return out


def extract(game):
    warnings, items = [], []
    trade = category_trade(game)
    for file, key, s in game.folder(FOLDER):
        if not isinstance(s, Block):
            continue
        item = {"id": key, "file": file, **loc(game, key, desc_keys=[key + "_tooltip"])}
        for k in MODIFIER_KEYS:
            if s.get(k) is not None:
                item[k] = modifier(s.get(k))
        for k in TRIGGERED_KEYS:
            t = triggered_modifiers(s, k)
            if t:
                item[k] = t
        for k in CONDITION_KEYS:
            if s.get(k) is not None:
                item[k] = cond(s.get(k))
        other = [k for k in s.keys() if k not in MODIFIER_KEYS + TRIGGERED_KEYS + CONDITION_KEYS]
        if other:
            item["_text"] = cond(Block([e for e in s if e[0] in other]))
        upkeep, power = summaries(item.get("pop_group_modifier"))
        item["pop_upkeep"], item["political_power"] = upkeep, power
        item["trade"] = trade.get(key, {})
        item["dlc"] = dlc(game, s.get("potential"), s.get("allow"))
        if item["name"] is None:
            warnings.append(f"{key}: no English name")
        for k, v in (item.get("pop_group_modifier") or {}).items():
            if isinstance(v, str) and v.startswith("@"):
                warnings.append(f"{key}: {k} = {v} not resolved")
        items.append(item)
    extra = {"species_upkeep": species_upkeep(game, warnings)}
    return DataSet("living_standards", [FOLDER, "common/pop_categories", "common/traits"], items, warnings, extra)


if __name__ == "__main__":
    main(extract, __doc__)
