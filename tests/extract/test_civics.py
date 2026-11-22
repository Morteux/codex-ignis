"""extract_civics.py on the fixture game folder (T2511)."""
import unittest
from helpers import TempGame, by_id
import extract_civics


class Civics(unittest.TestCase):
    def test_civics_and_origins(self):
        textures = ["gfx/interface/icons/governments/civics/civic_test.dds", "gfx/interface/icons/origins/origins_second.dds", "gfx/interface/icons/test/Strip.dds"]
        with TempGame(textures, ["civics/Civic_test.png", "origins/GFX_other.png"]) as t:
            civics, origins = extract_civics.extract(t.game)
        c = by_id(civics)["civic_test"]
        self.assertEqual((c["name"], c["effects"]), ("Test Civic", "+10% £unity£ Unity"))
        self.assertFalse(c["is_origin"])
        self.assertEqual(c["modifier"], {"country_unity_produces_mult": 0.1})
        self.assertEqual(c["swaps"][0]["modifier"], {"country_unity_produces_mult": 0.15})
        self.assertIn("ethic_materialist", c["possible"])
        self.assertEqual(c["dlc"], ["Test DLC"])
        self.assertEqual(c["icon"]["asset"], "civics/Civic_test.png")
        self.assertEqual([o["id"] for o in origins.items], ["origin_second", "origin_first"])
        o = by_id(origins)
        self.assertEqual((o["origin_second"]["game_order"], o["origin_first"]["game_order"]), (0, 1))  # definition order
        self.assertEqual(o["origin_second"]["icon"]["asset"], "origin_icons/origins_second.png")
        self.assertEqual(o["origin_second"]["picture"]["asset"], "origins/GFX_test_strip.png")  # named after the sprite
        self.assertIsNone(o["origin_first"]["icon"])
        self.assertIn("origin_first: icon not found", civics.warnings)


if __name__ == "__main__":
    unittest.main()
