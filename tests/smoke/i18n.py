"""i18n: "i" buttons, key parity per text area, value types, used keys, audit, text areas each page loads, data files keep keys (P17.6, P13.2, P23.4, P13.8)."""
import os, subprocess
from smoke.common import check, ROOT


async def run(t):
    ctx, pg, tab = t.ctx, t.pg, t.tab
    # P17.6: i18n key parity (es/en/jp) and every "i" button: has its panel, toggles with Enter and Space, aria-expanded in sync
    # P23.4: the texts are split by area (js/i18n-<area>.js); parity is checked per area file
    i18n_areas = sorted(f for f in os.listdir(os.path.join(ROOT, "js")) if f.startswith("i18n-") and f.endswith(".js"))
    parity = await pg.evaluate("""async(areas)=>{const out={enNotEs:[],esNotEn:[],enNotJp:[],jpNotEn:[],twoAreas:[]};const owner={};
        for(const f of areas){const m=await import('./js/'+f);const k=(l)=>new Set(Object.keys(m.strings[l]));const es=k('es'),en=k('en'),jp=k('jp');
          const diff=(a,b)=>[...a].filter(x=>!b.has(x)).map(x=>f+':'+x);
          out.enNotEs.push(...diff(en,es));out.esNotEn.push(...diff(es,en));out.enNotJp.push(...diff(en,jp));out.jpNotEn.push(...diff(jp,en));
          for(const x of es){if(owner[x])out.twoAreas.push(x+' '+owner[x]+' '+f);owner[x]=f}}
        return out}""", i18n_areas)
    check("i18n key parity es/en/jp", not any(parity.values()), parity)
    # P13.2: same value type/arity and no empty text per language, and every key used by data-i18n* / t('key') exists
    sim_modules = sorted("js/" + f for f in os.listdir(os.path.join(ROOT, "js")) if f.startswith("planet-sim-") and f.endswith(".js"))
    deep = await pg.evaluate("""async([simModules,areas])=>{
        const s={es:{},en:{},jp:{}};for(const f of areas){const m=await import('./js/'+f);for(const l in s)Object.assign(s[l],m.strings[l])};const bad=[];
        for(const l of ['es','jp'])for(const k of Object.keys(s.en)){const a=s.en[k],b=s[l][k];
            if(typeof a!==typeof b)bad.push('type '+l+' '+k);
            else if(typeof b==='string'&&!b.trim())bad.push('empty '+l+' '+k);
            else if(typeof a==='function'&&a.length!==b.length)bad.push('arity '+l+' '+k)}
        const files=['planet-sim.html','index.html','js/planet-sim.js',...simModules,'js/app.js','js/empire.js','js/edicts-ui.js','js/branch-offices-ui.js','js/info-panels.js','js/stockpile-timeline.js','js/planet-library-ui.js','js/planet-summary.js','js/scenario-compare.js','js/job-swaps.js'];
        for(const f of files){const r=await fetch(f);if(!r.ok)continue;const t=await r.text();
            for(const x of t.matchAll(/data-i18n(?:-[a-z]+)?="([\\w.]+)"/g))if(!(x[1] in s.en))bad.push('missing '+x[1]+' @'+f);
            for(const x of t.matchAll(/\\bt\\(\\s*["'`](\\w+)["'`]/g))if(!(x[1] in s.en))bad.push('missing '+x[1]+' @'+f)}
        return bad}""", [sim_modules, i18n_areas])
    check("i18n values: same type/arity, none empty, used keys exist", not deep, deep)
    audit = subprocess.run(["node", os.path.join(ROOT, "tests", "i18n-audit.mjs"), ROOT], capture_output=True, text=True)
    check("i18n audit: parity per area, no key in two areas, every page loads the areas of the keys it uses", audit.returncode == 0, audit.stdout[-600:] + audit.stderr[-300:])
    loaded = {}
    for page_name in ("index.html", "bingo.html", "planet-sim.html", "tech-tree.html", "privacy.html"):
        area_page = await ctx.new_page()
        area_files = []
        area_page.on("request", lambda r: "/js/i18n-" in r.url and area_files.append(r.url.rsplit("/js/", 1)[1]))
        await area_page.goto("file://" + ROOT + "/" + page_name)
        await area_page.wait_for_timeout(300)
        loaded[page_name] = sorted(set(area_files))
        await area_page.close()
    expected = {"index.html": ["i18n-common.js", "i18n-wiki.js"], "bingo.html": ["i18n-bingo-game.js", "i18n-bingo.js","i18n-common.js", "i18n-empire-names.js"],
                "planet-sim.html": ["i18n-common.js", "i18n-empire-names.js", "i18n-simulator.js"], "tech-tree.html": ["i18n-common.js", "i18n-tech-tree.js"],
                "privacy.html": ["i18n-common.js", "i18n-legal.js"]}
    check("i18n: every page downloads only the text areas it uses", loaded == expected, loaded)
    # P13.8: data files keep i18n keys, never shown text; every key they name exists in es/en/jp
    datakeys = await pg.evaluate("""async(areas)=>{const s={es:{},en:{},jp:{}};for(const f of areas){const m=await import('./js/'+f);for(const l in s)Object.assign(s[l],m.strings[l])};const bad=[];let n=0;
        const mods=['planet-modifier-data','body-type-data','job-swap-data'];
        const keyField=/^(i18nKey|sourceKey|notModelledKeys|infoOnlyKeys)$/;
        const walk=(v,path)=>{if(Array.isArray(v))v.forEach((x,i)=>walk(x,path+'['+i+']'));else if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){
            if(/^(name|source|notModelled|infoOnly)$/.test(k))bad.push('raw text field '+path+'.'+k);
            if(keyField.test(k))for(const key of [].concat(x)){n++;for(const l of ['es','en','jp'])if(typeof s[l][key]!=='string')bad.push('missing '+l+' '+key+' @'+path)}
            else walk(x,path+'.'+k)}};
        for(const f of mods){const m=await import('./js/'+f+'.js');for(const [k,v] of Object.entries(m))walk(v,f+':'+k)}
        const swaps=(await import('./js/job-swap-data.js')).JOB_SWAPS;
        for(const w of swaps){n++;const key='job'+w.id.split('_').map(p=>p[0].toUpperCase()+p.slice(1)).join('');if(!(key in s.en)||!(key in s.es)||!(key in s.jp))bad.push('missing swap name '+key)}
        return {n,bad}}""", i18n_areas)
    check("data texts: i18n keys only, all present in es/en/jp", datakeys["n"] > 300 and not datakeys["bad"], datakeys)
    await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
    await tab("body")
    tip = await pg.evaluate("()=>[...document.querySelectorAll('.celestial-type-card')].map(c=>c.title).find(x=>x.includes('Not computed'))||''")
    check("body type card tooltip lists the effects not computed", "habitability" in tip.lower(), tip)
    note_js = "()=>document.querySelector('#celestial-planet-modifiers [data-modifier=tidalLocked] small')?.textContent||''"
    ptxt = await pg.evaluate(note_js)
    check("planet modifier: not-modelled effects shown from i18n keys", "Not modelled:" in ptxt and "Day Farm Construction" in ptxt and "planetModifier" not in ptxt, ptxt[:300])
    await pg.click(".lang-btn[data-lang=es]")
    ptxt_es = await pg.evaluate(note_js)
    await pg.click(".lang-btn[data-lang=jp]")
    await pg.wait_for_timeout(400)
    ptxt_jp = await pg.evaluate(note_js)
    await pg.click(".lang-btn[data-lang=en]")
    check("planet modifier notes are Spanish in es (T1506)", "No modelado:" in ptxt_es and "Construcción de granja diurna" in ptxt_es and "planetModifier" not in ptxt_es, ptxt_es[:300])
    check("planet modifier notes are Japanese in jp (T1506)", "未モデル化：" in ptxt_jp and "昼側発電所の建設" in ptxt_jp and "planetModifier" not in ptxt_jp, ptxt_jp[:300])
    await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
    buttons = await pg.evaluate("()=>[...document.querySelectorAll('.info-btn')].map(b=>[b.id,b.closest('section[id^=planet-tab-panel-]')?.id.replace('planet-tab-panel-','')||'planet'])")
    check("info buttons found", len(buttons) >= 7, buttons)
    for bid, tabname in buttons:
        await tab(tabname)
        pid = bid.replace("-info-btn", "-info")
        await pg.evaluate("(b)=>{const x=document.getElementById(b);if(x.getAttribute('aria-expanded')==='true')x.click()}", bid)
        state0 = await pg.evaluate("(b)=>document.getElementById(b).getAttribute('aria-expanded')", bid)
        await pg.focus("#" + bid)
        await pg.keyboard.press("Enter")
        s1 = await pg.evaluate("([b,p])=>{const btn=document.getElementById(b),panel=document.getElementById(p);return [btn.getAttribute('aria-controls')===p,!!panel,panel&&!panel.hidden,btn.getAttribute('aria-expanded'),panel?panel.innerText.trim().length:0]}", [bid, pid])
        await pg.keyboard.press("Space")
        s2 = await pg.evaluate("([b,p])=>[document.getElementById(p).hidden,document.getElementById(b).getAttribute('aria-expanded')]", [bid, pid])
        ok = state0 == "false" and s1[0] and s1[1] and s1[2] and s1[3] == "true" and s1[4] > 0 and s2 == [True, "false"]
        check("info button " + bid + ": panel, Enter/Space, aria-expanded", ok, (state0, s1, s2))
