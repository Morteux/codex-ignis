"""Templates of origins and civics (T4102): which is which, authority and ethics requirements,
incompatibilities, corporate counterparts, starting worlds and the items no player can pick."""
import generate_questions as gq
import rules as rl

# Questions per template and tier, lower than the default so that no template fills the topic
CAPS = {
    "civic_kind": 12, "origin_kind": 12, "civic_group": 15, "civic_authority": 20, "civic_requires_ethic": 15,
    "civic_incompatible": 25, "origin_incompatible_civic": 25, "origin_ethic_required": 20,
    "origin_ethic_forbidden": 15, "origin_authority": 15, "origin_start_planet": 15, "civic_corporate_version": 20,
    "civic_combo": 25, "origin_combo": 15, "civic_not_playable": 25, "origin_not_playable": 15,
}
SINGULAR = {"civics": "civic", "origins": "origin"}
THE = {"civics": ("el principio", "the civic", "国是"), "origins": ("el origen", "the origin", "起源")}
GROUPS = {"auth_corporate": "corporate", "auth_hive_mind": "hive", "auth_machine_intelligence": "machine"}
# Words of a civic name that point at its authority
HINTS = {
    "auth_corporate": ("corporat", "corpora", "企業"),
    "auth_hive_mind": ("hive", "colmena", "集合"),
    "auth_machine_intelligence": ("machine", "mecánic", "máquina", "機械"),
}


def hints_at(names, authority):
    return any(h in names[lang].casefold() for h in HINTS.get(authority, ()) for lang in gq.LOC_FILES)


class Item:
    def __init__(self, set_name, raw, names, dlc, rules):
        self.set, self.raw, self.id, self.names, self.dlc, self.rules = set_name, raw, raw["id"], names, dlc, rules
        self.tier = gq.civic_obscurity(raw)
        need = rules.need["authority"] if rules else []
        only = set.intersection(*need) if need else set()
        gestalt = rules and {rl.GESTALT} in rules.need["ethics"]
        self.group = (GROUPS.get(next(iter(only))) if len(only) == 1 else None) or ("gestalt" if gestalt else "regular")

    @property
    def key(self):
        return (self.id, self.set, self.rules)


def load(d, set_name):
    """The civics or origins a player can pick, with their official names and readable DLC."""
    out = {}
    origins = {c["id"] for c in d.items("origins") if gq.playable(c)}
    for c in d.items(set_name):
        names = d.name(set_name, c["id"])
        reliable, dlc = gq.condition_check(c, gq.CIVIC_FIELDS)
        if not (names and reliable and gq.playable(c)):
            continue
        rules = rl.read(c)
        if rules and any(not need & origins for need in rules.need["origin"]):
            continue  # needs an origin no empire can pick
        out[c["id"]] = Item(set_name, c, names, dlc, rules)
    return out


def _sentence(es, en, jp):
    return {"es": es, "en": en, "jp": jp}


def kinds(b, civics, origins):
    """Tier 1: which of four names is an origin (or a civic)."""
    basic = {s: {k: v for k, v in items.items() if v.tier == 1 and v.group == "regular" and not v.dlc}
             for s, items in (("civics", civics), ("origins", origins))}
    for own, other, topic in (("origins", "civics", "origins"), ("civics", "origins", "civics")):
        for key, it in basic[own].items():
            template = f"{SINGULAR[own]}_kind"
            rng = b.rng(topic, template, key)
            wrong = gq.pick(rng, it.names, [(k, v.names) for k, v in basic[other].items()], lambda k: 0, pool=60)
            if not wrong:
                continue
            ask = {"origins": ("un origen (y no un principio)", "an origin (and not a civic)", "起源（国是ではない）"),
                   "civics": ("un principio (y no un origen)", "a civic (and not an origin)", "国是（起源ではない）")}[own]
            tell = {"origins": ("un origen; las otras tres opciones son principios", "an origin; the other three are civics", "起源で、他の3つは国是です"),
                    "civics": ("un principio; las otras tres opciones son orígenes", "a civic; the other three are origins", "国是で、他の3つは起源です")}[own]
            b.add(topic, template, key, 1, it.raw, it.dlc,
                  _sentence(f"¿Cuál de estas opciones es {ask[0]}?", f"Which of these is {ask[1]}?", f"次のうち{ask[2]}はどれ？"),
                  it.names, [w[1] for w in wrong],
                  _sentence(f"{it.names['es']} es {tell[0]}.", f"{it.names['en']} is {tell[1]}.", f"「{it.names['jp']}」は{tell[2]}。"),
                  gq._icon(it.raw))


def groups(b, empires, civics):
    """Which civic belongs to megacorporations, hive minds or machine intelligences."""
    for key, it in civics.items():
        need = it.rules.need["authority"] if it.rules else []
        if it.group not in GROUPS.values() or not need:
            continue
        auth = next(iter(set.intersection(*need)))
        if hints_at(it.names, auth):
            continue
        aname = b.d.name("authorities", auth)
        rng = b.rng("civics", "civic_group", key)
        cands = [(k, v.names) for k, v in civics.items()
                 if k != key and empires.strict(v.rules) and not hints_at(v.names, auth)
                 and not empires.satisfiable([v.key], authority=auth)]
        wrong = gq.pick(rng, it.names, cands, lambda k: civics[k].group == "regular" and it.group != "corporate", pool=80)
        if wrong:
            b.add("civics", "civic_group", key, it.tier, it.raw, it.dlc,
                  _sentence(f"¿Cuál de estos principios es exclusivo de la autoridad «{aname['es']}»?",
                            f"Which of these civics is exclusive to the {aname['en']} authority?",
                            f"統治形態「{aname['jp']}」専用の国是はどれ？"),
                  it.names, [w[1] for w in wrong],
                  _sentence(f"{it.names['es']} exige la autoridad «{aname['es']}»; los otros tres no se pueden elegir con ella.",
                            f"{it.names['en']} requires the {aname['en']} authority; the other three cannot be taken with it.",
                            f"「{it.names['jp']}」には統治形態「{aname['jp']}」が必要で、他の3つはこの統治形態では選べません。"),
                  gq._icon(it.raw))


def authorities(b, empires, items, set_name):
    """Which authority can take a civic or origin that restricts the authority."""
    for key, it in items.items():
        r = it.rules
        if not r or not empires.strict(r) or not (r.need["authority"] or r.ban["authority"]):
            continue
        if set_name == "civics" and it.group != "regular":
            continue
        ok = [a for a in rl.PLAYER_AUTHORITIES if empires.satisfiable([it.key], authority=a)]
        no = [a for a in rl.PLAYER_AUTHORITIES if a not in ok]
        names = {a: b.d.name("authorities", a) for a in rl.PLAYER_AUTHORITIES}
        ok = [a for a in ok if names[a] and not gq.gives_away(names[a], it.names)]
        if not ok or len(no) < 3:
            continue
        topic, template = set_name, f"{SINGULAR[set_name]}_authority"
        rng = b.rng(topic, template, key)
        correct = rng.choice(sorted(ok))
        wrong = gq.pick(rng, names[correct], [(a, names[a]) for a in no], lambda a: a not in rl.REGULAR_AUTHORITIES, pool=5)
        if not wrong:
            continue
        allowed = [names[a] for a in rl.PLAYER_AUTHORITIES if a in ok or empires.satisfiable([it.key], authority=a)]
        the = THE[set_name]
        b.add(topic, template, key, max(2, it.tier), it.raw, it.dlc,
              _sentence(f"¿Con cuál de estas autoridades se puede elegir {the[0]} {it.names['es']}?",
                        f"With which of these authorities can {the[1]} {it.names['en']} be taken?",
                        f"{the[2]}「{it.names['jp']}」を選べる統治形態はどれ？"),
              names[correct], [w[1] for w in wrong],
              _sentence(f"{it.names['es']} admite estas autoridades: {gq.lang_list(allowed, 'es')}.",
                        f"{it.names['en']} allows these authorities: {gq.lang_list(allowed, 'en')}.",
                        f"「{it.names['jp']}」を選べる統治形態：{gq.lang_list(allowed, 'jp')}。"),
              gq._icon(it.raw))


def _ethic_pair(rules):
    """The regular ethic an item certainly requires (one need set within {ethic, fanatic ethic})."""
    for need in rules.need["ethics"]:
        regular = sorted(e for e in need if e != rl.GESTALT and not e.startswith("ethic_fanatic_"))
        if len(regular) == 1 and need <= {regular[0], regular[0].replace("ethic_", "ethic_fanatic_")}:
            return regular[0]
    return None


def requires_ethic(b, empires, civics):
    """Reverse question: which civic can only be taken with a given ethic."""
    for key, it in civics.items():
        if not it.rules or not empires.strict(it.rules) or it.group != "regular":
            continue
        ethic = _ethic_pair(it.rules)
        if not ethic:
            continue
        fanatic = ethic.replace("ethic_", "ethic_fanatic_")
        ename, fname = b.d.name("ethics", ethic), b.d.name("ethics", fanatic)
        if not ename or not fname or gq.gives_away(ename, it.names):
            continue
        without = rl.Rules()
        without.ban["ethics"] = {ethic, fanatic}
        probe = ("probe", "probe", without)
        cands = [(k, v.names) for k, v in civics.items()
                 if k != key and v.group == "regular" and v.rules and empires.strict(v.rules)
                 and empires.satisfiable([v.key, probe])]
        rng = b.rng("civics", "civic_requires_ethic", key)
        wrong = gq.pick(rng, it.names, cands, lambda k: bool(civics[k].dlc) != bool(it.dlc), pool=60)
        if wrong:
            b.add("civics", "civic_requires_ethic", key, max(3, it.tier), it.raw, it.dlc,
                  _sentence(f"¿Cuál de estos principios exige la ética {ename['es']} o {fname['es']}?",
                            f"Which of these civics requires the ethic {ename['en']} or {fname['en']}?",
                            f"倫理観「{ename['jp']}」か「{fname['jp']}」が必要な国是はどれ？"),
                  it.names, [w[1] for w in wrong],
                  _sentence(f"{it.names['es']} necesita {ename['es']} o {fname['es']}; los otros tres se pueden elegir sin ellas.",
                            f"{it.names['en']} needs {ename['en']} or {fname['en']}; the other three can be taken without them.",
                            f"「{it.names['jp']}」には「{ename['jp']}」か「{fname['jp']}」が必要で、他の3つはどちらもなくても選べます。"),
                  gq._icon(it.raw))


def _excludes(x, y):
    return y.id in x.rules.ban[y.set if y.set == "civics" else "origin"]


def incompatible(b, empires, civics, subjects, set_name):
    """Which civic cannot be combined with a civic or an origin."""
    topic = set_name
    template = "civic_incompatible" if set_name == "civics" else "origin_incompatible_civic"
    for key, x in subjects.items():
        if not x.rules or not empires.strict(x.rules):
            continue
        banned = [v for k, v in civics.items() if k != key and v.rules and empires.strict(v.rules)
                  and (_excludes(x, v) or _excludes(v, x)) and not gq.gives_away(v.names, x.names)]
        if not banned:
            continue
        rng = b.rng(topic, template, key)
        for y in rng.sample(sorted(banned, key=lambda v: v.id), len(banned)):
            cands = [(k, v.names) for k, v in civics.items()
                     if k not in (key, y.id) and v.group == y.group and v.rules and empires.strict(v.rules)
                     and empires.satisfiable([x.key, v.key])]
            wrong = gq.pick(rng, y.names, cands, lambda k: bool(civics[k].dlc) != bool(y.dlc), pool=60)
            if wrong:
                break
        else:
            continue
        the = THE[set_name]
        b.add(topic, template, key, max(3, x.tier, y.tier), x.raw, x.dlc + y.dlc,
              _sentence(f"¿Cuál de estos principios es incompatible con {the[0]} {x.names['es']}?",
                        f"Which of these civics is incompatible with {the[1]} {x.names['en']}?",
                        f"{the[2]}「{x.names['jp']}」と両立しない国是はどれ？"),
              y.names, [w[1] for w in wrong],
              _sentence(f"Las reglas del juego impiden combinar {x.names['es']} con {y.names['es']}.",
                        f"The game rules do not allow {x.names['en']} together with {y.names['en']}.",
                        f"ゲームのルールでは「{x.names['jp']}」と「{y.names['jp']}」を同時に選べません。"),
              gq._icon(x.raw))


def origin_ethics(b, empires, origins):
    ethics = gq.regular_ethics(b.d)
    ename = lambda e: b.d.name("ethics", e)
    for key, x in origins.items():
        r = x.rules
        if not r or not empires.strict(r):
            continue
        if len(r.need["ethics"]) == 1 and r.need["ethics"][0] - {rl.GESTALT}:
            need = r.need["ethics"][0]
            ok = sorted(e for e in need if e in ethics and ename(e) and empires.satisfiable([x.key], ethic=e))
            if ok:
                rng = b.rng("origins", "origin_ethic_required", key)
                eid = rng.choice([e for e in ok if not ethics[e]["fanatic"]] or ok)
                cands = [(e, ename(e)) for e in sorted(ethics) if e not in need and ename(e)]
                wrong = gq.pick(rng, ename(eid), cands, lambda e: ethics[e]["fanatic"] != ethics[eid]["fanatic"], pool=8)
                req = [ename(e) for e in sorted(need) if ename(e)]
                if wrong:
                    b.add("origins", "origin_ethic_required", key, max(2, x.tier), x.raw, x.dlc,
                          _sentence(f"¿Cuál de estas éticas cumple el requisito de ética del origen {x.names['es']}?",
                                    f"Which of these ethics meets the ethics requirement of the origin {x.names['en']}?",
                                    f"起源「{x.names['jp']}」の倫理観の条件を満たすのはどれ？"),
                          ename(eid), [w[1] for w in wrong],
                          _sentence(f"{x.names['es']} requiere una de estas éticas: {gq.lang_list(req, 'es')}.",
                                    f"{x.names['en']} requires one of these ethics: {gq.lang_list(req, 'en')}.",
                                    f"「{x.names['jp']}」には次のいずれかの倫理観が必要です：{gq.lang_list(req, 'jp')}。"),
                          gq._icon(x.raw))
        banned = sorted(e for e in r.ban["ethics"] if e in ethics and ename(e))
        if banned:
            rng = b.rng("origins", "origin_ethic_forbidden", key)
            eid = rng.choice([e for e in banned if not ethics[e]["fanatic"]] or banned)
            cands = [(e, ename(e)) for e in sorted(ethics) if ename(e) and empires.satisfiable([x.key], ethic=e)]
            wrong = gq.pick(rng, ename(eid), cands, lambda e: ethics[e]["fanatic"] != ethics[eid]["fanatic"], pool=8)
            if wrong:
                excl = [ename(e) for e in banned]
                b.add("origins", "origin_ethic_forbidden", key, max(2, x.tier), x.raw, x.dlc,
                      _sentence(f"¿Cuál de estas éticas no puede tener un imperio con el origen {x.names['es']}?",
                                f"Which of these ethics can an empire with the origin {x.names['en']} not have?",
                                f"起源「{x.names['jp']}」の帝国が採用できない倫理観はどれ？"),
                      ename(eid), [w[1] for w in wrong],
                      _sentence(f"{x.names['es']} excluye: {gq.lang_list(excl, 'es')}.",
                                f"{x.names['en']} excludes: {gq.lang_list(excl, 'en')}.",
                                f"「{x.names['jp']}」と両立しない倫理観：{gq.lang_list(excl, 'jp')}。"),
                      gq._icon(x.raw))


def start_planet(b, origins):
    classes = {p["id"]: b.d.name("planet_classes", p["id"]) for p in b.d.items("planet_classes")}
    used = sorted({x.raw["starting_colony"] for x in origins.values() if x.raw.get("starting_colony")})
    others = sorted(p["id"] for p in b.d.items("planet_classes") if p.get("colonizable"))
    for key, x in origins.items():
        pc = x.raw.get("starting_colony")
        if not pc or not classes.get(pc) or gq.gives_away(classes[pc], x.names):
            continue
        rng = b.rng("origins", "origin_start_planet", key)
        cands = [(p, classes[p]) for p in others if p != pc and classes.get(p)]
        wrong = gq.pick(rng, classes[pc], cands, lambda p: p not in used, pool=12)
        if wrong:
            b.add("origins", "origin_start_planet", key, max(2, x.tier), x.raw, x.dlc,
                  _sentence(f"¿En qué tipo de mundo empieza un imperio con el origen {x.names['es']}?",
                            f"On which kind of world does an empire with the origin {x.names['en']} start?",
                            f"起源「{x.names['jp']}」の帝国の母星のタイプはどれ？"),
                  classes[pc], [w[1] for w in wrong],
                  _sentence(f"El mundo inicial de {x.names['es']} es: {classes[pc]['es']}.",
                            f"The starting world of {x.names['en']} is: {classes[pc]['en']}.",
                            f"「{x.names['jp']}」の開始惑星：{classes[pc]['jp']}。"),
                  gq._icon(x.raw))


def corporate_version(b, civics):
    pairs = {}
    for k, v in civics.items():
        other = v.raw.get("alternate_civic_version")
        if other in civics:
            pair = {v.group: v, civics[other].group: civics[other]}
            if set(pair) == {"regular", "corporate"}:
                pairs[pair["regular"].id] = (pair["regular"], pair["corporate"])
    for key, (x, y) in sorted(pairs.items()):
        if gq.gives_away(x.names, y.names):
            continue
        rng = b.rng("civics", "civic_corporate_version", key)
        cands = [(k, v.names) for k, v in civics.items() if v.group == "corporate" and k != y.id
                 and not gq.gives_away(v.names, x.names)]
        wrong = gq.pick(rng, y.names, cands, lambda k: bool(civics[k].dlc) != bool(y.dlc), pool=30)
        if wrong:
            b.add("civics", "civic_corporate_version", key, max(3, x.tier, y.tier), x.raw, x.dlc + y.dlc,
                  _sentence(f"¿Qué principio es la versión corporativa de {x.names['es']}?",
                            f"Which civic is the corporate version of {x.names['en']}?",
                            f"国是「{x.names['jp']}」の企業版はどれ？"),
                  y.names, [w[1] for w in wrong],
                  _sentence(f"La versión corporativa de {x.names['es']} es {y.names['es']}.",
                            f"The corporate version of {x.names['en']} is {y.names['en']}.",
                            f"「{x.names['jp']}」の企業版は「{y.names['jp']}」です。"),
                  gq._icon(x.raw))


def combos(b, empires, items, set_name):
    """Tier 4: the authority and ethic together that allow a civic or origin restricting both."""
    ethics = gq.regular_ethics(b.d)
    anames = {a: b.d.name("authorities", a) for a in rl.REGULAR_AUTHORITIES + ("auth_corporate",)}
    enames = {e: b.d.name("ethics", e) for e in ethics if not ethics[e]["fanatic"]}

    def joined(a, e):
        return {lang: f"{anames[a][lang]} + {enames[e][lang]}" for lang in gq.LOC_FILES}

    for key, x in items.items():
        r = x.rules
        if not r or not empires.strict(r) or not (r.need["authority"] or r.ban["authority"]):
            continue
        required = set().union(*r.need["ethics"]) if r.need["ethics"] else set()
        if not required:
            continue
        # every legal (authority, ethic) pair, split into the ones the item allows and the rest
        legal = [(a, e) for a in anames for e in enames
                 if anames[a] and enames[e] and empires.satisfiable([(a, "x", empires.authorities[a])], authority=a, ethic=e)]
        ok = [(a, e) for a, e in legal if e in required and empires.satisfiable([x.key], authority=a, ethic=e)]
        no = [(a, e) for a, e in legal if not empires.satisfiable([x.key], authority=a, ethic=e)]
        if not ok or len(no) < 3:
            continue
        topic, template = set_name, f"{SINGULAR[set_name]}_combo"
        rng = b.rng(topic, template, key)
        a, e = rng.choice(sorted(ok))
        # closest wrong answers share the authority or the ethic with the right one
        wrong = gq.pick(rng, joined(a, e), [(p, joined(*p)) for p in no], lambda p: p[0] != a and p[1] != e, pool=10)
        if not wrong:
            continue
        the = THE[set_name]
        b.add(topic, template, key, max(4, x.tier), x.raw, x.dlc,
              _sentence(f"¿Qué combinación de autoridad y ética permite elegir {the[0]} {x.names['es']}?",
                        f"Which combination of authority and ethic allows {the[1]} {x.names['en']}?",
                        f"{the[2]}「{x.names['jp']}」を選べる統治形態と倫理観の組み合わせはどれ？"),
              joined(a, e), [w[1] for w in wrong],
              _sentence(f"{x.names['es']} se puede elegir con la autoridad «{anames[a]['es']}» y la ética {enames[e]['es']}; las otras combinaciones no lo permiten.",
                        f"{x.names['en']} can be taken with the {anames[a]['en']} authority and the ethic {enames[e]['en']}; the other combinations do not allow it.",
                        f"「{x.names['jp']}」は統治形態「{anames[a]['jp']}」と倫理観「{enames[e]['jp']}」で選べます。他の組み合わせでは選べません。"),
              gq._icon(x.raw))


def not_playable(b, civics, origins):
    """Tier 5: civics of non-player countries and origins no empire creation offers."""
    d = b.d
    for set_name, topic, playable in (("civics", "civics", civics), ("origins", "origins", origins)):
        for c in d.items(set_name):
            names = d.name(set_name, c["id"])
            reliable, dlc = gq.condition_check(c, gq.CIVIC_FIELDS)
            if not names or not reliable or gq.playable(c):
                continue
            if set_name == "civics" and not gq.country_restricted(c):
                continue
            if set_name == "origins" and "always = no" not in (c.get("playable") or ""):
                continue
            template = f"{SINGULAR[set_name]}_not_playable"
            rng = b.rng(topic, template, c["id"])
            gestalt = "value = ethic_gestalt_consciousness" in (c.get("potential") or "")
            cands = [(k, v.names) for k, v in playable.items()]
            wrong = gq.pick(rng, names, cands, lambda k: (playable[k].group != "regular") != gestalt, pool=60)
            if not wrong:
                continue
            if set_name == "civics":
                text = _sentence("¿Cuál de estos principios es exclusivo de países que no controlan los jugadores?",
                                 "Which of these civics is exclusive to countries that players do not control?",
                                 "次のうちプレイヤーが操作しない国家専用の国是はどれ？")
                why = _sentence(f"{names['es']} solo existe para países que no controlan los jugadores.",
                                f"{names['en']} only exists for countries that players do not control.",
                                f"「{names['jp']}」はプレイヤーが操作しない国家にのみ存在します。")
            else:
                text = _sentence("¿Cuál de estos orígenes no se puede elegir al crear un imperio?",
                                 "Which of these origins cannot be picked when creating an empire?",
                                 "次のうち帝国作成時に選べない起源はどれ？")
                why = _sentence(f"{names['es']} no se ofrece en la creación de imperios.",
                                f"{names['en']} is not offered in empire creation.",
                                f"「{names['jp']}」は帝国作成画面では選べません。")
            b.add(topic, template, c["id"], 5, c, dlc, text, names, [w[1] for w in wrong], why)


def generate(b):
    empires = rl.Empires(b.d)
    civics, origins = load(b.d, "civics"), load(b.d, "origins")
    kinds(b, civics, origins)
    groups(b, empires, civics)
    authorities(b, empires, civics, "civics")
    authorities(b, empires, origins, "origins")
    requires_ethic(b, empires, civics)
    incompatible(b, empires, civics, civics, "civics")
    incompatible(b, empires, civics, origins, "origins")
    origin_ethics(b, empires, origins)
    start_planet(b, origins)
    corporate_version(b, civics)
    combos(b, empires, civics, "civics")
    combos(b, empires, origins, "origins")
    not_playable(b, civics, origins)
