"""Planet simulator: UI icons, empire-level tab marks and mobile layout; translated landmark labels of the other pages (P12.2, P12.3, P13.1, P13.9)."""
import os
from smoke.common import check, ROOT


async def run(t):
    ctx, pg, errors, tab = t.ctx, t.pg, t.errors, t.tab
    # P12.2: UI icons by in-game meaning (no loose first-pass placements left)
    icons = await pg.evaluate("()=>{const t=(k)=>document.querySelector(`.planet-main-tab[data-main-tab=${k}] img`)?.getAttribute('src')||'';const h=(k)=>document.querySelector(`[data-i18n=${k}]`)?.parentElement.querySelector('img')?.getAttribute('src')||'';return {all:[...document.querySelectorAll('img.ui-icon')].map(i=>i.getAttribute('src')),branches:t('branches'),empire:t('empire'),species:h('empireSpeciesHeading'),ethics:h('empireEthicsHeading'),jobs:h('planetSimSummaryHeading')}}")
    loose = [s for s in icons["all"] if any(n in s for n in ("Faction_support", "Colony_type_automated", "Focus_core", "Menu_icon_traditions", "Menu_icon_leaders", "Job_clerk"))]
    check("icons: no loose first-pass placements left", not loose, loose)
    check("icons: branch offices / empire / species / ethics / jobs by meaning", icons["branches"].endswith("modifiers/mod_branch_office_value_mult.png") and icons["empire"].endswith("modifiers/mod_cat_government.png") and icons["species"] == "img/ui/Icon_pop.png" and icons["ethics"].endswith("modifiers/mod_ethic_attraction_mult.png") and icons["jobs"] == "img/ui/Pop_job.png", icons)
    # T2525: every resource icon is a file of StellarisAssets; Advanced Logic has its own resources/ icon
    resource_imgs = await pg.evaluate("async()=>Object.fromEntries(Object.entries((await import('./js/planet-data.js')).RESOURCES).map(([k,r])=>[k,r.img]))")
    tree = set()
    folder = ""
    for line in open(os.path.join(ROOT, "StellarisAssetsFileTree.txt"), encoding="utf-8"):
        name = line.rstrip("\n").lstrip(" │├└─")
        if line.startswith(("├── ", "└── ")):
            folder = name
        elif folder.endswith("/"):
            tree.add(folder + name)
    missing = {k: v for k, v in resource_imgs.items() if v not in tree}
    check("icons: every resource icon exists in StellarisAssets, Advanced Logic from resources/", not missing and resource_imgs["advanced_logic"] == "resources/Advanced_logic.png", (missing, resource_imgs.get("advanced_logic")))
    # P12.3: empire-level tabs (Imperio, Edicts) marked as saved with the empire profile
    marked = await pg.evaluate("()=>[...document.querySelectorAll('.planet-main-tab')].filter(b=>b.classList.contains('is-empire-saved')).map(b=>[b.dataset.mainTab,b.title,getComputedStyle(b,'::before').backgroundImage.includes('mod_cat_government'),getComputedStyle(b).boxShadow!=='none'])")
    check("empire tabs: only Imperio and Edicts, tooltip, empire icon background, accent line", marked == [["empire", "Saved with the empire profile", True, True], ["edicts", "Saved with the empire profile", True, True]], marked)
    # P13.1: mobile layout — no tab may scroll the page sideways on a 320px screen
    overflow_js = "()=>{const w=document.documentElement.clientWidth;return {sw:document.documentElement.scrollWidth,w,over:[...document.querySelectorAll('body *')].filter(e=>{const out=(x)=>{const r=x.getBoundingClientRect();return r.width&&r.right>w+1};return out(e)&&![...e.children].some(out)&&!e.closest('#planet-compare,#planet-timeline')}).slice(0,8).map(e=>e.tagName+'.'+e.className+'#'+e.id)}}"
    await pg.set_viewport_size({"width": 320, "height": 800})
    for name in ("library", "planet", "empire", "body", "edicts", "branches"):
        await tab(name)
        wide = await pg.evaluate(overflow_js)
        check("mobile 320px: " + name + " tab has no horizontal overflow", wide["sw"] <= wide["w"] and not wide["over"], wide)
        if name == "planet":  # the Districts catalog too (the Buildings one is the default)
            await pg.evaluate("()=>document.querySelector('#planet-tab-districts').click()")
            wide = await pg.evaluate(overflow_js)
            check("mobile 320px: districts catalog has no horizontal overflow", wide["sw"] <= wide["w"] and not wide["over"], wide)
            await pg.evaluate("()=>document.querySelector('#planet-tab-buildings').click()")
    await pg.set_viewport_size({"width": 1280, "height": 900})
    await tab("planet")
    check("no page errors", not errors, errors)
    # P13.9: landmark aria-labels of the other pages follow the selected language
    labels_js = "()=>[...document.querySelectorAll('[aria-label]')].filter(e=>!e.classList.contains('lang-btn')&&!e.closest('#bingo-grid > *')).map(e=>e.getAttribute('aria-label'))"
    spanish = ("Cabecera", "inicio", "Proyectos", "Selector", "Sistema", "Explorador", "Navegación", "Número", "Espacio", "Información", "Cerrar", "Casillas")
    other = await ctx.new_page()
    for page_name in ("index.html", "bingo.html", "privacy.html", "cookies.html", "404.html", "tech-tree.html"):
        await other.goto("file://" + ROOT + "/" + page_name)
        await other.wait_for_timeout(300)
        await other.click(".lang-btn[data-lang=en]")
        en_labels = await other.evaluate(labels_js)
        await other.click(".lang-btn[data-lang=es]")
        es_labels = await other.evaluate(labels_js)
        await other.click(".lang-btn[data-lang=en]")
        check("aria-labels translated: " + page_name, en_labels and not any(w in l for l in en_labels for w in spanish) and en_labels != es_labels and "Proyectos del archivo" in es_labels, (en_labels, es_labels))
    await other.close()
