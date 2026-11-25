"""DLC of every scripted trigger of common/scripted_triggers (T2527)."""
import unittest
from helpers import TempGame
from pdx.text import dlc
import extract_dlc


class ScriptedDlc(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with TempGame() as t:
            cls.game = t.game
            cls.mentions = t.game.dlc_trigger_mentions
            cls.triggers = t.game.dlc_triggers
            cls.ds = extract_dlc.extract(t.game)

    def test_triggers_found(self):
        self.assertEqual(set(self.mentions), {"has_test_dlc", "has_rocks", "has_any_test_dlc", "has_not_rocks", "loop_a", "loop_b"})
        self.assertNotIn("is_rocky_empire", self.mentions)

    def test_mentions(self):
        self.assertEqual(self.mentions["has_rocks"], [["Test DLC", False, False]])
        self.assertEqual(self.mentions["has_any_test_dlc"], [["Second Test DLC", False, True], ["Test DLC", False, True]])
        self.assertEqual(self.mentions["has_not_rocks"], [["Test DLC", True, False]])
        self.assertEqual(self.triggers["loop_b"], ["Test DLC"])

    def test_item_dlc(self):
        g = self.game
        self.assertEqual(dlc(g, "has_rocks = yes"), ["Test DLC"])
        self.assertEqual(dlc(g, "owner = { has_any_test_dlc = yes }"), ["Second Test DLC", "Test DLC"])
        self.assertEqual(dlc(g, "NOT = { has_rocks = yes }"), ["Test DLC"])
        self.assertEqual(dlc(g, "has_rocks = no"), ["Test DLC"])
        self.assertEqual(dlc(g, "is_rocky_empire = yes"), [])
        self.assertEqual(dlc(g, "has_unknown_dlc = yes"), ["has_unknown_dlc"])
        self.assertEqual(dlc(g, 'host_has_dlc = "Test DLC"\nhas_rocks = yes'), ["Test DLC"])

    def test_dlc_set(self):
        t = self.ds.extra["scripted_triggers"]
        self.assertEqual(t["has_not_rocks"], [{"dlc": "Test DLC", "negated": True, "alternative": False}])
        self.assertIn("common/scripted_triggers", self.ds.sources)


if __name__ == "__main__":
    unittest.main()
