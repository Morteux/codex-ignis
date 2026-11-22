"""extract_authorities.py (T2512) and extract_ethics.py (T2513) on the fixture game folder."""
import unittest
from helpers import TempGame, by_id
import extract_authorities


class Authorities(unittest.TestCase):
    def test_fields(self):
        icons = "gfx/interface/icons/governments/authorities/"
        with TempGame([icons + "auth_test.dds", icons + "auth_test_cyber.dds"], ["authorities/Auth_test.png"]) as t:
            ds = extract_authorities.extract(t.game)
        a = by_id(ds)["auth_test"]
        self.assertEqual((a["name"], a["election_type"], a["election_term_years"], a["has_heir"]), ("Test Authority", "democratic", 10, False))
        self.assertEqual(a["country_modifier"], {"country_unity_produces_mult": 0.05})
        self.assertEqual(a["icon"]["asset"], "authorities/Auth_test.png")
        s = a["swaps"][0]
        self.assertEqual((s["id"], s["name"], s["desc"]), ("auth_test_cyber", "Test Cyber Authority", "Augmented test authority."))
        self.assertEqual((s["modifier"], s["inherit_effects"], s["dlc"]), ({"pop_cyborg_happiness": 0.15}, False, ["Second Test DLC"]))
        self.assertEqual(s["icon"]["asset"], "authorities/Auth_test_cyber.png")


if __name__ == "__main__":
    unittest.main()
