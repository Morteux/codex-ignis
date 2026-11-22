"""Localised names of every set in every game language (T2520)."""
import json, os, unittest
from helpers import TempGame
import extract_jobs, extract_technologies
from pdx.output import run_sets


class LocalisedNames(unittest.TestCase):
    def test_every_language(self):
        with TempGame() as t:
            out = os.path.join(t.tmp, "out")
            run_sets(t.game, [extract_technologies.extract], out, log=None)
            run_sets(t.game, [extract_jobs.extract], out, log=None)  # a later run keeps the other sets
            files = sorted(os.listdir(os.path.join(out, "localisation")))
            self.assertEqual(files, ["english.json", "japanese.json", "spanish.json"])
            data = {}
            for f in files:
                with open(os.path.join(out, "localisation", f), encoding="utf-8") as fh:
                    data[f[:-5]] = json.load(fh)
        self.assertEqual(data["spanish"]["language"], "spanish")
        self.assertEqual(sorted(data["english"]["sets"]), ["jobs", "technologies"])
        self.assertEqual(data["spanish"]["sets"]["technologies"]["tech_test"], "Tecnología de prueba")
        self.assertEqual(data["japanese"]["sets"]["technologies"]["tech_test"], "テスト技術")
        self.assertIsNone(data["spanish"]["sets"]["technologies"]["tech_test_swap"])  # not translated in the fixture
        self.assertEqual(data["english"]["sets"]["technologies"]["tech_test_swap"], "Wild Test Technology")  # swaps too
        self.assertEqual(data["english"]["sets"]["jobs"]["test_swap"], "Wild Tester")


if __name__ == "__main__":
    unittest.main()
