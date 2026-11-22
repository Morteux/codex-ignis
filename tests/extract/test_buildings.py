"""extract_buildings.py on the fixture game folder (T2508)."""
import unittest
from helpers import TempGame, by_id
import extract_buildings


class Buildings(unittest.TestCase):
    def test_fields(self):
        with TempGame(["gfx/interface/icons/buildings/building_test.dds"]) as t:
            ds = extract_buildings.extract(t.game)
        b = by_id(ds)
        first = b["building_test"]
        self.assertEqual(first["name"], "Test Building (later file)")
        self.assertEqual(first["cost"], {"minerals": 400})  # regular case of the nomadic cost switch
        self.assertEqual(first["resources"]["cost"][1], {"trigger": "from? = {\n\tis_nomadic = yes\n}", "exotic_gases": 400, "mult": 0.5})
        self.assertEqual(first["upkeep"], {"energy": 2})
        self.assertEqual(first["base_buildtime"], 360)
        self.assertEqual(first["jobs"], {"test": 200})
        self.assertEqual(first["jobs_conditional"], [{"potential": "owner = {\n\tis_gestalt = yes\n}", "jobs": {"test_swap": 100}}])
        self.assertEqual(first["planet_modifier"]["planet_stability_add"], 2)
        self.assertEqual((first["prerequisites"], first["upgrades"]), (["tech_test"], ["building_test_2"]))
        self.assertIn("is_wilderness_empire = no", first["potential"])
        self.assertEqual(first["dlc"], ["Second Test DLC"])
        self.assertTrue(first["can_build"])
        second = b["building_test_2"]
        self.assertFalse(second["can_build"])
        self.assertEqual(second["icon"]["asset"], "buildings/building_test.png")  # icon = building_test
        self.assertIn("building_test_2: unknown building building_missing", ds.warnings)
        self.assertIn("building_test_2: no English name", ds.warnings)


if __name__ == "__main__":
    unittest.main()
