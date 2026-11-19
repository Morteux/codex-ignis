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
        # P17.5: empire "i" panels (policies with the current trade conversion, civic limit)
        await pg.evaluate("()=>{document.querySelector('#empire-policies-info-btn').click();document.querySelector('#empire-civics-info-btn').click()}")
        einfo = await pg.evaluate("()=>[document.querySelector('#empire-policies-info'),document.querySelector('#empire-civics-info')].map(p=>p.hidden?null:p.innerText)")
        check("empire info: Wealth Creation keeps 50% and civics up to 3", bool(einfo[0]) and "Wealth Creation keeps 50%" in einfo[0] and "50% Energy" in einfo[0] and bool(einfo[1]) and "up to 3" in einfo[1], einfo)
        await ethic("Gestalt Consciousness")
        g = await pg.evaluate("()=>document.querySelector('#empire-policies-info').innerText")
        check("empire info follows gestalt: Logistics Policy keeps 100%", "Logistics Policy keeps 100%" in g, g)
        await ethic("Gestalt Consciousness")

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
        check("Trade League selectable", await pick_policy("Trade League"))
        n = await net()
        check("Trade League: trade 8, energy +2.4, goods +2.4, unity +1.2", approx(n["Trade value"], 8 * S) and approx(n["Energy"], energy0 - 8 * S + 2.4 * S) and approx(n["Consumer goods"], -2 + 2.4 * S) and approx(n.get("Unity"), 1.2 * S), n)
        fed_note = await pg.evaluate("""()=>{const c=[...document.querySelectorAll('.empire-policy-card')].find(x=>x.querySelector('strong').innerText==='Trade League');const p=c&&c.querySelector('.empire-policy-federation-note');return p?p.innerText:''}""")
        check("Trade League federation note", "Trade League federation" in fed_note, fed_note)
        check("Holy Covenant selectable", await pick_policy("Holy Covenant"))
        n = await net()
        check("Holy Covenant: trade 8, unity +3", approx(n["Trade value"], 8 * S) and approx(n.get("Unity"), 3 * S), n)
        check("Mutual Aid disabled without Worker Cooperative", await policy_disabled("Mutual Aid") is True)

        # 3. Mutual Aid with Worker Cooperative, then fall back when the civic is removed
        await ethic("Egalitarian"); await ethic("Pacifist"); await ethic("Materialist")
        await pg.evaluate("()=>[...document.querySelectorAll('#empire-authority-list button')].find(b=>/Democratic/.test(b.innerText)).click()")
        await pg.evaluate("()=>[...document.querySelectorAll('#empire-civics-list button')].find(b=>b.innerText.trim()==='Worker Cooperative').click()")
        check("Mutual Aid available with Worker Cooperative", await pick_policy("Mutual Aid"))
        n = await net()
        # Egalitarian adds +5% specialist efficiency, so the 2 Traders give 16.8 trade before conversion.
        check("Mutual Aid: trade 4.2, energy 16.8*0.2 - 6", approx(n["Trade value"], 4.2 * S) and approx(n["Energy"], 16.8 * 0.2 * S + (energy0 - 8 * S)), n)
        # P17.3: jobs "i" panel lists the current stratum efficiency (Egalitarian +5 % specialist)
        await tab("planet")
        await pg.evaluate("()=>document.querySelector('#planet-jobs-info-btn').click()")
        jinfo = await pg.evaluate("()=>{const p=document.querySelector('#planet-jobs-info');return p.hidden?null:p.innerText}")
        await tab("empire")
        await pg.evaluate("()=>document.querySelector('#empire-ethics-info-btn').click()")
        ethinfo = await pg.evaluate("()=>document.querySelector('#empire-ethics-info').innerText")
        check("empire info: Egalitarian specialist efficiency applied", "Now applied:" in ethinfo and "Egalitarian" in ethinfo, ethinfo)
        await tab("planet")
        check("jobs info: full staffing and Specialists +5%", bool(jinfo) and "Full staffing" in jinfo and "Specialists +5%" in jinfo, jinfo)
        await tab("empire")
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
        check("last selected empire restored on reload (P13.7)", await pg.input_value("#planet-summary-empire") == saved[0]["id"])
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
        # P17.4: conditions "i" panel shows worked examples with the current numbers
        await pg.evaluate("()=>document.querySelector('#planet-conditions-info-btn').click()")
        cinfo = await pg.evaluate("()=>[...document.querySelectorAll('#planet-conditions-info .info-example')].map(p=>p.innerText)")
        check("conditions info: worked examples (happiness 70, crime)", len(cinfo) >= 6 and any("= 70 happiness" in x for x in cinfo) and any(("total " + crime.replace("+", "")) in x for x in cinfo), cinfo)
        await pg.evaluate("()=>document.querySelector('#planet-conditions-info-btn').click()")
        # P9.7: Manual / Estimated / Derived label on every conditions value; manual extra stability
        await tab("planet")
        unlabelled = await pg.evaluate("()=>[...document.querySelectorAll('#planet-conditions .planet-resource-row[data-condition]')].filter(r=>!r.querySelector('.planet-condition-source')).map(r=>r.dataset.condition)")
        check("every conditions value has a source label", unlabelled == [], unlabelled)
        manual = await pg.evaluate("()=>[...document.querySelectorAll('#planet-conditions .planet-condition-source.is-manual')].length")
        check("manual civilians, happiness and stability rows", manual == 3, manual)
        await pg.evaluate("()=>{const i=document.querySelector('#planet-conditions [data-condition=stabilityManual] input');i.value='10';i.dispatchEvent(new Event('change'))}")
        stab2 = await pg.evaluate("()=>document.querySelector('#planet-conditions [data-condition=stability] .planet-resource-value')?.innerText")
        eff2 = await pg.evaluate("()=>document.querySelector('#planet-conditions [data-condition=stabilityEffect] .planet-resource-value')?.innerText")
        check("manual +10 stability: 72 and +13.2 % effect", stab2 == "72" and eff2 == "+13.2", (stab2, eff2))
        await pg.evaluate("()=>{const i=document.querySelector('#planet-conditions [data-condition=stabilityManual] input');i.value='0';i.dispatchEvent(new Event('change'))}")

        # P16.12: manual civilians count as pops and their trade enters the trade conversion (Wealth Creation)
        before = await net()
        pops_before = await pg.evaluate("()=>document.querySelector('#planet-conditions [data-condition=pops] .planet-resource-value')?.innerText")
        await pg.evaluate("()=>{const i=document.querySelector('#planet-conditions [data-condition=civilians] input');i.value='200';i.dispatchEvent(new Event('change'))}")
        after = await net()
        pops_after = await pg.evaluate("()=>document.querySelector('#planet-conditions [data-condition=pops] .planet-resource-value')?.innerText")
        check("civilians: +200 pops", float(pops_after) - float(pops_before) == 200, (pops_before, pops_after))
        check("civilians: trade and converted energy rise", after["Trade value"] > before["Trade value"] and after["Energy"] > before["Energy"], (before, after))
        await pg.fill("#planet-summary-name", "Civilian planet")
        await pg.evaluate("()=>document.querySelector('#planet-summary-save').click()")
        await pg.wait_for_timeout(300)
        await pg.evaluate("()=>[...document.querySelectorAll('.confirm-btn')].find(b=>/don't save/i.test(b.innerText))?.click()")
        await pg.wait_for_timeout(400)
        planets = await pg.evaluate("()=>JSON.parse(localStorage.getItem('codex-ignis-planets')||'[]')")
        civ = [x.get("civilians") for x in planets if x.get("name") == "Civilian planet"]
        check("civilians saved with the planet", civ == [200], civ)

        # 7. P8.7: gross - costs = net consistency check never fires
        await tab("planet")
        check("consistency check hidden", await pg.evaluate("()=>document.querySelector('#planet-production-check').hidden"))
        # P17.2: production "i" panel, hidden until clicked, trade conversion with the current numbers, kept open across re-renders
        check("production info hidden by default", await pg.evaluate("()=>document.querySelector('#planet-production-info').hidden"))
        await pg.evaluate("()=>document.querySelector('#planet-production-info-btn').click()")
        pinfo = await pg.evaluate("()=>{const p=document.querySelector('#planet-production-info');return p.hidden?null:p.innerText}")
        check("production info opens with trade conversion", bool(pinfo) and "Trade conversion (Wealth Creation)" in pinfo and "50% Energy" in pinfo, pinfo)
        await pg.evaluate("()=>{const i=document.querySelector('#planet-conditions [data-condition=civilians] input');i.value='300';i.dispatchEvent(new Event('change'))}")
        still = await pg.evaluate("()=>!document.querySelector('#planet-production-info').hidden && document.querySelector('#planet-production-info-btn').getAttribute('aria-expanded')")
        check("production info stays open after re-render", still == "true", still)
        # Job stability (Enforcers of the capital) adds to stability as a modifier; the stability effect does not change it
        await tab("planet")
        for _ in range(4):
            await pg.evaluate("()=>{const b=document.querySelector('#planet-capital-upgrade');if(!b.disabled)b.click()}")
        rows = await pg.evaluate("()=>Object.fromEntries([...document.querySelectorAll('#planet-conditions .planet-resource-row[data-condition]')].map(r=>[r.dataset.condition,parseFloat((r.querySelector('.planet-resource-value')?.innerText||r.querySelector('input')?.value||'0').replace('−','-').replace('+',''))]))")
        jobs_st = rows.get("stabilityJobs", 0)
        comp = rows["stabilityBase"] + rows.get("stabilityApproval", 0) + jobs_st + rows["stabilityManual"] + rows["stabilityHousing"]
        check("stability from jobs > 0 with enforcers", jobs_st > 0, rows)
        check("stability = base + approval + jobs + manual - housing", approx(rows["stability"], max(0, min(100, comp))), rows)
        st = rows["stability"]
        exp_eff = 0.6 * (st - 50) if st >= 50 else -(50 - st)
        check("stability effect uses the stability with jobs", approx(rows["stabilityEffect"], exp_eff), rows)

        # P17.6: i18n key parity (es/en/jp) and every "i" button: has its panel, toggles with Enter and Space, aria-expanded in sync
        parity = await pg.evaluate("""async()=>{const src=await (await fetch('js/i18n.js')).text();
            const url=URL.createObjectURL(new Blob([src.replace('const strings =','export const strings =')],{type:'text/javascript'}));
            const m=await import(url);const k=(l)=>new Set(Object.keys(m.strings[l]));const es=k('es'),en=k('en'),jp=k('jp');
            const diff=(a,b)=>[...a].filter(x=>!b.has(x));return {enNotEs:diff(en,es),esNotEn:diff(es,en),enNotJp:diff(en,jp),jpNotEn:diff(jp,en)}}""")
        check("i18n key parity es/en/jp", not any(parity.values()), parity)
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
        check("no page errors", not errors, errors)
        await browser.close()

asyncio.run(main())
print("\nFAILED: " + ", ".join(failures) if failures else "\nAll passed")
sys.exit(1 if failures else 0)
