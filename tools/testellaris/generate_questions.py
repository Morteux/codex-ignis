"""Testellaris question generator (T4111, TESTELLARIS_GDD.md §3.1 and §5).

    python tools/testellaris/generate_questions.py [--data DIR] [--out FILE] [--cap N] [--check]

Reads only the extractor output (`data/generated/<rulesetId>/*.json` and its localisation) and
writes the question bank (`data/testellaris/<rulesetId>/questions.json`), validated with
question_bank.validate. Every template asks a fact read from one field of one data set and takes
the official es/en/jp names of the game localisation; an item whose name is missing, repeated
inside its set or still holds formatting codes is not asked. Re-runnable for a new game version:
the ids (`<topic>.<template>.<game id>`) and the random choices (seeded by the id) are stable, and
hand-written questions already in the bank (template "hand") are kept as they are.

--check regenerates in memory and fails if the bank on disk differs (used by the tests).
"""
import argparse, hashlib, importlib, json, os, random, re, sys

sys.modules.setdefault("generate_questions", sys.modules[__name__])  # the q_* modules import this one

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "extract"))
import question_bank as qb  # noqa: E402
from pdx.parser import Block, parse  # noqa: E402

LOC_FILES = {"es": "spanish", "en": "english", "jp": "japanese"}
CAP = 40  # questions per template and tier (GDD §3.1: the bank must not be one template)
GENERATOR = "tools/testellaris/generate_questions.py"

# Scripted triggers that check a DLC ({name: [{dlc, negated, alternative}]}, `scripted_triggers` of
# dlc.json, T2527), set by Data: `has_lithoids = yes` is read as the Lithoids pack. Without them
# (data extracted before T2527) any `has_… = yes` trigger may hide a DLC, so such an item is not asked.
DLC_TRIGGERS = None
_SCRIPTED = re.compile(r"\b(has_[a-z0-9_]+)\s*=\s*(?:yes|no)\b")
_DLC_KEY = re.compile(r"^has_[a-z0-9_]+_dlc$")
_CODES = re.compile(r"[§£$\[\]]")  # formatting codes and [scripted.Names]
_NAME_MARK = re.compile(r"^£blocker£\s*")  # the icon the game puts before the name of a blocker
_NEGATE = {"NOT", "NOR"}
_ALTERNATIVE = {"OR", "NAND"}


def _hash(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------- data

class Data:
    """The extractor output of one ruleset: data sets by id and the es/en/jp names."""

    def __init__(self, folder):
        self.folder = folder.replace("\\", "/").rstrip("/")
        self.manifest = self._json("manifest")
        self.ruleset = self.manifest["rulesetId"]
        self.loc = {lang: {s: {k: v and _NAME_MARK.sub("", v) for k, v in names.items()}
                           for s, names in self._json(f"localisation/{f}")["sets"].items()}
                    for lang, f in LOC_FILES.items()}
        self._sets, self._unique = {}, {}
        global DLC_TRIGGERS
        DLC_TRIGGERS = self.raw("dlc").get("scripted_triggers")

    def _json(self, name):
        with open(f"{self.folder}/{name}.json", encoding="utf-8") as f:
            return json.load(f)

    def raw(self, name):
        if name not in self._sets:
            self._sets[name] = self._json(name)
        return self._sets[name]

    def items(self, name):
        return self.raw(name)["items"]

    def by_id(self, name):
        key = "\0" + name
        if key not in self._sets:
            self._sets[key] = {x["id"]: x for x in self.items(name)}
        return self._sets[key]

    def label(self, set_name, item_id):
        """{es, en, jp} names of an item used to name something in a question, even if another item
        shares them (the variants of a job or a district), or None if missing or with codes."""
        names = {lang: self.loc[lang].get(set_name, {}).get(item_id) for lang in LOC_FILES}
        if not all(v and not _CODES.search(v) for v in names.values()):
            return None
        return {lang: v.strip() for lang, v in names.items()}

    def name(self, set_name, item_id):
        """{es, en, jp} official names of an item, or None if one is missing, repeated in its set
        (the question would be ambiguous) or holds formatting codes."""
        if set_name not in self._unique:
            unique = {}
            for lang in LOC_FILES:
                names = self.loc[lang].get(set_name, {})
                count = {}
                for v in names.values():
                    if v:
                        count[v.strip().casefold()] = count.get(v.strip().casefold(), 0) + 1
                unique[lang] = {k for k, v in names.items() if v and count[v.strip().casefold()] == 1 and not _CODES.search(v)}
            self._unique[set_name] = unique
        if not all(item_id in self._unique[set_name][lang] for lang in LOC_FILES):
            return None
        return {lang: self.loc[lang][set_name][item_id].strip() for lang in LOC_FILES}


# ---------------------------------------------------------------- trigger reading

def _blocks(*texts):
    out = []
    for t in texts:
        if t and isinstance(t, str) and t.strip():
            try:
                out.append(parse(t))
            except Exception:  # noqa: BLE001 — an unreadable condition makes the item unusable
                return None
    return out


def dlc_mentions(item, fields, triggers=None):
    """[(dlc name or unknown has_<x>_dlc trigger, negated, alternative)] of the conditions of an
    item; the scripted triggers that check a DLC (`triggers`, default DLC_TRIGGERS) are expanded."""
    found = []
    triggers = DLC_TRIGGERS if triggers is None else triggers

    def walk(block, neg, alt):
        for k, op, v in block.entries:
            if k == "host_has_dlc":
                found.append((str(v), neg, alt))
            elif triggers and k in triggers and isinstance(v, bool):
                for m in triggers[k]:
                    found.append((m["dlc"], bool(neg ^ (not v) ^ m["negated"]), bool(alt or m["alternative"])))
            elif isinstance(k, str) and _DLC_KEY.match(k):
                found.append((k, neg != (v is False), alt))
            elif isinstance(v, Block):
                walk(v, neg != (k in _NEGATE), alt or k in _ALTERNATIVE or (k in _NEGATE and len(v) > 1))

    blocks = _blocks(*(item.get(f) for f in fields))
    if blocks is None:
        return None
    for b in blocks:
        walk(b, False, False)
    return found


def condition_check(item, fields, triggers=None):
    """(reliable, positive DLC) of an item: reliable = its DLC list can be trusted (no unknown
    has_<x>_dlc trigger, readable conditions; without a trigger map, no `has_… = yes` trigger at
    all); positive = its `dlc` minus the DLCs only named negated (`NOT = { host_has_dlc = "Megacorp" }`
    is the non-Megacorp variant of an item)."""
    triggers = DLC_TRIGGERS if triggers is None else triggers
    texts = " ".join(item.get(f) or "" for f in fields if isinstance(item.get(f), str))
    used = _SCRIPTED.findall(texts)
    if triggers is None and any(not _DLC_KEY.match(m) for m in used):
        return False, None
    if triggers and any(_DLC_KEY.match(m) and m not in triggers for m in used):
        return False, None
    mentions = dlc_mentions(item, fields, triggers)
    if mentions is None:
        return False, None
    negated = {n for n, neg, _ in mentions if neg} - {n for n, neg, _ in mentions if not neg}
    return True, [d for d in item.get("dlc") or [] if d not in negated]


def single_dlc(item, fields, triggers=None):
    """The one DLC an item certainly needs, or None (several, alternatives, negations)."""
    reliable, dlc = condition_check(item, fields, triggers)
    mentions = dlc_mentions(item, fields, triggers) if reliable else None
    if not mentions or len(item.get("dlc") or []) != 1 or any(neg or alt for _, neg, alt in mentions):
        return None
    return item["dlc"][0]


def ethics_rules(text):
    """Ethics clauses of a trigger text: ([allowed sets], forbidden set), or None if the text names
    ethics in a way these templates do not read (nested blocks, ethics outside `ethics = {}`)."""
    blocks = _blocks(text)
    if blocks is None:
        return None
    if not blocks:
        return [], set()
    positive, forbidden = [], set()
    for k, op, v in blocks[0].entries:
        if k != "ethics":
            if "ethic_" in str(v) or "ethic" in str(k):
                return None
            continue
        if not isinstance(v, Block):
            return None
        for kk, _, vv in v.entries:
            if kk == "value":
                positive.append({str(vv)})
            elif kk == "text":
                continue
            elif kk in ("OR", "NOT", "NOR") and isinstance(vv, Block):
                values = set()
                for k3, _, v3 in vv.entries:
                    if k3 == "value" and not isinstance(v3, Block):
                        values.add(str(v3))
                    elif k3 != "text":
                        return None
                if kk == "OR":
                    positive.append(values)
                else:
                    forbidden |= values
            else:
                return None
    return positive, forbidden


def value_rules(text, key):
    """(allowed set or None, forbidden set) of a `<key> = { … }` clause such as `authority`, or None."""
    blocks = _blocks(text)
    if blocks is None:
        return None
    allowed, forbidden = None, set()
    for b in blocks:
        for k, _, v in b.entries:
            if k != key:
                continue
            if not isinstance(v, Block):
                return None
            for kk, _, vv in v.entries:
                if kk == "value":
                    allowed = (allowed or set()) | {str(vv)} if allowed is None else allowed & {str(vv)}
                elif kk == "text":
                    continue
                elif kk in ("OR", "NOT", "NOR") and isinstance(vv, Block):
                    values = {str(v3) for k3, _, v3 in vv.entries if k3 == "value"}
                    if any(k3 not in ("value", "text") for k3, _, _ in vv.entries):
                        return None
                    if kk == "OR":
                        allowed = values if allowed is None else allowed & values
                    else:
                        forbidden |= values
                else:
                    return None
    return allowed, forbidden


# ---------------------------------------------------------------- questions

def lang_list(names, lang):
    sep = "、" if lang == "jp" else ", "
    if lang == "jp":
        return sep.join(f"「{n[lang]}」" for n in names)
    return sep.join(n[lang] for n in names)


def same(text):
    return {lang: text for lang in LOC_FILES}


def distinct(names):
    """True if the answers are four distinct texts in every language."""
    return all(len({n[lang].casefold() for n in names}) == len(names) for lang in LOC_FILES)


def pick(rng, correct, candidates, closeness, n=3, pool=8):
    """n distractors ({es,en,jp} names) for the correct name, from (key, names) candidates sorted
    by closeness (most plausible first), sampled from the closest `pool`."""
    chosen = []
    ranked = sorted(candidates, key=lambda c: (closeness(c[0]), str(c[0])))
    ok = [c for c in ranked if distinct([correct, c[1]])]
    ok = ok[:max(pool, n)]
    rng.shuffle(ok)
    for c in ok:
        if distinct([correct] + [x[1] for x in chosen] + [c[1]]):
            chosen.append(c)
        if len(chosen) == n:
            return chosen
    return None


class Builder:
    def __init__(self, data):
        self.d = data
        self.out = []

    def add(self, topic, template, key, tier, item, dlc, text, correct, wrong, explanation, icon=None):
        qid = f"{topic}.{template}.{key}"
        rng = random.Random(_hash(qid))
        answers = [correct] + list(wrong)
        if len(answers) != 4 or not distinct(answers):
            return
        order = list(range(4))
        rng.shuffle(order)
        q = {
            "id": qid,
            "tier": max(1, min(5, tier)),
            "topic": topic,
            "dlc": list(dict.fromkeys(dlc)),
            "source": {"file": item["file"], "key": item["id"]},
            "text": text,
            "answers": {lang: [answers[i][lang] for i in order] for lang in LOC_FILES},
            "correct": order.index(0),
            "explanation": explanation,
        }
        if icon:
            q["icon"] = icon
        self.out.append(q)

    @staticmethod
    def rng(topic, template, key):
        return random.Random(_hash(f"{topic}.{template}.{key}"))


def _icon(item):
    i = item.get("icon")
    return i.get("asset") if isinstance(i, dict) else None


# --- technologies

TECH_FIELDS = ("potential", "weight_modifier")


def tech_obscurity(t):
    """Tier of a fact about a technology (GDD §3.1): dangerous and event → 5, rare → 4, else by tier."""
    f = t.get("flags") or {}
    if f.get("dangerous") or f.get("event"):
        return 5
    if f.get("rare"):
        return 4
    return 1 if t["tier"] <= 1 else 2 if t["tier"] == 2 else 3


def usable_techs(d):
    out = {}
    for t in d.items("technologies"):
        if (t.get("flags") or {}).get("repeatable") or t.get("levels") or not isinstance(t.get("tier"), int):
            continue
        reliable, dlc = condition_check(t, TECH_FIELDS)
        names = d.name("technologies", t["id"])
        if reliable and names:
            out[t["id"]] = (t, names, dlc)
    return out


def tech_graph(d):
    techs = d.by_id("technologies")
    children = {}
    for t in techs.values():
        for p in t["prerequisites"]:
            children.setdefault(p, []).append(t["id"])

    def closure(start, nxt):
        seen, stack = set(), [start]
        while stack:
            for n in nxt(stack.pop()):
                if n not in seen:
                    seen.add(n)
                    stack.append(n)
        return seen

    ancestors = lambda i: closure(i, lambda x: techs.get(x, {}).get("prerequisites", []))
    descendants = lambda i: closure(i, lambda x: children.get(x, []))
    return ancestors, descendants


def gen_technologies(b):
    d = b.d
    techs = usable_techs(d)
    ancestors, descendants = tech_graph(d)
    for tid, (t, names, dlc) in techs.items():
        base = tech_obscurity(t)
        # tier of the technology
        rng = b.rng("technology", "tech_tier", tid)
        tiers = [n for n in range(0, 6) if n != t["tier"]]
        tiers.sort(key=lambda n: (abs(n - t["tier"]), n))
        wrong = rng.sample(tiers[:4], 3)
        b.add("technology", "tech_tier", tid, base, t, dlc,
              {"es": f"¿De qué nivel es la tecnología {names['es']}?",
               "en": f"What tier is the technology {names['en']}?",
               "jp": f"技術「{names['jp']}」のティアは？"},
              same(str(t["tier"])), [same(str(n)) for n in wrong],
              {"es": f"{names['es']} es una tecnología de nivel {t['tier']}.",
               "en": f"{names['en']} is a tier {t['tier']} technology.",
               "jp": f"「{names['jp']}」はティア{t['tier']}の技術です。"}, _icon(t))
        # base cost
        if isinstance(t.get("cost"), int) and t["cost"] > 0:
            costs = sorted({x[0]["cost"] for x in techs.values() if x[0]["tier"] == t["tier"] and isinstance(x[0].get("cost"), int) and x[0]["cost"] > 0} - {t["cost"]})
            if len(costs) >= 3:
                rng = b.rng("technology", "tech_cost", tid)
                near = sorted(costs, key=lambda c: (abs(c - t["cost"]), c))[:6]
                wrong = rng.sample(near, 3)
                b.add("technology", "tech_cost", tid, max(4, base), t, dlc,
                      {"es": f"¿Cuál es el coste base de la tecnología {names['es']}?",
                       "en": f"What is the base cost of the technology {names['en']}?",
                       "jp": f"技術「{names['jp']}」の基本コストは？"},
                      same(str(t["cost"])), [same(str(c)) for c in wrong],
                      {"es": f"El coste base de {names['es']} es {t['cost']} (el juego lo escala con los ajustes de la partida y el tamaño del imperio).",
                       "en": f"The base cost of {names['en']} is {t['cost']} (the game scales it with the game settings and the size of the empire).",
                       "jp": f"「{names['jp']}」の基本コストは{t['cost']}です（ゲーム設定と帝国の規模で変わります）。"}, _icon(t))
        # a prerequisite
        prereqs = [p for p in t["prerequisites"] if p in techs]
        if prereqs and len(prereqs) == len(t["prerequisites"]):
            rng = b.rng("technology", "tech_prerequisite", tid)
            pid = rng.choice(sorted(prereqs))
            p = techs[pid]
            excluded = ancestors(tid) | descendants(tid) | {tid}
            cands = [(k, v[1]) for k, v in techs.items() if k not in excluded]
            wrong = pick(rng, p[1], cands, lambda k: (techs[k][0]["area"] != p[0]["area"], abs(techs[k][0]["tier"] - p[0]["tier"])))
            if wrong:
                all_p = [techs[x][1] for x in sorted(t["prerequisites"])]
                b.add("technology", "tech_prerequisite", tid, max(3, base, tech_obscurity(p[0])), t, dlc + p[2],
                      {"es": f"¿Cuál de estas tecnologías es un prerrequisito de {names['es']}?",
                       "en": f"Which of these technologies is a prerequisite of {names['en']}?",
                       "jp": f"技術「{names['jp']}」の前提条件はどれ？"},
                      p[1], [w[1] for w in wrong],
                      {"es": f"Prerrequisitos de {names['es']}: {lang_list(all_p, 'es')}.",
                       "en": f"Prerequisites of {names['en']}: {lang_list(all_p, 'en')}.",
                       "jp": f"「{names['jp']}」の前提条件：{lang_list(all_p, 'jp')}。"}, _icon(t))


# --- buildings

BUILDING_FIELDS = ("potential", "allow")


def usable_buildings(d):
    out = {}
    for x in d.items("buildings"):
        reliable, dlc = condition_check(x, BUILDING_FIELDS)
        names = d.name("buildings", x["id"])
        if reliable and names:
            out[x["id"]] = (x, names, dlc)
    return out


def gen_buildings(b):
    d = b.d
    techs = usable_techs(d)
    ancestors, descendants = tech_graph(d)
    buildings = usable_buildings(d)
    jobs = {j["id"]: j for j in d.items("jobs")}
    sole_tech = {bid: x[0]["prerequisites"][0] for bid, x in buildings.items()
                 if len(x[0]["prerequisites"]) == 1 and x[0]["prerequisites"][0] in techs}
    unlocking = sorted(set(sole_tech.values()))
    for bid, (x, names, dlc) in buildings.items():
        # the technology it requires
        if bid in sole_tech:
            tid = sole_tech[bid]
            t, tnames, tdlc = techs[tid]
            # a technology named like its building gives the answer away
            gives_away = any(tnames[l].casefold() in names[l].casefold() or names[l].casefold() in tnames[l].casefold() for l in LOC_FILES)
            rng = b.rng("economy", "building_tech", bid)
            excluded = ancestors(tid) | descendants(tid) | {tid}
            cands = [(k, techs[k][1]) for k in unlocking if k not in excluded]
            wrong = pick(rng, tnames, cands, lambda k: (techs[k][0]["area"] != t["area"], abs(techs[k][0]["tier"] - t["tier"])))
            if wrong and not gives_away:
                b.add("economy", "building_tech", bid, max(2, tech_obscurity(t)), x, dlc + tdlc,
                      {"es": f"¿Qué tecnología requiere el edificio {names['es']}?",
                       "en": f"Which technology does the building {names['en']} require?",
                       "jp": f"建造物「{names['jp']}」に必要な技術はどれ？"},
                      tnames, [w[1] for w in wrong],
                      {"es": f"{names['es']} requiere la tecnología {tnames['es']}.",
                       "en": f"{names['en']} requires the technology {tnames['en']}.",
                       "jp": f"「{names['jp']}」には技術「{tnames['jp']}」が必要です。"}, _icon(x))
        # a job it gives
        given = {j for j in (x.get("jobs") or {}) if j in jobs and d.name("jobs", j)}
        if given:
            near = set(x.get("jobs") or {})
            for c in x.get("jobs_conditional") or []:
                near |= set(c.get("jobs") or {})
            for j in list(near):
                near |= {s["id"] for s in jobs.get(j, {}).get("swaps") or []}
            rng = b.rng("economy", "building_job", bid)
            jid = rng.choice(sorted(given))
            jnames = d.name("jobs", jid)
            other = {}
            for y, _, _ in buildings.values():
                for k in y.get("jobs") or {}:
                    if k not in near and k in jobs and d.name("jobs", k):
                        other[k] = min(other.get(k, 2), 0 if y["category"] == x["category"] else 1)
            cands = [(k, d.name("jobs", k)) for k in other]
            wrong = pick(rng, jnames, cands, lambda k: other[k])
            if wrong:
                all_j = [d.name("jobs", k) for k in sorted(given)]
                b.add("economy", "building_job", bid, 2, x, dlc,
                      {"es": f"¿Qué empleo proporciona el edificio {names['es']}?",
                       "en": f"Which job does the building {names['en']} provide?",
                       "jp": f"建造物「{names['jp']}」が提供する職業はどれ？"},
                      jnames, [w[1] for w in wrong],
                      {"es": f"{names['es']} proporciona empleos de {lang_list(all_j, 'es')}.",
                       "en": f"{names['en']} provides {lang_list(all_j, 'en')} jobs.",
                       "jp": f"「{names['jp']}」が提供する職業：{lang_list(all_j, 'jp')}。"}, _icon(x))
        # what it upgrades into
        ups = x.get("upgrades") or []
        if len(ups) == 1 and ups[0] in buildings:
            uid = ups[0]
            u, unames, udlc = buildings[uid]
            chain, stack = {bid}, [bid]
            down = {}
            for k, (y, _, _) in buildings.items():
                for z in y.get("upgrades") or []:
                    down.setdefault(z, []).append(k)
            while stack:
                cur = stack.pop()
                for n in (buildings.get(cur, ({},))[0].get("upgrades") or []) + down.get(cur, []):
                    if n not in chain:
                        chain.add(n)
                        stack.append(n)
            rng = b.rng("economy", "building_upgrade", bid)
            cands = [(k, v[1]) for k, v in buildings.items() if k not in chain]
            wrong = pick(rng, unames, cands, lambda k: (buildings[k][0]["category"] != u["category"], not buildings[k][0].get("upgrades") and k not in down))
            if wrong:
                b.add("economy", "building_upgrade", bid, 3, x, dlc + udlc,
                      {"es": f"¿A qué edificio se mejora {names['es']}?",
                       "en": f"Which building does {names['en']} upgrade into?",
                       "jp": f"建造物「{names['jp']}」のアップグレード先はどれ？"},
                      unames, [w[1] for w in wrong],
                      {"es": f"{names['es']} se mejora a {unames['es']}.",
                       "en": f"{names['en']} upgrades into {unames['en']}.",
                       "jp": f"「{names['jp']}」は「{unames['jp']}」にアップグレードできます。"}, _icon(x))


# --- ethics, civics and origins

CIVIC_FIELDS = ("potential", "possible", "playable")


def regular_ethics(d):
    return {e["id"]: e for e in d.items("ethics") if e["id"] != "ethic_gestalt_consciousness"}


def gen_ethics(b):
    d = b.d
    ethics = {k: e for k, e in regular_ethics(d).items() if not e["fanatic"] and d.name("ethics", k)}
    for eid, e in ethics.items():
        opp = [k for k, o in ethics.items() if o["category"] == e["category"] and o["category_value"] != e["category_value"]]
        if len(opp) != 1:
            continue
        rng = b.rng("ethics", "ethic_opposite", eid)
        cands = [(k, d.name("ethics", k)) for k in ethics if k not in (eid, opp[0])]
        wrong = pick(rng, d.name("ethics", opp[0]), cands, lambda k: 0, pool=10)
        names, onames = d.name("ethics", eid), d.name("ethics", opp[0])
        if wrong:
            b.add("ethics", "ethic_opposite", eid, 1, e, [],
                  {"es": f"¿Cuál es la ética opuesta a {names['es']}?",
                   "en": f"Which ethic is the opposite of {names['en']}?",
                   "jp": f"倫理観「{names['jp']}」の反対の倫理観はどれ？"},
                  onames, [w[1] for w in wrong],
                  {"es": f"{names['es']} y {onames['es']} son los dos extremos del mismo eje de éticas.",
                   "en": f"{names['en']} and {onames['en']} are the two ends of the same ethics axis.",
                   "jp": f"「{names['jp']}」と「{onames['jp']}」は同じ軸の両端です。"}, _icon(e))


def authority_ethics(d):
    """{authority id: (allowed sets, forbidden)} of the authorities whose ethics rules are readable."""
    out = {}
    for a in d.items("authorities"):
        # not playable: `always = no`, or only for a country type such as ai_empire
        if "always = no" in (a.get("playable") or "") or re.search(r"country_type = \{\s*value", a.get("potential") or ""):
            continue
        rules = ethics_rules(a.get("possible") or "")
        pot = ethics_rules(a.get("potential") or "")
        out[a["id"]] = None if rules is None or pot is None else (rules[0] + pot[0], rules[1] | pot[1])
    return out


def ethic_allowed(e, rules):
    positive, forbidden = rules
    return e not in forbidden and all(e in p for p in positive)


def civic_obscurity(c):
    pot = (c.get("potential") or "") + (c.get("possible") or "")
    gestalt = ethics_rules(c.get("potential") or "")
    if gestalt and any(p == {"ethic_gestalt_consciousness"} for p in gestalt[0]):
        return 3
    if re.search(r"value = auth_corporate\b", pot) and not re.search(r"NOT = \{\s*value = auth_corporate", pot):
        return 3
    return 2 if c.get("dlc") else 1


def country_restricted(c):
    """True if the item is only for country types other than the players' (`default`)."""
    for b in _blocks(c.get("potential")) or []:
        for k, _, v in b.entries:
            if k != "country_type" or not isinstance(v, Block):
                continue
            allowed = set()
            for kk, _, vv in v.entries:
                if kk == "value":
                    allowed.add(str(vv))
                elif kk == "OR" and isinstance(vv, Block):
                    allowed |= {str(v3) for k3, _, v3 in vv.entries if k3 == "value"}
            if allowed and "default" not in allowed:
                return True
    return False


def own_requirement(c):
    """True if the item is only offered to an empire that already has it (granted by events)."""
    def values(block):
        for k, _, v in block.entries:
            if k == "value":
                yield str(v)
            elif k == "OR" and isinstance(v, Block):
                yield from values(v)
    return any(c.get("id") in values(v) for b in _blocks(c.get("potential")) or []
               for k, _, v in b.entries if k in ("civics", "origin") and isinstance(v, Block))


def playable(c):
    """True if an empire can pick the civic or origin when it is created."""
    if own_requirement(c):
        return False
    text = " ".join(c.get(f) or "" for f in ("playable", "potential"))
    return "always = no" not in text and "is_country_type" not in text and not country_restricted(c)


def _words(name):
    return {w for w in re.findall(r"\w+", name.casefold()) if len(w) >= 5}


def gives_away(a, b):
    """True if one name points at the other ({es, en, jp} names): one holds the other, or they
    share a word of five letters or more (their first five, for plurals and genders)."""
    for lang in LOC_FILES:
        x, y = a[lang].casefold(), b[lang].casefold()
        if x in y or y in x:
            return True
        if {w[:5] for w in _words(x)} & {w[:5] for w in _words(y)} and lang != "jp":
            return True
    return False


def gen_civics(b):
    d = b.d
    ethics = regular_ethics(d)
    every = {e["id"] for e in d.items("ethics")}
    auths = authority_ethics(d)
    dlcs = [x for x in d.items("dlc") if x["installed"] and x["affects_gameplay"]]
    dlc_name = {x["name"]: x.get("localised_name") or x["name"] for x in dlcs}
    for set_name, topic in (("civics", "civics"), ("origins", "origins")):
        for c in d.items(set_name):
            names = d.name(set_name, c["id"])
            reliable, dlc = condition_check(c, CIVIC_FIELDS)
            if not names or not reliable or not playable(c):
                continue
            base = civic_obscurity(c)
            # which DLC adds it
            one = single_dlc(c, CIVIC_FIELDS)
            if one in dlc_name:
                rng = b.rng(topic, f"{set_name[:-1]}_dlc", c["id"])
                cands = [(x["name"], same(dlc_name[x["name"]])) for x in dlcs if x["name"] != one]
                cat = {x["name"]: x["category"] for x in dlcs}
                wrong = pick(rng, same(dlc_name[one]), cands, lambda k: cat[k] != cat[one], pool=12)
                kind = {"civics": ("el principio", "the civic", "国是"), "origins": ("el origen", "the origin", "起源")}[set_name]
                if wrong:
                    b.add(topic, f"{set_name[:-1]}_dlc", c["id"], max(2 if set_name == "origins" else 3, base), c, dlc,
                          {"es": f"¿Qué DLC añade {kind[0]} {names['es']}?",
                           "en": f"Which DLC adds {kind[1]} {names['en']}?",
                           "jp": f"{kind[2]}「{names['jp']}」を追加するDLCはどれ？"},
                          same(dlc_name[one]), [w[1] for w in wrong],
                          {"es": f"{names['es']} necesita el DLC {dlc_name[one]}.",
                           "en": f"{names['en']} needs the DLC {dlc_name[one]}.",
                           "jp": f"「{names['jp']}」にはDLC「{dlc_name[one]}」が必要です。"}, _icon(c))
            if set_name != "civics":
                continue
            pot, pos = ethics_rules(c.get("potential") or ""), ethics_rules(c.get("possible") or "")
            arules = value_rules((c.get("potential") or "") + "\n" + (c.get("possible") or ""), "authority")
            if pot is None or pos is None or arules is None:
                continue
            positive, forbidden = pot[0] + pos[0], pot[1] | pos[1]
            allowed_auth, banned_auth = arules
            usable_auth = [a for a in auths if (allowed_auth is None or a in allowed_auth) and a not in banned_auth]
            if not usable_auth or any(auths[a] is None for a in usable_auth):
                continue
            possible = lambda e: ethic_allowed(e, (positive, forbidden)) and any(ethic_allowed(e, auths[a]) for a in usable_auth)
            ename = lambda e: d.name("ethics", e)
            # an ethic that fulfils its requirement
            if len(positive) == 1 and positive[0] - {"ethic_gestalt_consciousness"}:
                ok = sorted(e for e in positive[0] if e in ethics and possible(e) and ename(e))
                if ok:
                    rng = b.rng("civics", "civic_ethic_required", c["id"])
                    regular = [e for e in ok if not ethics[e]["fanatic"]] or ok
                    eid = rng.choice(regular)
                    cands = [(e, ename(e)) for e in sorted(every - positive[0]) if ename(e)]
                    wrong = pick(rng, ename(eid), cands, lambda e: (e == "ethic_gestalt_consciousness", ethics.get(e, {}).get("fanatic", True) != ethics[eid]["fanatic"]), pool=8)
                    req = [ename(e) for e in sorted(positive[0]) if ename(e)]
                    if wrong:
                        b.add("civics", "civic_ethic_required", c["id"], max(2, base), c, dlc,
                              {"es": f"¿Cuál de estas éticas cumple el requisito de ética del principio {names['es']}?",
                               "en": f"Which of these ethics meets the ethics requirement of the civic {names['en']}?",
                               "jp": f"国是「{names['jp']}」の倫理観の条件を満たすのはどれ？"},
                              ename(eid), [w[1] for w in wrong],
                              {"es": f"{names['es']} requiere una de estas éticas: {lang_list(req, 'es')}.",
                               "en": f"{names['en']} requires one of these ethics: {lang_list(req, 'en')}.",
                               "jp": f"「{names['jp']}」には次のいずれかの倫理観が必要です：{lang_list(req, 'jp')}。"}, _icon(c))
            # an ethic it excludes
            banned = sorted(e for e in forbidden if e in ethics and ename(e))
            if banned:
                rng = b.rng("civics", "civic_ethic_forbidden", c["id"])
                regular = [e for e in banned if not ethics[e]["fanatic"]] or banned
                eid = rng.choice(regular)
                cands = [(e, ename(e)) for e in sorted(ethics) if e not in forbidden and possible(e) and ename(e)]
                wrong = pick(rng, ename(eid), cands, lambda e: ethics[e]["fanatic"] != ethics[eid]["fanatic"], pool=8)
                if wrong:
                    excl = [ename(e) for e in banned]
                    b.add("civics", "civic_ethic_forbidden", c["id"], max(2, base), c, dlc,
                          {"es": f"¿Cuál de estas éticas no puede tener un imperio con el principio {names['es']}?",
                           "en": f"Which of these ethics can an empire with the civic {names['en']} not have?",
                           "jp": f"国是「{names['jp']}」を持つ帝国が採用できない倫理観はどれ？"},
                          ename(eid), [w[1] for w in wrong],
                          {"es": f"{names['es']} excluye: {lang_list(excl, 'es')}.",
                           "en": f"{names['en']} excludes: {lang_list(excl, 'en')}.",
                           "jp": f"「{names['jp']}」と両立しない倫理観：{lang_list(excl, 'jp')}。"}, _icon(c))


TEMPLATES = (gen_technologies, gen_buildings, gen_ethics, gen_civics)
# One module per batch of section 41, each with `generate(builder)` and `CAPS` ({template: cap})
MODULES = ("q_civics", "q_government", "q_technology", "q_planets", "q_economy")


# ---------------------------------------------------------------- bank

def capped(questions, cap, caps=None):
    """At most `cap` questions per (template, tier), or the lower cap of the template in `caps`,
    chosen by the hash of their id (stable). `cap` 0 keeps everything."""
    groups = {}
    for q in questions:
        groups.setdefault((q["id"].split(".")[1], q["tier"]), []).append(q)
    out = []
    for key in sorted(groups):
        limit = min(cap, (caps or {}).get(key[0], cap))
        out += sorted(groups[key], key=lambda q: _hash(q["id"]))[:limit] if cap else groups[key]
    return out


def generate(data_dir, existing=None, cap=CAP):
    d = Data(data_dir)
    b = Builder(d)
    for fn in TEMPLATES:
        fn(b)
    caps = {}
    for name in MODULES:
        module = importlib.import_module(name)
        module.generate(b)
        caps.update(module.CAPS)
    questions = capped(b.out, cap, caps)
    hand = [q for q in (existing or {}).get("questions", []) if q.get("id", "").split(".")[1:2] == ["hand"]]
    ids = {q["id"] for q in hand}
    questions = sorted(hand + [q for q in questions if q["id"] not in ids], key=lambda q: q["id"])
    return {
        "rulesetId": d.ruleset,
        "gameVersion": d.manifest.get("gameVersion"),
        "generator": GENERATOR,
        "count": len(questions),
        "questions": questions,
    }


def summary(bank):
    by = {}
    for q in bank["questions"]:
        k = q["id"].split(".")[1]
        by.setdefault(k, [0] * 5)[q["tier"] - 1] += 1
    lines = [f"{k:24} " + " ".join(f"{n:4}" for n in v) + f"  = {sum(v)}" for k, v in sorted(by.items())]
    tiers = [sum(v[i] for v in by.values()) for i in range(5)]
    return "\n".join([f"{'template':24} " + " ".join(f"  T{i}" for i in range(1, 6))] + lines + [f"{'total':24} " + " ".join(f"{n:4}" for n in tiers) + f"  = {sum(tiers)}"])


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--data", default=f"{qb.ROOT}/data/generated/{qb.DEFAULT_RULESET}", help="extractor output folder of one ruleset")
    p.add_argument("--out", help="bank file (default: data/testellaris/<rulesetId>/questions.json)")
    p.add_argument("--cap", type=int, default=CAP, help=f"questions per template and tier (default {CAP}; 0 = all)")
    p.add_argument("--check", action="store_true", help="fail if the bank on disk is not what this run generates")
    args = p.parse_args()
    ruleset = Data(args.data).ruleset
    out = args.out or qb.bank_path(ruleset)
    existing = qb.load(out) if os.path.exists(out) else None
    bank = generate(args.data, existing, args.cap)
    errors = qb.validate(bank, {x["name"] for x in Data(args.data).items("dlc")})
    for e in errors:
        print(e)
    if errors:
        print(f"{len(errors)} validation errors: bank not written")
        return 1
    print(summary(bank))
    if args.check:
        same_bank = existing == bank
        print(out, "is up to date" if same_bank else "differs from a new generation")
        return 0 if same_bank else 1
    qb.save(bank, out)
    print("written:", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
