"""StellarisAssets index (T2704): every StellarisAssets image the site's scripts name exists in its index.json.

Reads the local StellarisAssets repository (STELLARIS_ASSETS_DIR, else the sibling folder the extractor
writes to) and scans js/ for string literals `<folder>/<file>.png` of a StellarisAssets folder (paths
built with `${...}` are skipped: they are checked by the page tests)."""
import json, os, re
from smoke.common import check, ROOT

ASSETS_DIR = os.environ.get("STELLARIS_ASSETS_DIR") or os.path.join(os.path.dirname(ROOT), "StellarisAssets")
COMMENTS = re.compile(r"/\*.*?\*/|^\s*//[^\n]*", re.S | re.M)


def site_paths(folders):
    pattern = re.compile(r"[\"'`]((?:" + "|".join(re.escape(f) for f in sorted(folders)) + r")/[^\"'`$\s]+?\.png)[\"'`]")
    found = {}
    for d, _, names in os.walk(os.path.join(ROOT, "js")):
        for n in names:
            if n.endswith(".js"):
                p = os.path.join(d, n)
                with open(p, encoding="utf-8", errors="replace") as fh:
                    code = COMMENTS.sub("", fh.read())  # examples in comments ("civics/Civic_x.png") are no links
                    for m in pattern.finditer(code):
                        found.setdefault(m.group(1), os.path.relpath(p, ROOT).replace("\\", "/"))
    return found


async def run(t):
    path = os.path.join(ASSETS_DIR, "index.json")
    if not os.path.isfile(path):
        check("assets index: StellarisAssets/index.json not found locally, skipped", True, path)
        return
    with open(path, encoding="utf-8") as fh:
        index = json.load(fh)
    files = {item["file"] for item in index["items"]}
    check("assets index: rulesetId and items", index.get("rulesetId", "").startswith("stellaris-pc-") and len(files) > 10000, len(files))
    check("assets index: every item has a category and a size", all("category" in i and i.get("w") for i in index["items"]))
    keyed = [i for i in index["items"] if i.get("sprites")]
    keys = [k for i in keyed for k in i["sprites"]]
    odd = [k for k in keys if not k.lower().startswith("gfx_")]  # a few game sprites have no GFX_ prefix (button_left, cursor…)
    check("assets index: sprite keys (GFX_… but for a few game sprites)", len(keyed) > 5000 and len(odd) < len(keys) / 100, (len(keyed), odd[:5]))
    check("assets index: game names", sum(1 for i in index["items"] if i.get("name")) > 2000)
    folders = {f.split("/", 1)[0] for f in files if "/" in f}
    used = site_paths(folders)
    missing = sorted(p for p in used if p not in files)
    check("assets index: the site's scripts name StellarisAssets images", len(used) > 1000, len(used))
    check("assets index: every image the site's scripts name is in index.json", not missing,
          [f"{p} ({used[p]})" for p in missing[:10]])
    with open(os.path.join(ASSETS_DIR, "app.js"), encoding="utf-8") as fh:
        app = fh.read()
    check("assets site: app.js reads index.json and searches sprite keys and names",
          "index.json" in app and "asset.sprites" in app and "asset.name" in app)
