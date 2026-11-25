"""Testellaris question bank: format, loading and validator (T4101, TESTELLARIS_GDD.md §5).

A bank is `data/testellaris/<rulesetId>/questions.json`:

    {
      "rulesetId": "stellaris-pc-4.5.4",
      "gameVersion": "Cygnus v4.5.4 (1b4f)",
      "count": 123,
      "questions": [
        {
          "id": "technology.tech_tier.tech_lasers_1",    # <topic>.<template or "hand">.<game id>
          "tier": 1,                                     # 1-5 (GDD §3.1)
          "topic": "technology",                         # one of TOPICS
          "dlc": [],                                     # host_has_dlc names (dlc.json "name"); [] = base game
          "source": {"file": "common/technology/00_phys_weapon_tech.txt", "key": "tech_lasers_1"},
          "text": {"es": "...", "en": "...", "jp": "..."},
          "answers": {"es": [4 strings], "en": [...], "jp": [...]},
          "correct": 0,                                  # index in answers (same in every language)
          "explanation": {"es": "...", "en": "...", "jp": "..."},
          "icon": "technologies/tech_lasers_1.png"       # optional, path inside StellarisAssets
        }
      ]
    }

`source` may also hold "loc" (the localisation key, when the fact is a text). Hand-written
questions use "hand" as their template part of the id and are kept by the generator (T4111).

Run `python tools/testellaris/question_bank.py [bank.json]` to validate a bank from the shell.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace("\\", "/")
DEFAULT_RULESET = "stellaris-pc-4.5.4"
LANGS = ("es", "en", "jp")
TIERS = range(1, 6)
TOPICS = (
    "origins", "civics", "ethics", "government", "leaders", "technology", "planets", "economy",
    "policies", "traditions", "shroud", "subjects", "modifiers", "species", "ships",
    "megastructures", "crises", "fallen_empires", "events",
)
FIELDS = {"id", "tier", "topic", "dlc", "source", "text", "answers", "correct", "explanation", "icon"}
REQUIRED = FIELDS - {"icon"}
SOURCE_FIELDS = {"file", "key", "loc"}
ID_RE = re.compile(r"^([a-z_]+)\.([a-z0-9_]+)\.([A-Za-z0-9_.:@-]+)$")
# Formatting codes of the game localisation (§Y … §!, £icon£, $variable$, [scope.Name]) must never reach a question.
UNRESOLVED_RE = re.compile(r"[§£]|\$[A-Za-z_]|\[[A-Za-z_]+\.")


def bank_path(ruleset_id=DEFAULT_RULESET):
    return f"{ROOT}/data/testellaris/{ruleset_id}/questions.json"


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save(bank, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(bank, f, ensure_ascii=False, indent=1)
        f.write("\n")


def dlc_names(ruleset_id=DEFAULT_RULESET):
    """The `name` of every DLC of the extractor's dlc.json (what `dlc` lists may hold), or None."""
    path = f"{ROOT}/data/generated/{ruleset_id}/dlc.json"
    if not os.path.exists(path):
        return None
    return {d["name"] for d in load(path)["items"]}


def _text(value):
    return isinstance(value, str) and value.strip() != ""


def validate_question(q, known_dlc=None):
    """Errors of one question record (empty list = valid)."""
    if not isinstance(q, dict):
        return ["question is not an object"]
    qid = q.get("id")
    where = qid if isinstance(qid, str) else "<no id>"
    errors = []
    err = lambda msg: errors.append(f"{where}: {msg}")
    for f in sorted(REQUIRED - q.keys()):
        err(f"missing field {f}")
    for f in sorted(q.keys() - FIELDS):
        err(f"unknown field {f}")
    m = ID_RE.match(qid) if isinstance(qid, str) else None
    if not m:
        err("id must be <topic>.<template>.<game id>")
    tier = q.get("tier")
    if not isinstance(tier, int) or isinstance(tier, bool) or tier not in TIERS:
        err(f"tier {tier!r} out of range 1-5")
    topic = q.get("topic")
    if topic not in TOPICS:
        err(f"unknown topic {topic!r}")
    elif m and m.group(1) != topic:
        err(f"id starts with {m.group(1)!r} but topic is {topic!r}")
    dlc = q.get("dlc")
    if not isinstance(dlc, list) or not all(_text(d) for d in dlc):
        err("dlc must be a list of DLC names")
    elif len(set(dlc)) != len(dlc):
        err("repeated DLC in dlc")
    elif known_dlc is not None:
        for d in dlc:
            if d not in known_dlc:
                err(f"unknown DLC {d!r}")
    src = q.get("source")
    if not isinstance(src, dict) or not _text(src.get("file")) or not _text(src.get("key")):
        err("source needs a game file and a key")
    else:
        for f in sorted(src.keys() - SOURCE_FIELDS):
            err(f"unknown source field {f}")
        if "loc" in src and not _text(src["loc"]):
            err("source loc must be a localisation key")
    for field in ("text", "explanation"):
        value = q.get(field)
        if not isinstance(value, dict):
            if field in q:
                err(f"{field} must be an object with {', '.join(LANGS)}")
            continue
        for lang in LANGS:
            if not _text(value.get(lang)):
                err(f"{field} missing in {lang}")
            elif UNRESOLVED_RE.search(value[lang]):
                err(f"{field} in {lang} holds localisation codes: {value[lang]!r}")
        for lang in sorted(value.keys() - set(LANGS)):
            err(f"{field} has unknown language {lang}")
    answers = q.get("answers")
    if isinstance(answers, dict):
        for lang in LANGS:
            a = answers.get(lang)
            if not isinstance(a, list) or len(a) != 4 or not all(_text(x) for x in a):
                err(f"answers in {lang} must be four texts")
                continue
            if len({x.strip().casefold() for x in a}) != 4:
                err(f"answers in {lang} are not four distinct answers: {a}")
            for x in a:
                if UNRESOLVED_RE.search(x):
                    err(f"answer in {lang} holds localisation codes: {x!r}")
        for lang in sorted(answers.keys() - set(LANGS)):
            err(f"answers has unknown language {lang}")
    elif "answers" in q:
        err(f"answers must be an object with {', '.join(LANGS)}")
    correct = q.get("correct")
    if not isinstance(correct, int) or isinstance(correct, bool) or not 0 <= correct <= 3:
        err(f"correct {correct!r} must be the index 0-3 of an answer")
    if "icon" in q and not _text(q["icon"]):
        err("icon must be a path")
    return errors


def validate(bank, known_dlc=None):
    """Errors of a whole bank (empty list = valid): every question, unique ids, header and count."""
    if not isinstance(bank, dict) or not isinstance(bank.get("questions"), list):
        return ["bank must be an object with a questions list"]
    errors = []
    if not _text(bank.get("rulesetId")):
        errors.append("bank has no rulesetId")
    if bank.get("count") != len(bank["questions"]):
        errors.append(f"count {bank.get('count')!r} is not the number of questions ({len(bank['questions'])})")
    seen = set()
    for q in bank["questions"]:
        errors += validate_question(q, known_dlc)
        qid = q.get("id") if isinstance(q, dict) else None
        if qid in seen:
            errors.append(f"{qid}: duplicate id")
        seen.add(qid)
    return errors


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    path = sys.argv[1] if len(sys.argv) > 1 else bank_path()
    bank = load(path)
    errors = validate(bank, dlc_names(bank.get("rulesetId") or DEFAULT_RULESET))
    for e in errors:
        print(e)
    print(f"{path}: {len(bank.get('questions', []))} questions, {len(errors)} errors")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
