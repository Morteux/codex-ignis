"""Planet simulator: UI smoke (tabs, planet save/load round trip, empire switch) and accessibility (P13.3, P13.4)."""
import os, re
from smoke.common import check, ROOT


async def run(t):
    pg, tab, net, selected_policy, ethic = t.pg, t.tab, t.net, t.selected_policy, t.ethic
    # P23.9: one module of text helpers, no local copies left in the simulator modules
    helpers = await pg.evaluate("""async()=>{const m=await import('./js/sim-text-helpers.js');
        return [m.num(2),m.num(-0.5),m.pct(0.125),m.pct(-0.1),m.swapJobI18nKey('foundry_drone'),m.resourceName('en','minerals'),m.resourceName('en','navalCapacity'),m.jobName('en','miner')]}""")
    copies = [f for f in ("edicts-ui.js", "branch-offices-ui.js", "planet-sim-text.js", "job-swaps.js")
              if re.search(r"(?:const|function)\s+(?:sign|num|pct|pascal|swapJobI18nKey)\b|toUpperCase\(\) \+|RESOURCES\[resourceId\]\.i18nKey|JOBS\[jobId\]\.i18nKey", open(os.path.join(ROOT, "js", f), encoding="utf-8").read())]
    check("text helpers: sign/num/pct, resource and job names come from js/sim-text-helpers.js only",
          helpers == ["+2", "−0.5", "+12.5%", "−10%", "jobFoundryDrone", "Minerals", "navalCapacity", "Miner"] and not copies, (helpers, copies))
    # P13.3: UI smoke — tabs, planet save/load round trip, empire switch
    await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
    tab_names = ["library", "planet", "empire", "body", "edicts", "branches"]
    for name in tab_names:
        await tab(name)
        vis = await pg.evaluate("(n)=>[...document.querySelectorAll('.planet-main-tab')].map(b=>[b.dataset.mainTab,b.classList.contains('is-active'),!document.getElementById('planet-tab-panel-'+b.dataset.mainTab).hidden])", name)
        check("tabs: " + name + " shows only its panel and is the active tab", all((k == name) == a == v for k, a, v in vis), vis)
    await tab("planet")
    await pg.evaluate("()=>{document.querySelectorAll('#planet-catalog details').forEach(d=>d.open=true);[...document.querySelectorAll('#planet-catalog button')].find(b=>/Commercial Zones/.test(b.innerText)).click()}")
    await pg.fill("#planet-size-input", "15"); await pg.dispatch_event("#planet-size-input", "input")
    await pg.fill("#planet-summary-name", "Smoke planet")
    built = lambda: pg.evaluate("()=>[...document.querySelectorAll('.planet-slot.is-filled:not(.is-capital) img')].map(i=>i.alt)")
    before = [await built(), await net()]
    await pg.click("#planet-summary-save"); await pg.wait_for_timeout(300)
    stored = await pg.evaluate("()=>JSON.parse(localStorage.getItem('codex-ignis-planets')||'[]').map(p=>[p.name,p.planetSize])")
    check("save: planet stored with its name and size", stored == [["Smoke planet", 15]], stored)
    await pg.reload(); await pg.wait_for_timeout(500)
    await pg.fill("#planet-size-input", "10"); await pg.dispatch_event("#planet-size-input", "input")
    await tab("library")
    cards = await pg.evaluate("()=>[...document.querySelectorAll('#library-planets .library-card-title')].map(x=>x.innerText)")
    check("library: saved planet listed after a reload", cards == ["Smoke planet"], cards)
    await pg.evaluate("()=>document.querySelector('#library-planets .library-card .is-primary').click()"); await pg.wait_for_timeout(400)
    after = [await built(), await net()]
    loaded = await pg.evaluate("()=>[document.querySelector('#planet-size-input').value,document.querySelector('#planet-summary-name').value,!document.getElementById('planet-tab-panel-planet').hidden]")
    check("load: size, name, buildings and production restored, Planet tab shown", loaded == ["15", "Smoke planet", True] and after == before and before[0], (loaded, before, after))
    await tab("empire")
    await pg.fill("#empire-profile-name", "Alpha"); await pg.click("#empire-profile-save-new")
    await ethic("Gestalt Consciousness")
    await pg.fill("#empire-profile-name", "Beta"); await pg.click("#empire-profile-save-new")
    ids = await pg.evaluate("()=>Object.fromEntries(JSON.parse(localStorage.getItem('codex-ignis-empires')).map(e=>[e.name,e.id]))")
    await pg.select_option("#planet-summary-empire", ids["Alpha"]); await pg.wait_for_timeout(300)
    check("empire switch: Alpha (individualist) policies", await selected_policy("Trade Policy") == "Wealth Creation" and await pg.input_value("#planet-summary-empire") == ids["Alpha"])
    await pg.select_option("#planet-summary-empire", ids["Beta"]); await pg.wait_for_timeout(300)
    check("empire switch: Beta (gestalt) policies", await selected_policy("Logistics Policy") == "Logistics Policy")
    await ethic("Gestalt Consciousness")
    await pg.select_option("#planet-summary-empire", ids["Alpha"]); await pg.wait_for_timeout(300)
    dialog = await pg.evaluate("()=>!!document.querySelector('.confirm-dialog')")
    await pg.evaluate("()=>[...document.querySelectorAll('.confirm-btn')].find(b=>/cancel/i.test(b.innerText))?.click()"); await pg.wait_for_timeout(300)
    kept = await pg.evaluate("()=>[document.querySelector('#planet-summary-empire').value,document.querySelector('#planet-summary-empire').classList.contains('is-modified')]")
    check("empire switch with unsaved changes: dialog, Cancel keeps the modified empire", dialog and kept == [ids["Beta"], True], (dialog, kept))
    await pg.select_option("#planet-summary-empire", ids["Alpha"]); await pg.wait_for_timeout(300)
    await pg.evaluate("()=>[...document.querySelectorAll('.confirm-btn')].find(b=>/don't save/i.test(b.innerText))?.click()"); await pg.wait_for_timeout(300)
    beta = await pg.evaluate("(id)=>JSON.parse(localStorage.getItem('codex-ignis-empires')).find(e=>e.id===id).ethicIds", ids["Beta"])
    check("empire switch: Don't save drops the change and loads Alpha", await pg.input_value("#planet-summary-empire") == ids["Alpha"] and "gestaltConsciousness" in beta, beta)
    await pg.reload(); await pg.wait_for_timeout(500)
    check("empire switch: last empire kept after a reload", await pg.input_value("#planet-summary-empire") == ids["Alpha"])

    # P13.4: accessibility — ARIA tabs with arrow keys, and every visible control has an accessible name
    await tab("planet")
    aria = await pg.evaluate("()=>[...document.querySelectorAll('[role=tablist]')].map(l=>[...l.querySelectorAll('[role=tab]')].map(b=>[b.getAttribute('aria-selected'),b.tabIndex,!!document.getElementById(b.getAttribute('aria-controls'))&&document.getElementById(b.getAttribute('aria-controls')).getAttribute('role')==='tabpanel']))")
    check("a11y: tabs have role, aria-selected, roving tabindex and a tabpanel", len(aria) == 2 and all(sum(s == "true" for s, _, _ in tl) == 1 and all((s == "true") == (i == 0) and p for s, i, p in tl) for tl in aria), aria)
    await pg.focus("#planet-main-tab-planet")
    await pg.keyboard.press("ArrowRight")
    k1 = await pg.evaluate("()=>[document.activeElement.id,document.getElementById('planet-main-tab-empire').getAttribute('aria-selected'),!document.getElementById('planet-tab-panel-empire').hidden]")
    await pg.keyboard.press("End"); await pg.keyboard.press("ArrowRight")
    k2 = await pg.evaluate("()=>[document.activeElement.id,!document.getElementById('planet-tab-panel-library').hidden]")
    await pg.keyboard.press("Home"); await pg.keyboard.press("ArrowLeft")
    k3 = await pg.evaluate("()=>document.activeElement.id")
    check("a11y: Arrow/Home/End move between the main tabs and activate them", k1 == ["planet-main-tab-empire", "true", True] and k2 == ["planet-main-tab-library", True] and k3 == "planet-main-tab-branches", (k1, k2, k3))
    await tab("planet")
    await pg.focus("#planet-tab-buildings"); await pg.keyboard.press("ArrowRight")
    k4 = await pg.evaluate("()=>[document.activeElement.id,document.querySelector('#planet-tab-districts').getAttribute('aria-selected'),!document.getElementById('planet-districts-catalog').hidden]")
    check("a11y: arrow keys switch Buildings / Districts", k4 == ["planet-tab-districts", "true", True], k4)
    await pg.keyboard.press("ArrowLeft")
    unnamed = []
    for name in tab_names:
        await tab(name)
        unnamed += await pg.evaluate("""()=>[...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea')].filter(e=>!e.closest('[hidden]')&&e.offsetParent!==null).filter(e=>{
            if(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.closest('label')||(e.id&&document.querySelector(`label[for="${e.id}"]`)))return false;
            const txt=['INPUT','SELECT','TEXTAREA'].includes(e.tagName)?'':(e.innerText||'').trim();
            return !(txt.length>2||[...e.querySelectorAll('img')].some(i=>i.alt)||(e.title&&e.tagName==='BUTTON'))}).map(e=>e.tagName+'.'+e.className+'#'+e.id+' '+(e.innerText||'').trim())""")
    check("a11y: every visible control has an accessible name", not unnamed, sorted(set(unnamed))[:20])
    await pg.click(".lang-btn[data-lang=es]")
    es_labels = await pg.evaluate("()=>[document.querySelector('.planet-main-tabs').getAttribute('aria-label'),document.querySelector('.planet-count-btn')?.getAttribute('aria-label')]")
    await pg.click(".lang-btn[data-lang=en]")
    en_labels = await pg.evaluate("()=>[document.querySelector('.planet-main-tabs').getAttribute('aria-label'),document.querySelector('.planet-count-btn')?.getAttribute('aria-label')]")
    check("a11y: screen-reader labels follow the language", es_labels[0] == "Secciones del planeta" and en_labels[0] == "Planet sections" and (en_labels[1] or "").startswith("Remove one district") and (es_labels[1] or "").startswith("Quitar un distrito"), (es_labels, en_labels))
    await tab("planet")
