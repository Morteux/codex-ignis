"""Review of a whole Testellaris question bank (T4109).

The validator (question_bank.py) checks each record on its own; this review looks at the bank as a
whole and reports what a player would notice:

- duplicates: two questions with the same text (in any language), the same four answers and the
  same correct answer;
- ambiguous answers: two questions with the same English text where the correct answer of one is a
  wrong answer of the other (for "Which of these X is Y?" this means a distractor also is Y), two
  questions with the same text and answers but another correct answer, and questions whose
  answers repeat a text in one language once case and width are folded;
  (comparative templates, "which of these has the most…", are left out: see COMPARATIVE);
- balance: questions per tier and per topic, per template, position of the correct answer, share of
  DLC questions; tiers or topics far below the others are listed as warnings;
- categories (T4403): questions per category and tier; a category further than CATEGORY_TOLERANCE
  from the average of the four categories, in the whole bank or in a tier, is flagged, with how
  many questions it would still need (only adding questions) to enter the target;
- wiki questions (T4401): counted apart (per tier, per topic, with a DLC, checked against the
  extractor data) and, when the local wiki copy exists, compared with their article: an English
  text, answer or explanation that repeats COPY_WORDS words in a row of the article is reported as
  copied (questions are written in our own words, GDD §5.3).

Run `python tools/testellaris/review_bank.py [bank.json] [--json report.json]`; it prints the count
report and exits with 1 when it finds duplicates, ambiguous or copied questions.
"""
import argparse, collections, json, os, re, sys, unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import question_bank as qb

# Balance thresholds (proposal T4109, DECISIONS_TO_REVIEW.md): a tier with less than this share of
# the bank, or a correct-answer position far from 25 %, is a warning (not an error).
MIN_TIER_SHARE = 0.10
MAX_POSITION_SKEW = 0.05
MIN_TOPIC_QUESTIONS = 20
# Templates that ask for the highest or lowest value among the four answers: the same answer can be
# the right one against weaker options and a wrong one against stronger options, so the same-text
# check does not apply to them (their generators only pick distractors with a strictly lower value,
# so there are no ties).
COMPARATIVE = {
    "building_slowest", "job_most_output", "living_power_most", "living_upkeep_most",
    "tech_highest_cost", "tech_highest_tier",
}

# Balance of the categories (owner, T4403, GDD §5.4): each within ±20 % of the average of the four,
# in the whole bank and in every tier.
CATEGORY_TOLERANCE = 0.20


def within(counts, tolerance=CATEGORY_TOLERANCE):
    avg = sum(counts.values()) / len(counts)
    return all(abs(v - avg) <= tolerance * avg for v in counts.values())


def balance_needs(counts, tolerance=CATEGORY_TOLERANCE):
    """{category: questions to add} so that every category ends within the tolerance of the
    average, only adding questions (never removing): one at a time to the smallest category."""
    now = dict(counts)
    if not sum(now.values()):
        return {c: 0 for c in now}
    while not within(now, tolerance):
        smallest = min(now, key=lambda c: (now[c], c))
        now[smallest] += 1
    return {c: now[c] - counts[c] for c in counts}


# Words in a row shared with the wiki article that count as copied text (proposal T4401).
COPY_WORDS = 8
WORD_RE = re.compile(r"[a-z0-9]+(?:['’][a-z]+)?")
# Markdown of the wiki copy that is not prose: images and link targets.
MARKUP_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)|\]\([^)]*\)")


def _words(text):
    return WORD_RE.findall(MARKUP_RE.sub(" ", _fold(text)))


def _runs(words, n=COPY_WORDS):
    return {tuple(words[i:i + n]) for i in range(len(words) - n + 1)}


def find_copied(questions, wiki_dir=qb.WIKI_DIR):
    """[(id, problem)]: wiki questions whose English text repeats COPY_WORDS words of their article."""
    out = []
    if not wiki_dir or not os.path.isdir(wiki_dir):
        return out
    articles = {}
    for q in questions:
        if not qb.is_wiki(q):
            continue
        article = q["source"]["article"]
        if article not in articles:
            path = qb.wiki_article_path(article, wiki_dir)
            articles[article] = set()
            if os.path.exists(path):
                with open(path, encoding="utf-8") as f:
                    articles[article] = _runs(_words(f.read()))
        runs = articles[article]
        for field, texts in (("text", [q["text"]["en"]]), ("answers", q["answers"]["en"]), ("explanation", [q["explanation"]["en"]])):
            if any(_runs(_words(t)) & runs for t in texts):
                out.append((q["id"], f"{field} copies {COPY_WORDS} or more words in a row of the wiki article {article!r}"))
    return out


def _fold(text):
    return unicodedata.normalize("NFKC", text).strip().casefold()


def _correct(q, lang="en"):
    return q["answers"][lang][q["correct"]]


def find_duplicates(questions):
    """[(kept id, duplicate id)]: same text, same answer set and same correct answer in one language."""
    out = []
    for lang in qb.LANGS:
        seen = {}
        for q in questions:
            key = (_fold(q["text"][lang]), frozenset(_fold(a) for a in q["answers"][lang]), _fold(_correct(q, lang)))
            if key in seen:
                pair = (seen[key], q["id"])
                if pair not in out:
                    out.append(pair)
            else:
                seen[key] = q["id"]
    return out


def find_ambiguous(questions):
    """[(id, problem)]: a fact the player cannot tell apart from the question text alone."""
    out = []
    by_text = collections.defaultdict(list)
    for q in questions:
        if q["id"].split(".")[1] not in COMPARATIVE:
            by_text[_fold(q["text"]["en"])].append(q)
    for group in by_text.values():
        if len(group) < 2:
            continue
        for q in group:
            wrong = {_fold(a) for i, a in enumerate(q["answers"]["en"]) if i != q["correct"]}
            for other in group:
                if other is q:
                    continue
                right = _fold(_correct(other))
                if right in wrong:
                    out.append((q["id"], f"distractor {_correct(other)!r} is the correct answer of {other['id']}"))
                elif right != _fold(_correct(q)) and {_fold(a) for a in q["answers"]["en"]} == {_fold(a) for a in other["answers"]["en"]}:
                    out.append((q["id"], f"same text and answers as {other['id']} but another correct answer"))
    for q in questions:
        for lang in qb.LANGS:
            if len({_fold(a) for a in q["answers"][lang]}) != 4:
                out.append((q["id"], f"answers in {lang} repeat a text once folded"))
    return out


def report(bank, wiki_dir=qb.WIKI_DIR):
    questions = bank["questions"]
    n = len(questions)
    tiers = collections.Counter(q["tier"] for q in questions)
    topics = collections.Counter(q["topic"] for q in questions)
    grid = collections.Counter((q["topic"], q["tier"]) for q in questions)
    templates = collections.Counter(q["id"].split(".")[1] for q in questions)
    positions = collections.Counter(q["correct"] for q in questions)
    dlc = sum(1 for q in questions if q["dlc"])
    wiki = [q for q in questions if qb.is_wiki(q)]
    wiki_tiers = collections.Counter(q["tier"] for q in wiki)
    wiki_topics = collections.Counter(q["topic"] for q in wiki)
    base = collections.Counter(q["tier"] for q in questions if not q["dlc"])
    cats = collections.Counter(q["category"] for q in questions)
    cat_grid = collections.Counter((q["category"], q["tier"]) for q in questions)
    balance = []
    for scope in ("all",) + tuple(qb.TIERS):
        counts = {c: (cats[c] if scope == "all" else cat_grid[(c, scope)]) for c in qb.CATEGORIES}
        avg = sum(counts.values()) / len(counts)
        needs = balance_needs(counts)
        for c in qb.CATEGORIES:
            if abs(counts[c] - avg) > CATEGORY_TOLERANCE * avg:
                balance.append({"category": c, "tier": scope, "count": counts[c], "average": round(avg, 1),
                                "side": "below" if counts[c] < avg else "above", "add": needs[c]})
    warnings = []
    for t in qb.TIERS:
        if base[t] < 25:  # a game asks 5 questions per tier; keep several games without repeats
            warnings.append(f"tier {t} has only {base[t]} base-game questions")
    for t in qb.TIERS:
        if n and tiers[t] / n < MIN_TIER_SHARE:
            warnings.append(f"tier {t} has {tiers[t]} questions ({tiers[t] / n:.0%} of the bank, below {MIN_TIER_SHARE:.0%})")
    for p in range(4):
        if n and abs(positions[p] / n - 0.25) > MAX_POSITION_SKEW:
            warnings.append(f"the correct answer is in position {p} in {positions[p] / n:.0%} of the questions")
    for topic in qb.TOPICS:
        if topics[topic] < MIN_TOPIC_QUESTIONS:
            warnings.append(f"topic {topic} has {topics[topic]} questions")
    for topic in sorted(topics):
        missing = [t for t in qb.TIERS if not grid[(topic, t)]]
        if missing:
            warnings.append(f"topic {topic} has no questions in tier {', '.join(map(str, missing))}")
    return {
        "rulesetId": bank.get("rulesetId"),
        "count": n,
        "tiers": {t: tiers[t] for t in qb.TIERS},
        "baseGameTiers": {t: base[t] for t in qb.TIERS},
        "topics": {topic: {"total": topics[topic], "tiers": [grid[(topic, t)] for t in qb.TIERS]} for topic in qb.TOPICS},
        "templates": dict(sorted(templates.items())),
        "correctPosition": [positions[p] for p in range(4)],
        "dlcQuestions": dlc,
        "categories": {c: {"total": cats[c], "tiers": [cat_grid[(c, t)] for t in qb.TIERS]} for c in qb.CATEGORIES},
        "categoryTolerance": CATEGORY_TOLERANCE,
        "categoryBalance": balance,
        "wiki": {
            "count": len(wiki),
            "tiers": {t: wiki_tiers[t] for t in qb.TIERS},
            "topics": dict(sorted(wiki_topics.items())),
            "dlcQuestions": sum(1 for q in wiki if q["dlc"]),
            "checkedAgainstData": sum(1 for q in wiki if "file" in q["source"]),
        },
        "duplicates": [list(p) for p in find_duplicates(questions)],
        "ambiguous": [list(p) for p in find_ambiguous(questions)],
        "copied": [list(p) for p in find_copied(questions, wiki_dir)],
        "warnings": warnings,
    }


def print_report(r):
    print(f"{r['rulesetId']}: {r['count']} questions, {r['dlcQuestions']} need a DLC")
    print(f"{'topic':<16}" + "".join(f"{'T' + str(t):>6}" for t in qb.TIERS) + f"{'total':>8}")
    for topic, row in r["topics"].items():
        print(f"{topic:<16}" + "".join(f"{v:>6}" for v in row["tiers"]) + f"{row['total']:>8}")
    print(f"{'total':<16}" + "".join(f"{r['tiers'][t]:>6}" for t in qb.TIERS) + f"{r['count']:>8}")
    print(f"{'base game':<16}" + "".join(f"{r['baseGameTiers'][t]:>6}" for t in qb.TIERS))
    print(f"{'category':<16}" + "".join(f"{'T' + str(t):>6}" for t in qb.TIERS) + f"{'total':>8}")
    for c, row in r["categories"].items():
        print(f"{c:<16}" + "".join(f"{v:>6}" for v in row["tiers"]) + f"{row['total']:>8}")
    tol = f"±{r['categoryTolerance']:.0%}"
    if not r["categoryBalance"]:
        print(f"categories balanced: every category within {tol} of the average, overall and in every tier")
    for b in r["categoryBalance"]:
        where = "overall" if b["tier"] == "all" else f"in tier {b['tier']}"
        need = f", needs {b['add']} more" if b["add"] else ""
        print(f"CATEGORY {b['category']} {where}: {b['count']} questions, {b['side']} {tol} of the average {b['average']}{need}")
    print("correct answer position: " + ", ".join(f"{p}: {v}" for p, v in enumerate(r["correctPosition"])))
    print(f"templates: {len(r['templates'])}")
    w = r["wiki"]
    print(f"wiki questions: {w['count']} (" + ", ".join(f"T{t}: {w['tiers'][t]}" for t in qb.TIERS)
          + f"), {w['dlcQuestions']} need a DLC, {w['checkedAgainstData']} checked against the extractor data")
    if w["topics"]:
        print("wiki topics: " + ", ".join(f"{k}: {v}" for k, v in w["topics"].items()))
    for a, b in r["duplicates"]:
        print(f"DUPLICATE {b} repeats {a}")
    for qid, why in r["ambiguous"]:
        print(f"AMBIGUOUS {qid}: {why}")
    for qid, why in r["copied"]:
        print(f"COPIED {qid}: {why}")
    for w in r["warnings"]:
        print(f"warning: {w}")
    print(f"{len(r['duplicates'])} duplicates, {len(r['ambiguous'])} ambiguous, {len(r['copied'])} copied, {len(r['warnings'])} warnings")


def report_path(ruleset_id=qb.DEFAULT_RULESET):
    return f"{qb.ROOT}/data/testellaris/{ruleset_id}/review.json"


def dumps(r):
    return json.dumps(r, ensure_ascii=False, indent=1) + "\n"


def main(argv=None):
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("bank", nargs="?", default=qb.bank_path())
    ap.add_argument("--json", help="where to write the report (default: review.json next to the default bank)")
    ap.add_argument("--no-write", action="store_true", help="only print the report")
    args = ap.parse_args(argv)
    r = report(qb.load(args.bank))
    print_report(r)
    out = args.json or (report_path(r["rulesetId"]) if args.bank == qb.bank_path() else None)
    if out and not args.no_write:
        with open(out, "w", encoding="utf-8", newline="\n") as f:
            f.write(dumps(r))
        print(f"report written to {out}")
    return 1 if r["duplicates"] or r["ambiguous"] or r["copied"] else 0


if __name__ == "__main__":
    sys.exit(main())
