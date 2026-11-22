"""extract_jobs.py on the fixture game folder (T2507)."""
import unittest
from helpers import TempGame, by_id
import extract_jobs

ICONS = "gfx/interface/icons/jobs/"


class Jobs(unittest.TestCase):
    def test_fields(self):
        with TempGame([ICONS + "job_test.dds", ICONS + "job_test_swap.dds"], ["jobs/Job_test.png"]) as t:
            ds = extract_jobs.extract(t.game)
        job = by_id(ds)["test"]
        self.assertEqual((job["name"], job["category"], job["tags"]), ("Tester", "worker", ["minerals"]))
        self.assertEqual(job["desc"], 'A "quoted" word inside the text.')
        self.assertEqual(job["produces"], {"minerals": 4})  # conditional outputs are not summed
        self.assertEqual(job["upkeep"], {"consumer_goods": 1})
        self.assertEqual(job["resources"]["category"], "planet_miners")
        self.assertEqual(job["resources"]["produces"][1], {"trigger": "is_wilderness_empire = yes", "minerals": -2, "food": 2})
        self.assertEqual(job["triggered_planet_modifier"], [{"potential": "has_flag = test", "modifier": {"planet_stability_add": 5}}])
        self.assertEqual(job["dlc"], ["Test DLC"])
        self.assertEqual(job["icon"]["asset"], "jobs/Job_test.png")  # existing StellarisAssets name reused
        swap = job["swaps"][0]
        self.assertEqual((swap["id"], swap["name"], swap["weight"], swap["trigger"]), ("test_swap", "Wild Tester", 20, "is_wilderness_empire = yes"))
        self.assertEqual(swap["icon"]["asset"], "jobs/Job_test_swap.png")  # new file in the folder's style
        self.assertEqual(ds.extra["categories"][0]["name"], "Worker")


if __name__ == "__main__":
    unittest.main()
