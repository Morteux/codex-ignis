"""Economy templates (T4106): strata, outputs and upkeep of jobs, branch office buildings, build
times and living standards. The data holds no official es/en/jp names of the resources, so the
questions compare resources ("the same resource as") instead of naming them."""
import re

import generate_questions as gq
from pdx.parser import Block, parse

CAPS = {
    "job_stratum": 15, "job_same_output": 25, "job_same_upkeep": 20, "job_most_output": 20,
    "branch_office": 20, "branch_office_criminal": 15, "branch_office_job": 25, "branch_office_requirement": 10,
    "building_slowest": 20, "building_days": 15,
    "living_power_most": 20, "living_upkeep_most": 20, "living_power": 40, "living_civic": 10,
}
STRATA = ("ruler", "specialist", "worker", "complex_drone", "simple_drone")
# The stratum keys of the living standards: `political_power` / `pop_upkeep` → the stratum label id
LIVING_STRATA = (("ruler", "rulers"), ("specialist", "specialists"), ("worker", "workers"))
_NOT_RESOURCES = ("trigger", "mult", "multiplier")


def _sentence(es, en, jp):
    return {"es": es, "en": en, "jp": jp}


def amount(value):
    return f"{value:g}"


def resources_of(job, field):
    """Every resource a job can produce or consume (`field` = produces / upkeep), conditions included."""
    out = set(job.get(field) or {})
    for entry in (job.get("resources") or {}).get(field) or []:
        out |= {k for k in entry if k not in _NOT_RESOURCES}
    return out


def jobs_of_modifiers(item):
    """Ids of the jobs the modifiers of a building add (`job_<id>_add`)."""
    mods = [item.get("planet_modifier") or {}]
    mods += [t.get("modifier") or {} for t in item.get("triggered_planet_modifier") or []]
    out = list(item.get("jobs") or {})
    for m in mods:
        for k in m:
            found = re.fullmatch(r"job_([a-z0-9_]+?)_add", k)
            if found and found.group(1) not in out:
                out.append(found.group(1))
    return out


def owner_values(text, scope, keys=("has_valid_civic", "has_origin")):
    """[(key, value)] of the plain `has_valid_civic` / `has_origin` lines inside the top-level
    `<scope> = { }` blocks of a condition (nothing nested in OR or NOT)."""
    try:
        block = parse(text or "")
    except Exception:  # noqa: BLE001 — an unreadable condition makes the item unusable
        return []
    return [(k2, str(v2)) for k, _, v in block.entries if k == scope and isinstance(v, Block)
            for k2, _, v2 in v.entries if k2 in keys and not isinstance(v2, Block)]


class Economy:
    def __init__(self, b):
        self.b, self.d = b, b.d

    def add(self, template, key, tier, item, dlc, text, correct, wrong, why):
        self.b.add("economy", template, key, tier, item, dlc, text, correct, wrong, why, gq._icon(item))

    def pick(self, template, key, correct, candidates, closeness=lambda k: 0, pool=30):
        rng = self.b.rng("economy", template, key)
        got = gq.pick(rng, correct, candidates, closeness, pool=pool)
        return [w[1] for w in got] if got else None

    def named(self, set_name, fields):
        """{id: (item, official names, DLC)} of the items of a set that can be asked."""
        out = {}
        for x in self.d.items(set_name):
            names = self.d.name(set_name, x["id"])
            reliable, dlc = gq.condition_check(x, fields)
            if names and reliable:
                out[x["id"]] = (x, names, dlc)
        return out

    # -- jobs

    def jobs(self):
        jobs = {k: v for k, v in self.named("jobs", ("possible", "possible_pre_triggers")).items()
                if v[0]["category"] in STRATA}
        self.strata(jobs)
        for field, template, tier in (("produces", "job_same_output", 2), ("upkeep", "job_same_upkeep", 3)):
            self.same_resource(jobs, field, template, tier)
        self.most_output(jobs)

    def strata(self, jobs):
        labels = {s: self.d.label("jobs", s) for s in STRATA}
        for key, (x, names, dlc) in jobs.items():
            stratum = x["category"]
            label = labels[stratum]
            if not label or gq.gives_away(label, names):
                continue
            others = [(s, labels[s]) for s in STRATA if s != stratum and labels[s]]
            drone = stratum.endswith("drone")
            wrong = self.pick("job_stratum", key, label, others, lambda s: s.endswith("drone") != drone, pool=3)
            if wrong:
                self.add("job_stratum", key, 2 if drone or dlc else 1, x, dlc,
                         _sentence(f"¿A qué estrato pertenece el empleo {names['es']}?",
                                   f"Which stratum does the job {names['en']} belong to?",
                                   f"職業「{names['jp']}」が属する階層はどれ？"),
                         label, wrong,
                         _sentence(f"{names['es']} es un empleo del estrato «{label['es']}».",
                                   f"{names['en']} is a job of the {label['en']} stratum.",
                                   f"「{names['jp']}」は階層「{label['jp']}」の職業です。"))

    def same_resource(self, jobs, field, template, tier):
        used = {k: resources_of(v[0], field) for k, v in jobs.items()}
        single = {k for k, r in used.items() if len(r) == 1}
        for key, (x, names, dlc) in jobs.items():
            if key not in single:
                continue
            resource = next(iter(used[key]))
            twins = sorted(k for k in single if k != key and used[k] == used[key] and not gq.gives_away(jobs[k][1], names))
            if not twins:
                continue
            oid = self.b.rng("economy", template, key).choice(twins)
            o, onames, odlc = jobs[oid]
            cands = [(k, v[1]) for k, v in jobs.items() if used[k] and resource not in used[k]]
            wrong = self.pick(template, key, onames, cands, lambda k: jobs[k][0]["category"] != o["category"])
            if not wrong:
                continue
            if field == "produces":
                text = _sentence(f"¿Cuál de estos empleos produce el mismo recurso que {names['es']}?",
                                 f"Which of these jobs produces the same resource as {names['en']}?",
                                 f"「{names['jp']}」と同じ資源を生産する職業はどれ？")
                why = _sentence(f"{names['es']} y {onames['es']} producen el mismo recurso; los otros tres no.",
                                f"{names['en']} and {onames['en']} produce the same resource; the other three do not.",
                                f"「{names['jp']}」と「{onames['jp']}」は同じ資源を生産します。他の3つは生産しません。")
            else:
                text = _sentence(f"¿Cuál de estos empleos consume como mantenimiento el mismo recurso que {names['es']}?",
                                 f"Which of these jobs has the same upkeep resource as {names['en']}?",
                                 f"「{names['jp']}」と同じ資源を維持費にする職業はどれ？")
                why = _sentence(f"{names['es']} y {onames['es']} tienen el mismo recurso de mantenimiento; los otros tres no.",
                                f"{names['en']} and {onames['en']} have the same upkeep resource; the other three do not.",
                                f"「{names['jp']}」と「{onames['jp']}」の維持費は同じ資源です。他の3つは違います。")
            self.add(template, key, tier, x, dlc + odlc, text, onames, wrong, why)

    def most_output(self, jobs):
        """Among four jobs that only produce one same resource, the highest base amount."""
        groups = {}
        for k, v in jobs.items():
            made = resources_of(v[0], "produces")
            base = v[0].get("produces") or {}
            if len(made) == 1 and set(base) == made:
                groups.setdefault(next(iter(made)), {})[k] = next(iter(base.values()))
        for group in groups.values():
            for key, value in sorted(group.items()):
                x, names, dlc = jobs[key]
                cands = [(k, jobs[k][1]) for k, v in group.items() if v < value]
                wrong = self.pick("job_most_output", key, names, cands, pool=12)
                if not wrong:
                    continue
                others = [k for k, n in cands if n in wrong]
                self.add("job_most_output", key, 4, x, dlc + [d for k in others for d in jobs[k][2]],
                         _sentence("Estos empleos producen el mismo recurso. ¿Cuál tiene la mayor producción base (sin bonificaciones condicionales)?",
                                   "These jobs produce the same resource. Which has the highest base output (without conditional bonuses)?",
                                   "同じ資源を生産する次の職業のうち、基本生産量（条件付きボーナスを除く）が最も多いのはどれ？"),
                         names, wrong,
                         _sentence(f"La producción base de {names['es']} es {amount(value)}; las demás son menores.",
                                   f"The base output of {names['en']} is {amount(value)}; the others are lower.",
                                   f"「{names['jp']}」の基本生産量は{amount(value)}で、他の3つはそれより少ないです。"))

    # -- buildings

    def buildings(self):
        buildings = self.named("buildings", ("potential", "allow"))
        office = {k: v for k, v in buildings.items() if v[0].get("owner_type") == "corporate"}
        planet = {k: v for k, v in buildings.items() if not v[0].get("owner_type") and not v[0].get("capital")}
        for key, (x, names, dlc) in office.items():
            wrong = self.pick("branch_office", key, names, [(k, v[1]) for k, v in planet.items()], pool=300)
            if wrong:
                self.add("branch_office", key, 2 if dlc else 1, x, dlc,
                         _sentence("¿Cuál de estos es un edificio de sucursal?", "Which of these is a branch office building?",
                                   "次のうち支社の建造物はどれ？"),
                         names, wrong,
                         _sentence(f"{names['es']} es un edificio que una megacorporación construye en sus sucursales.",
                                   f"{names['en']} is a building a megacorporation builds in its branch offices.",
                                   f"「{names['jp']}」は巨大企業が支社に建てる建造物です。"))
        self.criminal(office)
        self.office_jobs(office)
        self.office_requirements(office)
        self.build_times({k: v for k, v in buildings.items() if isinstance(v[0].get("base_buildtime"), int)
                          and v[0]["base_buildtime"] > 0 and v[0].get("can_build")})

    def criminal(self, office):
        def has(x, trigger):
            return bool(re.search(rf"\b{trigger} = yes\b", x.get("potential") or ""))
        legal = [(k, v[1]) for k, v in office.items() if has(v[0], "is_legit_or_legal_criminal")]
        for key, (x, names, dlc) in office.items():
            if not has(x, "is_illegal_criminal"):
                continue
            wrong = self.pick("branch_office_criminal", key, names, legal)
            if wrong:
                self.add("branch_office_criminal", key, 3, x, dlc,
                         _sentence("¿Cuál de estos edificios de sucursal solo puede construirlo una corporación criminal?",
                                   "Which of these branch office buildings can only a criminal corporation build?",
                                   "次の支社の建造物のうち、犯罪企業だけが建てられるのはどれ？"),
                         names, wrong,
                         _sentence(f"{names['es']} es exclusivo de las corporaciones criminales.",
                                   f"{names['en']} is exclusive to criminal corporations.",
                                   f"「{names['jp']}」は犯罪企業専用です。"))

    def office_jobs(self, office):
        jobs = self.d.by_id("jobs")
        given = {}
        for key, (x, _, _) in office.items():
            given[key] = [j for j in jobs_of_modifiers(x) if j in jobs and self.d.label("jobs", j)]
        pool = {j: self.d.label("jobs", j) for ids in given.values() for j in ids}
        pool.update({j: self.d.label("jobs", j) for j, x in jobs.items()
                     if x["category"] in STRATA and self.d.name("jobs", j)})
        for key, (x, names, dlc) in office.items():
            every = jobs_of_modifiers(x)
            asked = [j for j in given[key] if j != "criminal" and not gq.gives_away(pool[j], names)]
            if not asked:
                continue
            jid = asked[0]
            near = set(every)
            for j in every:
                near |= {s["id"] for s in jobs.get(j, {}).get("swaps") or []}
            taken = {pool[j]["en"] for j in near if j in pool}
            cands = [(j, n) for j, n in pool.items() if j not in near and n["en"] not in taken]
            offices = {j for ids in given.values() for j in ids}
            wrong = self.pick("branch_office_job", key, pool[jid], cands, lambda j: j not in offices)
            if wrong:
                self.add("branch_office_job", key, 4, x, dlc,
                         _sentence(f"¿Cuál de estos empleos puede crear el edificio de sucursal {names['es']}?",
                                   f"Which of these jobs can the branch office building {names['en']} create?",
                                   f"支社の建造物「{names['jp']}」が生み出しうる職業はどれ？"),
                         pool[jid], wrong,
                         _sentence(f"{names['es']} puede dar empleos de {pool[jid]['es']}.",
                                   f"{names['en']} can create {pool[jid]['en']} jobs.",
                                   f"「{names['jp']}」は職業「{pool[jid]['jp']}」を生み出します。"))

    def office_requirements(self, office):
        corporate = {c["id"] for c in self.d.items("civics") if "auth_corporate" in (c.get("potential") or "")}
        kinds = {"has_valid_civic": ("civics", "el principio", "the civic", "国是"),
                 "has_origin": ("origins", "el origen", "the origin", "起源")}
        for key, (x, names, dlc) in office.items():
            found = owner_values(x.get("potential"), "branch_office_owner")
            if len(found) != 1:
                continue
            trigger, value = found[0]
            set_name, es, en, jp = kinds[trigger]
            required = self.d.name(set_name, value)
            if not required or gq.gives_away(required, names):
                continue
            pool = corporate if set_name == "civics" else {o["id"] for o in self.d.items("origins")}
            cands = [(c, self.d.name(set_name, c)) for c in sorted(pool)
                     if c != value and c not in (x.get("potential") or "") and self.d.name(set_name, c)]
            wrong = self.pick("branch_office_requirement", key, required, cands)
            if wrong:
                self.add("branch_office_requirement", key, 3, x, dlc,
                         _sentence(f"¿Qué necesita el dueño de una sucursal para construir {names['es']}?",
                                   f"What does the owner of a branch office need to build {names['en']}?",
                                   f"「{names['jp']}」を建てるために支社の所有者に必要なのはどれ？"),
                         required, wrong,
                         _sentence(f"{names['es']} requiere {es} {required['es']}.",
                                   f"{names['en']} requires {en} {required['en']}.",
                                   f"「{names['jp']}」には{jp}「{required['jp']}」が必要です。"))

    def build_times(self, items):
        days = sorted({v[0]["base_buildtime"] for v in items.values()})
        for key, (x, names, dlc) in items.items():
            t = x["base_buildtime"]
            cands = [(k, v[1]) for k, v in items.items() if v[0]["base_buildtime"] < t]
            wrong = self.pick("building_slowest", key, names, cands,
                              lambda k: items[k][0].get("category") != x.get("category"), pool=20)
            if wrong:
                others = [k for k, n in cands if n in wrong]
                self.add("building_slowest", key, 4, x, dlc + [d for k in others for d in items[k][2]],
                         _sentence("¿Cuál de estos edificios tarda más en construirse (tiempo base)?",
                                   "Which of these buildings takes the longest to build (base time)?",
                                   "次の建造物のうち建設の基本日数が最も長いのはどれ？"),
                         names, wrong,
                         _sentence(f"{names['es']} tarda {t} días de base; los otros tres, menos.",
                                   f"{names['en']} takes {t} days as a base; the other three take fewer.",
                                   f"「{names['jp']}」の基本日数は{t}日で、他の3つはそれより短いです。"))
            values = sorted((v for v in days if v != t), key=lambda v: (abs(v - t), v))[:5]
            if len(values) >= 3:
                wrong = self.b.rng("economy", "building_days", key).sample(values, 3)
                self.add("building_days", key, 5, x, dlc,
                         _sentence(f"¿Cuántos días base tarda en construirse el edificio {names['es']}?",
                                   f"How many days does the building {names['en']} take to build, as a base?",
                                   f"建造物「{names['jp']}」の建設にかかる基本日数は？"),
                         gq.same(str(t)), [gq.same(str(v)) for v in wrong],
                         _sentence(f"{names['es']} tarda {t} días antes de modificadores.",
                                   f"{names['en']} takes {t} days before modifiers.",
                                   f"「{names['jp']}」の建設は補正前で{t}日です。"))

    # -- living standards

    def living_standards(self):
        standards = self.named("living_standards", ("potential", "allow"))
        for stratum, plural in LIVING_STRATA:
            label = self.d.label("jobs", stratum)
            power = {k: v[0]["political_power"][stratum] for k, v in standards.items()
                     if isinstance((v[0].get("political_power") or {}).get(stratum), (int, float))}
            upkeep = {}
            for k, v in standards.items():
                values = (v[0].get("pop_upkeep") or {}).get(plural)
                if values and all(isinstance(n, (int, float)) for n in values.values()):
                    upkeep[k] = sum(values.values())
            self.most("living_power_most", 4, standards, power, stratum, label,
                      ("más poder político", "the most political power", "政治力が最も高い"),
                      ("El poder político", "The political power", "政治力"))
            self.most("living_upkeep_most", 3, standards, upkeep, stratum, label,
                      ("el mantenimiento base más alto", "the highest base upkeep", "基本維持費が最も高い"),
                      ("El mantenimiento base", "The base upkeep", "基本維持費"))
            numbers = sorted(set(power.values()))
            for key, value in sorted(power.items()):
                x, names, dlc = standards[key]
                near = sorted((v for v in numbers if v != value), key=lambda v: (abs(v - value), v))[:5]
                if len(near) < 3:
                    continue
                qkey = f"{key}.{stratum}"
                wrong = self.b.rng("economy", "living_power", qkey).sample(near, 3)
                self.add("living_power", qkey, 5, x, dlc,
                         _sentence(f"Con el nivel de vida {names['es']}, ¿cuánto poder político tiene un pop del estrato «{label['es']}»?",
                                   f"With the living standard {names['en']}, how much political power does a pop of the {label['en']} stratum have?",
                                   f"生活水準「{names['jp']}」で、階層「{label['jp']}」のPOPの政治力は？"),
                         gq.same(amount(value)), [gq.same(amount(v)) for v in wrong],
                         _sentence(f"Con {names['es']} el poder político de ese estrato es {amount(value)}.",
                                   f"With {names['en']} the political power of that stratum is {amount(value)}.",
                                   f"「{names['jp']}」でのこの階層の政治力は{amount(value)}です。"))
        self.living_requirements(standards)

    def most(self, template, tier, standards, values, stratum, label, asked, noun):
        for key, value in sorted(values.items()):
            x, names, dlc = standards[key]
            cands = [(k, standards[k][1]) for k, v in values.items() if v < value]
            qkey = f"{key}.{stratum}"
            wrong = self.pick(template, qkey, names, cands)
            if not wrong:
                continue
            others = [k for k, n in cands if n in wrong]
            self.add(template, qkey, tier, x, dlc + [d for k in others for d in standards[k][2]],
                     _sentence(f"¿Cuál de estos niveles de vida da {asked[0]} a los pops del estrato «{label['es']}»?",
                               f"Which of these living standards gives pops of the {label['en']} stratum {asked[1]}?",
                               f"次の生活水準のうち、階層「{label['jp']}」のPOPの{asked[2]}のはどれ？"),
                     names, wrong,
                     _sentence(f"{noun[0]} de ese estrato con {names['es']} es {amount(value)}, el mayor de los cuatro.",
                               f"{noun[1]} of that stratum with {names['en']} is {amount(value)}, the highest of the four.",
                               f"「{names['jp']}」でのこの階層の{noun[2]}は{amount(value)}で、4つの中で最大です。"))

    def living_requirements(self, standards):
        needs = {k: owner_values(v[0].get("potential"), "from") for k, v in standards.items()}
        kinds = {"has_valid_civic": ("civics", "el principio", "the civic", "国是"),
                 "has_origin": ("origins", "el origen", "the origin", "起源")}
        for key, (x, names, dlc) in standards.items():
            if len(needs[key]) != 1:
                continue
            trigger, value = needs[key][0]
            set_name, es, en, jp = kinds[trigger]
            required = self.d.name(set_name, value)
            if not required or gq.gives_away(required, names):
                continue
            cands = [(k, v[1]) for k, v in standards.items() if value not in str(v[0].get("potential"))]
            wrong = self.pick("living_civic", key, names, cands)
            if wrong:
                self.add("living_civic", key, 2, x, dlc,
                         _sentence(f"¿Cuál de estos niveles de vida exige {es} {required['es']}?",
                                   f"Which of these living standards requires {en} {required['en']}?",
                                   f"{jp}「{required['jp']}」が必要な生活水準はどれ？"),
                         names, wrong,
                         _sentence(f"{names['es']} requiere {es} {required['es']}.",
                                   f"{names['en']} requires {en} {required['en']}.",
                                   f"「{names['jp']}」には{jp}「{required['jp']}」が必要です。"))


def generate(b):
    e = Economy(b)
    e.jobs()
    e.buildings()
    e.living_standards()
