"""Wiki QA: navigation, hashes, search, easter eggs, block types, languages, images (P22.1)."""
from smoke.common import check, ROOT, HTML_LANG


async def run(t):
    ctx = t.ctx
    # P22.1: wiki QA — navigation, hashes, search, easter eggs, block types, languages, images
    wiki = await ctx.new_page()
    wiki_errors, wiki_missing = [], []
    wiki.on("pageerror", lambda e: wiki_errors.append(str(e)))
    wiki.on("requestfailed", lambda r: r.url.startswith("file:") and wiki_missing.append(r.url))
    await wiki.goto("file://" + ROOT + "/index.html")
    await wiki.wait_for_timeout(400)
    await wiki.click(".lang-btn[data-lang=en]")
    title_js = "()=>document.querySelector('#reader-title')?.textContent||''"
    buttons_js = "()=>[...document.querySelectorAll('#index-empty .entry-button')].map(b=>b.textContent)"
    kb = await wiki.evaluate("async()=>(await import('./js/content.js')).knowledgeBase.map(e=>({slug:e.slug,hidden:!!e.hidden}))")
    listed = await wiki.evaluate(buttons_js)
    count = await wiki.evaluate("()=>document.querySelector('#entry-count').textContent")
    visible_n = len([e for e in kb if not e["hidden"]])
    check("wiki: index lists every non-hidden entry and the count matches", len(listed) == visible_n and count == str(visible_n).zfill(2), (len(listed), count, visible_n))
    await wiki.click("#index-empty .entry-button >> nth=1")
    await wiki.wait_for_timeout(100)
    first = (await wiki.evaluate("()=>[location.hash,document.querySelector('#reader-title').textContent]"))
    check("wiki: clicking an entry opens it and sets #/slug", first[0] == "#/" + await wiki.evaluate("()=>encodeURIComponent('diseño-flotas-mecnicas')") and "Mechanical Fleet Design" in first[1], first)
    await wiki.click("#index-empty .entry-button >> nth=2")
    await wiki.wait_for_timeout(100)
    await wiki.go_back()
    await wiki.wait_for_timeout(150)
    check("wiki: browser back returns to the previous entry", "Mechanical Fleet Design" in await wiki.evaluate(title_js), await wiki.evaluate(title_js))
    await wiki.evaluate("()=>{location.hash='#archivo'}")
    await wiki.wait_for_timeout(100)
    check("wiki: the skip link anchor (#archivo) keeps the open entry", "Mechanical Fleet Design" in await wiki.evaluate(title_js), await wiki.evaluate(title_js))
    await wiki.evaluate("()=>{location.hash='#/no-such-entry'}")
    await wiki.wait_for_timeout(100)
    check("wiki: an unknown #/slug shows the empty reader", await wiki.evaluate("()=>!!document.querySelector('#reader-body .empty-state')"))
    await wiki.goto("file://" + ROOT + "/index.html#/MUGANI")
    await wiki.wait_for_timeout(300)
    check("wiki: a hidden entry opens from its URL", "MUGANI?" in await wiki.evaluate(title_js), await wiki.evaluate(title_js))

    async def search(q):
        await wiki.fill("#knowledge-search", q)
        await wiki.wait_for_timeout(80)
        return await wiki.evaluate(buttons_js)
    eggs = ("Wishlist", "Lista de deseos", "MUGANI", "Singularity", "特異点")
    short = [b for q in ("a", "s", "3", "mu") for b in await search(q) if any(x in b for x in eggs)]
    check("wiki: one/two-letter searches reveal no easter egg", not short, short)
    found = [await search("mugan"), await search("wishlist"), await search("clase 30")]
    check("wiki: easter eggs found by (partial) trigger", any("MUGANI" in b for b in found[0]) and any("Lista de deseos" in b for b in found[1]) and any("Singularity" in b for b in found[2]), found)
    await wiki.click(".lang-btn[data-lang=jp]")
    jp_egg = await search("特異点")
    await wiki.click(".lang-btn[data-lang=en]")
    check("wiki: a trigger of a translation (JP 特異点) reveals its entry", any("特異点" in b for b in jp_egg), jp_egg)
    await search("")
    await wiki.goto("file://" + ROOT + "/index.html#/" + "enlaces-utiles")
    await wiki.wait_for_timeout(300)
    bad_markup_js = "()=>[...document.querySelectorAll('#reader-body [href],#reader-body [style]')].filter(e=>/[<>]|mark|hl-/.test((e.getAttribute('href')||'')+(e.getAttribute('style')||''))).map(e=>e.outerHTML.slice(0,120))"
    for lang in ("es", "en", "jp"):
        await wiki.click(".lang-btn[data-lang=" + lang + "]")
        for q in ("https", "stellaris", "color", "amp"):
            await search(q)
            bad = await wiki.evaluate(bad_markup_js)
            hrefs = await wiki.evaluate("()=>[...document.querySelectorAll('#reader-body a')].map(a=>a.getAttribute('href')).filter(h=>!/^https:\\/\\/[^\\s<>\\[\\]]+$/.test(h)&&!/^tech-tree\\.html(#tech_\\w+)?$/.test(h)&&h!=='planet-sim.html')")
            check("wiki links (" + lang + ", search " + q + "): hrefs are clean URLs (or the tech tree page, T3402, or the simulator, T2607), no markup inside attributes", not bad and not hrefs, (bad, hrefs))
    await wiki.click(".lang-btn[data-lang=es]")
    await wiki.goto("file://" + ROOT + "/index.html#/" + "diseño-flotas-biologicas")
    await wiki.wait_for_timeout(300)
    await search("dano")
    marks = await wiki.evaluate("()=>[...document.querySelectorAll('#reader-body mark.hl-marker')].map(m=>m.textContent.toLowerCase())")
    check("wiki: search marker ignores accents (dano marks daño)", "daño" in marks, marks[:5])
    await search("")
    # every entry in every language: block types rendered, no raw markdown, no "undefined"
    seen, raw = set(), []
    for lang in ("es", "en", "jp"):
        await wiki.click(".lang-btn[data-lang=" + lang + "]")
        check("wiki: <html lang> follows the language (" + lang + ")", await wiki.evaluate("()=>document.documentElement.lang") == HTML_LANG[lang])
        for e in kb:
            await wiki.evaluate("(s)=>{location.hash='#/'+encodeURIComponent(s)}", e["slug"])
            await wiki.wait_for_timeout(40)
            r = await wiki.evaluate("""()=>{const b=document.querySelector('#reader-body');const sel={heading:'h3.entry-heading,h4,h5',list:'ul.entry-list',links:'ul.entry-links',image:'figure.entry-image',columns:'.entry-columns',note:'.entry-note',quote:'blockquote.entry-quote',divider:'hr',paragraph:'.entry-content > p'};
                return {types:Object.entries(sel).filter(([k,s])=>b.querySelector(s)).map(([k])=>k),title:document.querySelector('#reader-title').textContent,text:b.innerText}}""")
            seen.update(r["types"])
            if "undefined" in r["text"] or "**" in r["text"] or "](" in r["text"] or not r["title"].strip():
                raw.append(lang + "/" + e["slug"])
    check("wiki: every block type of content.js renders", seen >= {"heading", "list", "links", "image", "columns", "note", "quote", "divider", "paragraph"}, seen)
    check("wiki: no raw markdown, 'undefined' or empty titles in any entry/language", not raw, raw)
    local_imgs = await wiki.evaluate("""async()=>{const kb=(await import('./js/content.js')).knowledgeBase;const s=new Set();
        const walk=(bl)=>(bl||[]).forEach(x=>{if(x.src)s.add(x.src);if(x.portrait)s.add(x.portrait);if(x.columns)x.columns.forEach(walk)});
        kb.forEach(e=>{walk(e.blocks);Object.values(e.i18n||{}).forEach(t=>walk(t.blocks))});
        const missing=[];for(const src of s){if(/^https?:/.test(src))continue;try{const r=await fetch(src);if(!r.ok)missing.push(src)}catch(err){missing.push(src)}}return {n:s.size,missing}}""")
    known_missing = {"img/naves/Base estelar artillada.png", "img/naves/Base estelar portahangares.png"}  # T2210: screenshots pending
    check("wiki: every local image of content.js exists (except the pending T2210 ones)", local_imgs["n"] > 100 and set(local_imgs["missing"]) <= known_missing, local_imgs)
    await wiki.click(".lang-btn[data-lang=en]")
    await wiki.evaluate("()=>{location.hash='#/'+encodeURIComponent('diseño-naves-mecnicas')}")
    await wiki.wait_for_timeout(100)
    notice = await wiki.evaluate("()=>{const i=document.querySelector('#reader-body figure.entry-image img');const alt=i.alt,f=i.closest('figure');i.dispatchEvent(new Event('error'));const p=f.querySelector('.entry-image-missing');return [alt,p&&!f.querySelector('img')&&p.textContent]}")
    check("wiki: a missing image shows a notice with its alt text", notice[1] and notice[0] in notice[1] and "Image not available" in notice[1], notice)
    mug = await wiki.evaluate("async()=>{location.hash='#/MUGANI';await new Promise(r=>setTimeout(r,60));return !!document.querySelector('#reader-body .entry-quote-portrait')}")
    check("wiki: translated quotes keep their portrait", mug)
    # T2607: [[icon:…]] tokens show the game concept icons (ICONS.md) with the word as tooltip / alt text
    gloss = "conceptos-economia-planetaria"
    icons_js = """()=>[...document.querySelectorAll('#reader-body img.wiki-concept-icon')].map(i=>({c:i.dataset.concept,alt:i.alt,title:i.title,src:i.getAttribute('src'),
        next:(i.nextSibling&&i.nextSibling.textContent||'').trim()}))"""
    for lang, housing in (("es", "Vivienda"), ("en", "Housing"), ("jp", "住宅")):
        await wiki.click(".lang-btn[data-lang=" + lang + "]")
        await wiki.evaluate("(s)=>{location.hash='#/'+encodeURIComponent(s)}", gloss)
        await wiki.wait_for_timeout(80)
        icons = await wiki.evaluate(icons_js)
        text = await wiki.evaluate("()=>document.querySelector('#reader-body').innerText")
        h = next((i for i in icons if i["c"] == "housing"), {})
        check("wiki icons (" + lang + "): the glossary shows the game icons of upkeep, production, housing, amenities, stability, crime, strata and build time",
              len(icons) >= 27 and {"upkeep:energy", "production:minerals", "efficiency:minerals", "housing", "amenities", "stability", "crime", "ruler", "worker", "buildTime", "district"} <= {i["c"] for i in icons}, [i["c"] for i in icons])
        check("wiki icons (" + lang + "): every icon has its translated word as tooltip and loads from StellarisAssets",
              all(i["title"] and not i["title"].startswith("wikiIcon") and "/" in i["src"] and i["src"].endswith(".png") for i in icons) and h.get("title") == housing, [i for i in icons if not i["title"] or i["title"].startswith("wikiIcon")][:3] or h)
        check("wiki icons (" + lang + "): [[icon+:…]] keeps the word visible next to a decorative icon, [[icon:…]] uses the word as alt",
              h.get("alt") == "" and h.get("next", "").startswith(housing) and any(i["c"] == "amenitiesGestalt" and i["alt"] for i in icons), [h, [i for i in icons if i["c"] == "amenitiesGestalt"]])
        check("wiki icons (" + lang + "): no raw [[icon tokens in the text", "[[icon" not in text and "]]" not in text)
    await wiki.click(".lang-btn[data-lang=es]")
    found = await search("vivienda")
    leak = await search("icon+")
    await search("")
    check("wiki icons: search matches the concept words of the icons, not the token syntax", any("economía planetaria" in b for b in found) and not any("economía planetaria" in b for b in leak), (found, leak))
    unit = await wiki.evaluate("""async()=>{const m=await import('./js/wiki-icons.js');return [m.formatWikiIcons('[[icon:stability]] y [[icon:nope|Algo]] [[icon:upkeep:unknown_res]]','es'),m.wikiIconText('[[icon+:buildTime]] 360','en')]}""")
    check("wiki icons: an unknown concept or resource falls back to its plain word", 'alt="Estabilidad"' in unit[0] and "Algo" in unit[0] and unit[0].count("<img") == 1 and unit[1] == "Build time 360", unit)
    check("wiki: no page errors", not wiki_errors, wiki_errors)
    check("wiki: no local resource failed to load", not [u for u in wiki_missing if "Base%20estelar" not in u], wiki_missing)
    await wiki.close()
