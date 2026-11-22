"""Helpers shared by the extractors: conditions kept as text, resources, modifiers, DLC, names."""
import os, re
from .icons import DEFAULT_ASSETS_DIR, AssetFolder
from .parser import Block, Color, Quoted, to_python, to_text

RESOURCE_PARTS = ("cost", "upkeep", "produces")
_DLC_HOST = re.compile(r'host_has_dlc\s*=\s*"?([^"\n}]+?)"?\s*(?:[\n}]|$)')
_DLC_TRIGGER = re.compile(r"\b(has_[a-z0-9_]+_dlc)\s*=\s*yes")


def cond(value):
    """A condition / effect block as Paradox text (None when absent)."""
    if value is None:
        return None
    if isinstance(value, Block):
        return to_text(value)
    return str(value)


def plain_value(value):
    """JSON value: numbers and strings as they are, blocks as plain dicts / lists."""
    return to_python(value)


def strings(value):
    """List of strings of a list block (`{ a "b" }`) or of a single value."""
    if value is None:
        return []
    if isinstance(value, Block):
        return [str(v) for v in value.values]
    return [str(value)]


def numbers_only(block):
    """{key: number} of a modifier block (other statements are dropped)."""
    if not isinstance(block, Block):
        return {}
    return {k: v for k, op, v in block if k is not None and op == "=" and isinstance(v, (int, float)) and not isinstance(v, bool)}


def modifier(block):
    """A `modifier = { ... }` block: numeric modifiers plus anything else kept as text."""
    if not isinstance(block, Block):
        return None
    out = numbers_only(block)
    rest = Block([e for e in block if not (e[0] in out and e[1] == "=")])
    if rest.entries:
        out["_text"] = to_text(rest)
    return out


def triggered_modifiers(item, key):
    """`triggered_*_modifier = { potential = {...} modifiers... }` blocks of an item."""
    out = []
    for b in item.get_all(key):
        if not isinstance(b, Block):
            continue
        entry = {"potential": cond(b.get("potential"))}
        mods = Block([e for e in b if e[0] not in ("potential", "key", "icon")])
        entry["modifier"] = modifier(mods)
        if b.get("key") is not None:
            entry["key"] = str(b.get("key"))
        out.append(entry)
    return out


def resource_entry(block):
    """One cost / upkeep / produces block: {resource: amount, trigger: text, multiplier: ...}."""
    out = {}
    for k, op, v in block:
        if k is None:
            continue
        if k == "trigger":
            out["trigger"] = cond(v)
        elif isinstance(v, (int, float)) and not isinstance(v, bool):
            out[k] = v
        elif isinstance(v, Block):
            out[k] = cond(v)
        else:
            out[k] = str(v) if isinstance(v, Quoted) else v
    return out


def resources(block):
    """`resources = { category = x cost = {...} upkeep = {...} produces = {...} }` → dict of lists."""
    if not isinstance(block, Block):
        return None
    out = {}
    if block.get("category") is not None:
        out["category"] = str(block.get("category"))
    for part in RESOURCE_PARTS:
        entries = [resource_entry(b) for b in block.get_all(part) if isinstance(b, Block)]
        if entries:
            out[part] = entries
    other = [k for k in block.keys() if k not in RESOURCE_PARTS + ("category",)]
    if other:
        out["_text"] = to_text(Block([e for e in block if e[0] in other]))
    return out


# The regular (non-nomadic) case of the `buildings/nomadic_cost_switcher`-style inline scripts
_BASE_TRIGGER = re.compile(r"^(from|owner)\??\s*=\s*\{\s*is_nomadic\s*=\s*no\s*\}$")


def simple_resources(res, part):
    """Amounts of one part (cost / upkeep / produces) for a regular empire, summed: {resource: amount}.

    Unconditional entries plus the ones whose only condition is `is_nomadic = no`; every other
    conditional entry is only in the full `resources`."""
    total = {}
    for entry in (res or {}).get(part, []):
        if entry.get("trigger") and not _BASE_TRIGGER.match(entry["trigger"]):
            continue
        for k, v in entry.items():
            if isinstance(v, (int, float)) and k not in ("multiplier", "mult"):
                total[k] = total.get(k, 0) + v
    return total


def dlc(game, *blocks):
    """DLC names (as host_has_dlc writes them) required by the blocks: host_has_dlc triggers and
    has_<dlc>_dlc scripted triggers (resolved through common/scripted_triggers). A DLC only named
    inside a NOT / NOR is still listed: the text of the condition tells the rest."""
    found = []
    for b in blocks:
        if b is None:
            continue
        text = to_text(b) if isinstance(b, Block) else str(b)
        names = [m.strip() for m in _DLC_HOST.findall(text)]
        for trig in _DLC_TRIGGER.findall(text):
            names += game.dlc_triggers.get(trig) or [trig]
        for m in names:
            if m not in found:
                found.append(m)
    return found


_asset_folders = {}


def icon(game, folder, sprite=None, textures=(), aliases=()):
    """Icon of an item: {sprite, texture, asset} (asset = path inside StellarisAssets), or None.

    The sprite (GFX_...) is tried first, then the textures in order. The file name reuses the one
    the StellarisAssets folder already has for it (the texture name or one of the aliases)."""
    found = game.sprites.find(sprite, [t for t in textures if t])
    if not found:
        return None
    name, texture, frames = found
    assets_dir = getattr(game, "assets_dir", None) or DEFAULT_ASSETS_DIR
    key = (assets_dir, folder)
    if key not in _asset_folders:
        _asset_folders[key] = AssetFolder(os.path.join(assets_dir, folder))
    stem = os.path.splitext(os.path.basename(texture))[0]
    out = {"sprite": name, "texture": texture, "asset": folder + "/" + _asset_folders[key].file_name(stem, tuple(aliases))}
    if frames and frames > 1:
        out["_frames"] = frames
    return out


def colour(value):
    return value.to_python() if isinstance(value, Color) else to_python(value)


def loc(game, item_id, keys=None, desc_keys=None):
    """English name and description of an item plus the localisation keys used (for every language)."""
    L = game.localisation
    name_keys = keys or [item_id]
    desc_keys = desc_keys or [k + "_desc" for k in name_keys]
    name_key = next((k for k in name_keys if k and k in L.language("english")), None)
    desc_key = next((k for k in desc_keys if k and k in L.language("english")), None)
    return {
        "name": L.get(name_key) if name_key else None,
        "desc": L.get(desc_key) if desc_key else None,
        "_loc": {"name": name_key, "desc": desc_key},
    }
