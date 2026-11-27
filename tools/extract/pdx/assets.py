"""Full export of the game's 2D images to StellarisAssets (GAME_FILES_EXTRACTOR.md §6e, tasks T2701-T2704).

Every image file of the game folder is sorted into an export category (a folder of StellarisAssets) or
left out with a reason. Categories, in the order they are tried (the longest matching game folder wins):

- the folders of `gfx/interface/icons/` each go to their own StellarisAssets folder, flat (one file per
  texture, named after its sprite), reusing the folders StellarisAssets already had (`buildings/`, `jobs/`,
  `districs/`, `civics/`...) and adding one per new type (`species_traits/`, `achievements/`...);
- the other `gfx/interface/` folders go to `interface/<folder>/`, the event pictures to `event_pictures/`,
  the loading screens to `loading_screens/`, the flags to `flags/`, the 2D portrait backgrounds of
  `gfx/portraits/` to `portraits/`, the key icons to `key_icons/`, the DLC thumbnails to `dlc_thumbnails/`
  and the wallpapers to `wallpapers/`, keeping the game's sub-folders.
"""
import os

IMAGE_EXTS = (".dds", ".tga", ".png", ".bmp", ".jpg", ".jpeg")
ICONS = "gfx/interface/icons/"

# Game folder (relative to gfx/interface/icons/) → StellarisAssets folder, for the icon folders whose
# StellarisAssets folder has another name (the ones the earlier exports and data sets already use).
ICON_FOLDERS = {
    "districts": "districs",  # sic, the existing folder
    "districts/district_specialization_icons": "districts_specialization",
    "governments/civics": "civics",
    "governments/authorities": "authorities",
    "origins": "origin_icons",
    "deposits": "planetary_features",
    "planet_backgrounds": "planets",
    "diplomatic_stance": "diplomatic_stances",
    "traits": "species_traits",
    "ship_parts": "ship_components",
}

# Other included game folders: (game folder, category = StellarisAssets folder, flat).
OTHER_FOLDERS = [
    ("gfx/interface", "interface", False),
    ("gfx/event_pictures", "event_pictures", False),
    ("gfx/loadingscreens", "loading_screens", False),
    ("flags", "flags", False),
    ("gfx/portraits", "portraits", False),
    ("gfx/keyicons", "key_icons", False),
    ("wallpaper", "wallpapers", False),
]

# Left out (game folder → reason). Anything not included nor listed here is "other".
EXCLUDED = [
    ("gfx/models/portraits", "species portrait layers (deferred: GitHub Pages size budget, T2705)"),
    ("gfx/models", "3D model textures"),
    ("gfx/map", "3D galaxy map textures"),
    ("gfx/particles", "3D particle textures"),
    ("gfx/fx", "shader textures"),
    ("gfx/worldgfx", "3D world textures"),
    ("gfx/lights", "3D lighting textures"),
    ("gfx/portraits/misc", "colour correction tables of the portrait backgrounds"),
    ("gfx/fonts", "font bitmaps"),
    ("gfx/cursors", "mouse cursors"),
    ("gfx/arrows", "galaxy map arrows (3D textures)"),
    ("pdx_launcher", "launcher, not the game"),
    ("pdx_online_assets", "launcher, not the game"),
    ("previewer_assets", "development tool"),
    ("tweakergui_assets", "development tool"),
    ("assets", "launcher, not the game"),
    ("ebook", "not part of the game"),
    ("soundtrack", "not part of the game"),
]


def _norm(path):
    return str(path).replace("\\", "/").strip().lower()


def _under(rel, folder):
    return rel == folder or rel.startswith(folder + "/")


def classify(rel):
    """(category, base, flat) of a game file (path relative to the game folder), or (None, reason, None).

    `base` is the game folder whose sub-folders are kept below the category folder (flat categories
    keep none)."""
    low = _norm(rel)
    if not low.endswith(IMAGE_EXTS):
        return None, "not an image", None
    parts = low.split("/")
    if len(parts) == 3 and parts[0] == "dlc" and parts[2] == "thumbnail.png":
        return "dlc_thumbnails", "dlc", True
    for folder, reason in EXCLUDED:
        if _under(low, folder):
            return None, reason, None
    if low.startswith(ICONS):
        sub = low[len(ICONS):]
        best = max((k for k in ICON_FOLDERS if _under(sub, k)), key=len, default=None)
        if best:
            return ICON_FOLDERS[best], ICONS + best, True
        if "/" not in sub:
            return "icons", ICONS.rstrip("/"), True
        top = sub.split("/")[0]
        return top.replace(" ", "_"), ICONS + top, True
    for folder, category, flat in OTHER_FOLDERS:
        if _under(low, folder):
            return category, folder, flat
    return None, "other (not a game interface image)", None


def image_files(game):
    """Every image file of the game folder (relative paths with the real case), sorted."""
    out = []
    for d, dirs, names in os.walk(game.root):
        dirs[:] = [x for x in dirs if not x.startswith(".")]
        for n in names:
            if n.lower().endswith(IMAGE_EXTS):
                out.append(game.rel(os.path.join(d, n)))
    return sorted(out, key=str.lower)


def sprites_by_texture(game):
    """Normalised texture path → the sprites that use it (sprite sheet frames included), sorted by name."""
    out = {}
    for s in game.sprites.by_name.values():
        if s.texture:
            out.setdefault(_norm(s.texture), []).append(s)
    for v in out.values():
        v.sort(key=lambda s: s.name.lower())
    return out


def inventory(game):
    """Files, bytes and files named by a sprite, per category (excluded ones as `excluded: <reason>`)."""
    by_tex = sprites_by_texture(game)
    cats, total, total_bytes = {}, 0, 0
    for rel in image_files(game):
        cat, base, _ = classify(rel)
        key = cat if cat else f"excluded: {base}"
        size = os.path.getsize(game.path(rel))
        row = cats.setdefault(key, {"files": 0, "bytes": 0, "with_sprite": 0, "frames": 0, "source": base if cat else None})
        row["files"] += 1
        row["bytes"] += size
        sprites = by_tex.get(_norm(rel), [])
        if sprites:
            row["with_sprite"] += 1
            row["frames"] += max(s.frames for s in sprites)
        else:
            row["frames"] += 1
        total += 1
        total_bytes += size
    missing = sum(1 for t in by_tex if not game.sprites.texture_path(t))
    return {"rulesetId": game.ruleset_id, "files": total, "bytes": total_bytes, "sprites": len(game.sprites.by_name),
            "sprites_missing_texture": missing, "categories": cats}


# -- export (T2702) ---------------------------------------------------------------------------------

# Folders StellarisAssets had before the full export (written by the data sets or by hand): an image
# already there under another name but with the same pixels is reused instead of written twice.
LEGACY_FOLDERS = {
    "authorities", "buildings", "civics", "designations", "diplomatic_stances", "districs", "districts_specialization",
    "dlc", "edicts", "ethics", "jobs", "modifiers", "origin_icons", "origins", "planet_modifiers", "planetary_features",
    "planets", "pop_categories", "resources", "technologies", "text_icons",
}
GENERATOR = "tools/extract/export_assets.py"


def safe_name(name):
    return "".join(c if c.isalnum() or c in "_-." else "_" for c in str(name)).strip("._") or "image"


def strip_gfx(key):
    return key[4:] if key.lower().startswith("gfx_") else key


def data_set_assets(data_dir):
    """Normalised texture → StellarisAssets path a generated data set already gives it (whole textures only)."""
    import json
    out = {}
    if not data_dir or not os.path.isdir(data_dir):
        return out
    for n in sorted(os.listdir(data_dir)):
        if not n.endswith(".json") or n == "manifest.json":
            continue
        try:
            with open(os.path.join(data_dir, n), encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, ValueError):
            continue
        for item in data.get("items", []) if isinstance(data, dict) else []:
            icon = item.get("icon") if isinstance(item, dict) else None
            if isinstance(icon, dict) and icon.get("texture") and icon.get("asset") and not icon.get("_frames"):
                out.setdefault(_norm(icon["texture"]), icon["asset"])
    return out


class Entry:
    """One game texture and the StellarisAssets files it gives (one per frame)."""

    def __init__(self, texture, category, folder, frames, sprites, sheet_sprites):
        self.texture, self.category, self.folder, self.frames = texture, category, folder, frames
        self.sprites = sprites              # [Sprite] naming this texture (sprite sheet frames excluded)
        self.sheet_sprites = sheet_sprites  # [Sprite] of sprite sheets using it; sprite.frame is 0-based
        self.outputs = []                   # [{"frame": 0-based or None, "file": path in StellarisAssets, "size": [w, h]}]

    def __repr__(self):
        return f"Entry({self.texture!r} → {[o['file'] for o in self.outputs]})"


def plan(game, only=None, data_dir=None, assets_dir=None):
    """Entries of every included texture (of the `only` categories), with their output file names."""
    from .icons import AssetFolder
    assets_dir = (assets_dir or "").replace("\\", "/").rstrip("/")
    by_tex = sprites_by_texture(game)
    forced = data_set_assets(data_dir)
    folders, used, entries = {}, set(), []

    def folder_of(name):
        if name not in folders:
            folders[name] = AssetFolder(os.path.join(assets_dir, name) if assets_dir else "")
        return folders[name]

    for rel in image_files(game):
        cat, base, flat = classify(rel)
        if not cat:
            continue
        sprites = by_tex.get(_norm(rel), [])
        own = [s for s in sprites if not s.sheet]
        frames = max([s.frames for s in own] or [1])
        stem = os.path.splitext(os.path.basename(rel))[0]
        primary = next((s for s in own if strip_gfx(s.name).lower() == stem.lower()), own[0] if own else None)
        sub = os.path.dirname(rel)[len(base):].strip("/") if len(os.path.dirname(rel)) > len(base) else ""
        folder = cat if flat or not sub else cat + "/" + sub
        forced_asset = forced.get(_norm(rel)) if frames == 1 else None
        if forced_asset and forced_asset.rsplit("/", 1)[0] == folder:
            name = os.path.splitext(forced_asset.rsplit("/", 1)[1])[0]
        elif cat == "dlc_thumbnails":
            name = rel.split("/")[1]
        else:
            name = strip_gfx(primary.name) if primary else stem
        name = safe_name(name)
        parent = safe_name(os.path.basename(os.path.dirname(rel)))
        for candidate in [name, parent + "_" + name] + [f"{name}__{n}" for n in range(2, 1000)]:
            if frames == 1:
                files = [folder + "/" + (folder_of(folder).file_name(candidate) if flat else candidate + ".png")]
            else:
                files = [f"{folder}/{candidate}_{i + 1}.png" for i in range(frames)]
            if not any(f.lower() in used for f in files):
                break
        used.update(f.lower() for f in files)  # every category takes part, so names never depend on --only
        if only and cat not in only:
            continue
        entry = Entry(rel, cat, folder, frames, own, [s for s in sprites if s.sheet])
        entry.outputs = [{"frame": None if frames == 1 else i, "file": f} for i, f in enumerate(files)]
        entries.append(entry)
    return entries


def _pixels_key(img):
    import hashlib
    return hashlib.sha1(f"{img.width}x{img.height}".encode() + img.tobytes()).hexdigest()


class AssetExport:
    """Writes the planned PNG files into StellarisAssets, rewriting only what changed; never deletes.

    `cache_path` (a JSON file kept out of both repositories) remembers, for every texture frame, the size
    and date of the game file and the file written for it, so an unchanged texture is not decoded again."""

    def __init__(self, game, assets_dir, cache_path=None, replace_smaller=False):
        import json
        self.game, self.dir = game, assets_dir.replace("\\", "/").rstrip("/")
        self.cache_path, self.replace_smaller = cache_path, replace_smaller
        self.cache = {"entries": {}, "hashes": {}}
        if cache_path and os.path.isfile(cache_path):
            try:
                with open(cache_path, encoding="utf-8") as fh:
                    self.cache = json.load(fh)
            except (OSError, ValueError):
                pass
        self.report = {k: [] for k in ("new", "replaced", "unchanged", "reused", "kept_larger", "failed")}
        self.warnings = {}
        self._legacy = {}

    def warn(self, category, text):
        self.warnings.setdefault(category, []).append(text)

    def path(self, asset):
        return os.path.join(self.dir, asset).replace("\\", "/")

    def legacy_index(self, folder):
        """Pixel hash → file of the images of a folder StellarisAssets already had."""
        if folder not in self._legacy:
            from PIL import Image
            index, d = {}, self.path(folder)
            for n in sorted(os.listdir(d)) if os.path.isdir(d) else []:
                p = os.path.join(d, n)
                if not n.lower().endswith(".png") or not os.path.isfile(p):
                    continue
                st, rel = os.stat(p), folder + "/" + n
                known = self.cache["hashes"].get(rel)
                if known and known[:2] == [st.st_size, int(st.st_mtime)]:
                    h = known[2]
                else:
                    try:
                        with Image.open(p) as im:
                            h = _pixels_key(im.convert("RGBA"))
                    except OSError:
                        continue
                    self.cache["hashes"][rel] = [st.st_size, int(st.st_mtime), h]
                index.setdefault(h, rel)
            self._legacy[folder] = index
        return self._legacy[folder]

    def export_entry(self, entry):
        st = os.stat(self.game.path(entry.texture))
        stamp, todo = [st.st_size, int(st.st_mtime)], []
        for out in entry.outputs:
            key = f"{entry.texture}|{out['frame']}"
            known = self.cache["entries"].get(key)
            if known and known["src"] == stamp and os.path.isfile(self.path(known["file"])) and (
                    known["file"] == out["file"] or not os.path.isfile(self.path(out["file"]))):
                out["file"], out["size"] = known["file"], known["size"]
                self.report["unchanged"].append(out["file"])
            else:
                todo.append((key, out))
        if not todo:  # unchanged texture: its warnings come from the cache, so a re-run keeps them
            for text in self.cache.get("warnings", {}).get(entry.texture, []):
                self.warn(entry.category, text)
            return
        from PIL import Image
        try:
            with Image.open(self.game.path(entry.texture)) as im:
                im.load()
                img = im.convert("RGBA")
        except Exception as e:  # noqa: BLE001 (any decoder error of Pillow)
            self.warn(entry.category, f"{entry.texture}: cannot be read ({e})")
            self.report["failed"] += [out["file"] for _, out in todo]
            for _, out in todo:
                out["file"] = None
            return
        cached = self.cache.setdefault("warnings", {})
        cached.pop(entry.texture, None)
        if entry.frames > 1 and img.width % entry.frames:
            text = f"{entry.texture}: width {img.width} is not a multiple of its {entry.frames} frames"
            self.warn(entry.category, text)
            cached[entry.texture] = [text]
        w = img.width // entry.frames
        for key, out in todo:
            part = img if out["frame"] is None else img.crop((w * out["frame"], 0, w * (out["frame"] + 1), img.height))
            out["file"] = self.write(entry, out["file"], part)
            out["size"] = [part.width, part.height]
            self.cache["entries"][key] = {"src": stamp, "file": out["file"], "size": out["size"]}

    def write(self, entry, asset, img):
        """Write one PNG; returns the StellarisAssets file that holds the image."""
        from PIL import Image
        dest = self.path(asset)
        if os.path.isfile(dest):
            with Image.open(dest) as old:
                old = old.convert("RGBA")
            if old.size == img.size and old.tobytes() == img.tobytes():
                self.report["unchanged"].append(asset)
                return asset
            if not self.replace_smaller and old.width * old.height > img.width * img.height:
                self.report["kept_larger"].append(asset)
                return asset
            status = "replaced"
        else:
            folder = asset.rsplit("/", 1)[0]
            if folder in LEGACY_FOLDERS and entry.frames == 1:
                same = self.legacy_index(folder).get(_pixels_key(img))
                if same:
                    self.report["reused"].append(same)
                    return same
            status = "new"
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        img.save(dest, optimize=True)
        self.report[status].append(asset)
        return asset

    def save_cache(self):
        if self.cache_path:
            import json
            os.makedirs(os.path.dirname(self.cache_path) or ".", exist_ok=True)
            with open(self.cache_path, "w", encoding="utf-8") as fh:
                json.dump(self.cache, fh, ensure_ascii=False)


def write_json_if_changed(path, data):
    """Write a JSON file only when its text changes. Returns True when written."""
    import json
    text = json.dumps(data, indent=1, ensure_ascii=False) + "\n"
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as fh:
            if fh.read() == text:
                return False
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    return True


def read_json(path):
    import json
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def manifest(game, export, entries, only=None, previous=None):
    """StellarisAssets manifest: game version, files, textures and bytes per category, warnings.

    With `only`, the other categories are kept from the previous manifest."""
    keep = lambda part: {k: v for k, v in ((previous or {}).get(part) or {}).items() if only and k not in only}  # noqa: E731
    cats, warnings, seen = keep("categories"), keep("warnings"), set()
    for e in entries:
        row = cats.setdefault(e.category, {"textures": 0, "files": 0, "bytes": 0})
        row["textures"] += 1
        for out in e.outputs:
            if out.get("file") and out["file"] not in seen and os.path.isfile(export.path(out["file"])):
                seen.add(out["file"])
                row["files"] += 1
                row["bytes"] += os.path.getsize(export.path(out["file"]))
    for cat, items in export.warnings.items():
        warnings[cat] = sorted(set(items))
    missing = sorted({s.texture for s in game.sprites.by_name.values()
                      if s.texture and not s.sheet and not game.sprites.texture_path(s.texture)})
    warnings["sprites"] = [f"texture of a sprite not in the game files: {t}" for t in missing]
    if not warnings["sprites"]:
        del warnings["sprites"]
    return {"generator": GENERATOR, "rulesetId": game.ruleset_id, "gameVersion": game.version,
            "categories": dict(sorted(cats.items())), "warnings": dict(sorted(warnings.items()))}


# -- index (T2704) ----------------------------------------------------------------------------------

def data_set_names(data_dir):
    """(texture → English name, sprite → English name) of the icons of the generated data sets."""
    import json
    by_tex, by_sprite = {}, {}
    if not data_dir or not os.path.isdir(data_dir):
        return by_tex, by_sprite
    for n in sorted(os.listdir(data_dir)):
        if not n.endswith(".json") or n == "manifest.json":
            continue
        try:
            with open(os.path.join(data_dir, n), encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, ValueError):
            continue
        for item in data.get("items", []) if isinstance(data, dict) else []:
            icon = item.get("icon") if isinstance(item, dict) else None
            if not isinstance(icon, dict) or not isinstance(item.get("name"), str):
                continue
            if icon.get("sprite"):
                by_sprite.setdefault(icon["sprite"].lower(), item["name"])
            if icon.get("texture") and not icon.get("_frames"):
                by_tex.setdefault(_norm(icon["texture"]), item["name"])
    return by_tex, by_sprite


def english_name(game, keys, cache={}):  # noqa: B006 (per-process cache of the English table)
    """English text (colours and icons removed) of the first localisation key that exists, or None."""
    from .localisation import plain
    table = game.localisation.language("english")
    lower = cache.get(id(table))
    if lower is None:
        lower = cache[id(table)] = {k.lower(): k for k in table}
    for k in keys:
        real = k if k in table else lower.get(k.lower())
        if real:
            text = plain(game.localisation.get(real))
            if text and "$" not in text:
                return text
    return None


def index_items(game, entries, data_dir=None):
    """One index row per exported file: file, category, size, source texture, frame, sprites, .gfx files, name."""
    tex_names, sprite_names = data_set_names(data_dir)
    rows = {}
    for e in entries:
        for out in e.outputs:
            if not out.get("file"):
                continue
            if out["frame"] is None:
                sprites = e.sprites
            else:
                sprites = [s for s in e.sheet_sprites if s.frame == out["frame"]] + (e.sprites if out["frame"] == 0 else [])
            keys = [s.name for s in sprites]
            stem = os.path.splitext(os.path.basename(e.texture))[0]
            name = next((sprite_names[k.lower()] for k in keys if k.lower() in sprite_names), None)
            if name is None and out["frame"] is None:
                name = tex_names.get(_norm(e.texture))
            if name is None:
                name = english_name(game, [strip_gfx(k) for k in keys] + keys + ([stem] if out["frame"] is None else []))
            row = rows.get(out["file"])
            if row:  # an older file holding the same pixels as another texture
                row["sprites"] = sorted(set(row["sprites"]) | set(keys), key=str.lower)
                continue
            row = {"file": out["file"], "category": e.category, "w": out["size"][0], "h": out["size"][1],
                   "source": e.texture}
            if out["frame"] is not None:
                row["frame"], row["frames"] = out["frame"] + 1, e.frames
            row["sprites"] = keys
            gfx = sorted({s.source for s in sprites if s.source})
            if gfx:
                row["gfx"] = gfx
            if name:
                row["name"] = name
            rows[out["file"]] = row
    return rows


def other_files(assets_dir, known):
    """Index rows of the images of StellarisAssets no game texture gives (older exports, hand-made files)."""
    from PIL import Image
    rows = {}
    for d, dirs, names in os.walk(assets_dir):
        dirs[:] = [x for x in dirs if not x.startswith(".")]
        for n in names:
            if not n.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
                continue
            rel = os.path.relpath(os.path.join(d, n), assets_dir).replace("\\", "/")
            if rel in known:
                continue
            try:
                with Image.open(os.path.join(d, n)) as im:
                    w, h = im.size
            except OSError:
                continue
            rows[rel] = {"file": rel, "category": rel.split("/")[0] if "/" in rel else "", "w": w, "h": h,
                         "source": None, "sprites": []}
    return rows


def write_index(path, game, items):
    """index.json: header, then one item per line (readable diffs), sorted by file."""
    import json
    head = {"generator": GENERATOR, "rulesetId": game.ruleset_id, "gameVersion": game.version, "count": len(items)}
    lines = [json.dumps(items[k], ensure_ascii=False, separators=(",", ":")) for k in sorted(items, key=str.lower)]
    text = json.dumps(head, ensure_ascii=False)[:-1] + ',"items":[\n' + ",\n".join(lines) + "\n]}\n"
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as fh:
            if fh.read() == text:
                return False
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    return True


def build_index(game, export, entries, data_dir=None, only=None):
    """Rows of every image of StellarisAssets: the exported ones (with --only, the other categories come
    from the previous index.json) and the other files already there."""
    previous = read_json(export.path("index.json")) or {}
    items = {}
    if only:
        items = {r["file"]: r for r in previous.get("items", []) if r.get("source") and r.get("category") not in only}
    items.update(index_items(game, entries, data_dir))
    items = {k: v for k, v in items.items() if os.path.isfile(export.path(k))}
    items.update(other_files(export.dir, items))
    return items


def export(game, assets_dir, only=None, data_dir=None, cache_path=None, progress=None):
    """Export the planned textures and write `manifest.json` and `index.json` in StellarisAssets.
    Returns (export, entries, manifest)."""
    entries = plan(game, only, data_dir, assets_dir)
    ex = AssetExport(game, assets_dir, cache_path)
    for i, e in enumerate(entries):
        ex.export_entry(e)
        if progress and i % 500 == 0:
            progress(i, len(entries))
            ex.save_cache()
    ex.save_cache()
    path = ex.path("manifest.json")
    data = manifest(game, ex, entries, only, read_json(path))
    write_json_if_changed(path, data)
    write_index(ex.path("index.json"), game, build_index(game, ex, entries, data_dir, only))
    return ex, entries, data
