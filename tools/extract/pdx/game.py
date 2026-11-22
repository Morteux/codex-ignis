"""Access to an installed game folder: version, scripted variables, inline scripts and parsed folders."""
import json, os, re
from .localisation import Localisation
from .parser import Parser, to_text

DEFAULT_GAME_DIR = "D:/Program Files (x86)/Steam/steamapps/common/Stellaris"


def game_dir(arg=None):
    """Game folder: --game argument, else STELLARIS_GAME_DIR, else the default Steam folder."""
    return (arg or os.environ.get("STELLARIS_GAME_DIR") or DEFAULT_GAME_DIR).replace("\\", "/").rstrip("/")


def read_text(path):
    with open(path, encoding="utf-8-sig", errors="replace") as f:
        return f.read()


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
            self._localisation = Localisation(self.root)
        return self._localisation

    # -- sprites of interface/*.gfx
    @property
    def sprites(self):
        if self._sprites is None:
            from .icons import Sprites
            self._sprites = Sprites(self)
        return self._sprites

    @property
    def dlc_triggers(self):
        """Scripted triggers such as has_machine_age_dlc → the DLC names of their host_has_dlc."""
        if getattr(self, "_dlc_triggers", None) is None:
            self._dlc_triggers = {}
            for _, key, value in self.folder("common/scripted_triggers"):
                if re.fullmatch(r"has_\w+_dlc", key):
                    names = re.findall(r'host_has_dlc\s*=\s*"?([^"\n}]+?)"?\s*(?:\n|}|$)', to_text(value) if hasattr(value, "entries") else str(value))
                    self._dlc_triggers[key] = [n.strip() for n in names]
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
