"""Tech tree data (section 30): the test fixture, the data validations and the data files."""
import glob, json, os, subprocess
from smoke.common import check, ROOT

FIXTURE = "tests/fixtures/tech-tree/tech-data-fixture.js"


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
    await pg.close()
