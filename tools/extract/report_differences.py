"""Difference report between the generated data and the current simulator data (T2522):

python tools/extract/report_differences.py [--data DIR] [--out DIR] [--simulator FILE]

--data is a data/generated/<rulesetId>/ folder (default: the newest one), --out the report folder
(default: reports/<rulesetId>/), --simulator a dump of tools/extract/dump_simulator_data.mjs
(default: the dump is made now with node). Writes one <set>.md per data set, README.md with the
summary table and summary.json. Only reads: neither the simulator nor the generated data change.

Every simulator item is matched to a game item by id (the simulator id in snake_case, with the
set's game prefix), then by English name, then by icon. For a matched pair the report lists the
values that differ (outputs, costs, upkeep, jobs, housing...), the name and the icon; then the
simulator items with no game item and the game items the simulator does not have.
"""
import argparse, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace("\\", "/")

# Game id prefixes tried when matching a simulator id (in snake_case) to a game id.
PREFIXES = {
    "technologies": ["tech_"], "jobs": [""], "buildings": ["building_", ""], "districts": ["district_", ""],
    "designations": ["col_"], "civics": ["civic_"], "origins": ["origin_"], "authorities": ["auth_"],
    "ethics": ["ethic_"], "planet_classes": ["pc_"], "planet_modifiers": ["pm_", ""], "deposits": ["d_"],
    "edicts": ["", "edict_"], "policies": [""],
}
# Data sets the simulator has no data for (listed in the summary only).
NO_SIMULATOR_DATA = {
    "zones": "the simulator models district specializations inside its districts and body types, not as a data set",
    "zone_slots": "not modelled",
    "static_modifiers": "not modelled (only the planet modifiers, which have their own report)",
    "economic_categories": "not modelled (the simulator applies modifiers by job and resource)",
    "dlc": "the simulator has no DLC data yet (T3502)",
    "living_standards": "audited in PLANET_SIM_GDD.md §5.3; the simulator data comes with P20",
}


# ---------- helpers ----------

def snake(name):
    """capacitySubsidies → capacity_subsidies; quarry_depot stays."""
    return re.sub(r"(?<=[a-z0-9])([A-Z])", r"_\1", name).lower()


def norm_name(text):
    """Name compared without £icon£ markers, §X colour codes, case and punctuation."""
    if not text:
        return ""
    text = re.sub(r"£[^£]*£", "", text)
    text = re.sub(r"§.|§!", "", text)
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def asset_of(item):
    icon = item.get("icon")
    return icon.get("asset") if isinstance(icon, dict) else None


def num(v):
    return int(v) if isinstance(v, float) and v.is_integer() else v


def clean(d):
    """A resource or job dict without zero values, numbers made tidy."""
    return {k: num(v) for k, v in (d or {}).items() if isinstance(v, (int, float)) and v != 0}


def fmt(v):
    if isinstance(v, dict):
        return "{" + ", ".join(f"{k}: {fmt(x)}" for k, x in sorted(v.items())) + "}" if v else "{}"
    if v is None:
        return "—"
    return str(v)


def dict_diff(field, sim, game, conditional=None):
    """Differences of two flat dicts, one line per key: (field.key, simulator, game).
    `conditional` ({key: [values]}) holds the game values that only apply under a condition: a
    simulator value equal to one of them is not a difference, and they are shown next to the game value."""
    conditional = conditional or {}
    out = []
    for k in sorted(set(sim) | set(game)):
        if sim.get(k) == game.get(k) or (k in sim and k not in game and sim[k] in conditional.get(k, [])):
            continue
        gv = game.get(k)
        if conditional.get(k):
            gv = f"{fmt(gv)} (conditional: {', '.join(fmt(v) for v in conditional[k])})"
        out.append((f"{field}.{k}", sim.get(k), gv))
    return out


# Game resource names → the simulator's.
RESOURCE_ALIASES = {"physics_research": "physics", "society_research": "society", "engineering_research": "engineering", "sr_dark_matter": "dark_matter"}
# Job amenities are a planet modifier counted per pop (×100 the simulator's per-job value).
AMENITIES_SCALE = 100


def resources_dict(d):
    return clean({RESOURCE_ALIASES.get(k, k): v for k, v in (d or {}).items()})


def conditional_values(resources, kind, sign=1):
    """{resource: [values]} of the `resources` entries of a kind (produces, upkeep, cost) that have a trigger."""
    out = {}
    entries = resources.get(kind) or [] if isinstance(resources, dict) else []
    for entry in entries:
        if isinstance(entry, dict) and entry.get("trigger"):
            mult = entry.get("mult") if isinstance(entry.get("mult"), (int, float)) else 1
            for k, v in resources_dict({k: v for k, v in entry.items() if k not in ("trigger", "multiplier", "mult")}).items():
                v = num(round(sign * v * mult, 6))
                out.setdefault(k, [])
                if v not in out[k]:
                    out[k].append(v)
    return out


# ---------- simulator side ----------

class SimItem:
    def __init__(self, sim_id, source, name=None, img=None, values=None):
        self.id, self.source, self.name, self.img = sim_id, source, name, img
        self.values = values or {}  # field → comparable value (dict or number)


def sim_items(sim):
    """Simulator items per data set: {set: [SimItem]}."""
    m, en = sim["modules"], sim["en"]
    name = lambda key: en.get(key) if key else None
    out = {s: [] for s in PREFIXES}

    def add(set_name, sim_id, source, entry, values=None):
        key = entry.get("i18nKey")
        if not key and set_name == "jobs":  # job swaps and special body jobs: jobScienceDirector
            key = "job" + "".join(w.capitalize() for w in sim_id.split("_"))
        item = SimItem(sim_id, source, name(key), entry.get("img"), values)
        item.key = key  # the i18n key of the name (T1502 maps it to the official strings)
        out[set_name].append(item)

    # jobs: the planet jobs, the special body jobs and the job swaps; outputs net of upkeep
    pd = m["planet-data.js"]
    for jid, job in pd["JOBS"].items():
        add("jobs", jid, "planet-data.js JOBS", job, {"outputs": clean(pd["JOB_OUTPUTS"].get(jid))})
    for jid, job in m["body-type-data.js"]["SPECIAL_BODY_JOBS"].items():
        add("jobs", jid, "body-type-data.js SPECIAL_BODY_JOBS", job, {"outputs": clean(job.get("outputs"))})
    for swap in m["job-swap-data.js"]["JOB_SWAPS"]:
        add("jobs", swap["id"], "job-swap-data.js JOB_SWAPS", swap, {"outputs": clean(swap.get("output"))})

    # buildings: catalogue, capitals, special capitals and branch offices (with their illegal variant)
    def building_values(b):
        v = {"jobs": clean(b.get("jobs")), "upkeep": {k: num(-x) for k, x in clean(b.get("upkeep")).items()}}
        cost = b.get("cost")
        if isinstance(cost, dict):
            v["cost"] = clean({i["resource"]: i["amount"] for i in cost.get("items", [])})
            if cost.get("time") is not None:
                v["buildtime"] = cost["time"]
        if b.get("housing") is not None:
            v["housing"] = b["housing"]
        return v
    for b in pd["BUILDINGS"]:
        add("buildings", b["id"], "planet-data.js BUILDINGS", b, building_values(b))
    for set_id, chain in pd["CAPITAL_SETS"].items():
        for b in chain:
            add("buildings", b["id"], f"planet-data.js CAPITAL_SETS.{set_id}", b, building_values(b))
    for set_id, chain in m["body-type-data.js"]["SPECIAL_CAPITAL_SETS"].items():
        for b in chain:
            add("buildings", b["id"], f"body-type-data.js SPECIAL_CAPITAL_SETS.{set_id}", b, building_values(b))
    for b in m["branch-office-data.js"]["BRANCH_OFFICE_BUILDINGS"]:
        add("buildings", b["id"], "branch-office-data.js BRANCH_OFFICE_BUILDINGS", b, building_values(b))
        if isinstance(b.get("illegal"), dict) and b["illegal"].get("id"):
            add("buildings", b["illegal"]["id"], "branch-office-data.js BRANCH_OFFICE_BUILDINGS (illegal)", b["illegal"], building_values(b["illegal"]))

    # districts
    def district_values(d):
        v = {"jobs": clean(d.get("jobs"))}
        if d.get("housing") is not None:
            v["housing"] = d["housing"]
        return v
    for did, d in pd["DISTRICTS"].items():
        add("districts", did, "planet-data.js DISTRICTS", d, district_values(d))
    for did, d in m["body-type-data.js"]["SPECIAL_DISTRICTS"].items():
        add("districts", did, "body-type-data.js SPECIAL_DISTRICTS", d, district_values(d))

    for d in m["designation-data.js"]["DESIGNATIONS"]:
        add("designations", d["id"], "designation-data.js DESIGNATIONS", d)
    for c in m["bingo-items.js"]["PRINCIPLE_BINGO"]:
        cid = c["i18nKey"][len("civic"):] if c["i18nKey"].startswith("civic") else c["i18nKey"]
        add("civics", cid[0].lower() + cid[1:], "bingo-items.js PRINCIPLE_BINGO", c)
    for o in m["bingo-items.js"]["ORIGIN_BINGO"]:
        oid = o["i18nKey"][len("origin"):] if o["i18nKey"].startswith("origin") else o["i18nKey"]
        add("origins", oid[0].lower() + oid[1:], "bingo-items.js ORIGIN_BINGO", o)

    ed = m["empire-data.js"]
    for a in ed["AUTHORITIES"]:
        add("authorities", a["id"], "empire-data.js AUTHORITIES", a)
    for eid, e in ed["ETHIC_OPTIONS"].items():
        add("ethics", eid, "empire-data.js ETHIC_OPTIONS", {**e, "img": ed["ETHIC_ICONS"].get(eid)}, {"cost": e.get("cost")})
    g = ed["GESTALT_CONSCIOUSNESS"]
    if g["id"] not in ed["ETHIC_OPTIONS"]:
        add("ethics", g["id"], "empire-data.js GESTALT_CONSCIOUSNESS", g, {"cost": g.get("cost")})

    for p in m["celestial-data.js"]["PLANET_TYPES"]:
        add("planet_classes", p["id"], "celestial-data.js PLANET_TYPES", p)
    for p in m["planet-modifier-data.js"]["PLANET_MODIFIERS"]:
        add("planet_modifiers", p["id"], "planet-modifier-data.js PLANET_MODIFIERS", p)
    pf = m["planetary-features-data.js"]
    for key in ("DEPOSIT_FEATURES", "STRATEGIC_DEPOSITS", "BLOCKERS"):
        for d in pf[key]:
            add("deposits", d["id"], f"planetary-features-data.js {key}", d)

    for e in m["edict-data.js"]["EDICTS"]:
        v = {"upkeep": clean(e.get("upkeep"))}
        if e.get("cost") is not None:
            v["cost"] = clean(e["cost"]) if isinstance(e["cost"], dict) else e["cost"]
        add("edicts", e["id"], "edict-data.js EDICTS", e, v)
    for group in sim["policyGroups"]:
        for o in group["options"]:
            add("policies", o["id"], f"policy-data.js POLICY_GROUPS.{group['id']}", o)

    # technologies: every technology the simulator data refers to (objects with a tech i18nKey)
    seen = set()
    def walk(v, where):
        if isinstance(v, dict):
            if isinstance(v.get("id"), str) and str(v.get("i18nKey", "")).startswith("tech") and v["id"] not in seen:
                seen.add(v["id"])
                add("technologies", v["id"], where, v)
            for x in v.values():
                walk(x, where)
        elif isinstance(v, list):
            for x in v:
                walk(x, where)
    for file, exports in m.items():
        walk(exports, file)
    return out


# ---------- game side ----------

def triggered_modifier_values(item, key):
    """Values of a planet modifier key in the item's triggered_planet_modifier blocks."""
    out = []
    for t in item.get("triggered_planet_modifier") or [] if isinstance(item.get("triggered_planet_modifier"), list) else []:
        v = (t.get("modifier") or {}).get(key) if isinstance(t, dict) else None
        if isinstance(v, (int, float)) and num(v) not in out:
            out.append(num(v))
    return out


def game_values(set_name, item):
    """The game values comparable with SimItem.values (only the fields the simulator has), and the
    values that only apply under a condition: ({field: value}, {field: {key: [values]}})."""
    res = item.get("resources")
    if set_name == "jobs":
        net = resources_dict(item.get("produces"))
        for k, v in resources_dict(item.get("upkeep")).items():
            net[k] = num(net.get(k, 0) - v)
        cond = conditional_values(res, "produces")
        for k, vs in conditional_values(res, "upkeep", -1).items():
            cond.setdefault(k, []).extend(v for v in vs if v not in cond.get(k, []))
        amenities = (item.get("planet_modifier") or {}).get("planet_amenities_add")
        if isinstance(amenities, (int, float)) and amenities:
            net["amenities"] = num(net.get("amenities", 0) + amenities / AMENITIES_SCALE)
        for v in triggered_modifier_values(item, "planet_amenities_add"):
            cond.setdefault("amenities", []).append(num(v / AMENITIES_SCALE))
        return {"outputs": clean(net)}, {"outputs": cond}
    if set_name in ("buildings", "districts"):
        jobs, jobs_cond = clean(item.get("jobs")), {}
        for c in item.get("jobs_conditional") or []:
            for k, v in clean(c.get("jobs")).items():
                jobs_cond.setdefault(k, []).append(v)
        v = {"jobs": jobs, "cost": resources_dict(item.get("cost")), "upkeep": resources_dict(item.get("upkeep"))}
        if item.get("base_buildtime") is not None:
            v["buildtime"] = num(item["base_buildtime"])
        housing = (item.get("planet_modifier") or {}).get("planet_housing_add")
        if housing is not None:
            v["housing"] = num(housing)
        return v, {"jobs": jobs_cond, "cost": conditional_values(res, "cost"), "upkeep": conditional_values(res, "upkeep")}
    if set_name == "ethics":
        return {"cost": item.get("cost")}, {}
    if set_name == "edicts":
        return {"cost": resources_dict(item.get("cost")), "upkeep": resources_dict(item.get("upkeep"))}, {"cost": conditional_values(res, "cost"), "upkeep": conditional_values(res, "upkeep")}
    return {}, {}


def game_items(set_name, data, sets):
    """Game items of a set, with the job swaps and authority variants as items of their own.
    The simulator's planet modifiers include static modifiers (origins, events, deposits), so that
    set is matched against the static modifiers too."""
    if set_name == "policies":  # the simulator models the options, not the policies
        return [{**o, "policy": it["id"]} for it in data["items"] for o in it.get("options") or []]
    items = []
    for it in data["items"]:
        items.append(it)
        if set_name in ("jobs", "authorities"):
            for s in it.get("swaps") or []:
                items.append({**s, "swap_of": it["id"]})
    if set_name == "planet_modifiers" and "static_modifiers" in sets:
        taken = {it.get("static_modifier") for it in items}
        items += [{**s, "static": True} for s in sets["static_modifiers"]["items"] if s["id"] not in taken and s.get("name")]
    return items


# ---------- matching and report ----------

def match(set_name, sims, games):
    """[(SimItem, game item or None, how)] and the unmatched game items."""
    by_id = {g["id"]: g for g in games}
    by_name, by_icon = {}, {}
    for g in games:
        by_name.setdefault(norm_name(g.get("name")), []).append(g)
        if asset_of(g):
            by_icon.setdefault(asset_of(g).lower(), []).append(g)
    used, pairs = set(), []

    def free(cands):
        cands = [g for g in cands if id(g) not in used]
        return cands[0] if len(cands) == 1 else None

    pending = []
    for s in sims:  # pass 1: id
        g = next((by_id[p + snake(s.id)] for p in PREFIXES.get(set_name, [""]) if p + snake(s.id) in by_id and id(by_id[p + snake(s.id)]) not in used), None)
        if g:
            used.add(id(g))
            pairs.append((s, g, "id"))
        else:
            pending.append(s)
    rest = []
    for s in pending:  # pass 2: English name
        g = free(by_name.get(norm_name(s.name), [])) if s.name else None
        if g:
            used.add(id(g))
            pairs.append((s, g, "name"))
        else:
            rest.append(s)
    for s in rest:  # pass 3: icon, only for items without an English name (icons are shared)
        g = free(by_icon.get(s.img.lower(), [])) if s.img and not s.name else None
        if g:
            used.add(id(g))
        pairs.append((s, g, "icon" if g else None))
    order = {id(s): i for i, s in enumerate(sims)}
    pairs.sort(key=lambda p: order[id(p[0])])
    return pairs, [g for g in games if id(g) not in used]


def compare(set_name, s, g):
    """Differences of a matched pair: [(field, simulator, game)]."""
    diffs = []
    gv, cond = game_values(set_name, g)
    if g.get("swap_of"):  # the game swaps carry no outputs of their own
        gv = {}
    for field, sv in s.values.items():
        if field not in gv:
            continue
        if isinstance(sv, dict) or isinstance(gv[field], dict):
            field_diffs = dict_diff(field, sv or {}, gv[field] or {}, cond.get(field))
            if field_diffs and field == "jobs" and g.get("jobs_conditional"):
                by_condition = "; ".join(fmt(c.get("jobs")) for c in g["jobs_conditional"])
                field_diffs.append(("jobs (game, by condition)", None, by_condition))
            diffs += field_diffs
        elif sv != gv[field]:
            diffs.append((field, sv, gv[field]))
    # a name that contains the other ("Continental" / "Continental World") is not a difference
    sn, gn = norm_name(s.name), norm_name(g.get("name"))
    if sn and gn and sn not in gn and gn not in sn:
        diffs.append(("name", s.name, g["name"]))
    # icons are compared only within the same folder (the simulator uses other art for some sets,
    # e.g. the origin pictures of origins/ instead of the small icons of origin_icons/)
    game_icon = asset_of(g)
    if s.img and game_icon and s.img.split("/")[0].lower() == game_icon.split("/")[0].lower() and s.img.lower() != game_icon.lower():
        diffs.append(("icon", s.img, game_icon))
    return diffs


def game_label(g):
    extra = f" (swap of `{g['swap_of']}`)" if g.get("swap_of") else f" (policy `{g['policy']}`)" if g.get("policy") else " (static modifier)" if g.get("static") else ""
    return f"`{g['id']}` {g.get('name') or ''}{extra}".strip()


def cell(v):
    return fmt(v).replace("|", "\\|").replace("\n", " ")


def set_report(set_name, ruleset, sims, data, sets):
    games = game_items(set_name, data, sets)
    pairs, game_only = match(set_name, sims, games)
    game_only = [g for g in game_only if not g.get("static")]
    statics = sum(1 for g in games if g.get("static"))
    games = [g for g in games if not g.get("static")]
    matched = [(s, g, how, compare(set_name, s, g)) for s, g, how in pairs if g]
    sim_only = [s for s, g, _ in pairs if not g]
    differing = [m for m in matched if m[3]]
    lines = [f"# {set_name} — simulator vs {ruleset}", "",
             f"Generated by `tools/extract/report_differences.py` from `data/generated/{ruleset}/{set_name}.json` and the simulator data. The simulator is not changed (T2523 switches it, after review).", "",
             f"- Simulator items: {len(sims)}; game items: {len(games)}",
             f"- Matched: {len(matched)} (by id {sum(1 for m in matched if m[2] == 'id')}, by name {sum(1 for m in matched if m[2] == 'name')}, by icon {sum(1 for m in matched if m[2] == 'icon')}); with differences: {len(differing)}",
             f"- Only in the simulator: {len(sim_only)}; only in the game: {len(game_only)}"]
    if statics:
        lines.append(f"- The simulator items were also matched against the {statics} named static modifiers (`static_modifiers.json`); the ones not matched are not listed")
    lines.append("")
    lines += ["## Differences", ""]
    if differing:
        lines += ["| Simulator | Game | Field | Simulator value | Game value |", "|---|---|---|---|---|"]
        for s, g, how, diffs in differing:
            for field, sv, gv in diffs:
                lines.append(f"| `{s.id}` | `{g['id']}` ({how}) | {field} | {cell(sv)} | {cell(gv)} |")
    else:
        lines.append("None.")
    lines += ["", "## Only in the simulator", ""]
    lines += [f"- `{s.id}` {s.name or ''} — {s.source}" for s in sim_only] or ["None."]
    lines += ["", "## Only in the game", ""]
    lines += [f"- {game_label(g)}" for g in game_only] or ["None."]
    lines += ["", "## Matched without differences", ""]
    same = [f"`{s.id}` = `{g['id']}`" for s, g, how, diffs in matched if not diffs]
    lines.append(", ".join(same) if same else "None.")
    summary = {"simulator": len(sims), "game": len(games), "matched": len(matched), "differing": len(differing),
               "differences": sum(len(m[3]) for m in matched), "simulator_only": len(sim_only), "game_only": len(game_only)}
    return "\n".join(lines) + "\n", summary


def newest_data_dir():
    base = f"{ROOT}/data/generated"
    dirs = sorted(d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d)))
    if not dirs:
        raise SystemExit(f"no generated data in {base}: run tools/extract/extract_all.py first")
    return f"{base}/{dirs[-1]}"


def load_simulator(path=None):
    if path:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    out = subprocess.run(["node", f"{ROOT}/tools/extract/dump_simulator_data.mjs"], capture_output=True, check=True)
    return json.loads(out.stdout.decode("utf-8"))


def report(data_dir, out_dir, sim):
    """Writes the reports; returns {set: summary}."""
    sims = sim_items(sim)
    summaries, ruleset, sets = {}, None, {}
    os.makedirs(out_dir, exist_ok=True)
    for file in sorted(os.listdir(data_dir)):
        if file.endswith(".json") and file != "manifest.json":
            with open(os.path.join(data_dir, file), encoding="utf-8") as f:
                data = json.load(f)
            sets[data["set"]] = data
    for set_name, data in sets.items():
        ruleset = data["rulesetId"]
        if set_name not in PREFIXES:
            summaries[set_name] = {"game": data["count"], "note": NO_SIMULATOR_DATA.get(set_name, "no simulator data")}
            continue
        text, summaries[set_name] = set_report(set_name, ruleset, sims[set_name], data, sets)
        with open(os.path.join(out_dir, set_name + ".md"), "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
    lines = [f"# Difference report — simulator data vs {ruleset}", "",
             "Generated by `python tools/extract/report_differences.py` (T2522). One file per data set; the simulator is not changed: the owner reviews these reports before T2523 switches the simulator to the generated data.", "",
             "Matching: simulator id in snake_case with the set's game prefix, then English name, then icon. Compared values: job outputs (produces minus upkeep), building and district jobs, cost, build time, upkeep and housing, ethic cost, edict cost and upkeep; and the name and icon of every matched item.", "",
             "Game values that only apply under a condition (nomadic costs, gestalt jobs, triggered outputs) are shown as `(conditional: ...)`; a simulator value equal to one of them is not a difference. Research outputs use the simulator names (`physics_research` → `physics`); job amenities are divided by 100 (the game counts them per pop); the game job swaps have no outputs, so only their name and icon are compared; names that contain each other (\"Continental\" / \"Continental World\") are not a difference; icons are only compared within the same folder.", "",
             "| Data set | Simulator | Game | Matched | With differences | Only simulator | Only game |", "|---|---|---|---|---|---|---|"]
    for name, s in sorted(summaries.items()):
        if "note" in s:
            lines.append(f"| {name} | — | {s['game']} | — | — | — | {s['note']} |")
        else:
            lines.append(f"| [{name}]({name}.md) | {s['simulator']} | {s['game']} | {s['matched']} | {s['differing']} | {s['simulator_only']} | {s['game_only']} |")
    with open(os.path.join(out_dir, "README.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    with open(os.path.join(out_dir, "summary.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump({"rulesetId": ruleset, "sets": summaries}, f, indent=2)
        f.write("\n")
    return summaries


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Difference report between the generated data and the simulator data")
    p.add_argument("--data", help="data/generated/<rulesetId> folder (default: the newest)")
    p.add_argument("--out", help="report folder (default: reports/<rulesetId>)")
    p.add_argument("--simulator", help="JSON dump of tools/extract/dump_simulator_data.mjs (default: made now with node)")
    args = p.parse_args()
    data_dir = args.data or newest_data_dir()
    out_dir = args.out or f"{ROOT}/reports/{os.path.basename(data_dir.rstrip('/'))}"
    summaries = report(data_dir, out_dir, load_simulator(args.simulator))
    for name, s in sorted(summaries.items()):
        print(f"{name}: " + (s["note"] if "note" in s else f"{s['matched']}/{s['simulator']} matched, {s['differing']} with differences, {s['simulator_only']} only in the simulator, {s['game_only']} only in the game"))
    print(f"written to {out_dir}")


if __name__ == "__main__":
    main()
