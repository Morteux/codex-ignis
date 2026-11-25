"""refresh_dlc.py: recomputing `dlc` of generated data from the stored conditions (T2527)."""
import importlib, json, os, unittest
from helpers import TempGame
import extract_all, refresh_dlc
from pdx.output import run_sets


class RefreshDlc(unittest.TestCase):
    def test_same_as_the_extractors(self):
        with TempGame() as t:
            out = os.path.join(t.tmp, "out")
            fns = [importlib.import_module("extract_" + n).extract for n in extract_all.selected(None)]
            run_sets(t.game, fns, out, log=None)
            sets = {}
            for f in os.listdir(out):
                if f.endswith(".json"):
                    with open(os.path.join(out, f), encoding="utf-8") as fh:
                        sets[f[:-5]] = json.load(fh)
            # every set whose items (or swaps / options) carry `dlc` is covered by FIELDS
            with_dlc = {n for n, d in sets.items() if n != "dlc" and "dlc" in json.dumps(d.get("items"))}
            self.assertEqual(with_dlc - set(refresh_dlc.FIELDS), set())
            # the stored fields give back exactly the extractors' lists, also once they are wiped
            for name in refresh_dlc.FIELDS:
                if name not in sets:
                    continue
                items = sets[name]["items"]
                expected = json.dumps(items)
                for path, _ in refresh_dlc.FIELDS[name]:
                    for x in refresh_dlc._items(items, path):
                        x["dlc"] = ["wiped"]
                refresh_dlc.refresh_items(t.game, name, items)
                self.assertEqual(json.dumps(items), expected, name)
            self.assertIn("Test DLC", json.dumps(sets["origins"]["items"]))
            refresh_dlc.refresh_folder(t.game, out, log=lambda *_: None)
            with open(os.path.join(out, "dlc.json"), encoding="utf-8") as fh:
                d = json.load(fh)
            self.assertEqual(d["scripted_triggers"]["has_rocks"], [{"dlc": "Test DLC", "negated": False, "alternative": False}])
            self.assertEqual(list(d).index("scripted_triggers") + 1, list(d).index("items"))


if __name__ == "__main__":
    unittest.main()
