"""Tech tree data (section 30): the test fixture, the data validations and the data files."""
import glob, json, os, re, subprocess, sys, tempfile, threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from smoke.common import check, ROOT

FIXTURE = "tests/fixtures/tech-tree/tech-data-fixture.js"
# Local copy of the StellarisAssets repository (same default as tools/extract/pdx/icons.py)
ASSETS_DIR = os.environ.get("STELLARIS_ASSETS_DIR", "C:/Users/ignis/OneDrive/Documentos/StellarisAssets")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def node_json(script):
    """Runs an ES module snippet with node from the project root and returns its printed JSON."""
    out = subprocess.run(["node", "--input-type=module", "-e", script], capture_output=True, text=True, cwd=ROOT)
    try:
        return json.loads(out.stdout)
    except ValueError:
        return {"error": out.stdout[-300:] + out.stderr[-300:]}


async def run(t):
    # T3001: the fixture covers every area, kind and tier, has prerequisite chains and requirements, and no page loads it
    fx = node_json("import {TECH_DATA as d} from './%s'; const T=d.technologies;"
                   "console.log(JSON.stringify({n:T.length,areas:[...new Set(T.map(x=>x.area))].sort(),kinds:[...new Set(T.map(x=>x.kind))].sort(),"
                   "tiers:[...new Set(T.map(x=>x.tier))].sort(),chains:T.filter(x=>x.prerequisites.length).length,multi:T.filter(x=>x.prerequisites.length>1).length,"
                   "req:T.filter(x=>x.requirements.length).length,notReq:T.filter(x=>x.requirements.some(r=>r.not)).length,"
                   "fake:T.every(x=>x.id.startsWith('tech_fixture_')&&x.name.startsWith('Fixture '))}))" % FIXTURE)
    check("tech tree fixture: a few dozen fake techs covering every area, kind and tier, prerequisite chains and requirements",
          fx.get("n", 0) >= 30 and fx.get("areas") == ["engineering", "physics", "society"]
          and fx.get("kinds") == ["acquisition", "dangerous", "event", "normal", "rare", "repeatable", "starter"]
          and fx.get("tiers") == [0, 1, 2, 3, 4, 5] and fx.get("chains", 0) >= 20 and fx.get("multi", 0) >= 3
          and fx.get("req", 0) >= 3 and fx.get("notReq", 0) >= 1 and fx.get("fake"), fx)
    site_files = [os.path.join(ROOT, f) for f in os.listdir(ROOT) if f.endswith(".html")] + glob.glob(os.path.join(ROOT, "js", "*.js"))
    leaks = [os.path.basename(f) for f in site_files if "tests/fixtures" in open(f, encoding="utf-8").read()]
    check("tech tree fixture: never loaded by a page or module of the site", not leaks, leaks)

    # T3002: the data validations pass on the fixture and on every real data file, and catch broken data
    data_check = subprocess.run(["node", os.path.join(ROOT, "tests", "tech-data-check.mjs"), ROOT], capture_output=True, text=True)
    check("tech tree data: unique ids, area / field / tier / kind, known prerequisites and no cycles; self-tests catch broken data",
          data_check.returncode == 0 and data_check.stdout.rstrip().endswith("problems 0"), data_check.stdout[-600:] + data_check.stderr[-300:])

    # T3005: the 4.5.4 data file is the current build of the extractor output, with every technology
    real = "js/tech-data/stellaris-pc-4.5.4.js"
    with tempfile.TemporaryDirectory() as tmp:
        fresh = os.path.join(tmp, "tech.js")
        build = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "extract", "build_tech_data.py"),
                                "--data", os.path.join(ROOT, "data", "generated", "stellaris-pc-4.5.4"), "--out", fresh], capture_output=True, text=True)
        # text mode reads CRLF and LF alike (git may check the file out with CRLF)
        same = build.returncode == 0 and open(fresh, encoding="utf-8").read() == open(os.path.join(ROOT, real), encoding="utf-8").read()
    check("tech tree data 4.5.4: the data file matches a fresh build of the extractor output", same, build.stdout[-200:] + build.stderr[-300:])
    with open(os.path.join(ROOT, "data", "generated", "stellaris-pc-4.5.4", "technologies.json"), encoding="utf-8") as f:
        extracted = json.load(f)["items"]
    rd = node_json("import {TECH_DATA as d} from './%s'; const T=d.technologies; const k=(n)=>T.filter(x=>x.kind===n).length;"
                   "console.log(JSON.stringify({n:T.length,ids:T.map(x=>x.id),event:T.filter(x=>x.flags.includes('event')).length,"
                   "repeatable:k('repeatable'),rep:T.filter(x=>x.repeatable).length,starter:k('starter'),rule:d.rulesetId}))" % real)
    check("tech tree data 4.5.4: every extracted technology, event and repeatable ones included",
          rd.get("rule") == "stellaris-pc-4.5.4" and rd.get("ids") == [x["id"] for x in extracted]
          and rd.get("event") == sum(1 for x in extracted if x["flags"]["event"]) > 0
          and rd.get("repeatable") == rd.get("rep") == sum(1 for x in extracted if x["flags"]["repeatable"]) > 0 and rd.get("starter", 0) > 0,
          {k: v for k, v in rd.items() if k != "ids"})

    # T3007: unlocks linked to simulator ids through the game ids; every linked id exists in the simulator
    sys.path.insert(0, os.path.join(ROOT, "tools", "extract"))
    import report_differences as rdiff
    sim_ids = {k: {s.id for s in v} for k, v in rdiff.sim_items(rdiff.load_simulator()).items()}
    links = node_json("import {TECH_DATA as d} from './%s'; const U=d.technologies.flatMap(t=>t.unlocks);"
                      "console.log(JSON.stringify({sim:U.filter(u=>u.sim).map(u=>[u.type,u.id,u.sim.collection,u.sim.id]),"
                      "jobs:U.flatMap(u=>(u.jobs||[]).filter(j=>j.sim).map(j=>j.sim)),"
                      "mat:U.find(u=>u.id==='building_engineering_facility_1')}))" % real)
    sim_links = links.get("sim", [])
    bad = [l for l in sim_links if l[2] != {"building": "buildings", "district": "districts"}.get(l[0]) or l[3] not in sim_ids.get(l[2], ())]
    bad += [j for j in links.get("jobs", []) if j not in sim_ids["jobs"]]
    mat = links.get("mat") or {}
    check("tech tree data: unlocked buildings, districts and their jobs linked to existing simulator ids (Materials Workshop → materials_workshop, engineer)",
          not bad and {l[2] for l in sim_links} == {"buildings", "districts"} and len(links.get("jobs", [])) > 0
          and mat.get("sim") == {"collection": "buildings", "id": "materials_workshop"} and {"id": "engineer", "sim": "engineer"} in mat.get("jobs", []),
          {"bad": bad[:10], "mat": mat})

    # T3006: the technologies collection is registered, unverified, with its own version, outside the simulator summary
    reg = node_json("import * as v from './js/data-version.js'; import {TECH_DATA as d} from './%s'; const c=v.DATA_COLLECTIONS.technologies||{};"
                    "const sim=Object.values(v.DATA_COLLECTIONS).filter(x=>!x.tool).length;"
                    "console.log(JSON.stringify({file:c.file,status:c.verification,rule:c.rulesetId===d.rulesetId,tool:c.tool,"
                    "simCount:Object.values(v.verificationSummary()).reduce((a,b)=>a+b,0),sim,tech:v.verificationSummary('tech-tree')}))" % real)
    check("tech tree data: technologies registered in data-version.js as unverified 4.5.4, not counted in the simulator summary",
          reg.get("file") == real and reg.get("status") == "unverified" and reg.get("rule") and reg.get("tool") == "tech-tree"
          and reg.get("simCount") == reg.get("sim") and reg.get("tech") == {"unverified": 1}, reg)

    # T3003: reserved icon slot — fixed-size frame, lazy image, a missing file leaves it empty with no layout shift
    pg = await t.ctx.new_page()
    await pg.goto("file://" + ROOT + "/tech-tree.html")
    slots = await pg.evaluate("""async (root)=>{
      const m = await import(root + '/js/tech-tree-icons.js');
      const row = (tech, size, base) => {
        const r = document.createElement('div'); r.style.cssText = 'display:flex;align-items:center;gap:4px';
        const label = document.createElement('span'); label.textContent = 'Fixture name';
        const slot = m.createTechIconSlot(tech, size, base); r.append(slot, label); document.body.append(r);
        return {r, slot, label};
      };
      const box = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height), Math.round(b.left)]; };
      const missing = row({icon: 'technologies/tech_fixture_missing.png'}, 'node', root + '/nowhere/');
      const found = row({icon: root + '/img/Ignis%20Stellaris%20icon.png'}, 'card');
      const none = row({}, 'node');
      const before = {missing: [box(missing.slot), box(missing.label)], found: [box(found.slot), box(found.label)]};
      const lazy = [missing.slot, found.slot].every((s) => s.querySelector('img') && s.querySelector('img').loading === 'lazy');
      const wait = (s) => new Promise((ok) => { const go = () => (s.classList.contains('is-loaded') || s.classList.contains('is-missing')) ? ok() : setTimeout(go, 50); go(); });
      await Promise.race([Promise.all([wait(missing.slot), wait(found.slot)]), new Promise((ok) => setTimeout(ok, 4000))]);
      return {before, lazy, after: {missing: [box(missing.slot), box(missing.label)], found: [box(found.slot), box(found.label)]},
              missingEmpty: missing.slot.classList.contains('is-missing') && !missing.slot.querySelector('img'),
              foundLoaded: found.slot.classList.contains('is-loaded'), noneEmpty: none.slot.classList.contains('is-missing') && box(none.slot).slice(0, 2).join() === '40,40',
              url: m.techIconUrl({icon: 'technologies/x.png'})};
    }""", "file://" + ROOT)
    check("tech tree icon slot: node 40 px and card 72 px frames, images load lazily",
          slots["before"]["missing"][0][:2] == [40, 40] and slots["before"]["found"][0][:2] == [72, 72] and slots["lazy"], slots)
    check("tech tree icon slot: a missing file leaves the frame empty, a found one fills it, nothing moves",
          slots["missingEmpty"] and slots["foundLoaded"] and slots["noneEmpty"] and slots["before"] == slots["after"], slots)
    check("tech tree icon slot: icon path resolved on the assets repository", slots["url"].endswith("/technologies/x.png") and slots["url"].startswith("http"), slots["url"])

    # T3008: every icon of the 4.5.4 data file is in StellarisAssets (file tree), and a local file server of that
    # repository fills the node and card frames (skipped if the repository is not on this computer)
    tree = open(os.path.join(ROOT, "StellarisAssetsFileTree.txt"), encoding="utf-8").read().splitlines()
    start = next((i for i, line in enumerate(tree) if re.match(r"^[├└]── technologies/$", line)), len(tree))
    in_tree = set()
    for line in tree[start + 1:]:
        if not line.startswith("│   "):
            break
        in_tree.add(re.sub(r"^│   [├└]── ", "", line))
    icons = node_json("import {TECH_DATA as d} from './%s'; console.log(JSON.stringify([...new Set(d.technologies.map(t=>t.icon))]))" % real)
    absent = [i for i in icons if i.split("/", 1)[1] not in in_tree] if isinstance(icons, list) else icons
    check("tech tree icons: every icon of the 4.5.4 data file is listed under technologies/ in StellarisAssetsFileTree.txt",
          isinstance(icons, list) and len(icons) > 600 and not absent, absent[:10] if isinstance(absent, list) else absent)
    if os.path.isdir(os.path.join(ASSETS_DIR, "technologies")):
        server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=ASSETS_DIR))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = "http://127.0.0.1:%d/" % server.server_address[1]
        sample = [icons[0], "technologies/tech_archeology_lab.png", icons[-1]]
        shown = await pg.evaluate("""async ([root, base, sample])=>{
          const m = await import(root + '/js/tech-tree-icons.js');
          const slots = sample.flatMap((icon) => ['node', 'card'].map((size) => { const s = m.createTechIconSlot({icon}, size, base); document.body.append(s); return s; }));
          const t0 = Date.now();
          while (Date.now() - t0 < 5000 && slots.some((s) => !s.classList.contains('is-loaded') && !s.classList.contains('is-missing'))) await new Promise((ok) => setTimeout(ok, 50));
          return slots.map((s) => [s.className, s.querySelector('img') ? s.querySelector('img').naturalWidth : 0, Math.round(s.getBoundingClientRect().width)]);
        }""", ["file://" + ROOT, base, sample])
        server.shutdown()
        check("tech tree icons: with a local file server of StellarisAssets, node and card frames show the icons at their fixed size",
              all("is-loaded" in c and w > 0 for c, w, _ in shown) and [s for _, _, s in shown] == [40, 72] * 3, shown)
    else:
        print("SKIP tech tree icons: StellarisAssets is not at " + ASSETS_DIR)
    await pg.close()
    await page_checks(t)


async def page_checks(t):
    """Section 31: the tech tree page (layout, nodes, lines, states, mobile)."""
    url = "file://" + ROOT + "/tech-tree.html"
    pg = await t.ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.set_viewport_size({"width": 1280, "height": 900})
    await pg.goto(url)
    await pg.wait_for_timeout(400)
    await pg.click(".lang-btn[data-lang=en]")  # earlier areas may leave another stored language

    # T3101: shared shell, three areas side by side (tabs hidden), credits section, footer mention, data version
    shell = await pg.evaluate("""()=>{const box=(e)=>{const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width)]};
      const areas=[...document.querySelectorAll('.tech-area')];
      const links=(s)=>[...document.querySelectorAll(s+' a')].map(a=>a.href);
      return {shell:!!document.querySelector('.terminal-shell > .topbar .lang-switch')&&!!document.querySelector('.terminal-shell > footer.footer'),
        current:document.querySelector('.primary-nav a[aria-current=page]')?.getAttribute('href'),
        areas:areas.map(a=>a.dataset.area),boxes:areas.map(box),tabsShown:getComputedStyle(document.querySelector('.tech-area-tabs')).display!=='none',
        version:document.getElementById('tech-data-version').textContent,credits:links('#tech-credits'),footer:links('footer.footer p'),
        footerCredits:!!document.querySelector('footer.footer a[href="#tech-credits"]')}}""")
    b = shell["boxes"]
    check("tech tree page: shared shell, three areas side by side on desktop (Physics, Society, Engineering), tabs hidden",
          shell["shell"] and shell["current"] == "tech-tree.html" and shell["areas"] == ["physics", "society", "engineering"]
          and len({x[1] for x in b}) == 1 and b[0][0] < b[1][0] < b[2][0] and min(x[2] for x in b) > 250 and not shell["tabsShown"], shell)
    check("tech tree page: data version visible (4.5.4, game version, unverified)",
          "stellaris-pc-4.5.4" in shell["version"] and "Cygnus v4.5.4" in shell["version"] and "unverified" in shell["version"], shell["version"])
    bsc, tur = "https://bloodstainedcrow.github.io/stellaris-tech-tree/", "https://turanar.github.io/stellaris-tech-tree/index.html"
    check("tech tree page: credits section links both inspirations; the footer mentions BloodStainedCrow and links the credits",
          bsc in shell["credits"] and tur in shell["credits"] and bsc in shell["footer"] and shell["footerCredits"], shell)
    await pg.click(".lang-btn[data-lang=es]")
    es_version = await pg.evaluate("()=>document.getElementById('tech-data-version').textContent")
    await pg.click(".lang-btn[data-lang=en]")
    check("tech tree page: the data version line follows the language", es_version.startswith("Versión de datos") and "stellaris-pc-4.5.4" in es_version, es_version)
    await pg.set_viewport_size({"width": 375, "height": 760})
    await pg.wait_for_timeout(150)
    visible = "()=>[...document.querySelectorAll('.tech-area')].filter(a=>a.offsetParent).map(a=>a.dataset.area)"
    first = await pg.evaluate(visible)
    await pg.click("#tech-tab-society")
    second = await pg.evaluate(visible)
    await pg.focus("#tech-tab-society")
    await pg.keyboard.press("ArrowRight")
    third = await pg.evaluate("()=>[[...document.querySelectorAll('.tech-area')].filter(a=>a.offsetParent).map(a=>a.dataset.area)[0],document.activeElement.id,document.querySelector('#tech-tab-engineering').getAttribute('aria-selected')]")
    tabs_shown = await pg.evaluate("()=>getComputedStyle(document.querySelector('.tech-area-tabs')).display!=='none'")
    check("tech tree page: on mobile the areas are tabs (one visible panel, click and arrow keys switch it)",
          tabs_shown and first == ["physics"] and second == ["society"] and third == ["engineering", "tech-tab-engineering", "true"], (first, second, third))
    await pg.click("#tech-tab-physics")
    await pg.set_viewport_size({"width": 1280, "height": 900})
    await pg.wait_for_timeout(150)

    # T3102: one node per technology, in its area panel, field row and tier column, with icon slot, name, tier and kind
    grid = await pg.evaluate("""async ()=>{const {TECH_DATA:d}=await import('./js/tech-data/stellaris-pc-4.5.4.js');
      const nodes=[...document.querySelectorAll('.tech-node')];const byId=new Map(d.technologies.map(x=>[x.id,x]));
      const misplaced=nodes.filter(n=>{const x=byId.get(n.dataset.techId);const c=n.closest('.tech-cell');
        return !x||n.closest('.tech-area').dataset.area!==x.area||c.dataset.field!==x.field||+c.dataset.tier!==x.tier}).map(n=>n.dataset.techId);
      const cols=[...document.querySelectorAll('.tech-grid')].map(g=>{const heads=[...g.querySelectorAll('.tech-tier-head')];
        const x=(e)=>Math.round(e.getBoundingClientRect().left);
        const aligned=[...g.querySelectorAll('.tech-node')].every(n=>x(n)===x(heads.find(h=>h.dataset.tier===n.dataset.tier)));
        const rows=[...g.querySelectorAll('.tech-field-label')].map(l=>l.dataset.field);
        const ordered=rows.every((f,i)=>i===0||g.querySelector('.tech-field-label[data-field='+rows[i-1]+']').getBoundingClientRect().top<g.querySelector('.tech-field-label[data-field='+f+']').getBoundingClientRect().top);
        return {area:g.dataset.area,tiers:heads.map(h=>+h.dataset.tier),increasing:heads.every((h,i)=>i===0||x(heads[i-1])<x(h)),aligned,rows,ordered,
          expected:d.fields.filter(f=>f.area===g.dataset.area).map(f=>f.id)}});
      const n=document.querySelector('.tech-node[data-tech-id=tech_lasers_1]');const slot=n.querySelector('.tech-icon-slot').getBoundingClientRect();
      return {count:nodes.length,total:d.technologies.length,unique:new Set(nodes.map(n=>n.dataset.techId)).size,misplaced:misplaced.slice(0,5),cols,
        sample:[n.querySelector('.tech-node-name').textContent,n.querySelector('.tech-node-meta').textContent,Math.round(slot.width),Math.round(slot.height),n.tagName],
        rare:document.querySelector('.tech-node[data-tech-id=tech_arcane_deciphering] .tech-node-meta').textContent,
        allMeta:nodes.every(n=>/^Tier \\d · \\w+$/.test(n.querySelector('.tech-node-meta').textContent)&&n.querySelector('.tech-node-name').textContent.trim()&&n.querySelector('.tech-icon-slot'))}}""")
    cols = grid.get("cols", [])
    check("tech tree layout: one node per technology (679), each one in its area panel, field row and tier column",
          grid["count"] == grid["total"] == grid["unique"] == 679 and not grid["misplaced"], grid)
    check("tech tree layout: tier columns 0–5 left to right, field rows in the data file's order, nodes aligned with their tier header",
          [c["area"] for c in cols] == ["physics", "society", "engineering"]
          and all(c["tiers"] == [0, 1, 2, 3, 4, 5] and c["increasing"] and c["aligned"] and c["rows"] == c["expected"] and c["ordered"] for c in cols), cols)
    check("tech tree nodes: button with the 40 px icon slot, the English name and 'Tier N · Kind' (Red Lasers: Tier 0 · Starter, Arcane Deciphering: Tier 2 · Rare)",
          grid["sample"] == ["Red Lasers", "Tier 0 · Starter", 40, 40, "BUTTON"] and grid["rare"] == "Tier 2 · Rare" and grid["allMeta"], grid["sample"] + [grid["rare"]])
    await pg.click(".lang-btn[data-lang=es]")
    es_meta = await pg.evaluate("()=>[document.querySelector('.tech-node[data-tech-id=tech_arcane_deciphering] .tech-node-meta').textContent,document.querySelector('.tech-tier-head').textContent,document.querySelector('.tech-node[data-tech-id=tech_lasers_1] .tech-node-name').textContent]")
    await pg.click(".lang-btn[data-lang=en]")
    check("tech tree nodes: tier and kind follow the language, the technology name stays in English",
          es_meta == ["Nivel 2 · Rara", "Nivel 0", "Red Lasers"], es_meta)

    # T3103: SVG prerequisite lines between nodes of the same area, ends on the node edges, redrawn on resize
    lines_js = """async ()=>{const {TECH_DATA:d}=await import('./js/tech-data/stellaris-pc-4.5.4.js');
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const byId=new Map(d.technologies.map(x=>[x.id,x]));
      const expected=d.technologies.reduce((n,x)=>n+x.prerequisites.filter(p=>byId.get(p).area===x.area).length,0);
      const cross=d.technologies.reduce((n,x)=>n+x.prerequisites.filter(p=>byId.get(p).area!==x.area).length,0);
      const out={expected,cross,grids:[]};
      document.querySelectorAll('.tech-grid').forEach(g=>{const svg=g.querySelector(':scope > svg.tech-lines');if(!g.offsetWidth){out.grids.push({area:g.dataset.area,hidden:true});return}
        const node=(id)=>g.querySelector('.tech-node[data-tech-id="'+id+'"]');const bad=[];
        const onEdge=(n,x,y)=>{const l=n.offsetLeft,r=l+n.offsetWidth,m=n.offsetTop+n.offsetHeight/2;return (Math.abs(x-l)<1||Math.abs(x-r)<1)&&Math.abs(y-m)<1};
        const paths=svg?[...svg.querySelectorAll('path.tech-line')]:[];
        paths.forEach(p=>{const nums=p.getAttribute('d').match(/-?[\\d.]+/g).map(Number);const a=node(p.dataset.from),b=node(p.dataset.to);
          if(!a||!b||!byId.get(p.dataset.to).prerequisites.includes(p.dataset.from)||!onEdge(a,nums[0],nums[1])||!onEdge(b,nums[nums.length-2],nums[nums.length-1]))bad.push(p.dataset.from+'>'+p.dataset.to)});
        out.grids.push({area:g.dataset.area,n:paths.length,bad:bad.slice(0,5),size:svg?[+svg.getAttribute('width'),+svg.getAttribute('height')]:null,grid:[g.offsetWidth,g.offsetHeight],
          under:svg&&getComputedStyle(svg).zIndex==='0'&&getComputedStyle(g.querySelector('.tech-node')).zIndex==='1'&&svg.getAttribute('aria-hidden')==='true'})});
      return out}"""
    ln = await pg.evaluate(lines_js)
    visible = [g for g in ln["grids"] if not g.get("hidden")]
    check("tech tree lines: one SVG curve per prerequisite inside an area (cross-area ones left to the card), ends on the node edges, under the nodes",
          len(visible) == 3 and sum(g["n"] for g in visible) == ln["expected"] > 400 and ln["cross"] > 0
          and all(not g["bad"] and g["size"] == g["grid"] and g["under"] for g in visible), ln)
    await pg.evaluate("()=>document.querySelector('.tech-grid[data-area=physics]').style.setProperty('--tech-node-width','15rem')")
    await pg.set_viewport_size({"width": 1100, "height": 900})
    await pg.wait_for_timeout(200)
    ln2 = await pg.evaluate(lines_js)
    phys = next(g for g in ln2["grids"] if g["area"] == "physics")
    check("tech tree lines: redrawn when the grid or window changes size (wider physics nodes, narrower window)",
          not phys["bad"] and phys["size"] == phys["grid"] and phys["grid"][0] > visible[0]["grid"][0], (phys, visible[0]["grid"]))
    await pg.evaluate("()=>document.querySelector('.tech-grid[data-area=physics]').style.removeProperty('--tech-node-width')")
    await pg.set_viewport_size({"width": 375, "height": 760})
    await pg.click("#tech-tab-engineering")
    ln3 = await pg.evaluate(lines_js)
    eng = next(g for g in ln3["grids"] if g["area"] == "engineering")
    check("tech tree lines: a mobile tab shown again gets its lines drawn at the mobile size",
          [g["area"] for g in ln3["grids"] if not g.get("hidden")] == ["engineering"] and eng["n"] > 100 and not eng["bad"] and eng["size"] == eng["grid"], eng)
    await pg.click("#tech-tab-physics")
    await pg.set_viewport_size({"width": 1280, "height": 900})
    await pg.wait_for_timeout(100)

    # T3104: kind colours, selected / prerequisite / unlocked-by states on nodes and lines, legend and live status
    states_js = """async (id)=>{const {TECH_DATA:d}=await import('./js/tech-data/stellaris-pc-4.5.4.js');
      await new Promise(r=>setTimeout(r,120));
      const ids=(s)=>[...document.querySelectorAll('.tech-node'+s)].map(n=>n.dataset.techId).sort();
      const x=d.technologies.find(t=>t.id===id);const deps=id?d.technologies.filter(t=>t.prerequisites.includes(id)).map(t=>t.id).sort():[];
      const lines=(c)=>[...document.querySelectorAll('.tech-line.'+c)].map(l=>l.dataset.from+'>'+l.dataset.to).sort();
      const other=document.querySelector('.tech-node:not(.is-selected):not(.is-prerequisite):not(.is-unlocked)');
      return {has:document.querySelector('.tech-areas').classList.contains('has-selection'),selected:ids('.is-selected'),pressed:ids('[aria-pressed=true]'),
        prereq:ids('.is-prerequisite'),unlocked:ids('.is-unlocked'),expPrereq:x?[...x.prerequisites].sort():[],expDeps:deps,
        lineP:lines('is-prerequisite'),lineU:lines('is-unlocked'),otherOpacity:getComputedStyle(other).opacity,
        status:document.getElementById('tech-selection-status').textContent}}"""
    kinds = await pg.evaluate("""()=>{const c={};document.querySelectorAll('.tech-node').forEach(n=>{c[n.dataset.kind]=getComputedStyle(n).borderLeftColor});
      return {colours:c,legend:[...document.querySelectorAll('#tech-legend li')].map(l=>[l.dataset.legend,l.textContent,getComputedStyle(l.querySelector('.tech-legend-swatch')).backgroundColor])}}""")
    colours = kinds["colours"]
    check("tech tree states: every kind has its own colour (starter, rare, dangerous, repeatable, event, normal) and the legend shows kinds and states",
          sorted(colours) == ["dangerous", "event", "normal", "rare", "repeatable", "starter"] and len(set(colours.values())) == 6
          and [l[0] for l in kinds["legend"]] == ["normal", "starter", "rare", "dangerous", "repeatable", "event", "selected", "prerequisite", "unlocked"]
          and kinds["legend"][2][2] == colours["rare"], kinds)
    s0 = await pg.evaluate(states_js, None)
    await pg.click(".tech-node[data-tech-id=tech_lasers_2]")
    s1 = await pg.evaluate(states_js, "tech_lasers_2")
    check("tech tree states: clicking a node selects it (aria-pressed), marks its prerequisites and the techs it unlocks, and dims the rest",
          not s0["has"] and not s0["pressed"] and s1["has"] and s1["selected"] == s1["pressed"] == ["tech_lasers_2"]
          and s1["prereq"] == s1["expPrereq"] == ["tech_lasers_1"] and s1["unlocked"] == s1["expDeps"] and len(s1["unlocked"]) >= 2
          and float(s1["otherOpacity"]) < 1 and "Blue Lasers" in s1["status"], s1)
    check("tech tree states: the lines into the selected are marked as prerequisite and the lines out of it as unlocked",
          s1["lineP"] == ["tech_lasers_1>tech_lasers_2"] and s1["lineU"] == sorted("tech_lasers_2>" + i for i in s1["expDeps"]), (s1["lineP"], s1["lineU"]))
    await pg.set_viewport_size({"width": 1180, "height": 900})
    await pg.wait_for_timeout(200)
    s2 = await pg.evaluate(states_js, "tech_lasers_2")
    await pg.click(".lang-btn[data-lang=es]")
    es_state = await pg.evaluate("()=>[document.getElementById('tech-selection-status').textContent,document.querySelector('#tech-legend li[data-legend=prerequisite]').textContent]")
    await pg.click(".lang-btn[data-lang=en]")
    check("tech tree states: the states survive a redraw of the lines and the status and legend follow the language",
          s2["lineP"] == s1["lineP"] and s2["lineU"] == s1["lineU"] and es_state[0].startswith("Seleccionada: Blue Lasers") and es_state[1] == "Prerrequisito", (s2["lineP"], es_state))
    await pg.click(".tech-node[data-tech-id=tech_lasers_2]")
    s3 = await pg.evaluate(states_js, None)
    await pg.click(".tech-node[data-tech-id=tech_lasers_1]")
    await pg.keyboard.press("Escape")
    s4 = await pg.evaluate(states_js, None)
    check("tech tree states: a second click or Escape clears the selection (back to normal)",
          all(not s["has"] and not s["selected"] and not s["prereq"] and not s["unlocked"] and not s["lineP"] and not s["lineU"] and s["status"] == "" for s in (s3, s4)), (s3, s4))
    await pg.set_viewport_size({"width": 1280, "height": 900})

    check("tech tree page: no page errors", not errors, errors[:3])
    await pg.close()
