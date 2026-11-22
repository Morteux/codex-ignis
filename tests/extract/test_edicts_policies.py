"""extract_edicts.py (T2516) and extract_policies.py (T2517) on the fixture game folder."""
import unittest
from helpers import TempGame, by_id
import extract_edicts


class Edicts(unittest.TestCase):
    def test_fields(self):
        with TempGame(["gfx/interface/icons/test/Strip.dds"]) as t:
            ds = extract_edicts.extract(t.game)
        e = by_id(ds)["test_subsidies"]
        self.assertEqual((e["name"], e["group"], e["length"]), ("Test Subsidies", "edicts", -1))
        self.assertEqual((e["cost"], e["upkeep"]), ({"unity": 30}, {"unity": 30}))
        self.assertEqual(e["resources"]["cost"][0]["multiplier"], "value:edict_size_effect")
        self.assertEqual(e["modifier"], {"researcher_jobs_bonus_workforce_mult": 0.1})
        self.assertEqual((e["prerequisites"], e["dlc"]), (["tech_test"], ["Test DLC"]))
        self.assertEqual(e["icon"]["asset"], "edicts/test_strip.png")  # named after the sprite


if __name__ == "__main__":
    unittest.main()
