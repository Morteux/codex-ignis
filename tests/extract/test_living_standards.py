"""extract_living_standards.py (T2001) on the fixture game folder."""
import unittest
from helpers import TempGame, by_id
import extract_living_standards


class LivingStandards(unittest.TestCase):
    def test_fields_and_summaries(self):
        with TempGame() as t:
            ds = extract_living_standards.extract(t.game)
        s = by_id(ds)["living_standard_test"]
        self.assertEqual((s["name"], s["desc"]), ("Test Standard", "Pops of this species live a test life."))
        self.assertEqual(s["pop_upkeep"], {"workers": {"consumer_goods": 0.5}, "rulers": {"consumer_goods": 1}})  # @half resolved
        self.assertEqual(s["political_power"], {"worker": 2})
        self.assertEqual(s["pop_group_modifier"]["pop_bonus_workforce_mult"], -0.5)
        self.assertEqual(s["trade"], {"worker": 0.25})  # from the pop category's produces block
        trig = s["triggered_pop_group_modifier"][0]
        self.assertEqual((trig["potential"], trig["modifier"]), ("is_pop_category = civilian", {"pop_category_civilians_unity_produces_add": 0.5}))
        self.assertIn("is_gestalt = no", s["potential"])
        self.assertIn("ethic_test", s["allow"])
        self.assertIn("resolution_test", s["in_breach_of"])

    def test_empty_standard_and_species_upkeep(self):
        with TempGame() as t:
            ds = extract_living_standards.extract(t.game)
        e = by_id(ds)["living_standard_test_empty"]
        self.assertEqual((e["pop_upkeep"], e["trade"], e["dlc"]), ({}, {}, ["Test DLC"]))
        self.assertIn("living_standard_test_empty: no English name", ds.warnings)
        species = {s["id"]: s for s in ds.extra["species_upkeep"]}
        self.assertEqual(list(species), ["trait_organic"])  # only the species type traits
        self.assertEqual(species["trait_organic"]["resources"]["upkeep"][0]["food"], 1)
        self.assertEqual(species["trait_organic"]["allowed_archetypes"], ["BIOLOGICAL"])
        self.assertIn("species trait trait_lithoid not found", ds.warnings)


if __name__ == "__main__":
    unittest.main()
