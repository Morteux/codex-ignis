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

    # T1506: the P13.8 data texts are written in es and jp ("Ix Belèn" is the same name in Spanish)
    data = node_json("""const {strings:s}=await import('./js/i18n-simulator.js');
      const keys=Object.keys(s.en).filter(k=>/^(planetModifier\\w*(NotModelled\\d+|Source)|bodyInfo\\w+\\d|swapReq\\w+|swapNotModelled\\w+)$/.test(k)&&k!=='planetModifierSource');
      console.log(JSON.stringify({count:keys.length,es:keys.filter(k=>s.es[k]===s.en[k]),jp:keys.filter(k=>s.jp[k]===s.en[k])}))""")
    check("data texts (T1506): the P13.8 texts (not-modelled lines, sources, body type notes, swap conditions) are translated in es and jp",
          data.get("count", 0) >= 240 and data.get("es") == ["planetModifierTheMemorexSource"] and data.get("jp") == [], data)

    # T1507: no other es or jp text of the simulator, the tech tree or the shared texts is still English, apart from
    # the ones that are written the same (proper names, symbols, loanwords); game names come from js/game-names/
    left = node_json("""const out={};const {names:es}=await import('./js/game-names/es.js');const {names:jp}=await import('./js/game-names/jp.js');
      for(const f of ['i18n-simulator','i18n-tech-tree','i18n-common']){const {strings:s}=await import('./js/'+f+'.js');
      for(const [l,n] of [['es',es],['jp',jp]])(out[l]??=[]).push(...Object.keys(s.en).filter(k=>!(k in n)&&String(s[l][k])===String(s.en[k])))}
      console.log(JSON.stringify(out))""")
    same = {"planetSimPageTitle", "buildTimeLineCount", "compareScenarioA", "compareNotApplicable", "techTreeDlc"}
    allowed = {"es": same | {"planetModifierTheMemorexSource", "celestialNaturalHeading", "celestialArtificialHeading", "buildTimeDays", "planetSimTotalLabel",
                             "speciesInfernal", "branchLegal", "comparePops", "conditionsSourceManual", "techTreeKindNormal", "techTreeZoomLabel", "techTreeDaysShort", "techTreeWeightBase", "cookiesLink"},
               "jp": same | {"libraryDialogAccept"}}
    extra = {l: sorted(set(left.get(l, ["?"])) - allowed[l]) for l in allowed}
    check("interface and data texts (T1507): every es and jp text of the simulator and the tech tree is translated", extra == {"es": [], "jp": []}, extra)
    # T1508: one wording per game term (es población / trabajos; jp POP, 志向, 統治形態, 快適度; 権威主義 is the ethic).
    # Functions are searched as source, so the ${pops} placeholders are removed first
    old = node_json("""const {strings:s}=await import('./js/i18n-simulator.js');
      const re={es:/\\bpops?\\b|\\bempleos?\\b/i,jp:/エシック|権威(?!主義)|快適さ|アメニティ|人口/};
      console.log(JSON.stringify(Object.fromEntries(Object.entries(re).map(([l,r])=>[l,Object.keys(s[l]).filter(k=>r.test(String(s[l][k]).replace(/\\$\\{[^}]*\\}/g,'').replace(/^\\([^)]*\\) =>/,'')))]))))""")
    check("interface texts (T1508): es and jp use the game terms (población, trabajos; POP, 志向, 統治形態, 快適度) in every simulator text", old == {"es": [], "jp": []}, old)
    # T1509: jp 職業, 建造物, 区域, 開発構想, 惑星補正 and 民間人. The phrases removed first keep the old word: the official
    # modifier name, "designated" as a verb, Citizen Pop, citizens of a democracy and full citizenship
    old = node_json("""const {strings:s}=await import('./js/i18n-simulator.js');
      const keep=/自動移住確率 \\(指定\\)|指定され|市民POP|すべての市民|完全市民権/g,re=/雇用|建物|地区|指定|惑星の?修正|市民/;
      console.log(JSON.stringify(Object.keys(s.jp).filter(k=>re.test(String(s.jp[k]).replace(keep,'')))))""")
    check("interface texts (T1509): jp uses the game terms for jobs, buildings, districts, designations, planet modifiers and civilians", old == [], old)
    zones = node_json("const o={};for(const l of ['es','jp','fr']){const {names:n}=await import('./js/game-names/'+l+'.js');o[l]=[n.specializationUrbanExpansion,n.districtHollowMountain,n.policyGroupTrade,n.jobMaintenanceDrone]}console.log(JSON.stringify(o))")
    check("game names (T1507): district specializations, wilderness districts, policy groups and jobs take the official names",
          zones.get("es") == ["Expansión urbana", "Montaña hueca", "Política comercial", "Dron de mantenimiento"]
          and zones.get("jp") == ["都市の拡張", "空洞の山", "交易政策", "メンテナンスドローン"] and all(zones.get("fr", [None])), zones)

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
        seen[lang + "-panels"] = await pg.evaluate("()=>['celestialPlanetModifiersHeading','edictsHeading'].map(k=>document.querySelector(`[data-i18n=${k}]`)?.textContent)")
    check("game names (T1502): the simulator shows the official resource names in every language and after switching",
          "Créditos energéticos" in seen["es"] and "エネルギー通貨" in seen["jp"] and "Energy Credits" in seen["en"], seen)
    check("interface texts (T1507): the planet modifier and edict headings are Spanish and Japanese in the simulator",
          seen["es-panels"] == ["Modificadores de planeta", "Edictos"] and seen["jp-panels"] == ["惑星補正", "布告"], (seen["es-panels"], seen["jp-panels"]))
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
    check("game languages (T1503): French in the simulator: <html lang=fr>, official French resource names, French interface (T1505)",
          fr["lang"] == "fr" and fr["select"] == "fr" and fr["active"] and fr["pressed"] == 0 and official["fr"]["energy"] in fr["rows"] and (fr["tab"] or "").lower() == "planète", fr)
    # T1505: the interface of every game language, with only the current language's texts downloaded
    ui = node_json("""const out={en:(await import('./js/i18n-simulator.js')).strings.en.planetSimHeading,texts:{}};
      for(const l of ['pt','fr','de','ko','pl','ru','zh']){const {strings:s}=await import('./js/ui-texts/'+l+'.js');
      out.texts[l]=[s.planetSimHeading,s.planetModifierTidalLockedNotModelled2,s.techTreeHeading]}console.log(JSON.stringify(out))""")
    shown, downloads = {}, []
    pg.on("request", lambda r: "/js/ui-texts/" in r.url and downloads.append(r.url.rsplit("/", 1)[1]))
    for lang in ui.get("texts", {}):
        await pg.select_option(".lang-select", lang)
        await pg.wait_for_timeout(500)
        shown[lang] = await pg.evaluate("""()=>[document.querySelector('[data-i18n=planetSimHeading]').textContent,
          document.querySelector('#celestial-planet-modifiers [data-modifier=tidalLocked] small')?.textContent||'',
          document.querySelector('main').textContent]""")
    check("interface texts (T1505): the simulator shows the heading and the not-modelled lines in each of the 7 game languages",
          len(shown) == 7 and all(shown[l][0] == ui["texts"][l][0] != ui["en"] and ui["texts"][l][1] in shown[l][1] and "undefined" not in shown[l][2] for l in shown),
          {l: (v[0], v[1][:80]) for l, v in shown.items()} or ui)
    check("interface texts (T1505): each language module is downloaded once, when first chosen (French was loaded before)",
          sorted(downloads) == ["de.js", "ko.js", "pl.js", "pt.js", "ru.js", "zh.js"], downloads)
    await pg.select_option(".lang-select", "fr")
    await pg.wait_for_timeout(200)
    await pg.reload()
    await pg.wait_for_timeout(600)
    again = await pg.evaluate("()=>document.querySelector('[data-i18n=planetSimHeading]').textContent")
    check("interface texts (T1505): a stored French choice draws the French interface on load", again == ui.get("texts", {}).get("fr", [None])[0], again)
    await pg.goto("file://" + ROOT + "/index.html")
    await pg.wait_for_timeout(300)
    wiki = await pg.evaluate("()=>[document.documentElement.lang,document.querySelectorAll('.lang-select').length]")
    check("game languages (T1503): the wiki stays es/en/jp: no selector, and a stored French choice shows English", wiki == ["en", 0], wiki)
    await pg.goto("file://" + ROOT + "/tech-tree.html")
    await pg.wait_for_timeout(600)
    tree_fr = await pg.evaluate("()=>[document.documentElement.lang,document.querySelector('.tech-node[data-tech-id=tech_lasers_1] .tech-node-name').textContent]")
    await pg.select_option(".lang-select", "de")
    await pg.wait_for_timeout(500)
    tree_de = await pg.evaluate("()=>[document.documentElement.lang,document.querySelector('.tech-node[data-tech-id=tech_lasers_1] .tech-node-name').textContent,document.getElementById('tech-jump-physics').textContent]")
    heading_de = await pg.evaluate("()=>document.querySelector('[data-i18n=techTreeHeading]').textContent")
    check("interface texts (T1505): the tech tree interface is German", heading_de == ui.get("texts", {}).get("de", [None] * 3)[2], heading_de)
    await pg.select_option(".lang-select", "zh")
    await pg.wait_for_timeout(500)
    tree_zh = await pg.evaluate("()=>[document.documentElement.lang,document.getElementById('tech-jump-physics').textContent]")
    await pg.click(".lang-btn[data-lang=en]")
    await pg.wait_for_timeout(200)
    after = await pg.evaluate("()=>[document.documentElement.lang,document.querySelector('.lang-select').value,document.querySelector('.tech-node[data-tech-id=tech_lasers_1] .tech-node-name').textContent]")
    check("game languages (T1503): the tech tree keeps the stored French and switches to German and Chinese with the official names",
          tree_fr[0] == "fr" and tree_de == ["de", official["de"]["laser"], official.get("de", {}).get("physics") or tree_de[2]] and tree_de[1] != "Red Lasers"
          and tree_zh == ["zh-Hans", official["zh"]["physics"]] and after == ["en", "", "Red Lasers"], (tree_fr, tree_de, tree_zh, after))
    check("game languages (T1503): no page errors", not errors, errors)
    await pg.close()
