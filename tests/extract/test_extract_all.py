"""extract_all.py: every extractor on the fixture game folder, --only and the manifest (T2521)."""
import importlib, json, os, unittest
from helpers import TempGame
import extract_all
from pdx.output import run_sets, write_icon_report, write_manifest


class ExtractAll(unittest.TestCase):
    def test_only(self):
        self.assertEqual(extract_all.selected(None), list(extract_all.EXTRACTORS))
        self.assertEqual(extract_all.selected("zones, technologies"), ["technologies", "districts"])  # set name → extractor, game order
        with self.assertRaises(SystemExit):
            extract_all.selected("nope")

    def test_every_extractor_and_manifest(self):
        with TempGame() as t:
            out = os.path.join(t.tmp, "out")
            fns = [importlib.import_module("extract_" + n).extract for n in extract_all.selected(None)]
            entries, _ = run_sets(t.game, fns, out, log=None)
            path = write_manifest(t.game, out, entries)
            with open(path, encoding="utf-8") as f:
                manifest = json.load(f)
            every_set = sorted(s for sets in extract_all.EXTRACTORS.values() for s in sets)
            self.assertEqual(sorted(manifest["sets"]), every_set)
            self.assertEqual(manifest["rulesetId"], "stellaris-pc-9.8.7")
            self.assertEqual(manifest["sets"]["technologies"], {"file": "technologies.json", "count": 4, "warnings": manifest["sets"]["technologies"]["warnings"]})
            self.assertTrue(all(os.path.isfile(os.path.join(out, s + ".json")) for s in every_set))

    def test_icon_report(self):
        """The icon export report lists every icon by status, for the StellarisAssets commit (T2524)."""
        with TempGame(["gfx/interface/icons/jobs/job_test.dds", "gfx/interface/icons/jobs/job_test_swap.dds"], ["jobs/Job_test.png"]) as t:
            out = os.path.join(t.tmp, "out")
            _, exporter = run_sets(t.game, [importlib.import_module("extract_jobs").extract], out, t.assets, log=None)
            path = write_icon_report(t.game, exporter, os.path.join(t.tmp, "icon_export.json"))
            with open(path, encoding="utf-8") as f:
                report = json.load(f)
            self.assertEqual(report["rulesetId"], "stellaris-pc-9.8.7")
            self.assertEqual(report["replaced"], ["jobs/Job_test.png"])  # the existing file name is kept
            self.assertEqual(report["new"], ["jobs/Job_test_swap.png"])  # the folder's capitalised style
            self.assertEqual(report["counts"]["replaced"], len(report["replaced"]))
            self.assertEqual(sorted(report["counts"]), ["kept_larger", "missing", "new", "replaced", "unchanged"])


if __name__ == "__main__":
    unittest.main()
