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
    check("game names (T1502): grouped civic names stay hand-written (T1504)", "civicAnglers" not in keys and "civicWarriorCulture" not in keys)

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
