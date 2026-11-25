"""Testellaris question bank validator (T4101): run with `python -m unittest discover -s tests/testellaris`."""
import copy, os, sys, unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace("\\", "/")
sys.path.insert(0, ROOT + "/tools/testellaris")
import question_bank as qb  # noqa: E402

GOOD = {
    "id": "technology.tech_tier.tech_lasers_1",
    "tier": 1,
    "topic": "technology",
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
        self.assertEqual(qb.validate(b, qb.dlc_names()), [])


if __name__ == "__main__":
    unittest.main()
