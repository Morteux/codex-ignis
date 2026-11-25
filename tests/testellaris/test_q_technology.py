"""Technology and research questions (T4104): each answer against the data."""
import unittest

from bank_case import BankCase


class TechnologyFactsTest(BankCase):
    def tech(self, name):
        return self.d.by_id("technologies")[self.ids("technologies")[name]]

    def source_tech(self, q):
        return self.d.by_id("technologies")[self.key(q)]

    def needs(self, set_name, name):
        return self.d.by_id(set_name)[self.ids(set_name)[name]]["prerequisites"]

    def test_unlocks(self):
        for q in self.questions("tech_unlocks", 10):
            self.assert_one_true(q, lambda a: self.key(q) in self.tech(a)["prerequisites"])
            self.assert_named(q, "technologies", self.key(q))
        for q in self.questions("tech_unlocks_building", 10):
            self.assert_one_true(q, lambda a: self.key(q) in self.needs("buildings", a))

    def test_required_technology(self):
        for template, set_name in (("tech_for_blocker", "deposits"), ("tech_for_edict", "edicts"), ("tech_for_district", "districts")):
            for q in self.questions(template):
                item = self.d.by_id(set_name)[self.key(q)]
                self.assert_one_true(q, lambda a: item["prerequisites"] == [self.ids("technologies")[a]])
                self.assert_named(q, set_name, item["id"])

    def test_area_and_flags(self):
        for q in self.questions("tech_same_area", 10):
            area = self.source_tech(q)["area"]
            self.assert_one_true(q, lambda a: self.tech(a)["area"] == area)
        for template, flag in (("tech_starting", "start"), ("tech_rare", "rare"), ("tech_dangerous", "dangerous")):
            for q in self.questions(template, 10):
                self.assert_one_true(q, lambda a: self.tech(a)["flags"][flag])

    def test_highest(self):
        for template, field in (("tech_highest_cost", "cost"), ("tech_highest_tier", "tier")):
            for q in self.questions(template, 10):
                values = [self.tech(a)[field] for a in q["answers"]["en"]]
                self.assert_one_true(q, lambda a: self.tech(a)[field] == max(values))
                self.assertEqual(values.count(max(values)), 1, q["id"])
                self.assertIn(str(max(values)), q["explanation"]["en"])

    def test_two_prerequisites(self):
        for q in self.questions("tech_two_prerequisites", 10):
            pre = set(self.source_tech(q)["prerequisites"])
            self.assert_one_true(q, lambda a: {self.ids("technologies")[n] for n in a.split(" + ")} == pre)

    def test_dlc_levels_and_weight(self):
        for q in self.questions("tech_dlc", 10):
            self.assertEqual(self.source_tech(q)["dlc"], [self.correct(q)])
        for q in self.questions("tech_limited_levels"):
            self.assert_one_true(q, lambda a: self.tech(a)["levels"] > 0)
        for q in self.questions("tech_weight", 10):
            self.assertEqual(self.correct(q), str(self.source_tech(q)["weight"]))


if __name__ == "__main__":
    unittest.main()
