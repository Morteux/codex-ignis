"""Icon exporter: sprites of interface/*.gfx, DDS → PNG and StellarisAssets file names (T2504)."""
import os, shutil, tempfile, unittest
from PIL import Image
from helpers import FIXTURES
from pdx.game import GameFiles
from pdx.icons import AssetFolder, IconExporter, dds_to_image, read_sprites


def solid(size, colour):
    return Image.new("RGBA", size, colour)


class IconExport(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.game_dir = os.path.join(self.tmp, "game")
        shutil.copytree(FIXTURES, self.game_dir)
        icons = os.path.join(self.game_dir, "gfx", "interface", "icons")
        os.makedirs(os.path.join(icons, "jobs"))
        os.makedirs(os.path.join(icons, "test"))
        solid((6, 6), (255, 0, 0, 255)).save(os.path.join(icons, "jobs", "job_test.dds"))  # DDS written by Pillow
        strip = Image.new("RGBA", (8, 4), (0, 0, 255, 255))
        strip.paste(solid((4, 4), (0, 255, 0, 128)), (0, 0))
        strip.save(os.path.join(icons, "test", "Strip.dds"))
        self.assets = os.path.join(self.tmp, "assets")
        os.makedirs(os.path.join(self.assets, "jobs"))
        os.makedirs(os.path.join(self.assets, "civics"))
        solid((6, 6), (255, 0, 0, 255)).save(os.path.join(self.assets, "jobs", "Job_test.png"))
        solid((2, 2), (0, 0, 0, 255)).save(os.path.join(self.assets, "civics", "Civic_a.png"))
        self.game = GameFiles(self.game_dir)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_sprites_from_gfx(self):
        sprites = self.game.sprites
        self.assertEqual(sprites.get("gfx_job_test").texture, "gfx/interface/icons/jobs/job_test.dds")
        self.assertEqual(sprites.get("GFX_test_strip").frames, 2)
        self.assertEqual(sprites.get("GFX_animated").frames, 4)
        self.assertEqual(sprites.find("GFX_test_strip")[1:], ("gfx/interface/icons/test/Strip.dds", 2))
        self.assertIsNone(sprites.find("GFX_missing_texture"))
        self.assertEqual(sprites.find(None, ["gfx/interface/icons/jobs/nope.dds", "gfx/interface/icons/JOBS/JOB_TEST.dds"])[0], "GFX_job_test")

    def test_read_sprites_nested(self):
        s = read_sprites('spriteTypes = { spriteTypes = { spriteType = { name = "GFX_x" texturefile = "a.dds" } } }')
        self.assertEqual([(x.name, x.texture, x.frames) for x in s], [("GFX_x", "a.dds", 1)])

    def test_dds_to_png_first_frame(self):
        img = dds_to_image(self.game.path("gfx/interface/icons/test/Strip.dds"), frames=2)
        self.assertEqual(img.size, (4, 4))
        self.assertEqual(img.getpixel((1, 1)), (0, 255, 0, 128))

    def test_asset_file_names(self):
        self.assertEqual(AssetFolder(os.path.join(self.assets, "jobs")).file_name("job_test"), "Job_test.png")
        civics = AssetFolder(os.path.join(self.assets, "civics"))
        self.assertEqual(civics.file_name("civic_b"), "Civic_b.png")  # new file in the folder's style
        self.assertEqual(civics.file_name("other", aliases=["civic_a"]), "Civic_a.png")
        self.assertEqual(AssetFolder(os.path.join(self.assets, "technologies")).file_name("tech_x"), "tech_x.png")

    def test_export(self):
        ex = IconExporter(self.game, self.assets)
        self.assertEqual(ex.export("gfx/interface/icons/jobs/job_test.dds", ex.target("jobs", "job_test")), "unchanged")
        strip_target = ex.target("technologies", "strip")
        self.assertEqual(strip_target, "technologies/strip.png")
        self.assertEqual(ex.export("gfx/interface/icons/test/Strip.dds", strip_target, frames=2), "new")
        self.assertEqual(Image.open(os.path.join(self.assets, strip_target)).size, (4, 4))
        self.assertEqual(ex.export("gfx/interface/icons/test/missing.dds", "jobs/missing.png"), "missing")
        solid((10, 10), (1, 2, 3, 255)).save(os.path.join(self.assets, "jobs", "Job_big.png"))
        self.assertEqual(ex.export("gfx/interface/icons/jobs/job_test.dds", ex.target("jobs", "job_big")), "kept_larger")
        solid((6, 6), (1, 2, 3, 255)).save(os.path.join(self.assets, "jobs", "Job_other.png"))
        self.assertEqual(ex.export("gfx/interface/icons/jobs/job_test.dds", ex.target("jobs", "job_other")), "replaced")
        self.assertEqual(ex.report["replaced"], ["jobs/Job_other.png"])
        self.assertEqual(ex.report["new"], ["technologies/strip.png"])


if __name__ == "__main__":
    unittest.main()
