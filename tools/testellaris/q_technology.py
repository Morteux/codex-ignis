"""Templates of technology and research (T4104): what a technology unlocks, what it needs, research
areas, starting, rare, dangerous and repeatable technologies, costs, draw weights and DLC."""
import generate_questions as gq

CAPS = {
    "tech_unlocks": 15, "tech_unlocks_building": 15, "tech_for_blocker": 12, "tech_for_edict": 15,
    "tech_for_district": 12, "tech_same_area": 8, "tech_starting": 20, "tech_rare": 15, "tech_dangerous": 20,
    "tech_highest_cost": 10, "tech_highest_tier": 8, "tech_two_prerequisites": 20, "tech_dlc": 32,
    "tech_limited_levels": 10, "tech_weight": 20,
}


def _sentence(es, en, jp):
    return {"es": es, "en": en, "jp": jp}


class Technology:
    def __init__(self, b):
        self.b, self.d = b, b.d
        self.techs = gq.usable_techs(b.d)  # {id: (item, names, dlc)}, no repeatables
        self.ancestors, self.descendants = gq.tech_graph(b.d)

    def add(self, template, key, tier, item, dlc, text, correct, wrong, why):
        self.b.add("technology", template, key, tier, item, dlc, text, correct, wrong, why, gq._icon(item))

    def pick(self, template, key, correct, candidates, closeness, pool=40):
        rng = self.b.rng("technology", template, key)
        got = gq.pick(rng, correct, candidates, closeness, pool=pool)
        return [w[1] for w in got] if got else None

    def near(self, tid):
        """Closeness of other technologies to one: same area first, then tier distance."""
        t = self.techs[tid][0]
        return lambda k: (self.techs[k][0]["area"] != t["area"], abs(self.techs[k][0]["tier"] - t["tier"]))

    def unlocks(self):
        """Which technology has this one as a direct prerequisite."""
        for tid, (t, names, dlc) in self.techs.items():
            children = sorted(k for k, x in self.techs.items()
                              if tid in x[0]["prerequisites"] and not gq.gives_away(x[1], names))
            if not children:
                continue
            cid = self.b.rng("technology", "tech_unlocks", tid).choice(children)
            c = self.techs[cid]
            excluded = self.ancestors(tid) | self.descendants(tid) | {tid}
            cands = [(k, x[1]) for k, x in self.techs.items() if k not in excluded]
            wrong = self.pick("tech_unlocks", tid, c[1], cands, self.near(cid))
            if wrong:
                self.add("tech_unlocks", tid, max(3, gq.tech_obscurity(t), gq.tech_obscurity(c[0])), t, dlc + c[2],
                         _sentence(f"¿Cuál de estas tecnologías tiene {names['es']} como prerrequisito directo?",
                                   f"Which of these technologies has {names['en']} as a direct prerequisite?",
                                   f"技術「{names['jp']}」を直接の前提条件とする技術はどれ？"),
                         c[1], wrong,
                         _sentence(f"{names['es']} es un prerrequisito de {c[1]['es']}.",
                                   f"{names['en']} is a prerequisite of {c[1]['en']}.",
                                   f"「{names['jp']}」は「{c[1]['jp']}」の前提条件です。"))

    def unlocked_items(self, template, set_name, items, text, why, min_tier=2):
        """`text` / `why`: functions of the technology and item names."""
        usable = {}
        for x in items:
            names = self.d.name(set_name, x["id"])
            reliable, dlc = gq.condition_check(x, ("potential", "allow"))
            if names and reliable and x.get("prerequisites"):
                usable[x["id"]] = (x, names, dlc)
        for tid, (t, names, dlc) in self.techs.items():
            opens = sorted(k for k, v in usable.items()
                           if v[0]["prerequisites"] == [tid] and not gq.gives_away(v[1], names))
            if not opens:
                continue
            iid = self.b.rng("technology", template, tid).choice(opens)
            x, inames, idlc = usable[iid]
            related = self.descendants(tid) | {tid}
            cands = [(k, v[1]) for k, v in usable.items() if not related & set(v[0]["prerequisites"])]
            wrong = self.pick(template, tid, inames, cands, lambda k: usable[k][0].get("category") != x.get("category"))
            if wrong:
                self.add(template, tid, max(min_tier, gq.tech_obscurity(t)), t, dlc + idlc,
                         _sentence(*text(names)), inames, wrong, _sentence(*why(names, inames)))

    def required_by(self, template, set_name, items, text, why):
        """Which technology an item (blocker, edict, district) needs."""
        usable = [x for x in items if len(x.get("prerequisites") or []) == 1 and x["prerequisites"][0] in self.techs]
        needed = sorted({x["prerequisites"][0] for x in usable})
        pool = needed if len(needed) >= 12 else sorted(self.techs)
        for x in usable:
            names = self.d.name(set_name, x["id"])
            reliable, dlc = gq.condition_check(x, ("potential", "allow"))
            tid = x["prerequisites"][0]
            t, tnames, tdlc = self.techs[tid]
            if not names or not reliable or gq.gives_away(tnames, names):
                continue
            excluded = self.ancestors(tid) | self.descendants(tid) | {tid}
            cands = [(k, self.techs[k][1]) for k in pool if k not in excluded]
            wrong = self.pick(template, x["id"], tnames, cands, self.near(tid), pool=12)
            if wrong:
                self.add(template, x["id"], max(2, gq.tech_obscurity(t)), x, dlc + tdlc,
                         _sentence(*text(names)), tnames, wrong, _sentence(*why(names, tnames)))

    def items(self):
        self.unlocked_items(
            "tech_unlocks_building", "buildings", self.d.items("buildings"),
            lambda n: (f"¿Cuál de estos edificios requiere la tecnología {n['es']}?",
                       f"Which of these buildings requires the technology {n['en']}?",
                       f"技術「{n['jp']}」が必要な建造物はどれ？"),
            lambda n, i: (f"{i['es']} requiere la tecnología {n['es']}.", f"{i['en']} requires the technology {n['en']}.",
                          f"「{i['jp']}」には技術「{n['jp']}」が必要です。"))
        self.required_by(
            "tech_for_blocker", "deposits", [x for x in self.d.items("deposits") if x.get("blocker")],
            lambda n: (f"¿Qué tecnología hace falta para despejar el obstáculo {n['es']}?",
                       f"Which technology is needed to clear the blocker {n['en']}?",
                       f"障害物「{n['jp']}」の除去に必要な技術はどれ？"),
            lambda n, t: (f"Para despejar {n['es']} hace falta {t['es']}.", f"Clearing {n['en']} needs {t['en']}.",
                          f"「{n['jp']}」の除去には「{t['jp']}」が必要です。"))
        self.required_by(
            "tech_for_edict", "edicts", self.d.items("edicts"),
            lambda n: (f"¿Qué tecnología requiere el edicto {n['es']}?", f"Which technology does the edict {n['en']} require?",
                       f"布告「{n['jp']}」に必要な技術はどれ？"),
            lambda n, t: (f"El edicto {n['es']} requiere {t['es']}.", f"The edict {n['en']} requires {t['en']}.",
                          f"布告「{n['jp']}」には「{t['jp']}」が必要です。"))
        self.required_by(
            "tech_for_district", "districts", self.d.items("districts"),
            lambda n: (f"¿Qué tecnología requiere el distrito {n['es']}?", f"Which technology does the district {n['en']} require?",
                       f"区域「{n['jp']}」に必要な技術はどれ？"),
            lambda n, t: (f"El distrito {n['es']} requiere {t['es']}.", f"The district {n['en']} requires {t['en']}.",
                          f"区域「{n['jp']}」には「{t['jp']}」が必要です。"))

    def same_area(self):
        for tid, (t, names, dlc) in self.techs.items():
            same = sorted(k for k, x in self.techs.items() if k != tid and x[0]["area"] == t["area"]
                          and x[0]["tier"] == t["tier"] and not gq.gives_away(x[1], names))
            if not same:
                continue
            oid = self.b.rng("technology", "tech_same_area", tid).choice(same)
            o = self.techs[oid]
            cands = [(k, x[1]) for k, x in self.techs.items() if x[0]["area"] != t["area"] and not gq.gives_away(x[1], names)]
            wrong = self.pick("tech_same_area", tid, o[1], cands, lambda k: abs(self.techs[k][0]["tier"] - t["tier"]))
            if wrong:
                self.add("tech_same_area", tid, max(2, gq.tech_obscurity(t), gq.tech_obscurity(o[0])), t, dlc + o[2],
                         _sentence(f"¿Cuál de estas tecnologías es de la misma área de investigación que {names['es']}?",
                                   f"Which of these technologies belongs to the same research area as {names['en']}?",
                                   f"技術「{names['jp']}」と同じ研究分野の技術はどれ？"),
                         o[1], wrong,
                         _sentence(f"{names['es']} y {o[1]['es']} son de la misma área; las otras tres, de otras.",
                                   f"{names['en']} and {o[1]['en']} share a research area; the other three do not.",
                                   f"「{names['jp']}」と「{o[1]['jp']}」は同じ分野で、他の3つは別の分野です。"))

    def flagged(self):
        """Which of four technologies is a starting, rare or dangerous one."""
        def flag(x, name):
            return bool((x[0].get("flags") or {}).get(name))

        plain = {k: x for k, x in self.techs.items() if not any(flag(x, f) for f in ("start", "rare", "dangerous", "event"))}
        basic = {k: x for k, x in plain.items() if x[0]["tier"] >= 1 and x[0]["prerequisites"] and not x[2]}
        groups = (
            ("tech_starting", {k: x for k, x in self.techs.items() if flag(x, "start") and not x[2]
                               and not x[0].get("potential") and not flag(x, "event")}, basic, lambda x: 1,
             ("es una tecnología inicial", "is a starting technology", "初期技術"),
             _sentence("¿Cuál de estas es una tecnología inicial?", "Which of these is a starting technology?", "次のうち初期技術はどれ？")),
            ("tech_rare", {k: x for k, x in self.techs.items() if flag(x, "rare") and not flag(x, "dangerous") and not flag(x, "event")},
             plain, lambda x: 4, ("es una tecnología rara", "is a rare technology", "レア技術"),
             _sentence("¿Cuál de estas es una tecnología rara?", "Which of these is a rare technology?", "次のうちレア技術はどれ？")),
            ("tech_dangerous", {k: x for k, x in self.techs.items() if flag(x, "dangerous")},
             {k: x for k, x in self.techs.items() if not flag(x, "dangerous")}, lambda x: 5,
             ("es una tecnología peligrosa", "is a dangerous technology", "危険な技術"),
             _sentence("¿Cuál de estas es una tecnología peligrosa?", "Which of these is a dangerous technology?", "次のうち危険な技術はどれ？")),
        )
        for template, right, others, tier, tell, text in groups:
            for tid, (t, names, dlc) in right.items():
                cands = [(k, x[1]) for k, x in others.items() if k != tid]
                wrong = self.pick(template, tid, names, cands, self.near(tid), pool=30)
                if wrong:
                    self.add(template, tid, tier(t), t, dlc, text, names, wrong,
                             _sentence(f"{names['es']} {tell[0]}.", f"{names['en']} {tell[1]}.", f"「{names['jp']}」は{tell[2]}です。"))

    def highest(self):
        """Which of four technologies costs the most, or has the highest tier."""
        for template, field, minimum, text, tell in (
            ("tech_highest_cost", "cost", 4,
             _sentence("¿Cuál de estas tecnologías tiene el mayor coste base?", "Which of these technologies has the highest base cost?",
                       "次のうち基本コストが最も高い技術はどれ？"),
             ("tiene el coste base más alto", "has the highest base cost", "の基本コストが最も高いです")),
            ("tech_highest_tier", "tier", 2,
             _sentence("¿Cuál de estas tecnologías es de mayor nivel?", "Which of these technologies has the highest tier?",
                       "次のうちティアが最も高い技術はどれ？"),
             ("tiene el nivel más alto", "has the highest tier", "のティアが最も高いです")),
        ):
            for tid, (t, names, dlc) in self.techs.items():
                value = t.get(field)
                if not isinstance(value, int) or value <= 0:
                    continue
                cands = [(k, x[1]) for k, x in self.techs.items()
                         if isinstance(x[0].get(field), int) and 0 <= x[0][field] < value]
                wrong = self.pick(template, tid, names, cands,
                                  lambda k: (self.techs[k][0]["area"] != t["area"], value - self.techs[k][0][field]), pool=15)
                if wrong:
                    self.add(template, tid, max(minimum, gq.tech_obscurity(t)), t, dlc, text, names, wrong,
                             _sentence(f"{names['es']} {tell[0]} de las cuatro: {value}.", f"{names['en']} {tell[1]} of the four: {value}.",
                                       f"4つの中で「{names['jp']}」{tell[2]}（{value}）。"))

    def two_prerequisites(self):
        def joined(pair):
            return {lang: " + ".join(self.techs[k][1][lang] for k in pair) for lang in gq.LOC_FILES}

        for tid, (t, names, dlc) in self.techs.items():
            pre = sorted(t["prerequisites"])
            if len(pre) != 2 or any(p not in self.techs for p in pre):
                continue
            excluded = self.ancestors(tid) | self.descendants(tid) | {tid}
            rng = self.b.rng("technology", "tech_two_prerequisites", tid)
            others = sorted((k for k in self.techs if k not in excluded), key=lambda k: (self.near(pre[0])(k), k))[:12]
            if len(others) < 4:
                continue
            a, c, e = rng.sample(others, 3)
            # two options keep one true prerequisite, the third none
            wrong = [(pre[0], a), (c, pre[1]), (a, e)]
            correct = joined(pre)
            self.add("tech_two_prerequisites", tid, max(4, gq.tech_obscurity(t)), t, dlc + self.techs[pre[0]][2] + self.techs[pre[1]][2],
                     _sentence(f"¿Qué dos tecnologías requiere {names['es']}?", f"Which two technologies does {names['en']} require?",
                               f"技術「{names['jp']}」に必要な2つの技術はどれ？"),
                     correct, [joined(w) for w in wrong],
                     _sentence(f"{names['es']} requiere {self.techs[pre[0]][1]['es']} y {self.techs[pre[1]][1]['es']}.",
                               f"{names['en']} requires {self.techs[pre[0]][1]['en']} and {self.techs[pre[1]][1]['en']}.",
                               f"「{names['jp']}」には「{self.techs[pre[0]][1]['jp']}」と「{self.techs[pre[1]][1]['jp']}」が必要です。"))

    def dlcs(self):
        dlcs = [x for x in self.d.items("dlc") if x["installed"] and x["affects_gameplay"]]
        shown = {x["name"]: x.get("localised_name") or x["name"] for x in dlcs}
        category = {x["name"]: x["category"] for x in dlcs}
        for tid, (t, names, dlc) in self.techs.items():
            one = gq.single_dlc(t, gq.TECH_FIELDS)
            if one not in shown:
                continue
            cands = [(n, gq.same(shown[n])) for n in shown if n != one]
            wrong = self.pick("tech_dlc", tid, gq.same(shown[one]), cands, lambda n: category[n] != category[one], pool=12)
            if wrong:
                self.add("tech_dlc", tid, max(3, gq.tech_obscurity(t)), t, dlc,
                         _sentence(f"¿Qué DLC añade la tecnología {names['es']}?", f"Which DLC adds the technology {names['en']}?",
                                   f"技術「{names['jp']}」を追加するDLCはどれ？"),
                         gq.same(shown[one]), wrong,
                         _sentence(f"{names['es']} necesita el DLC {shown[one]}.", f"{names['en']} needs the DLC {shown[one]}.",
                                   f"「{names['jp']}」にはDLC「{shown[one]}」が必要です。"))

    def repeatables(self):
        """Which repeatable technology stops after a few levels."""
        found = {}
        for t in self.d.items("technologies"):
            names = self.d.name("technologies", t["id"])
            reliable, dlc = gq.condition_check(t, gq.TECH_FIELDS)
            if names and reliable and (t.get("flags") or {}).get("repeatable") and isinstance(t.get("levels"), int):
                found[t["id"]] = (t, names, dlc)
        endless = [(k, v[1]) for k, v in found.items() if v[0]["levels"] == -1]
        for tid, (t, names, dlc) in found.items():
            if t["levels"] <= 0:
                continue
            wrong = self.pick("tech_limited_levels", tid, names, endless, lambda k: found[k][0]["area"] != t["area"], pool=15)
            if wrong:
                self.add("tech_limited_levels", tid, 5, t, dlc,
                         _sentence("¿Cuál de estas tecnologías repetibles tiene un número limitado de niveles?",
                                   "Which of these repeatable technologies has a limited number of levels?",
                                   "次の反復可能な技術のうちレベル数に上限があるのはどれ？"),
                         names, wrong,
                         _sentence(f"{names['es']} tiene {t['levels']} niveles; las otras tres no tienen límite.",
                                   f"{names['en']} has {t['levels']} levels; the other three have no limit.",
                                   f"「{names['jp']}」の上限は{t['levels']}レベルで、他の3つは無制限です。"))

    def weights(self):
        """Tier 5: the base draw weight of a rare technology."""
        values = sorted({x[0]["weight"] for x in self.techs.values() if isinstance(x[0].get("weight"), int) and x[0]["weight"] > 0})
        for tid, (t, names, dlc) in self.techs.items():
            weight = t.get("weight")
            if not (t.get("flags") or {}).get("rare") or not isinstance(weight, int) or weight <= 0:
                continue
            near = sorted((v for v in values if v != weight), key=lambda v: (abs(v - weight), v))[:6]
            wrong = self.b.rng("technology", "tech_weight", tid).sample(near, 3)
            self.add("tech_weight", tid, 5, t, dlc,
                     _sentence(f"¿Cuál es el peso base de aparición de la tecnología {names['es']} (antes de modificadores)?",
                               f"What is the base draw weight of the technology {names['en']} (before modifiers)?",
                               f"技術「{names['jp']}」の基本出現ウェイト（補正前）は？"),
                     gq.same(str(weight)), [gq.same(str(v)) for v in wrong],
                     _sentence(f"Los archivos del juego dan a {names['es']} un peso base de {weight}.",
                               f"The game files give {names['en']} a base weight of {weight}.",
                               f"ゲームファイルでの「{names['jp']}」の基本ウェイトは{weight}です。"))


def generate(b):
    t = Technology(b)
    t.unlocks()
    t.items()
    t.same_area()
    t.flagged()
    t.highest()
    t.two_prerequisites()
    t.dlcs()
    t.repeatables()
    t.weights()
