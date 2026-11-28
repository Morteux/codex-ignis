"""Localisation reader (GAME_FILES_EXTRACTOR.md §5).

localisation/<language>/**/*_l_<language>.yml: UTF-8 with BOM, a `l_<language>:` header, then
`key:0 "text"` lines. Files under a `replace/` folder override the others; otherwise a later file
(path order) overrides an earlier one. `$key$` references are resolved on read; colour codes
(`§Y...§!`) and icon markers (`£energy£`) are kept (plain() strips them).

Scripted localisation (`[GetCulturalEnvoyNamePlural]`, `[Root.GetIndividualNamePlural]`): the
`defined_text` functions of common/scripted_loc pick a text by triggers that only the game can
evaluate, so the reader uses their `default` text. The ideology of the Willpower buildings
(`[owner.ideology.GetEthicNoun]`, `[owner.ideology.GetName]`, blank default) becomes the generic
word of the game (`IDEOLOGY`, "Ideology"). Engine functions (`[From.GetName]`) stay as written.
"""
import os, re

LANGUAGES = ("english", "braz_por", "french", "german", "japanese", "korean", "polish", "russian", "simp_chinese", "spanish")

_LINE = re.compile(r'^\s*([^\s:#"]+):(\d*)\s*"(.*)"\s*(?:#[^"]*)?$')
_HEADER = re.compile(r"^\s*l_(\w+)\s*:\s*(#.*)?$")
_REF = re.compile(r"\$([A-Za-z0-9_.\-']+)(\|[^$]*)?\$")
_COLOUR = re.compile(r"§[^!]|§!")
_ICON = re.compile(r"£[^£\s]+£")
_SCRIPTED = re.compile(r"\[([A-Za-z0-9_?]+(?:\.[A-Za-z0-9_?]+)*)\]")
IDEOLOGY_FUNCTIONS = {"GetName", "GetEthicNoun", "GetEthicNounLower", "GetAdj", "GetEthicAdj", "GetEthicAdjLower"}


def parse_yml(text):
    """(language, {key: text}) of one localisation file."""
    if text.startswith("﻿"):
        text = text[1:]
    language, out = None, {}
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        h = _HEADER.match(line)
        if h and language is None:
            language = h.group(1)
            continue
        m = _LINE.match(line)
        if m:
            out[m.group(1)] = m.group(3)
    return language, out


def plain(text):
    """Text without colour codes and icon markers (for comparisons)."""
    if text is None:
        return None
    return re.sub(r"\s{2,}", " ", _ICON.sub("", _COLOUR.sub("", text))).strip()


def scripted_defaults(definitions):
    """{defined_text name: default localisation key} of parsed common/scripted_loc entries
    ((key, value) pairs; only `defined_text` blocks, or their `define_text` spelling, with a `default`)."""
    out = {}
    for key, block in definitions:
        if key not in ("defined_text", "define_text") or not hasattr(block, "get"):
            continue
        name, default = block.get("name"), block.get("default")
        if name is not None and default is not None:
            out[str(name)] = str(default)
    return out


class Localisation:
    def __init__(self, root, scripted=None):
        """`scripted`: {defined_text name: default key}, or a callable returning it (loaded once)."""
        self.root = os.path.join(root, "localisation") if os.path.isdir(os.path.join(root, "localisation")) else root
        self._langs = {}
        self._scripted = scripted

    @property
    def scripted(self):
        if callable(self._scripted):
            self._scripted = self._scripted()
        return self._scripted or {}

    def languages(self):
        """Language folders found (every game language)."""
        return [d for d in sorted(os.listdir(self.root)) if os.path.isdir(os.path.join(self.root, d))]

    def files(self, language):
        base = os.path.join(self.root, language)
        suffix = f"_l_{language}.yml"
        found = []
        for d, _, names in os.walk(base):
            for n in names:
                if n.lower().endswith(suffix):
                    p = os.path.join(d, n).replace("\\", "/")
                    rel = os.path.relpath(p, base).replace("\\", "/").lower()
                    found.append(("replace" in rel.split("/")[:-1], rel, p))
        return [p for _, _, p in sorted(found)]  # normal files first, replace/ last

    def language(self, language):
        """{key: raw text} of one language (loaded once)."""
        if language not in self._langs:
            table = {}
            for f in self.files(language):
                with open(f, encoding="utf-8-sig", errors="replace") as fh:
                    table.update(parse_yml(fh.read())[1])
            self._langs[language] = table
        return self._langs[language]

    def raw(self, key, language="english"):
        return self.language(language).get(key)

    def get(self, key, language="english", default=None):
        """Text of a key with its $key$ references resolved, or default."""
        text = self.language(language).get(key)
        return default if text is None else self.resolve(text, language, (key,))

    def first(self, keys, language="english"):
        """Text of the first key that exists."""
        for k in keys:
            if k and k in self.language(language):
                return self.get(k, language)
        return None

    def resolve(self, text, language="english", stack=()):
        table = self.language(language)

        def repl(m):
            key = m.group(1)
            if key in table and key not in stack and len(stack) < 30:
                return self.resolve(table[key], language, stack + (key,))
            return m.group(0)
        return self.resolve_scripted(_REF.sub(repl, text), language, stack)

    def resolve_scripted(self, text, language="english", stack=()):
        """`[scope.Function]` of scripted localisation replaced by its default text (module doc)."""
        if "[" not in text:
            return text
        table, scripted = self.language(language), self.scripted

        def repl(m):
            parts = [p.rstrip("?") for p in m.group(1).split(".")]
            function = parts[-1]
            if function in IDEOLOGY_FUNCTIONS and any(p.lower() == "ideology" for p in parts[:-1]):
                word = self.get("IDEOLOGY", language) or ""
                if word:
                    return word.lower() if function.endswith("Lower") and language not in ("german",) else word
            key = scripted.get(function)
            if key and key in table and key not in stack and len(stack) < 30:
                value = self.resolve(table[key], language, stack + (key,))
                if value.strip():
                    return value
            return m.group(0)
        return _SCRIPTED.sub(repl, text)
