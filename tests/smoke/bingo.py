"""Bingo QA: both bingos, marking, languages, missing icons, PNG download (P22.2)."""
import os, tempfile
from smoke.common import check, ROOT


async def run(t):
    ctx = t.ctx
    # P22.2: bingo QA — both bingos, marking, languages, missing icons, PNG download
    bingo = await ctx.new_page()
    bingo_errors, bingo_missing = [], []
    bingo.on("pageerror", lambda e: bingo_errors.append(str(e)))
    bingo.on("requestfailed", lambda r: r.url.startswith("file:") and bingo_missing.append(r.url))
    icon_png = open(os.path.join(ROOT, "img", "ui", "Icon_pop.png"), "rb").read()

    async def fake_assets(route):  # remote icons served with CORS (like GitHub Pages); one of them missing
        if route.request.url.endswith("GFX_origin_default.png"):
            await route.fulfill(status=404, body="")
        else:
            await route.fulfill(status=200, body=icon_png, headers={"Content-Type": "image/png", "Access-Control-Allow-Origin": "*"})
    await bingo.route("https://morteux.github.io/**", fake_assets)
    await bingo.goto("file://" + ROOT + "/bingo.html")
    await bingo.wait_for_timeout(400)
    await bingo.click(".lang-btn[data-lang=en]")
    sizes = await bingo.evaluate("async()=>{const m=await import('./js/bingo-data.js');return [m.ORIGIN_BINGO.length,m.PRINCIPLE_BINGO.length,m.ORIGIN_BINGO.map(e=>e.i18nKey).concat(m.PRINCIPLE_BINGO.map(e=>e.i18nKey))]}")
    cards_js = "()=>[...document.querySelectorAll('#bingo-grid .bingo-card')].map(c=>[c.getAttribute('aria-label'),c.getAttribute('aria-pressed'),c.classList.contains('is-marked'),c.querySelector('img').crossOrigin])"
    origins = await bingo.evaluate(cards_js)
    check("bingo: origins grid has one card per origin, named, CORS icons", len(origins) == sizes[0] and all(c[0] and c[0] not in sizes[2] and c[3] == "anonymous" for c in origins), (len(origins), origins[:3]))
    await bingo.click("#bingo-grid .bingo-card >> nth=1")
    await bingo.click("#bingo-grid .bingo-card >> nth=3")
    await bingo.click("#bingo-grid .bingo-card >> nth=3")
    marked = [i for i, c in enumerate(await bingo.evaluate(cards_js)) if c[2]]
    check("bingo: clicking marks a card, clicking again unmarks it (aria-pressed follows)", marked == [1] and (await bingo.evaluate(cards_js))[1][1] == "true", marked)
    await bingo.select_option("#bingo-type", "principles")
    principles = await bingo.evaluate(cards_js)
    check("bingo: principles grid has one card per principle, named", len(principles) == sizes[1] and all(c[0] and c[0] not in sizes[2] for c in principles) and not any(c[2] for c in principles), len(principles))
    await bingo.click("#bingo-grid .bingo-card >> nth=0")
    await bingo.select_option("#bingo-type", "origins")
    await bingo.click(".lang-btn[data-lang=jp]")
    jp_cards = await bingo.evaluate(cards_js)
    check("bingo: marks survive type and language switches", [i for i, c in enumerate(jp_cards) if c[2]] == [1] and jp_cards[1][1] == "true", [i for i, c in enumerate(jp_cards) if c[2]])
    check("bingo: names and <html lang> follow the language", await bingo.evaluate("()=>document.documentElement.lang") == "ja" and jp_cards[1][0] != origins[1][0] and await bingo.evaluate("()=>document.querySelector('#bingo-download').textContent") == "画像としてダウンロード", (jp_cards[1][0], origins[1][0]))
    await bingo.click(".lang-btn[data-lang=en]")
    await bingo.wait_for_timeout(300)
    missing_icon = await bingo.evaluate("()=>[...document.querySelectorAll('#bingo-grid .bingo-card.is-image-missing')].map(c=>c.getAttribute('aria-label'))")
    check("bingo: a missing icon is flagged on its card (only that one)", len(missing_icon) == 1, missing_icon)
    for kind in ("origins", "principles"):
        await bingo.select_option("#bingo-type", kind)
        async with bingo.expect_download() as dl_info:
            await bingo.click("#bingo-download")
        dl = await dl_info.value
        path = os.path.join(tempfile.gettempdir(), dl.suggested_filename)
        await dl.save_as(path)
        head = open(path, "rb").read(24)
        width, height = int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")
        status = await bingo.evaluate("()=>document.querySelector('#bingo-download-status').textContent")
        check("bingo: PNG download of " + kind + " (valid PNG, 9 columns, no error)", head[:8] == b"\x89PNG\r\n\x1a\n" and width == (24 * 2 + 9 * 150) * 2 and height > 0 and not status and dl.suggested_filename == "bingo-" + ("origenes" if kind == "origins" else "principios") + "-stellaris.png", (dl.suggested_filename, width, height, status))
        os.remove(path)
    await bingo.reload()
    await bingo.wait_for_timeout(300)
    check("bingo: after a reload the grid matches the selected type", len(await bingo.evaluate(cards_js)) == (sizes[1] if await bingo.evaluate("()=>document.querySelector('#bingo-type').value") == "principles" else sizes[0]))
    check("bingo: no page errors", not bingo_errors, bingo_errors)
    check("bingo: no local resource failed to load", not bingo_missing, bingo_missing)
    await bingo.close()
