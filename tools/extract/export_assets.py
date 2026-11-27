"""Full export of the game's 2D images to StellarisAssets (T2702, GAME_FILES_EXTRACTOR.md §6e):

python tools/extract/export_assets.py [--game DIR] [--assets DIR] [--only CAT,CAT] [--list] [--report FILE]

Converts every included game image (DDS / TGA / PNG / BMP) to PNG in its StellarisAssets folder,
splits sprite strips into one file per frame (`<name>_<frame>.png`, 1-based) and writes
`manifest.json` there (game version, files and bytes per category, warnings). Idempotent: a file is
only rewritten when its image changed, and nothing is ever deleted. `--only` exports some categories
(the others stay as the manifest had them); `--list` prints the categories and their sizes in the game
files without writing anything.
"""
import argparse, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from pdx.game import GameFiles, game_dir  # noqa: E402
from pdx.icons import DEFAULT_ASSETS_DIR  # noqa: E402
from pdx.assets import export, inventory  # noqa: E402


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Export every 2D image of the game to StellarisAssets")
    p.add_argument("--game", help="game folder")
    p.add_argument("--assets", default=DEFAULT_ASSETS_DIR, help=f"StellarisAssets folder (default: {DEFAULT_ASSETS_DIR})")
    p.add_argument("--only", help="comma-separated categories (StellarisAssets folders: buildings,flags,interface...)")
    p.add_argument("--data", help="generated data folder whose icon names are kept (default: data/generated/<rulesetId>)")
    p.add_argument("--cache", help="cache file (default: .cache/asset_export_<rulesetId>.json in this project)")
    p.add_argument("--list", action="store_true", help="only list the categories")
    p.add_argument("--report", help="write the export report (new / replaced / unchanged / reused / kept_larger / failed) to this file")
    args = p.parse_args()
    game = GameFiles(game_dir(args.game))
    if args.list:
        for name, row in sorted(inventory(game)["categories"].items()):
            if not name.startswith("excluded"):
                print(f"{name:28} {row['files']:>6} textures {row['frames']:>6} files {row['bytes'] / 1e6:>8.1f} MB in the game")
        return
    only = {c.strip() for c in args.only.split(",") if c.strip()} if args.only else None
    data_dir = args.data or os.path.join(ROOT, "data", "generated", game.ruleset_id)
    cache = args.cache or os.path.join(ROOT, ".cache", f"asset_export_{game.ruleset_id}.json")
    start = time.time()
    ex, entries, data = export(game, args.assets, only, data_dir, cache,
                               progress=lambda i, n: print(f"  {i}/{n} textures ({time.time() - start:.0f} s)", flush=True))
    for status, files in ex.report.items():
        print(f"{status}: {len(files)}")
    for cat in sorted(only or data["categories"]):
        row = data["categories"].get(cat)
        if row:
            print(f"{cat}: {row['textures']} textures, {row['files']} files, {row['bytes'] / 1e6:.1f} MB")
    for cat, items in ex.warnings.items():
        print(f"warnings {cat}: {len(items)} (in manifest.json)")
    if args.report:
        with open(args.report, "w", encoding="utf-8") as fh:
            json.dump(ex.report, fh, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
