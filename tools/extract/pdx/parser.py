"""Paradox script parser (GAME_FILES_EXTRACTOR.md §4).

parse(text) returns a Block: the ordered statements of the file. A statement is (key, op, value);
a bare value of a list (`category = { computing }`) is stored with key None. Values are numbers,
booleans (yes/no), strings, Color or nested Block. `@variables` (local and global), `@[ ... ]`
inline maths and `inline_script` statements are resolved while parsing.
"""
import re

OPERATORS = ("=", "<", ">", "<=", ">=", "!=", "==", "?=")
COLOR_SPACES = ("rgb", "hsv", "hsv360", "hex")

_TOKEN = re.compile(r"""
    (?P<space>\s+)
  | (?P<comment>\#[^\n]*)
  | (?P<string>"(?:[^"\\]|\\.)*"?)
  | (?P<maths>@\[[^\]]*\])
  | (?P<op><=|>=|!=|==|\?=|=|<|>)
  | (?P<open>\{)
  | (?P<close>\})
  | (?P<word>[^\s{}=<>!?"\#]+(?:\?(?!=))?|[!?])
""", re.X)
_NUMBER = re.compile(r"^[+-]?(\d+\.?\d*|\.\d+)$")


class ParseError(Exception):
    pass


class Quoted(str):
    """A string written between quotes in the script (never turned into a number or boolean)."""


class Color:
    def __init__(self, space, values):
        self.space, self.values = space, values

    def __eq__(self, other):
        return isinstance(other, Color) and (self.space, self.values) == (other.space, other.values)

    def __repr__(self):
        return f"Color({self.space!r}, {self.values!r})"

    def to_python(self):
        return {"space": self.space, "values": self.values}


class Block:
    """Ordered statements of a `{ ... }` block (or of a whole file)."""

    def __init__(self, entries=None):
        self.entries = entries if entries is not None else []
        self.variables = {}  # @variables defined in this block (top level of a file)

    def __iter__(self):
        return iter(self.entries)

    def __len__(self):
        return len(self.entries)

    def __repr__(self):
        return f"Block({self.entries!r})"

    def __eq__(self, other):
        return isinstance(other, Block) and self.entries == other.entries

    @property
    def values(self):
        """Bare values of the block (a list such as `{ a b "c" }`)."""
        return [v for k, _, v in self.entries if k is None]

    def keys(self):
        return [k for k, _, _ in self.entries if k is not None]

    def get(self, key, default=None):
        """Value of the first statement with this key."""
        for k, _, v in self.entries:
            if k == key:
                return v
        return default

    def get_all(self, key):
        return [v for k, _, v in self.entries if k == key]

    def get_op(self, key):
        """(op, value) of the first statement with this key, or None."""
        for k, op, v in self.entries:
            if k == key:
                return op, v
        return None

    def has(self, key):
        return any(k == key for k, _, _ in self.entries)

    def to_python(self):
        """Plain dict / list: repeated keys become lists, comparisons {"op": op, "value": v}."""
        if all(k is None for k, _, _ in self.entries):
            return [to_python(v) for v in self.values]
        out = {}
        for k, op, v in self.entries:
            if k is None:
                out.setdefault("_values", []).append(to_python(v))
                continue
            val = to_python(v) if op == "=" else {"op": op, "value": to_python(v)}
            if k in out:
                if not isinstance(out[k], list) or k not in _multi(out):
                    out[k] = [out[k]]
                    _multi(out).add(k)
                out[k].append(val)
            else:
                out[k] = val
        out.pop("\0multi", None)
        return out


def _multi(d):
    return d.setdefault("\0multi", set())


def to_python(value):
    if isinstance(value, (Block, Color)):
        return value.to_python()
    if isinstance(value, Quoted):
        return str(value)
    return value


def scalar(word):
    """Bare word → bool, int, float or str."""
    if word == "yes":
        return True
    if word == "no":
        return False
    if _NUMBER.match(word):
        return float(word) if "." in word else int(word)
    return word


def tokenize(text):
    tokens, pos, line = [], 0, 1
    while pos < len(text):
        m = _TOKEN.match(text, pos)
        if not m:
            raise ParseError(f"line {line}: unexpected character {text[pos]!r}")
        kind = m.lastgroup
        if kind not in ("space", "comment"):
            tokens.append((kind, m.group(), line))
        line += m.group().count("\n")
        pos = m.end()
    return tokens


class Parser:
    """parse() with the context needed to resolve variables and inline scripts.

    variables: global @variables (name without @ → value), e.g. common/scripted_variables.
    inline_scripts: function(path) → text of common/inline_scripts/<path>.txt, or None.
    """

    def __init__(self, variables=None, inline_scripts=None):
        self.globals = variables or {}
        self.inline_scripts = inline_scripts
        self.warnings = []

    def parse(self, text, source="<text>", _depth=0):
        if text.startswith("﻿"):
            text = text[1:]
        self.source = source
        self.tokens = tokenize(text)
        self.pos = 0
        self.locals = {}
        self._depth = _depth
        block = self._block(top=True)
        block.variables = self.locals
        return block

    # -- tokens
    def _peek(self, offset=0):
        i = self.pos + offset
        return self.tokens[i] if i < len(self.tokens) else (None, None, None)

    def _next(self):
        tok = self._peek()
        self.pos += 1
        return tok

    def _error(self, msg, line):
        if line is None:
            line = self.tokens[-1][2] if self.tokens else 1
        raise ParseError(f"{self.source}:{line}: {msg}")

    # -- grammar
    def _block(self, top=False):
        block = Block()
        while True:
            kind, text, line = self._peek()
            if kind is None:
                if not top:
                    self._error("missing }", line)
                return block
            if kind == "close":
                self._next()
                if top:
                    self.warnings.append(f"{self.source}:{line}: extra }} ignored")
                    continue
                return block
            nkind, ntext, _ = self._peek(1)
            if kind in ("word", "string") and nkind == "op":
                self.pos += 2
                key = text[1:-1] if kind == "string" else text
                value = self._value()
                if key.startswith("@") and ntext == "=":
                    self.locals[key[1:]] = value
                    block.variables[key[1:]] = value
                    continue
                if key == "inline_script" and self.inline_scripts is not None:
                    block.entries.extend(self._inline(value, line))
                    continue
                block.entries.append((key, ntext, value))
            else:
                block.entries.append((None, None, self._value()))

    def _value(self):
        kind, text, line = self._next()
        if kind == "open":
            return self._block()
        if kind == "string":
            return Quoted(_unquote(text))
        if kind == "maths":
            return self._maths(text[2:-1], line)
        if kind == "word":
            if text in COLOR_SPACES and self._peek()[0] == "open":
                self._next()
                inner = self._block()
                return Color(text, [v for v in inner.values])
            if text.startswith("@") and len(text) > 1:
                return self._variable(text[1:], line)
            return scalar(text)
        self._error(f"value expected, found {text!r}", line)

    def _variable(self, name, line):
        if name in self.locals:
            return self.locals[name]
        if name in self.globals:
            return self.globals[name]
        self.warnings.append(f"{self.source}:{line}: unknown variable @{name}")
        return "@" + name

    def _maths(self, expr, line):
        try:
            value = _Maths(expr, lambda n: self._variable(n, line)).evaluate()
        except (ParseError, ZeroDivisionError, TypeError) as e:
            self.warnings.append(f"{self.source}:{line}: cannot evaluate @[{expr}]: {e}")
            return "@[" + expr + "]"
        return int(value) if isinstance(value, float) and value.is_integer() else value

    def _inline(self, spec, line):
        params = {}
        if isinstance(spec, Block):
            for k, _, v in spec.entries:
                if k == "script":
                    path = str(v)
                elif k is not None:
                    params[k] = _param_text(v)
        else:
            path = str(spec)
        if self._depth > 20:
            self._error(f"inline_script {path}: too deep", line)
        text = self.inline_scripts(path)
        if text is None:
            self.warnings.append(f"{self.source}:{line}: inline_script {path} not found")
            return []
        text = expand_parameters(text, params)
        sub = Parser(self.globals, self.inline_scripts)
        block = sub.parse(text, f"inline_scripts/{path}", self._depth + 1)
        self.warnings.extend(sub.warnings)
        return block.entries


def _unquote(text):
    body = text[1:-1] if text.endswith('"') and len(text) > 1 else text[1:]
    return body.replace('\\"', '"')


def _param_text(value):
    if isinstance(value, Block):
        return "{ " + to_text(value, inline=True) + " }"
    if value is True:
        return "yes"
    if value is False:
        return "no"
    return str(value)


def expand_parameters(text, params):
    """Replace $PARAM$ and $PARAM|default$ in an inline script."""
    def repl(m):
        name, default = m.group(1), m.group(3)
        if name in params:
            return params[name]
        return default if default is not None else m.group(0)
    return re.sub(r"\$([A-Za-z0-9_]+)(\|([^$\n]*))?\$", repl, text)


class _Maths:
    """Recursive-descent evaluation of + - * / ( ) with numbers and variable names."""

    def __init__(self, expr, lookup):
        self.toks = re.findall(r"\d+\.?\d*|\.\d+|@?[A-Za-z_][A-Za-z0-9_]*|[-+*/()]", expr)
        if "".join(self.toks) != re.sub(r"\s+", "", expr):
            raise ParseError("unsupported expression")
        self.i, self.lookup = 0, lookup

    def evaluate(self):
        v = self._sum()
        if self.i != len(self.toks):
            raise ParseError("trailing tokens")
        return v

    def _tok(self):
        return self.toks[self.i] if self.i < len(self.toks) else None

    def _sum(self):
        v = self._product()
        while self._tok() in ("+", "-"):
            op = self.toks[self.i]; self.i += 1
            r = self._product()
            v = v + r if op == "+" else v - r
        return v

    def _product(self):
        v = self._unary()
        while self._tok() in ("*", "/"):
            op = self.toks[self.i]; self.i += 1
            r = self._unary()
            v = v * r if op == "*" else v / r
        return v

    def _unary(self):
        t = self._tok()
        if t == "-":
            self.i += 1
            return -self._unary()
        if t == "(":
            self.i += 1
            v = self._sum()
            if self._tok() != ")":
                raise ParseError("missing )")
            self.i += 1
            return v
        if t is None:
            raise ParseError("unexpected end")
        self.i += 1
        if t[0].isdigit() or t[0] == ".":
            return float(t) if "." in t else int(t)
        value = self.lookup(t.lstrip("@"))
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise ParseError(f"{t} is not a number")
        return value


def parse(text, variables=None, inline_scripts=None, source="<text>", warnings=None):
    """Parse a script text; warnings (unknown variables...) are appended to `warnings` if given."""
    p = Parser(variables, inline_scripts)
    block = p.parse(text, source)
    if warnings is not None:
        warnings.extend(p.warnings)
    return block


def format_value(value, indent=0, inline=False):
    if isinstance(value, Block):
        if not value.entries:
            return "{ }"
        if inline or all(k is None and not isinstance(v, Block) for k, _, v in value.entries):
            return "{ " + to_text(value, inline=True) + " }"
        return "{\n" + to_text(value, indent + 1) + "\n" + "\t" * indent + "}"
    if isinstance(value, Color):
        return value.space + " { " + " ".join(format_value(v) for v in value.values) + " }"
    if isinstance(value, Quoted):
        return '"' + value + '"'
    if value is True:
        return "yes"
    if value is False:
        return "no"
    if isinstance(value, float):
        return repr(value).rstrip("0").rstrip(".") if "e" not in repr(value) else repr(value)
    return str(value)


def to_text(block, indent=0, inline=False):
    """Re-print the statements of a block in Paradox syntax (conditions kept as text)."""
    parts = []
    for k, op, v in block.entries:
        val = format_value(v, indent, inline)
        parts.append(val if k is None else f"{k} {op} {val}")
    if inline:
        return " ".join(parts)
    return "\n".join("\t" * indent + p for p in parts)
