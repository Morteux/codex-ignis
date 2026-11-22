"""extract_designations.py on the fixture game folder (T2510)."""
import unittest
from helpers import TempGame, by_id
import extract_designations


class Designations(unittest.TestCase):
    def test_fields(self):
        with TempGame(["gfx/interface/icons/test/Strip.dds"]) as t:
            ds = extract_designations.extract(t.game)
        c = by_id(ds)["col_test"]
        self.assertEqual(c["planet_modifier"], {"miner_jobs_bonus_workforce_mult": 0.15})
        self.assertEqual(c["triggered_planet_modifier"], [{"potential": "owner = {\n\thas_tradition = tr_test\n}", "modifier": {"miner_jobs_bonus_workforce_mult": 0.05}}])
        self.assertEqual(c["potential"], "exists = owner")
        # Frame 2 of the sheet, file named after the sprite
        self.assertEqual((c["icon"]["asset"], c["icon"]["_frame"]), ("designations/strip_second.png", 1))


if __name__ == "__main__":
    unittest.main()
