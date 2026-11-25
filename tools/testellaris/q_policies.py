"""Policy and edict templates (T4107): policies and their options, the ethics and civics that open or
close an option, and edict requirements, costs, lock-in, wartime edicts, ambitions and DLC. The
4.5.4 extractor output has no traditions, ascension perks or decisions."""
import generate_questions as gq
from pdx.parser import Block, parse

CAPS = {
    "policy_option": 25, "option_policy": 25, "option_ethic": 20, "option_civic": 10,
    "edict_cost": 20, "edict_same_resource": 25, "edict_lock": 15, "edict_ethic": 10,
    "edict_authority": 15, "edict_origin": 10, "edict_wartime": 10, "edict_dlc": 12, "ambition_technology": 4,
}
# Scripted triggers that stand for one ethic and its fanatic form
ETHIC_TRIGGERS = {f"is_{e}": e for e in ("militarist", "pacifist", "xenophobe", "xenophile", "egalitarian",
                                          "authoritarian", "materialist", "spiritualist")}
AUTHORITY_TRIGGERS = {"is_democratic_authority": "auth_democratic", "is_oligarchic_authority": "auth_oligarchic",
                      "is_dictatorial_authority": "auth_dictatorial", "is_imperial_authority": "auth_imperial",
                      "is_megacorp": "auth_corporate"}
# Condition keys that cannot rule an ethic in or out by themselves; an option with any other key is
# not asked about ethics (a scripted trigger could hide one)
NO_ETHIC_KEYS = {
    "NOT", "NOR", "OR", "AND", "if", "else_if", "else", "limit", "custom_tooltip", "text", "fail_text", "success_text",
    "is_homicidal", "is_nomadic", "is_country_type", "has_valid_civic", "has_civic", "has_policy_flag", "has_modifier",
    "has_tradition", "has_origin", "has_megacorp", "is_megacorp", "is_primitive", "has_menace_perk", "always",
}


def _sentence(es, en, jp):
    return {"es": es, "en": en, "jp": jp}


def block_of(text):
    """The parsed condition, an empty block for none, or None if it cannot be read."""
    try:
        return parse(text or "")
    except Exception:  # noqa: BLE001 — an unreadable condition makes the item unusable
        return None


def keys_of(block):
    for k, _, v in block.entries:
        yield k
        if isinstance(v, Block):
            yield from keys_of(v)


def blocked_ethics(text):
    """Ethic ids a condition certainly rules out: the lines of its top-level NOT / NOR blocks and its
    top-level `is_<ethic> = no`."""
    block = block_of(text)
    out = set()
    for k, _, v in (block.entries if block is not None else []):
        if k in ETHIC_TRIGGERS and v is False:
            out |= {f"ethic_{ETHIC_TRIGGERS[k]}", f"ethic_fanatic_{ETHIC_TRIGGERS[k]}"}
        if k not in ("NOT", "NOR") or not isinstance(v, Block) or (k == "NOT" and len(v.entries) != 1):
            continue
        for k2, _, v2 in v.entries:
            if k2 == "has_ethic":
                out.add(str(v2).strip('"'))
            elif k2 in ETHIC_TRIGGERS and v2 is True:
                out |= {f"ethic_{ETHIC_TRIGGERS[k2]}", f"ethic_fanatic_{ETHIC_TRIGGERS[k2]}"}
            elif k2 == f"is_fanatic_{ETHIC_TRIGGERS.get('is_' + k2[11:], '')}" and v2 is True:
                out.add(f"ethic_fanatic_{k2[11:]}")
    return out


def required_civics(text):
    """The civics of a condition that is only `has_valid_civic` lines (one, or one OR of them)."""
    block = block_of(text)
    if block is None:
        return set()
    entries = block.entries
    if len(entries) == 1 and entries[0][0] == "OR" and isinstance(entries[0][2], Block):
        entries = entries[0][2].entries
    elif len(entries) != 1:
        return set()
    if any(k != "has_valid_civic" for k, _, _ in entries):
        return set()
    return {str(v).strip('"') for _, _, v in entries}


def top_lines(text):
    """[(key, value)] of the plain top-level lines of a condition."""
    block = block_of(text)
    return [(k, v) for k, _, v in (block.entries if block is not None else []) if not isinstance(v, Block)]


class Policies:
    def __init__(self, b):
        self.b, self.d = b, b.d

    def add(self, template, key, tier, item, dlc, text, correct, wrong, why):
        self.b.add("policies", template, key, tier, item, dlc, text, correct, wrong, why, gq._icon(item))

    def pick(self, template, key, correct, candidates, closeness=lambda k: 0, pool=30):
        rng = self.b.rng("policies", template, key)
        got = gq.pick(rng, correct, candidates, closeness, pool=pool)
        return [w[1] for w in got] if got else None

    # -- policies

    def usable_options(self):
        """{policy id: (policy, names, DLC, [(option, names, DLC)])} of the policies players see."""
        out = {}
        for p in self.d.items("policies"):
            names = self.d.name("policies", p["id"])
            reliable, dlc = gq.condition_check(p, ("potential", "allow"))
            if not names or not reliable or "always = no" in (p.get("potential") or ""):
                continue
            options = []
            for o in p["options"]:
                oname = self.d.label("policies", o["id"])
                ok, odlc = gq.condition_check(o, ("potential", "valid"))
                if oname and ok and "always = no" not in (o.get("potential") or ""):
                    options.append((o, oname, odlc))
            out[p["id"]] = (p, names, dlc, options)
        return out

    def option_questions(self):
        policies = self.usable_options()
        # option names of every policy, usable or not: a wrong answer must belong to no namesake
        every = {pid: {self.d.label("policies", o["id"])["en"] for o in p["options"] if self.d.label("policies", o["id"])}
                 for pid, (p, _, _, _) in policies.items()}
        for pid, (p, names, dlc, options) in policies.items():
            for o, oname, odlc in options:
                key = f"{pid}.{o['id']}"
                limited = any(t in (o.get("potential") or "") for t in ("fallen_empire", "primitive", "marauders")) \
                    and "default" not in (o.get("potential") or "")
                cands = [(f"{k}.{x[0]['id']}", x[1]) for k, v in policies.items() if k != pid for x in v[3]
                         if x[1]["en"] not in every[pid]]
                wrong = self.pick("policy_option", key, oname, cands, pool=60)
                if wrong and not gq.gives_away(oname, names):
                    self.add("policy_option", key, 4 if limited else 2, p, dlc + odlc,
                             _sentence(f"¿Cuál de estas es una opción de la política «{names['es']}»?",
                                       f"Which of these is an option of the policy {names['en']}?",
                                       f"政策「{names['jp']}」の選択肢はどれ？"),
                             oname, wrong,
                             _sentence(f"«{oname['es']}» es una opción de la política «{names['es']}».",
                                       f"{oname['en']} is an option of the policy {names['en']}.",
                                       f"「{oname['jp']}」は政策「{names['jp']}」の選択肢です。"))
                if sum(oname["en"] in v for v in every.values()) != 1 or gq.gives_away(names, oname):
                    continue
                cands = [(k, v[1]) for k, v in policies.items() if k != pid]
                wrong = self.pick("option_policy", key, names, cands,
                                  lambda k: policies[k][0]["category"] != p["category"], pool=8)
                if wrong:
                    self.add("option_policy", key, 4 if limited else 2, p, dlc + odlc,
                             _sentence(f"¿A qué política pertenece la opción «{oname['es']}»?",
                                       f"Which policy does the option {oname['en']} belong to?",
                                       f"選択肢「{oname['jp']}」はどの政策のもの？"),
                             names, wrong,
                             _sentence(f"«{oname['es']}» es una opción de la política «{names['es']}».",
                                       f"{oname['en']} is an option of the policy {names['en']}.",
                                       f"「{oname['jp']}」は政策「{names['jp']}」の選択肢です。"))
        for pid, (p, names, dlc, options) in policies.items():
            for o, oname, odlc in options:
                self.option_rules(p, names, o, oname, dlc + odlc)

    def option_rules(self, p, names, o, oname, dlc):
        key = f"{p['id']}.{o['id']}"
        text = "\n".join(o.get(f) or "" for f in ("potential", "valid"))
        ethics = {e["id"]: e for e in self.d.items("ethics") if e["id"] != "ethic_gestalt_consciousness"}
        ename = {e: self.d.name("ethics", e) for e in ethics if self.d.name("ethics", e)}
        blocked = (blocked_ethics(o.get("valid")) | blocked_ethics(o.get("potential"))) & ename.keys()
        block = block_of(text)
        if blocked and block is not None and set(keys_of(block)) <= NO_ETHIC_KEYS | set(ETHIC_TRIGGERS) | {"has_ethic", "is_fanatic_militarist"}:
            regular = sorted(e for e in blocked if not ethics[e]["fanatic"]) or sorted(blocked)
            eid = self.b.rng("policies", "option_ethic", key).choice(regular)
            # an ethic is a wrong answer only if neither it nor its other form is named at all
            free = [(e, n) for e, n in ename.items() if e.replace("ethic_fanatic_", "").replace("ethic_", "") not in text]
            wrong = self.pick("option_ethic", key, ename[eid], free, lambda e: ethics[e]["fanatic"] != ethics[eid]["fanatic"], pool=8)
            if wrong:
                listed = [ename[e] for e in sorted(blocked)]
                self.add("option_ethic", key, 3, p, dlc,
                         _sentence(f"¿Qué ética impide elegir «{oname['es']}» en la política «{names['es']}»?",
                                   f"Which ethic prevents choosing {oname['en']} in the policy {names['en']}?",
                                   f"政策「{names['jp']}」で「{oname['jp']}」を選べなくする倫理観はどれ？"),
                         ename[eid], wrong,
                         _sentence(f"«{oname['es']}» no se puede elegir con: {gq.lang_list(listed, 'es')}.",
                                   f"{oname['en']} cannot be chosen with: {gq.lang_list(listed, 'en')}.",
                                   f"「{oname['jp']}」を選べない倫理観：{gq.lang_list(listed, 'jp')}。"))
        civics = required_civics(o.get("valid")) or required_civics(o.get("potential"))
        named = sorted(c for c in civics if self.d.name("civics", c))
        if named:
            cid = self.b.rng("policies", "option_civic", key).choice(named)
            civic = self.d.name("civics", cid)
            cands = [(c["id"], self.d.name("civics", c["id"])) for c in self.d.items("civics")
                     if c["id"] not in text and self.d.name("civics", c["id"])]
            wrong = self.pick("option_civic", key, civic, cands, pool=300)
            if wrong and not gq.gives_away(civic, oname):
                listed = [self.d.name("civics", c) for c in named]
                self.add("option_civic", key, 3, p, dlc,
                         _sentence(f"¿Qué principio permite la opción «{oname['es']}» de la política «{names['es']}»?",
                                   f"Which civic allows the option {oname['en']} of the policy {names['en']}?",
                                   f"政策「{names['jp']}」の選択肢「{oname['jp']}」を可能にする国是はどれ？"),
                         civic, wrong,
                         _sentence(f"«{oname['es']}» requiere uno de estos principios: {gq.lang_list(listed, 'es')}.",
                                   f"{oname['en']} requires one of these civics: {gq.lang_list(listed, 'en')}.",
                                   f"「{oname['jp']}」には次のいずれかの国是が必要です：{gq.lang_list(listed, 'jp')}。"))

    # -- edicts

    def edicts(self):
        out = {}
        for x in self.d.items("edicts"):
            names = self.d.name("edicts", x["id"])
            reliable, dlc = gq.condition_check(x, ("potential", "allow"))
            if names and reliable and "always = no" not in (x.get("potential") or ""):
                out[x["id"]] = (x, names, dlc)
        return out

    def edict_questions(self):
        edicts = self.edicts()
        self.edict_costs(edicts)
        self.edict_resources(edicts)
        self.edict_requirements(edicts)
        self.edict_facts(edicts)

    def numbers(self, template, key, value, values):
        near = sorted((v for v in values if v != value), key=lambda v: (abs(v - value), v))[:5]
        return self.b.rng("policies", template, key).sample(near, 3) if len(near) >= 3 else None

    def edict_costs(self, edicts):
        for key, (x, names, dlc) in edicts.items():
            cost = x.get("cost") or {}
            if len(cost) != 1:
                continue
            value = next(iter(cost.values()))
            wrong = self.numbers("edict_cost", key, value, (1, 5, 10, 15, 20, 25, 30, 50, 75, 100))
            if wrong:
                self.add("edict_cost", key, 4, x, dlc,
                         _sentence(f"¿Cuál es el coste base de activar el edicto «{names['es']}»?",
                                   f"What is the base cost of activating the edict {names['en']}?",
                                   f"布告「{names['jp']}」を発動する基本コストは？"),
                         gq.same(f"{value:g}"), [gq.same(f"{v:g}") for v in wrong],
                         _sentence(f"El coste base de «{names['es']}» es {value:g} (el juego puede escalarlo).",
                                   f"The base cost of {names['en']} is {value:g} (the game may scale it).",
                                   f"「{names['jp']}」の基本コストは{value:g}です（ゲーム内で変動する場合があります）。"))

    def edict_resources(self, edicts):
        """Edicts whose upkeep is the same resource, other than the usual one (unity)."""
        paid = {k: set(v[0].get("upkeep") or {}) for k, v in edicts.items()}
        for key, (x, names, dlc) in edicts.items():
            if len(paid[key]) != 1 or paid[key] == {"unity"}:
                continue
            resource = next(iter(paid[key]))
            twins = sorted(k for k in edicts if k != key and paid[k] == paid[key] and not gq.gives_away(edicts[k][1], names))
            if not twins:
                continue
            oid = self.b.rng("policies", "edict_same_resource", key).choice(twins)
            o, onames, odlc = edicts[oid]
            cands = [(k, v[1]) for k, v in edicts.items()
                     if paid[k] and resource not in paid[k] | set(v[0].get("cost") or {}) and not gq.gives_away(v[1], names)]
            wrong = self.pick("edict_same_resource", key, onames, cands,
                              lambda k: edicts[k][0]["group"] != o["group"])
            if wrong:
                self.add("edict_same_resource", key, 3, x, dlc + odlc,
                         _sentence(f"¿Cuál de estos edictos se mantiene con el mismo recurso que «{names['es']}»?",
                                   f"Which of these edicts has the same upkeep resource as {names['en']}?",
                                   f"布告「{names['jp']}」と同じ資源を維持費にする布告はどれ？"),
                         onames, wrong,
                         _sentence(f"«{names['es']}» y «{onames['es']}» se mantienen con el mismo recurso.",
                                   f"{names['en']} and {onames['en']} have the same upkeep resource.",
                                   f"「{names['jp']}」と「{onames['jp']}」の維持費は同じ資源です。"))

    def requirement(self, template, tier, key, entry, set_name, value, pool, kind, closeness=lambda k: 0):
        """"Which <kind> does the edict need": `value` of `set_name` against other ids of `pool`."""
        x, names, dlc = entry
        required = self.d.name(set_name, value)
        if not required or gq.gives_away(required, names):
            return
        text = (x.get("potential") or "") + (x.get("allow") or "")
        cands = [(k, self.d.name(set_name, k)) for k in pool
                 if k != value and k not in text and self.d.name(set_name, k)]
        wrong = self.pick(template, key, required, cands, closeness, pool=12)
        if wrong:
            self.add(template, key, tier, x, dlc,
                     _sentence(f"¿Qué {kind[0]} exige el edicto «{names['es']}»?",
                               f"Which {kind[1]} does the edict {names['en']} require?",
                               f"布告「{names['jp']}」に必要な{kind[2]}はどれ？"),
                     required, wrong,
                     _sentence(f"«{names['es']}» exige: {required['es']}.",
                               f"{names['en']} requires: {required['en']}.",
                               f"「{names['jp']}」の条件：{required['jp']}。"))

    def edict_requirements(self, edicts):
        ethics = {e["id"]: e for e in self.d.items("ethics")}
        plain = [k for k, e in ethics.items() if not e["fanatic"] and k != "ethic_gestalt_consciousness"]
        authorities = sorted(set(AUTHORITY_TRIGGERS.values()))
        origins = [o["id"] for o in self.d.items("origins")]
        for key, entry in edicts.items():
            lines = top_lines(entry[0].get("potential"))
            for k, v in lines:
                if v is True and k in ETHIC_TRIGGERS:
                    self.requirement("edict_ethic", 2, key, entry, "ethics", f"ethic_{ETHIC_TRIGGERS[k]}",
                                     [e for e in plain if ETHIC_TRIGGERS[k] not in e],
                                     ("ética (fanática o no)", "ethic (fanatic or not)", "倫理観（狂信的を含む）"))
                elif v is True and k in AUTHORITY_TRIGGERS:
                    self.requirement("edict_authority", 4, key, entry, "authorities", AUTHORITY_TRIGGERS[k], authorities,
                                     ("tipo de autoridad", "type of authority", "統治体制"))
                elif k == "has_origin":
                    self.requirement("edict_origin", 2, key, entry, "origins", str(v), origins,
                                     ("origen", "origin", "起源"))

    def edict_facts(self, edicts):
        for key, (x, names, dlc) in edicts.items():
            months = x.get("edict_lock_in_months")
            if isinstance(months, int):
                wrong = self.numbers("edict_lock", key, months, (12, 24, 36, 60, 120, 180, 240, 360))
                self.add("edict_lock", key, 5, x, dlc,
                         _sentence(f"¿Durante cuántos meses queda fijado el edicto «{names['es']}» al activarlo?",
                                   f"For how many months is the edict {names['en']} locked in once activated?",
                                   f"布告「{names['jp']}」は発動すると何か月間固定される？"),
                         gq.same(str(months)), [gq.same(str(v)) for v in wrong],
                         _sentence(f"«{names['es']}» queda fijado {months} meses.", f"{names['en']} is locked in for {months} months.",
                                   f"「{names['jp']}」は{months}か月間固定されます。"))
            if x.get("is_wartime_edict"):
                cands = [(k, v[1]) for k, v in edicts.items() if not v[0].get("is_wartime_edict")]
                wrong = self.pick("edict_wartime", key, names, cands,
                                  lambda k: edicts[k][0]["group"] != x["group"], pool=30)
                if wrong:
                    self.add("edict_wartime", key, 4, x, dlc,
                             _sentence("¿Cuál de estos es un edicto de tiempos de guerra?", "Which of these is a wartime edict?",
                                       "次のうち戦時の布告はどれ？"),
                             names, wrong,
                             _sentence(f"«{names['es']}» es un edicto de guerra; los otros tres no.",
                                       f"{names['en']} is a wartime edict; the other three are not.",
                                       f"「{names['jp']}」は戦時の布告です。他の3つは違います。"))
            if x["group"] == "ambitions" and "tech_ascension_theory" in (x.get("potential") or ""):
                self.ambition(key, x, names, dlc)
        self.edict_dlc(edicts)

    def ambition(self, key, x, names, dlc):
        techs = gq.usable_techs(self.d)
        if "tech_ascension_theory" not in techs:
            return
        tech = techs["tech_ascension_theory"]
        cands = [(k, v[1]) for k, v in techs.items()
                 if k != "tech_ascension_theory" and k not in (x.get("allow") or "") and v[0]["tier"] >= 4]
        wrong = self.pick("ambition_technology", key, tech[1], cands, pool=40)
        if wrong:
            self.add("ambition_technology", key, 3, x, dlc + tech[2],
                     _sentence(f"¿Qué tecnología hace falta para la ambición «{names['es']}»?",
                               f"Which technology is needed for the ambition {names['en']}?",
                               f"大望「{names['jp']}」に必要な技術はどれ？"),
                     tech[1], wrong,
                     _sentence(f"«{names['es']}» requiere la tecnología {tech[1]['es']}.",
                               f"{names['en']} requires the technology {tech[1]['en']}.",
                               f"「{names['jp']}」には技術「{tech[1]['jp']}」が必要です。"))

    def edict_dlc(self, edicts):
        dlcs = [x for x in self.d.items("dlc") if x["installed"] and x["affects_gameplay"]]
        label = {x["name"]: gq.same(x.get("localised_name") or x["name"]) for x in dlcs}
        for key, (x, names, dlc) in edicts.items():
            one = gq.single_dlc(x, ("potential", "allow"))
            if one not in label:
                continue
            wrong = self.pick("edict_dlc", key, label[one], [(n, v) for n, v in label.items() if n != one], pool=40)
            if wrong:
                self.add("edict_dlc", key, 3, x, dlc,
                         _sentence(f"¿Qué DLC necesita el edicto «{names['es']}»?", f"Which DLC does the edict {names['en']} need?",
                                   f"布告「{names['jp']}」に必要なDLCはどれ？"),
                         label[one], wrong,
                         _sentence(f"«{names['es']}» necesita el DLC {label[one]['es']}.",
                                   f"{names['en']} needs the DLC {label[one]['en']}.",
                                   f"「{names['jp']}」にはDLC「{label[one]['jp']}」が必要です。"))


def generate(b):
    p = Policies(b)
    p.option_questions()
    p.edict_questions()
