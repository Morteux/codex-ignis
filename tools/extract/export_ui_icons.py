"""Interface icons of the site's concepts (T2602, ICONS.md):

python tools/extract/export_ui_icons.py [--game DIR] [--assets DIR] [--check]

Exports to StellarisAssets the game icons of the concepts the planet simulator (and later the other
pages) still shows as text: the tooltip text icons (stability, amenities, housing, crime, jobs, pops,
districts, zones, buildings, time...), the pop category (stratum) icons and, for every simulator
resource, its four resource modifier icons (bonus = produces_add, efficiency = produces_mult, upkeep =
upkeep_add, upkeep change = upkeep_mult). Every icon is found by its game sprite (interface/*.gfx) or,
when no sprite names the file, by its texture; files already in StellarisAssets are only replaced when
they changed. Prints the export report (new / replaced / unchanged / kept_larger / missing).

--check only lists what would be exported (no file is written).
"""
import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pdx.game import GameFiles, game_dir  # noqa: E402
from pdx.icons import IconExporter, DEFAULT_ASSETS_DIR  # noqa: E402

# Tooltip text icons (£stability£ ...): sprite → StellarisAssets text_icons/<texture name>.png
TEXT_ICONS = [
    "GFX_text_stability", "GFX_text_amenities", "GFX_text_amenities_no_happiness", "GFX_text_housing", "GFX_text_crime",
    "GFX_text_happiness", "GFX_text_job", "GFX_text_job_unemployment", "GFX_text_pop", "GFX_text_tooltip_pop",
    "GFX_text_pop_modifier", "GFX_text_district", "GFX_text_districtadd", "GFX_text_zone", "GFX_text_building",
    "GFX_text_upgrade", "GFX_text_time", "GFX_text_trade_value", "GFX_text_empire", "GFX_text_economy",
    "GFX_text_decision", "GFX_text_ruler",
]
# Pop categories (job strata): texture → StellarisAssets pop_categories/<texture name>.png
POP_CATEGORIES = ["ruler", "specialist", "worker", "complex_drone", "simple_drone", "civilian", "slave", "bio_trophy", "maintenance_drone"]
# Simulator resource → game resource key of the modifier icons (amenities use the text icon).
RESOURCES = {
    "energy": "energy", "minerals": "minerals", "food": "food", "alloys": "alloys", "consumer_goods": "consumer_goods",
    "unity": "unity", "physics": "physics_research", "society": "society_research", "engineering": "engineering_research",
    "trade": "trade", "influence": "influence", "volatile_motes": "volatile_motes", "rare_crystals": "rare_crystals",
    "exotic_gases": "exotic_gases", "minor_artifacts": "minor_artifacts", "astral_threads": "astral_threads",
    "advanced_logic": "advanced_logic", "nanites": "nanites", "zro": "sr_zro", "biomass": "biomass",
}
MODIFIER_KINDS = ["produces_add", "produces_mult", "upkeep_add", "upkeep_mult"]


def icon_list(game):
    """[(label, texture, asset, frames, frame)] of every icon to export; missing ones have texture None."""
    out = []
    for sprite in TEXT_ICONS:
        found = game.sprites.find(sprite)
        texture = found[1] if found else None
        stem = os.path.splitext(os.path.basename(texture))[0] if texture else sprite[len("GFX_text_"):]
        out.append((sprite, texture, f"text_icons/{stem}.png", found[2] if found else 1, found[3] if found else 0))
    for cat in POP_CATEGORIES:
        texture = f"gfx/interface/icons/pop_categories/pop_cat_{cat}.dds"
        out.append((f"pop_cat_{cat}", texture if game.sprites.texture_path(texture) else None, f"pop_categories/pop_cat_{cat}.png", 1, 0))
    for res, key in RESOURCES.items():
        for kind in MODIFIER_KINDS:
            stem = f"mod_{key}_{kind}"
            found = game.sprites.find(f"GFX_{stem}", [f"gfx/interface/icons/modifiers/{stem}.dds"])
            out.append((f"{res}: {kind}", found[1] if found else None, f"modifiers/{stem}.png", found[2] if found else 1, found[3] if found else 0))
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Export the interface icons of the site's concepts to StellarisAssets")
    p.add_argument("--game", help="game folder")
    p.add_argument("--assets", default=DEFAULT_ASSETS_DIR, help=f"StellarisAssets folder (default: {DEFAULT_ASSETS_DIR})")
    p.add_argument("--check", action="store_true", help="only list the icons")
    args = p.parse_args()
    game = GameFiles(game_dir(args.game))
    exporter = IconExporter(game, args.assets)
    for label, texture, asset, frames, frame in icon_list(game):
        if args.check:
            print(f"{label}: {texture or 'MISSING'} → {asset}")
        elif texture:
            print(f"{exporter.export(texture, asset, frames, frame)}: {asset} ({label})")
        else:
            exporter.report["missing"].append(asset)
            print(f"missing: {asset} ({label})")
    if not args.check:
        for status, assets in exporter.report.items():
            print(f"{status}: {len(assets)}")


if __name__ == "__main__":
    main()
