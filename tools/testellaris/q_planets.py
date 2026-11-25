"""Templates of planets and colonies (T4105): climates, planetary features and blockers, planet
modifiers, colony designations, districts, district specializations and capital buildings."""
import re

import generate_questions as gq
from pdx.parser import Block, parse

CAPS = {
    "world_climate": 10, "feature_blocker": 20, "feature_district": 25, "feature_district_amount": 20,
    "feature_world": 20, "blocker_time": 15, "blocker_districts": 15, "modifier_world": 20,
    "designation_job": 20, "designation_bonus": 15, "designation_world": 20,
    "district_job": 20, "zone_job": 25, "capital_job": 15, "capital_job_count": 20, "capital_housing": 15,
}
# The planet classes an empire can be born on, by climate (the "climate" field)
CLIMATE_WORLDS = ("pc_desert", "pc_arid", "pc_savannah", "pc_tropical", "pc_continental", "pc_ocean",
                  "pc_tundra", "pc_arctic", "pc_alpine")
DISTRICTS = {"district_generator_max_add": "district_generator", "district_mining_max_add": "district_mining",
             "district_farming_max_add": "district_farming"}
# `<prefix>_jobs_bonus_workforce_mult` of the colony designations → the job it names
DESIGNATION_JOBS = {"miner": "miner", "farmer": "farmer", "technician": "technician", "artisan": "artisan",
                    "foundry": "foundry", "bureaucrat": "bureaucrat", "trader": "trader", "soldier": "soldier"}
# District sets a designation can be exclusive to → the planet class that uses it
DISTRICT_SETS = {"habitat": "pc_habitat", "ring_world": "pc_ringworld_habitable", "city_world": "pc_city",
                 "hive_world": "pc_hive", "machine_world": "pc_machine"}
CAPITAL_FILE = "common/buildings/00_capital_buildings.txt"


def _sentence(es, en, jp):
    return {"es": es, "en": en, "jp": jp}


# Conditions that only tell the ordinary empires apart (regular or gestalt, kind of planet): the
# value they must have to count as ordinary, None = either
ORDINARY = {"exists": None, "is_regular_empire": None, "is_gestalt": None, "is_hive_empire": None,
            "is_machine_empire": None, "country_uses_consumer_goods": None, "planet_is_habitat_equivalent": None,
            "planet_is_ecu_equivalent": None, "planet_is_ring_world_equivalent": None,
            "is_fallen_empire_spiritualist": False, "is_wilderness_empire": False, "is_nomadic": False}


def ordinary(text):
    """True if a job condition asks for nothing special (no civic, tradition, origin or event)."""
    def walk(block):
        for k, _, v in block.entries:
            if k == "NOT":
                continue  # leaving a special case out keeps the ordinary one
            if k == "owner" and isinstance(v, Block):
                if not walk(v):
                    return False
            elif k not in ORDINARY or (ORDINARY[k] is not None and v is not ORDINARY[k]):
                return False
        return True
    try:
        return walk(parse(text or ""))
    except Exception:  # noqa: BLE001 — an unreadable condition is not an ordinary one
        return False


def item_jobs(item):
    """(jobs the item gives to an ordinary empire, every job it can give) as ids."""
    plain = list(item.get("jobs") or {})
    every = list(plain)
    for c in item.get("jobs_conditional") or []:
        jobs = list(c.get("jobs") or {})
        every += [j for j in jobs if j not in every]
        if ordinary(c.get("potential")):
            plain += [j for j in jobs if j not in plain]
    return plain, every


class Planets:
    def __init__(self, b):
        self.b, self.d = b, b.d
        self.jobs = b.d.by_id("jobs")

    def add(self, template, key, tier, item, dlc, text, correct, wrong, why):
        self.b.add("planets", template, key, tier, item, dlc, text, correct, wrong, why, gq._icon(item))

    def pick(self, template, key, correct, candidates, closeness=lambda k: 0, pool=40):
        rng = self.b.rng("planets", template, key)
        got = gq.pick(rng, correct, candidates, closeness, pool=pool)
        return [w[1] for w in got] if got else None

    def named(self, set_name, fields=("potential",)):
        """{id: (item, official names, DLC)} of the items of a set that can be asked."""
        out = {}
        for x in self.d.items(set_name):
            names = self.d.name(set_name, x["id"])
            reliable, dlc = gq.condition_check(x, fields)
            if names and reliable:
                out[x["id"]] = (x, names, dlc)
        return out

    # -- planet classes and features

    def climates(self):
        worlds = {k: v for k, v in self.named("planet_classes").items() if k in CLIMATE_WORLDS}
        for key, (x, names, dlc) in worlds.items():
            same = sorted(k for k, v in worlds.items() if k != key and v[0]["climate"] == x["climate"])
            other = [(k, v[1]) for k, v in worlds.items() if v[0]["climate"] != x["climate"]]
            if not same:
                continue
            oid = self.b.rng("planets", "world_climate", key).choice(same)
            o = worlds[oid][1]
            wrong = self.pick("world_climate", key, o, other)
            if wrong:
                self.add("world_climate", key, 1, x, dlc,
                         _sentence(f"¿Qué tipo de planeta comparte clima con {names['es']}?",
                                   f"Which planet class shares its climate with {names['en']}?",
                                   f"「{names['jp']}」と同じ気候の惑星タイプはどれ？"),
                         o, wrong,
                         _sentence(f"{names['es']} y {o['es']} tienen el mismo clima.", f"{names['en']} and {o['en']} have the same climate.",
                                   f"「{names['jp']}」と「{o['jp']}」は同じ気候です。"))

    def features(self):
        feats = {k: v for k, v in self.named("deposits").items()
                 if str(v[0].get("category") or "").startswith("deposit_cat") and not v[0].get("orbital")}
        blockers = {k: v for k, v in feats.items() if v[0].get("blocker")}
        plain = {k: v for k, v in feats.items() if not v[0].get("blocker")}
        for key, (x, names, dlc) in blockers.items():
            wrong = self.pick("feature_blocker", key, names, [(k, v[1]) for k, v in plain.items()],
                              lambda k: bool(plain[k][2]) != bool(dlc), pool=80)
            if wrong:
                self.add("feature_blocker", key, 1 if not dlc else 2, x, dlc,
                         _sentence("¿Cuál de estos rasgos planetarios es un obstáculo?", "Which of these planetary features is a blocker?",
                                   "次の惑星の特徴のうち障害物はどれ？"),
                         names, wrong,
                         _sentence(f"{names['es']} es un obstáculo.", f"{names['en']} is a blocker.", f"「{names['jp']}」は障害物です。"))
            if isinstance(x.get("time"), int) and x["time"] > 0:
                t = x["time"]
                values = [v for v in (60, 90, 120, 180, 270, 360, 450, 540, 720, 900) if v != t]
                near = sorted(values, key=lambda v: (abs(v - t), v))[:5]
                wrong = self.b.rng("planets", "blocker_time", key).sample(near, 3)
                self.add("blocker_time", key, 4, x, dlc,
                         _sentence(f"¿Cuántos días base se tarda en despejar el obstáculo {names['es']}?",
                                   f"How many days does it take, as a base, to clear the blocker {names['en']}?",
                                   f"障害物「{names['jp']}」の除去にかかる基本日数は？"),
                         gq.same(str(t)), [gq.same(str(v)) for v in wrong],
                         _sentence(f"Despejar {names['es']} lleva {t} días antes de modificadores.",
                                   f"Clearing {names['en']} takes {t} days before modifiers.",
                                   f"「{names['jp']}」の除去は補正前で{t}日です。"))
            lost = (x.get("planet_modifier") or {}).get("planet_max_districts_add")
            if isinstance(lost, int) and lost < 0:
                n = -lost
                wrong = [v for v in (1, 2, 3, 4, 5, 6) if v != n]
                wrong = self.b.rng("planets", "blocker_districts", key).sample(sorted(wrong, key=lambda v: (abs(v - n), v))[:4], 3)
                self.add("blocker_districts", key, 4, x, dlc,
                         _sentence(f"¿En cuánto reduce el obstáculo {names['es']} el máximo de distritos del planeta?",
                                   f"By how much does the blocker {names['en']} lower the planet's maximum number of districts?",
                                   f"障害物「{names['jp']}」は惑星の区域上限をいくつ減らす？"),
                         gq.same(str(n)), [gq.same(str(v)) for v in wrong],
                         _sentence(f"{names['es']} resta {n} al máximo de distritos.", f"{names['en']} takes {n} off the maximum of districts.",
                                   f"「{names['jp']}」は区域上限を{n}減らします。"))
        self.feature_districts(plain)
        self.feature_worlds(plain)

    def feature_districts(self, plain):
        for key, (x, names, dlc) in plain.items():
            mods = x.get("planet_modifier") or {}
            raised = [k for k in DISTRICTS if isinstance(mods.get(k), int) and mods[k] > 0]
            if len(raised) != 1:
                continue
            mod, n = raised[0], mods[raised[0]]
            district = self.d.label("districts", DISTRICTS[mod])
            cands = [(k, v[1]) for k, v in plain.items() if not (v[0].get("planet_modifier") or {}).get(mod)
                     and not v[0].get("triggered_planet_modifier")]
            wrong = self.pick("feature_district", key, names, cands,
                              lambda k: not set(plain[k][0].get("planet_modifier") or {}) & set(DISTRICTS), pool=30)
            if wrong:
                self.add("feature_district", key, max(2, 3 if dlc else 2), x, dlc,
                         _sentence(f"¿Cuál de estos rasgos planetarios sube el máximo de «{district['es']}»?",
                                   f"Which of these planetary features raises the maximum of {district['en']}?",
                                   f"「{district['jp']}」の上限を増やす惑星の特徴はどれ？"),
                         names, wrong,
                         _sentence(f"{names['es']} da +{n} al máximo de «{district['es']}».",
                                   f"{names['en']} gives +{n} to the maximum of {district['en']}.",
                                   f"「{names['jp']}」は「{district['jp']}」の上限を+{n}します。"))
            wrong = self.b.rng("planets", "feature_district_amount", key).sample([v for v in (1, 2, 3, 4, 5, 6) if v != n and v <= max(4, n + 1)], 3)
            self.add("feature_district_amount", key, 4, x, dlc,
                     _sentence(f"¿Cuánto sube {names['es']} el máximo de «{district['es']}»?",
                               f"By how much does {names['en']} raise the maximum of {district['en']}?",
                               f"「{names['jp']}」は「{district['jp']}」の上限をいくつ増やす？"),
                     gq.same(f"+{n}"), [gq.same(f"+{v}") for v in wrong],
                     _sentence(f"{names['es']} da +{n} al máximo de «{district['es']}».",
                               f"{names['en']} gives +{n} to the maximum of {district['en']}.",
                               f"「{names['jp']}」は「{district['jp']}」の上限を+{n}します。"))

    def feature_worlds(self, plain):
        """Features whose condition is a plain list of planet classes."""
        classes = self.named("planet_classes")
        ordinary = [k for k in CLIMATE_WORLDS if k in classes]
        for key, (x, names, dlc) in plain.items():
            allowed = planet_list(x.get("potential"))
            if not allowed or re.search(r"factor = 0\b", x.get("drop_weight") or ""):
                continue
            ok = [k for k in ordinary if k in allowed]
            no = [k for k in ordinary if k not in allowed]
            if not ok or len(no) < 3:
                continue
            cid = self.b.rng("planets", "feature_world", key).choice(ok)
            c = classes[cid][1]
            wrong = self.pick("feature_world", key, c, [(k, classes[k][1]) for k in no])
            if wrong and not gq.gives_away(c, names):
                listed = [classes[k][1] for k in sorted(allowed) if k in classes]
                self.add("feature_world", key, 3, x, dlc,
                         _sentence(f"¿En cuál de estos planetas puede aparecer el rasgo {names['es']}?",
                                   f"On which of these planets can the feature {names['en']} appear?",
                                   f"惑星の特徴「{names['jp']}」が現れるのはどの惑星？"),
                         c, wrong,
                         _sentence(f"{names['es']} puede aparecer en: {gq.lang_list(listed, 'es')}.",
                                   f"{names['en']} can appear on: {gq.lang_list(listed, 'en')}.",
                                   f"「{names['jp']}」が現れる惑星：{gq.lang_list(listed, 'jp')}。"))

    def modifiers(self):
        """Tier 5: the planet modifier that can spawn on a given kind of world."""
        mods = {}
        for x in self.d.items("planet_modifiers"):
            names = self.d.name("planet_modifiers", x["id"])
            if names:
                mods[x["id"]] = (x, names, spawn_classes(x.get("spawn_chance")))
        classes = self.named("planet_classes")
        for key, (x, names, spawn) in mods.items():
            listed = sorted(k for k in spawn or () if k in classes)
            if not listed:
                continue
            cid = self.b.rng("planets", "modifier_world", key).choice(listed)
            c = classes[cid][1]
            cands = [(k, v[1]) for k, v in mods.items() if v[2] and cid not in v[2]]
            wrong = self.pick("modifier_world", key, names, cands)
            if wrong and not gq.gives_away(c, names):
                self.add("modifier_world", key, 5, x, [],
                         _sentence(f"¿Cuál de estos modificadores planetarios puede generarse en un {c['es']}?",
                                   f"Which of these planet modifiers can spawn on a planet of the class {c['en']}?",
                                   f"「{c['jp']}」に発生しうる惑星補正はどれ？"),
                         names, wrong,
                         _sentence(f"{names['es']} puede generarse en {c['es']}; los otros tres no.",
                                   f"{names['en']} can spawn on the planet class {c['en']}; the other three cannot.",
                                   f"「{names['jp']}」は「{c['jp']}」に発生します。他の3つは発生しません。"))

    # -- colonies

    def designations(self):
        items = self.named("designations")
        bonus = {}
        for key, (x, names, dlc) in items.items():
            mods = x.get("planet_modifier") or {}
            bonus[key] = {j: mods[f"{p}_jobs_bonus_workforce_mult"] for p, j in DESIGNATION_JOBS.items()
                          if f"{p}_jobs_bonus_workforce_mult" in mods}

        def text_of(x):
            return " ".join(str(x.get(f) or "") for f in ("planet_modifier", "triggered_planet_modifier"))

        for key, (x, names, dlc) in items.items():
            for job, value in sorted(bonus[key].items()):
                jname = self.d.label("jobs", job)
                if not jname or gq.gives_away(jname, names):
                    continue
                prefix = next(p for p, j in DESIGNATION_JOBS.items() if j == job)
                cands = [(k, v[1]) for k, v in items.items() if prefix not in text_of(v[0])
                         and "worker" not in text_of(v[0]) and "planet_jobs" not in text_of(v[0]) and "pop_bonus" not in text_of(v[0])]
                qkey = f"{key}.{job}"
                wrong = self.pick("designation_job", qkey, names, cands, pool=60)
                if wrong:
                    self.add("designation_job", qkey, 3, x, dlc,
                             _sentence(f"¿Cuál de estas designaciones coloniales da más mano de obra a los empleos de {jname['es']}?",
                                       f"Which of these colony designations gives a workforce bonus to {jname['en']} jobs?",
                                       f"職業「{jname['jp']}」の労働力が増える惑星の指定はどれ？"),
                             names, wrong,
                             _sentence(f"{names['es']} da +{pct(value)} % de mano de obra a {jname['es']}.",
                                       f"{names['en']} gives +{pct(value)}% workforce to {jname['en']} jobs.",
                                       f"「{names['jp']}」は「{jname['jp']}」の労働力を+{pct(value)}%します。"))
            if len(set(bonus[key].values())) == 1:
                job, value = sorted(bonus[key].items())[0]
                jname = self.d.label("jobs", job)
                if not jname:
                    continue
                wrong = self.b.rng("planets", "designation_bonus", key).sample(
                    [v for v in (5, 10, 15, 20, 25, 30) if v != pct(value)], 3)
                self.add("designation_bonus", key, 4, x, dlc,
                         _sentence(f"¿Cuánta mano de obra extra da la designación {names['es']} a los empleos de {jname['es']}?",
                                   f"How much extra workforce does the designation {names['en']} give to {jname['en']} jobs?",
                                   f"指定「{names['jp']}」は職業「{jname['jp']}」の労働力をどれだけ増やす？"),
                         gq.same(f"+{pct(value)} %"), [gq.same(f"+{v} %") for v in wrong],
                         _sentence(f"{names['es']} da +{pct(value)} % de mano de obra a {jname['es']}.",
                                   f"{names['en']} gives +{pct(value)}% workforce to {jname['en']} jobs.",
                                   f"「{names['jp']}」は「{jname['jp']}」の労働力を+{pct(value)}%します。"))
        self.designation_worlds(items)

    def designation_worlds(self, items):
        sets = {k: required_district_set(v[0].get("potential")) for k, v in items.items()}
        for key, (x, names, dlc) in items.items():
            s = sets[key]
            if s not in DISTRICT_SETS:
                continue
            world = self.d.label("planet_classes", DISTRICT_SETS[s])
            if not world or gq.gives_away(world, names):
                continue
            cands = [(k, v[1]) for k, v in items.items() if sets[k] in DISTRICT_SETS and sets[k] != s]
            wrong = self.pick("designation_world", key, names, cands)
            if wrong:
                self.add("designation_world", key, 3, x, dlc,
                         _sentence(f"¿Cuál de estas designaciones es de un planeta de tipo {world['es']}?",
                                   f"Which of these designations belongs to a planet of the class {world['en']}?",
                                   f"惑星タイプ「{world['jp']}」用の指定はどれ？"),
                         names, wrong,
                         _sentence(f"{names['es']} solo existe en {world['es']}.", f"{names['en']} only exists on {world['en']}.",
                                   f"「{names['jp']}」は「{world['jp']}」専用です。"))

    # -- districts, specializations and capital buildings

    def job_pool(self, set_name):
        """{job id: names} of the jobs the items of a set can give."""
        out = {}
        for x in self.d.items(set_name):
            for j in item_jobs(x)[1]:
                if j in self.jobs and self.d.label("jobs", j):
                    out[j] = self.d.label("jobs", j)
        return out

    def gives_job(self, template, set_name, items, kind, min_tier):
        pool = self.job_pool(set_name)
        pool.update(self.job_pool("buildings"))
        for key, (x, names, dlc) in items.items():
            plain, every = item_jobs(x)
            every = [j for j in every if j in pool]
            plain = [j for j in plain if j in pool]
            if not plain:
                continue
            jid = plain[0]
            job = pool[jid]
            near = set(every)
            near |= set(re.findall(r"job_([a-z0-9_]+?)_add", str(x)))  # jobs added by modifiers
            for j in list(near & self.jobs.keys()):
                near |= {s["id"] for s in self.jobs[j].get("swaps") or []}
            taken = {pool[j]["en"] for j in near if j in pool}
            cands = [(j, n) for j, n in pool.items() if j not in near and n["en"] not in taken]
            wrong = self.pick(template, key, job, cands, lambda j: self.jobs[j].get("category") != self.jobs[jid].get("category"), pool=20)
            if wrong and not gq.gives_away(job, names):
                self.add(template, key, min_tier, x, dlc,
                         _sentence(f"¿Cuál de estos empleos puede ofrecer {kind[0]} {names['es']}?",
                                   f"Which of these jobs can {kind[1]} {names['en']} provide?",
                                   f"{kind[2]}「{names['jp']}」が提供しうる職業はどれ？"),
                         job, wrong,
                         _sentence(f"{names['es']} puede dar empleos de {job['es']}.", f"{names['en']} can provide {job['en']} jobs.",
                                   f"「{names['jp']}」は職業「{job['jp']}」を提供します。"))

    def capitals(self):
        capitals = {k: v for k, v in self.named("buildings", ("potential", "allow")).items()
                    if v[0].get("capital") and v[0]["file"] == CAPITAL_FILE}
        self.gives_job("capital_job", "buildings", capitals, ("el edificio capital", "the capital building", "首都施設"), 3)
        housing = sorted({(v[0].get("planet_modifier") or {}).get("planet_housing_add") for v in capitals.values()} - {None})
        for key, (x, names, dlc) in capitals.items():
            h = (x.get("planet_modifier") or {}).get("planet_housing_add")
            if h and len(housing) >= 4:
                near = sorted((v for v in housing if v != h), key=lambda v: (abs(v - h), v))[:5]
                wrong = self.b.rng("planets", "capital_housing", key).sample(near, 3)
                self.add("capital_housing", key, 4, x, dlc,
                         _sentence(f"¿Cuánta vivienda da el edificio capital {names['es']}?",
                                   f"How much housing does the capital building {names['en']} provide?",
                                   f"首都施設「{names['jp']}」が提供する住居はいくつ？"),
                         gq.same(str(h)), [gq.same(str(v)) for v in wrong],
                         _sentence(f"{names['es']} da {h} de vivienda.", f"{names['en']} provides {h} housing.",
                                   f"「{names['jp']}」は住居を{h}提供します。"))
            conditional = {j for c in x.get("jobs_conditional") or [] for j in c.get("jobs") or {}}
            for jid, n in sorted((x.get("jobs") or {}).items()):
                job = self.d.label("jobs", jid)
                # a job also given under a condition would change the number
                if not job or jid in conditional or not isinstance(n, int):
                    continue
                qkey = f"{key}.{jid}"
                wrong = self.b.rng("planets", "capital_job_count", qkey).sample(
                    [v for v in (100, 200, 300, 400, 500, 600, 700) if v != n and abs(v - n) <= 300], 3)
                self.add("capital_job_count", qkey, 4 if "ancient" not in key else 5, x, dlc,
                         _sentence(f"¿Cuántos empleos de {job['es']} da siempre el edificio capital {names['es']}?",
                                   f"How many {job['en']} jobs does the capital building {names['en']} always provide?",
                                   f"首都施設「{names['jp']}」が常に提供する職業「{job['jp']}」の数は？"),
                         gq.same(str(n)), [gq.same(str(v)) for v in wrong],
                         _sentence(f"{names['es']} da {n} empleos de {job['es']}.", f"{names['en']} provides {n} {job['en']} jobs.",
                                   f"「{names['jp']}」は職業「{job['jp']}」を{n}提供します。"))


def pct(value):
    return int(round(value * 100))


def planet_list(text):
    """The planet classes of a condition that is only `is_planet_class` (alone or in an OR), or None."""
    try:
        block = parse(text or "")
    except Exception:  # noqa: BLE001 — an unreadable condition makes the item unusable
        return None
    entries = block.entries
    if len(entries) == 1 and entries[0][0] == "OR" and isinstance(entries[0][2], Block):
        entries = entries[0][2].entries
    elif len(entries) != 1:
        return None
    if not entries or any(k != "is_planet_class" for k, _, _ in entries):
        return None
    return {str(v) for _, _, v in entries}


def spawn_classes(text):
    """Planet classes a planet modifier can spawn on (the `add` of its spawn chance), or None if
    something other than the planet class adds to the chance."""
    try:
        block = parse(text or "")
    except Exception:  # noqa: BLE001
        return None
    out = set()
    for k, _, v in block.entries:
        if k in ("base", "weight") and v not in (0, "0"):
            return None
        if k != "modifier" or not isinstance(v, Block) or v.get("add") is None:
            continue
        found = v.get_all("is_planet_class")
        if not found:
            return None
        out |= {str(f) for f in found}
    return out


def required_district_set(text):
    """The district set a condition requires at its top level, or None."""
    try:
        block = parse(text or "")
    except Exception:  # noqa: BLE001
        return None
    found = [str(v) for k, _, v in block.entries if k == "uses_district_set"]
    return found[0] if len(found) == 1 else None


def generate(b):
    p = Planets(b)
    p.climates()
    p.features()
    p.modifiers()
    p.designations()
    p.gives_job("district_job", "districts", p.named("districts", ("potential", "allow")),
                ("el distrito", "the district", "区域"), 2)
    p.gives_job("zone_job", "zones", p.named("zones", ("potential", "unlock")),
                ("la especialización de distrito", "the district specialization", "区域の専門化"), 3)
    p.capitals()
