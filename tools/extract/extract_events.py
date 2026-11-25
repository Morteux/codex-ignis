"""Event texts of events/ (T4110): id, scope, title, descriptions and option names of every event that
has a window (hidden events are left out):
python tools/extract/extract_events.py [--game DIR] [--icons [DIR]]"""
from pdx.output import DataSet, main
from pdx.parser import Block
from pdx.text import cond, dlc


def is_event_type(key):
    """country_event, planet_event, carrier_event...: every top-level `*_event` (and plain `event`)."""
    return isinstance(key, str) and (key == "event" or key.endswith("_event"))


def definitions(game):
    """(file, event type, block) of every file of events/ (subfolders included), in path order."""
    for path in game.files("events", recursive=True):
        rel = game.rel(path)
        for k, op, v in game.parse_file(path):
            if is_event_type(k):
                yield rel, k, v


def text_keys(block, field):
    """Localisation keys of `field = key` or `field = { text = key trigger = {...} }` entries."""
    out = []
    for d in block.get_all(field):
        if isinstance(d, Block):
            d = d.get("text")
        if d is not None and not isinstance(d, Block) and str(d) not in out:
            out.append(str(d))
    return out


def extract(game):
    warnings, items, seen = [], [], {}
    L = game.localisation
    english = L.language("english")
    for file, kind, e in definitions(game):
        if not isinstance(e, Block) or e.get("id") is None:
            continue
        if e.get("hide_window") is True:
            continue
        eid = str(e.get("id"))
        titles = [k for k in text_keys(e, "title") if k in english]
        descs = [k for k in text_keys(e, "desc") if k in english]
        if not titles:
            continue  # no readable title: nothing a question could quote
        if eid in seen:
            warnings.append(f"{file}: {eid} redefined (first in {seen[eid]})")
            items = [i for i in items if i["id"] != eid]
        seen[eid] = file
        options = []
        for o in e.get_all("option"):
            if isinstance(o, Block):
                options += [k for k in text_keys(o, "name") if k in english and k not in options]
        items.append({
            "id": eid,
            "file": file,
            "scope": kind,
            "namespace": eid.split(".")[0],
            "name": L.get(titles[0]),
            "desc": L.get(descs[0]) if descs else None,
            "_loc": {"name": titles[0], "desc": descs[0] if descs else None},
            "title_keys": titles,
            "desc_keys": descs,
            "option_keys": options,
            "is_triggered_only": e.get("is_triggered_only") is True,
            "picture": e.get("picture") if not isinstance(e.get("picture"), Block) else None,
            "trigger": cond(e.get("trigger")),
            "pre_triggers": cond(e.get("pre_triggers")),
            "dlc": dlc(game, e.get("trigger"), e.get("pre_triggers")),
        })
    return DataSet("events", ["events"], items, warnings)


if __name__ == "__main__":
    main(extract, __doc__)
