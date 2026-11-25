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
          "category": "engineering",                     # one of CATEGORIES (T4403)
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

Questions from the community wiki (T4401, GDD §5.3) use "wiki" as their template part of the id
and cite the article and section of the local 4.5.2 copy instead of a game file:

    "source": {"kind": "wiki", "article": "Ambition", "section": "Galactic Nemesis"}

plus "file", "key" (and "loc") of the extractor data a number or name was checked against, when
the data has it. Every "wiki" id has a wiki source and every wiki source a "wiki" id. When the
local wiki copy exists, the article must be one of its files and the section one of its headings.

Every question has one thematic `category` (T4403, GDD §5.4), named after the research areas of
the game plus unity: engineering, physics, society or unity. TOPIC_CATEGORY gives the default of
each topic; a generator template (generate_questions.TEMPLATE_CATEGORY) or a hand-written or wiki
question may choose another one.

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
    "megastructures", "crises", "fallen_empires", "events", "astral", "artifacts",
)
# Thematic categories (T4403, owner 2026-11-26), in the order the page shows them.
CATEGORIES = ("engineering", "physics", "society", "unity")
# Default category of each topic (GDD §5.4); templates and questions may override it.
TOPIC_CATEGORY = {
    "economy": "engineering", "policies": "engineering", "modifiers": "engineering",
    "ships": "engineering", "megastructures": "engineering",
    "technology": "physics", "planets": "physics", "shroud": "physics", "astral": "physics",
    "origins": "society", "civics": "society", "ethics": "society", "government": "society",
    "leaders": "society", "species": "society", "subjects": "society",
    "traditions": "unity", "crises": "unity", "fallen_empires": "unity", "events": "unity",
    "artifacts": "unity",
}
assert set(TOPIC_CATEGORY) == set(TOPICS) and set(TOPIC_CATEGORY.values()) <= set(CATEGORIES)
FIELDS = {"id", "tier", "topic", "category", "dlc", "source", "text", "answers", "correct", "explanation", "icon"}
REQUIRED = FIELDS - {"icon"}
SOURCE_FIELDS = {"file", "key", "loc"}
WIKI_SOURCE_FIELDS = {"kind", "article", "section"} | SOURCE_FIELDS
WIKI_TEMPLATE = "wiki"
# Local copy of the community wiki (owner, section 44): one Markdown file per article.
WIKI_VERSION = "4.5.2"
WIKI_DIR = os.path.join(os.path.dirname(ROOT), "Codex Ignis Wiki", "markdown", "v4-5-2").replace("\\", "/")
HEADING_RE = re.compile(r"^#{1,6}\s+(.+?)\s*#*\s*$", re.M)
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


_headings = {}


def wiki_article_path(article, wiki_dir=WIKI_DIR):
    return f"{wiki_dir}/{article}.md"


def wiki_headings(article, wiki_dir=WIKI_DIR):
    """Headings of a wiki article of the local copy (the title is the first), or None if it has no file."""
    path = wiki_article_path(article, wiki_dir)
    if path not in _headings:
        if not os.path.exists(path):
            _headings[path] = None
        else:
            with open(path, encoding="utf-8") as f:
                _headings[path] = [h.strip() for h in HEADING_RE.findall(f.read())]
    return _headings[path]


def is_wiki(q):
    src = q.get("source") if isinstance(q, dict) else None
    return isinstance(src, dict) and src.get("kind") == "wiki"


def _text(value):
    return isinstance(value, str) and value.strip() != ""


def validate_question(q, known_dlc=None, wiki_dir=None):
    """Errors of one question record (empty list = valid). With `wiki_dir`, wiki sources are checked
    against the local copy of the wiki (article file and section heading)."""
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
    if "category" in q and q["category"] not in CATEGORIES:
        err(f"unknown category {q['category']!r} (one of {', '.join(CATEGORIES)})")
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
    wiki_id = bool(m) and m.group(2) == WIKI_TEMPLATE
    if isinstance(src, dict) and "kind" in src:
        if src["kind"] != "wiki":
            err(f"unknown source kind {src['kind']!r}")
        elif not _text(src.get("article")) or not _text(src.get("section")):
            err("wiki source needs an article and a section")
        else:
            for f in sorted(src.keys() - WIKI_SOURCE_FIELDS):
                err(f"unknown source field {f}")
            if ("file" in src) != ("key" in src) or ("file" in src and not (_text(src["file"]) and _text(src["key"]))):
                err("wiki source checked against the data needs both a game file and a key")
            if "loc" in src and not _text(src["loc"]):
                err("source loc must be a localisation key")
            if not wiki_id and m:
                err(f"wiki question needs the template {WIKI_TEMPLATE!r} in its id")
            if wiki_dir and os.path.isdir(wiki_dir):
                heads = wiki_headings(src["article"], wiki_dir)
                if heads is None:
                    err(f"wiki article {src['article']!r} is not in the local copy")
                elif src["section"].strip() not in heads:
                    err(f"wiki article {src['article']!r} has no section {src['section']!r}")
    elif not isinstance(src, dict) or not _text(src.get("file")) or not _text(src.get("key")):
        err("source needs a game file and a key")
    else:
        if wiki_id:
            err(f"template {WIKI_TEMPLATE!r} is only for wiki sources")
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


def validate(bank, known_dlc=None, wiki_dir=None):
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
        errors += validate_question(q, known_dlc, wiki_dir)
        qid = q.get("id") if isinstance(q, dict) else None
        if qid in seen:
            errors.append(f"{qid}: duplicate id")
        seen.add(qid)
    return errors


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    path = sys.argv[1] if len(sys.argv) > 1 else bank_path()
    bank = load(path)
    errors = validate(bank, dlc_names(bank.get("rulesetId") or DEFAULT_RULESET), WIKI_DIR)
    for e in errors:
        print(e)
    wiki = sum(1 for q in bank.get("questions", []) if is_wiki(q))
    print(f"{path}: {len(bank.get('questions', []))} questions ({wiki} from the wiki), {len(errors)} errors")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
