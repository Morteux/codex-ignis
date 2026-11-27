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
