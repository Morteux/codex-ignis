"""Review of the whole bank (T4109): duplicates, ambiguous answers and the count report."""
import copy, os, sys, unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace("\\", "/")
sys.path.insert(0, ROOT + "/tools/testellaris")
import question_bank as qb  # noqa: E402
import review_bank as rb  # noqa: E402


def question(qid, answers, correct=0, text="Which of these is a thing?"):
    return {
        "id": qid, "tier": 1, "topic": qid.split(".")[0], "dlc": [],
        "source": {"file": "common/x.txt", "key": qid.split(".")[2]},
        "text": {lang: text for lang in qb.LANGS},
        "answers": {lang: list(answers) for lang in qb.LANGS},
        "correct": correct,
        "explanation": {lang: "Because." for lang in qb.LANGS},
    }


def bank(*questions):
    return {"rulesetId": qb.DEFAULT_RULESET, "count": len(questions), "questions": list(questions)}


class ReviewTest(unittest.TestCase):
    def test_duplicate_is_found(self):
        a = question("economy.hand.a", ["A", "B", "C", "D"])
        b = question("economy.hand.b", ["D", "C", "B", "A"], correct=3)
        self.assertEqual(rb.find_duplicates([a, b]), [("economy.hand.a", "economy.hand.b")])

    def test_distractor_that_is_right_elsewhere_is_ambiguous(self):
        a = question("economy.hand.a", ["A", "B", "C", "D"])
        b = question("economy.hand.b", ["B", "E", "F", "G"])
        found = rb.find_ambiguous([a, b])
        self.assertEqual([qid for qid, _ in found], ["economy.hand.a"])

    def test_same_answers_other_correct_is_ambiguous(self):
        a = question("economy.hand.a", ["A", "B", "C", "D"])
        b = question("economy.hand.b", ["A", "B", "C", "D"], correct=2)
        self.assertTrue(rb.find_ambiguous([a, b]))

    def test_different_texts_are_not_ambiguous(self):
        a = question("economy.hand.a", ["A", "B", "C", "D"])
        b = question("economy.hand.b", ["B", "E", "F", "G"], text="Which of these is another thing?")
        self.assertEqual(rb.find_ambiguous([a, b]), [])

    def test_comparative_templates_are_left_out(self):
        a = question("economy.job_most_output.a", ["A", "B", "C", "D"], text="Which has the most?")
        b = question("economy.job_most_output.b", ["B", "E", "F", "G"], text="Which has the most?")
        self.assertEqual(rb.find_ambiguous([a, b]), [])

    def test_folded_repeat_is_ambiguous(self):
        a = question("economy.hand.a", ["A", "B", "C", "D"])
        a["answers"]["jp"] = ["Ａ", "A", "C", "D"]
        self.assertIn("answers in jp", rb.find_ambiguous([a])[0][1])

    def test_report_counts(self):
        a = question("economy.hand.a", ["A", "B", "C", "D"])
        b = copy.deepcopy(a)
        b.update(id="technology.hand.b", topic="technology", tier=5, correct=2, dlc=["Utopia"])
        r = rb.report(bank(a, b))
        self.assertEqual(r["count"], 2)
        self.assertEqual(r["tiers"][1], 1)
        self.assertEqual(r["baseGameTiers"][5], 0)
        self.assertEqual(r["topics"]["technology"]["tiers"], [0, 0, 0, 0, 1])
        self.assertEqual(r["correctPosition"], [1, 0, 1, 0])
        self.assertEqual(r["dlcQuestions"], 1)
        self.assertTrue(any("tier 2" in w for w in r["warnings"]))


class GeneratedBankReviewTest(unittest.TestCase):
    """The generated bank has no duplicates nor ambiguous questions, and its saved report is current."""

    @classmethod
    def setUpClass(cls):
        cls.report = rb.report(qb.load(qb.bank_path()))

    def test_no_duplicates(self):
        self.assertEqual(self.report["duplicates"], [])

    def test_no_ambiguous(self):
        self.assertEqual(self.report["ambiguous"], [])

    def test_every_tier_has_base_game_questions(self):
        for t in qb.TIERS:
            self.assertGreaterEqual(self.report["baseGameTiers"][t], 25, f"tier {t}")

    def test_saved_report_is_current(self):
        with open(rb.report_path(), encoding="utf-8") as f:
            self.assertEqual(f.read(), rb.dumps(self.report), "run python tools/testellaris/review_bank.py")


if __name__ == "__main__":
    unittest.main()
