"""Build times of the planet simulator from the extractor data (T2601):

python tools/extract/build_build_times.py [--data DIR] [--simulator FILE] [--check]

Writes js/build-time-data.js: the game build time (`base_buildtime`, days) of every building,
capital, district and district specialization (zone) the simulator has, read from
data/generated/<rulesetId>/buildings.json, districts.json and zones.json (default: the newest
folder). Nothing is invented: an item with no game match or no `base_buildtime` is written as
`null` and the simulator says it is left out.

- Buildings and capitals: matched with the T2522 matching (report_differences.py: simulator id,
  then English name, then icon). A building that is an upgrade (a game building lists it in its
  `upgrades`) is reached by building its earlier tiers first, so its `steps` hold the whole chain,
  from the first tier to itself.
- Districts: the game district of each simulator district, by body type and authority (hand-kept
  table below, checked against districts.json at run time).
- Specializations: matched to zones by icon (districts_specialization/...); when every zone with
  that icon has the same build time, that is the time, otherwise null.

--check only prints the matches and the items left without a time.
"""
import argparse, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import report_differences as rd  # noqa: E402

ROOT = rd.ROOT
OUT = f"{ROOT}/js/build-time-data.js"

# Simulator district → game district. `byAuthority`: the primary district depends on the authority;
# lists are the three secondary sets (setIndex 1–3) of a body with secondary urban districts.
DISTRICTS = {
    "urban": {"default": "district_city", "hiveMind": "district_hive", "machineIntelligence": "district_nexus"},
    "generator": "district_generator",
    "mining": "district_mining",
    "agriculture": "district_farming",
    "wilderness.urban": "district_craglands",
    "wilderness.generator": "district_photosynthesis_fields",
    "wilderness.mining": "district_hollow_mountains",
    "wilderness.agriculture": "district_orchard_forests",
    "residentialArcology": "district_arcology_housing",
    "unspecializedArcology": ["district_arcology_urban_1", "district_arcology_urban_2", "district_arcology_urban_3"],
    "citySegment": "district_rw_city",
    "hiveSegment": "district_rw_hive",
    "nexusSegment": "district_rw_nexus",
    "unspecializedSegment": ["district_rw_urban_1", "district_rw_urban_2", "district_rw_urban_3"],
    "unspecializedCluster": ["district_hive_1", "district_hive_2", "district_hive_3"],
    "unspecializedNexus": ["district_nexus_1", "district_nexus_2", "district_nexus_3"],
    "habitationDistrict": "district_hab_housing",
    "reactorDistrict": "district_hab_energy",
    "astroMiningBay": "district_hab_mining",
    "researchDistrict": "district_hab_science",
    "geothermalPowerplant": "district_geothermal",
    "magmaConduit": "district_melting",
    "thermotechnicForum": "district_polytechnic",
    "neuralGate": "district_cosmogenesis_world_science",
    "ampliativeSpeculator": "district_cosmogenesis_world_logic",
}


def load(data_dir, name):
    with open(os.path.join(data_dir, name + ".json"), encoding="utf-8") as f:
        return json.load(f)


def building_times(sim, buildings, problems):
    """{simulator id: {game, days, steps: [[game id, days]]}} for buildings and capitals (branch offices left out:
    another empire builds them)."""
    by_id = {g["id"]: g for g in buildings["items"]}
    parent = {}
    for g in buildings["items"]:
        for up in g.get("upgrades") or []:
            parent.setdefault(up, g["id"])
    sims = [s for s in rd.sim_items(sim)["buildings"] if not s.source.startswith("branch-office-data.js")]
    pairs, _ = rd.match("buildings", sims, buildings["items"])
    out = {}
    for s, g, how in pairs:
        if s.id in out:
            continue
        if not g:
            problems.append(f"building {s.id}: no game building")
            out[s.id] = None
            continue
        chain, gid, seen = [], g["id"], set()
        while gid and gid not in seen and gid in by_id:
            seen.add(gid)
            chain.append([gid, rd.num(by_id[gid]["base_buildtime"]) if by_id[gid].get("base_buildtime") is not None else None])
            gid = parent.get(gid)
        chain.reverse()
        out[s.id] = {"game": g["id"], "days": chain[-1][1], "steps": chain}
        if any(days is None for _, days in chain):
            problems.append(f"building {s.id} ({g['id']}): no base_buildtime for " + ", ".join(i for i, d in chain if d is None))
    return out


def district_times(districts, problems):
    by_id = {g["id"]: g for g in districts["items"]}

    def days(gid):
        if gid not in by_id:
            problems.append(f"district {gid}: not in districts.json")
            return None
        v = by_id[gid].get("base_buildtime")
        if v is None:
            problems.append(f"district {gid}: no base_buildtime")
        return rd.num(v) if v is not None else None

    out = {}
    for key, gid in DISTRICTS.items():
        if isinstance(gid, dict):
            out[key] = {"byAuthority": {a: {"game": g, "days": days(g)} for a, g in gid.items()}}
        elif isinstance(gid, list):
            out[key] = {"sets": [{"game": g, "days": days(g)} for g in gid]}
        else:
            out[key] = {"game": gid, "days": days(gid)}
    return out


def specialization_options(sim):
    m = sim["modules"]
    pd = m["planet-data.js"]
    for group in (pd["DISTRICTS"], pd["WILDERNESS_DISTRICTS"]):
        for d in group.values():
            for o in d.get("specializationOptions") or []:
                yield o


def zone_times(sim, zones, problems):
    by_icon = {}
    for z in zones["items"]:
        asset = rd.asset_of(z)
        if asset:
            by_icon.setdefault(asset.lower(), []).append(z)
    out = {}
    for o in specialization_options(sim):
        if o["id"] in out:
            continue
        cands = by_icon.get((o.get("img") or "").lower(), [])
        values = sorted({rd.num(z["base_buildtime"]) for z in cands if z.get("base_buildtime") is not None})
        if len(values) == 1:
            out[o["id"]] = {"game": sorted(z["id"] for z in cands if z.get("base_buildtime") is not None), "days": values[0]}
        else:
            out[o["id"]] = None
            problems.append(f"specialization {o['id']}: " + ("no zone with icon " + str(o.get("img")) if not values else f"zones with different times {values}"))
    return out


SPEED_KEY = re.compile(r"^planet_(building_build_speed_mult|district_[a-z_]+_build_speed_mult|building_capacity_add)$")


def speed_sources(sim, sets, problems):
    """Civics, origins and designations of the simulator whose game modifier changes the build speed or the
    Build Queue Capacity: {set: {simulator key: {game, modifiers}}}. Listed by the simulator, not applied."""
    sims = rd.sim_items(sim)
    out = {}
    for set_name in ("civics", "origins", "designations"):
        pairs, _ = rd.match(set_name, sims[set_name], sets[set_name]["items"])
        found = {}
        for s, g, how in pairs:
            if not g:
                continue
            mods = {**(g.get("modifier") or {}), **(g.get("planet_modifier") or {})}
            mods = {k: rd.num(v) for k, v in mods.items() if SPEED_KEY.match(k)}
            if mods:
                key = s.key if set_name == "civics" else s.id  # the planet state keeps civics by i18n key
                found[key] = {"game": g["id"], "modifiers": mods}
        out[set_name] = found
    return out


def js_value(v, indent="  "):
    return json.dumps(v, ensure_ascii=False)


def write(ruleset, buildings, districts, zones, speeds):
    lines = [
        "/**",
        " * Build times of the planet simulator (T2601), in days. GENERATED by",
        " * `python tools/extract/build_build_times.py` from the game files extractor data",
        f" * (data/generated/{ruleset}/buildings.json, districts.json, zones.json): do not edit by hand.",
        " *",
        " * - BUILDING_BUILD_TIMES: simulator building or capital id → { game, days, steps }; `steps` is the upgrade",
        " *   chain from the first tier to the building ([game id, days]), `days` null = the game gives no base_buildtime.",
        " * - DISTRICT_BUILD_TIMES: simulator district → { game, days } | { byAuthority } | { sets } (secondary sets 1–3).",
        " * - SPECIALIZATION_BUILD_TIMES: specialization id → { game: [zone ids], days } (null = no zone found).",
        " * - BUILD_SPEED_SOURCES: civics (by i18n key), origins and designations of the simulator whose game modifier",
        " *   changes the build speed or the Build Queue Capacity: { game, modifiers }. Listed, not applied (GDD §6.2).",
        " */",
        "",
        f"export const BUILD_TIME_RULESET = {json.dumps(ruleset)};",
        "",
        "/** Days in a game year (the game calendar has 12 months of 30 days). */",
        "export const DAYS_PER_YEAR = 360;",
        "",
    ]
    for name, data in (("BUILDING_BUILD_TIMES", buildings), ("DISTRICT_BUILD_TIMES", districts), ("SPECIALIZATION_BUILD_TIMES", zones), ("BUILD_SPEED_SOURCES", speeds)):
        lines.append(f"export const {name} = {{")
        items = list(data.items())
        for i, (k, v) in enumerate(items):
            lines.append(f"  {json.dumps(k)}: {js_value(v)}" + ("," if i < len(items) - 1 else ""))
        lines.append("};")
        lines.append("")
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Build times of the planet simulator from the extractor data")
    p.add_argument("--data", help="data/generated/<rulesetId> folder (default: the newest)")
    p.add_argument("--simulator", help="JSON dump of tools/extract/dump_simulator_data.mjs (default: made now with node)")
    p.add_argument("--check", action="store_true", help="only print the matches and the items without a time")
    args = p.parse_args()
    data_dir = args.data or rd.newest_data_dir()
    sim = rd.load_simulator(args.simulator)
    buildings, districts, zones = (load(data_dir, n) for n in ("buildings", "districts", "zones"))
    problems = []
    b = building_times(sim, buildings, problems)
    d = district_times(districts, problems)
    z = zone_times(sim, zones, problems)
    s = speed_sources(sim, {n: load(data_dir, n) for n in ("civics", "origins", "designations")}, problems)
    for line in problems:
        print("note:", line)
    print(f"buildings {sum(1 for v in b.values() if v)}/{len(b)}, districts {len(d)}, specializations {sum(1 for v in z.values() if v)}/{len(z)}, speed sources {json.dumps(s)}")
    if not args.check:
        write(buildings["rulesetId"], b, d, z, s)
        print(f"written {OUT}")


if __name__ == "__main__":
    main()
