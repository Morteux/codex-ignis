"""extract_districts.py on the fixture game folder (T2509)."""
import unittest
from helpers import TempGame, by_id
import extract_districts


class Districts(unittest.TestCase):
    def test_sets(self):
        textures = ["gfx/interface/icons/districts/district_test_icon.dds", "gfx/interface/icons/districts/district_specialization_icons/other_name.dds"]
        with TempGame(textures, ["districts_specialization/District_specialization_test.png"]) as t:
            districts, zones, slots = extract_districts.extract(t.game)
        d = by_id(districts)["district_test"]
        self.assertEqual((d["cost"], d["upkeep"], d["base_buildtime"]), ({"minerals": 300}, {"energy": 1}, 250))
        self.assertEqual(d["jobs"], {"test": 100})
        self.assertEqual(d["zone_slots"], ["slot_test"])
        self.assertEqual((d["min_for_deposits_on_planet"], d["max_for_deposits_on_planet"]), (4, 15))
        self.assertEqual(d["icon"]["asset"], "districs/district_test_icon.png")  # the existing (misspelt) folder
        z = by_id(zones)["zone_test"]
        self.assertEqual((z["zone_sets"], z["included_building_sets"], z["max_buildings"]), (["urban"], ["research"], 6))
        self.assertEqual(z["jobs_conditional"], [{"potential": "exists = owner", "jobs": {"test": 200}}])
        self.assertIn("tech_test", z["unlock"])
        # The icon file is named after the sprite, not the texture
        self.assertEqual(z["icon"]["asset"], "districts_specialization/District_specialization_test.png")
        s = by_id(slots)["slot_test"]
        self.assertEqual((s["start"], s["included_zone_sets"]), ("zone_test", ["urban"]))


if __name__ == "__main__":
    unittest.main()
