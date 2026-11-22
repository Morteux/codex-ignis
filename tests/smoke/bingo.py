"""Bingo QA: every bingo of BINGOS, layouts, marking, languages, missing icons, PNG download (P22.2, P24.1)."""
import os, tempfile
from smoke.common import check, ROOT

# Icons of authorities/ exported from the game (T2524) that are not bingo cells yet (T2406).
PENDING_AUTH_ICONS = {f"Auth_cyber_dictatorial_collectivist_{c}.png" for c in ("commander", "official", "scientist", "vacant")}

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
    sizes = await bingo.evaluate("async()=>{const m=await import('./js/bingo-items.js');return [m.ORIGIN_BINGO.length,m.PRINCIPLE_BINGO.length,m.ORIGIN_BINGO.map(e=>e.i18nKey).concat(m.PRINCIPLE_BINGO.map(e=>e.i18nKey))]}")
    # P24.1: generic engine — the selector lists every bingo of BINGOS, each one with its data
    bingos = await bingo.evaluate("async()=>(await import('./js/bingo-data.js')).BINGOS.map(b=>({id:b.id,layout:b.layout.type,n:b.items.length,size:b.iconSize,keys:b.items.every(i=>i.i18nKey&&(i.img===null||typeof i.img==='string'))}))")
    options = await bingo.evaluate("()=>[...document.querySelectorAll('#bingo-type option')].map(o=>[o.value,o.textContent])")
    check("bingo: the selector lists every bingo of BINGOS, named", [o[0] for o in options] == [b["id"] for b in bingos] and all(o[1] and not o[1].startswith("bingoType") for o in options) and all(b["keys"] and b["size"] > 0 and b["layout"] in ("grid", "ordered", "shape") for b in bingos), (options, bingos))
    first = await bingo.evaluate("()=>[getComputedStyle(document.querySelector('#bingo-grid')).getPropertyValue('--bingo-cell'),document.querySelector('#bingo-grid .bingo-card').getBoundingClientRect().width,document.querySelector('#bingo-description').textContent]")
    check("bingo: origins keep their cell size (iconSize 110) and show a description", first[0].strip() == "110px" and 110 <= first[1] < 200 and first[2], first)
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
    small = await bingo.evaluate("()=>[document.querySelector('#bingo-grid').classList.contains('bingo-grid--compact'),document.querySelector('#bingo-grid .bingo-card').getBoundingClientRect().width,!!document.querySelector('#bingo-grid .bingo-card-title--visible'),document.querySelectorAll('#bingo-grid .bingo-card[data-tags~=hive]').length]")
    check("bingo: principles keep their small cells, names as tooltip only, tags on the cards", small[0] and 58 <= small[1] < 110 and not small[2] and small[3] > 10, small)
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
    # P24.3: ethics bingo on the in-game wheel (fanatic ethics on the outer ring, gestalt in the centre)
    await bingo.select_option("#bingo-type", "ethics")
    ethics = await bingo.evaluate("()=>{const g=document.querySelector('#bingo-grid').getBoundingClientRect();return [...document.querySelectorAll('#bingo-grid .bingo-card')].map(c=>{const r=c.getBoundingClientRect();return {name:c.getAttribute('aria-label'),row:+c.style.gridRow,col:+c.style.gridColumn,fanatic:(c.dataset.tags||'').includes('fanatic'),gestalt:(c.dataset.tags||'')==='gestalt',img:c.querySelector('img').src,cx:Math.round(r.left+r.width/2-g.left-g.width/2),visible:!!c.querySelector('.bingo-card-title--visible')}})}")
    centre = [e for e in ethics if e["gestalt"]]
    check("bingo: ethics bingo has the 17 ethics, named, with their ethics/ icons", len(ethics) == 17 and all(e["name"] and not e["name"].startswith("ethic") and "/ethics/" in e["img"] and e["visible"] for e in ethics), ethics[:2])
    check("bingo: ethics wheel — fanatic ethics on the outer ring, moderate inside, gestalt centred", len(centre) == 1 and (centre[0]["row"], centre[0]["col"]) == (3, 3) and abs(centre[0]["cx"]) <= 2
          and all((e["row"] in (1, 5) or e["col"] in (1, 5)) == e["fanatic"] for e in ethics) and len({(e["row"], e["col"]) for e in ethics}) == 17, centre)
    await bingo.click("#bingo-grid .bingo-card[data-tags=gestalt]")
    async with bingo.expect_download() as dl_info:
        await bingo.click("#bingo-download")
    dl = await dl_info.value
    path = os.path.join(tempfile.gettempdir(), dl.suggested_filename)
    await dl.save_as(path)
    head = open(path, "rb").read(24)
    check("bingo: PNG download of the ethics wheel (5 columns)", head[:8] == b"\x89PNG\r\n\x1a\n" and int.from_bytes(head[16:20], "big") == (24 * 2 + 5 * 150) * 2 and dl.suggested_filename == "bingo-eticas-stellaris.png", dl.suggested_filename)
    os.remove(path)
    # P24.4: authorities bingo, one cell per icon of authorities/, base authorities first
    await bingo.select_option("#bingo-type", "authorities")
    auths = await bingo.evaluate("()=>[...document.querySelectorAll('#bingo-grid .bingo-card')].map(c=>[c.getAttribute('aria-label'),c.querySelector('img').src.split('/').pop(),c.dataset.tags||''])")
    tree_icons = sorted(set(l.strip(" │├└─\n") for l in open(os.path.join(ROOT, "StellarisAssetsFileTree.txt"), encoding="utf-8") if "Auth_" in l) - PENDING_AUTH_ICONS)
    names = [a[0] for a in auths]
    check("bingo: authorities bingo has one cell per icon of authorities/ (75), each with its own name", len(auths) == 75 and sorted(a[1] for a in auths) == tree_icons and len(set(names)) == 75
          and not any("undefined" in n or n.startswith("authority") for n in names), (len(auths), names[:3]))
    check("bingo: authorities start with the 10 base ones, then the ascension variants named '<authority> (<variant>)'",
          auths[0][1] == "Auth_democratic.png" and all("(" not in n for n in names[:10]) and all(n.endswith(")") and a[2] for n, a in zip(names[10:], auths[10:])) and names[10].startswith(names[0] + " ("), names[:12])
    await bingo.click("#bingo-grid .bingo-card >> nth=10")
    await bingo.select_option("#bingo-type", "ethics")
    await bingo.select_option("#bingo-type", "authorities")
    check("bingo: a variant cell is marked on its own (not its base authority)", await bingo.evaluate("()=>[...document.querySelectorAll('#bingo-grid .bingo-card')].map((c,i)=>c.classList.contains('is-marked')?i:-1).filter(i=>i>=0)") == [10])
    # P24.1: a "shape" bingo with an item without image (test-only entry added to BINGOS)
    await bingo.evaluate("async()=>{const m=await import('./js/bingo-data.js');m.BINGOS.push({id:'smokeShape',titleKey:'bingoTypeOrigins',fileSlug:'smoke',iconSize:70,showNames:false,layout:{type:'shape',rows:3,columns:3,cells:{originDefault:[1,1],originRemnants:[2,2],originTree:[3,3]}},items:[{img:'origins/GFX_origin_remnants.png',i18nKey:'originRemnants'},{img:null,i18nKey:'originTree'},{img:'origins/GFX_origin_scion.png',i18nKey:'originScion'}]})}")
    await bingo.click(".lang-btn[data-lang=es]")
    await bingo.click(".lang-btn[data-lang=en]")
    await bingo.select_option("#bingo-type", "smokeShape")
    shape = await bingo.evaluate("()=>[...document.querySelectorAll('#bingo-grid .bingo-card')].map(c=>{const r=c.getBoundingClientRect();return [c.style.gridRow,c.style.gridColumn,!!c.querySelector('.bingo-card-slot'),c.classList.contains('is-image-missing'),Math.round(r.width),Math.round(r.left),Math.round(r.top)]})")
    check("bingo: shape layout places each cell at its row/column (unplaced items hidden)", len(shape) == 2 and shape[0][:2] == ["2", "2"] and shape[1][:2] == ["3", "3"] and shape[1][5] > shape[0][5] and shape[1][6] > shape[0][6], shape)
    check("bingo: an item without image keeps an empty slot of the same size", shape[1][2] and shape[1][3] and not shape[0][2] and abs(shape[0][4] - shape[1][4]) <= 1, shape)
    await bingo.click("#bingo-grid .bingo-card >> nth=1")
    async with bingo.expect_download() as dl_info:
        await bingo.click("#bingo-download")
    dl = await dl_info.value
    path = os.path.join(tempfile.gettempdir(), dl.suggested_filename)
    await dl.save_as(path)
    head = open(path, "rb").read(24)
    width = int.from_bytes(head[16:20], "big")
    check("bingo: PNG download of a shape bingo uses its own columns", head[:8] == b"\x89PNG\r\n\x1a\n" and width == (24 * 2 + 3 * 150) * 2 and dl.suggested_filename == "bingo-smoke-stellaris.png", (dl.suggested_filename, width))
    os.remove(path)
    await bingo.select_option("#bingo-type", "origins")
    check("bingo: leaving a shape bingo restores the flowing grid", await bingo.evaluate("()=>!document.querySelector('#bingo-grid').classList.contains('bingo-grid--shape')&&!document.querySelector('#bingo-grid .bingo-card').style.gridRow"))
    await bingo.reload()
    await bingo.wait_for_timeout(300)
    check("bingo: after a reload the grid matches the selected type", len(await bingo.evaluate(cards_js)) == (sizes[1] if await bingo.evaluate("()=>document.querySelector('#bingo-type').value") == "principles" else sizes[0]))
    check("bingo: no page errors", not bingo_errors, bingo_errors)
    check("bingo: no local resource failed to load", not bingo_missing, bingo_missing)
    await bingo.close()
