"""extract_all.py: every extractor on the fixture game folder, --only and the manifest (T2521)."""
import importlib, json, os, unittest
from helpers import TempGame
import extract_all
from pdx.output import run_sets, write_manifest


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


if __name__ == "__main__":
    unittest.main()
