"""Testellaris game page (section 42, testellaris.html): start screen and DLC filter."""
import json, os
from smoke.common import check, ROOT

RULESET = "stellaris-pc-4.5.4"
PAGE = "file://" + ROOT + "/testellaris.html"


def load_bank():
    with open(os.path.join(ROOT, "data", "testellaris", RULESET, "questions.json"), encoding="utf-8") as f:
        return json.load(f)["questions"]


async def open_page(ctx, errors):
    pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.goto(PAGE)
    await pg.wait_for_function("()=>/\\d/.test(document.querySelector('#tq-available').textContent)", timeout=15000)
    return pg


async def run(t):
    bank = load_bank()
    per_tier = lambda qs: [sum(1 for q in qs if q["tier"] == tier) for tier in range(1, 6)]
    base = [q for q in bank if not q["dlc"]]
    errors = []

    ctx = await t.browser.new_context(locale="en-US")
    if os.environ.get("BLOCK_REMOTE"): await ctx.route("https://**/*", lambda r: r.abort())
    # T4201: linked from the home page; start screen with the DLC filter
    home = await ctx.new_page()
    await home.goto("file://" + ROOT + "/index.html")
    link = await home.evaluate("()=>[...document.querySelectorAll('.primary-nav a')].map(a=>a.getAttribute('href'))")
    check("testellaris: the home page links to testellaris.html", "testellaris.html" in link, link)
    await home.close()
    pg = await open_page(ctx, errors)
    start = await pg.evaluate("""()=>({title:document.title,current:document.querySelector('.primary-nav a[aria-current=page]')?.getAttribute('href'),
        groups:[...document.querySelectorAll('.tq-dlc-group-title')].map(h=>h.textContent),
        boxes:[...document.querySelectorAll('#tq-dlc-groups input[type=checkbox]')].map(b=>[b.value,b.checked]),
        available:document.querySelector('#tq-available').textContent,few:document.querySelector('#tq-few').hidden,
        start:!document.querySelector('#tq-start-btn').disabled})""")
    dlc_names = sorted({d for q in bank for d in q["dlc"]})
    names = [b[0] for b in start["boxes"]]
    check("testellaris: start screen with the shell, 3 DLC groups and 26 gameplay DLCs, all checked by default",
          start["title"] == "Testellaris · Codex Ignis" and start["current"] == "testellaris.html" and start["groups"] == ["Expansions", "Story packs", "Species packs"]
          and len(names) == 26 and all(b[1] for b in start["boxes"]) and set(dlc_names) <= set(names), {k: start[k] for k in ("title", "current", "groups")} | {"n": len(names), "missing": sorted(set(dlc_names) - set(names))})
    check("testellaris: with every DLC the whole bank is available (count per tier), no warning, Start enabled",
          ("%d (per tier: %s)" % (len(bank), " / ".join(map(str, per_tier(bank))))) in start["available"] and start["few"] and start["start"], start["available"])
    await pg.click("#tq-dlc-none")
    none = await pg.evaluate("()=>[document.querySelector('#tq-available').textContent,document.querySelector('#tq-few').hidden,[...document.querySelectorAll('#tq-dlc-groups input')].some(b=>b.checked)]")
    check("testellaris: None leaves only the base game questions", ("%d (per tier: %s)" % (len(base), " / ".join(map(str, per_tier(base))))) in none[0] and none[1] and not none[2], none)
    await pg.check("#tq-dlc-groups input[value='Overlord']")
    overlord = [q for q in bank if all(d == "Overlord" for d in q["dlc"])]
    one = await pg.evaluate("()=>document.querySelector('#tq-available').textContent")
    check("testellaris: a question counts only when every DLC of its list is checked", ("%d (per tier" % len(overlord)) in one, (one, len(overlord)))
    await pg.reload()
    await pg.wait_for_function("()=>/\\d/.test(document.querySelector('#tq-available').textContent)", timeout=15000)
    kept = await pg.evaluate("()=>[...document.querySelectorAll('#tq-dlc-groups input:checked')].map(b=>b.value)")
    check("testellaris: the DLC choice is remembered in localStorage", kept == ["Overlord"], kept)
    # the warning for tiers with fewer than 20 questions (GDD §4), shown with a filter that leaves few
    few = await pg.evaluate("""()=>{const m=document.querySelector('#tq-few');return [m.hidden,m.textContent]}""")
    low = [str(i + 1) for i, n in enumerate(per_tier(base + [q for q in overlord if q["dlc"]])) if n < 20]
    check("testellaris: the start screen warns about the tiers left with fewer than 20 questions", (not low and few[0]) or (low and not few[0] and ", ".join(low) in few[1]), (few, low))
    await pg.click("#tq-dlc-all")
    await pg.click(".lang-btn[data-lang=jp]")
    jp = await pg.evaluate("()=>[document.documentElement.lang,document.querySelector('.tq-dlc-group-title').textContent,document.querySelector('#tq-available').textContent]")
    check("testellaris: the start screen follows the language (jp)", jp[0] == "ja" and jp[1] == "拡張パック" and str(len(bank)) in jp[2], jp)
    await pg.click(".lang-btn[data-lang=en]")
    check("testellaris: no page errors", not errors, errors[:3])
    await ctx.close()
