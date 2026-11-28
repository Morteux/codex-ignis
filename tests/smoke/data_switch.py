"""Simulator data switched to the 4.6.0 game files (T2523): the collections are tagged with 4.6.0 and the values
changed in T2523 equal the extractor output of data/generated/stellaris-pc-4.6.0/."""
import json, os, subprocess, sys
from smoke.common import check, ROOT

RULESET = "stellaris-pc-4.6.0"
SWITCHED = ["buildings", "capitalBuildings", "districts", "jobs", "ethics", "edicts", "branchOffices", "jobSwaps", "bodyTypeRules"]


def game(set_name):
    with open(os.path.join(ROOT, "data", "generated", RULESET, set_name + ".json"), encoding="utf-8") as f:
        items = json.load(f)["items"]
    out = {}
    for item in items:
        out[item["id"]] = item
        for swap in item.get("swaps") or []:
            out.setdefault(swap["id"], swap)
    return out


def flat(entries):
    """Unconditional resources of a game `resources` list ({resource: amount})."""
    out = {}
    for e in entries or []:
        if not e.get("trigger") and "mult" not in e:
            for k, v in e.items():
                out[{"physics_research": "physics", "society_research": "society", "engineering_research": "engineering"}.get(k, k)] = v
    return out


async def run(t):
    sys.path.insert(0, os.path.join(ROOT, "tools", "extract"))
    import report_differences as rd
    sim = rd.load_simulator()
    m = sim["modules"]
    buildings = {b["id"]: b for b in m["planet-data.js"]["BUILDINGS"]}
    capitals = {b["id"]: b for chain in m["planet-data.js"]["CAPITAL_SETS"].values() for b in chain}
    districts = m["body-type-data.js"]["SPECIAL_DISTRICTS"]
    swaps = {s["id"]: s for s in m["job-swap-data.js"]["JOB_SWAPS"]}
    gb, gd, gj, ge = game("buildings"), game("districts"), game("jobs"), game("ethics")

    script = "import {DATA_COLLECTIONS as c} from './js/data-version.js'; console.log(JSON.stringify(c));"
    collections = json.loads(subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    wrong = [c for c in SWITCHED if collections[c].get("rulesetId") != RULESET or not any(s.startswith("game files 4.6.0") for s in collections[c]["sources"])]
    check("data switch (T2523): the switched collections are tagged stellaris-pc-4.6.0 with their game folders as sources", not wrong, wrong)

    def cost(b):
        return {i["resource"]: i["amount"] for i in b["cost"]["items"] if i.get("when") != "nomadic"}

    pairs = {"lathe_validator": "building_lathe_validator", "lathe_cogitator": "building_lathe_cogitator", "lathe_reactor": "building_lathe_reactor",
             "chemical_plants": "building_chemical_plant", "synthetic_crystal_plants": "building_crystal_plant",
             "research_supply_depot": "building_research_upkeep_1", "data_driven_theorem_facility": "building_research_efficiency_1",
             "vultaum_reality_computer": "building_vultaum_reality_computer",
             "ministry_of_production": "building_ministry_production", "alloy_nano_plants": "building_foundry_3", "life_systems_complex": "building_biolab_3"}
    bad = []
    for sid, gid in pairs.items():
        b, g = buildings[sid], gb[gid]
        gcost = {k: v for k, v in flat(g["resources"]["cost"]).items()}
        gcost.update({k: v for e in g["resources"]["cost"] if e.get("trigger") and "is_nomadic = no" in e["trigger"] and "ringworld_output_boost = yes" not in e["trigger"] for k, v in e.items() if k not in ("trigger", "mult")})
        gup = {k: -v for k, v in flat(g["resources"]["upkeep"]).items()}
        if cost(b) != gcost or b["upkeep"] != gup or b["cost"]["time"] != g["base_buildtime"]:
            bad.append((sid, cost(b), gcost, b["upkeep"], gup, b["cost"]["time"], g["base_buildtime"]))
    check("data switch (T2523): building costs, upkeep and build time equal the 4.6.0 game files (Lathe, chemical plants, research and foundry buildings)", not bad, bad)
    # Efficiency buildings: every cost line has a ring world trigger; the simulator keeps the one without the boost.
    eff = [(sid, cost(buildings[sid])) for sid, gid, res in (("metallurgical_research_lab", "building_foundry_efficiency_1", "volatile_motes"), ("distributed_design_center", "building_factory_efficiency_1", "rare_crystals"))
           if cost(buildings[sid]) != {"minerals": next(e["minerals"] for e in gb[gid]["resources"]["cost"] if "is_nomadic = no" in e.get("trigger", "") and "boost = no" in e["trigger"]),
                                       res: next(e[res] for e in gb[gid]["resources"]["cost"] if e.get("trigger") == "has_ringworld_output_boost = no")}]
    check("data switch (T2523): Metallurgical Research Lab and Distributed Design Center cost minerals (not energy), as in the 4.6.0 game files", not eff, eff)
    cap = [(sid, capitals[sid]["upkeep"], gb[gid]["upkeep"]) for sid, gid in (("administrative_array", "building_machine_capital"), ("planetary_processor", "building_machine_major_capital"))
           if capitals[sid]["upkeep"] != {k: -v for k, v in gb[gid]["upkeep"].items()}]
    check("data switch (T2523): machine capital upkeep equals the 4.6.0 game files", not cap, cap)

    dpairs = {"residentialArcology": "district_arcology_housing", "unspecializedArcology": "district_arcology_urban_1", "habitationDistrict": "district_hab_housing",
              "researchDistrict": "district_hab_science", "unspecializedNexus": "district_nexus_1", "neuralGate": "district_cosmogenesis_world_science"}
    dbad = []
    for sid, gid in dpairs.items():
        d, g = districts[sid], gd[gid]
        gcost = flat(g["resources"]["cost"]) or {k: v for e in g["resources"]["cost"] if e.get("trigger", "").startswith("NOT") for k, v in e.items() if k != "trigger"}
        gup = flat(g["resources"]["upkeep"]) or {k: v for e in g["resources"]["upkeep"] if e.get("trigger", "").startswith("NOT") for k, v in e.items() if k != "trigger"}
        if d["cost"] != gcost or d["upkeep"] != {k: -v for k, v in gup.items()} or d["time"] != g["base_buildtime"] or d["housing"] != g["planet_modifier"]["planet_housing_add"]:
            dbad.append((sid, d["cost"], gcost, d["upkeep"], gup, d["time"], g["base_buildtime"], d["housing"]))
    check("data switch (T2523): special district cost, upkeep, build time and housing equal the 4.6.0 game files", not dbad, dbad)
    cluster = districts["unspecializedCluster"]["housing"] == gd["district_hive_1"]["planet_modifier"]["planet_housing_add"] + 600
    check("data switch (T2523): the Unspecialized Cluster keeps 1200 + 600 on a Hive World (triggered modifier of district_hive_1)",
          cluster and any(x.get("modifier", {}).get("planet_housing_add") == 600 for x in gd["district_hive_1"]["triggered_planet_modifier"]), districts["unspecializedCluster"]["housing"])

    jbad = []
    for sid in ("astral_researcher", "nanotech_researcher", "munitions_decommissioner", "dimensional_portal_researcher", "technophant", "haruspex", "culture_worker"):
        out = {k: v for k, v in swaps[sid]["output"].items() if v > 0 and k != "amenities"}
        produced = {k: v for k, v in flat(gj[sid]["resources"]["produces"]).items() if k != "sr_dark_matter"}
        upkeep = flat(gj[sid]["resources"]["upkeep"])
        if out != produced or any(swaps[sid]["output"].get(k) != -v for k, v in upkeep.items()):
            jbad.append((sid, swaps[sid]["output"], produced, upkeep))
    check("data switch (T2523): job swap outputs and upkeep equal the 4.6.0 game files (research swaps, Technophant, Haruspex, Culture Worker)", not jbad, jbad)

    # T2528: building sets of the game files (simulator names: generator = "energy", farming = "food").
    set_names = {"generator": "energy", "farming": "food"}
    sets = {sid: (buildings[sid]["sets"], [set_names.get(x, x) for x in gb[gid]["building_sets"]]) for sid, gid in
            (("waste_reprocessing_center", "building_waste_reprocessing_center"), ("baol_organic_plant", "building_baol_organic_plant"))}
    commercial = next(o for o in m["planet-data.js"]["DISTRICTS"]["urban"]["specializationOptions"] if o["id"] == "commercialNexus")
    check("data switch (T2528): Waste Reprocessing Center in the urban and generator sets, Baol Organic Plant in farming and factory, and the Commercial Nexus allows the urban set",
          all(a == b for a, b in sets.values()) and "urban" in commercial["permittedSets"], (sets, commercial["permittedSets"]))
    icons = {e["id"]: (e.get("icon") or {}).get("asset") for e in ge.values()}
    ebad = [k for k, v in m["empire-data.js"]["ETHIC_ICONS"].items() if not k.startswith("fanatic") and k != "gestaltConsciousness"
            and v != icons.get("ethic_" + "".join("_" + c.lower() if c.isupper() else c for c in k))]
    check("data switch (T2523): the moderate ethic icons are the ones of the 4.6.0 game files", not ebad, ebad)

    # T2530: effects of designations, policies, authorities, planet modifiers and planetary features compared with the
    # 4.6.0 modifiers (report_differences.py) and switched; collections tagged and the save stamp moved to 4.6.0.
    switched_effects = ["designations", "authorities", "policies", "planetModifiers", "planetaryFeatures"]
    wrong = [c for c in switched_effects if collections.get(c, {}).get("rulesetId") != RULESET or not any(s.startswith("game files 4.6.0") for s in collections[c]["sources"])]
    check("data switch (T2530): designations, authorities, policies, planet modifiers and planetary features are tagged stellaris-pc-4.6.0", not wrong, wrong)
    data_dir = os.path.join(ROOT, "data", "generated", RULESET)
    sets = {}
    for f in os.listdir(data_dir):
        if f.endswith(".json") and f != "manifest.json":
            with open(os.path.join(data_dir, f), encoding="utf-8") as fh:
                d = json.load(fh)
            sets[d["set"]] = d
    rd.set_context(sim, sets)
    items = rd.sim_items(sim)
    left = {}
    for set_name in rd.EFFECT_SETS:
        pairs, _ = rd.match(set_name, items[set_name], rd.game_items(set_name, sets[set_name], sets))
        for s, g, _how in pairs:
            if g:
                diffs = [d[0] for d in rd.compare(set_name, s, g) if d[0].startswith("modifiers.")]
                if diffs:
                    left[s.id] = diffs
    # documented in DECISIONS_TO_REVIEW.md (T2530): not switched
    known = {"tranquilWorld": ["modifiers.job_efficiency:synapse_drone"], "nanotechWorld": ["modifiers.planet_jobs_worker_produces_mult"]}
    check("data switch (T2530): no modelled effect differs from the 4.6.0 game modifiers (except the two documented ones)", left == known, left)
    des = {x["id"]: x["jobEfficiency"] for x in m["designation-data.js"]["DESIGNATIONS"]}
    check("data switch (T2530): switched values, e.g. Nest World +15 % traders, Resort World +15 % entertainers, Tech-World +15 % Experiment Engineers",
          des["nestWorld"].get("trader") == 0.15 and des["resortWorld"] == {"entertainer": 0.15} and des["techWorld"].get("experiment_engineer") == 0.15,
          (des["nestWorld"], des["resortWorld"], des["techWorld"]))
    script = ("import {CURRENT_RULESET_ID as c, checkRuleset, stampRuleset} from './js/data-version.js';"
              "console.log(JSON.stringify([c, stampRuleset({}).rulesetId, checkRuleset({rulesetId:'stellaris-pc-4.5.2'}).status]));")
    stamp = json.loads(subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    check("data switch (T2530): saved planets are stamped stellaris-pc-4.6.0 and files saved with 4.5.2 still import", stamp == [RULESET, RULESET, "ok"], stamp)
