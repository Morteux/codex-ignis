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
        self.assertEqual(r["wiki"]["count"], 0)

    def test_wiki_questions_counted_apart(self):
        a = question("economy.hand.a", ["A", "B", "C", "D"])
        w = question("crises.wiki.w", ["E", "F", "G", "H"], text="Which of these is another thing?")
        w.update(tier=3, dlc=["Nemesis"], source={"kind": "wiki", "article": "Ambition", "section": "Galactic Nemesis", "file": "common/x.txt", "key": "x"})
        r = rb.report(bank(a, w), wiki_dir=None)
        self.assertEqual(r["count"], 2)
        self.assertEqual(r["wiki"], {"count": 1, "tiers": {1: 0, 2: 0, 3: 1, 4: 0, 5: 0}, "topics": {"crises": 1}, "dlcQuestions": 1, "checkedAgainstData": 1})
        self.assertEqual(r["copied"], [])

    def test_copied_wiki_text_is_found(self):
        if not os.path.isdir(qb.WIKI_DIR):
            self.skipTest("no local copy of the wiki")
        own = question("crises.wiki.own", ["A", "B", "C", "D"], text="At which level does a Galactic Nemesis become a crisis for everyone?")
        own["source"] = {"kind": "wiki", "article": "Ambition", "section": "Galactic Nemesis"}
        copied = copy.deepcopy(own)
        copied["id"] = "crises.wiki.copied"
        copied["explanation"]["en"] = "It should be noted that only upon reaching the fifth ambition level is the empire treated as a crisis."
        self.assertEqual([qid for qid, _ in rb.find_copied([own, copied])], ["crises.wiki.copied"])


class GeneratedBankReviewTest(unittest.TestCase):
    """The generated bank has no duplicates nor ambiguous questions, and its saved report is current."""

    @classmethod
    def setUpClass(cls):
        cls.report = rb.report(qb.load(qb.bank_path()))

    def test_no_duplicates(self):
        self.assertEqual(self.report["duplicates"], [])

    def test_no_ambiguous(self):
        self.assertEqual(self.report["ambiguous"], [])

    def test_no_copied_wiki_text(self):
        self.assertEqual(self.report["copied"], [])

    def test_every_tier_has_base_game_questions(self):
        for t in qb.TIERS:
            self.assertGreaterEqual(self.report["baseGameTiers"][t], 25, f"tier {t}")

    def test_saved_report_is_current(self):
        with open(rb.report_path(), encoding="utf-8") as f:
            self.assertEqual(f.read(), rb.dumps(self.report), "run python tools/testellaris/review_bank.py")


if __name__ == "__main__":
    unittest.main()
