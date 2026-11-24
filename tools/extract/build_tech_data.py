"""Tech tree data file of a game version (T3005): python tools/extract/build_tech_data.py [--data DIR] [--out FILE] [--simulator FILE]

--data is a data/generated/<rulesetId>/ folder (default: the newest one) and --out the data file
(default: js/tech-data/<rulesetId>.js). Reads technologies.json, plus the sets whose items name a
technology as prerequisite (buildings, districts, edicts, deposits) for the unlocks, and writes
the model of TECH_TREE_GDD.md section 4.3: every technology, event and repeatable ones included.
Only reads the generated data; the data file is rewritten as a whole (never edit it by hand).

T3007: unlocked buildings and districts, and the jobs they give, are linked to the simulator ids
(`sim`) with the matcher of report_differences.py (game id, then English name, then icon).
--simulator is a dump of tools/extract/dump_simulator_data.mjs (default: the dump is made now).
"""
import argparse, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pdx.parser import Block, Parser, to_text  # noqa: E402
import report_differences as rd  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace("\\", "/")
# Sets whose items have `prerequisites` (technology ids): unlock type per set
UNLOCK_SETS = {"buildings": "building", "districts": "district", "edicts": "edict", "deposits": "deposit"}
# Game sets linked to simulator ids (T3007): the set name is also the data-version.js collection
SIM_SETS = ("buildings", "districts", "jobs")
FLAGS = ("start", "rare", "dangerous", "insight", "repeatable", "event")


def kind(flags):
    """One kind per technology (the node colour); the other flags stay in `flags`."""
    for flag, name in (("repeatable", "repeatable"), ("start", "starter"), ("event", "event"), ("dangerous", "dangerous"), ("rare", "rare")):
        if flags.get(flag):
            return name
    return "normal"


def statements(text):
    """Top-level statements of a condition kept as text, each one as a one-line Paradox text."""
    if not text:
        return []
    block = Parser().parse(text)
    return [to_text(Block([entry]), inline=True) for entry in block]


def requirements(text):
    """Non-technology conditions of `potential`: [{text, not}]; `NOT = { x }` gives {text: x, not: true}."""
    out = []
    if not text:
        return out
    for k, op, v in Parser().parse(text):
        if k == "NOT" and isinstance(v, Block):
            out.append({"text": to_text(v, inline=True), "not": True})
        else:
            out.append({"text": to_text(Block([(k, op, v)]), inline=True), "not": False})
    return out


def effects(modifier):
    """Modifier block as `key = value` lines (game keys; the rest of the block as text)."""
    if not modifier:
        return []
    out = [f"{k} = {v}" for k, v in modifier.items() if k != "_text"]
    return out + statements(modifier.get("_text"))


def plain_name(text):
    """Name without £icon£ markers and §X colour codes."""
    return re.sub(r"§.|£[^£]*£", "", text or "").strip() or None


def sim_links(sets, sim):
    """{set: {game id: simulator id}} for SIM_SETS, with the matcher of the difference report.
    Job swaps of the game are items of their own there, so a swap id maps to its simulator job."""
    if not sim:
        return {}
    sims = rd.sim_items(sim)
    links = {}
    for set_name in SIM_SETS:
        data = sets.get(set_name)
        if not data:
            continue
        pairs, _ = rd.match(set_name, sims[set_name], rd.game_items(set_name, data, sets))
        links[set_name] = {}
        for s, g, _how in pairs:
            if g is not None:
                links[set_name].setdefault(g["id"], s.id)
    return links


def unlock_jobs(item, links):
    """Jobs an unlocked building or district gives (always or under a condition): [{id, sim?}]."""
    ids = list((item.get("jobs") or {}).keys())
    for c in item.get("jobs_conditional") or []:
        ids += [j for j in (c.get("jobs") or {}) if j not in ids]
    out = []
    for jid in ids:
        entry = {"id": jid}
        if jid in links.get("jobs", {}):
            entry["sim"] = links["jobs"][jid]
        out.append(entry)
    return out


def unlocks_by_tech(sets, links=None):
    """{tech id: [{type, id, name, sim?, jobs?}]} from the items of UNLOCK_SETS that name it as
    prerequisite; `sim` = {collection, id} of data-version.js when the simulator has the item."""
    links = links or {}
    out = {}
    for set_name, unlock_type in UNLOCK_SETS.items():
        for item in (sets.get(set_name) or {}).get("items", []):
            for tech in item.get("prerequisites") or []:
                entry = {"type": unlock_type, "id": item["id"], "name": plain_name(item.get("name"))}
                if item["id"] in links.get(set_name, {}):
                    entry["sim"] = {"collection": set_name, "id": links[set_name][item["id"]]}
                if set_name in ("buildings", "districts"):
                    jobs = unlock_jobs(item, links)
                    if jobs:
                        entry["jobs"] = jobs
                out.setdefault(tech, []).append(entry)
    return out


def tech_record(t, unlocks):
    flags = t["flags"]
    record = {
        "id": t["id"],
        "name": t["name"],
        "area": t["area"],
        "field": t["category"][0] if t["category"] else None,
        "tier": t["tier"],
        "baseCost": t["cost"],
        "kind": kind(flags),
        "flags": [f for f in FLAGS if flags.get(f)],
        "prerequisites": t["prerequisites"],
        "requirements": requirements(t.get("potential")),
        "unlocks": unlocks.get(t["id"], []),
        "effects": effects(t.get("modifier")),
        "drawWeight": {"base": t.get("weight"), "modifiers": statements(t.get("weight_modifier"))},
        "dlc": t.get("dlc") or [],
        "icon": (t.get("icon") or {}).get("asset") or f"technologies/{t['id']}.png",
        "description": t.get("desc"),
        "variants": [{"id": s["id"], "name": s.get("name"), "condition": " ".join(statements(s.get("trigger")))} for s in t.get("swaps") or []],
    }
    if flags.get("repeatable"):
        levels = t.get("levels")
        record["repeatable"] = {"costPerLevel": t.get("cost_per_level"), "levels": None if levels in (None, -1) else levels}
    return record


def build(sets, sim=None):
    """The data file content (a dict) from the loaded sets {name: json} and the simulator dump."""
    techs = sets["technologies"]
    unlocks = unlocks_by_tech(sets, sim_links(sets, sim))
    records = [tech_record(t, unlocks) for t in techs["items"]]
    areas = ["physics", "society", "engineering"]
    field_area = {}
    for r in records:
        field_area.setdefault(r["field"], r["area"])
    fields = [{"id": c["id"], "area": field_area.get(c["id"]), "name": c.get("name"), "icon": (c.get("icon") or {}).get("asset")}
              for c in techs.get("categories", []) if c["id"] in field_area]
    fields.sort(key=lambda f: areas.index(f["area"]))
    return {
        "rulesetId": techs["rulesetId"],
        "gameVersion": techs.get("gameVersion"),
        "source": "game files: " + ", ".join(techs.get("sources", [])),
        "areas": areas,
        "fields": fields,
        "tiers": [{"tier": t["tier"], "previouslyUnlocked": t.get("previously_unlocked")} for t in techs.get("tiers", [])],
        "technologies": records,
    }


def to_module(data):
    """ES module text: one technology per line (the file is generated, diffs stay readable)."""
    head = {k: v for k, v in data.items() if k != "technologies"}
    lines = ",\n".join("    " + json.dumps(t, ensure_ascii=False, separators=(",", ":")) for t in data["technologies"])
    head_json = json.dumps(head, ensure_ascii=False, indent=2)[:-2]
    return ("// Generated by tools/extract/build_tech_data.py from data/generated/%s/ (T3005). Do not edit by hand.\n"
            "export const TECH_DATA = %s,\n  \"technologies\": [\n%s\n  ]\n};\n") % (data["rulesetId"], head_json, lines)


def newest_data_dir():
    base = os.path.join(ROOT, "data", "generated")
    dirs = sorted(d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d)))
    return os.path.join(base, dirs[-1])


def load_sets(data_dir):
    sets = {}
    for name in ["technologies", *UNLOCK_SETS, "jobs"]:
        path = os.path.join(data_dir, name + ".json")
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                sets[name] = json.load(f)
    return sets


PROCEDURE = """Adding a new game version without losing the previous ones (TECH_TREE_GDD.md section 5, T3302):
  1. python tools/extract/extract_all.py [--game DIR] [--icons]
     Writes data/generated/<new rulesetId>/ next to the existing folders (one folder per version).
  2. Run the validations of the extractor on the new folder (tools/extract/report_differences.py).
  3. python tools/extract/build_tech_data.py --data data/generated/<new rulesetId>
     Writes js/tech-data/<new rulesetId>.js. The file name comes from the rulesetId, so the data
     files of the previous versions are never touched. Never pass --out pointing at an old file.
  4. In js/tech-versions.js add one entry for the new file (id = rulesetId, label, file,
     verification "unverified") and move `isCurrent` to it; keep the old entries.
  5. Upload the new icons to StellarisAssets (commit there, the owner pushes) and regenerate
     StellarisAssetsFileTree.txt; register the version in js/data-version.js.
  6. Run BLOCK_REMOTE=1 python tests/policies-smoke.py and update README.md if the structure changed."""


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0], epilog=PROCEDURE,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", help="data/generated/<rulesetId>/ folder (default: the newest)")
    ap.add_argument("--out", help="output file (default: js/tech-data/<rulesetId>.js)")
    ap.add_argument("--simulator", help="dump of tools/extract/dump_simulator_data.mjs (default: made now)")
    args = ap.parse_args()
    data = build(load_sets(args.data or newest_data_dir()), rd.load_simulator(args.simulator))
    out = args.out or os.path.join(ROOT, "js", "tech-data", data["rulesetId"] + ".js")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(to_module(data))
    print(f"{out}: {len(data['technologies'])} technologies")
    print(f"Next: register {data['rulesetId']} in js/tech-versions.js (see --help).")


if __name__ == "__main__":
    main()
