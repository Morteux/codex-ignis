"""Runs every extractor, or a chosen subset, and writes the manifest (T2521):

python tools/extract/extract_all.py [--game DIR] [--out DIR] [--icons [DIR]] [--only technologies,jobs]

--only takes extractor names (the part after extract_) or data set names (zones → districts).
"""
import importlib, sys
from pdx.game import GameFiles
from pdx.output import arg_parser, default_out, run_sets, write_icon_report, write_manifest

EXTRACTORS = {
    "technologies": ["technologies"],
    "jobs": ["jobs"],
    "buildings": ["buildings"],
    "districts": ["districts", "zones", "zone_slots"],
    "designations": ["designations"],
    "civics": ["civics", "origins"],
    "authorities": ["authorities"],
    "ethics": ["ethics"],
    "planets": ["planet_classes"],
    "planet_features": ["planet_modifiers", "static_modifiers", "deposits"],
    "edicts": ["edicts"],
    "policies": ["policies"],
    "economic_categories": ["economic_categories"],
    "dlc": ["dlc"],
    "living_standards": ["living_standards"],
    "species_traits": ["species_traits"],
    "ascension_perks": ["ascension_perks"],
    "traditions": ["tradition_categories", "traditions"],
    "ship_components": ["ship_components"],
    "megastructures": ["megastructures"],
    "crises": ["crisis_paths", "crisis_levels", "menace_perks", "crisis_objectives"],
    "fallen_empires": ["fallen_empires"],
    "events": ["events"],
}


def selected(only):
    """Extractor names for --only (extractor or data set names), in the order of EXTRACTORS."""
    if not only:
        return list(EXTRACTORS)
    wanted = [w.strip() for w in only.split(",") if w.strip()]
    names = set()
    for w in wanted:
        match = [e for e, sets in EXTRACTORS.items() if w == e or w in sets]
        if not match:
            raise SystemExit(f"unknown extractor or data set: {w} (known: {', '.join(EXTRACTORS)})")
        names.update(match)
    return [e for e in EXTRACTORS if e in names]


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = arg_parser(__doc__)
    p.add_argument("--only", help="comma-separated extractors or data sets (default: all)")
    args = p.parse_args()
    game = GameFiles(args.game)
    out_dir = args.out or default_out(game)
    names = selected(args.only)
    print(f"{game.version} ({game.ruleset_id}): {', '.join(names)}")
    fns = [importlib.import_module("extract_" + n).extract for n in names]
    entries, exporter = run_sets(game, fns, out_dir, args.icons)
    path = write_manifest(game, out_dir, entries, exporter)
    print("manifest:", path)
    if exporter:
        print("icons:", {k: len(v) for k, v in exporter.report.items()})
        print("icon report:", write_icon_report(game, exporter))
    return exporter


if __name__ == "__main__":
    main()
