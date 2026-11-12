#!/usr/bin/env python3
"""
wiki_to_md.py - Convert saved MediaWiki pages (e.g. Stellaris Wiki "Save page as...")
into clean Markdown, keeping only the article content, for use as LLM context.

What is removed: site chrome (menus, sidebars, footer), table of contents, edit links,
collapsible toggles, navigation boxes, scripts/styles, images (icons are turned into
short text labels only when they carry information not present in the surrounding text).

What is kept: headings, paragraphs, lists, definition lists, tables (rowspan/colspan
expanded, nested tables extracted below their parent), DLC/notice boxes, tooltips
(inlined in parentheses), tabbed panels, math (as TeX), references.

Usage:
    python wiki_to_md.py                       # defaults (see --help)
    python wiki_to_md.py "path/to/wiki" -o "path/to/output" --combined
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    from bs4 import BeautifulSoup, Comment, NavigableString, Tag
except ImportError:  # pragma: no cover
    sys.exit("Missing dependency: run  pip install beautifulsoup4  (lxml optional, faster)")

try:
    import lxml  # noqa: F401
    PARSER = "lxml"
except ImportError:
    PARSER = "html.parser"

# --------------------------------------------------------------------------- config

TITLE_SUFFIX_RE = re.compile(r"\s*[-–|]\s*[^-–|]*Wiki\s*$", re.I)
FILE_NAME_RE = re.compile(r"\.(png|jpe?g|gif|svg|webp)$", re.I)

REMOVE_SELECTORS = [
    "script", "style", "noscript", "link", "meta", "input", "label", "button",
    ".toc", "#toc", ".mw-editsection", ".mw-collapsible-toggle", ".stellaris-outliner",
    ".navbox", ".mw-cite-backlink", ".cite-accessibility-label", ".magnify",
    ".printfooter", ".catlinks", ".mw-empty-elt", ".noprint", ".mw-jump-link",
]
TOOLTIP_CLASSES = ("tooltip", "tooltip2", "tooltip3")
TOOLTIP_TEXT_RE = re.compile(r"^tooltiptext\d*$")
NOTICE_CLASSES = ("ambox", "mw-message-box", "mbox")

HEADINGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
BLOCK_TAGS = HEADINGS | {
    "p", "ul", "ol", "dl", "table", "blockquote", "pre", "hr", "div", "section",
    "article", "center", "header", "footer", "figure", "nav", "main", "aside",
}
# Elements that bound the "nearby text" search used to decide if an icon is redundant.
ICON_SCOPE = ["td", "th", "li", "p", "div", "caption", "dd", "dt", "h2", "h3", "h4", "h5"]

CELL_SEP = "; "


# --------------------------------------------------------------------------- helpers

def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.replace("\xa0", " ")).strip()


def has_class(tag: Tag, *names: str) -> bool:
    classes = tag.get("class") or []
    return any(n in classes for n in names)


def is_inside(node, ancestor: Tag) -> bool:
    return any(p is ancestor for p in node.parents)


def clean_inline(text: str, sep: str = "\n") -> str:
    """Normalise whitespace; internal line breaks become `sep`."""
    text = text.replace("\xa0", " ")
    lines = [re.sub(r"[ \t\r\f\v]+", " ", ln).strip() for ln in text.split("\n")]
    lines = [ln for ln in lines if ln and ln not in {";", ","}]
    out = sep.join(lines)
    out = re.sub(r"\(\s+", "(", out)
    out = re.sub(r"\s+([),.:;])", r"\1", out)
    out = re.sub(r";\s*;", ";", out)
    # Collapse repeated icon labels: "[X] [X] [X]" -> "[X] x3"
    out = re.sub(r"(\[[^\[\]]+\])(?:\s*\1)+",
                 lambda m: f"{m.group(1)} x{m.group(0).count(m.group(1))}", out)
    return out.strip()


def plain_caption(text: str) -> str:
    """Caption without markdown emphasis or icon labels."""
    text = re.sub(r"\[[^\[\]]+\]\s*(x\d+)?", "", text)
    return norm(text.replace("**", "").replace("*", " ").replace("`", ""))


def cell_text(text: str) -> str:
    return clean_inline(text, CELL_SEP).replace("|", "\\|")


# --------------------------------------------------------------------------- preprocessing

def icon_names(img: Tag) -> list[str]:
    names = []
    link = img.find_parent("a")
    if link is not None:
        href = link.get("href", "")
        if "#" in href:
            frag = href.split("#", 1)[1].replace("_", " ").strip()
            if frag:
                names.append(frag)
        if link.get("title"):
            names.append(link["title"])
    if img.get("title"):
        names.append(img["title"])
    alt = (img.get("alt") or "").strip()
    if alt:
        names.append(alt if not FILE_NAME_RE.search(alt) else FILE_NAME_RE.sub("", alt))
    return [norm(n) for n in names if norm(n)]


def following_text(img: Tag, limit: int = 80) -> str:
    scope = img.find_parent(ICON_SCOPE)
    out = []
    size = 0
    for el in img.next_elements:
        if isinstance(el, Tag) and el.name == "img":
            continue
        if isinstance(el, NavigableString) and not isinstance(el, Comment):
            if scope is not None and not is_inside(el, scope):
                break
            out.append(str(el))
            size += len(el.strip())
            if size >= limit:
                break
    return norm(" ".join(out)).lower()


def replace_images(root: Tag) -> None:
    """Drop decorative icons; keep a [label] when the icon carries unique information."""
    for img in list(root.find_all("img")):
        names = icon_names(img)
        link = img.find_parent("a")
        alt = (img.get("alt") or "").strip()
        meaningful = bool(
            (link is not None and (link.get("title") or "#" in link.get("href", "")))
            or img.get("title")
            or (alt and not FILE_NAME_RE.search(alt))
        )
        if not names or not meaningful or has_class(img, "thumbimage"):
            img.decompose()
            continue
        nearby = following_text(img)
        near_words = nearby.split()[:8]
        if any(n.lower() in nearby or _shares_word(n, near_words) for n in names):
            img.decompose()
            continue
        # Prefer the human title over the fragment for the label.
        label = (link.get("title") if link is not None and link.get("title") else None) \
            or img.get("title") or names[0]
        img.replace_with(NavigableString(f"[{norm(label)}] "))


def _shares_word(name: str, words: list[str]) -> bool:
    """True if a significant word of `name` (same 5-letter stem) appears in `words`."""
    for w in re.findall(r"[a-z]{4,}", name.lower()):
        stem = w[:5]
        if any(x.strip("()[];,.:*").startswith(stem) for x in words):
            return True
    return False


def remove_navboxes(root: Tag) -> None:
    """Remove navigation templates (e.g. the 'Game concepts' box): blocks full of '•' links."""
    for el in list(root.find_all(["div", "table"], recursive=False)):
        if el.get_text().count("•") >= 10:
            el.decompose()


def inline_math(root: Tag) -> None:
    for el in list(root.select(".mwe-math-element")):
        ann = el.find("annotation")
        tex = ann.get_text() if ann else el.get_text(" ")
        tex = tex.strip()
        m = re.fullmatch(r"\{\\displaystyle\s*(.*)\}", tex, re.S)
        if m:
            tex = m.group(1).strip()
        display = el.find(class_="mwe-math-mathml-display") is not None
        el.replace_with(NavigableString(f" $${tex}$$ " if display else f" ${tex}$ "))


def inline_tooltips(root: Tag, conv: "Converter") -> None:
    tips = [t for t in root.find_all(True) if has_class(t, *TOOLTIP_CLASSES)]
    for tip in reversed(tips):  # innermost first
        if tip.parent is None:
            continue
        body = tip.find(class_=TOOLTIP_TEXT_RE)
        if body is None:
            continue
        body.extract()
        extra = clean_inline(conv.inline(body), CELL_SEP)
        visible = norm(tip.get_text(" "))
        if extra and norm(extra).lower() != visible.lower():
            tip.append(NavigableString(f" ({extra})"))


def prepare_tabbers(root: Tag, soup: BeautifulSoup) -> None:
    for tabber in root.select(".tabber"):
        titles = {}
        for a in tabber.select(".tabber__tab"):
            key = a.get("aria-controls") or a.get("href", "").split("#")[-1]
            titles[key] = norm(a.get_text())
        for panel in tabber.select(".tabber__panel"):
            title = panel.get("data-mw-tabber-title") or titles.get(panel.get("id", ""), "")
            if title:
                p = soup.new_tag("p")
                b = soup.new_tag("b")
                b.string = f"Tab: {title}"
                p.append(b)
                panel.insert(0, p)
        for hdr in tabber.select(".tabber__header"):
            hdr.decompose()


def preprocess(root: Tag, soup: BeautifulSoup, conv: "Converter") -> None:
    for c in root.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()
    prepare_tabbers(root, soup)
    for sel in REMOVE_SELECTORS:
        for el in root.select(sel):
            el.decompose()
    for el in root.find_all(style=re.compile(r"visibility\s*:\s*hidden", re.I)):
        el.decompose()
    remove_navboxes(root)
    inline_math(root)
    replace_images(root)
    inline_tooltips(root, conv)


# --------------------------------------------------------------------------- converter

class Converter:
    def __init__(self) -> None:
        self._subtable_count = 0

    # ---- inline -----------------------------------------------------------
    def inline(self, node) -> str:
        if isinstance(node, Comment):
            return ""
        if isinstance(node, NavigableString):
            return str(node)
        if not isinstance(node, Tag):
            return ""
        name = node.name
        if name == "br":
            return "\n"
        if name in ("ul", "ol"):
            return "\n" + self.inline_list(node) + "\n"
        if name == "table":
            return "\n" + CELL_SEP.join(
                clean_inline(self.inline(tr), " ") for tr in node.find_all("tr")) + "\n"
        if name in ("td", "th"):
            return " " + "".join(self.inline(c) for c in node.children) + " "
        inner = "".join(self.inline(c) for c in node.children)
        if name in ("b", "strong"):
            return self._wrap(inner, "**")
        if name in ("i", "em"):
            return self._wrap(inner, "*")
        if name == "code":
            return self._wrap(inner, "`")
        if name in BLOCK_TAGS or name in ("li", "dt", "dd", "caption", "tr"):
            return "\n" + inner + "\n"
        return inner

    @staticmethod
    def _wrap(inner: str, mark: str) -> str:
        core = inner.strip()
        if not core or "\n" in core:
            return inner
        lead = inner[: len(inner) - len(inner.lstrip())]
        trail = inner[len(inner.rstrip()):]
        return f"{lead}{mark}{core}{mark}{trail}"

    def inline_list(self, lst: Tag) -> str:
        items = []
        for li in lst.find_all("li", recursive=False):
            main, subs = [], []
            for child in li.children:
                if isinstance(child, Tag) and child.name in ("ul", "ol"):
                    subs.append(self.inline_list(child))
                else:
                    main.append(self.inline(child))
            text = clean_inline("".join(main), " ")
            sub = CELL_SEP.join(s for s in subs if s)
            if sub:
                text = f"{text} ({sub})" if text else sub
            if text:
                items.append(text)
        return CELL_SEP.join(items)

    # ---- blocks -----------------------------------------------------------
    def blocks(self, node: Tag) -> list[str]:
        out: list[str] = []
        buf: list[str] = []

        def flush():
            text = clean_inline("".join(buf))
            buf.clear()
            if text:
                out.append(text)

        for child in node.children:
            if isinstance(child, Comment):
                continue
            if isinstance(child, NavigableString):
                buf.append(str(child))
                continue
            if not isinstance(child, Tag):
                continue
            name = child.name
            if name in HEADINGS:
                flush()
                text = clean_inline(self.inline(child), " ")
                if text:
                    out.append("#" * int(name[1]) + " " + text)
            elif name == "p":
                flush()
                text = clean_inline(self.inline(child))
                if text:
                    out.append(text)
            elif name in ("ul", "ol"):
                flush()
                text = self.block_list(child)
                if text:
                    out.append(text)
            elif name == "dl":
                flush()
                out.extend(self.block_dl(child))
            elif name == "table":
                flush()
                out.extend(self.table(child))
            elif name == "blockquote":
                flush()
                inner = "\n\n".join(self.blocks(child))
                if inner:
                    out.append("\n".join("> " + ln if ln else ">" for ln in inner.splitlines()))
            elif name == "pre":
                flush()
                out.append("```\n" + child.get_text().strip("\n") + "\n```")
            elif name == "hr":
                flush()
            elif has_class(child, "thumb") or name == "figure":
                flush()
                cap = child.find(class_="thumbcaption") or child.find("figcaption")
                text = clean_inline(self.inline(cap), " ") if cap else ""
                if text:
                    out.append(f"*Image: {text}*")
            elif has_class(child, *NOTICE_CLASSES):
                flush()
                out.extend(self.notice(child))
            elif name in BLOCK_TAGS or child.find(list(BLOCK_TAGS - {"div"})) is not None:
                flush()
                out.extend(self.blocks(child))
            else:
                buf.append(self.inline(child))
        flush()
        return out

    def block_list(self, lst: Tag, indent: int = 0) -> str:
        lines = []
        ordered = lst.name == "ol"
        for i, li in enumerate(lst.find_all("li", recursive=False), 1):
            main, subs = [], []
            for child in li.children:
                if isinstance(child, Tag) and child.name in ("ul", "ol"):
                    subs.append(self.block_list(child, indent + 2))
                elif isinstance(child, Tag) and child.name == "table":
                    subs.append("\n".join(" " * (indent + 2) + ln
                                          for b in self.table(child) for ln in b.splitlines()))
                else:
                    main.append(self.inline(child))
            text = clean_inline("".join(main), " ")
            marker = f"{i}." if ordered else "-"
            if text:
                lines.append(" " * indent + f"{marker} {text}")
            lines.extend(s for s in subs if s)
        return "\n".join(lines)

    def block_dl(self, dl: Tag) -> list[str]:
        out = []
        for el in dl.find_all(["dt", "dd"], recursive=False):
            text = clean_inline(self.inline(el), " ")
            if not text:
                continue
            out.append(f"**{text}**" if el.name == "dt" else text)
        return ["\n".join(out)] if out else []

    def notice(self, el: Tag) -> list[str]:
        body = el.find(class_="mbox-text") or el
        text = clean_inline(self.inline(body), " ")
        return [f"> **Note:** {text}"] if text else []

    # ---- tables -----------------------------------------------------------
    def table(self, table: Tag, caption_override: str | None = None) -> list[str]:
        if has_class(table, *NOTICE_CLASSES):
            return self.notice(table)

        rows = [tr for tr in table.find_all("tr") if tr.find_parent("table") is table]
        extras: list[str] = []

        # Extract nested tables; they are rendered after this one.
        nested = [t for t in table.find_all("table") if t.find_parent("table") is table]
        for k, sub in enumerate(nested, 1):
            cap_tag = sub.find("caption", recursive=False)
            cap = plain_caption(clean_inline(self.inline(cap_tag), " ")) if cap_tag else ""
            if not cap:
                self._subtable_count += 1
                cap = f"Sub-table {self._subtable_count}"
            if cap_tag:
                cap_tag.decompose()
            sub.replace_with(NavigableString(f" (see table: {cap}) "))
            extras.extend(self.table(sub, caption_override=cap))

        caption = caption_override
        if caption is None:
            cap_tag = table.find("caption", recursive=False)
            caption = plain_caption(clean_inline(self.inline(cap_tag), " ")) if cap_tag else ""

        grid: list[list[str]] = []
        header_flags: list[bool] = []
        spans: dict[tuple[int, int], str] = {}
        for r, tr in enumerate(rows):
            row: list[str] = []
            c = 0
            cells = tr.find_all(["td", "th"], recursive=False)
            for cell in cells:
                while (r, c) in spans:
                    row.append(spans.pop((r, c)))
                    c += 1
                text = cell_text(self.inline(cell))
                rs = _int(cell.get("rowspan"))
                cs = _int(cell.get("colspan"))
                for dc in range(cs):
                    row.append(text if dc == 0 else "")
                    for dr in range(1, rs):
                        spans[(r + dr, c + dc)] = text if dc == 0 else ""
                c += cs
            while (r, c) in spans:
                row.append(spans.pop((r, c)))
                c += 1
            if any(x.strip() for x in row):
                grid.append(row)
                header_flags.append(bool(cells) and all(x.name == "th" for x in cells))

        out: list[str] = []
        if caption:
            out.append(f"**{caption}**")
        if not grid:
            return out + extras if out and extras else extras

        width = max(len(r) for r in grid)
        grid = [r + [""] * (width - len(r)) for r in grid]
        keep = [j for j in range(width) if any(r[j].strip() for r in grid)]
        grid = [[r[j] for j in keep] for r in grid]
        width = len(keep)

        if width == 1:  # layout table: just paragraphs
            out.extend(r[0] for r in grid if r[0])
            return out + extras

        if header_flags[0]:
            header, body = grid[0], grid[1:]
        else:
            header, body = [f"Col {j + 1}" for j in range(width)], grid
        lines = ["| " + " | ".join(header) + " |", "|" + "---|" * width]
        lines += ["| " + " | ".join(r) + " |" for r in body]
        out.append("\n".join(lines))
        return out + extras


def _int(v) -> int:
    try:
        return max(1, min(int(str(v).strip().rstrip(";")), 200))
    except (TypeError, ValueError):
        return 1


# --------------------------------------------------------------------------- page

def page_title(soup: BeautifulSoup, path: Path) -> str:
    h = soup.select_one("#firstHeading")
    if h and norm(h.get_text()):
        return norm(h.get_text())
    if soup.title and soup.title.string:
        return TITLE_SUFFIX_RE.sub("", norm(soup.title.string))
    return TITLE_SUFFIX_RE.sub("", path.stem)


def page_url(soup: BeautifulSoup, raw: str) -> str:
    link = soup.find("link", rel="canonical")
    if link and link.get("href"):
        return link["href"]
    meta = soup.find("meta", property="og:url")
    if meta and meta.get("content"):
        return meta["content"]
    m = re.search(r"saved from url=\(\d+\)(\S+)", raw[:2000])
    return m.group(1).rstrip(" -->") if m else ""


def drop_empty_sections(blocks: list[str]) -> list[str]:
    """Remove headings that have no content before the next heading of same/higher level."""
    def level(b: str) -> int:
        m = re.match(r"(#{1,6}) ", b)
        return len(m.group(1)) if m else 0

    result = []
    for i, b in enumerate(blocks):
        lv = level(b)
        if lv:
            nxt = next((blocks[j] for j in range(i + 1, len(blocks))), None)
            if nxt is None or (level(nxt) and level(nxt) <= lv):
                continue
        result.append(b)
    return result


def convert_file(path: Path) -> tuple[str, str]:
    raw = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(raw, PARSER)
    title = page_title(soup, path)
    url = page_url(soup, raw)
    root = (soup.select_one("#mw-content-text .mw-parser-output")
            or soup.select_one("#mw-content-text")
            or soup.select_one("#bodyContent")
            or soup.body or soup)
    conv = Converter()
    preprocess(root, soup, conv)
    blocks = drop_empty_sections(conv.blocks(root))
    head = f"# {title}\n\n" + (f"Source: {url}\n\n" if url else "")
    md = head + "\n\n".join(blocks) + "\n"
    md = re.sub(r"\n{3,}", "\n\n", md)
    return title, md


def safe_name(title: str) -> str:
    return re.sub(r'[<>:"/\\|?*]+', "_", title).strip(" .") or "page"


# --------------------------------------------------------------------------- cli

def main(argv=None) -> int:
    here = Path(__file__).resolve().parent
    default_in = here.parents[1] / "Codex Ignis Wiki"
    ap = argparse.ArgumentParser(description="Convert saved wiki HTML pages to clean Markdown.")
    ap.add_argument("input", nargs="?", type=Path, default=default_in,
                    help=f"Folder with .html pages (default: {default_in})")
    ap.add_argument("-o", "--output", type=Path, default=None,
                    help="Output folder (default: <input>/markdown)")
    ap.add_argument("--combined", nargs="?", const="wiki_all.md", default=None, metavar="FILE",
                    help="Also write all pages into one file inside the output folder "
                         "(default name: wiki_all.md)")
    args = ap.parse_args(argv)

    src: Path = args.input.resolve()
    dst: Path = (args.output or src / "markdown").resolve()
    if not src.is_dir():
        print(f"Input folder not found: {src}", file=sys.stderr)
        return 1

    files = sorted(
        p for p in src.rglob("*.htm*")
        if dst not in p.parents and not any(part.endswith("_files") for part in p.parts)
    )
    if not files:
        print(f"No .html files found in {src}", file=sys.stderr)
        return 1

    index, combined, errors = [], [], 0
    for p in files:
        rel_dir = p.parent.relative_to(src)
        try:
            title, md = convert_file(p)
        except Exception as exc:  # keep going on bad pages
            errors += 1
            print(f"  ERROR {p.name}: {exc}", file=sys.stderr)
            continue
        out_path = dst / rel_dir / f"{safe_name(title)}.md"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(md, encoding="utf-8", newline="\n")
        rel = out_path.relative_to(dst).as_posix()
        index.append((rel_dir.as_posix(), title, rel, len(md)))
        if args.combined:
            combined.append(md)
        print(f"  {p.stat().st_size // 1024:>6} KB -> {len(md) // 1024:>5} KB  {rel}")

    lines = ["# Wiki index", ""]
    current = None
    for group, title, rel, size in index:
        if group != current:
            current = group
            if group not in ("", "."):
                lines += ["", f"## {group}", ""]
        lines.append(f"- [{title}]({rel.replace(' ', '%20')}) ({size // 1024} KB)")
    (dst / "index.md").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

    if args.combined:
        (dst / args.combined).write_text("\n\n---\n\n".join(combined), encoding="utf-8", newline="\n")

    print(f"\nDone: {len(index)} pages -> {dst}" + (f" ({errors} errors)" if errors else ""))
    return 0 if not errors else 2


if __name__ == "__main__":
    sys.exit(main())
