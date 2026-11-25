"""Shared base of the fact tests of the generated bank: the questions of a template and the way
back from an answer (an official English name) to the item of the extractor data."""
import os, sys, unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace("\\", "/")
sys.path.insert(0, ROOT + "/tools/testellaris")
sys.path.insert(0, ROOT + "/tools/extract")
import generate_questions as gq  # noqa: E402
import question_bank as qb  # noqa: E402

DATA = f"{ROOT}/data/generated/{qb.DEFAULT_RULESET}"


class BankCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bank = qb.load(qb.bank_path())
        cls.d = gq.Data(DATA)
        cls._ids = {}

    def questions(self, template, at_least=1):
        out = [q for q in self.bank["questions"] if q["id"].split(".")[1] == template]
        self.assertGreaterEqual(len(out), at_least, f"template {template}")
        return out

    def ids(self, set_name):
        """{official English name: id} of the items of a set with a usable name."""
        if set_name not in self._ids:
            names = self.d.loc["en"].get(set_name, {})
            self._ids[set_name] = {self.d.name(set_name, k)["en"]: k for k in names if self.d.name(set_name, k)}
        return self._ids[set_name]

    def key(self, q):
        return q["source"]["key"]

    def correct(self, q, lang="en"):
        return q["answers"][lang][q["correct"]]

    def wrong(self, q, lang="en"):
        return [a for i, a in enumerate(q["answers"][lang]) if i != q["correct"]]

    def assert_one_true(self, q, truth):
        """`truth(answer)` is true for the correct answer and false for the other three."""
        self.assertEqual([i for i, a in enumerate(q["answers"]["en"]) if truth(a)], [q["correct"]], q["answers"]["en"])

    def assert_named(self, q, set_name, item_id):
        """The official name of the item is in the question text in every language."""
        for lang in qb.LANGS:
            self.assertIn(self.d.loc[lang][set_name][item_id].strip(), q["text"][lang])
