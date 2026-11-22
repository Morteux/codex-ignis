"""Writing of the data sets, the icon export and the common command line of every extractor."""
import argparse, datetime, json, os, sys
from .game import GameFiles
from .icons import DEFAULT_ASSETS_DIR, IconExporter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))).replace("\\", "/")


def default_out(game):
    return f"{ROOT}/data/generated/{game.ruleset_id}"


class DataSet:
    """One output file: data/generated/<rulesetId>/<name>.json."""

    def __init__(self, name, sources, items=None, warnings=None, extra=None):
        self.name, self.sources = name, sources
        self.items = items if items is not None else []
        self.warnings = warnings if warnings is not None else []
        self.extra = extra or {}

    def icons(self):
        """(texture, asset, frames) of every icon of the items (also the icons of swaps and options)."""
        def walk(value):
            if isinstance(value, dict):
                if value.get("texture") and value.get("asset"):
                    yield value["texture"], value["asset"], value.get("_frames", 1)
                for v in value.values():
                    yield from walk(v)
            elif isinstance(value, list):
                for v in value:
                    yield from walk(v)
        yield from walk(self.items)
        yield from walk(self.extra)


def public(value):
    """Drop the internal `_keys` (localisation keys, frames) from the JSON."""
    if isinstance(value, dict):
        return {k: public(v) for k, v in value.items() if not (k.startswith("_") and k != "_text" and k != "_values")}
    if isinstance(value, list):
        return [public(v) for v in value]
    return value


def write_set(game, out_dir, ds):
    os.makedirs(out_dir, exist_ok=True)
    data = {
        "set": ds.name,
        "rulesetId": game.ruleset_id,
        "gameVersion": game.version,
        "sources": ds.sources,
        "count": len(ds.items),
        **public(ds.extra),
        "items": public(ds.items),
        "warnings": ds.warnings,
    }
    path = os.path.join(out_dir, ds.name + ".json").replace("\\", "/")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    return path


def export_icons(exporter, ds):
    statuses = {}
    seen = set()
    for texture, asset, frames in ds.icons():
        if asset in seen:
            continue
        seen.add(asset)
        s = exporter.export(texture, asset, frames)
        statuses[s] = statuses.get(s, 0) + 1
    return statuses


def run_sets(game, extract_fns, out_dir=None, icons_dir=None, log=print):
    """Run extract functions, write their sets and (optionally) export icons. Returns manifest entries."""
    out_dir = out_dir or default_out(game)
    if icons_dir:
        game.assets_dir = icons_dir  # icon file names follow the folder the icons go to
    exporter = IconExporter(game, icons_dir) if icons_dir else None
    entries = {}
    for fn in extract_fns:
        before = len(game.warnings)
        sets = fn(game)
        parse_warnings = game.warnings[before:]
        for i, ds in enumerate(sets if isinstance(sets, list) else [sets]):
            if i == 0:
                ds.warnings = parse_warnings + ds.warnings
            path = write_set(game, out_dir, ds)
            entry = {"file": os.path.relpath(path, out_dir).replace("\\", "/"), "count": len(ds.items), "warnings": len(ds.warnings)}
            if exporter:
                entry["icons"] = export_icons(exporter, ds)
            entries[ds.name] = entry
            if log:
                log(f"{ds.name}: {len(ds.items)} items, {len(ds.warnings)} warnings" + (f", icons {entry['icons']}" if exporter else "") + f" -> {path}")
    return entries, exporter


def write_manifest(game, out_dir, entries, exporter=None):
    path = os.path.join(out_dir, "manifest.json")
    old = {}
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as f:
            old = json.load(f).get("sets", {})
    old.update(entries)
    data = {
        "rulesetId": game.ruleset_id,
        "gameVersion": game.version,
        "date": datetime.date.today().isoformat(),
        "sets": dict(sorted(old.items())),
    }
    if exporter:
        data["icons"] = {k: len(v) for k, v in exporter.report.items()}
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    return path


def arg_parser(description):
    p = argparse.ArgumentParser(description=description)
    p.add_argument("--game", help="game folder (default: STELLARIS_GAME_DIR or the Steam folder)")
    p.add_argument("--out", help="output folder (default: data/generated/<rulesetId>)")
    p.add_argument("--icons", nargs="?", const=DEFAULT_ASSETS_DIR, help=f"export the icons as PNG into this folder (default: {DEFAULT_ASSETS_DIR})")
    return p


def main(extract_fn, description):
    """Command line of one extract_<set>.py script."""
    sys.stdout.reconfigure(encoding="utf-8")
    args = arg_parser(description).parse_args()
    game = GameFiles(args.game)
    out_dir = args.out or default_out(game)
    entries, exporter = run_sets(game, [extract_fn], out_dir, args.icons)
    write_manifest(game, out_dir, entries, exporter)
    if exporter:
        print("icons:", {k: len(v) for k, v in exporter.report.items()})
