"""Shroud, astral, artifact, subject and modifier questions (T4108): the condition readers and each
answer against the data."""
import unittest

from bank_case import BankCase
import q_economy as qe
import q_shroud as qs


class ReaderTest(unittest.TestCase):
    def test_overlord_lines(self):
        text = "owner = {\n\toverlord = {\n\t\thas_valid_civic = civic_a\n\t\tNOT = {\n\t\t\thas_origin = origin_b\n\t\t}\n\t}\n}"
        self.assertEqual(qs.overlord_lines(text), [("has_valid_civic", "civic_a")])
        self.assertEqual(qs.overlord_lines("owner = {\n\tNOT = {\n\t\toverlord = {\n\t\t\thas_civic = civic_a\n\t\t}\n\t}\n}"), [])

    def test_overlord_technology(self):
        self.assertEqual(qs.overlord_technology("owner.overlord = {\n\thas_technology = tech_a\n}"), "tech_a")
        self.assertIsNone(qs.overlord_technology("owner = {\n\thas_technology = tech_a\n}"))


class ShroudFactsTest(BankCase):
    def item(self, set_name, name):
        return self.d.by_id(set_name)[self.ids(set_name)[name]]

    def source(self, q, set_name):
        return self.d.by_id(set_name)[q["source"]["key"]]

    def test_content(self):
        for template, set_name in (("content_modifier", "static_modifiers"), ("content_feature", "deposits")):
            for q in self.questions(template, 10):
                dlc, part, _ = qs.THEMES[q["topic"]]
                self.assertEqual(q["dlc"], [dlc])
                self.assert_one_true(q, lambda a: part in qs.file_name(self.item(set_name, a)))

    def test_gifts_and_archaeotech(self):
        for q in self.questions("patron_gift", 4):
            self.assertEqual(self.correct(q), self.source(q, "static_modifiers")["name"])
        for q in self.questions("archaeotech", 5):
            self.assert_one_true(q, lambda a: "archaeostudies" in self.item("technologies", a)["category"])

    def test_holdings(self):
        for q in self.questions("holding", 15):
            self.assert_one_true(q, lambda a: self.item("buildings", a)["owner_type"] == "subject_holding")
        for q in self.questions("holding_loyalty", 8):
            self.assertEqual(float(self.correct(q)), self.source(q, "buildings")["planet_modifier"]["monthly_loyalty"])
        for q in self.questions("holding_loyalty_gain", 1):
            gains = lambda a: self.item("buildings", a)["planet_modifier"]["monthly_loyalty"] > 0
            self.assert_one_true(q, gains)
        for q in self.questions("holding_overlord", 5):
            potential = self.source(q, "buildings")["potential"]
            self.assert_one_true(q, lambda a: any(self.ids(s).get(a, "\0") in potential for s in ("civics", "origins")))
        for q in self.questions("holding_technology", 1):
            tid = qs.overlord_technology(self.source(q, "buildings")["allow"])
            self.assertEqual(self.correct(q), self.d.loc["en"]["technologies"][tid].strip())
        for q in self.questions("holding_job", 8):
            given = {self.d.loc["en"]["jobs"].get(j) for j in qe.jobs_of_modifiers(self.source(q, "buildings"))}
            self.assert_one_true(q, lambda a: a in given)

    def test_effects(self):
        for template in ("modifier_raises", "modifier_amount"):
            for q in self.questions(template, 10):
                keys, mark, *_, share = qs.EFFECTS[q["id"].split(".")[3]]
                value = next(self.source(q, "static_modifiers")["modifier"][k] for k in keys
                             if k in self.source(q, "static_modifiers")["modifier"])
                if template == "modifier_amount":
                    self.assertEqual(self.correct(q), qs.amount(value, share))
                else:
                    self.assertGreater(value, 0)
                    self.assert_one_true(q, lambda a: any(mark in m for m in self.item("static_modifiers", a)["modifier"]))
                self.assert_named_or_answered(q, template)

    def assert_named_or_answered(self, q, template):
        if template == "modifier_amount":
            self.assert_named(q, "static_modifiers", q["source"]["key"])
        else:
            for lang in ("es", "en", "jp"):
                self.assertEqual(self.correct(q, lang), self.d.loc[lang]["static_modifiers"][q["source"]["key"]].strip())


if __name__ == "__main__":
    unittest.main()
