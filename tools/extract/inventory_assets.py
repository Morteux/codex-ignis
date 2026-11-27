"""Inventory of the game's 2D images (T2701, GAME_FILES_EXTRACTOR.md §6e):

python tools/extract/inventory_assets.py [--game DIR] [--json FILE]

Walks every image file of the game folder (.dds, .tga, .png, .jpg, .bmp), sorts it into the export
categories of pdx.assets (or "excluded" with the reason) and prints, per category, the number of files,
their size on disk and how many textures a .gfx sprite names. --json also writes the full table.
"""
import argparse, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pdx.game import GameFiles, game_dir  # noqa: E402
from pdx.assets import inventory  # noqa: E402


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Inventory of the game's 2D images")
    p.add_argument("--game", help="game folder")
    p.add_argument("--json", help="write the inventory table to this file")
    args = p.parse_args()
    game = GameFiles(game_dir(args.game))
    inv = inventory(game)
    print(f"{'category':28} {'files':>7} {'MB':>9} {'sprites':>8} {'outputs':>8}")
    for name, row in sorted(inv["categories"].items(), key=lambda kv: (kv[0].startswith("excluded"), kv[0])):
        print(f"{name:28} {row['files']:>7} {row['bytes'] / 1e6:>9.1f} {row['with_sprite']:>8} {row['frames']:>8}")
    print(f"{'total':28} {inv['files']:>7} {inv['bytes'] / 1e6:>9.1f}")
    print(f"sprites in interface/*.gfx: {inv['sprites']} ({inv['sprites_missing_texture']} name a missing texture)")
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(inv, fh, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
