"""extract_dlc.py on the fixture game folder (T2519)."""
import unittest
from helpers import TempGame, by_id
import extract_dlc


class Dlc(unittest.TestCase):
    def test_list(self):
        with TempGame(["gfx/interface/icons/test/Strip.dds"]) as t:
            ds = extract_dlc.extract(t.game)
        d = by_id(ds)
        self.assertEqual(list(d), ["dlc900", "dlc901"])
        first = d["dlc900"]
        self.assertEqual((first["name"], first["localised_name"], first["category"], first["installed"]), ("Test DLC", "Test DLC (localised)", "expansion", True))
        self.assertEqual((first["steam_id"], first["recommendations"], first["affects_gameplay"]), ("900", ["dlc901"], True))
        self.assertEqual(first["icon"]["asset"], "dlc/Strip.png")
        second = d["dlc901"]
        self.assertEqual((second["installed"], second["affects_gameplay"], second["icon"]), (False, False, None))


if __name__ == "__main__":
    unittest.main()
