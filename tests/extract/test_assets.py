"""Full export of the game images (T2701-T2702): categories, names, frames, idempotent export, manifest."""
import json, os, shutil, tempfile, unittest
from PIL import Image
from helpers import FIXTURES
from pdx.game import GameFiles
from pdx.assets import classify, export, inventory, plan


class Classify(unittest.TestCase):
    def test_categories(self):
        self.assertEqual(classify("gfx/interface/icons/jobs/job_miner.dds"), ("jobs", "gfx/interface/icons/jobs", True))
        self.assertEqual(classify("gfx/interface/icons/districts/x.dds")[0], "districs")
        self.assertEqual(classify("gfx/interface/icons/districts/district_specialization_icons/x.dds")[0], "districts_specialization")
        self.assertEqual(classify("gfx/interface/icons/governments/civics/civic_x.dds")[0], "civics")
        self.assertEqual(classify("gfx/interface/icons/traits/leader_traits/x.dds")[0], "species_traits")
        self.assertEqual(classify("gfx/interface/icons/trade route icons/x.dds")[0], "trade_route_icons")
        self.assertEqual(classify("gfx/interface/icons/loose.dds")[0], "icons")
        self.assertEqual(classify("gfx/interface/buttons/b.dds"), ("interface", "gfx/interface", False))
        self.assertEqual(classify("gfx/event_pictures/evt.dds")[0], "event_pictures")
        self.assertEqual(classify("flags/human/flag_human_1.tga")[0], "flags")
        self.assertEqual(classify("gfx/portraits/city_sets/x.dds")[0], "portraits")
        self.assertEqual(classify("dlc/dlc014_utopia/thumbnail.png")[0], "dlc_thumbnails")

    def test_left_out(self):
        for path in ["gfx/models/ships/x_diffuse.dds", "gfx/models/portraits/human/x.dds", "gfx/map/x.dds",
                     "gfx/portraits/misc/colorcorrection_arid.dds", "gfx/fonts/x.dds", "sound/x.wav", "gfx/FX/x.dds"]:
            cat, reason, _ = classify(path)
            self.assertIsNone(cat, path)
            self.assertTrue(reason, path)


class Export(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.assets = os.path.join(self.tmp, "assets").replace("\\", "/")
        os.makedirs(os.path.join(self.assets, "jobs"))
        self.cache = os.path.join(self.tmp, "cache.json")
        self.game = GameFiles(FIXTURES)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def files(self, entries):
        return {e.texture: [o["file"] for o in e.outputs] for e in entries}

    def test_inventory(self):
        cats = inventory(self.game)["categories"]
        self.assertEqual(cats["samples"]["files"], 4)
        self.assertEqual(cats["samples"]["frames"], 6)  # the 3-frame strip gives 3 files
        self.assertEqual(cats["excluded: 3D model textures"]["files"], 1)

    def test_plan_names(self):
        files = self.files(plan(self.game))
        self.assertEqual(files["gfx/interface/icons/samples/sample_strip.dds"],
                         ["samples/sample_strip_1.png", "samples/sample_strip_2.png", "samples/sample_strip_3.png"])
        self.assertEqual(files["gfx/interface/icons/samples/Sample_Plain.tga"], ["samples/Sample_Plain.png"])  # no sprite: texture name
        self.assertEqual(files["gfx/interface/icons/samples/sub/sample_plain.dds"], ["samples/sub_sample_plain.png"])  # same name, flat folder
        self.assertEqual(files["gfx/event_pictures/sample/evt_sample.dds"], ["event_pictures/sample/evt_sample.png"])  # sprite key, sub-folder kept
        self.assertEqual(files["flags/sample/flag_sample.tga"], ["flags/sample/flag_sample.png"])
        self.assertEqual(files["dlc/dlc900_test/thumbnail.png"], ["dlc_thumbnails/dlc900_test.png"])
        self.assertNotIn("gfx/models/sample_diffuse.dds", files)
        entry = next(e for e in plan(self.game) if e.texture.endswith("sample_strip.dds"))
        self.assertEqual([(s.name, s.frame) for s in entry.sheet_sprites], [("GFX_sample_second", 1)])
        self.assertEqual(self.files(plan(self.game, only={"flags"})), {"flags/sample/flag_sample.tga": ["flags/sample/flag_sample.png"]})

    def test_export_idempotent(self):
        ex, entries, data = export(self.game, self.assets, cache_path=self.cache)
        self.assertEqual(len(ex.report["new"]), 8)  # 3 strip frames + 5 single images
        self.assertEqual(len(ex.report["failed"]), 1)  # broken.dds
        with Image.open(os.path.join(self.assets, "samples/sample_strip_2.png")) as im:
            self.assertEqual(im.size, (2, 2))
            self.assertEqual(im.convert("RGBA").getpixel((0, 0)), (0, 255, 0, 255))
        with open(os.path.join(self.assets, "manifest.json"), encoding="utf-8") as fh:
            manifest = json.load(fh)
        self.assertEqual(manifest["rulesetId"], self.game.ruleset_id)
        self.assertEqual(manifest["categories"]["samples"]["files"], 5)
        self.assertTrue(any("broken.dds" in w for w in manifest["warnings"]["samples"]))
        self.assertTrue(any("nope.dds" in w for w in manifest["warnings"]["sprites"]))
        stamp = os.path.getmtime(os.path.join(self.assets, "samples/sample_strip_1.png"))
        manifest_stamp = os.path.getmtime(os.path.join(self.assets, "manifest.json"))
        ex2, _, _ = export(self.game, self.assets, cache_path=self.cache)  # second run: nothing rewritten
        self.assertEqual(ex2.report["new"] + ex2.report["replaced"], [])
        self.assertEqual(len(ex2.report["unchanged"]), 8)
        self.assertEqual(os.path.getmtime(os.path.join(self.assets, "samples/sample_strip_1.png")), stamp)
        self.assertEqual(os.path.getmtime(os.path.join(self.assets, "manifest.json")), manifest_stamp)
        ex3, _, _ = export(self.game, self.assets, cache_path=os.path.join(self.tmp, "other.json"))  # no cache: pixels compared
        self.assertEqual(ex3.report["new"] + ex3.report["replaced"], [])

    def test_changed_file_and_only(self):
        export(self.game, self.assets, cache_path=self.cache)
        Image.new("RGBA", (4, 4), (0, 0, 0, 255)).save(os.path.join(self.assets, "flags/sample/flag_sample.png"))
        open(os.path.join(self.assets, "flags/sample/extra.png"), "wb").close()  # never deleted
        ex, _, data = export(self.game, self.assets, only={"flags"}, cache_path=os.path.join(self.tmp, "c2.json"))
        self.assertEqual(ex.report["replaced"], ["flags/sample/flag_sample.png"])
        self.assertTrue(os.path.isfile(os.path.join(self.assets, "flags/sample/extra.png")))
        self.assertIn("samples", data["categories"])  # kept from the previous manifest

    def test_legacy_folder_reuses_same_pixels(self):
        game_dir = os.path.join(self.tmp, "game")
        shutil.copytree(FIXTURES, game_dir)
        os.makedirs(os.path.join(game_dir, "gfx/interface/icons/jobs"))
        Image.new("RGBA", (3, 3), (1, 1, 1, 255)).save(os.path.join(game_dir, "gfx/interface/icons/jobs/job_x.dds"))
        Image.new("RGBA", (3, 3), (1, 1, 1, 255)).save(os.path.join(self.assets, "jobs/Old_name.png"))
        ex, entries, _ = export(GameFiles(game_dir), self.assets, only={"jobs"}, cache_path=self.cache)
        self.assertEqual(ex.report["reused"], ["jobs/Old_name.png"])
        self.assertEqual(self.files(entries), {"gfx/interface/icons/jobs/job_x.dds": ["jobs/Old_name.png"]})
        self.assertFalse(os.path.isfile(os.path.join(self.assets, "jobs/job_x.png")))


if __name__ == "__main__":
    unittest.main()
