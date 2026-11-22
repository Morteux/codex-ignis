"""report_differences.py: matching simulator items to game items and listing the differences (T2522)."""
import json, os, shutil, tempfile, unittest
from helpers import ROOT
import report_differences as rd


def data(set_name, items):
    return {"set": set_name, "rulesetId": "stellaris-pc-9.8.7", "count": len(items), "items": items}


class ReportDifferences(unittest.TestCase):
    def test_helpers(self):
        self.assertEqual(rd.snake("capacitySubsidies"), "capacity_subsidies")
        self.assertEqual(rd.snake("quarry_depot"), "quarry_depot")
        self.assertEqual(rd.norm_name("£blocker£ §YLethal Ecosphere§!"), "lethalecosphere")
        cond = rd.conditional_values({"cost": [{"trigger": "is_nomadic = yes", "volatile_motes": 400, "mult": 0.1}, {"minerals": 400}]}, "cost")
        self.assertEqual(cond, {"volatile_motes": [40]})
        # a simulator value equal to a conditional game value is not a difference
        self.assertEqual(rd.dict_diff("cost", {"minerals": 400, "volatile_motes": 40}, {"minerals": 400}, cond), [])
        self.assertEqual(rd.dict_diff("cost", {"minerals": 500}, {"minerals": 400}), [("cost.minerals", 500, 400)])

    def test_match_by_id_name_and_icon(self):
        sims = [rd.SimItem("researchLab", "x", "Research Labs", "buildings/a.png"),
                rd.SimItem("quarry", "x", "Surface Quarry Depot", None),
                rd.SimItem("noName", "x", None, "buildings/c.png"),
                rd.SimItem("gone", "x", "Gone", None)]
        games = [{"id": "building_research_lab", "name": "Research Labs"},
                 {"id": "building_mine_generic", "name": "Surface Quarry Depot"},
                 {"id": "building_c", "name": "C", "icon": {"asset": "buildings/C.png"}},
                 {"id": "building_new", "name": "New"}]
        pairs, game_only = rd.match("buildings", sims, games)
        self.assertEqual([(s.id, g and g["id"], how) for s, g, how in pairs],
                         [("researchLab", "building_research_lab", "id"), ("quarry", "building_mine_generic", "name"),
                          ("noName", "building_c", "icon"), ("gone", None, None)])
        self.assertEqual([g["id"] for g in game_only], ["building_new"])

    def test_report_files(self):
        sim = {"modules": {}, "policyGroups": [], "en": {"jobMiner": "Miner", "edictX": "Research Subsidies"}}
        tmp = tempfile.mkdtemp()
        try:
            sim_items = {s: [] for s in rd.PREFIXES}
            sim_items["jobs"] = [rd.SimItem("miner", "planet-data.js JOBS", "Miner", "jobs/job_miner.png", {"outputs": {"minerals": 4, "physics": 1}})]
            sim_items["edicts"] = [rd.SimItem("researchSubsidies", "edict-data.js EDICTS", "Research Subsidies", None, {"upkeep": {"unity": 20}})]
            original = rd.sim_items
            rd.sim_items = lambda _sim: sim_items
            data_dir, out = os.path.join(tmp, "data"), os.path.join(tmp, "out")
            os.makedirs(data_dir)
            sets = {"jobs": data("jobs", [{"id": "miner", "name": "Miner", "produces": {"minerals": 4, "physics_research": 1}, "upkeep": {}, "icon": {"asset": "jobs/job_miner.png"}}]),
                    "edicts": data("edicts", [{"id": "research_subsidies", "name": "Research Subsidies", "cost": {}, "upkeep": {"unity": 30}}]),
                    "zone_slots": data("zone_slots", [{"id": "slot_a"}])}
            for name, d in sets.items():
                with open(os.path.join(data_dir, name + ".json"), "w", encoding="utf-8") as f:
                    json.dump(d, f)
            summaries = rd.report(data_dir, out, sim)
            rd.sim_items = original
            self.assertEqual(summaries["jobs"]["differing"], 0)  # physics_research is the simulator's physics
            self.assertEqual(summaries["edicts"]["differing"], 1)
            self.assertIn("note", summaries["zone_slots"])
            with open(os.path.join(out, "edicts.md"), encoding="utf-8") as f:
                self.assertIn("| `researchSubsidies` | `research_subsidies` (id) | upkeep.unity | 20 | 30 |", f.read())
            self.assertTrue(os.path.isfile(os.path.join(out, "README.md")))
            self.assertTrue(os.path.isfile(os.path.join(out, "summary.json")))
        finally:
            shutil.rmtree(tmp)

    def test_simulator_dump(self):
        """The dump of the real simulator data has every module the report reads."""
        sim = rd.load_simulator()
        for module in ("planet-data.js", "empire-data.js", "job-swap-data.js", "bingo-items.js", "edict-data.js"):
            self.assertIn(module, sim["modules"])
        self.assertEqual(len(sim["policyGroups"]), 4)
        self.assertEqual(sim["en"]["jobTechnician"], "Technician")
        items = rd.sim_items(sim)
        self.assertTrue(all(items[s] for s in ("jobs", "buildings", "civics", "edicts", "policies")))


if __name__ == "__main__":
    unittest.main()
