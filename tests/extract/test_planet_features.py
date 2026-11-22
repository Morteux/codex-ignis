"""extract_planet_features.py on the fixture game folder (T2515)."""
import unittest
from helpers import TempGame, by_id
import extract_planet_features


class PlanetFeatures(unittest.TestCase):
    def test_sets(self):
        textures = ["gfx/interface/icons/planet_modifiers/pm_test_weather.dds", "gfx/interface/icons/deposits/d_test_icon.dds", "gfx/interface/icons/deposits/d_test_blocker.dds"]
        with TempGame(textures, ["planet_modifiers/Pm_x.png", "planetary_features/D_x.png"]) as t:
            pms, statics, deposits = extract_planet_features.extract(t.game)
        pm = by_id(pms)
        self.assertEqual(list(pm), ["pm_test_weather"])  # the null modifier is skipped
        weather = pm["pm_test_weather"]
        self.assertEqual((weather["name"], weather["desc"], weather["static_modifier"]), ("Test Weather", "Storms for testing.", "test_weather"))
        self.assertEqual(weather["modifier"], {"pop_happiness": -0.05, "planet_jobs_energy_produces_mult": 0.2})
        self.assertIn("pc_test", weather["spawn_chance"])
        self.assertEqual(weather["icon"]["asset"], "planet_modifiers/Pm_test_weather.png")
        self.assertEqual(by_id(statics)["test_weather"]["icon_frame"], 2)
        d = by_id(deposits)
        self.assertEqual((d["d_test_minerals"]["produces"], d["d_test_minerals"]["blocker"]), ({"minerals": 2}, False))
        self.assertEqual(d["d_test_minerals"]["icon"]["asset"], "planetary_features/D_test_icon.png")
        blocker = d["d_test_blocker"]
        self.assertTrue(blocker["blocker"])
        self.assertEqual((blocker["cost"], blocker["time"], blocker["name"]), ({"energy": 500}, 270, "£blocker£ Test Blocker"))
        self.assertEqual(blocker["can_be_cleared"], "always = yes")
        self.assertTrue(d["d_test_orbital"]["orbital"])


if __name__ == "__main__":
    unittest.main()
