"""Bingo QA: every bingo of BINGOS, layouts, marking, languages, missing icons, PNG download (P22.2, P24.1)."""
import json, os, subprocess, sys, tempfile
from playwright.async_api import TimeoutError as PlaywrightTimeout
from smoke.common import check, ROOT

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

# Diagnostics of a download that never came: icons still loading, button state, status text.
DOWNLOAD_STATE_JS = "()=>({pending:[...document.querySelectorAll('#bingo-grid img')].filter(i=>!i.complete).map(i=>i.src.split('/').pop()),disabled:document.querySelector('#bingo-download').disabled,status:document.querySelector('#bingo-download-status').textContent})"


async def download_png(page, name, timeout=30000):
    """Clicks #bingo-download and returns (first 24 bytes, file name, status text), or None after a
    FAIL check with diagnostics if no download comes (P22.13: never stop the whole suite)."""
    try:
        async with page.expect_download(timeout=timeout) as dl_info:
            await page.click("#bingo-download")
        dl = await dl_info.value
    except PlaywrightTimeout:
        check("bingo: " + name + " (no download within %d s)" % (timeout // 1000), False, await page.evaluate(DOWNLOAD_STATE_JS))
        return None
    path = os.path.join(tempfile.gettempdir(), dl.suggested_filename)
    await dl.save_as(path)
    with open(path, "rb") as f:
        head = f.read(24)
    os.remove(path)
    return head, dl.suggested_filename, await page.evaluate("()=>document.querySelector('#bingo-download-status').textContent")


def png_width(head):
    return int.from_bytes(head[16:20], "big")


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
    # T2402: origins in the in-game order, generated from the extractor's origins.json (T2511)
    order_file = os.path.join(ROOT, "js", "bingo-origin-order.js")
    fresh = os.path.join(tempfile.gettempdir(), "bingo-origin-order-smoke.js")
    build = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "extract", "build_origin_order.py"), "--out", fresh], capture_output=True, text=True)
    same = build.returncode == 0 and open(fresh, encoding="utf-8").read() == open(order_file, encoding="utf-8").read()
    if os.path.exists(fresh):
        os.remove(fresh)
    check("bingo: js/bingo-origin-order.js equals a fresh build from origins.json", same, build.stderr[-500:])
    game_order = await bingo.evaluate("""async()=>{const o=(await import('./js/bingo-origin-order.js')).ORIGIN_GAME_ORDER,items=(await import('./js/bingo-items.js')).ORIGIN_BINGO,
        b=(await import('./js/bingo-data.js')).BINGOS.find(x=>x.id==='origins');
        const sorted=[...items].sort((x,y)=>o.indexOf(x.origin)-o.indexOf(y.origin));
        const shown=[...document.querySelectorAll('#bingo-grid .bingo-card img')].map(i=>i.getAttribute('src').split('/').pop());
        return {missing:items.filter(i=>!o.includes(i.origin)).map(i=>i.i18nKey),dupes:items.length-new Set(items.map(i=>i.origin)).size,
          layout:b.layout.type,order:JSON.stringify(b.layout.order)===JSON.stringify(sorted.map(i=>i.i18nKey)),
          dom:JSON.stringify(shown)===JSON.stringify(sorted.map(i=>i.img.split('/').pop())),first:o.slice(0,3),n:o.length}}""")
    check("bingo: every origin cell names a game origin of origins.json, once", not game_order["missing"] and game_order["dupes"] == 0, game_order)
    check("bingo: origins use the ordered layout and are shown in the in-game order", game_order["layout"] == "ordered" and game_order["order"] and game_order["dom"] and game_order["first"] == ["origin_default", "origin_default_nomads", "origin_sacred_path"], game_order)
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
        name = "PNG download of " + kind + " (valid PNG, 9 columns, no error)"
        got = await download_png(bingo, name)
        if got:
            head, filename, status = got
            width, height = png_width(head), int.from_bytes(head[20:24], "big")
            check("bingo: " + name, head[:8] == PNG_SIGNATURE and width == (24 * 2 + 9 * 150) * 2 and height > 0 and not status and filename == "bingo-" + ("origenes" if kind == "origins" else "principios") + "-stellaris.png", (filename, width, height, status))
    # P24.3: ethics bingo on the in-game wheel (fanatic ethics on the outer ring, gestalt in the centre)
    await bingo.select_option("#bingo-type", "ethics")
    ethics = await bingo.evaluate("()=>{const g=document.querySelector('#bingo-grid').getBoundingClientRect();return [...document.querySelectorAll('#bingo-grid .bingo-card')].map(c=>{const r=c.getBoundingClientRect();return {name:c.getAttribute('aria-label'),row:+c.style.gridRow,col:+c.style.gridColumn,fanatic:(c.dataset.tags||'').includes('fanatic'),gestalt:(c.dataset.tags||'')==='gestalt',img:c.querySelector('img').src,cx:Math.round(r.left+r.width/2-g.left-g.width/2),visible:!!c.querySelector('.bingo-card-title--visible')}})}")
    centre = [e for e in ethics if e["gestalt"]]
    check("bingo: ethics bingo has the 17 ethics, named, with their ethics/ icons", len(ethics) == 17 and all(e["name"] and not e["name"].startswith("ethic") and "/ethics/" in e["img"] and e["visible"] for e in ethics), ethics[:2])
    check("bingo: ethics wheel — fanatic ethics on the outer ring, moderate inside, gestalt centred", len(centre) == 1 and (centre[0]["row"], centre[0]["col"]) == (3, 3) and abs(centre[0]["cx"]) <= 2
          and all((e["row"] in (1, 5) or e["col"] in (1, 5)) == e["fanatic"] for e in ethics) and len({(e["row"], e["col"]) for e in ethics}) == 17, centre)
    await bingo.click("#bingo-grid .bingo-card[data-tags=gestalt]")
    got = await download_png(bingo, "PNG download of the ethics wheel (5 columns)")
    if got:
        check("bingo: PNG download of the ethics wheel (5 columns)", got[0][:8] == PNG_SIGNATURE and png_width(got[0]) == (24 * 2 + 5 * 150) * 2 and got[1] == "bingo-eticas-stellaris.png", got[1])
    # P24.4: authorities bingo, one cell per icon of authorities/, base authorities first
    await bingo.select_option("#bingo-type", "authorities")
    auths = await bingo.evaluate("()=>[...document.querySelectorAll('#bingo-grid .bingo-card')].map(c=>[c.getAttribute('aria-label'),c.querySelector('img').src.split('/').pop(),c.dataset.tags||''])")
    tree_icons = sorted(set(l.strip(" │├└─\n") for l in open(os.path.join(ROOT, "StellarisAssetsFileTree.txt"), encoding="utf-8") if "Auth_" in l))
    names = [a[0] for a in auths]
    check("bingo: authorities bingo has one cell per icon of authorities/ (79), each with its own name", len(auths) == 79 and sorted(a[1] for a in auths) == tree_icons and len(set(names)) == 79
          and not any("undefined" in n or n.startswith("authority") for n in names), (len(auths), names[:3]))
    check("bingo: authorities start with the 10 base ones, then the ascension variants named '<variant> (<base authority>)'",
          auths[0][1] == "Auth_democratic.png" and all("(" not in n for n in names[:10]) and all(n.endswith(")") and a[2] for n, a in zip(names[10:], auths[10:])) and names[10].endswith(" (" + names[0] + ")"), names[:12])
    # T2405: each icon is the game authority "auth_<cell id>", and the names are the official ones
    generated = os.path.join(ROOT, "data", "generated", "stellaris-pc-4.5.4")
    game_auths = {}  # game id -> (icon file, base authority id)
    with open(os.path.join(generated, "authorities.json"), encoding="utf-8") as f:
        for item in json.load(f)["items"]:
            for entry in [item] + item["swaps"]:
                if item["id"] != "auth_ancient_machine_intelligence":
                    game_auths[entry["id"]] = (entry["icon"]["asset"], item["id"])
    cells = await bingo.evaluate("""async()=>{const b=(await import('./js/bingo-data.js')).BINGOS.find(x=>x.id==='authorities'),s=(await import('./js/i18n-bingo.js')).strings,n=(await import('./js/i18n-empire-names.js')).strings;
        return b.items.map(i=>({id:i.id,img:i.img,base:i.variantKey?n.en[i.variantKey]:null,
          names:Object.fromEntries(['es','en','jp'].map(l=>[l,s[l][i.i18nKey]??(i.id==='mutualistic_intelligence'?n[l][i.i18nKey]:null)]))}))}""")
    # The game splits this variant by ruler class (T2406); its own icon file is not in the game data.
    split = {"cyber_dictatorial_collectivist": "auth_cyber_dictatorial_collectivist_official"}
    game_id = lambda c: split.get(c["id"], "auth_" + c["id"])
    wrong_icons = [c["id"] for c in cells if c["id"] not in split and game_auths.get(game_id(c), ("",))[0] != c["img"]]
    check("bingo: each authority icon is the one of the game variant of its cell (authorities.json)", not wrong_icons, wrong_icons)
    official, wrong_names = {}, []
    for lang, language in (("es", "spanish"), ("en", "english"), ("jp", "japanese")):
        with open(os.path.join(generated, "localisation", language + ".json"), encoding="utf-8") as f:
            official[lang] = json.load(f)["sets"]["authorities"]
        # the other base cells share their names with the simulator (not replaced by T2405)
        wrong_names += [(lang, c["id"], c["names"][lang]) for c in cells if (c["base"] or c["id"] in ("mutualistic_intelligence", "memory_aggregator", "neural_chorus")) and c["names"][lang] != official[lang].get(game_id(c))]
    check("bingo: authority variants (and Mutualistic Intelligence, Memory Aggregator, Neural Chorus) use the official es/en/jp names", len(cells) == 79 and not wrong_names, wrong_names[:5])
    wrong_base = [(c["id"], c["base"]) for c in cells if c["base"] and c["base"] != official["en"][game_auths.get(game_id(c), ("", "auth_democratic"))[1]]]
    check("bingo: the base authority in brackets is the one the game variant belongs to", not wrong_base, wrong_base[:5])
    # T2406: the 4 "Dictatorial Alignment" cells by ruler class, after the generic icon
    ruler = [a for a in auths if "_dictatorial_collectivist" in a[1]]
    check("bingo: Dictatorial Alignment has the generic cell and one per ruler class, told apart by name",
          [a[1] for a in ruler] == ["Auth_cyber_dictatorial_collectivist" + s + ".png" for s in ("", "_official", "_commander", "_scientist", "_vacant")]
          and all(a[0].startswith(official["en"]["auth_cyber_dictatorial_collectivist_official"] + " – ") for a in ruler[1:]) and ruler[2][0] == "Dictatorial Alignment – Commander (Dictatorial)", [a[0] for a in ruler])
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
    got = await download_png(bingo, "PNG download of a shape bingo uses its own columns")
    if got:
        check("bingo: PNG download of a shape bingo uses its own columns", got[0][:8] == PNG_SIGNATURE and png_width(got[0]) == (24 * 2 + 3 * 150) * 2 and got[1] == "bingo-smoke-stellaris.png", (got[1], png_width(got[0])))
    # P22.13: an icon request that never answers delays the PNG (ICON_WAIT_MS of js/bingo.js, 5 s) but never blocks it
    stalled = []
    await bingo.route("**/smoke_stalled.png", lambda route: stalled.append(route))
    await bingo.evaluate("async()=>{const m=await import('./js/bingo-data.js');m.BINGOS.push({id:'smokeStalled',titleKey:'bingoTypeOrigins',fileSlug:'stalled',iconSize:70,showNames:false,layout:{type:'grid',columns:2},items:[{img:'origins/GFX_origin_remnants.png',i18nKey:'originRemnants'},{img:'origins/smoke_stalled.png',i18nKey:'originScion'}]})}")
    await bingo.click(".lang-btn[data-lang=es]")
    await bingo.click(".lang-btn[data-lang=en]")
    await bingo.select_option("#bingo-type", "smokeStalled")
    got = await download_png(bingo, "a stalled icon request does not block the PNG download", timeout=15000)
    if got:
        check("bingo: a stalled icon request does not block the PNG download", stalled and got[0][:8] == PNG_SIGNATURE and got[1] == "bingo-stalled-stellaris.png" and not got[2], (len(stalled), got[1], got[2]))
    for route in stalled:
        await route.abort()
    await bingo.select_option("#bingo-type", "origins")
    check("bingo: leaving a shape bingo restores the flowing grid", await bingo.evaluate("()=>!document.querySelector('#bingo-grid').classList.contains('bingo-grid--shape')&&!document.querySelector('#bingo-grid .bingo-card').style.gridRow"))
    await bingo.reload()
    await bingo.wait_for_timeout(300)
    check("bingo: after a reload the grid matches the selected type", len(await bingo.evaluate(cards_js)) == (sizes[1] if await bingo.evaluate("()=>document.querySelector('#bingo-type').value") == "principles" else sizes[0]))
    check("bingo: no page errors", not bingo_errors, bingo_errors)
    check("bingo: no local resource failed to load", not bingo_missing, bingo_missing)
    await bingo.close()
