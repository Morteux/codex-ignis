"""extract_economic_categories.py on the fixture game folder (T2518)."""
import unittest
from helpers import TempGame, by_id
import extract_economic_categories


class EconomicCategories(unittest.TestCase):
    def test_tree_and_users(self):
        with TempGame() as t:
            ds = extract_economic_categories.extract(t.game)
        c = by_id(ds)
        miners, jobs = c["planet_miners"], c["planet_jobs"]
        self.assertEqual((miners["parent"], miners["ancestors"], jobs["children"]), ("planet_jobs", ["planet_jobs"], ["planet_miners"]))
        self.assertEqual(miners["modifiers"], ["planet_miners_produces_mult", "planet_miners_<resource>_produces_mult",
                                               "planet_miners_<resource>_produces_add", "planet_miners_<resource>_upkeep_add"])
        self.assertIn("is_robotic = no", miners["triggered_modifiers"]["triggered_produces_modifier"])
        self.assertEqual(miners["used_by"], {"jobs": ["test"]})  # the fixture job `test` uses planet_miners
        self.assertEqual(jobs["used_by_descendants"], {"jobs": ["test"]})  # _mult modifiers reach the children
        self.assertIn("planet_buildings: unknown parent planet_structures", ds.warnings)
        self.assertEqual(c["planet_buildings"]["used_by"], {"buildings": ["building_test"]})


if __name__ == "__main__":
    unittest.main()
