"""Legal pages, 404 and tech tree placeholder: links, languages, ads off, Vercel 404, shared page shell (P22.3, P23.2)."""
import json, os
from smoke.common import check, ROOT


async def run(t):
    ctx = t.ctx
    # P22.3: legal pages, 404 and tech tree placeholder — links, languages, ads off, Vercel 404
    simple = await ctx.new_page()
    simple_errors, simple_missing, ad_requests = [], [], []
    simple.on("pageerror", lambda e: simple_errors.append(str(e)))
    simple.on("requestfailed", lambda r: r.url.startswith(("file:", "http://127.")) and simple_missing.append(r.url))
    simple.on("response", lambda r: r.status >= 400 and r.request.resource_type != "document" and r.url.startswith(("file:", "http://127.")) and simple_missing.append(r.url))
    simple.on("request", lambda r: any(h in r.url for h in ("googlesyndication", "doubleclick", "adservice", "googletagmanager")) and ad_requests.append(r.url))
    pages_texts = {}
    for page_name in ("privacy.html", "cookies.html", "404.html", "tech-tree.html"):
        await simple.goto("file://" + ROOT + "/" + page_name)
        await simple.wait_for_timeout(200)
        local_links = await simple.evaluate("()=>[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>!/^(https?:|mailto:|#)/.test(h))")
        broken = [h for h in local_links if h not in ("./", "/") and not os.path.isfile(os.path.join(ROOT, h.split("#")[0]))]
        check("simple pages: " + page_name + " local links point to existing pages", local_links and not broken, (local_links, broken))
        for lang in ("en", "jp", "es"):
            await simple.click(".lang-btn[data-lang=" + lang + "]")
            pages_texts[(page_name, lang)] = await simple.evaluate("()=>[document.documentElement.lang,document.title,document.querySelector('h1').textContent,document.querySelector('meta[name=description]')?.content||'',document.body.innerText]")
        en, jp, es = (pages_texts[(page_name, l)] for l in ("en", "jp", "es"))
        raw_keys = [x for x in (en, jp, es) if "undefined" in x[4] or "undefined" in x[1]]
        check("simple pages: " + page_name + " title, heading and text follow es/en/jp", [en[0], jp[0], es[0]] == ["en", "ja", "es"] and en[4] != es[4] and jp[4] != es[4] and not raw_keys and (page_name == "404.html" or (en[3] and en[3] != jp[3])), [en[:4], jp[:4], es[:4]])
    # T4304: the privacy page describes the hall of fame data in es/en/jp
    hof_words = {"es": ["nombre", "puntuación", "fecha", "hash con sal", "dirección IP", "24 horas"],
                 "en": ["name", "score", "date", "salted hash", "IP address", "24 hours"],
                 "jp": ["名前", "スコア", "日付", "ソルト付きハッシュ", "IPアドレス", "24時間"]}
    for lang, words in hof_words.items():
        text = pages_texts[("privacy.html", lang)][4]
        missing = [w for w in words + ["Vercel", "MongoDB Atlas"] if w.lower() not in text.lower()]
        check("privacy: hall of fame data, 24 h IP hash and hosting described (" + lang + ")", not missing, missing)
    await simple.goto("file://" + ROOT + "/privacy.html")
    section = await simple.evaluate("()=>[document.getElementById('testellaris-hall-of-fame')?.tagName,document.querySelector('[data-i18n=privacyLastUpdatedNotice]')?.textContent]")
    check("privacy: hall of fame section and the page's own update date", section[0] == "H2" and "2026" in (section[1] or ""), section)
    await simple.click(".lang-btn[data-lang=en]")
    await simple.goto("file://" + ROOT + "/cookies.html")
    await simple.wait_for_timeout(150)
    check("simple pages: the language chosen on one page is kept on the next", await simple.evaluate("()=>document.documentElement.lang") == "en")
    await simple.goto("file://" + ROOT + "/index.html")
    await simple.wait_for_timeout(300)
    ads = await simple.evaluate("async()=>{const c=(await import('./js/ads-config.js')).adsConfig;return [c.enabled,c.publisherId,[...document.querySelectorAll('[data-ad-slot]')].map(s=>s.hidden),document.querySelectorAll('ins.adsbygoogle,script[src*=googlesyndication]').length]}")
    check("ads: disabled in js/ads-config.js, slots hidden, no ad script or request", ads[0] is False and ads[1] == "" and ads[2] and all(ads[2]) and ads[3] == 0 and not ad_requests, (ads, ad_requests))
    consent = await simple.evaluate("async()=>(await (await fetch('js/ads.js')).text()).match(/function hasAdConsent\\(\\)\\s*\\{\\s*return (\\w+)/)?.[1]")
    check("ads: no consent without a CMP (hasAdConsent returns false)", consent == "false", consent)
    vercel = json.load(open(os.path.join(ROOT, "vercel.json"), encoding="utf-8"))
    check("vercel.json: clean URLs and no rewrite/route that would hide the 404 page", vercel.get("cleanUrls") is True and not vercel.get("rewrites") and not vercel.get("routes") and os.path.isfile(os.path.join(ROOT, "404.html")), vercel)
    # Vercel serves 404.html (keeping the URL) for any missing path: emulate it over http
    import http.server, threading, functools

    class Vercel404(http.server.SimpleHTTPRequestHandler):
        def send_error(self, code, message=None, explain=None):
            if code != 404:
                return super().send_error(code, message, explain)
            body = open(os.path.join(ROOT, "404.html"), "rb").read()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Vercel404, directory=ROOT))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base_url = "http://127.0.0.1:%d" % server.server_address[1]
    for path in ("/missing-page", "/a/b/c/missing"):
        simple_missing.clear()
        resp = await simple.goto(base_url + path)
        await simple.wait_for_timeout(300)
        await simple.click(".lang-btn[data-lang=en]")
        nf = await simple.evaluate("()=>[document.querySelector('h1').textContent,[...document.styleSheets].reduce((n,x)=>n+x.cssRules.length,0),[...document.querySelectorAll('a[href]')].map(a=>a.href)]")
        check("404 at " + path + ": status 404, styled, translated, links from the site root", resp.status == 404 and nf[0] != "Registro no encontrado." and nf[1] > 50 and all(h.startswith(base_url + "/") and "/a/b" not in h for h in nf[2]) and not simple_missing, (resp.status, nf, simple_missing))
    server.shutdown()
    # P23.2: one page shell — same header markup everywhere, one language listener, no own translation code
    shell_js = """()=>{const h=document.querySelector('body > * > header, body > header');const b=[...document.querySelectorAll('.lang-btn')];
        return [!!h&&!h.closest('main'),!document.querySelector('main footer'),
          b.map(x=>x.dataset.lang+':'+x.getAttribute('lang')+':'+!!x.getAttribute('aria-label')).join(','),
          !!document.querySelector('.brand[aria-label][data-i18n-attr]'),document.documentElement.lang,
          b.map(x=>x.getAttribute('aria-pressed')).join(',')]}"""
    for page_name in ("index.html", "bingo.html", "planet-sim.html", "privacy.html", "cookies.html", "404.html", "tech-tree.html"):
        await simple.goto("file://" + ROOT + "/" + page_name)
        await simple.wait_for_timeout(250)
        await simple.click(".lang-btn[data-lang=jp]")
        sh = await simple.evaluate(shell_js)
        check("page shell: " + page_name + " header and footer outside <main>, labelled language buttons and brand, JP applied", sh[:4] == [True, True, "es:es:true,en:en:true,jp:ja:true", True] and sh[4] == "ja" and sh[5] == "false,false,true", sh)
    await simple.click(".lang-btn[data-lang=es]")
    own_i18n = []
    for f in os.listdir(os.path.join(ROOT, "js")):
        if f.endswith(".js") and f not in ("page-shell.js", "i18n.js"):
            code = "".join(l for l in open(os.path.join(ROOT, "js", f), encoding="utf-8") if not l.lstrip().startswith("*"))
            if any(s in code for s in ("lang-btn", 'querySelectorAll("[data-i18n', "storeLang(")):
                own_i18n.append(f)
    check("page shell: only js/page-shell.js listens to .lang-btn and applies data-i18n", not own_i18n, own_i18n)
    check("simple pages: no page errors", not simple_errors, simple_errors)
    check("simple pages: no local resource failed to load", not simple_missing, simple_missing)
    await simple.close()
