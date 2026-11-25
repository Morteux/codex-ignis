"""Templates of T4108: the content of Shadows of the Shroud, Astral Planes, Ancient Relics and
Overlord (modifiers and planetary features by their game file), the gifts of the Shroud patrons,
archaeotechnologies, subject holdings and what empire and planet modifiers raise. The 4.5.4
extractor output has no relics, astral rifts or subject agreements."""
import re

import generate_questions as gq
from pdx.parser import Block, parse
from q_economy import jobs_of_modifiers

CAPS = {
    "content_modifier": 60, "content_feature": 40, "patron_gift": 10, "archaeotech": 10,
    "holding": 15, "holding_loyalty_gain": 10, "holding_loyalty": 15, "holding_overlord": 20,
    "holding_technology": 10, "holding_job": 20,
    "modifier_raises": 30, "modifier_amount": 25,
}
# topic → (DLC of the content, file name part of its data, names that would give the answer away)
THEMES = {
    "shroud": ("Shadows of the Shroud", "shroud", r"shroud|psi|covenant"),
    "astral": ("Astral Planes", "astral_planes", r"astral|rift"),
    "artifacts": ("Ancient Relics Story Pack", "ancient_relics", r"relic|artifact|ancient|archaeo"),
    "subjects": ("Overlord", "overlord", r"overlord|subject|vassal"),
}
# Files of other content, where the wrong answers come from (a general file could hold anything)
OTHER_CONTENT = ("machine_age", "biogenesis", "first_contact", "nomads", "federations", "nemesis", "paragon",
                 "utopia", "grand_archive", "megacorp", "distant_stars", "cosmic_storms", "wilderness",
                 "infernals", "strange_worlds")
# effect → (modifier keys, the part of a key that marks the effect, es, en, jp, is the key a share)
EFFECTS = {
    "stability": (("planet_stability_add",), "stability", "la estabilidad", "stability", "安定度", False),
    "happiness": (("pop_happiness",), "happiness", "la felicidad", "happiness", "幸福度", True),
    "naval": (("country_naval_cap_mult",), "naval_cap", "la capacidad naval", "naval capacity", "海軍許容量", True),
    "fire_rate": (("ship_fire_rate_mult",), "fire_rate", "la cadencia de tiro de las naves", "ship fire rate",
                  "艦船の発射速度", True),
    "speed": (("ship_speed_mult",), "ship_speed", "la velocidad de las naves", "ship speed", "艦船の速度", True),
    "diplomacy": (("diplo_weight_mult",), "diplo_weight", "el peso diplomático", "diplomatic weight", "外交影響力", True),
    "envoys": (("envoys_add",), "envoys", "el número de enviados", "the number of envoys", "大使の数", False),
    "districts": (("planet_max_districts_add",), "max_districts", "el máximo de distritos",
                  "the maximum number of districts", "区域上限", False),
}
# The modifiers the four Shroud patrons give → (effect asked, es, en, jp)
GIFTS = {
    "the_composer_of_strands_blessing": ("la habitabilidad", "habitability", "居住適性"),
    "the_eater_of_worlds_blessing": ("el límite de mando", "the command limit", "指揮上限"),
    "the_cradle_of_souls_blessing": ("el número de enviados", "the number of envoys", "大使の数"),
    "the_instrument_of_desire_blessing": ("el máximo de distritos", "the maximum number of districts", "区域上限"),
}
LOYALTY = "monthly_loyalty"


def _sentence(es, en, jp):
    return {"es": es, "en": en, "jp": jp}


def amount(value, share=False):
    return f"{value * 100:+g} %" if share else f"{value:+g}"


def file_name(item):
    return item["file"].split("/")[-1]


def overlord_lines(text):
    """[(key, value)] of the plain civic and origin lines the overlord must meet: the lines directly
    inside an `overlord = { }` or `owner.overlord = { }` block that is not under OR, NOT or NOR."""
    try:
        block = parse(text or "")
    except Exception:  # noqa: BLE001 — an unreadable condition makes the item unusable
        return []
    out = []

    def walk(b):
        for k, _, v in b.entries:
            if not isinstance(v, Block):
                continue
            if k in ("overlord", "owner.overlord"):
                out.extend((k2, str(v2)) for k2, _, v2 in v.entries
                           if k2 in ("has_valid_civic", "has_civic", "has_origin") and not isinstance(v2, Block))
            elif k in ("owner", "AND"):
                walk(v)
    walk(block)
    return out


def overlord_technology(text):
    """The one technology an `overlord = { has_technology = X }` of a condition names, or None."""
    found = set(re.findall(r"overlord = \{\s*has_technology = (\w+)", text or ""))
    return found.pop() if len(found) == 1 else None


class Content:
    def __init__(self, b):
        self.b, self.d = b, b.d

    def add(self, topic, template, key, tier, item, dlc, text, correct, wrong, why):
        self.b.add(topic, template, key, tier, item, dlc, text, correct, wrong, why, gq._icon(item))

    def pick(self, topic, template, key, correct, candidates, closeness=lambda k: 0, pool=30):
        rng = self.b.rng(topic, template, key)
        got = gq.pick(rng, correct, candidates, closeness, pool=pool)
        return [w[1] for w in got] if got else None

    def short_names(self, set_name):
        """{id: (item, names)} of the items whose names are names (not a sentence of an event)."""
        out = {}
        for x in self.d.items(set_name):
            names = self.d.name(set_name, x["id"])
            if names and len(names["en"]) <= 40 and not names["en"].endswith((".", "!", "?")):
                out[x["id"]] = (x, names)
        return out

    # -- content of an expansion

    def contents(self):
        modifiers = {k: v for k, v in self.short_names("static_modifiers").items() if v[0].get("modifier")}
        features = self.short_names("deposits")
        sets = (("content_modifier", modifiers, ("modificadores", "modifiers", "補正"), 4),
                ("content_feature", features, ("rasgos planetarios", "planetary features", "惑星の特徴"), 3))
        for topic, (dlc, part, telling) in THEMES.items():
            for template, items, kind, tier in sets:
                others = [(k, v[1]) for k, v in items.items()
                          if any(o in file_name(v[0]) for o in OTHER_CONTENT) and part not in file_name(v[0])
                          and not re.search(telling, v[1]["en"], re.I)]
                for key, (x, names) in items.items():
                    if part not in file_name(x) or re.search(telling, names["en"], re.I):
                        continue
                    wrong = self.pick(topic, template, key, names, others, pool=500)
                    if wrong:
                        self.add(topic, template, key, tier, x, [dlc],
                                 _sentence(f"¿Cuál de estos {kind[0]} pertenece al contenido de {dlc}?",
                                           f"Which of these {kind[1]} belongs to the content of {dlc}?",
                                           f"次の{kind[2]}のうち「{dlc}」の内容に含まれるのはどれ？"),
                                 names, wrong,
                                 _sentence(f"«{names['es']}» es parte del contenido de {dlc}.",
                                           f"{names['en']} is part of the content of {dlc}.",
                                           f"「{names['jp']}」は「{dlc}」の内容です。"))

    def patron_gifts(self):
        modifiers = self.d.by_id("static_modifiers")
        names = {k: self.d.name("static_modifiers", k) for k in GIFTS if k in modifiers}
        if len(names) != 4 or not all(names.values()):
            return
        for key, effect in GIFTS.items():
            n = names[key]
            self.add("shroud", "patron_gift", key, 3, modifiers[key], ["Shadows of the Shroud"],
                     _sentence(f"¿Qué don de un patrón del Velo sube {effect[0]}?",
                               f"Which gift of a Shroud patron raises {effect[1]}?",
                               f"{effect[2]}を高めるシュラウドの後援者の贈り物はどれ？"),
                     n, [v for k, v in names.items() if k != key],
                     _sentence(f"«{n['es']}» sube {effect[0]}.", f"{n['en']} raises {effect[1]}.",
                               f"「{n['jp']}」は{effect[2]}を高めます。"))

    def archaeotechs(self):
        techs = gq.usable_techs(self.d)
        archaeo = {k: v for k, v in techs.items() if "archaeostudies" in (v[0].get("category") or [])}
        for key, (x, names, dlc) in archaeo.items():
            if key == "tech_archaeostudies":
                continue
            cands = [(k, v[1]) for k, v in techs.items() if k not in archaeo]
            wrong = self.pick("artifacts", "archaeotech", key, names, cands,
                              lambda k: (techs[k][0]["area"] != x["area"], abs(techs[k][0]["tier"] - x["tier"])), pool=60)
            if wrong:
                self.add("artifacts", "archaeotech", key, 2, x, dlc,
                         _sentence("¿Cuál de estas tecnologías es una arqueotecnología?",
                                   "Which of these technologies is an archaeotechnology?",
                                   "次の技術のうちアーケオテクノロジーはどれ？"),
                         names, wrong,
                         _sentence(f"{names['es']} es una arqueotecnología.", f"{names['en']} is an archaeotechnology.",
                                   f"「{names['jp']}」はアーケオテクノロジーです。"))

    # -- subject holdings

    def holdings(self):
        buildings = {}
        for x in self.d.items("buildings"):
            names = self.d.name("buildings", x["id"])
            reliable, dlc = gq.condition_check(x, ("potential", "allow"))
            if names and reliable:
                buildings[x["id"]] = (x, names, dlc)
        holdings = {k: v for k, v in buildings.items() if v[0].get("owner_type") == "subject_holding"}
        ordinary = [(k, v[1]) for k, v in buildings.items() if not v[0].get("owner_type") and not v[0].get("capital")]
        loyalty = {k: (v[0].get("planet_modifier") or {}).get(LOYALTY) for k, v in holdings.items()}
        jobs = self.d.by_id("jobs")
        given = {k: [j for j in jobs_of_modifiers(v[0]) if j in jobs and self.d.label("jobs", j)]
                 for k, v in holdings.items()}
        job_pool = {j: self.d.label("jobs", j) for ids in given.values() for j in ids}
        civics = {c["id"] for c in self.d.items("civics")}
        for key, (x, names, dlc) in holdings.items():
            wrong = self.pick("subjects", "holding", key, names, ordinary, pool=300)
            if wrong:
                self.add("subjects", "holding", key, 2 if dlc else 1, x, dlc,
                         _sentence("¿Cuál de estos es un edificio que un dominador construye en un planeta de su subordinado?",
                                   "Which of these is a holding an overlord builds on a planet of a subject?",
                                   "次のうち宗主国が属国の惑星に建てる保有施設はどれ？"),
                         names, wrong,
                         _sentence(f"{names['es']} es un edificio de dominador en planetas subordinados.",
                                   f"{names['en']} is a holding of an overlord on subject planets.",
                                   f"「{names['jp']}」は宗主国が属国に建てる保有施設です。"))
            value = loyalty[key]
            if value is not None:
                self.loyalty(key, x, names, dlc, value, holdings, loyalty)
            self.overlord_requirement(key, x, names, dlc, civics)
            self.overlord_tech(key, x, names, dlc)
            asked = [j for j in given[key] if not gq.gives_away(job_pool[j], names)]
            if asked:
                jid = asked[0]
                near = set(jobs_of_modifiers(x))
                for j in list(near):
                    near |= {s["id"] for s in jobs.get(j, {}).get("swaps") or []}
                taken = {job_pool[j]["en"] for j in near if j in job_pool}
                cands = [(j, n) for j, n in job_pool.items() if j not in near and n["en"] not in taken]
                wrong = self.pick("subjects", "holding_job", key, job_pool[jid], cands)
                if wrong:
                    job = job_pool[jid]
                    self.add("subjects", "holding_job", key, 4, x, dlc,
                             _sentence(f"¿Cuál de estos empleos puede dar el edificio de dominador {names['es']}?",
                                       f"Which of these jobs can the holding {names['en']} provide?",
                                       f"保有施設「{names['jp']}」が提供しうる職業はどれ？"),
                             job, wrong,
                             _sentence(f"{names['es']} puede dar empleos de {job['es']}.",
                                       f"{names['en']} can provide {job['en']} jobs.",
                                       f"「{names['jp']}」は職業「{job['jp']}」を提供します。"))

    def overlord_tech(self, key, x, names, dlc):
        """The technology the overlord must have. It may be a level of a technology that
        `usable_techs` leaves out, so the name is taken from the data set."""
        tid = overlord_technology(x.get("allow"))
        techs = self.d.by_id("technologies")
        tnames = self.d.label("technologies", tid) if tid in techs else None
        if not tnames or gq.gives_away(tnames, names):
            return
        t = techs[tid]
        reliable, tdlc = gq.condition_check(t, gq.TECH_FIELDS)
        if not reliable:
            return
        usable = gq.usable_techs(self.d)
        cands = [(k, v[1]) for k, v in usable.items() if k not in x.get("allow", "")]
        wrong = self.pick("subjects", "holding_technology", key, tnames, cands,
                          lambda k: (usable[k][0]["area"] != t["area"], abs(usable[k][0]["tier"] - t["tier"])))
        if wrong:
            self.add("subjects", "holding_technology", key, 4, x, dlc + tdlc,
                     _sentence(f"¿Qué tecnología necesita el dominador para construir {names['es']}?",
                               f"Which technology does the overlord need to build {names['en']}?",
                               f"「{names['jp']}」を建てるために宗主国に必要な技術はどれ？"),
                     tnames, wrong,
                     _sentence(f"{names['es']} exige que el dominador tenga {tnames['es']}.",
                               f"{names['en']} requires the overlord to have {tnames['en']}.",
                               f"「{names['jp']}」には宗主国の技術「{tnames['jp']}」が必要です。"))

    def loyalty(self, key, x, names, dlc, value, holdings, loyalty):
        values = sorted({v for v in loyalty.values() if v is not None} | {1, -0.25, -0.5, -1, -1.5, -2, 0.5})
        near = sorted((v for v in values if v != value), key=lambda v: (abs(v - value), v))[:5]
        wrong = self.b.rng("subjects", "holding_loyalty", key).sample(near, 3)
        self.add("subjects", "holding_loyalty", key, 5, x, dlc,
                 _sentence(f"¿Cuánta lealtad mensual cambia {names['es']}?",
                           f"By how much does {names['en']} change the monthly loyalty?",
                           f"「{names['jp']}」は毎月の忠誠度をいくつ変える？"),
                 gq.same(amount(value)), [gq.same(amount(v)) for v in wrong],
                 _sentence(f"{names['es']} cambia la lealtad mensual en {amount(value)}.",
                           f"{names['en']} changes the monthly loyalty by {amount(value)}.",
                           f"「{names['jp']}」は毎月の忠誠度を{amount(value)}します。"))
        if value > 0:
            cands = [(k, holdings[k][1]) for k, v in loyalty.items() if v is not None and v < 0]
            wrong = self.pick("subjects", "holding_loyalty_gain", key, names, cands)
            if wrong:
                self.add("subjects", "holding_loyalty_gain", key, 3, x, dlc,
                         _sentence("¿Cuál de estos edificios de dominador sube la lealtad cada mes?",
                                   "Which of these holdings raises loyalty every month?",
                                   "次の保有施設のうち毎月忠誠度を上げるのはどれ？"),
                         names, wrong,
                         _sentence(f"{names['es']} sube la lealtad ({amount(value)} al mes); los otros tres la bajan.",
                                   f"{names['en']} raises loyalty ({amount(value)} a month); the other three lower it.",
                                   f"「{names['jp']}」は忠誠度を上げます（毎月{amount(value)}）。他の3つは下げます。"))

    def overlord_requirement(self, key, x, names, dlc, civics):
        found = overlord_lines(x.get("potential"))
        if len(found) != 1:
            return
        trigger, value = found[0]
        set_name, es, en, jp = ("origins", "origen", "origin", "起源") if trigger == "has_origin" \
            else ("civics", "principio", "civic", "国是")
        required = self.d.name(set_name, value)
        if not required or gq.gives_away(required, names):
            return
        pool = civics if set_name == "civics" else {o["id"] for o in self.d.items("origins")}
        cands = [(c, self.d.name(set_name, c)) for c in sorted(pool)
                 if c != value and c not in x["potential"] and self.d.name(set_name, c)]
        wrong = self.pick("subjects", "holding_overlord", key, required, cands, pool=300)
        if wrong:
            self.add("subjects", "holding_overlord", key, 3, x, dlc,
                     _sentence(f"¿Qué {es} necesita el dominador para construir {names['es']}?",
                               f"Which {en} does the overlord need to build {names['en']}?",
                               f"「{names['jp']}」を建てるために宗主国に必要な{jp}はどれ？"),
                     required, wrong,
                     _sentence(f"{names['es']} exige que el dominador tenga {required['es']}.",
                               f"{names['en']} requires the overlord to have {required['en']}.",
                               f"「{names['jp']}」には宗主国の{jp}「{required['jp']}」が必要です。"))

    # -- empire and planet modifiers

    def effects(self):
        modifiers = {k: v for k, v in self.short_names("static_modifiers").items()
                     if v[0].get("modifier") and "_text" not in v[0]["modifier"] and not v[0].get("custom_tooltip")}
        for effect, (keys, mark, es, en, jp, share) in EFFECTS.items():
            having = {k: v[0]["modifier"][m] for k, v in modifiers.items() for m in keys if m in v[0]["modifier"]}
            without = [(k, v[1]) for k, v in modifiers.items()
                       if not any(mark in m for m in v[0]["modifier"]) and len(v[0]["modifier"]) <= 3]
            amounts = sorted({v for v in having.values() if isinstance(v, (int, float)) and abs(v) >= 0.01})
            for key, value in sorted(having.items()):
                x, names = modifiers[key]
                if not isinstance(value, (int, float)) or abs(value) < 0.01:
                    continue
                qkey = f"{key}.{effect}"
                if value > 0:
                    wrong = self.pick("modifiers", "modifier_raises", qkey, names, without, pool=300)
                    if wrong:
                        self.add("modifiers", "modifier_raises", qkey, 4, x, [],
                                 _sentence(f"¿Cuál de estos modificadores sube {es}?",
                                           f"Which of these modifiers raises {en}?",
                                           f"次の補正のうち{jp}を高めるのはどれ？"),
                                 names, wrong,
                                 _sentence(f"{names['es']} cambia {es} en {amount(value, share)}.",
                                           f"{names['en']} changes {en} by {amount(value, share)}.",
                                           f"「{names['jp']}」は{jp}を{amount(value, share)}します。"))
                near = sorted((v for v in amounts if v != value), key=lambda v: (abs(v - value), v))[:5]
                if len(near) < 3:
                    continue
                wrong = self.b.rng("modifiers", "modifier_amount", qkey).sample(near, 3)
                self.add("modifiers", "modifier_amount", qkey, 5, x, [],
                         _sentence(f"¿Cuánto cambia {es} el modificador «{names['es']}»?",
                                   f"By how much does the modifier {names['en']} change {en}?",
                                   f"補正「{names['jp']}」は{jp}をどれだけ変える？"),
                         gq.same(amount(value, share)), [gq.same(amount(v, share)) for v in wrong],
                         _sentence(f"«{names['es']}» cambia {es} en {amount(value, share)}.",
                                   f"{names['en']} changes {en} by {amount(value, share)}.",
                                   f"「{names['jp']}」は{jp}を{amount(value, share)}します。"))


def generate(b):
    c = Content(b)
    c.contents()
    c.patron_gifts()
    c.archaeotechs()
    c.holdings()
    c.effects()
