# parser wiki

Converts the saved wiki pages in `Codex Ignis Wiki` (HTML from "Save page as…") into clean
Markdown with only the article content, ready to be used as AI context.

## Requirements

- Python 3.9+
- `pip install -r requirements.txt` (`lxml` is optional, it only makes parsing faster)

## Usage

Double-click `run.bat`, or from a terminal:

```
python wiki_to_md.py                                  # default paths
python wiki_to_md.py "C:\path\to\wiki" -o "C:\path\to\out"
python wiki_to_md.py --combined                       # also writes wiki_all.md (all pages in one file)
```

Defaults:

- Input: `..\..\Codex Ignis Wiki` (sibling folder of `Codex Ignis`), scanned recursively.
- Output: `<input>\markdown`, mirroring the subfolders (e.g. `markdown\v4-5-2\Jobs.md`),
  plus an `index.md` listing every page. `*_files` folders and the output folder are ignored.

## What the parser does

Removed: site chrome (menus, sidebars, footer), table of contents, edit links, "Expand"
toggles, version/navigation outliners, the "Game concepts" navigation box, scripts, styles
and images.

Kept / transformed:

- Headings, paragraphs, lists, definition lists, bold/italic.
- Tables as Markdown tables. `rowspan`/`colspan` are expanded so every row is
  self-contained; nested tables are moved right below their parent table and referenced
  as `(see table: <caption>)`.
- Icons: dropped when the text next to them already says the same thing; otherwise kept as
  a short label, e.g. `[Energy] 2`, `[Individualist] Stasis Warden`. Repeated icons are
  collapsed (`[Barb Cannons] x4`).
- Tooltips are inlined in parentheses.
- DLC notices become `> **Note:** Available only with the … DLC enabled.`
- Tabbed panels become `**Tab: <name>**` sections. Math is kept as TeX (`$…$`).
- Each file starts with `# <Title>` and `Source: <original URL>`.

## Adding pages

Save new pages into `Codex Ignis Wiki` (any subfolder) and run the script again; it
overwrites the generated Markdown.
