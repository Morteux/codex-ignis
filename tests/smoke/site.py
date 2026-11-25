"""Every page: load budget, es/en/jp without errors, mobile layout, accessibility, Japanese browser (P22.9, P22.4, P22.5, P22.6)."""
import json, os, re, subprocess
from smoke.common import check, ROOT, HTML_LANG


async def run(t):
    browser, ctx = t.browser, t.ctx
    # P22.9: load budget — every local file a page needs exists; static icons of the tabs hidden at start are lazy
    budget = subprocess.run(["node", os.path.join(ROOT, "tests", "load-budget.mjs"), ROOT], capture_output=True, text=True)
    check("load budget: report runs and finds every local file of every page", budget.returncode == 0 and budget.stdout.rstrip().endswith("problems 0"), budget.stdout[-300:] + budget.stderr[-300:])
    sim_html = open(os.path.join(ROOT, "planet-sim.html"), encoding="utf-8").read()
    hidden_panels = [p for p in sim_html.split('id="planet-tab-panel-')[1:] if not p.startswith('planet"')]
    hidden_imgs = [m.group(0) for p in hidden_panels for m in re.finditer(r"<img[^>]*>", p)]
    hidden_eager = [i[:80] for i in hidden_imgs if 'loading="lazy"' not in i]
    check("load budget: images of the simulator tabs hidden at start are lazy-loaded", len(hidden_panels) == 5 and len(hidden_imgs) >= 12 and not hidden_eager, hidden_eager[:3])
    # P23.8: every <link rel="modulepreload"> of the simulator is in its import graph and shortens it; the font is WOFF2 with the TTF as fallback
    preloads = re.findall(r'<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"', sim_html)
    rounds = re.search(r"planet-sim\.html:[^\n]*\n(?:[^\n]*\n)*?  fetch rounds (\d+) \((\d+) with (\d+) modulepreload\)", budget.stdout)
    check("load budget: every simulator modulepreload is in the page's graph and the browser finds every module in 2 rounds",
          preloads and "PRELOAD NOT IN GRAPH" not in budget.stdout and rounds and int(rounds.group(3)) == len(preloads) and int(rounds.group(2)) == 2 < int(rounds.group(1)), (len(preloads), rounds and rounds.groups()))
    ppg = await ctx.new_page()
    requested = []
    ppg.on("requestfinished", lambda r: requested.append(r.url))
    await ppg.goto("file://" + ROOT + "/planet-sim.html")
    await ppg.wait_for_timeout(500)
    font_ok = await ppg.evaluate("()=>document.fonts.check('16px Orbitron')")
    not_used = [p for p in preloads if not any(u.endswith("/" + p) for u in requested)]
    fonts = [u.rsplit("/", 1)[-1] for u in requested if "/fonts/" in u]
    check("load budget: the browser loads every preloaded module and the WOFF2 font (not the TTF)", not not_used and fonts == ["Orbitron-VariableFont_wght.woff2"] and font_ok, (not_used, fonts, font_ok))
    await ppg.close()
    # P22.4: every page in es/en/jp — no page/console errors, no local resource that fails to load
    site_pages = ("index.html", "bingo.html", "planet-sim.html", "tech-tree.html", "testellaris.html", "privacy.html", "cookies.html", "404.html")
    for lang in ("es", "en", "jp"):
        lctx = await browser.new_context(locale={"es": "es-ES", "en": "en-US", "jp": "ja-JP"}[lang])
        if os.environ.get("BLOCK_REMOTE"): await lctx.route("https://**/*", lambda r: r.abort())
        await lctx.add_init_script("localStorage.setItem('codex-ignis-lang', %s)" % json.dumps(lang))
        for page_name in site_pages:
            lpg = await lctx.new_page()  # one page each, so listeners do not pile up
            problems = []
            lpg.on("pageerror", lambda e, p=problems: p.append("pageerror: " + str(e)))
            # remote assets (blocked with BLOCK_REMOTE, or offline) are not local failures
            lpg.on("console", lambda m, p=problems: m.type == "error" and not (m.location or {}).get("url", "").startswith("https:") and not ("Failed to load resource" in m.text and "https:" in m.text) and p.append("console: " + m.text))
            lpg.on("requestfailed", lambda r, p=problems: r.url.startswith("file:") and p.append("missing: " + r.url))
            await lpg.goto("file://" + ROOT + "/" + page_name)
            await lpg.wait_for_timeout(500)
            await lpg.evaluate("async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,20))}scrollTo(0,0)}")  # lazy images too
            await lpg.wait_for_timeout(200)
            state = await lpg.evaluate("()=>[document.documentElement.lang,/\\bundefined\\b|\\[object /.test(document.body.innerText)]")
            check("all pages (" + lang + "): " + page_name + " loads with <html lang>, no errors, no missing local files", state == [HTML_LANG[lang], False] and not problems, (state, problems[:5]))
            # P22.8: page metadata — title, description, favicon, Open Graph following title/description/language, canonical
            meta = await lpg.evaluate("""()=>{const m=(s,a='content')=>document.querySelector(s)?.getAttribute(a)||'';
                return {title:document.title,desc:m('meta[name=description]'),icon:m('link[rel=icon]','href'),canonical:m('link[rel=canonical]','href'),theme:m('meta[name=theme-color]'),
                    ogTitle:m('meta[property="og:title"]'),ogDesc:m('meta[property="og:description"]'),ogLocale:m('meta[property="og:locale"]'),ogImage:m('meta[property="og:image"]'),
                    ogType:m('meta[property="og:type"]'),ogSite:m('meta[property="og:site_name"]'),twitter:m('meta[name="twitter:card"]'),viewport:m('meta[name=viewport]')}}""")
            og_locale = {"es": "es_ES", "en": "en_US", "jp": "ja_JP"}[lang]
            meta_ok = (meta["title"].strip() != "" and "Codex Ignis" in meta["title"] and meta["desc"].strip() != ""
                       and meta["ogTitle"] == meta["title"] and meta["ogDesc"] == meta["desc"] and meta["ogLocale"] == og_locale
                       and meta["ogType"] == "website" and meta["ogSite"] == "Codex Ignis" and meta["twitter"] and meta["theme"] and meta["viewport"]
                       and os.path.exists(os.path.join(ROOT, meta["icon"])))
            if page_name != "404.html":
                meta_ok = meta_ok and os.path.exists(os.path.join(ROOT, meta["ogImage"])) and meta["canonical"] != ""
            check("page metadata (" + lang + "): " + page_name + " title, description, favicon, Open Graph and canonical", meta_ok, meta)
            await lpg.close()
        await lctx.close()
    # P22.5: mobile layout of the other pages at 320 and 375 px — no sideways scroll, usable controls
    mobile_js = """()=>{const w=document.documentElement.clientWidth;const out=(x)=>{const r=x.getBoundingClientRect();return r.width&&r.right>w+1};
        const over=[...document.querySelectorAll('body *')].filter(e=>out(e)&&![...e.children].some(out)&&!e.closest('.entry-columns figure,.lightbox,.tech-area-scroll')).slice(0,6).map(e=>e.tagName+'.'+e.className+' '+(e.textContent||'').trim().slice(0,30));
        const small=[...document.querySelectorAll('a,button,input,select')].filter(e=>{const r=e.getBoundingClientRect();const img=e.querySelector('img');return r.width&&r.height&&(r.height<24||r.width<24)&&!(img&&!img.naturalWidth)&&!e.closest('.reader-body p,.reader-body li,.legal-content p,.tech-credits p,.intro-copy,.skip-link')}).slice(0,6).map(e=>e.tagName+' '+(e.textContent||e.id).trim().slice(0,20)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height));
        return {sw:document.documentElement.scrollWidth,w,over,small}}"""
    mctx = await browser.new_context(locale="en-US", viewport={"width": 320, "height": 700}, has_touch=True, is_mobile=True)
    if os.environ.get("BLOCK_REMOTE"): await mctx.route("https://**/*", lambda r: r.abort())
    mpg = await mctx.new_page()
    for width in (320, 375):
        await mpg.set_viewport_size({"width": width, "height": 700})
        for lang in ("es", "en", "jp"):
            for page_name, setup in (("index.html", None), ("index.html#/" + "diseño-naves-mecnicas", None), ("index.html#/enlaces-utiles", None), ("index.html#/singularidad-clase-30", None),
                                     ("bingo.html", None), ("bingo.html", "principles"), ("bingo.html", "ethics"), ("bingo.html", "authorities"), ("privacy.html", None), ("cookies.html", None), ("404.html", None), ("tech-tree.html", None), ("testellaris.html", None)):
                await mpg.goto("file://" + ROOT + "/" + page_name)
                await mpg.wait_for_timeout(250)
                await mpg.click(".lang-btn[data-lang=" + lang + "]")
                if setup:
                    await mpg.select_option("#bingo-type", setup)
                await mpg.wait_for_timeout(100)
                m = await mpg.evaluate(mobile_js)
                check("mobile %dpx (%s): %s%s has no horizontal overflow and no tiny controls" % (width, lang, page_name, " " + setup if setup else ""), m["sw"] <= m["w"] and not m["over"] and not m["small"], m)
    # P22.12: the ≤ 700 px bingo rules win over the base rules (smaller cells: 88 / 46 px minimum)
    for width in (320, 375):
        await mpg.set_viewport_size({"width": width, "height": 700})
        for bingo_type, min_px, base_px in (("origins", 88, 110), ("principles", 46, 58)):
            await mpg.goto("file://" + ROOT + "/bingo.html")
            await mpg.wait_for_timeout(250)
            await mpg.select_option("#bingo-type", bingo_type)
            await mpg.wait_for_timeout(100)
            cols = await mpg.evaluate("()=>{const g=document.querySelector('.bingo-grid');const s=getComputedStyle(g);const cells=[...g.querySelectorAll('.bingo-card')].map(c=>c.getBoundingClientRect().width);return [s.gridTemplateColumns.split(' ').length,g.clientWidth,parseFloat(s.columnGap),Math.min(...cells)]}")
            expected = int((cols[1] + cols[2]) // (min_px + cols[2]))
            desktop = int((cols[1] + cols[2]) // (base_px + cols[2]))
            check("mobile %dpx: bingo %s uses the %d px mobile cells (%d columns, %d with the desktop rule)" % (width, bingo_type, min_px, expected, desktop),
                  cols[0] == expected and cols[3] >= min_px - 1, cols + [desktop])
    await mpg.goto("file://" + ROOT + "/index.html")
    await mpg.wait_for_timeout(250)
    await mpg.tap("#index-empty .entry-button >> nth=5")
    await mpg.wait_for_timeout(300)
    top = await mpg.evaluate("()=>[document.querySelector('#reader-body').getBoundingClientRect().top,innerHeight,scrollY]")
    check("mobile: choosing an entry scrolls the article into view", 0 <= top[0] < top[1] / 2 and top[2] > 0, top)
    await mctx.close()
    # P22.6: accessibility of the other pages — landmarks, alt texts, keyboard focus, contrast, lightbox
    a11y = await ctx.new_page()
    structure_js = """()=>{const main=document.querySelectorAll('main');const bad=[];
        if(main.length!==1)bad.push('main x'+main.length);
        document.querySelectorAll('header,footer').forEach(e=>{if(e.closest('main,article,section,aside,nav'))bad.push(e.tagName+' inside '+e.parentElement.closest('main,article,section,aside,nav').tagName)});
        if(!document.querySelector('body > * header, body > header'))bad.push('no header');
        document.querySelectorAll('[aria-label]').forEach(e=>{if(/^(DIV|SPAN|P)$/.test(e.tagName)&&!e.getAttribute('role'))bad.push('aria-label on generic '+e.tagName+'#'+e.id+'.'+e.className)});
        document.querySelectorAll('img').forEach(i=>{if(!i.hasAttribute('alt'))bad.push('img without alt '+i.getAttribute('src'))});
        document.querySelectorAll('button,a[href]').forEach(b=>{if(b.offsetParent&&!(b.getAttribute('aria-label')||b.innerText.trim()||[...b.querySelectorAll('img')].some(i=>i.alt)))bad.push('unnamed '+b.tagName+'.'+b.className)});
        return bad}"""
    contrast_js = """()=>{const lum=(c)=>{const m=c.match(/[\\d.]+/g).map(Number);const f=(v)=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return [.2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]),m[3]===undefined?1:m[3]]};
        const bgOf=(e)=>{for(let x=e;x;x=x.parentElement){const b=getComputedStyle(x).backgroundColor;const a=b.match(/[\\d.]+/g).map(Number);if(a.length<4||a[3]>.5)return b}return 'rgb(7,17,12)'};
        const ratio=(a,b)=>{const x=lum(a)[0],y=lum(b)[0];return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};const out=[];
        const els=[...document.querySelectorAll('body *')].filter(e=>e.offsetParent&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&!e.closest('.hl-word,[aria-hidden=true]'));
        for(const e of els){const s=getComputedStyle(e);const big=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&+s.fontWeight>=700);const r=ratio(s.color,bgOf(e));if(r<(big?3:4.5))out.push(e.tagName+'.'+e.className+' '+e.textContent.trim().slice(0,20)+' '+r.toFixed(2))}
        const inp=document.querySelector('input[placeholder]');if(inp){const r=ratio(getComputedStyle(inp,'::placeholder').color,bgOf(inp));if(r<4.5)out.push('placeholder '+r.toFixed(2))}
        return [...new Set(out)].slice(0,10)}"""
    focus_js = """()=>{const e=document.activeElement;if(!e||e===document.body)return null;const s=getComputedStyle(e);const r=e.getBoundingClientRect();
        const ring=(x)=>{const t=getComputedStyle(x);return (t.outlineStyle!=='none'&&parseFloat(t.outlineWidth)>=1)||t.boxShadow!=='none'};
        return [e.tagName+'.'+e.className+' '+(e.textContent||e.id).trim().slice(0,16),ring(e)||(e.closest('.search-control')&&ring(e.closest('.search-control'))),r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight+2000]}"""
    for page_name in ("index.html#/MUGANI", "bingo.html", "privacy.html", "cookies.html", "404.html", "tech-tree.html"):
        await a11y.goto("file://" + ROOT + "/" + page_name)
        await a11y.wait_for_timeout(300)
        await a11y.click(".lang-btn[data-lang=en]")
        await a11y.evaluate("()=>document.activeElement.blur()")
        bad = await a11y.evaluate(structure_js)
        check("a11y: " + page_name + " one <main>, banner/footer outside it, named controls, alt on every image", not bad, bad)
        low = await a11y.evaluate(contrast_js)
        check("a11y: " + page_name + " text contrast >= 4.5:1 (3:1 large)", not low, low)
        no_ring, seen_focus = [], []
        await a11y.evaluate("()=>{document.activeElement&&document.activeElement.blur();window.scrollTo(0,0)}")
        for _ in range(40 if "bingo" not in page_name else 12):
            await a11y.keyboard.press("Tab")
            f = await a11y.evaluate(focus_js)
            if not f:
                continue
            seen_focus.append(f[0])
            if not (f[1] and f[2]):
                no_ring.append(f)
        check("a11y: " + page_name + " every Tab stop shows a visible focus ring", seen_focus and not no_ring, (no_ring[:5], seen_focus[:5]))
    await a11y.goto("file://" + ROOT + "/index.html#/MUGANI")
    await a11y.wait_for_timeout(300)
    await a11y.focus("#reader-body .entry-quote-zoom")
    await a11y.keyboard.press("Enter")
    lb = await a11y.evaluate("()=>[!document.querySelector('#image-lightbox').hidden,document.activeElement.id,document.querySelector('#image-lightbox').getAttribute('role'),document.querySelector('#image-lightbox').getAttribute('aria-modal')]")
    await a11y.keyboard.press("Tab")
    trapped = await a11y.evaluate("()=>document.activeElement.id")
    await a11y.keyboard.press("Escape")
    back = await a11y.evaluate("()=>[document.querySelector('#image-lightbox').hidden,document.activeElement.className]")
    check("a11y: wiki image zoom opens with Enter, focus on close, Tab stays, Escape returns focus", lb == [True, "lightbox-close", "dialog", "true"] and trapped == "lightbox-close" and back == [True, "entry-quote-zoom"], (lb, trapped, back))
    # P23.10: the lightbox uses js/modal.js too — a click on the dark background or on × closes it, and it opens again
    closes = []
    for how in ("background", "button"):
        await a11y.click("#reader-body .entry-quote-zoom")
        await a11y.wait_for_timeout(100)
        opened = await a11y.evaluate("()=>!document.querySelector('#image-lightbox').hidden&&!!document.querySelector('#lightbox-image').getAttribute('src')")
        if how == "background": await a11y.mouse.click(3, 3)
        else: await a11y.click("#lightbox-close")
        closes.append(await a11y.evaluate("()=>[document.querySelector('#image-lightbox').hidden,document.querySelector('#lightbox-image').getAttribute('src'),document.activeElement.className]") + [opened])
    check("wiki image zoom: a click outside the image or on × closes it, the focus goes back and it opens again", closes == [[True, "", "entry-quote-zoom", True]] * 2, closes)
    jp_lang = await a11y.evaluate("async()=>{const m=await import('./js/i18n.js');return m.htmlLangCode('jp')+','+m.htmlLangCode('es')}")
    check("a11y: <html lang> uses the BCP 47 tag ja for Japanese", jp_lang == "ja,es", jp_lang)
    await a11y.close()
    jctx = await browser.new_context(locale="ja-JP")
    jpg = await jctx.new_page()
    await jpg.goto("file://" + ROOT + "/privacy.html")
    await jpg.wait_for_timeout(200)
    check("i18n: a Japanese browser (ja-JP) opens the site in JP", await jpg.evaluate("()=>document.documentElement.lang") == "ja")
    await jctx.close()  # the browser stays open for the areas after this one (tests/policies-smoke.py closes it)
