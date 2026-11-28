"""Access to an installed game folder: version, scripted variables, inline scripts and parsed folders."""
import json, os, re
from .localisation import Localisation, scripted_defaults
from .parser import Parser, to_text

DEFAULT_GAME_DIR = "D:/Program Files (x86)/Steam/steamapps/common/Stellaris"


def game_dir(arg=None):
    """Game folder: --game argument, else STELLARIS_GAME_DIR, else the default Steam folder."""
    return (arg or os.environ.get("STELLARIS_GAME_DIR") or DEFAULT_GAME_DIR).replace("\\", "/").rstrip("/")


def read_text(path):
    with open(path, encoding="utf-8-sig", errors="replace") as f:
        return f.read()


NEGATE = ("NOT", "NOR")
ALTERNATIVE = ("OR", "NAND")


def condition_dlc_mentions(block, triggers):
    """[[DLC name, negated, alternative], ...] of a condition block: its host_has_dlc and the
    scripted triggers of `triggers` ({name: [[dlc, negated, alternative], ...]}) set to yes / no.
    negated: inside a NOT / NOR or a trigger set to no; alternative: inside an OR / NAND (or a NOT
    of several conditions), so the item does not need that DLC for sure."""
    found = []

    def walk(b, neg, alt):
        for k, op, v in b.entries:
            if k == "host_has_dlc":
                found.append([str(v).strip(), neg, alt])
            elif isinstance(k, str) and k in triggers and isinstance(v, bool):
                for name, n, a in triggers[k]:
                    found.append([name, bool(neg ^ (not v) ^ n), bool(alt or a)])
            elif hasattr(v, "entries"):
                walk(v, neg != (k in NEGATE), alt or k in ALTERNATIVE or (k in NEGATE and len(v.entries) > 1))

    walk(block, False, False)
    return [list(m) for m in dict.fromkeys(tuple(m) for m in found)]


def dlc_trigger_mentions(definitions):
    """{trigger name: block} of common/scripted_triggers → {name: DLC mentions} of the triggers
    that check a DLC, directly or through other triggers (expanded, cycles ignored)."""
    refs = {k: {e[0] for e in _walk_entries(b) if e[0] in definitions and isinstance(e[2], bool)} for k, b in definitions.items()}
    direct = {k for k, b in definitions.items() if any(e[0] == "host_has_dlc" for e in _walk_entries(b))}
    dlc_keys, changed = set(direct), True
    while changed:
        changed = False
        for k, r in refs.items():
            if k not in dlc_keys and r & dlc_keys:
                dlc_keys.add(k)
                changed = True
    def resolve(k, path):
        # no memo: a trigger met again on the path (a cycle) is skipped only on that path
        known = {t: resolve(t, path | {t}) for t in refs[k] & dlc_keys if t not in path}
        return condition_dlc_mentions(definitions[k], known)

    return {k: resolve(k, {k}) for k in definitions if k in dlc_keys}


def _walk_entries(block):
    for e in block.entries:
        yield e
        if hasattr(e[2], "entries"):
            yield from _walk_entries(e[2])


class GameFiles:
    def __init__(self, root=None):
        self.root = game_dir(root)
        if not os.path.isdir(self.root):
            raise FileNotFoundError(f"game folder not found: {self.root}")
        self.warnings = []
        self._variables = None
        self._folders = {}
        self._localisation = None
        self._sprites = None

    # -- version
    @property
    def launcher_settings(self):
        with open(self.path("launcher-settings.json"), encoding="utf-8-sig") as f:
            return json.load(f)

    @property
    def version(self):
        return self.launcher_settings.get("version", "")

    @property
    def ruleset_id(self):
        """`stellaris-pc-4.5.4` from rawVersion `v4.5.4`."""
        raw = self.launcher_settings.get("rawVersion") or self.version.split(" v")[-1].split(" ")[0]
        return "stellaris-pc-" + raw.lstrip("v")

    # -- paths
    def path(self, rel):
        return os.path.join(self.root, rel).replace("\\", "/")

    def rel(self, path):
        return os.path.relpath(path, self.root).replace("\\", "/")

    def files(self, folder, ext=".txt", recursive=False):
        """Files of a game folder in load order (path order)."""
        base = self.path(folder)
        if not os.path.isdir(base):
            return []
        out = []
        if recursive:
            for d, _, names in os.walk(base):
                out += [os.path.join(d, n) for n in names if n.lower().endswith(ext)]
        else:
            out = [os.path.join(base, n) for n in os.listdir(base) if n.lower().endswith(ext) and os.path.isfile(os.path.join(base, n))]
        return sorted(p.replace("\\", "/") for p in out)

    # -- localisation
    @property
    def localisation(self):
        if self._localisation is None:
            self._localisation = Localisation(self.root, lambda: self.scripted_loc)
        return self._localisation

    @property
    def scripted_loc(self):
        """{defined_text name: default localisation key} of common/scripted_loc."""
        if getattr(self, "_scripted_loc", None) is None:
            self._scripted_loc = scripted_defaults(
                (k, v) for _, k, v in self.folder("common/scripted_loc", repeated=("defined_text", "define_text")))
        return self._scripted_loc

    # -- sprites of interface/*.gfx
    @property
    def sprites(self):
        if self._sprites is None:
            from .icons import Sprites
            self._sprites = Sprites(self)
        return self._sprites

    @property
    def dlc_trigger_mentions(self):
        """Every scripted trigger of common/scripted_triggers that checks a DLC, directly
        (host_has_dlc) or through another such trigger (has_genetic_dlc → has_space_monster_dlc):
        name → [[DLC name, negated, alternative], ...], nested triggers expanded."""
        if getattr(self, "_dlc_trigger_mentions", None) is None:
            self._dlc_trigger_mentions = dlc_trigger_mentions(
                {k: v for _, k, v in self.folder("common/scripted_triggers") if hasattr(v, "entries")})
        return self._dlc_trigger_mentions

    @property
    def dlc_triggers(self):
        """Scripted triggers that check a DLC (has_lithoids, has_machine_age_dlc...) → the DLC
        names they name, negated ones included (like host_has_dlc inside a NOT)."""
        if getattr(self, "_dlc_triggers", None) is None:
            self._dlc_triggers = {k: list(dict.fromkeys(m[0] for m in v)) for k, v in self.dlc_trigger_mentions.items()}
        return self._dlc_triggers

    # -- scripted variables and inline scripts
    @property
    def variables(self):
        """Global @variables of common/scripted_variables (name without @ → value)."""
        if self._variables is None:
            self._variables = {}
            for f in self.files("common/scripted_variables"):
                p = Parser(self._variables)
                p.parse(read_text(f), self.rel(f))
                self._variables.update(p.locals)
                self.warnings.extend(p.warnings)
        return self._variables

    def inline_script(self, path):
        f = self.path("common/inline_scripts/" + str(path).strip("/") + ".txt")
        return read_text(f) if os.path.isfile(f) else None

    def parse_file(self, path):
        p = Parser(self.variables, self.inline_script)
        block = p.parse(read_text(path), self.rel(path))
        self.warnings.extend(p.warnings)
        return block

    def parse_text(self, text, source="<text>"):
        p = Parser(self.variables, self.inline_script)
        block = p.parse(text, source)
        self.warnings.extend(p.warnings)
        return block

    def folder(self, folder, recursive=False, repeated=("random_list",)):
        """Top-level definitions of every file of a common/ folder: list of (file, key, value).

        Files load in path order; a key defined again replaces the earlier one (warned), except
        the `repeated` keys, which are lists rather than definitions (`random_list` of planet classes)."""
        key = (folder, recursive)
        if key not in self._folders:
            seen, out = {}, []
            for f in self.files(folder, recursive=recursive):
                for k, op, v in self.parse_file(f):
                    if k is None:
                        continue
                    if k in seen and k not in repeated:
                        self.warnings.append(f"{self.rel(f)}: {k} redefined (first in {seen[k]})")
                        out = [e for e in out if e[1] != k]
                    seen[k] = self.rel(f)
                    out.append((self.rel(f), k, v))
            self._folders[key] = out
        return self._folders[key]
