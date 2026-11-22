"""extract_planets.py on the fixture game folder (T2514)."""
import unittest
from helpers import TempGame, by_id
import extract_planets


class Planets(unittest.TestCase):
    def test_classes_and_bodies(self):
        with TempGame(["gfx/interface/icons/test/Strip.dds"], ["planets/Planet_test.png"]) as t:
            ds = extract_planets.extract(t.game)
        p = by_id(ds)
        self.assertEqual(sorted(p), ["pc_test", "pc_test_star"])
        self.assertEqual((p["pc_test"]["kind"], p["pc_test"]["climate"], p["pc_test"]["planet_size"]), ("planet", "wet", 16))
        self.assertTrue(p["pc_test"]["initial"])
        self.assertEqual(p["pc_test_star"]["kind"], "star")
        self.assertEqual(p["pc_test"]["icon"]["asset"], "planets/Planet_test.png")  # existing name by class
        self.assertEqual(p["pc_test_star"]["icon"]["asset"], "planets/Planet_test_star.png")
        self.assertEqual([r["name"] for r in ds.extra["random_lists"]], ["rl_test", "rl_second"])  # repeated key kept
        self.assertEqual(ds.extra["random_lists"][1]["planets"], ["pc_test", "pc_test_star"])


if __name__ == "__main__":
    unittest.main()
