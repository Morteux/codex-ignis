"""Testellaris question bank validator (T4101): run with `python -m unittest discover -s tests/testellaris`."""
import copy, os, sys, unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace("\\", "/")
sys.path.insert(0, ROOT + "/tools/testellaris")
import question_bank as qb  # noqa: E402

GOOD = {
    "id": "technology.tech_tier.tech_lasers_1",
    "tier": 1,
    "topic": "technology",
    "category": "engineering",
    "dlc": [],
    "source": {"file": "common/technology/00_phys_weapon_tech.txt", "key": "tech_lasers_1"},
    "text": {"es": "¿Pregunta?", "en": "Question?", "jp": "質問？"},
    "answers": {"es": ["0", "1", "2", "3"], "en": ["0", "1", "2", "3"], "jp": ["0", "1", "2", "3"]},
    "correct": 1,
    "explanation": {"es": "Porque sí.", "en": "Because.", "jp": "理由。"},
}


def bank(*questions):
    return {"rulesetId": qb.DEFAULT_RULESET, "count": len(questions), "questions": list(questions)}


def variant(**changes):
    q = copy.deepcopy(GOOD)
    for k, v in changes.items():
        if v is None:
            q.pop(k, None)
        else:
            q[k] = v
    return q


class ValidatorTest(unittest.TestCase):
    def assertInvalid(self, b, fragment):
        errors = qb.validate(b, {"Utopia", "Megacorp"})
        self.assertTrue(any(fragment in e for e in errors), f"no error with {fragment!r} in {errors}")

    def test_good_question_passes(self):
        self.assertEqual(qb.validate(bank(GOOD, variant(id="civics.hand.civic_x", topic="civics", dlc=["Utopia"], icon="civics/x.png")), {"Utopia"}), [])

    def test_unique_ids(self):
        self.assertInvalid(bank(GOOD, copy.deepcopy(GOOD)), "duplicate id")

    def test_id_format_and_topic(self):
        self.assertInvalid(bank(variant(id="tech_lasers_1")), "id must be")
        self.assertInvalid(bank(variant(topic="civics")), "id starts with")
        self.assertInvalid(bank(variant(id="cooking.hand.x", topic="cooking")), "unknown topic")

    def test_tier_in_range(self):
        for tier in (0, 6, "1", True, None):
            self.assertInvalid(bank(variant(tier=tier)), "tier")

    def test_four_distinct_answers(self):
        three = {lang: ["a", "b", "c"] for lang in qb.LANGS}
        self.assertInvalid(bank(variant(answers=three)), "four texts")
        same = dict(GOOD["answers"], en=["a", "b", "A", "c"])
        self.assertInvalid(bank(variant(answers=same)), "not four distinct")
        empty = dict(GOOD["answers"], jp=["a", "", "c", "d"])
        self.assertInvalid(bank(variant(answers=empty)), "four texts")

    def test_every_language_present(self):
        for field in ("text", "explanation", "answers"):
            q = variant()
            del q[field]["jp"]
            self.assertInvalid(bank(q), f"{field} " if field != "answers" else "answers in jp")
        self.assertInvalid(bank(variant(text=dict(GOOD["text"], fr="Question ?"))), "unknown language fr")

    def test_source_present(self):
        self.assertInvalid(bank(variant(source=None)), "missing field source")
        self.assertInvalid(bank(variant(source={"file": "common/x.txt"})), "source needs")
        self.assertInvalid(bank(variant(source={"file": "", "key": "x"})), "source needs")

    def test_wiki_source(self):
        wiki = {"kind": "wiki", "article": "Ambition", "section": "Galactic Nemesis"}
        good = variant(id="crises.wiki.galactic_nemesis_crisis_level", topic="crises", source=wiki)
        checked = variant(id="crises.wiki.checked", topic="crises", source=dict(wiki, file="common/ascension_perks/00_ascension_perks.txt", key="ap_become_the_crisis"))
        self.assertEqual(qb.validate(bank(good, checked), set()), [])
        self.assertInvalid(bank(variant(id="crises.wiki.x", topic="crises", source=dict(wiki, section=""))), "article and a section")
        self.assertInvalid(bank(variant(id="crises.wiki.x", topic="crises", source={"kind": "wiki", "section": "x"})), "article and a section")
        self.assertInvalid(bank(variant(id="crises.wiki.x", topic="crises", source=dict(wiki, kind="forum"))), "unknown source kind")
        self.assertInvalid(bank(variant(id="crises.wiki.x", topic="crises", source=dict(wiki, url="https://x"))), "unknown source field url")
        self.assertInvalid(bank(variant(id="crises.wiki.x", topic="crises", source=dict(wiki, file="common/x.txt"))), "both a game file and a key")
        self.assertInvalid(bank(variant(id="crises.hand.x", topic="crises", source=wiki)), "template 'wiki'")
        self.assertInvalid(bank(variant(id="technology.wiki.tech_lasers_1")), "only for wiki sources")

    def test_wiki_source_against_local_copy(self):
        if not os.path.isdir(qb.WIKI_DIR):
            self.skipTest("no local copy of the wiki")
        q = lambda article, section: variant(id="crises.wiki.x", topic="crises", source={"kind": "wiki", "article": article, "section": section})
        self.assertEqual(qb.validate(bank(q("Ambition", "Galactic Nemesis")), set(), qb.WIKI_DIR), [])
        self.assertEqual(qb.validate(bank(q("Ambition", "Ambition")), set(), qb.WIKI_DIR), [])
        self.assertTrue(any("not in the local copy" in e for e in qb.validate(bank(q("No Such Article", "x")), set(), qb.WIKI_DIR)))
        self.assertTrue(any("has no section" in e for e in qb.validate(bank(q("Ambition", "No such section")), set(), qb.WIKI_DIR)))

    def test_correct_answer(self):
        for c in (-1, 4, "0", None):
            self.assertInvalid(bank(variant(correct=c)), "correct")

    def test_dlc_names(self):
        self.assertInvalid(bank(variant(dlc=["Not A DLC"])), "unknown DLC")
        self.assertInvalid(bank(variant(dlc="Utopia")), "dlc must be")
        self.assertInvalid(bank(variant(dlc=["Utopia", "Utopia"])), "repeated DLC")

    def test_localisation_codes_rejected(self):
        self.assertInvalid(bank(variant(text=dict(GOOD["text"], en="§YRed Lasers§!?"))), "localisation codes")
        self.assertInvalid(bank(variant(answers=dict(GOOD["answers"], es=["£unity£", "1", "2", "3"]))), "localisation codes")

    def test_category(self):
        """T4403: one of the four categories, required; every topic has a default category."""
        self.assertInvalid(bank(variant(category=None)), "missing field category")
        self.assertInvalid(bank(variant(category="military")), "unknown category")
        self.assertEqual(set(qb.TOPIC_CATEGORY), set(qb.TOPICS))
        self.assertEqual(qb.CATEGORIES, ("engineering", "physics", "society", "unity"))

    def test_unknown_field_and_count(self):
        self.assertInvalid(bank(variant(hint="x")), "unknown field hint")
        b = bank(GOOD)
        b["count"] = 2
        self.assertInvalid(b, "count")


class BankTest(unittest.TestCase):
    """The bank of the current ruleset, when it exists (T4111 generates it)."""

    def test_bank_is_valid(self):
        path = qb.bank_path()
        if not os.path.exists(path):
            self.skipTest("no question bank yet")
        b = qb.load(path)
        self.assertEqual(b["rulesetId"], qb.DEFAULT_RULESET)
        self.assertEqual(qb.validate(b, qb.dlc_names(), qb.WIKI_DIR), [])

    def test_bank_has_wiki_questions_in_every_tier(self):
        """First batch of hand-written wiki questions (T4402): about 150, all tiers, some in the base game."""
        path = qb.bank_path()
        if not os.path.exists(path):
            self.skipTest("no question bank yet")
        wiki = [q for q in qb.load(path)["questions"] if qb.is_wiki(q)]
        self.assertGreaterEqual(len(wiki), 150)
        for tier in qb.TIERS:
            self.assertGreaterEqual(sum(1 for q in wiki if q["tier"] == tier), 20, f"tier {tier}")
            self.assertTrue(any(not q["dlc"] for q in wiki if q["tier"] == tier), f"no base-game wiki question in tier {tier}")
        positions = [sum(1 for q in wiki if q["correct"] == p) for p in range(4)]
        self.assertLessEqual(max(positions) - min(positions), 1, positions)


if __name__ == "__main__":
    unittest.main()
