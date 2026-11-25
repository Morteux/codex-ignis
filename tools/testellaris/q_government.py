"""Templates of ethics and government (T4103): ethic points and combinations, what authorities do,
which ethics, authorities, civics and origins go together, and the authority variants.

Council positions, leader classes and traits are not asked: the extractor does not read them."""
import generate_questions as gq
import q_civics
import rules as rl

CAPS = {
    "ethic_points": 17, "ethic_combination": 20, "ethic_combination_illegal": 20,
    "authority_feature": 10, "authority_term": 5, "ethic_authority": 20, "authority_ethic": 20,
    "ethic_civic_forbidden": 20, "ethic_origin_forbidden": 15, "ethic_authority_civic": 25,
    "authority_variant_base": 30, "authority_variant": 20, "authority_not_playable": 5,
}


def _sentence(es, en, jp):
    return {"es": es, "en": en, "jp": jp}


class Government:
    def __init__(self, b):
        self.b, self.d = b, b.d
        self.empires = rl.Empires(b.d)
        self.ethics = {e["id"]: e for e in b.d.items("ethics") if b.d.name("ethics", e["id"])}
        self.regular = {k: v for k, v in self.ethics.items() if k != rl.GESTALT}
        self.auths = {a: b.d.by_id("authorities")[a] for a in rl.PLAYER_AUTHORITIES if b.d.name("authorities", a)}

    def ename(self, e):
        return self.d.name("ethics", e)

    def aname(self, a):
        return self.d.name("authorities", a)

    def adlc(self, a):
        return gq.condition_check(self.auths[a], gq.CIVIC_FIELDS)[1] or []

    def allows(self, authority, ethic):
        probe = (authority, "authorities", self.empires.authorities[authority])
        return self.empires.satisfiable([probe], authority=authority, ethic=ethic)

    def joined(self, combo):
        order = sorted(combo, key=lambda e: (-self.ethics[e]["cost"], e))
        return {lang: " + ".join(self.ename(e)[lang] for e in order) for lang in gq.LOC_FILES}

    # -- ethics

    def points(self):
        for key, e in self.ethics.items():
            names, cost = self.ename(key), e["cost"]
            wrong = [str(n) for n in (1, 2, 3, 4) if n != cost]
            self.b.add("ethics", "ethic_points", key, 1 if cost < 3 else 2, e, [],
                       _sentence(f"¿Cuántos puntos de ética cuesta {names['es']}?",
                                 f"How many ethics points does {names['en']} cost?",
                                 f"倫理観「{names['jp']}」に必要な倫理観ポイントは？"),
                       gq.same(str(cost)), [gq.same(w) for w in wrong],
                       _sentence(f"{names['es']} cuesta {cost} de los 3 puntos de ética.",
                                 f"{names['en']} costs {cost} of the 3 ethics points.",
                                 f"「{names['jp']}」のコストは3ポイント中{cost}です。"), gq._icon(e))

    def combinations(self):
        """Which pair of ethics a new empire can have, and which it cannot."""
        legal = {c for c in self.empires.combos if len(c) == 2 and all(e in self.regular for e in c)}
        illegal = []
        ids = sorted(self.regular)
        for i, a in enumerate(ids):
            for c in ids[i + 1:]:
                pair = frozenset((a, c))
                if pair not in legal and sum(self.regular[e]["cost"] for e in pair) == 3:
                    illegal.append(pair)  # 3 points on one axis
                elif pair not in legal and all(self.regular[e]["fanatic"] for e in pair):
                    illegal.append(pair)  # 4 points
        for template, tier, right, others in (("ethic_combination", 1, sorted(legal, key=sorted), illegal),
                                              ("ethic_combination_illegal", 2, sorted(illegal, key=sorted), sorted(legal, key=sorted))):
            for pair in right:
                key = ".".join(sorted(pair))
                rng = self.b.rng("ethics", template, key)
                names = self.joined(pair)
                wrong = gq.pick(rng, names, [(tuple(sorted(o)), self.joined(o)) for o in others],
                                lambda o: not set(o) & pair, pool=12)
                if not wrong:
                    continue
                if template == "ethic_combination":
                    text = _sentence("¿Cuál de estas combinaciones de éticas puede tener un imperio nuevo (3 puntos)?",
                                     "Which of these ethics combinations can a new empire have (3 points)?",
                                     "新しい帝国が選べる倫理観の組み合わせ（3ポイント）はどれ？")
                    why = _sentence(f"{names['es']} suma 3 puntos en ejes distintos; las demás no son válidas.",
                                    f"{names['en']} adds up to 3 points on different axes; the others are not valid.",
                                    f"「{names['jp']}」は別々の軸で合計3ポイントです。他は選べません。")
                else:
                    text = _sentence("¿Cuál de estas combinaciones de éticas no puede tener un imperio?",
                                     "Which of these ethics combinations can an empire not have?",
                                     "帝国が選べない倫理観の組み合わせはどれ？")
                    why = _sentence(f"{names['es']} se pasa de 3 puntos o usa dos veces el mismo eje.",
                                    f"{names['en']} goes over 3 points or uses the same axis twice.",
                                    f"「{names['jp']}」は3ポイントを超えるか、同じ軸を2回使っています。")
                item = self.regular[sorted(pair)[0]]
                self.b.add("ethics", template, key, tier, item, [], text, names, [w[1] for w in wrong], why)

    # -- authorities

    def features(self):
        """Facts only some authorities have: (id, field, wanted value, text, explanation)."""
        rows = (
            ("heir", "has_heir", True, 1,
             ("¿Cuál de estas autoridades tiene un heredero?", "Which of these authorities has an heir?", "後継者がいる統治形態はどれ？"),
             ("tiene heredero", "has an heir", "には後継者がいます")),
            ("re_election", "re_election_allowed", True, 2,
             ("¿Cuál de estas autoridades permite reelegir al gobernante?", "Which of these authorities allows the ruler to be re-elected?", "統治者の再選が認められる統治形態はどれ？"),
             ("permite la reelección", "allows re-election", "では再選が認められます")),
            ("mandates", "uses_mandates", True, 2,
             ("¿Cuál de estas autoridades usa mandatos electorales?", "Which of these authorities uses election mandates?", "選挙公約がある統治形態はどれ？"),
             ("usa mandatos", "uses mandates", "には選挙公約があります")),
            ("no_factions", "has_factions", False, 1,
             ("¿Cuál de estas autoridades no tiene facciones políticas?", "Which of these authorities has no political factions?", "政治派閥がない統治形態はどれ？"),
             ("no tiene facciones", "has no factions", "には派閥がありません")),
            ("no_reform", "can_reform", False, 2,
             ("¿Cuál de estas autoridades no permite reformar el gobierno?", "Which of these authorities does not allow reforming the government?", "政府改革ができない統治形態はどれ？"),
             ("no puede reformarse", "cannot be reformed", "では政府改革ができません")),
        )
        for name, field, wanted, tier, text, tell in rows:
            yes = [a for a, x in self.auths.items() if x.get(field) is wanted]
            no = [a for a, x in self.auths.items() if x.get(field) is (not wanted)]
            if len(no) < 3:
                continue
            for a in yes:
                key = f"{name}.{a}"
                rng = self.b.rng("government", "authority_feature", key)
                names = self.aname(a)
                wrong = gq.pick(rng, names, [(k, self.aname(k)) for k in no], lambda k: k not in rl.REGULAR_AUTHORITIES, pool=5)
                if wrong:
                    self.b.add("government", "authority_feature", key, tier, self.auths[a], self.adlc(a),
                               _sentence(*text), names, [w[1] for w in wrong],
                               _sentence(f"La autoridad «{names['es']}» {tell[0]}.", f"The {names['en']} authority {tell[1]}.",
                                         f"統治形態「{names['jp']}」{tell[2]}。"), gq._icon(self.auths[a]))

    def terms(self):
        for a, x in self.auths.items():
            years = x.get("election_term_years")
            if not isinstance(years, int):
                continue
            names = self.aname(a)
            rng = self.b.rng("government", "authority_term", a)
            wrong = rng.sample([n for n in (5, 10, 15, 20, 25, 30, 40, 50) if n != years], 3)
            self.b.add("government", "authority_term", a, 4, x, self.adlc(a),
                       _sentence(f"¿Cuántos años dura un mandato con la autoridad «{names['es']}»?",
                                 f"How many years is a term with the {names['en']} authority?",
                                 f"統治形態「{names['jp']}」の任期は何年？"),
                       gq.same(str(years)), [gq.same(str(n)) for n in wrong],
                       _sentence(f"El mandato de la autoridad «{names['es']}» dura {years} años.",
                                 f"A term of the {names['en']} authority lasts {years} years.",
                                 f"統治形態「{names['jp']}」の任期は{years}年です。"), gq._icon(x))

    def ethics_and_authorities(self):
        for e in self.ethics:
            ok = [a for a in self.auths if self.allows(a, e)]
            no = [a for a in self.auths if a not in ok]
            if len(no) < 3:
                continue
            for a in ok:
                key = f"{e}.{a}"
                rng = self.b.rng("government", "ethic_authority", key)
                wrong = gq.pick(rng, self.aname(a), [(k, self.aname(k)) for k in no], lambda k: k not in rl.REGULAR_AUTHORITIES, pool=5)
                if not wrong or gq.gives_away(self.aname(a), self.ename(e)):
                    continue
                allowed = [self.aname(k) for k in ok]
                names = self.ename(e)
                self.b.add("government", "ethic_authority", key, 2, self.ethics[e], self.adlc(a),
                           _sentence(f"¿Cuál de estas autoridades puede usar un imperio con la ética {names['es']}?",
                                     f"Which of these authorities can an empire with the ethic {names['en']} use?",
                                     f"倫理観「{names['jp']}」の帝国が選べる統治形態はどれ？"),
                           self.aname(a), [w[1] for w in wrong],
                           _sentence(f"Con {names['es']} se puede usar: {gq.lang_list(allowed, 'es')}.",
                                     f"{names['en']} allows: {gq.lang_list(allowed, 'en')}.",
                                     f"「{names['jp']}」で選べる統治形態：{gq.lang_list(allowed, 'jp')}。"), gq._icon(self.ethics[e]))
        for a, x in self.auths.items():
            banned = [e for e in self.regular if not self.allows(a, e)]
            allowed = [e for e in self.regular if self.allows(a, e)]
            if len(allowed) < 3:
                continue
            for e in banned:
                key = f"{a}.{e}"
                rng = self.b.rng("government", "authority_ethic", key)
                wrong = gq.pick(rng, self.ename(e), [(k, self.ename(k)) for k in allowed],
                                lambda k: self.regular[k]["fanatic"] != self.regular[e]["fanatic"], pool=8)
                if not wrong or gq.gives_away(self.aname(a), self.ename(e)):
                    continue
                names, excluded = self.aname(a), [self.ename(k) for k in banned]
                self.b.add("government", "authority_ethic", key, 2, x, self.adlc(a),
                           _sentence(f"¿Cuál de estas éticas no puede tener un imperio con la autoridad «{names['es']}»?",
                                     f"Which of these ethics can an empire with the {names['en']} authority not have?",
                                     f"統治形態「{names['jp']}」の帝国が採用できない倫理観はどれ？"),
                           self.ename(e), [w[1] for w in wrong],
                           _sentence(f"La autoridad «{names['es']}» excluye: {gq.lang_list(excluded, 'es')}.",
                                     f"The {names['en']} authority excludes: {gq.lang_list(excluded, 'en')}.",
                                     f"統治形態「{names['jp']}」と両立しない倫理観：{gq.lang_list(excluded, 'jp')}。"), gq._icon(x))

    def ethics_and_picks(self):
        """Which civic or origin an ethic rules out."""
        for set_name, template in (("civics", "ethic_civic_forbidden"), ("origins", "ethic_origin_forbidden")):
            items = {k: v for k, v in q_civics.load(self.d, set_name).items()
                     if self.empires.strict(v.rules) and v.group == "regular"}
            for e in sorted(self.regular):
                ok = {k for k, v in items.items() if self.empires.satisfiable([v.key], ethic=e)}
                banned = sorted(k for k, v in items.items() if k not in ok and e in v.rules.ban["ethics"])
                for k in banned:
                    it, names = items[k], self.ename(e)
                    if gq.gives_away(names, it.names):
                        continue
                    key = f"{e}.{k}"
                    rng = self.b.rng("ethics", template, key)
                    wrong = gq.pick(rng, it.names, [(c, items[c].names) for c in ok], lambda c: bool(items[c].dlc) != bool(it.dlc), pool=60)
                    if not wrong:
                        continue
                    what = {"civics": ("principios", "civics", "国是"), "origins": ("orígenes", "origins", "起源")}[set_name]
                    self.b.add("ethics", template, key, max(3, it.tier), it.raw, it.dlc,
                               _sentence(f"¿Cuál de estos {what[0]} no puede elegir un imperio con la ética {names['es']}?",
                                         f"Which of these {what[1]} can an empire with the ethic {names['en']} not pick?",
                                         f"倫理観「{names['jp']}」の帝国が選べない{what[2]}はどれ？"),
                               it.names, [w[1] for w in wrong],
                               _sentence(f"{it.names['es']} excluye la ética {names['es']}.",
                                         f"{it.names['en']} excludes the ethic {names['en']}.",
                                         f"「{it.names['jp']}」は倫理観「{names['jp']}」と両立しません。"), gq._icon(it.raw))

    def ethic_authority_civic(self):
        """Tier 4: with this authority and ethic, which civic can be taken."""
        civics = {k: v for k, v in q_civics.load(self.d, "civics").items() if self.empires.strict(v.rules)}
        for k, it in sorted(civics.items()):
            if it.group != "regular" or not it.rules.need["ethics"]:
                continue
            required = set().union(*it.rules.need["ethics"])
            pairs = [(a, e) for a in self.auths for e in sorted(required & self.regular.keys())
                     if not self.regular[e]["fanatic"] and self.empires.satisfiable([it.key], authority=a, ethic=e)]
            if not pairs:
                continue
            rng = self.b.rng("government", "ethic_authority_civic", k)
            a, e = rng.choice(pairs)
            no = [(c, v.names) for c, v in civics.items() if c != k and v.group == "regular"
                  and not self.empires.satisfiable([v.key], authority=a, ethic=e)]
            wrong = gq.pick(rng, it.names, no, lambda c: bool(civics[c].dlc) != bool(it.dlc), pool=60)
            if not wrong:
                continue
            an, en = self.aname(a), self.ename(e)
            self.b.add("government", "ethic_authority_civic", k, max(4, it.tier), it.raw, it.dlc + self.adlc(a),
                       _sentence(f"Con la autoridad «{an['es']}» y la ética {en['es']}, ¿cuál de estos principios se puede elegir?",
                                 f"With the {an['en']} authority and the ethic {en['en']}, which of these civics can be taken?",
                                 f"統治形態「{an['jp']}」と倫理観「{en['jp']}」の帝国が選べる国是はどれ？"),
                       it.names, [w[1] for w in wrong],
                       _sentence(f"Solo {it.names['es']} es compatible con esa autoridad y esa ética a la vez.",
                                 f"Only {it.names['en']} fits that authority and that ethic together.",
                                 f"その統治形態と倫理観の両方に合うのは「{it.names['jp']}」だけです。"), gq._icon(it.raw))

    def variants(self):
        """The names an authority takes after an ascension or with some origins (its swaps)."""
        variants = []
        for a, x in self.auths.items():
            for s in x.get("swaps") or []:
                names = self.d.name("authorities", s["id"])
                if names and s["id"] not in {v[1]["id"] for v in variants}                         and not any(gq.gives_away(names, self.aname(k)) for k in self.auths):
                    variants.append((a, s, names))
        for a, s, names in variants:
            x, base = self.auths[a], self.aname(a)
            dlc = s.get("dlc") or []
            why = _sentence(f"{names['es']} es una variante de la autoridad «{base['es']}».",
                            f"{names['en']} is a variant of the {base['en']} authority.",
                            f"「{names['jp']}」は統治形態「{base['jp']}」の派生形です。")
            rng = self.b.rng("government", "authority_variant_base", s["id"])
            wrong = gq.pick(rng, base, [(k, self.aname(k)) for k in self.auths if k != a], lambda k: 0, pool=6)
            if wrong:
                self.b.add("government", "authority_variant_base", s["id"], 4, x, dlc,
                           _sentence(f"¿De qué autoridad es variante {names['es']}?",
                                     f"{names['en']} is a variant of which authority?",
                                     f"「{names['jp']}」はどの統治形態の派生形？"),
                           base, [w[1] for w in wrong], why, gq._icon(s))
            rng = self.b.rng("government", "authority_variant", s["id"])
            cands = [(v["id"], n) for k, v, n in variants if k != a]
            kind = s["id"].split("_")[1]
            wrong = gq.pick(rng, names, cands, lambda i: i.split("_")[1] != kind, pool=12)
            if wrong:
                self.b.add("government", "authority_variant", s["id"], 5, x, dlc,
                           _sentence(f"¿Cuál de estas es una variante de la autoridad «{base['es']}»?",
                                     f"Which of these is a variant of the {base['en']} authority?",
                                     f"統治形態「{base['jp']}」の派生形はどれ？"),
                           names, [w[1] for w in wrong], why)

    def not_playable(self):
        for x in self.d.items("authorities"):
            names = self.d.name("authorities", x["id"])
            if x["id"] in rl.PLAYER_AUTHORITIES or not names or gq.playable(x):
                continue
            rng = self.b.rng("government", "authority_not_playable", x["id"])
            wrong = gq.pick(rng, names, [(k, self.aname(k)) for k in self.auths], lambda k: 0, pool=7)
            if wrong:
                self.b.add("government", "authority_not_playable", x["id"], 5, x, [],
                           _sentence("¿Cuál de estas autoridades no puede elegir un jugador?",
                                     "Which of these authorities can a player not pick?",
                                     "プレイヤーが選べない統治形態はどれ？"),
                           names, [w[1] for w in wrong],
                           _sentence(f"{names['es']} es una autoridad solo para países que no controlan los jugadores.",
                                     f"{names['en']} is only for countries that players do not control.",
                                     f"「{names['jp']}」はプレイヤーが操作しない国家専用です。"), gq._icon(x))


def generate(b):
    g = Government(b)
    g.points()
    g.combinations()
    g.features()
    g.terms()
    g.ethics_and_authorities()
    g.ethics_and_picks()
    g.ethic_authority_civic()
    g.variants()
    g.not_playable()
