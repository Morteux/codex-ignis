"""DLC list, names and icons (dlc_metadata/dlc_info.txt, dlc/*/*.dlc, interface/dlc_icons.gfx) (T2519, for T3502):
python tools/extract/extract_dlc.py [--game DIR] [--icons [DIR]]

`name` is the name the game uses in host_has_dlc triggers (the `dlc` field of the other sets)."""
import os
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import icon, strings


def installed(game):
    """{name: data of the .dlc file} of the DLCs in the game's dlc/ folder."""
    out = {}
    base = game.path("dlc")
    for d in sorted(os.listdir(base)) if os.path.isdir(base) else []:
        for f in game.files("dlc/" + d, ".dlc"):
            b = game.parse_file(f)
            out[str(b.get("name"))] = {"folder": "dlc/" + d, "category": b.get("category"), "localizable_name": b.get("localizable_name"), "steam_id": b.get("steam_id")}
    return out


def extract(game):
    warnings, items = [], []
    local = installed(game)
    info = game.parse_file(game.path("dlc_metadata/dlc_info.txt")) if os.path.isfile(game.path("dlc_metadata/dlc_info.txt")) else Block()
    dlcs = info.get("dlcs") if isinstance(info.get("dlcs"), Block) else Block()
    seen = set()
    for key, _, d in dlcs:
        if not isinstance(d, Block):
            continue
        name = str(d.get("name"))
        here = local.get(name, {})
        loc_key = here.get("localizable_name")
        sprite = d.get("icon")
        items.append({
            "id": key,
            "name": name,
            "localised_name": game.localisation.get(str(loc_key)) if loc_key else None,
            "_loc": {"name": str(loc_key) if loc_key else None, "desc": None},
            "category": here.get("category"),
            "installed": bool(here),
            "folder": here.get("folder"),
            "steam_id": str(d.get("steam_id") or here.get("steam_id") or "") or None,
            "show": d.get("show") is not False,
            "affects_gameplay": d.get("affects_gameplay") is not False,
            "recommendations": strings(d.get("recommendations")),
            "icon": icon(game, "dlc", sprite=str(sprite)) if sprite else None,
            "icon_big": icon(game, "dlc", sprite=str(sprite) + "_big") if sprite else None,
        })
        seen.add(name)
        if sprite and items[-1]["icon"] is None:
            warnings.append(f"{key} ({name}): icon not found")
    for name, here in local.items():
        if name not in seen:
            warnings.append(f"{here['folder']}: {name} is not in dlc_metadata/dlc_info.txt")
    return DataSet("dlc", ["dlc_metadata/dlc_info.txt", "dlc", "interface/dlc_icons.gfx"], items, warnings)


if __name__ == "__main__":
    main(extract, __doc__)
