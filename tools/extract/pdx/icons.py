"""Icon exporter (GAME_FILES_EXTRACTOR.md §6): sprites of interface/*.gfx and DDS → PNG.

Sprites: every spriteType of interface/**/*.gfx gives name → texture file (+ number of frames).
Export: the texture is converted with Pillow (first frame of a multi-frame strip) into a folder
of the StellarisAssets repository, reusing the file name that folder already has for it.
"""
import os
from .parser import Block, ParseError, parse

DEFAULT_ASSETS_DIR = "C:/Users/ignis/OneDrive/Documentos/StellarisAssets"
SPRITE_KINDS = ("spriteType", "frameAnimatedSpriteType", "corneredTileSpriteType", "progressbartype", "maskedShieldType")


class Sprite:
    def __init__(self, name, texture, frames=1, source=None):
        self.name, self.texture, self.frames, self.source = name, texture, frames, source

    def __repr__(self):
        return f"Sprite({self.name!r}, {self.texture!r}, frames={self.frames})"


def norm(path):
    return str(path).replace("\\", "/").strip().lower()


def read_sprites(text, source="<gfx>", warnings=None):
    """Sprites of one .gfx file (any nesting of spriteTypes blocks)."""
    try:
        block = parse(text, source=source, warnings=warnings)
    except ParseError as e:
        if warnings is not None:
            warnings.append(str(e))
        return []
    out = []

    def walk(b):
        for k, _, v in b:
            if not isinstance(v, Block):
                continue
            if k in SPRITE_KINDS and v.get("name") is not None:
                tex = v.get("texturefile") or v.get("textureFile") or v.get("texturefile1")
                if tex:
                    frames = v.get("noOfFrames") or v.get("noOfframes") or 1
                    out.append(Sprite(str(v.get("name")), str(tex).replace("\\", "/"), int(frames) if isinstance(frames, (int, float)) else 1, source))
            else:
                walk(v)
    walk(block)
    return out


class Sprites:
    """Every sprite of the game's interface/**/*.gfx (name lookup is case-insensitive)."""

    def __init__(self, game):
        self.game = game
        self.by_name = {}
        self.by_texture = {}
        for f in game.files("interface", ".gfx", recursive=True):
            with open(f, encoding="utf-8-sig", errors="replace") as fh:
                for s in read_sprites(fh.read(), game.rel(f), game.warnings):
                    self.by_name.setdefault(s.name.lower(), s)
                    self.by_texture.setdefault(norm(s.texture), s)

    def get(self, name):
        return self.by_name.get(str(name).lower()) if name else None

    def texture_path(self, texture):
        """Absolute path of a texture (case-insensitive on the file name), or None."""
        p = self.game.path(texture)
        if os.path.isfile(p):
            return p
        d, base = os.path.split(p)
        if os.path.isdir(d):
            for n in os.listdir(d):
                if n.lower() == base.lower():
                    return os.path.join(d, n).replace("\\", "/")
        return None

    def find(self, sprite=None, textures=()):
        """(sprite name or None, texture relative path) of the first sprite / texture that exists."""
        s = self.get(sprite)
        if s and self.texture_path(s.texture):
            return s.name, s.texture, s.frames
        for t in textures:
            if self.texture_path(t):
                known = self.by_texture.get(norm(t))
                return (known.name if known else None), t, (known.frames if known else 1)
        return None


def dds_to_image(path, frames=1, frame=0):
    """RGBA Pillow image of one frame of a DDS (frames side by side)."""
    from PIL import Image
    with Image.open(path) as im:
        im.load()
        img = im.convert("RGBA")
    if frames and frames > 1:
        w = img.width // frames
        img = img.crop((w * frame, 0, w * (frame + 1), img.height))
    return img


class AssetFolder:
    """A folder of StellarisAssets and the file names it already uses."""

    def __init__(self, path):
        self.path = path
        self.files = {}
        if os.path.isdir(path):
            for n in os.listdir(path):
                if n.lower().endswith(".png"):
                    self.files[n[:-4].lower()] = n

    def capitalised(self):
        names = list(self.files.values())
        return bool(names) and all(n[:1].isupper() for n in names)

    def file_name(self, stem, aliases=()):
        """Existing file for this icon (case-insensitive, or one of its aliases), else a new name in the folder's style."""
        for s in (stem, *aliases):
            if s.lower() in self.files:
                return self.files[s.lower()]
        new = aliases[0] if aliases else stem
        if self.capitalised():
            new = new[:1].upper() + new[1:]
        return new + ".png"


class IconExporter:
    """Writes PNG icons into StellarisAssets and records what it did (for the commit message)."""

    def __init__(self, game, assets_dir=None, replace_smaller=False):
        self.game = game
        self.dir = (assets_dir or DEFAULT_ASSETS_DIR).replace("\\", "/").rstrip("/")
        self.replace_smaller = replace_smaller
        self.folders = {}
        self.report = {"new": [], "replaced": [], "unchanged": [], "kept_larger": [], "missing": []}

    def folder(self, name):
        if name not in self.folders:
            self.folders[name] = AssetFolder(os.path.join(self.dir, name))
        return self.folders[name]

    def target(self, folder, stem, aliases=()):
        """Path inside StellarisAssets (`folder/File.png`) the icon goes to."""
        return folder + "/" + self.folder(folder).file_name(stem, aliases)

    def export(self, texture, asset, frames=1):
        """Convert a game texture to StellarisAssets/<asset>. Returns the status."""
        from PIL import ImageChops
        src = self.game.sprites.texture_path(texture) if texture else None
        if not src:
            self.report["missing"].append(asset)
            return "missing"
        img = dds_to_image(src, frames)
        dest = os.path.join(self.dir, asset)
        status = "new"
        if os.path.isfile(dest):
            from PIL import Image
            with Image.open(dest) as old:
                old = old.convert("RGBA")
            if old.size == img.size and ImageChops.difference(old, img).getbbox(alpha_only=False) is None:
                self.report["unchanged"].append(asset)
                return "unchanged"
            if not self.replace_smaller and old.width * old.height > img.width * img.height:
                self.report["kept_larger"].append(asset)
                return "kept_larger"
            status = "replaced"
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        img.save(dest)
        folder, name = asset.rsplit("/", 1)
        self.folder(folder).files[name[:-4].lower()] = name
        self.report[status].append(asset)
        return status
