"""Browser smoke tests for empire policies and trade conversion (P16.9).

Run from the project root:  python3 tests/policies-smoke.py
Needs: pip install playwright && playwright install chromium
Uses the English UI (browser locale en-US) and file:// URLs.
"""
import asyncio, json, os, sys, tempfile
from playwright.async_api import async_playwright

ROOT = os.getcwd()
URL = "file://" + ROOT + "/planet-sim.html"
failures = []


def check(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name + (" " + str(extra) if extra and not cond else ""))
    if not cond:
        failures.append(name)


def approx(a, b):
    return a is not None and abs(a - b) < 0.011


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--allow-file-access-from-files"])
        ctx = await browser.new_context(locale="en-US")
        pg = await ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(600)

        async def tab(name):
            await pg.evaluate("(n)=>document.querySelector(`.planet-main-tab[data-main-tab=${n}]`).click()", name)

        async def net():
            rows = await pg.evaluate("""()=>[...document.querySelectorAll('#planet-production-net > .planet-resource-row, #planet-production-net .planet-resource-entry > .planet-resource-row')].map(r=>[r.querySelector('.planet-resource-name').innerText,r.querySelector('.planet-resource-value').innerText])""")
            return {k: float(v.replace("−", "-").replace("+", "")) for k, v in rows}

        async def selected_policy(group_title):
            return await pg.evaluate("""(g)=>{const s=[...document.querySelectorAll('.empire-policy-group')].find(x=>x.querySelector('h3').textContent.trim()===g);const c=s&&s.querySelector('.empire-policy-card.is-selected strong');return c&&c.innerText}""", group_title)

        async def pick_policy(name):
            return await pg.evaluate("""(n)=>{const c=[...document.querySelectorAll('.empire-policy-card')].find(x=>x.querySelector('strong').innerText===n);if(!c||c.disabled)return false;c.click();return true}""", name)

        async def policy_disabled(name):
            return await pg.evaluate("""(n)=>{const c=[...document.querySelectorAll('.empire-policy-card')].find(x=>x.querySelector('strong').innerText===n);return c?c.disabled:null}""", name)

        async def ethic(title):
            await pg.evaluate("(t)=>document.querySelector(`#empire-ethics-wheel button[title^='${t} (']`).click()", title)

        # 1. Defaults and individualist/gestalt switching
        await tab("empire")
        check("default trade policy = Wealth Creation", await selected_policy("Trade Policy") == "Wealth Creation")
        check("default economic policy = Mixed Economy", await selected_policy("Economic Policy") == "Mixed Economy")
        await ethic("Gestalt Consciousness")
        check("gestalt trade policy = Logistics Policy", await selected_policy("Logistics Policy") == "Logistics Policy")
        check("gestalt production policy = Balanced Production", await selected_policy("Production Policy") == "Balanced Production")
        await ethic("Gestalt Consciousness")
        check("back to Wealth Creation", await selected_policy("Trade Policy") == "Wealth Creation")

        # 2. Economy numbers with each trade policy (2 Traders = +16 trade, -2 consumer goods)
        await tab("planet")
        await pg.evaluate("()=>{document.querySelectorAll('#planet-catalog details').forEach(d=>d.open=true);[...document.querySelectorAll('#planet-catalog button')].find(b=>/Commercial Zones/.test(b.innerText)).click()}")
        await tab("empire")
        base = await net()
        # P9.4: stability 62 (see 6b) gives +7.2 % to everything jobs produce, trade included (before the trade conversion).
        S = 1.072
        check("Wealth Creation: trade 8", approx(base.get("Trade value"), 8 * S), base)
        energy0 = base["Energy"]
        check("consumer goods -2", approx(base.get("Consumer goods"), -2), base)
        check("Wealth Creation: energy -6 + 8 converted", approx(energy0, -6 + 8 * S), base)
        check("Consumer Benefits available", await pick_policy("Consumer Benefits"))
        n = await net()
        check("Consumer Benefits: trade 8, goods +2, energy -8", approx(n["Trade value"], 8 * S) and approx(n["Consumer goods"], -2 + 4 * S) and approx(n["Energy"], energy0 - 8 * S), n)
        check("Marketplace of Ideas available", await pick_policy("Marketplace of Ideas"))
        n = await net()
        check("Marketplace: trade 8, unity +2", approx(n["Trade value"], 8 * S) and approx(n.get("Unity"), 2 * S), n)
        check("Trade League disabled (federation)", await policy_disabled("Trade League") is True)
        check("Mutual Aid disabled without Worker Cooperative", await policy_disabled("Mutual Aid") is True)

        # 3. Mutual Aid with Worker Cooperative, then fall back when the civic is removed
        await ethic("Egalitarian"); await ethic("Pacifist"); await ethic("Materialist")
        await pg.evaluate("()=>[...document.querySelectorAll('#empire-authority-list button')].find(b=>/Democratic/.test(b.innerText)).click()")
        await pg.evaluate("()=>[...document.querySelectorAll('#empire-civics-list button')].find(b=>b.innerText.trim()==='Worker Cooperative').click()")
        check("Mutual Aid available with Worker Cooperative", await pick_policy("Mutual Aid"))
        n = await net()
        # Egalitarian adds +5% specialist efficiency, so the 2 Traders give 16.8 trade before conversion.
        check("Mutual Aid: trade 4.2, energy 16.8*0.2 - 6", approx(n["Trade value"], 4.2 * S) and approx(n["Energy"], 16.8 * 0.2 * S + (energy0 - 8 * S)), n)
        check("Mutual Aid minerals/food/unity", approx(n.get("Minerals"), 3.36 * S) and approx(n.get("Food"), (2 + 3.36) * S) and approx(n.get("Unity"), 1.26 * S), n)
        await pg.evaluate("()=>[...document.querySelectorAll('#empire-civics-list button')].find(b=>b.innerText.trim()==='Worker Cooperative').click()")
        check("Mutual Aid reverts to Wealth Creation", await selected_policy("Trade Policy") == "Wealth Creation")
        notice = await pg.inner_text("#planet-sim-notice")
        check("revert notice shown", "Mutual Aid" in notice, notice)

        # 4. Save empire, reload with a pre-P16 empire (no policyIds)
        await pg.fill("#empire-profile-name", "Test empire")
        await pg.click("#empire-profile-save-new")
        saved = await pg.evaluate("()=>JSON.parse(localStorage.getItem('codex-ignis-empires'))")
        check("saved empire has policyIds", bool(saved[0].get("policyIds", {}).get("trade")), saved)
        old = dict(saved[0]); old.pop("policyIds"); old["name"] = "Old empire"; old["id"] = "old-1"
        await pg.evaluate("(o)=>{const a=JSON.parse(localStorage.getItem('codex-ignis-empires'));a.push(o);localStorage.setItem('codex-ignis-empires',JSON.stringify(a))}", old)
        await pg.reload(); await pg.wait_for_timeout(500)
        await pg.select_option("#planet-summary-empire", "old-1")
        await tab("empire")
        check("old empire loads with default trade policy", await selected_policy("Trade Policy") == "Wealth Creation")
        check("old empire is not flagged modified", not await pg.evaluate("()=>document.querySelector('#planet-summary-empire').classList.contains('is-modified')"))

        # 5. Planet save/reload keeps policies in the snapshot
        await pick_policy("Civilian Economy")
        await pg.fill("#planet-summary-name", "Test planet")
        await pg.evaluate("()=>document.querySelector('#planet-summary-save').click()")
        await pg.wait_for_timeout(300)
        # the empire has unsaved changes (policy edited): answer the dialog with "Don't save"
        await pg.evaluate("()=>[...document.querySelectorAll('.confirm-btn')].find(b=>/don't save/i.test(b.innerText))?.click()")
        await pg.wait_for_timeout(600)
        planets = await pg.evaluate("()=>JSON.parse(localStorage.getItem('codex-ignis-planets')||'[]')")
        check("planet snapshot keeps economic policy", bool(planets) and planets[0]["empireSnapshot"]["policyIds"].get("economic") == "civilianEconomy", json.dumps(planets)[:600] + " notice: " + await pg.inner_text("#planet-sim-notice"))

        # 6. Import with bogus policy ids falls back to defaults
        bogus = {"type": "empire", "schemaVersion": 1, "rulesetId": "stellaris-pc-4.5.2", "id": "x", "name": "Bogus", "ethicIds": ["gestaltConsciousness"], "authorityId": "hiveMind", "civicIds": [], "speciesType": "organic", "policyIds": {"trade": "nonsense", "economic": "militarizedEconomy", "production": 5}}
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(bogus, f)
        await tab("library")
        await pg.set_input_files("#library-import-file", f.name)
        await pg.wait_for_timeout(400)
        emp = await pg.evaluate("()=>JSON.parse(localStorage.getItem('codex-ignis-empires')).find(e=>e.name==='Bogus')")
        check("import: bogus ids replaced by gestalt defaults", emp and emp["policyIds"] == {"production": "balancedProduction", "trade": "logisticsPolicy", "stance": "expansionist"}, emp)

        # 6b. P9.1: conditions panel (2 Traders staffed = 200 pops in x100 scale)
        await pg.evaluate("()=>[...document.querySelectorAll('#planet-catalog button')].find(b=>/Commercial Zones/.test(b.innerText))?.click()")
        cond = await pg.evaluate("()=>Object.fromEntries([...document.querySelectorAll('#planet-conditions [data-condition]')].map(r=>[r.dataset.condition,(r.querySelector('.planet-resource-value')?.innerText??r.querySelector('input').value).replace('\u2212','-').replace('+','')]))")
        check("conditions: pops and lost amenities present", cond.get("amenitiesLost") == "-500" if isinstance(cond, dict) else False, cond)

        hap = await pg.evaluate("()=>{const r=document.querySelector('#planet-conditions [data-condition=happiness] .planet-resource-value');return r&&r.innerText}")
        check("happiness = 70 with plentiful amenities", hap == "70", hap)

        stab = await pg.evaluate("()=>document.querySelector('#planet-conditions [data-condition=stability] .planet-resource-value')?.innerText")
        check("stability = 62 (50 + 12 approval, no housing penalty)", stab == "62", stab)
        # P9.4: stability effect on job output (row in conditions, modifiers panel row, breakdown line)
        eff = await pg.evaluate("()=>document.querySelector('#planet-conditions [data-condition=stabilityEffect] .planet-resource-value')?.innerText")
        check("stability effect = +7.2 %", eff == "+7.2", eff)
        mods = await pg.evaluate("()=>[...document.querySelectorAll('#planet-modifiers .planet-modifier-row')].map(r=>r.innerText)")
        check("modifiers panel lists the stability effect", any("Planetary condition" in m and "+7.2%" in m for m in mods), mods)
        await tab("planet")
        await pg.evaluate("()=>[...document.querySelectorAll('#planet-production-net .planet-resource-row')].find(r=>/Trade value/.test(r.innerText))?.click()")
        bd = await pg.evaluate("()=>document.querySelector('#planet-production-net')?.innerText")
        check("breakdown shows the stability effect line", "Stability effect on job output" in (bd or ""), bd)
        # P9.5: crime from low happiness (0.02 x (100 - 70) per pop; pops shown x100), display only
        pops = float(cond.get("pops", "0")) / 100
        crime = await pg.evaluate("()=>document.querySelector('#planet-conditions [data-condition=crimeHappiness] .planet-resource-value')?.innerText")
        expected = 0.02 * 30 * pops
        check("crime from low happiness = 0.6 per pop at 70 happiness", crime is not None and approx(float(crime.replace("+", "")), expected), (crime, pops))
        line = await pg.evaluate("()=>document.querySelector('#planet-nonresource [data-effect=crimeFromHappiness]')?.innerText")
        check("crime from low happiness shown with job effects", bool(line) and crime in line, line)
        # P9.7: Manual / Estimated / Derived label on every conditions value; manual extra stability
        await tab("planet")
        unlabelled = await pg.evaluate("()=>[...document.querySelectorAll('#planet-conditions .planet-resource-row[data-condition]')].filter(r=>!r.querySelector('.planet-condition-source')).map(r=>r.dataset.condition)")
        check("every conditions value has a source label", unlabelled == [], unlabelled)
        manual = await pg.evaluate("()=>[...document.querySelectorAll('#planet-conditions .planet-condition-source.is-manual')].length")
        check("manual happiness and stability rows", manual == 2, manual)
        await pg.evaluate("()=>{const i=document.querySelector('#planet-conditions [data-condition=stabilityManual] input');i.value='10';i.dispatchEvent(new Event('change'))}")
        stab2 = await pg.evaluate("()=>document.querySelector('#planet-conditions [data-condition=stability] .planet-resource-value')?.innerText")
        eff2 = await pg.evaluate("()=>document.querySelector('#planet-conditions [data-condition=stabilityEffect] .planet-resource-value')?.innerText")
        check("manual +10 stability: 72 and +13.2 % effect", stab2 == "72" and eff2 == "+13.2", (stab2, eff2))
        await pg.evaluate("()=>{const i=document.querySelector('#planet-conditions [data-condition=stabilityManual] input');i.value='0';i.dispatchEvent(new Event('change'))}")

        # 7. P8.7: gross - costs = net consistency check never fires
        await tab("planet")
        check("consistency check hidden", await pg.evaluate("()=>document.querySelector('#planet-production-check').hidden"))
        check("no page errors", not errors, errors)
        await browser.close()

asyncio.run(main())
print("\nFAILED: " + ", ".join(failures) if failures else "\nAll passed")
sys.exit(1 if failures else 0)
