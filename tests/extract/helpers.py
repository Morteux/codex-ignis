"""Shared paths of the extractor tests: run with `python -m unittest discover -s tests/extract`."""
import os, shutil, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace("\\", "/")
FIXTURES = ROOT + "/tests/fixtures/game-files"
sys.path.insert(0, ROOT + "/tools/extract")


class TempGame:
    """A copy of the fixture game folder with small DDS textures generated for the given paths,
    and an empty StellarisAssets folder: `with TempGame([...]) as t: t.game, t.assets`."""

    def __init__(self, textures=(), asset_files=()):
        self.textures, self.asset_files = textures, asset_files

    def __enter__(self):
        from PIL import Image
        from pdx.game import GameFiles
        self.tmp = tempfile.mkdtemp()
        root = os.path.join(self.tmp, "game")
        shutil.copytree(FIXTURES, root)
        for i, t in enumerate(self.textures):
            p = os.path.join(root, t)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            Image.new("RGBA", (4, 4), (i * 20 % 256, 100, 200, 255)).save(p)
        self.assets = os.path.join(self.tmp, "assets").replace("\\", "/")
        os.makedirs(self.assets)
        for a in self.asset_files:
            p = os.path.join(self.assets, a)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            Image.new("RGBA", (4, 4), (0, 0, 0, 255)).save(p)
        self.game = GameFiles(root)
        self.game.assets_dir = self.assets
        return self

    def __exit__(self, *exc):
        shutil.rmtree(self.tmp, ignore_errors=True)


def by_id(dataset):
    return {i["id"]: i for i in dataset.items}
