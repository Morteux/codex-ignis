"""Ship sizes and their section costs on the fixture game folder (T2533)."""
import unittest
from helpers import TempGame, by_id
import extract_ship_sizes


class ShipSizes(unittest.TestCase):
    def test_bio_ship_growth_and_section_cost(self):
        with TempGame() as t:
            items = by_id(extract_ship_sizes.extract(t.game))
        b = items["test_bio_stage_1"]
        self.assertEqual((b["name"], b["is_bio_ship"], b["growth_required"], b["upgrades_to"]), ("Juvenile Tester", True, 60, "test_bio_stage_2"))
        self.assertEqual((b["ship_category"], b["growth_stage_descriptor"], b["base_buildtime"]), ("bio_ship", "ship_growth_stage_1", 75))
        self.assertEqual((b["cost"], b["upkeep"], b["min_upgrade_cost"]), ({}, {"alloys": 0.25, "food": 1.0}, {"alloys": 1}))
        self.assertEqual([s["cost"] for s in b["sections"]], [{"food": 140}, {"food": 210}])  # food × mult
        self.assertEqual(b["section_cost"], {"food": 140})  # the cheapest section

    def test_regular_hull(self):
        with TempGame() as t:
            h = by_id(extract_ship_sizes.extract(t.game))["test_hull"]
        self.assertEqual((h["cost"], h["upkeep"], h["prerequisites"]), ({"alloys": 100}, {"energy": 2, "alloys": 1}, ["tech_test"]))
        self.assertEqual((h["is_bio_ship"], h["growth_required"], h["sections"], h["section_cost"]), (False, None, [], {}))


if __name__ == "__main__":
    unittest.main()
