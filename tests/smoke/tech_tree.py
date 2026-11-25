"""Tech tree data (section 30): the test fixture, the data validations and the data files."""
import glob, json, os, re, subprocess, sys, tempfile, threading, time
from functools import partial
from playwright.async_api import TimeoutError as PlaywrightTimeout
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


# The page loads its data file with a top-level await, so the load event of a navigation can come
# before the tree is drawn: wait for the drawn state instead of a fixed delay (T3406).
TREE_READY_JS = """([version, nodes, selected]) => {
  const line = document.getElementById('tech-data-version');
  if (!line || line.dataset.rulesetId !== version) return false;
  const count = document.querySelectorAll('.tech-node').length;
  if (nodes ? count !== nodes : !count) return false;
  return !selected || document.querySelector('.tech-node.is-selected')?.dataset.techId === selected;
}"""


async def wait_for_tree(pg, version, nodes=None, selected=None, timeout=15000):
    """Waits until the page shows `version` with its nodes drawn (and `selected` selected); on a
    timeout it returns and lets the following check report the state it finds. A navigation while
    waiting (the page reloading itself with the stored ?version=) restarts the wait (T2406)."""
    deadline = time.monotonic() + timeout / 1000
    while (left := deadline - time.monotonic()) > 0:
        try:
            await pg.wait_for_function(TREE_READY_JS, arg=[version, nodes, selected], timeout=left * 1000)
            return
        except PlaywrightTimeout:
            return
        except Exception:  # execution context destroyed by a navigation
            await pg.wait_for_load_state("load")


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
    await deeplink_checks(t)
    await version_checks(t)
    await i18n_checks(t)
    await link_checks(t)
    await a11y_checks(t)


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

    # T3101, T3601: shared shell, three areas stacked as rows in one tree window, credits section, footer mention, data version
    shell = await pg.evaluate("""()=>{const box=(e)=>{const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.bottom)]};
      const areas=[...document.querySelectorAll('.tech-area')];const win=document.querySelector('.tech-areas');
      const links=(s)=>[...document.querySelectorAll(s+' a')].map(a=>a.href);
      return {shell:!!document.querySelector('.terminal-shell > .topbar .lang-switch')&&!!document.querySelector('.terminal-shell > footer.footer'),
        current:document.querySelector('.primary-nav a[aria-current=page]')?.getAttribute('href'),
        areas:areas.map(a=>a.dataset.area),boxes:areas.map(box),jumps:[...document.querySelectorAll('.tech-area-jump')].map(b=>[b.dataset.area,b.offsetHeight>0]),
        oneWindow:areas.every(a=>a.closest('.tech-areas')===win)&&getComputedStyle(win).overflowY==='auto'&&win.scrollHeight>win.clientHeight,
        tints:areas.map(a=>getComputedStyle(a).backgroundColor),
        version:document.getElementById('tech-data-version').textContent,credits:links('#tech-credits'),footer:links('footer.footer p'),
        footerCredits:!!document.querySelector('footer.footer a[href="#tech-credits"]')}}""")
    b = shell["boxes"]
    check("tech tree page (T3601): shared shell, the three areas stacked as rows (Physics, Society, Engineering) in one scrolling tree window, with a jump button each",
          shell["shell"] and shell["current"] == "tech-tree.html" and shell["areas"] == ["physics", "society", "engineering"]
          and len({x[0] for x in b}) == 1 and b[0][3] <= b[1][1] and b[1][3] <= b[2][1] and min(x[2] for x in b) > 1000 and shell["oneWindow"]
          and shell["jumps"] == [["physics", True], ["society", True], ["engineering", True]], shell)
    tints = [[float(v) for v in re.findall(r"[\d.]+", c)] for c in shell["tints"]]
    check("tech tree page (T3601): each area on its own semi-transparent tint (blue Physics, green Society, orange Engineering)",
          all(len(c) == 4 and 0 < c[3] < 0.3 for c in tints) and tints[0][2] > tints[0][0] and tints[1][1] > max(tints[1][0], tints[1][2])
          and tints[2][0] > tints[2][1] > tints[2][2], shell["tints"])
    # T3602: the tree window takes most of the viewport height (85 %), between 24rem and 64rem, at the full page width
    win_js = "()=>{const w=document.querySelector('.tech-areas').getBoundingClientRect(),b=document.querySelector('.tech-board').getBoundingClientRect();return [Math.round(w.height),Math.round(w.width),Math.round(b.width),innerHeight]}"
    sizes = {}
    for height in (900, 400, 1600):
        await pg.set_viewport_size({"width": 1280, "height": height})
        await pg.wait_for_timeout(80)
        sizes[height] = await pg.evaluate(win_js)
    await pg.set_viewport_size({"width": 1280, "height": 900})
    check("tech tree window (T3602): as wide as the page and much taller: 85 % of the viewport (765 px at 900), at least 24rem (384 px) and at most 64rem (1024 px)",
          abs(sizes[900][0] - 765) <= 2 and sizes[400][0] == 384 and sizes[1600][0] == 1024 and all(v[1] == v[2] for v in sizes.values()), sizes)
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
    at_top = """async ()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const w=document.querySelector('.tech-areas').getBoundingClientRect().top;
      return [[...document.querySelectorAll('.tech-area')].filter(a=>a.offsetParent).map(a=>a.dataset.area),
        [...document.querySelectorAll('.tech-area')].map(a=>Math.round(a.getBoundingClientRect().top-w)),document.querySelector('.tech-area-jump[aria-current=true]')?.dataset.area]}"""
    first = await pg.evaluate(at_top)
    await pg.click("#tech-jump-society")
    second = await pg.evaluate(at_top)
    await pg.click("#tech-jump-engineering")
    third = await pg.evaluate(at_top)
    check("tech tree page (T3601): on mobile the three areas stay stacked in the same window (no tabs); the jump buttons scroll it to an area and mark it",
          first[0] == second[0] == ["physics", "society", "engineering"] and first[2] == "physics" and abs(second[1][1]) <= 2 and second[2] == "society"
          and abs(third[1][2]) <= 2 and third[2] == "engineering", (first, second, third))
    await pg.click("#tech-jump-physics")
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
    check("tech tree nodes: tier and kind follow the language, and so does the official technology name (P15: Láseres rojos)",
          es_meta == ["Nivel 2 · Rara", "Nivel 0", "Láseres rojos"], es_meta)

    # T3103, T3601: one SVG of prerequisite lines for the three stacked areas (also between areas), ends on the node edges, redrawn on resize
    lines_js = """async ()=>{const {TECH_DATA:d}=await import('./js/tech-data/stellaris-pc-4.5.4.js');
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const byId=new Map(d.technologies.map(x=>[x.id,x]));
      const expected=d.technologies.reduce((n,x)=>n+x.prerequisites.length,0);
      const cross=d.technologies.reduce((n,x)=>n+x.prerequisites.filter(p=>byId.get(p).area!==x.area).length,0);
      const st=document.querySelector('.tech-stack');const svgs=document.querySelectorAll('svg.tech-lines');const svg=st.querySelector(':scope > svg.tech-lines');
      const node=(id)=>st.querySelector('.tech-node[data-tech-id="'+id+'"]');const bad=[];
      const pos=(n)=>{const a=n.getBoundingClientRect(),b=st.getBoundingClientRect(),z=1;return {l:(a.left-b.left)/z,r:(a.right-b.left)/z,m:(a.top+a.height/2-b.top)/z}};
      const onEdge=(n,x,y)=>{const p=pos(n);return (Math.abs(x-p.l)<1.5||Math.abs(x-p.r)<1.5)&&Math.abs(y-p.m)<1.5};
      const paths=svg?[...svg.querySelectorAll('path.tech-line')]:[];
      paths.forEach(p=>{const nums=p.getAttribute('d').match(/-?[\\d.]+/g).map(Number);const a=node(p.dataset.from),b=node(p.dataset.to);
        if(!a||!b||!byId.get(p.dataset.to).prerequisites.includes(p.dataset.from)||!onEdge(a,nums[0],nums[1])||!onEdge(b,nums[nums.length-2],nums[nums.length-1]))bad.push(p.dataset.from+'>'+p.dataset.to)});
      const crossed=paths.filter(p=>p.dataset.cross&&node(p.dataset.from).closest('.tech-area')!==node(p.dataset.to).closest('.tech-area')).length;
      return {expected,cross,svgs:svgs.length,n:paths.length,crossed,bad:bad.slice(0,5),size:svg?[+svg.getAttribute('width'),+svg.getAttribute('height')]:null,stack:[st.offsetWidth,st.offsetHeight],
        physicsW:document.querySelector('.tech-grid[data-area=physics]').offsetWidth,
        under:!!svg&&getComputedStyle(svg).zIndex==='0'&&getComputedStyle(st.querySelector('.tech-node')).zIndex==='1'&&svg.getAttribute('aria-hidden')==='true'}}"""
    ln = await pg.evaluate(lines_js)
    check("tech tree lines (T3601): one SVG under the nodes of the three areas with a curve per prerequisite, also between areas, ends on the node edges",
          ln["svgs"] == 1 and ln["n"] == ln["expected"] > 400 and ln["crossed"] == ln["cross"] > 0 and not ln["bad"] and ln["size"] == ln["stack"] and ln["under"], ln)
    await pg.evaluate("()=>document.querySelector('.tech-grid[data-area=physics]').style.setProperty('--tech-node-width','15rem')")
    await pg.set_viewport_size({"width": 1100, "height": 900})
    await pg.wait_for_timeout(200)
    ln2 = await pg.evaluate(lines_js)
    check("tech tree lines: redrawn when the grid or window changes size (wider physics nodes, narrower window)",
          not ln2["bad"] and ln2["n"] == ln["n"] and ln2["size"] == ln2["stack"] and ln2["physicsW"] > ln["physicsW"], (ln2, ln["physicsW"]))
    await pg.evaluate("()=>document.querySelector('.tech-grid[data-area=physics]').style.removeProperty('--tech-node-width')")
    await pg.set_viewport_size({"width": 375, "height": 760})
    await pg.wait_for_timeout(150)
    ln3 = await pg.evaluate(lines_js)
    check("tech tree lines: redrawn at the mobile size (narrower stack, same lines)",
          ln3["n"] == ln["n"] and not ln3["bad"] and ln3["size"] == ln3["stack"] and ln3["stack"][0] < ln["stack"][0], ln3)
    await pg.set_viewport_size({"width": 1280, "height": 900})
    await pg.wait_for_timeout(100)

    # T3104: kind colours, selected / prerequisite / unlocked-by states on nodes and lines, legend and live status
    states_js = """async (id)=>{const {TECH_DATA:d}=await import('./js/tech-data/stellaris-pc-4.5.4.js');
      await new Promise(r=>setTimeout(r,120));
      const ids=(s)=>[...document.querySelectorAll('.tech-node'+s)].map(n=>n.dataset.techId).sort();
      const x=d.technologies.find(t=>t.id===id);const deps=id?d.technologies.filter(t=>t.prerequisites.includes(id)).map(t=>t.id).sort():[];
      const byId=new Map(d.technologies.map(t=>[t.id,t]));
      const walk=(start,next)=>{const seen=new Set();const go=(i)=>next(i).forEach(j=>{if(!seen.has(j)){seen.add(j);go(j)}});if(start)go(start);return seen};
      const anc=walk(id,i=>byId.get(i).prerequisites);const desc=walk(id,i=>d.technologies.filter(t=>t.prerequisites.includes(i)).map(t=>t.id));
      const all=[...document.querySelectorAll('.tech-line')].map(l=>[l.dataset.from,l.dataset.to]);
      const lines=(c)=>[...document.querySelectorAll('.tech-line.'+c)].map(l=>l.dataset.from+'>'+l.dataset.to).sort();
      const other=document.querySelector('.tech-node:not(.is-selected):not(.is-prerequisite):not(.is-unlocked)');
      return {has:document.querySelector('.tech-areas').classList.contains('has-selection'),selected:ids('.is-selected'),pressed:ids('[aria-pressed=true]'),
        prereq:ids('.is-prerequisite'),unlocked:ids('.is-unlocked'),direct:ids('.is-direct'),expPrereq:x?[...x.prerequisites].sort():[],expDeps:deps,
        expAnc:[...anc].sort(),expDesc:[...desc].sort(),
        expLineP:all.filter(([f,t])=>anc.has(f)&&(t===id||anc.has(t))).map(p=>p.join('>')).sort(),
        expLineU:all.filter(([f,t])=>desc.has(t)&&(f===id||desc.has(f))).map(p=>p.join('>')).sort(),
        lineP:lines('is-prerequisite'),lineU:lines('is-unlocked'),otherOpacity:getComputedStyle(other.querySelector('.tech-icon-slot')).opacity,
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
          and s1["prereq"] == s1["expAnc"] == ["tech_lasers_1"] and s1["unlocked"] == s1["expDesc"] and len(s1["unlocked"]) > len(s1["expDeps"]) >= 2
          and float(s1["otherOpacity"]) < 1 and "Blue Lasers" in s1["status"], s1)
    check("tech tree states: the lines into the selected are marked as prerequisite and the lines of its dependent chain as unlocked",
          s1["lineP"] == ["tech_lasers_1>tech_lasers_2"] and s1["lineU"] == s1["expLineU"]
          and set("tech_lasers_2>" + i for i in s1["expDeps"]) <= set(s1["lineU"]) and len(s1["lineU"]) > len(s1["expDeps"]), (s1["lineP"], s1["lineU"]))
    # T3202: the whole prerequisite chain and every dependent, across areas, with the direct ones marked
    chain_pick = await pg.evaluate("""async ()=>{const {TECH_DATA:d}=await import('./js/tech-data/stellaris-pc-4.5.4.js');const byId=new Map(d.technologies.map(t=>[t.id,t]));
      const depth=(id)=>{const x=byId.get(id);return x.prerequisites.length?1+Math.max(...x.prerequisites.map(depth)):0};
      const deps=(id)=>d.technologies.filter(t=>t.prerequisites.includes(id));
      const c=d.technologies.filter(t=>depth(t.id)>=3&&deps(t.id).length).sort((a,b)=>depth(b.id)-depth(a.id))[0];return c.id}""")
    await pg.click(".tech-node[data-tech-id=tech_lasers_2]")
    await pg.evaluate("(id)=>document.querySelector('.tech-node[data-tech-id='+id+']').scrollIntoView({block:'center',inline:'center'})", chain_pick)
    await pg.click(".tech-node[data-tech-id=%s]" % chain_pick)
    ch = await pg.evaluate(states_js, chain_pick)
    check("tech tree chain: selecting a deep technology marks its whole prerequisite chain and everything that depends on it (nodes and lines), the direct ones apart",
          ch["prereq"] == ch["expAnc"] and len(ch["expAnc"]) > len(ch["expPrereq"]) and ch["unlocked"] == ch["expDesc"] and ch["lineP"] == ch["expLineP"]
          and ch["lineU"] == ch["expLineU"] and len(ch["lineP"]) > len(ch["expPrereq"]) and ch["direct"] == sorted(ch["expPrereq"] + ch["expDeps"])
          and str(len(ch["expAnc"])) in ch["status"] and str(len(ch["expDesc"])) in ch["status"], (chain_pick, ch))
    glow = await pg.evaluate("()=>{const x=document.querySelector('.tech-node.is-prerequisite.is-direct'),y=document.querySelector('.tech-node.is-prerequisite:not(.is-direct)');return [getComputedStyle(x).boxShadow!=='none',y?getComputedStyle(y).boxShadow==='none':false]}")
    check("tech tree chain: the direct prerequisites keep the glow, the rest of the chain only the border", all(glow), glow)
    cross = await pg.evaluate("""async ()=>{const {TECH_DATA:d}=await import('./js/tech-data/stellaris-pc-4.5.4.js');const byId=new Map(d.technologies.map(t=>[t.id,t]));
      return d.technologies.find(t=>t.prerequisites.some(p=>byId.get(p).area!==t.area)).id}""")
    await pg.click(".tech-node[data-tech-id=%s]" % chain_pick)
    await pg.evaluate("(id)=>document.querySelector('.tech-node[data-tech-id='+id+']').scrollIntoView({block:'center',inline:'center'})", cross)
    await pg.click(".tech-node[data-tech-id=%s]" % cross)
    cx = await pg.evaluate(states_js, cross)
    cx_areas = await pg.evaluate("(ids)=>[...new Set(ids.map(i=>document.querySelector('.tech-node[data-tech-id='+i+']').closest('.tech-area').dataset.area))]", cx["prereq"] + [cross])
    check("tech tree chain: the chain crosses areas (a prerequisite in another area is marked too)", cx["prereq"] == cx["expAnc"] and len(cx_areas) >= 2, (cross, cx_areas))
    await pg.click(".tech-node[data-tech-id=%s]" % cross)
    await pg.evaluate("()=>document.querySelector('.tech-node[data-tech-id=tech_lasers_2]').scrollIntoView({block:'center',inline:'center'})")
    await pg.click(".tech-node[data-tech-id=tech_lasers_2]")
    s1 = await pg.evaluate(states_js, "tech_lasers_2")
    await pg.set_viewport_size({"width": 1180, "height": 900})
    await pg.wait_for_timeout(200)
    s2 = await pg.evaluate(states_js, "tech_lasers_2")
    await pg.click(".lang-btn[data-lang=es]")
    es_state = await pg.evaluate("()=>[document.getElementById('tech-selection-status').textContent,document.querySelector('#tech-legend li[data-legend=prerequisite]').textContent]")
    await pg.click(".lang-btn[data-lang=en]")
    check("tech tree states: the states survive a redraw of the lines and the status and legend follow the language",
          s2["lineP"] == s1["lineP"] and s2["lineU"] == s1["lineU"] and es_state[0].startswith("Seleccionada: Láseres azules") and es_state[1] == "Cadena de prerrequisitos", (s2["lineP"], es_state))
    await pg.click(".tech-node[data-tech-id=tech_lasers_2]")
    s3 = await pg.evaluate(states_js, None)
    await pg.click(".tech-node[data-tech-id=tech_lasers_1]")
    await pg.keyboard.press("Escape")
    s4 = await pg.evaluate(states_js, None)
    check("tech tree states: a second click or Escape clears the selection (back to normal)",
          all(not s["has"] and not s["selected"] and not s["prereq"] and not s["unlocked"] and not s["lineP"] and not s["lineU"] and s["status"] == "" for s in (s3, s4)), (s3, s4))
    await pg.set_viewport_size({"width": 1280, "height": 900})

    # T3201: detail card of the selected technology
    card_js = """()=>{const c=document.getElementById('tech-card');const q=(s)=>c.querySelector(s);const txt=(s)=>q(s)?.textContent.trim();
      const fact=(n)=>txt('[data-fact='+n+'] dd');const sec=(n)=>q('[data-section='+n+']');
      return {hidden:c.hidden,shown:!c.hidden&&c.offsetHeight>0,id:c.dataset.techId,name:txt('.tech-card-name'),gameId:txt('.tech-card-id'),meta:txt('.tech-card-meta'),
        icon:!!q('.tech-icon-slot--card'),cost:fact('cost'),dlc:fact('dlc'),version:fact('version'),flags:fact('flags'),levels:fact('levels'),
        desc:txt('.tech-card-description'),prereq:[...c.querySelectorAll('[data-section=prerequisites] button')].map(b=>b.dataset.techId),
        leads:[...c.querySelectorAll('[data-section=leadsTo] button')].map(b=>b.dataset.techId).sort(),
        variants:txt('[data-section=variants]'),effects:txt('[data-section=effects]'),weight:txt('[data-section=drawWeight] .tech-card-weight'),
        mods:c.querySelectorAll('[data-section=drawWeight] li').length,reqs:[...c.querySelectorAll('[data-section=requirements] li')].map(l=>l.textContent),
        sim:[...c.querySelectorAll('.tech-card-sim-link')].map(a=>[a.getAttribute('href'),a.dataset.simCollection,a.dataset.simId,a.textContent]),
        unlocks:sec('unlocks')?sec('unlocks').querySelectorAll('li').length:0,linkedJobs:[...c.querySelectorAll('.tech-card-jobs code.is-linked')].map(x=>x.textContent),
        labels:[...c.querySelectorAll('.tech-card-label')].map(l=>l.textContent),inView:c.getBoundingClientRect().right<=document.documentElement.clientWidth+0.5}}"""
    win_box = "()=>{const r=document.querySelector('.tech-areas').getBoundingClientRect();return [r.left,r.top,r.width,r.height].map(Math.round)}"
    before_open = await pg.evaluate(win_box)
    await pg.click(".tech-node[data-tech-id=tech_lasers_2]")
    c1 = await pg.evaluate(card_js)
    deps = sorted(s1["expDeps"])
    # T3603: the card floats over the top-right corner of the tree window: the window keeps its size and place, its scroll bar stays free
    board = await pg.evaluate("""()=>{const r=(s)=>document.querySelector(s).getBoundingClientRect();const c=r('#tech-card'),w=r('.tech-areas'),sc=document.querySelector('.tech-areas');
      return {inside:c.top>=w.top&&c.right<=w.right-(sc.offsetWidth-sc.clientWidth)&&c.bottom<=w.bottom&&c.left>w.left+w.width/2,width:Math.round(c.width),
        floating:getComputedStyle(document.getElementById('tech-card')).position==='absolute'}}""")
    after_open = await pg.evaluate(win_box)
    check("tech tree card (T3603): on desktop the card floats over the top-right corner of the tree window, clear of its scroll bar, and opening it does not move or resize the tree",
          board["inside"] and board["floating"] and 300 <= board["width"] <= 370 and before_open == after_open, (board, before_open, after_open))
    # a node under the card is scrolled out from under it when selected, without moving the window
    clear_js = """async (id)=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const n=document.querySelector('.tech-node[data-tech-id='+id+']').getBoundingClientRect();
      const c=document.getElementById('tech-card').getBoundingClientRect();const w=document.querySelector('.tech-areas').getBoundingClientRect();
      return {covered:!(n.right<=c.left||n.left>=c.right||n.bottom<=c.top||n.top>=c.bottom),inWindow:n.left>=w.left-1&&n.right<=w.right+1&&n.top>=w.top-1&&n.bottom<=w.bottom+1}}"""
    under = await pg.evaluate("""()=>{const c=document.getElementById('tech-card').getBoundingClientRect();const sc=document.querySelector('.tech-areas');
      const n=[...document.querySelectorAll('.tech-node')].find(x=>{const r=x.getBoundingClientRect();return r.left>c.left+20&&r.right<c.right-20&&r.top>c.top+20&&r.bottom<c.bottom-20});
      if(!n){sc.scrollLeft+=400;}return n?n.dataset.techId:null}""")
    if not under:
        under = await pg.evaluate("""()=>{const c=document.getElementById('tech-card').getBoundingClientRect();
          const n=[...document.querySelectorAll('.tech-node')].find(x=>{const r=x.getBoundingClientRect();return r.left>c.left+20&&r.right<c.right-20&&r.top>c.top+20&&r.bottom<c.bottom-20});return n?n.dataset.techId:null}""")
    await pg.evaluate("(id)=>document.querySelector('.tech-node[data-tech-id='+id+']').click()", under)
    cleared = await pg.evaluate(clear_js, under)
    after_clear = await pg.evaluate(win_box)
    check("tech tree card (T3603): selecting a node hidden under the card scrolls the window sideways so the node stays visible next to the card; the window does not move",
          bool(under) and not cleared["covered"] and cleared["inWindow"] and after_clear == before_open, (under, cleared, after_clear, before_open))
    await pg.click(".tech-node[data-tech-id=tech_lasers_2]")
    c1 = await pg.evaluate(card_js)
    check("tech tree card: clicking Blue Lasers opens its card (icon slot, name, id, tier · kind · area · field, base cost, DLC, version, description)",
          c1["shown"] and c1["id"] == "tech_lasers_2" and c1["name"] == "Blue Lasers" and c1["gameId"] == "tech_lasers_2" and c1["icon"]
          and c1["meta"] == "Tier 1 · Normal · Physics · Particles" and c1["cost"] == "1,250" and c1["dlc"] == "Base game"
          and "stellaris-pc-4.5.4" in c1["version"] and "Cygnus v4.5.4" in c1["version"] and c1["desc"].startswith("More powerful than red lasers") and c1["inView"], c1)
    check("tech tree card: prerequisites and leads-to as buttons, variants, effects and the draw weight as information (base 95, 2 modifiers)",
          c1["prereq"] == ["tech_lasers_1"] and c1["leads"] == deps and "Blue Beam Projector" in c1["variants"] and "army_damage_mult" in c1["effects"]
          and c1["weight"] == "Base: 95" and c1["mods"] == 2, c1)
    await pg.click("#tech-card [data-section=prerequisites] button[data-tech-id=tech_lasers_1]")
    c2 = await pg.evaluate(card_js)
    sel2 = await pg.evaluate("()=>document.querySelector('.tech-node.is-selected')?.dataset.techId")
    check("tech tree card: a prerequisite button selects that technology and its card (Red Lasers, starter: base cost 500, game flag)",
          sel2 == "tech_lasers_1" and c2["name"] == "Red Lasers" and c2["cost"] == "500" and "Starter" in (c2["flags"] or ""), [sel2, c2["cost"], c2["flags"]])
    pick = await pg.evaluate("""async ()=>{const {TECH_DATA:d}=await import('./js/tech-data/stellaris-pc-4.5.4.js');const T=d.technologies;const byId=new Map(T.map(x=>[x.id,x]));
      const cross=T.find(x=>x.prerequisites.some(p=>byId.get(p).area!==x.area));const notReq=T.find(x=>x.requirements.some(r=>r.not)&&x.dlc.length);
      const rep=T.find(x=>x.repeatable&&x.repeatable.levels===null);const free=T.find(x=>x.baseCost===null);
      return {cross:cross.id,crossPre:cross.prerequisites.find(p=>byId.get(p).area!==cross.area),crossArea:byId.get(cross.prerequisites.find(p=>byId.get(p).area!==cross.area)).area,
        free:free.id,notReq:notReq.id,notText:notReq.requirements.find(r=>r.not).text,dlc:notReq.dlc.join(', '),rep:rep.id}}""")
    await pg.evaluate("(id)=>document.querySelector('.tech-node[data-tech-id='+id+']').scrollIntoView({block:'center',inline:'center'})", pick["cross"])
    await pg.click(".tech-node[data-tech-id=%s]" % pick["cross"])
    cross_btn = await pg.evaluate("(id)=>document.querySelector('#tech-card [data-section=prerequisites] button[data-tech-id='+id+'] .tech-card-link-meta')?.textContent", pick["crossPre"])
    await pg.click("#tech-card [data-section=prerequisites] button[data-tech-id=%s]" % pick["crossPre"])
    cross_sel = await pg.evaluate("()=>[document.querySelector('.tech-node.is-selected')?.dataset.techId,document.querySelector('.tech-node.is-selected')?.closest('.tech-area').dataset.area]")
    check("tech tree card: a prerequisite of another area is listed with its area and selecting it jumps there",
          cross_btn and pick["crossArea"].capitalize() in cross_btn and cross_sel == [pick["crossPre"], pick["crossArea"]], (pick, cross_btn, cross_sel))
    await pg.evaluate("(id)=>document.querySelector('.tech-node[data-tech-id='+id+']').scrollIntoView({block:'center',inline:'center'})", pick["notReq"])
    await pg.click(".tech-node[data-tech-id=%s]" % pick["notReq"])
    c3 = await pg.evaluate(card_js)
    check("tech tree card: other requirements as game text with the NOT ones marked, and the DLC list",
          any(r.startswith("NOT: ") and pick["notText"] in r for r in c3["reqs"]) and c3["dlc"] == pick["dlc"], (pick, c3["reqs"], c3["dlc"]))
    await pg.evaluate("(id)=>document.querySelector('.tech-node[data-tech-id='+id+']').scrollIntoView({block:'center',inline:'center'})", pick["free"])
    await pg.click(".tech-node[data-tech-id=%s]" % pick["free"])
    free_cost = (await pg.evaluate(card_js))["cost"]
    check("tech tree card: a technology without a base cost in the game says so", free_cost == "— (the game gives none)", (pick["free"], free_cost))
    await pg.evaluate("()=>document.querySelector('.tech-node[data-tech-id=tech_secrets_vultaum]').scrollIntoView({block:'center',inline:'center'})")
    await pg.click(".tech-node[data-tech-id=tech_secrets_vultaum]")
    c4 = await pg.evaluate(card_js)
    check("tech tree card: unlocks linked to the simulator where T3007 linked them (Vultaum Reality Computer building, physicist job)",
          c4["sim"] == [["planet-sim.html#building=vultaum_reality_computer", "buildings", "vultaum_reality_computer", "Vultaum Reality Computer"]] and c4["unlocks"] == 1 and c4["linkedJobs"] == ["physicist"], c4)
    await pg.evaluate("(id)=>document.querySelector('.tech-node[data-tech-id='+id+']').scrollIntoView({block:'center',inline:'center'})", pick["rep"])
    await pg.click(".tech-node[data-tech-id=%s]" % pick["rep"])
    c5 = await pg.evaluate(card_js)
    await pg.click(".lang-btn[data-lang=es]")
    await pg.wait_for_timeout(300)  # the official names of a language not loaded yet arrive after the first redraw
    c5es = await pg.evaluate(card_js)
    await pg.click(".lang-btn[data-lang=jp]")
    await pg.wait_for_timeout(300)
    c5jp = await pg.evaluate(card_js)
    await pg.click(".lang-btn[data-lang=en]")
    check("tech tree card: repeatable levels, and the labels and the official game names follow the language (es, jp)",
          c5["levels"] == "Unlimited" and c5es["levels"] == "Ilimitados" and "Prerrequisitos" in c5es["labels"] and "前提条件" in c5jp["labels"]
          and len({c5["name"], c5es["name"], c5jp["name"]}) == 3, (c5["levels"], c5es["labels"][:3], c5jp["labels"][:3], c5["name"], c5es["name"], c5jp["name"]))
    open_id = await pg.evaluate("()=>document.getElementById('tech-card').dataset.techId")
    before_close = await pg.evaluate(win_box)
    await pg.focus("#tech-card .tech-card-close")
    await pg.keyboard.press("Enter")
    c6 = await pg.evaluate(card_js)
    sel6 = await pg.evaluate("()=>[document.querySelectorAll('.tech-node.is-selected').length,document.activeElement.dataset.techId||document.activeElement.className]")
    after_close = await pg.evaluate(win_box)
    await pg.click(".tech-node[data-tech-id=tech_lasers_1]")
    await pg.focus("#tech-card [data-section=leadsTo] button")
    await pg.keyboard.press("Enter")
    in_card = await pg.evaluate("()=>[document.activeElement.id,document.getElementById('tech-card').dataset.techId]")
    await pg.focus("#tech-card .tech-card-close")
    await pg.keyboard.press("Escape")
    c7 = await pg.evaluate(card_js)
    esc_focus = await pg.evaluate("()=>document.activeElement.dataset.techId||null")
    check("tech tree card: the close button and Escape hide the card and clear the selection", c6["hidden"] and sel6[0] == 0 and c7["hidden"], (c6["hidden"], sel6, c7["hidden"]))
    check("tech tree card (T3603): closing does not move the tree; closing from the card (× or Escape) puts the focus back on the node, and a card button keeps it on the redrawn card",
          before_close == after_close and sel6[1] == open_id and in_card[0] == "tech-card" and in_card[1] != "tech_lasers_1" and esc_focus == in_card[1], (before_close, after_close, sel6, open_id, in_card, esc_focus))

    # T3203: accent-insensitive search by name and filters (area, field, tier, kind, DLC)
    search_js = """async ()=>{await new Promise(r=>setTimeout(r,60));const nodes=[...document.querySelectorAll('.tech-node')];
      return {match:nodes.filter(n=>n.classList.contains('is-match')).map(n=>n.dataset.techId).sort(),
        kept:nodes.filter(n=>!n.classList.contains('is-filtered-out')).map(n=>n.dataset.techId).sort(),
        has:document.querySelector('.tech-areas').classList.contains('has-filter'),count:document.getElementById('tech-filter-count').textContent,
        results:[...document.querySelectorAll('#tech-filter-results button')].map(b=>b.dataset.techId),more:document.querySelector('.tech-filter-more')?.textContent||'',
        fields:[...document.querySelectorAll('#tech-filter-field option')].map(o=>o.value).filter(Boolean),
        dimmed:getComputedStyle(document.querySelector('.tech-node.is-filtered-out .tech-icon-slot')||document.body).opacity,
        lineOut:document.querySelectorAll('.tech-line.is-filtered-out').length,lines:document.querySelectorAll('.tech-line').length}}"""
    expect_js = """async (f)=>{const {TECH_DATA:d}=await import('./js/tech-data/stellaris-pc-4.5.4.js');
      const fold=(x)=>x.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();const words=fold(f.query||'').split(/\\s+/).filter(Boolean);
      return d.technologies.filter(t=>(!f.area||t.area===f.area)&&(!f.field||t.field===f.field)&&(f.tier===undefined||t.tier===f.tier)&&(!f.kind||t.kind===f.kind)
        &&(!f.dlc||(f.dlc==='base'?!t.dlc.length:t.dlc.includes(f.dlc)))&&words.every(w=>fold([t.name,t.id,...t.variants.map(v=>v.name)].join(' ')).includes(w))).map(t=>t.id).sort()}"""
    form = await pg.evaluate("""()=>({search:!!document.querySelector('form.tech-filters[role=search] input[type=search]#tech-search'),
      selects:[...document.querySelectorAll('.tech-filters select')].map(s=>s.dataset.filter),reset:document.querySelector('.tech-filter-reset').disabled,
      labels:[...document.querySelectorAll('.tech-filter-label')].map(l=>l.textContent),has:document.querySelector('.tech-areas').classList.contains('has-filter')})""")
    check("tech tree search: search box and area, field, tier, kind and DLC filters, nothing filtered at first",
          form["search"] and form["selects"] == ["area", "field", "tier", "kind", "dlc"] and form["reset"] and not form["has"]
          and form["labels"] == ["Search", "Area", "Field", "Tier", "Kind", "DLC"], form)
    await pg.fill("#tech-search", "lasers")
    q1 = await pg.evaluate(search_js)
    e1 = await pg.evaluate(expect_js, {"query": "lasers"})
    await pg.fill("#tech-search", "LÁSÉRS")
    q2 = await pg.evaluate(search_js)
    check("tech tree search: by name, case- and accent-insensitive ('LÁSÉRS' = 'lasers'), matches outlined, the rest and their lines dimmed, count and result buttons",
          q1["match"] == q1["kept"] == e1 and len(e1) >= 5 and q2["match"] == e1 and q1["has"] and float(q1["dimmed"]) < 0.3
          and q1["count"] == "%d of 679 technologies match" % len(e1) and sorted(q1["results"]) == e1 and 0 < q1["lineOut"] < q1["lines"], (q1, e1))
    fold = await pg.evaluate("async ()=>{const m=await import('./js/tech-tree-search.js');return [m.foldText('Énergie Ñandú Über'),m.filterTechnologies({technologies:[{id:'x',name:'Énergie',tier:1,area:'a',field:'f',kind:'normal',dlc:[],variants:[]}]},{query:'energie',area:'',field:'',tier:'',kind:'',dlc:''}).length]}")
    check("tech tree search: the fold removes accents and case from names too ('Énergie' found by 'energie')", fold == ["energie nandu uber", 1], fold)
    await pg.fill("#tech-search", "red laser")
    q3 = await pg.evaluate(search_js)
    await pg.fill("#tech-search", "zzzz nothing")
    q4 = await pg.evaluate(search_js)
    check("tech tree search: every word must appear ('red laser' finds Red Lasers) and no match says so",
          "tech_lasers_1" in q3["match"] and q3["match"] == await pg.evaluate(expect_js, {"query": "red laser"}) and q4["kept"] == [] and q4["count"] == "No technology matches", (q3["match"], q4["count"]))
    await pg.fill("#tech-search", "")
    await pg.select_option("#tech-filter-area", "society")
    await pg.select_option("#tech-filter-tier", "3")
    await pg.select_option("#tech-filter-kind", "rare")
    f1 = await pg.evaluate(search_js)
    e2 = await pg.evaluate(expect_js, {"area": "society", "tier": 3, "kind": "rare"})
    soc_fields = await pg.evaluate("async ()=>{const {TECH_DATA:d}=await import('./js/tech-data/stellaris-pc-4.5.4.js');return d.fields.filter(f=>f.area==='society').map(f=>f.id)}")
    check("tech tree filters: area + tier + kind keep only those technologies, and the field list shows only the fields of the chosen area",
          f1["kept"] == e2 and len(e2) > 0 and f1["match"] == [] and f1["fields"] == soc_fields, (f1["kept"], e2, f1["fields"]))
    await pg.select_option("#tech-filter-field", soc_fields[0])
    f2 = await pg.evaluate(search_js)
    check("tech tree filters: the field filter", f2["kept"] == await pg.evaluate(expect_js, {"area": "society", "tier": 3, "kind": "rare", "field": soc_fields[0]}), f2["kept"])
    await pg.click(".tech-filter-reset")
    await pg.select_option("#tech-filter-dlc", "The Machine Age")
    f3 = await pg.evaluate(search_js)
    await pg.select_option("#tech-filter-dlc", "base")
    f4 = await pg.evaluate(search_js)
    e3, e4 = await pg.evaluate(expect_js, {"dlc": "The Machine Age"}), await pg.evaluate(expect_js, {"dlc": "base"})
    check("tech tree filters: DLC (The Machine Age: its technologies; Base game: those without DLC), with the extra matches counted under the list",
          f3["kept"] == e3 and len(e3) > 5 and f4["kept"] == e4 and len(e4) > 400 and len(f4["results"]) == 30 and str(len(e4) - 30) in f4["more"], (len(e3), len(e4), f4["more"]))
    await pg.click(".tech-filter-reset")
    await pg.fill("#tech-search", "blue lasers")
    await pg.click("#tech-filter-results button[data-tech-id=tech_lasers_2]")
    pick = await pg.evaluate("()=>[document.querySelector('.tech-node.is-selected')?.dataset.techId,document.getElementById('tech-card').dataset.techId]")
    await pg.click(".lang-btn[data-lang=es]")
    es_search = await pg.evaluate("()=>[document.querySelector('.tech-filter-label').textContent,document.querySelector('#tech-filter-area option').textContent,document.getElementById('tech-filter-count').textContent,document.getElementById('tech-search').value]")
    await pg.click(".lang-btn[data-lang=en]")
    await pg.click(".tech-filter-reset")
    f5 = await pg.evaluate(search_js)
    await pg.keyboard.press("Escape")
    check("tech tree search: a result button selects the technology and opens its card; labels follow the language keeping the search; reset clears everything",
          pick == ["tech_lasers_2", "tech_lasers_2"] and es_search[0] == "Buscar" and es_search[1] == "Todos" and "tecnologías coinciden" in es_search[2]
          and es_search[3] == "blue lasers" and not f5["has"] and len(f5["kept"]) == 679 and f5["lineOut"] == 0 and f5["count"] == "", (pick, es_search, f5["has"]))

    # T3204: zoom and pan (buttons, keys, Ctrl + wheel, mouse drag, arrow keys)
    zoom_js = """(area)=>{const sc=document.querySelector('.tech-areas');const g=sc.querySelector('.tech-stack');const w=sc.querySelector('.tech-zoom');
      const n=g.querySelector('.tech-node');const svg=g.querySelector('.tech-lines');const r=(e)=>e.getBoundingClientRect();
      return {level:document.getElementById('tech-zoom-level').textContent,transform:g.style.transform,gridW:g.offsetWidth,gridVis:r(g).width,
        wrapW:w?w.getBoundingClientRect().width:0,scrollW:sc.scrollWidth,clientW:sc.clientWidth,left:sc.scrollLeft,top:sc.scrollTop,
        nodeW:r(n).width,nodeOff:n.offsetWidth,svgVis:svg?r(svg).width:0,lines:svg?svg.querySelectorAll('path').length:0,
        tab:sc.tabIndex,label:sc.getAttribute('aria-label'),
        disabled:[...document.querySelectorAll('.tech-zoom-btn')].map(b=>[b.dataset.zoom,b.disabled])}}"""
    z0 = await pg.evaluate(zoom_js, "physics")
    check("tech tree zoom: zoom bar (−, level, +, 100 %) at 100 % with nothing scaled; the tree window is one focusable region with a name",
          z0["level"] == "100 %" and z0["transform"] == "" and dict(z0["disabled"]) == {"out": False, "in": False, "reset": True}
          and z0["tab"] == 0 and z0["label"] == "Technology tree", z0)
    await pg.click(".tech-zoom-btn[data-zoom=in]")
    z1 = await pg.evaluate(zoom_js, "physics")
    check("tech tree zoom: + scales the three areas, nodes and lines together (115 %), the window scrolls exactly over the scaled tree and the lines are not redrawn",
          z1["level"] == "115 %" and z1["transform"] == "scale(1.15)" and abs(z1["nodeW"] - z0["nodeOff"] * 1.15) < 1
          and abs(z1["svgVis"] - z1["gridW"] * 1.15) < 1 and abs(z1["wrapW"] - z1["gridW"] * 1.15) < 1 and z1["lines"] == z0["lines"]
          and abs(z1["scrollW"] - max(z1["clientW"], round(z1["wrapW"]))) <= 2, z1)
    await pg.focus(".tech-areas")
    for _ in range(4):
        await pg.keyboard.press("-")
    z2 = await pg.evaluate(zoom_js, "physics")
    await pg.click(".lang-btn[data-lang=es]")
    es_zoom = await pg.evaluate("()=>[document.querySelector('.tech-zoom-btn[data-zoom=in]').getAttribute('aria-label'),document.querySelector('.tech-areas').getAttribute('aria-label')]")
    await pg.click(".lang-btn[data-lang=en]")
    check("tech tree zoom: the - key inside the tree zooms out step by step (60 %), with no empty scroll space; labels follow the language",
          z2["level"] == "60 %" and z2["transform"] == "scale(0.6)" and z2["scrollW"] <= max(z2["clientW"], round(z2["gridW"] * 0.6)) + 2
          and es_zoom == ["Acercar", "Árbol de tecnología"], (z2, es_zoom))
    await pg.focus(".tech-areas")
    await pg.keyboard.press("0")
    z_reset = (await pg.evaluate(zoom_js, "physics"))["level"]
    check("tech tree zoom: the 0 key inside the tree goes back to 100 %", z_reset == "100 %", z_reset)
    await pg.evaluate("()=>{const sc=document.querySelector('.tech-areas');sc.scrollLeft=200;sc.scrollTop=100}")
    box = await pg.evaluate("()=>{const r=document.querySelector('.tech-areas').getBoundingClientRect();return [r.left,r.top,r.width,r.height]}")
    px, py = box[0] + box[2] * 0.6, box[1] + box[3] * 0.5
    before = await pg.evaluate(zoom_js, "physics")
    await pg.mouse.move(px, py)
    await pg.keyboard.down("Control")
    await pg.mouse.wheel(0, -150)
    await pg.keyboard.up("Control")
    await pg.wait_for_timeout(150)
    after = await pg.evaluate(zoom_js, "physics")
    za = float(after["level"].split()[0]) / 100
    ax, ay = box[2] * 0.6, box[3] * 0.5
    check("tech tree zoom: Ctrl + wheel zooms in around the pointer (the point under it stays put)",
          za > 1 and abs((before["left"] + ax) - (after["left"] + ax) / za) < 3 and abs((before["top"] + ay) - (after["top"] + ay) / za) < 3, (before["left"], after["left"], za))
    await pg.click(".tech-zoom-btn[data-zoom=reset]")
    z3 = await pg.evaluate(zoom_js, "physics")
    await pg.evaluate("()=>{const sc=document.querySelector('.tech-areas');sc.scrollLeft=0;sc.scrollTop=0}")
    corner = await pg.evaluate("()=>{const r=document.querySelector('#tech-area-physics .tech-grid-corner').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}")
    await pg.mouse.move(corner[0], corner[1] + 4)
    await pg.mouse.down()
    await pg.mouse.move(corner[0] - 120, corner[1] + 4, steps=5)
    await pg.mouse.up()
    dragged = (await pg.evaluate(zoom_js, "physics"))["left"]
    await pg.focus(".tech-areas")
    await pg.keyboard.press("ArrowRight")
    await pg.keyboard.press("ArrowDown")
    await pg.wait_for_timeout(300)
    keyed = await pg.evaluate(zoom_js, "physics")
    check("tech tree pan: 100 % removes the scale; dragging the empty space with the mouse pans the window, and the arrow keys move it once it has the focus",
          z3["level"] == "100 %" and z3["transform"] == "" and abs(dragged - 120) <= 2 and keyed["left"] > dragged and keyed["top"] > 0, (z3["level"], dragged, keyed["left"], keyed["top"]))
    await pg.click(".tech-zoom-btn[data-zoom=out]")
    await pg.evaluate("()=>document.querySelector('.tech-node[data-tech-id=tech_lasers_2]').scrollIntoView({block:'center',inline:'center'})")
    await pg.click(".tech-node[data-tech-id=tech_lasers_2]")
    zsel = await pg.evaluate("()=>[document.querySelector('.tech-node.is-selected')?.dataset.techId,document.getElementById('tech-zoom-level').textContent]")
    await pg.keyboard.press("Escape")
    await pg.click(".tech-zoom-btn[data-zoom=reset]")
    check("tech tree zoom: nodes can still be clicked while zoomed out", zsel == ["tech_lasers_2", "90 %"], zsel)

    check("tech tree page: no page errors", not errors, errors[:3])
    await pg.close()
    await mobile_checks(t)


async def mobile_checks(t):
    """T3105, T3601: phone layout at 320 and 375 px (touch): stacked areas with jump buttons, compact grid, sideways scroll inside the window, tap to select."""
    mctx = await t.browser.new_context(locale="en-US", viewport={"width": 320, "height": 700}, has_touch=True, is_mobile=True)
    await mctx.route("https://**/*", lambda r: r.abort())
    pg = await mctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.goto("file://" + ROOT + "/tech-tree.html")
    await pg.wait_for_timeout(300)
    await pg.click(".lang-btn[data-lang=en]")
    desktop_node = 176  # 11rem: node width of the desktop grid
    for width in (320, 375):
        await pg.set_viewport_size({"width": width, "height": 700})
        for lang in ("en", "jp"):
            await pg.click(".lang-btn[data-lang=" + lang + "]")
            for area in ("physics", "society", "engineering"):
                await pg.tap("#tech-jump-" + area)
                await pg.wait_for_timeout(120)
                m = await pg.evaluate("""(area)=>{const w=document.documentElement.clientWidth;const r=(e)=>e.getBoundingClientRect();
                  const sc=document.querySelector('.tech-areas');const panel=document.querySelector('#tech-area-'+area);const g=panel.querySelector('.tech-grid');
                  const jumps=[...document.querySelectorAll('.tech-area-jump')];const node=g.querySelector('.tech-cell[data-tier="0"] .tech-node')||g.querySelector('.tech-node');
                  const label=g.querySelector('.tech-field-label');const svg=sc.querySelector('.tech-lines');const st=sc.querySelector('.tech-stack');
                  return {page:document.documentElement.scrollWidth<=w,windowIn:r(sc).left>=0&&r(sc).right<=w+0.5,
                    atTop:Math.abs(r(panel).top-r(sc).top)<=2||sc.scrollTop+sc.clientHeight>=sc.scrollHeight-2,
                    jumps:jumps.map(b=>[Math.round(r(b).height),b.scrollWidth<=b.clientWidth+1]),
                    scrolls:sc.scrollWidth>sc.clientWidth&&getComputedStyle(sc).overflowX==='auto',
                    nodeW:Math.round(r(node).width),nodeH:Math.round(r(node).height),labelW:Math.round(r(label).width),
                    tier0Visible:r(node).left>=r(sc).left&&r(node).right<=r(sc).right,
                    icon:Math.round(r(node.querySelector('.tech-icon-slot')).width),
                    nameFits:[...g.querySelectorAll('.tech-node-name')].every(n=>n.scrollWidth<=n.clientWidth+1),
                    lines:svg?svg.querySelectorAll('path').length:0,svgSize:svg?+svg.getAttribute('width')===st.offsetWidth:false}}""", area)
                check("tech tree mobile %dpx (%s) %s: no page overflow, the window fits, its jump button scrolls to the area, 44 px buttons, compact nodes, thin field labels, sideways scroll in the window, lines drawn" % (width, lang, area),
                      m["page"] and m["windowIn"] and m["atTop"] and all(h >= 44 and fits for h, fits in m["jumps"]) and m["scrolls"]
                      and m["nodeW"] < desktop_node and m["nodeH"] >= 44 and m["labelW"] <= 34 and m["tier0Visible"] and m["icon"] == 40
                      and m["nameFits"] and m["lines"] > 300 and m["svgSize"], m)
    win = await pg.evaluate("()=>{const r=document.querySelector('.tech-areas').getBoundingClientRect();return [Math.round(r.height),innerHeight,r.left>=0&&r.right<=document.documentElement.clientWidth+0.5]}")
    check("tech tree mobile (T3602): the tree window is 80 % of the screen height and fits its width", abs(win[0] - win[1] * 0.8) <= 2 and win[2], win)
    await pg.click(".lang-btn[data-lang=en]")
    await pg.tap("#tech-jump-physics")
    await pg.wait_for_timeout(100)
    await pg.evaluate("()=>document.querySelector('.tech-node[data-tech-id=tech_lasers_2]').scrollIntoView({block:'center',inline:'center'})")
    await pg.wait_for_timeout(100)
    await pg.tap(".tech-node[data-tech-id=tech_lasers_2]")
    tapped = await pg.evaluate("()=>[document.querySelector('.tech-node.is-selected')?.dataset.techId,document.querySelectorAll('.tech-node.is-prerequisite').length,document.getElementById('tech-selection-status').textContent,document.documentElement.scrollWidth<=document.documentElement.clientWidth]")
    check("tech tree mobile: tapping a node selects it and marks its prerequisites, without page overflow",
          tapped[0] == "tech_lasers_2" and tapped[1] == 1 and "Blue Lasers" in tapped[2] and tapped[3], tapped)
    card = await pg.evaluate("""()=>{const c=document.getElementById('tech-card');const r=c.getBoundingClientRect();const w=document.documentElement.clientWidth;
      return [!c.hidden,r.left>=0&&r.right<=w+0.5,r.height<=window.innerHeight*0.56,c.querySelector('.tech-card-close').getBoundingClientRect().height>=44]}""")
    await pg.tap("#tech-card .tech-card-close")
    closed = await pg.evaluate("()=>document.getElementById('tech-card').hidden")
    check("tech tree mobile: the detail card is a bottom sheet inside the 320 px screen with a 44 px close button", all(card) and closed, (card, closed))
    # T3603: on phones the selected node is kept above the bottom sheet
    await pg.evaluate("()=>{const sc=document.querySelector('.tech-areas');const n=document.querySelector('.tech-node[data-tech-id=tech_lasers_2]');sc.scrollTop+=n.getBoundingClientRect().bottom-sc.getBoundingClientRect().bottom+4;n.scrollIntoView({block:'end',inline:'nearest'})}")
    await pg.wait_for_timeout(100)
    await pg.tap(".tech-node[data-tech-id=tech_lasers_2]")
    above = await pg.evaluate("""async ()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const n=document.querySelector('.tech-node[data-tech-id=tech_lasers_2]').getBoundingClientRect();
      const c=document.getElementById('tech-card');const r=c.getBoundingClientRect();return [!c.hidden,n.bottom<=r.top+1,n.top>=0]}""")
    await pg.tap("#tech-card .tech-card-close")
    check("tech tree mobile (T3603): a node selected near the bottom is scrolled above the bottom sheet", above == [True, True, True], above)
    await pg.select_option("#tech-filter-area", "engineering")
    await pg.wait_for_timeout(100)
    mf = await pg.evaluate("""()=>{const w=document.documentElement.clientWidth;const r=(e)=>e.getBoundingClientRect();
      const sc=document.querySelector('.tech-areas');
      return [document.querySelector('.tech-area-jump[aria-current=true]')?.dataset.area,document.documentElement.scrollWidth<=w,
        [...document.querySelectorAll('.tech-filters input,.tech-filters select,.tech-filter-reset')].every(e=>r(e).right<=w+0.5&&r(e).height>=44)]}""")
    await pg.select_option("#tech-filter-area", "")
    check("tech tree mobile: the area filter scrolls the tree window to that area; the filters fit the 320 px screen with 44 px controls", mf == ["engineering", True, True], mf)
    pinch = await pg.evaluate("""async ()=>{const sc=document.querySelector('.tech-areas');const r=sc.getBoundingClientRect();
      const cx=r.left+r.width/2,cy=r.top+r.height/2;const touch=(id,x)=>new Touch({identifier:id,target:sc,clientX:x,clientY:cy});
      const fire=(type,d)=>{const list=type==='touchend'?[]:[touch(1,cx-d),touch(2,cx+d)];sc.dispatchEvent(new TouchEvent(type,{touches:list,targetTouches:list,changedTouches:list,bubbles:true,cancelable:true}))};
      fire('touchstart',30);fire('touchmove',45);fire('touchmove',60);const zin=document.getElementById('tech-zoom-level').textContent;fire('touchend',0);
      fire('touchstart',60);fire('touchmove',30);const zout=document.getElementById('tech-zoom-level').textContent;fire('touchend',0);
      const btns=[...document.querySelectorAll('.tech-zoom-btn')].map(b=>Math.round(b.getBoundingClientRect().height));
      document.querySelector('.tech-zoom-btn[data-zoom=reset]').click();
      return {zin,zout,btns,fits:document.documentElement.scrollWidth<=document.documentElement.clientWidth}}""")
    check("tech tree mobile: a two-finger pinch zooms in (fingers apart) and out (together); 44 px zoom buttons; no page overflow",
          pinch["zin"] == "160 %" and pinch["zout"] == "80 %" and min(pinch["btns"]) >= 44 and pinch["fits"], pinch)
    check("tech tree mobile: no page errors", not errors, errors[:3])
    await mctx.close()


async def deeplink_checks(t):
    """T3205: deep link to a technology in the URL hash, from the tree itself and from a wiki article."""
    pg = await t.ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.set_viewport_size({"width": 1280, "height": 900})
    url = "file://" + ROOT + "/tech-tree.html"
    state_js = """()=>{const n=document.querySelector('.tech-node.is-selected');const r=n?n.getBoundingClientRect():null;const p=n?n.closest('.tech-areas').getBoundingClientRect():null;
      return {hash:location.hash,selected:n?.dataset.techId||null,card:document.getElementById('tech-card').hidden?null:document.getElementById('tech-card').dataset.techId,
        inView:!!r&&r.top>=0&&r.bottom<=innerHeight&&r.left>=p.left-1&&r.right<=p.right+1,history:history.length,
        permalink:document.querySelector('#tech-card .tech-card-permalink')?.getAttribute('href')||null,status:document.getElementById('tech-selection-status').textContent}}"""
    # English set before loading: clicking the language button would scroll the header into view
    await pg.goto("file://" + ROOT + "/index.html")
    await pg.evaluate("()=>localStorage.setItem('codex-ignis-lang','en')")
    await pg.goto(url + "#tech_lasers_2")
    await pg.wait_for_timeout(500)
    d1 = await pg.evaluate(state_js)
    check("tech tree deep link: tech-tree.html#tech_lasers_2 opens with Blue Lasers selected, its card open and the node scrolled into view, with a permanent link in the card",
          d1["selected"] == d1["card"] == "tech_lasers_2" and d1["inView"] and d1["permalink"] == "#tech_lasers_2" and d1["hash"] == "#tech_lasers_2", d1)
    await pg.click(".tech-node[data-tech-id=tech_lasers_1]")
    d2 = await pg.evaluate(state_js)
    await pg.keyboard.press("Escape")
    d3 = await pg.evaluate(state_js)
    check("tech tree deep link: selecting another technology writes its id in the hash without new history entries; clearing the selection removes it",
          d2["hash"] == "#tech_lasers_1" and d2["history"] == d1["history"] and d3["hash"] == "" and d3["selected"] is None, (d2["hash"], d3["hash"], d1["history"], d2["history"]))
    await pg.evaluate("()=>{location.hash='#tech_secrets_vultaum'}")
    await pg.wait_for_timeout(300)
    d4 = await pg.evaluate(state_js)
    await pg.evaluate("()=>{location.hash='#tech-credits'}")
    await pg.wait_for_timeout(200)
    d5 = await pg.evaluate(state_js)
    check("tech tree deep link: changing the hash selects that technology (Society); other anchors such as #tech-credits leave the selection alone",
          d4["selected"] == d4["card"] == "tech_secrets_vultaum" and d4["inView"] and d5["selected"] == "tech_secrets_vultaum", (d4, d5["selected"]))
    await pg.goto(url + "#tech_does_not_exist")
    await pg.wait_for_timeout(400)
    d6 = await pg.evaluate(state_js)
    await pg.click(".lang-btn[data-lang=es]")
    d6es = (await pg.evaluate(state_js))["status"]
    await pg.click(".lang-btn[data-lang=en]")
    check("tech tree deep link: an unknown technology id selects nothing and says so (translated)",
          d6["selected"] is None and "tech_does_not_exist" in d6["status"] and "does not exist" in d6["status"] and "no existe" in d6es, (d6["status"], d6es))
    mod = await pg.evaluate("""async ()=>{const m=await import('./js/tech-tree-link.js');
      return [m.techTreeUrl('tech_lasers_2'),m.techIdFromHash('#tech_lasers_2'),m.techIdFromHash('#/slug'),m.techIdFromHash('#%E0%A4%A'),
        m.formatTechLinks('See [Blue Lasers](tech-tree.html#tech_lasers_2) and [x](tech-tree.html#bad id)'),m.isTechTreeUrl('tech-tree.html#tech_x'),m.isTechTreeUrl('https://example.com')]}""")
    check("tech tree deep link: link helpers (URL, hash parsing that ignores other hashes, Markdown link to the tree as a same-tab link)",
          mod == ["tech-tree.html#tech_lasers_2", "tech_lasers_2", None, None,
                  'See <a class="tech-tree-link" href="tech-tree.html#tech_lasers_2">Blue Lasers</a> and [x](tech-tree.html#bad id)', True, False], mod)
    await pg.close()

    # from a wiki article: a Markdown link and a "links" block item to the tree open it in the same tab with the technology selected
    pg = await t.ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.goto("file://" + ROOT + "/index.html")
    await pg.wait_for_timeout(400)
    await pg.evaluate("""async ()=>{const {knowledgeBase}=await import('./js/content.js');
      knowledgeBase.push({slug:'smoke-tech-link',title:'Smoke tech link',icon:'✦',hidden:true,blocks:[
        {type:'paragraph',text:'Research [Blue Lasers](tech-tree.html#tech_lasers_2) first.'},
        {type:'links',items:[{label:'Vultaum Reality Computer',url:'tech-tree.html#tech_secrets_vultaum'}]}]});
      location.hash='#/smoke-tech-link'}""")
    await pg.wait_for_timeout(400)
    wiki = await pg.evaluate("""()=>[...document.querySelectorAll('a[href^="tech-tree.html#"]')].map(a=>[a.getAttribute('href'),a.getAttribute('target'),a.textContent])""")
    check("wiki: links to a technology of the tree ([text](tech-tree.html#id) and link lists) open in the same tab",
          wiki == [["tech-tree.html#tech_lasers_2", None, "Blue Lasers"], ["tech-tree.html#tech_secrets_vultaum", None, "Vultaum Reality Computer"]], wiki)
    await pg.click('a[href="tech-tree.html#tech_lasers_2"]')
    await pg.wait_for_timeout(600)
    landed = await pg.evaluate(state_js)
    check("wiki → tech tree: following the link opens the tree with that technology selected and its card open",
          pg.url.endswith("tech-tree.html#tech_lasers_2") and landed["selected"] == landed["card"] == "tech_lasers_2", (pg.url, landed))
    check("tech tree deep link: no page errors", not errors, errors[:3])
    await pg.close()


# Test-only version entry: the fixture is offered by the selector only when a test rewrites js/tech-versions.js
FIXTURE_VERSION = ('{id: "fixture", label: "Test fixture", file: "../tests/fixtures/tech-tree/tech-data-fixture.js", '
                   'verification: "unverified"},')


async def version_checks(t):
    """T3301: version selector and per-version data loading (the fixture plays a second version)."""
    reg = node_json("""import * as v from './js/tech-versions.js'; import {DATA_COLLECTIONS as C} from './js/data-version.js';
      const files = await Promise.all(v.TECH_VERSIONS.map(async (x) => (await v.loadTechData(x)).rulesetId === x.id));
      let bad = null; try { await v.loadTechData({id: 'other', file: './tech-data/stellaris-pc-4.5.4.js'}); } catch (e) { bad = 'rejected'; }
      const cur = v.currentTechVersion();
      console.log(JSON.stringify({ids: v.TECH_VERSIONS.map((x) => x.id), current: cur.id, files, bad,
        registered: C.technologies.rulesetId === cur.id && 'js/' + cur.file.slice(2) === C.technologies.file && C.technologies.verification === cur.verification,
        pick: [v.pickTechVersion('?version=stellaris-pc-4.5.4', 'x'), v.pickTechVersion('?version=nope', null), v.pickTechVersion('', 'stale'), v.pickTechVersion('', null)]
          .map((p) => [p.version.id, p.unknownId]),
        urls: [v.versionUrl('https://h/tech-tree.html?version=old#tech_a', cur.id), v.versionUrl('https://h/tech-tree.html#tech_a', 'other')]}))""")
    check("tech tree versions: registry of data files (4.5.4 current, the one registered in data-version.js), each file holds its own rulesetId, a mismatch is rejected",
          reg.get("ids") == ["stellaris-pc-4.5.4"] and reg.get("current") == "stellaris-pc-4.5.4" and reg.get("files") == [True]
          and reg.get("bad") == "rejected" and reg.get("registered"), reg)
    check("tech tree versions: version from ?version=, then the stored choice, then the current one; an unknown id falls back and is reported; the URL keeps the hash",
          reg.get("pick") == [["stellaris-pc-4.5.4", None], ["stellaris-pc-4.5.4", "nope"], ["stellaris-pc-4.5.4", None], ["stellaris-pc-4.5.4", None]]
          and reg.get("urls") == ["https://h/tech-tree.html#tech_a", "https://h/tech-tree.html?version=other#tech_a"], reg)

    state_js = """()=>({options:[...document.querySelectorAll('#tech-version-select option')].map(o=>[o.value,o.textContent,o.selected]),
      label:document.querySelector('label[for=tech-version-select]').textContent,
      warning:document.getElementById('tech-version-warning').hidden?null:document.getElementById('tech-version-warning').textContent,
      version:document.getElementById('tech-data-version').dataset.rulesetId,line:document.getElementById('tech-data-version').textContent,
      nodes:document.querySelectorAll('.tech-node').length,fixtureNodes:document.querySelectorAll('.tech-node[data-tech-id^=tech_fixture_]').length,
      selected:document.querySelector('.tech-node.is-selected')?.dataset.techId||null,status:document.getElementById('tech-selection-status').textContent,
      cardVersion:document.querySelector('#tech-card:not([hidden]) [data-fact=version] dd')?.textContent||null,
      stored:localStorage.getItem('techTreeVersion'),search:location.search,hash:location.hash})"""
    errors = []
    pg = await t.ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.goto("file://" + ROOT + "/tech-tree.html")
    await pg.wait_for_timeout(400)
    await pg.click(".lang-btn[data-lang=en]")
    s1 = await pg.evaluate(state_js)
    check("tech tree versions: the selector lists the 4.5.4 version as current and selected, and the page draws its 679 technologies",
          s1["options"] == [["stellaris-pc-4.5.4", "Stellaris PC 4.5.4 · current", True]] and s1["label"] == "Game version"
          and s1["warning"] is None and s1["version"] == "stellaris-pc-4.5.4" and s1["nodes"] == 679, s1)
    await pg.goto("file://" + ROOT + "/tech-tree.html?version=stellaris-pc-9.9.9")
    await pg.wait_for_timeout(400)
    s2 = await pg.evaluate(state_js)
    await pg.click(".lang-btn[data-lang=es]")
    s2es = (await pg.evaluate(state_js))["warning"]
    await pg.click(".lang-btn[data-lang=en]")
    check("tech tree versions: an unknown ?version= shows the current data with a translated notice",
          s2["version"] == "stellaris-pc-4.5.4" and s2["nodes"] == 679 and "stellaris-pc-9.9.9" in (s2["warning"] or "")
          and "does not exist" in s2["warning"] and "no existe" in (s2es or ""), (s2["warning"], s2es))
    await pg.close()

    # the fixture as a second version: a local server of the project and a rewritten registry that adds it
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=ROOT))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = "http://127.0.0.1:%d/" % server.server_address[1]
    registry = open(os.path.join(ROOT, "js", "tech-versions.js"), encoding="utf-8").read()
    patched = registry.replace("export const TECH_VERSIONS = [", "export const TECH_VERSIONS = [\n  " + FIXTURE_VERSION, 1)
    ctx = await t.browser.new_context(locale="en-US")
    await ctx.route("https://**/*", lambda r: r.abort())
    await ctx.route("**/js/tech-versions.js", lambda r: r.fulfill(body=patched, content_type="text/javascript"))
    pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    try:
        await pg.goto(base + "tech-tree.html#tech_lasers_2")
        await wait_for_tree(pg, "stellaris-pc-4.5.4", 679, "tech_lasers_2")
        s3 = await pg.evaluate(state_js)
        async with pg.expect_navigation():
            await pg.select_option("#tech-version-select", "fixture")
        await wait_for_tree(pg, "fixture", 38)
        try:
            await pg.wait_for_function("()=>document.getElementById('tech-selection-status').textContent.includes('tech_lasers_2')", timeout=5000)
        except Exception:
            pass
        s4 = await pg.evaluate(state_js)
        check("tech tree versions: choosing another version reloads the page with ?version= and only that data file (the fixture's 38 fake technologies), keeping the hash",
              [o[0] for o in s3["options"]] == ["fixture", "stellaris-pc-4.5.4"] and s3["selected"] == "tech_lasers_2"
              and s4["search"] == "?version=fixture" and s4["hash"] == "#tech_lasers_2" and s4["version"] == "fixture"
              and "Fixture v0.0.1" in s4["line"] and s4["nodes"] == s4["fixtureNodes"] == 38 and s4["stored"] == "fixture"
              and [o[0] for o in s4["options"] if o[2]] == ["fixture"], (s3["options"], s3["selected"], {k: v for k, v in s4.items() if k != "status"}))
        check("tech tree versions: a technology of the other version is reported as missing from this data version",
              s4["selected"] is None and "tech_lasers_2" in s4["status"] and "does not exist" in s4["status"], s4["status"])
        await pg.click(".tech-node[data-tech-id=tech_fixture_spark_counting]")
        s5 = await pg.evaluate(state_js)
        await pg.goto(base + "tech-tree.html")
        await wait_for_tree(pg, "fixture", 38)
        s6 = await pg.evaluate(state_js)
        check("tech tree versions: the card shows the fixture version, and the stored choice is used when the URL names no version",
              s5["cardVersion"] == "fixture · Fixture v0.0.1" and s6["version"] == "fixture" and s6["nodes"] == 38, (s5["cardVersion"], s6["version"], s6["nodes"]))
        async with pg.expect_navigation():
            await pg.select_option("#tech-version-select", "stellaris-pc-4.5.4")
        await wait_for_tree(pg, "stellaris-pc-4.5.4", 679)
        s7 = await pg.evaluate(state_js)
        check("tech tree versions: going back to the current version drops ?version= and draws the 4.5.4 data again",
              s7["search"] == "" and s7["version"] == "stellaris-pc-4.5.4" and s7["nodes"] == 679 and s7["stored"] == "stellaris-pc-4.5.4", s7["search"])
        await ctx.close()
        await compare_checks(t, base, registry, errors)
    finally:
        await ctx.close()
        server.shutdown()
    check("tech tree versions: no page errors", not errors, errors[:3])


# Second test-only version (T3303): the fixture with a few changes, newest first in the rewritten registry
FIXTURE_NEXT_VERSION = ('{id: "fixture-next", label: "Test fixture next", file: "../tests/fixtures/tech-tree/tech-data-fixture-next.js", '
                        'verification: "unverified"},')


async def compare_checks(t, base, registry, errors):
    """T3303: comparison between two versions (the fixture and its next version)."""
    pure = node_json("""import {compareTechData as c} from './js/tech-tree-compare.js';
      import {TECH_DATA as a} from './tests/fixtures/tech-tree/tech-data-fixture.js';
      import {TECH_DATA as b} from './tests/fixtures/tech-tree/tech-data-fixture-next.js';
      const d = c(a, b), back = c(b, a), same = c(a, a);
      const strip = (x) => ({id: x.id, cost: x.cost, tier: x.tier, prerequisites: x.prerequisites});
      console.log(JSON.stringify({added: d.added.map((x) => x.id), removed: d.removed.map((x) => x.id), changed: d.changed.map(strip),
        back: [back.added.map((x) => x.id), back.removed.map((x) => x.id), back.changed.length],
        same: same.added.length + same.removed.length + same.changed.length}))""")
    check("tech tree compare: added, removed and changed cost / tier / prerequisites between the fixture versions (description changes ignored)",
          pure.get("added") == ["tech_fixture_lens_polisher"] and pure.get("removed") == ["tech_fixture_found_beacon"]
          and pure.get("changed") == [
              {"id": "tech_fixture_assembly_echo", "prerequisites": {"added": ["tech_fixture_vine_lattice"], "removed": []}},
              {"id": "tech_fixture_crease_alloys", "prerequisites": {"added": [], "removed": ["tech_fixture_rivet_basics"]}},
              {"id": "tech_fixture_drift_coil", "cost": {"from": 444, "to": 555}, "tier": {"from": 4, "to": 5}},
              {"id": "tech_fixture_echo_relay", "cost": {"from": 111, "to": 150}},
              {"id": "tech_fixture_wake_skimmer", "tier": {"from": 3, "to": 4}}]
          and pure.get("back") == [["tech_fixture_found_beacon"], ["tech_fixture_lens_polisher"], 5] and pure.get("same") == 0, pure)

    state_js = """()=>({heading:document.getElementById('tech-compare-heading').textContent,
      controls:!document.querySelector('.tech-compare-controls').hidden,
      from:document.getElementById('tech-compare-from')?.value,to:document.getElementById('tech-compare-to')?.value,
      labels:[...document.querySelectorAll('.tech-compare-field label')].map(l=>l.textContent),
      note:document.querySelector('.tech-compare-note')?.textContent||null,
      summary:document.querySelector('.tech-compare-summary')?.textContent||null,
      groups:Object.fromEntries([...document.querySelectorAll('.tech-compare-group')].map(g=>[g.dataset.group,
        [...g.querySelectorAll('.tech-compare-item')].map(i=>i.dataset.techId)])),
      changes:Object.fromEntries([...document.querySelectorAll('[data-group=changed] .tech-compare-item')].map(i=>[i.dataset.techId,
        [...i.querySelectorAll('[data-change]')].map(c=>c.textContent)])),
      links:[...document.querySelectorAll('.tech-compare-link')].map(a=>[a.dataset.techId,new URL(a.href).search+new URL(a.href).hash]),
      wide:document.documentElement.scrollWidth>document.documentElement.clientWidth})"""

    # only one data version: the section explains that the comparison needs a second one
    pg = await t.ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.goto("file://" + ROOT + "/tech-tree.html")
    await pg.wait_for_timeout(400)
    await pg.click(".lang-btn[data-lang=en]")
    c1 = await pg.evaluate(state_js)
    await pg.click(".lang-btn[data-lang=es]")
    c1es = await pg.evaluate(state_js)
    await pg.click(".lang-btn[data-lang=en]")
    await pg.close()
    check("tech tree compare: with a single data version the section says the comparison waits for the next one (translated)",
          c1["heading"] == "Compare versions" and not c1["controls"] and "only one data version (Stellaris PC 4.5.4)" in (c1["note"] or "")
          and c1es["heading"] == "Comparar versiones" and "Solo hay una versión" in (c1es["note"] or ""), (c1, c1es["note"]))

    patched = registry.replace("export const TECH_VERSIONS = [", "export const TECH_VERSIONS = [\n  " + FIXTURE_NEXT_VERSION + "\n  " + FIXTURE_VERSION, 1)
    ctx = await t.browser.new_context(locale="en-US")
    await ctx.route("https://**/*", lambda r: r.abort())
    await ctx.route("**/js/tech-versions.js", lambda r: r.fulfill(body=patched, content_type="text/javascript"))
    loaded = []
    pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("request", lambda r: loaded.append(r.url.rsplit("/", 1)[-1]) if "tech-data" in r.url else None)
    try:
        await pg.goto(base + "tech-tree.html?version=fixture-next")
        await wait_for_tree(pg, "fixture-next")
        c2 = await pg.evaluate(state_js)
        before = list(loaded)
        # (the next fixture imports the fixture itself, so the file that must not load early is the 4.5.4 one)
        await pg.select_option("#tech-compare-from", "stellaris-pc-4.5.4")
        early = list(loaded)
        await pg.click(".tech-compare-run")
        await pg.wait_for_timeout(800)
        c2b = await pg.evaluate(state_js)
        await pg.select_option("#tech-compare-from", "fixture")
        await pg.click(".tech-compare-run")
        await pg.wait_for_timeout(300)
        c3 = await pg.evaluate(state_js)
        check("tech tree compare: defaults to the previous version → the shown one, and loads the other data file only when asked",
              c2["controls"] and c2["from"] == "fixture" and c2["to"] == "fixture-next" and c2["labels"] == ["From", "To"]
              and c2["summary"] is None and "stellaris-pc-4.5.4.js" not in before + early and "stellaris-pc-4.5.4.js" in loaded
              and (c2b["summary"] or "").endswith("38 added · 679 removed · 0 changed"), (c2, before, loaded, c2b["summary"]))
        check("tech tree compare: summary and the added, removed and changed lists of the fixture versions",
              c3["summary"] == "Test fixture → Test fixture next: 1 added · 1 removed · 5 changed"
              and c3["groups"] == {"added": ["tech_fixture_lens_polisher"], "removed": ["tech_fixture_found_beacon"],
                                   "changed": ["tech_fixture_assembly_echo", "tech_fixture_crease_alloys", "tech_fixture_drift_coil",
                                               "tech_fixture_echo_relay", "tech_fixture_wake_skimmer"]}
              and c3["changes"] == {"tech_fixture_assembly_echo": ["Prerequisites: + Fixture Vine Lattice"],
                                    "tech_fixture_crease_alloys": ["Prerequisites: − Fixture Rivet Basics"],
                                    "tech_fixture_drift_coil": ["Base cost: 444 → 555", "Tier: 4 → 5"],
                                    "tech_fixture_echo_relay": ["Base cost: 111 → 150"],
                                    "tech_fixture_wake_skimmer": ["Tier: 3 → 4"]}, c3)
        check("tech tree compare: each technology links to its node in the version where it exists",
              ["tech_fixture_found_beacon", "?version=fixture#tech_fixture_found_beacon"] in c3["links"]
              and ["tech_fixture_lens_polisher", "?version=fixture-next#tech_fixture_lens_polisher"] in c3["links"], c3["links"])
        await pg.click(".lang-btn[data-lang=jp]")
        c3jp = await pg.evaluate(state_js)
        await pg.click(".lang-btn[data-lang=en]")
        check("tech tree compare: labels and results follow the language, game names stay in English",
              c3jp["labels"] == ["比較元", "比較先"] and "追加 1" in (c3jp["summary"] or "")
              and c3jp["changes"]["tech_fixture_echo_relay"] == ["基本コスト：111 → 150"]
              and c3jp["changes"]["tech_fixture_assembly_echo"] == ["前提条件：+ Fixture Vine Lattice"], c3jp)
        await pg.select_option("#tech-compare-from", "fixture-next")
        await pg.click(".tech-compare-run")
        await pg.wait_for_timeout(200)
        c4 = await pg.evaluate(state_js)
        check("tech tree compare: the same version on both sides asks for two different ones", c4["note"] == "Choose two different versions." and c4["summary"] is None, c4["note"])
        await pg.select_option("#tech-compare-from", "fixture")
        await pg.click(".tech-compare-run")
        await pg.wait_for_timeout(300)
        async with pg.expect_navigation():
            await pg.click(".tech-compare-link[data-tech-id=tech_fixture_found_beacon]")
        await wait_for_tree(pg, "fixture", 38, "tech_fixture_found_beacon")
        landed = await pg.evaluate("""()=>({search:location.search,hash:location.hash,version:document.getElementById('tech-data-version').dataset.rulesetId,
          selected:document.querySelector('.tech-node.is-selected')?.dataset.techId||null})""")
        check("tech tree compare: following a removed technology opens the older version with it selected",
              landed == {"search": "?version=fixture", "hash": "#tech_fixture_found_beacon", "version": "fixture", "selected": "tech_fixture_found_beacon"}, landed)
        await pg.set_viewport_size({"width": 320, "height": 700})
        await pg.goto(base + "tech-tree.html?version=fixture-next")
        await wait_for_tree(pg, "fixture-next")
        await pg.click(".tech-compare-run")
        await pg.wait_for_timeout(400)
        small = await pg.evaluate(state_js)
        sizes = await pg.evaluate("()=>[...document.querySelectorAll('.tech-compare-select,.tech-compare-run')].map(e=>Math.round(e.getBoundingClientRect().height))")
        check("tech tree compare: on a 320 px phone the comparison does not overflow and its controls are 44 px tall",
              not small["wide"] and small["summary"] and all(h >= 44 for h in sizes), (small["wide"], sizes))
    finally:
        await ctx.close()


# T3401: visible interface text of the page in es and jp (outside the game names, official in every language since P15)
I18N_SCAN_JS = r"""async()=>{const m=await import('./js/i18n-tech-tree.js');const S=m.strings;
  const skip=(n)=>n.closest('[lang=en],code,script,style,[hidden],.tech-legend-swatch');
  const texts=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(w.nextNode()){const n=w.currentNode;if(n.textContent.trim()&&!skip(n.parentElement))texts.push(n.textContent.trim())}
  const attrs=[...document.querySelectorAll('[aria-label],[title],[placeholder]')].filter(e=>!skip(e))
    .flatMap(e=>['aria-label','title','placeholder'].map(a=>e.getAttribute(a)).filter(Boolean));
  const all=texts.concat(attrs).join('\n');const lang=document.documentElement.lang==='ja'?'jp':document.documentElement.lang;
  const esc=(x)=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const english=Object.keys(S.en).filter(k=>!/[{<]/.test(S.en[k])&&S.en[k]!==S[lang][k]&&S.en[k].length>3)
    .filter(k=>new RegExp('(^|[^A-Za-z])'+esc(S.en[k])+'([^A-Za-z]|$)').test(all));
  const gameNames=[...document.querySelectorAll('.tech-node-name,.tech-field-label,#tech-card-title,.tech-area-jump,.tech-area-heading,.tech-card-description')];
  return {lang,keys:(all.match(/\btechTree[A-Z]\w+/g)||[]),english:english.map(k=>k+'='+S.en[k]),
    english_marked:gameNames.filter(e=>!e.classList.contains('tech-card-description')&&e.closest('[lang=en]')).length,gameNames:gameNames.length,
    description:[...document.querySelectorAll('.tech-card-description')].every(e=>e.closest('[lang=en]')),
    names:[...document.querySelectorAll('.tech-node-name')].slice(0,40).map(e=>e.textContent).join('|')}}"""


async def i18n_checks(t):
    url = "file://" + ROOT + "/tech-tree.html"
    pg = await t.ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.set_viewport_size({"width": 1280, "height": 900})
    await pg.goto(url)
    await pg.wait_for_timeout(400)
    await pg.click(".lang-btn[data-lang=en]")
    await pg.click(".tech-node[data-kind=repeatable]")  # card open, with prerequisites and unlocks
    await pg.fill("#tech-search-box input[type=search]", "a")
    await pg.wait_for_timeout(200)
    en = await pg.evaluate(I18N_SCAN_JS)
    scans = {}
    for lang in ("es", "jp"):
        await pg.click(".lang-btn[data-lang=" + lang + "]")
        await pg.wait_for_timeout(400)
        scans[lang] = await pg.evaluate(I18N_SCAN_JS)
    await pg.click(".lang-btn[data-lang=en]")
    check("tech tree i18n (T3401): in es and jp no English interface text and no raw i18n key is visible (text, aria-label, title, placeholder)",
          all(not s["keys"] and not s["english"] for s in scans.values()) and not en["keys"], {k: (v["keys"], v["english"]) for k, v in scans.items()})
    check("tech tree i18n (T1503): game names (nodes, fields, areas, card title) are the official ones of each language, not marked English; the description stays English, marked lang=en",
          en["gameNames"] > 50 and all(s["english_marked"] == 0 and s["names"] != en["names"] and s["description"] for s in scans.values()) and en["description"],
          {k: (v["english_marked"], v["gameNames"], v["description"], v["names"][:80]) for k, v in scans.items()})
    check("tech tree i18n (T3401): no page errors", not errors, errors)
    await pg.close()


async def link_checks(t):
    """T3402: links to the tech tree from the wiki (tech mentions, Useful links) and from the simulator catalogue."""
    data = node_json("import {TECH_DATA as d} from './js/tech-data/stellaris-pc-4.5.4.js';import {TECH_UNLOCK_LINKS as l} from './js/tech-unlock-links.js';"
                     "console.log(JSON.stringify({ids:d.technologies.map(x=>x.id),links:l}))")
    printed = subprocess.run(["node", "tools/build-tech-links.mjs", "--print"], capture_output=True, text=True, encoding="utf-8", cwd=ROOT).stdout
    stored = open(os.path.join(ROOT, "js", "tech-unlock-links.js"), encoding="utf-8").read().replace("\r\n", "\n")
    ids = set(data.get("ids", []))
    links = data.get("links", {"buildings": {}, "districts": {}})
    # building ids are the simulator ids of the data file (checked with the unlocks, T3007); capitals and branch office buildings are not in the catalogue
    bad = [x["id"] for v in links["buildings"].values() for x in v if x["id"] not in ids]
    check("tech links (T3402): js/tech-unlock-links.js is the output of tools/build-tech-links.mjs and its technologies exist in the tree",
          printed and printed == stored and len(links["buildings"]) > 100 and not bad, (len(printed), len(stored), bad[:5], data.get("error")))
    content = open(os.path.join(ROOT, "js", "content.js"), encoding="utf-8").read()
    wiki = re.findall(r"tech-tree\.html#([\w-]+)", content)
    useful = re.findall(r'url: "tech-tree\.html"', content)
    check("tech links (T3402): the wiki links its technology mentions to existing tree nodes (es/en/jp) and Useful links lists the tree in every language",
          len(wiki) >= 15 and all(x in ids for x in wiki) and len(useful) == 3, ([x for x in wiki if x not in ids], len(wiki), len(useful)))

    pg = await t.ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.goto("file://" + ROOT + "/planet-sim.html")
    await pg.wait_for_timeout(600)
    await pg.click(".lang-btn[data-lang=en]")
    sim_js = r"""()=>{const a=[...document.querySelectorAll('.planet-catalog-entry .planet-catalog-tech-link')];
      return {n:a.length,entries:document.querySelectorAll('.planet-catalog-entry').length,items:document.querySelectorAll('.planet-catalog-item').length,
        bad:a.filter(x=>!/^tech-tree\.html#tech_\w+$/.test(x.getAttribute('href'))||x.target!=='_blank').length,
        label:a[0]?.parentElement.firstChild.textContent||'',title:a[0]?.title||'',ids:a.map(x=>x.dataset.techId)}}"""
    s_en = await pg.evaluate(sim_js)
    await pg.click(".lang-btn[data-lang=es]")
    s_es = await pg.evaluate(sim_js)
    await pg.click(".lang-btn[data-lang=en]")
    check("tech links (T3402): simulator catalogue entries show the technologies that unlock them, linked to the tree in a new tab, label translated",
          s_en["n"] > 20 and s_en["entries"] == s_en["items"] and not s_en["bad"] and all(x in ids for x in s_en["ids"])
          and "Researched with" in s_en["label"] and "tech tree" in s_en["title"] and "Se investiga con" in s_es["label"] and s_es["n"] == s_en["n"],
          ({k: s_en[k] for k in ("n", "entries", "items", "bad", "label", "title")}, s_es["label"]))
    check("tech links (T3402): no page errors", not errors, errors)
    await pg.close()
    await sim_deeplink_checks(t, data.get("links", {}))


async def sim_deeplink_checks(t, links):
    """T3405: planet-sim.html#building=<id> / #district=<id> open the catalogue entry (links of the tech tree card)."""
    pg = await t.ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.set_viewport_size({"width": 1280, "height": 900})
    url = "file://" + ROOT + "/planet-sim.html"
    await pg.goto(url)
    await pg.wait_for_timeout(500)
    await pg.click(".lang-btn[data-lang=en]")
    # a building of a closed category (or the last one) that a technology unlocks
    target = await pg.evaluate("""()=>{const e=[...document.querySelectorAll('.planet-catalog-entry')].filter(x=>x.querySelector('.planet-catalog-tech-link'));
      const closed=e.filter(x=>!x.closest('details').open);return (closed[0]||e[e.length-1]).dataset.buildingId}""")
    await pg.close()
    state_js = """()=>{const hl=[...document.querySelectorAll('.is-deep-linked')];const h=hl[0];const r=h?h.getBoundingClientRect():null;
      const vis=(s)=>{const e=document.querySelector(s);return !!e&&!e.hidden};const n=document.getElementById('planet-sim-notice');
      return {n:hl.length,building:h?.dataset.buildingId||null,group:h?.dataset.districtGroup||null,capital:!!h&&h.classList.contains('planet-capital-control'),
        open:!!h&&(!h.closest('details')||h.closest('details').open),focus:!!h&&h.contains(document.activeElement),inView:!!r&&r.top>=0&&r.bottom<=innerHeight,
        planet:vis('#planet-tab-panel-planet'),branches:vis('#planet-tab-panel-branches'),buildings:vis('#planet-catalog'),districts:vis('#planet-districts-catalog'),
        notice:n.hidden?'':n.textContent}}"""
    pg = await t.ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.set_viewport_size({"width": 1280, "height": 900})
    await pg.goto(url + "#building=" + target)
    await pg.wait_for_timeout(600)
    s1 = await pg.evaluate(state_js)
    check("sim deep link (T3405): #building=<id> opens the Buildings catalogue, opens its category and highlights, focuses and shows the entry",
          s1["n"] == 1 and s1["building"] == target and s1["open"] and s1["focus"] and s1["inView"] and s1["planet"] and s1["buildings"] and not s1["districts"] and not s1["notice"], (target, s1))
    await pg.evaluate("()=>{location.hash='#district=mining'}")
    await pg.wait_for_timeout(300)
    s2 = await pg.evaluate(state_js)
    check("sim deep link (T3405): #district=<id> (hash change) opens the Districts catalogue on that district card; the building is no longer highlighted",
          s2["n"] == 1 and s2["group"] == "mining" and s2["focus"] and s2["inView"] and s2["districts"] and not s2["buildings"] and not s2["notice"], s2)
    await pg.click("#planet-tab-buildings")
    await pg.click("#planet-tab-districts")
    s2b = await pg.evaluate(state_js)
    check("sim deep link (T3405): the highlight stays when the catalogue is drawn again", s2b["n"] == 1 and s2b["group"] == "mining", s2b)
    await pg.evaluate("()=>{location.hash='#district=magmaConduit'}")
    await pg.wait_for_timeout(300)
    s3 = await pg.evaluate(state_js)
    check("sim deep link (T3405): a district of another celestial body (Magma Conduit on a regular planet) says it is not in the catalogue",
          s3["n"] == 0 and "Magma Conduit is not in the catalogue" in s3["notice"] and s3["districts"], s3)
    await pg.evaluate("()=>{location.hash='#building=planetary_administration'}")
    await pg.wait_for_timeout(300)
    s4 = await pg.evaluate(state_js)
    check("sim deep link (T3405): a capital highlights the capital control of the Planet tab", s4["n"] == 1 and s4["capital"] and s4["focus"] and s4["planet"], s4)
    await pg.evaluate("()=>{location.hash='#building=corporateEmbassy'}")
    await pg.wait_for_timeout(300)
    s5 = await pg.evaluate(state_js)
    check("sim deep link (T3405): a branch office building opens the Branch offices tab with a note", s5["branches"] and not s5["planet"] and "branch office building" in s5["notice"], s5)
    await pg.evaluate("()=>{location.hash='#building=no_such_building'}")
    await pg.wait_for_timeout(300)
    s6 = await pg.evaluate(state_js)
    check("sim deep link (T3405): an unknown id says so", s6["n"] == 0 and "does not know (no_such_building)" in s6["notice"], s6)
    # every simulator link of the tech tree data resolves (never "unknown")
    items = [["building", i] for i in links.get("buildings", {})] + [["district", i] for i in links.get("districts", {})]
    data_ids = node_json("import {TECH_DATA as d} from './js/tech-data/stellaris-pc-4.5.4.js';"
                         "console.log(JSON.stringify([...new Set(d.technologies.flatMap(x=>x.unlocks).filter(u=>u.sim).map(u=>(u.sim.collection==='districts'?'district':'building')+'='+u.sim.id))]))")
    unknown = await pg.evaluate("""async (ids)=>{const m=await import('./js/planet-sim-deeplink.js');const n=document.getElementById('planet-sim-notice');const bad=[];
      for(const id of ids){n.hidden=true;const el=m.openSimDeepLink('#'+id);if(!el&&(n.hidden||/does not know/.test(n.textContent)))bad.push(id)}return bad}""", data_ids)
    check("sim deep link (T3405): every simulator link of the tech tree data (%d) opens an entry or says why it is not shown" % len(data_ids if isinstance(data_ids, list) else []),
          isinstance(data_ids, list) and len(data_ids) > 100 and len(items) > 100 and not unknown, (data_ids if not isinstance(data_ids, list) else len(data_ids), unknown[:8]))
    check("sim deep link (T3405): no page errors", not errors, errors)
    await pg.close()


# T3403: contrast of every visible node text, blending the opacity of the node and its ancestors
NODE_CONTRAST_JS = r"""()=>{const rgb=(c)=>c.match(/[\d.]+/g).map(Number);
  const lum=(m)=>{const f=(v)=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
  const bgOf=(e)=>{for(let x=e;x;x=x.parentElement){const a=rgb(getComputedStyle(x).backgroundColor);if(a.length<4||a[3]>.5)return a}return [7,17,12]};
  const alpha=(e)=>{let o=1;for(let x=e;x;x=x.parentElement)o*=+getComputedStyle(x).opacity;return o};
  const low=[];const scroll=document.querySelector('.tech-areas');const box=scroll.getBoundingClientRect();
  for(const e of document.querySelectorAll('.tech-node-name,.tech-node-meta,.tech-field-label,.tech-tier-head')){const r=e.getBoundingClientRect();
    if(!r.width||r.bottom<box.top||r.top>box.bottom||r.right<box.left||r.left>box.right)continue;
    const bg=bgOf(e);const a=alpha(e);const fg=rgb(getComputedStyle(e).color).slice(0,3).map((v,i)=>v*a+bg[i]*(1-a));
    const x=lum(fg),y=lum(bg);const ratio=(Math.max(x,y)+.05)/(Math.min(x,y)+.05);if(ratio<4.5)low.push(e.className+' '+e.textContent.slice(0,16)+' '+ratio.toFixed(2))}
  return [...new Set(low)].slice(0,8)}"""


async def a11y_checks(t):
    url = "file://" + ROOT + "/tech-tree.html"
    pg = await t.ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.set_viewport_size({"width": 1280, "height": 900})
    await pg.goto(url)
    await pg.wait_for_timeout(400)
    await pg.click(".lang-btn[data-lang=en]")
    # one Tab stop per area: Tab from the physics panel reaches its first node, the next Tab leaves the area
    stops = await pg.evaluate("()=>[...document.querySelectorAll('.tech-grid')].map(g=>[g.dataset.area,g.querySelectorAll('.tech-node[tabindex=\"0\"]').length,g.querySelectorAll('.tech-node').length])")
    await pg.focus(".tech-areas")
    await pg.keyboard.press("Tab")
    first = await pg.evaluate("()=>[document.activeElement.dataset.techId,document.activeElement.closest('.tech-area')?.dataset.area]")
    await pg.keyboard.press("Tab")
    after = await pg.evaluate("()=>[document.activeElement.className,document.activeElement.closest('.tech-area')?.dataset.area]")
    check("tech tree a11y (T3403): one Tab stop per area (roving tabindex) instead of one per node; Tab enters the area at its first node and leaves it with the next Tab",
          all(n == 1 and total > 100 for _, n, total in stops) and first[1] == "physics" and first[0] and after[1] != "physics", (stops, first, after))

    focus_js = """()=>{const e=document.activeElement;const r=e.getBoundingClientRect();const p=e.closest('.tech-areas').getBoundingClientRect();
      return {id:e.dataset.techId,tier:+e.dataset.tier,field:e.closest('.tech-cell')?.dataset.field,top:Math.round(r.top),tab:e.tabIndex,
        inView:r.left>=p.left-1&&r.right<=p.right+1&&r.top>=p.top-1&&r.bottom<=p.bottom+1,stops:document.querySelectorAll('#tech-area-physics .tech-node[tabindex=\"0\"]').length}}"""
    await pg.focus(".tech-node[data-tech-id=tech_lasers_1]")
    k0 = await pg.evaluate(focus_js)
    await pg.keyboard.press("ArrowRight")
    k1 = await pg.evaluate(focus_js)
    await pg.keyboard.press("ArrowLeft")
    k2 = await pg.evaluate(focus_js)
    await pg.keyboard.press("ArrowDown")
    k3 = await pg.evaluate(focus_js)
    await pg.keyboard.press("ArrowUp")
    k4 = await pg.evaluate(focus_js)
    await pg.keyboard.press("End")
    k5 = await pg.evaluate(focus_js)
    await pg.keyboard.press("Home")
    k6 = await pg.evaluate(focus_js)
    check("tech tree a11y (T3403): arrows move between nodes (→ next tier, ← back, ↓ ↑ same tier column), Home / End to the first / last node; the focused node is the area's Tab stop and stays in view",
          k1["tier"] > k0["tier"] and k2["tier"] == k0["tier"] and k3["tier"] == k0["tier"] and k3["top"] > k0["top"] and k4["id"] == k0["id"]
          and k5["tier"] == max(k0["tier"], k1["tier"], k5["tier"]) and k6["tier"] == 0 and all(k["stops"] == 1 and k["tab"] == 0 and k["inView"] for k in (k1, k3, k5, k6)),
          (k0, k1, k2, k3, k4, k5, k6))
    await pg.focus(".tech-node[data-tech-id=tech_lasers_2]")
    await pg.keyboard.press("Enter")
    desc_js = """()=>{const d=(id)=>{const n=document.querySelector(`.tech-node[data-tech-id=${id}]`);return (n.getAttribute('aria-describedby')||'').split(' ').map(x=>document.getElementById(x)?.textContent||'?'+x)};
      return {sel:d('tech_lasers_2'),pre:d('tech_lasers_1'),dep:d('tech_lasers_3'),other:d('tech_corvettes'),pressed:document.querySelector('.tech-node[data-tech-id=tech_lasers_2]').getAttribute('aria-pressed')}}"""
    d_en = await pg.evaluate(desc_js)
    await pg.click(".lang-btn[data-lang=es]")
    d_es = await pg.evaluate(desc_js)
    await pg.click(".lang-btn[data-lang=en]")
    check("tech tree a11y (T3403): Enter selects the focused node; screen readers get its field and state (selected, prerequisite chain, depends on the selected) as its description, translated",
          d_en["pressed"] == "true" and d_en["sel"][1:] == ["Selected"] and d_en["pre"][1:] == ["Prerequisite chain"] and d_en["dep"][1:] == ["Depends on the selected"]
          and len(d_en["other"]) == 1 and d_en["sel"][0] and "?" not in d_en["sel"][0] and d_es["pre"][1:] == ["Cadena de prerrequisitos"], (d_en, d_es))
    low_sel = await pg.evaluate(NODE_CONTRAST_JS)
    await pg.keyboard.press("Escape")
    low_plain = await pg.evaluate(NODE_CONTRAST_JS)
    await pg.fill("#tech-search-box input[type=search]", "lasers")
    await pg.wait_for_timeout(200)
    low_filter = await pg.evaluate(NODE_CONTRAST_JS)
    await pg.fill("#tech-search-box input[type=search]", "")
    check("tech tree a11y (T3403): node, field and tier texts keep 4.5:1 contrast, also when dimmed by a selection or a search (opacity included)",
          not low_plain and not low_sel and not low_filter, (low_plain, low_sel, low_filter))
    check("tech tree a11y (T3403): no page errors", not errors, errors)
    await pg.close()
