"""Official game names (P15, LOCALISATION_PLAN.md): js/game-names/<lang>.js over the hand-written texts."""
import json, os, subprocess
from smoke.common import ROOT, URL, check


def node_json(code):
    out = subprocess.run(["node", "--input-type=module", "-e", code], capture_output=True, text=True, encoding="utf-8", cwd=ROOT)
    try:
        return json.loads(out.stdout)
    except ValueError:
        return {"error": out.stderr[-400:]}


async def run(t):
    keys = json.load(open(os.path.join(ROOT, "data", "localisation", "game-name-keys.json"), encoding="utf-8"))["keys"]
    names = node_json("const o={};for(const l of ['es','en','jp']){o[l]=(await import('./js/game-names/'+l+'.js')).names}console.log(JSON.stringify(o))")
    check("game names (T1502): the key map links names to game ids (jobMiner -> jobs/miner, resourceEnergy -> resources/energy, civicCorveeSystem -> civics/civic_corvee_system)",
          keys.get("jobMiner") == "jobs/miner" and keys.get("resourceEnergy") == "resources/energy" and keys.get("civicCorveeSystem") == "civics/civic_corvee_system", len(keys))
    check("game names (T1502): es/en/jp modules hold the official strings (Minero / Miner / 鉱山労働者, Créditos energéticos / Energy Credits / エネルギー通貨)",
          [names.get(l, {}).get("jobMiner") for l in ("es", "en", "jp")] == ["Minero", "Miner", "鉱山労働者"]
          and [names.get(l, {}).get("resourceEnergy") for l in ("es", "en", "jp")] == ["Créditos energéticos", "Energy Credits", "エネルギー通貨"],
          {l: (names.get(l, {}).get("jobMiner"), names.get(l, {}).get("resourceEnergy")) for l in ("es", "en", "jp")})
    grouped = node_json("const o={};for(const l of ['es','en','jp']){const m=await import('./js/game-names/'+l+'.js');o[l]=[m.names.civicAnglers,m.names.civicDevouringSwarm,m.names.civicCorporateAnglers]}console.log(JSON.stringify(o))")
    check("grouped civics (T1504): a key that groups several civics under one card links every game civic and joins their official names",
          keys.get("civicAnglers") == ["civics/civic_anglers", "civics/civic_machine_anglers"] and len(keys.get("civicDevouringSwarm", [])) == 3
          and grouped.get("es", [None])[0] == "Pescadores / Máquinas marinas" and grouped.get("en", [None, None])[1] == "Devouring Swarm / Terravore / Devouring Wilderness"
          and all(" / " in n for l in ("es", "en", "jp") for n in grouped.get(l, [""])), grouped)
    check("grouped civics (T1504): no civic or origin name of es or jp is an English placeholder any more (every one without an official string is translated)",
          not node_json("""const {strings:e}=await import('./js/i18n-empire-names.js');const {strings:s}=await import('./js/i18n-simulator.js');const {names}=await import('./js/game-names/es.js');const {names:jn}=await import('./js/game-names/jp.js');
            const es={...s.es,...e.es},en={...s.en,...e.en},jp={...s.jp,...e.jp};
            console.log(JSON.stringify(Object.keys(en).filter(k=>/^(civic|origin)[A-Z]/.test(k)&&typeof en[k]==='string'&&!(k in names&&k in jn)&&(es[k]===en[k]||jp[k]===en[k]))))"""), "placeholders")

    pg = await t.ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.goto(URL)
    await pg.wait_for_timeout(500)
    rows = "()=>[...document.querySelectorAll('#planet-production-net .planet-resource-name')].map(x=>x.innerText.trim())"
    seen = {}
    for lang in ("es", "jp", "en"):
        await pg.click(f".lang-btn[data-lang={lang}]")
        await pg.wait_for_timeout(400)  # the names module of a language not loaded yet arrives after the first redraw
        seen[lang] = await pg.evaluate(rows)
    check("game names (T1502): the simulator shows the official resource names in every language and after switching",
          "Créditos energéticos" in seen["es"] and "エネルギー通貨" in seen["jp"] and "Energy Credits" in seen["en"], seen)
    check("game names (T1502): simulator without page errors", not errors, errors)
    await pg.close()

    pg = await t.ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.goto("file://" + ROOT + "/bingo.html")
    await pg.wait_for_timeout(500)
    await pg.select_option("#bingo-type", "principles")
    await pg.click(".lang-btn[data-lang=es]")
    await pg.wait_for_timeout(400)
    text = await pg.evaluate("()=>document.getElementById('bingo-type').closest('main').innerHTML")  # principle names are tooltips
    await pg.click(".lang-btn[data-lang=en]")
    await pg.wait_for_timeout(200)
    check("game names (T1502): the bingo shows official civic names (es: Agrarian Idyll is Sociedad bucólica)", "Sociedad bucólica" in text and "Idilio Agrario" not in text)
    check("game names (T1502): bingo without page errors", not errors, errors)
    await pg.close()

    # T1503: the planet simulator and the tech tree in every official game language
    official = node_json("const o={};for(const l of ['fr','de','zh','ko']){const m=await import('./js/game-names/'+l+'.js');o[l]={energy:m.names.resourceEnergy,laser:m.technologies.tech_lasers_1,physics:m.techAreas.physics}}console.log(JSON.stringify(o))")
    check("game languages (T1503): every game language module has the official names (French energy, German lasers, Chinese physics)",
          all(official.get(l, {}).get(k) for l in ("fr", "de", "zh", "ko") for k in ("energy", "laser", "physics")) and official["fr"]["energy"] != "Energy Credits", official)
    pg = await t.ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.set_viewport_size({"width": 1280, "height": 900})
    await pg.goto(URL)
    await pg.wait_for_timeout(500)
    options = await pg.evaluate("()=>[...document.querySelectorAll('.lang-switch .lang-select option')].map(o=>o.value+':'+(o.lang||''))")
    await pg.select_option(".lang-select", "fr")
    await pg.wait_for_timeout(500)
    fr = await pg.evaluate("""()=>({lang:document.documentElement.lang,select:document.querySelector('.lang-select').value,active:document.querySelector('.lang-select').classList.contains('is-active'),
      pressed:[...document.querySelectorAll('.lang-btn[aria-pressed=true]')].length,
      rows:[...document.querySelectorAll('#planet-production-net .planet-resource-name')].map(x=>x.innerText.trim()),
      tab:document.querySelector('.planet-main-tab[data-main-tab=planet]')?.innerText.trim()})""")
    check("game languages (T1503): the simulator offers the 7 other game languages in a selector next to ES/EN/JP",
          options == [":", "pt:pt-BR", "fr:fr", "de:de", "ko:ko", "pl:pl", "ru:ru", "zh:zh-Hans"], options)
    check("game languages (T1503): French in the simulator: <html lang=fr>, official French resource names, English interface (T1505)",
          fr["lang"] == "fr" and fr["select"] == "fr" and fr["active"] and fr["pressed"] == 0 and official["fr"]["energy"] in fr["rows"] and (fr["tab"] or "").lower() == "planet", fr)
    await pg.goto("file://" + ROOT + "/index.html")
    await pg.wait_for_timeout(300)
    wiki = await pg.evaluate("()=>[document.documentElement.lang,document.querySelectorAll('.lang-select').length]")
    check("game languages (T1503): the wiki stays es/en/jp: no selector, and a stored French choice shows English", wiki == ["en", 0], wiki)
    await pg.goto("file://" + ROOT + "/tech-tree.html")
    await pg.wait_for_timeout(600)
    tree_fr = await pg.evaluate("()=>[document.documentElement.lang,document.querySelector('.tech-node[data-tech-id=tech_lasers_1] .tech-node-name').textContent]")
    await pg.select_option(".lang-select", "de")
    await pg.wait_for_timeout(500)
    tree_de = await pg.evaluate("()=>[document.documentElement.lang,document.querySelector('.tech-node[data-tech-id=tech_lasers_1] .tech-node-name').textContent,document.getElementById('tech-tab-physics').textContent]")
    await pg.select_option(".lang-select", "zh")
    await pg.wait_for_timeout(500)
    tree_zh = await pg.evaluate("()=>[document.documentElement.lang,document.getElementById('tech-tab-physics').textContent]")
    await pg.click(".lang-btn[data-lang=en]")
    await pg.wait_for_timeout(200)
    after = await pg.evaluate("()=>[document.documentElement.lang,document.querySelector('.lang-select').value,document.querySelector('.tech-node[data-tech-id=tech_lasers_1] .tech-node-name').textContent]")
    check("game languages (T1503): the tech tree keeps the stored French and switches to German and Chinese with the official names",
          tree_fr[0] == "fr" and tree_de == ["de", official["de"]["laser"], official.get("de", {}).get("physics") or tree_de[2]] and tree_de[1] != "Red Lasers"
          and tree_zh == ["zh-Hans", official["zh"]["physics"]] and after == ["en", "", "Red Lasers"], (tree_fr, tree_de, tree_zh, after))
    check("game languages (T1503): no page errors", not errors, errors)
    await pg.close()
