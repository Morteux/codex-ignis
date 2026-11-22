"""extract_technologies.py on the fixture game folder (T2506)."""
import json, os, unittest
from helpers import TempGame, by_id
import extract_technologies
from pdx.output import run_sets

ICONS = "gfx/interface/icons/technologies/"


class Technologies(unittest.TestCase):
    def test_fields(self):
        with TempGame([ICONS + "tech_test_icon.dds", ICONS + "tech_test_swap.dds", ICONS + "tech_start.dds"]) as t:
            ds = extract_technologies.extract(t.game)
        techs = by_id(ds)
        self.assertEqual(sorted(techs), ["tech_event", "tech_repeatable_test", "tech_start", "tech_test"])
        tech = techs["tech_test"]
        self.assertEqual((tech["area"], tech["category"], tech["tier"]), ("physics", ["computing"], 1))
        self.assertEqual((tech["cost"], tech["weight"]), (1000, 100))  # @tier1cost1, @tier1weight1
        self.assertEqual(tech["prerequisites"], ["tech_start"])
        self.assertEqual(tech["name"], "Test Technology")
        self.assertIn("Test Building", tech["desc"])
        self.assertEqual(tech["dlc"], ["Test DLC", "Second Test DLC"])
        self.assertIn("host_has_dlc", tech["potential"])
        self.assertIn("factor = 2", tech["weight_modifier"])
        self.assertEqual(tech["modifier"], {"planet_jobs_produces_mult": 0.05})
        self.assertTrue(tech["flags"]["rare"])
        self.assertEqual(tech["icon"]["asset"], "technologies/tech_test_icon.png")
        swap = tech["swaps"][0]
        self.assertEqual((swap["id"], swap["name"], swap["trigger"]), ("tech_test_swap", "Wild Test Technology", "is_wilderness_empire = yes"))
        self.assertEqual(swap["icon"]["asset"], "technologies/tech_test_swap.png")
        self.assertTrue(techs["tech_start"]["flags"]["start"])
        event = techs["tech_event"]
        self.assertTrue(event["flags"]["event"] and event["flags"]["dangerous"])
        self.assertEqual(event["cost"], 2500)
        self.assertIn("is_ai = yes", event["cost_modifiers"])
        rep = techs["tech_repeatable_test"]
        self.assertTrue(rep["flags"]["repeatable"])
        self.assertEqual((rep["cost_per_level"], rep["levels"]), (5000, -1))
        self.assertIn("tech_repeatable_test: unknown prerequisite tech_missing", ds.warnings)
        self.assertEqual(ds.extra["tiers"], [{"tier": 0, "previously_unlocked": None}, {"tier": 1, "previously_unlocked": 0}])

    def test_written_json_and_icons(self):
        with TempGame([ICONS + "tech_test_icon.dds", ICONS + "tech_test_swap.dds"]) as t:
            out = os.path.join(t.tmp, "out")
            entries, exporter = run_sets(t.game, [extract_technologies.extract], out, t.assets, log=None)
            with open(os.path.join(out, "technologies.json"), encoding="utf-8") as f:
                data = json.load(f)
            self.assertEqual((data["set"], data["rulesetId"], data["count"]), ("technologies", "stellaris-pc-9.8.7", 4))
            self.assertNotIn("_loc", data["items"][0])
            self.assertEqual(entries["technologies"]["icons"], {"new": 2})
            self.assertEqual(sorted(exporter.report["new"]), ["technologies/tech_test_icon.png", "technologies/tech_test_swap.png"])
            self.assertTrue(os.path.isfile(os.path.join(t.assets, "technologies", "tech_test_icon.png")))


if __name__ == "__main__":
    unittest.main()
