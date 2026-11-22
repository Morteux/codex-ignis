"""Browser smoke tests for empire policies and trade conversion (P16.9).

Run from the project root:  python3 tests/policies-smoke.py
Needs: pip install playwright && playwright install chromium
Uses the English UI (browser locale en-US) and file:// URLs.
PLAYWRIGHT_CHROME=/path/to/chrome uses an installed Chrome instead of Playwright's Chromium.
BLOCK_REMOTE=1 skips the remote asset images (much faster without network).
"""
import asyncio, json, os, sys, tempfile
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding="utf-8")  # check names may hold JP text (Windows consoles default to cp1252)
ROOT = os.getcwd()
URL = "file://" + ROOT + "/planet-sim.html"
failures = []
HTML_LANG = {"es": "es", "en": "en", "jp": "ja"}  # <html lang> uses the BCP 47 tag "ja" for the site's "jp"


def check(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name + (" " + str(extra) if extra and not cond else ""))
    if not cond:
        failures.append(name)


def approx(a, b):
    return a is not None and abs(a - b) < 0.011


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get("PLAYWRIGHT_CHROME") or None, args=["--allow-file-access-from-files"])
        ctx = await browser.new_context(locale="en-US")
        if os.environ.get("BLOCK_REMOTE"): await ctx.route("https://**/*", lambda r: r.abort())  # skip remote images (faster offline)
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

        # 8. P18.3: Edicts tab, saved with the empire profile; edicts that lose their requirements are dropped with a notice
        await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        await tab("edicts")
        pressed = lambda eid: pg.evaluate("(e)=>document.querySelector(`.edict-card[data-edict-id=${e}]`).getAttribute('aria-pressed')", eid)
        check("edicts tab lists edicts", await pg.evaluate("()=>document.querySelectorAll('.edict-card').length") >= 20)
        check("no edicts active by default", await pg.inner_text("#empire-edicts-count") == "Active edicts: 0")
        check("gestalt-only edict locked for individualist", await pg.evaluate("()=>document.querySelector('.edict-card[data-edict-id=thoughtPreEmption]').disabled"))
        await pg.click(".edict-card[data-edict-id=industrialSubsidies]")
        check("edict toggles on", await pressed("industrialSubsidies") == "true" and await pg.inner_text("#empire-edicts-count") == "Active edicts: 1")
        await tab("empire")
        await pg.fill("#empire-profile-name", "Edict empire")
        await pg.click("#empire-profile-save-new")
        saved = await pg.evaluate("()=>JSON.parse(localStorage.getItem('codex-ignis-empires'))")
        check("saved empire has edictIds", saved[0].get("edictIds") == ["industrialSubsidies"], saved)
        await tab("edicts")
        await pg.click(".edict-card[data-edict-id=capacitySubsidies]")
        check("edict change marks the empire modified", await pg.evaluate("()=>document.querySelector('#planet-summary-empire').classList.contains('is-modified')"))
        await pg.reload(); await pg.wait_for_timeout(500)
        await tab("edicts")
        check("saved edicts restored on reload", await pressed("industrialSubsidies") == "true" and await pressed("capacitySubsidies") == "false")
        await tab("empire")
        await ethic("Gestalt Consciousness")
        notice = await pg.inner_text("#planet-sim-notice")
        check("gestalt drops Industrial Subsidies with a notice", await pressed("industrialSubsidies") == "false" and "Industrial Subsidies" in notice, notice)

        # 9. P18.4: edict effects in the engine (job efficiency + per-job trade upkeep, conditions points, modifiers panel)
        await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        await tab("empire")
        await ethic("Authoritarian"); await ethic("Pacifist")
        await tab("planet")
        await pg.evaluate("()=>{document.querySelectorAll('#planet-catalog details').forEach(d=>d.open=true);const f=(re)=>[...document.querySelectorAll('#planet-catalog button')].find(b=>re.test(b.innerText));f(/Commercial Zones/).click();f(/Alloy Foundries/).click()}")
        cond = lambda: pg.evaluate("()=>Object.fromEntries([...document.querySelectorAll('#planet-conditions .planet-resource-row[data-condition]')].map(r=>[r.dataset.condition,parseFloat((r.querySelector('.planet-resource-value')?.innerText||r.querySelector('input')?.value||'0').replace('−','-').replace('+',''))]))")
        n0 = await net(); c0 = await cond()
        await tab("edicts")
        await pg.click(".edict-card[data-edict-id=forgeSubsidies]")
        n1 = await net()
        check("Forge Subsidies: +10% alloys from Metallurgists", n0.get("Alloys", 0) > 0 and approx(n1.get("Alloys"), n0["Alloys"] * 1.1), (n0, n1))
        check("Forge Subsidies: -1 trade per Metallurgist (2 jobs)", approx(n1.get("Trade value"), n0.get("Trade value") - 2), (n0, n1))
        for e in ["informationQuarantine", "peaceFestivals", "trackingImplants"]:
            await pg.click(f".edict-card[data-edict-id={e}]")
        c1 = await cond()
        check("edict condition rows: happiness -5, stability +5, crime -10", c1.get("happinessEdicts") == -5 and c1.get("stabilityEdicts") == 5 and c1.get("crimeEdicts") == -10, c1)
        check("happiness includes the edicts", approx(c1["happiness"], max(0, min(100, c1["happinessBase"] + c1["happinessAmenities"] + c1["happinessManual"] - 5))), c1)
        comp = c1["stabilityBase"] + c1.get("stabilityApproval", 0) + c1.get("stabilityJobs", 0) + 5 + c1["stabilityManual"] + c1["stabilityHousing"]
        check("stability includes the edicts", approx(c1["stability"], max(0, min(100, comp))), c1)
        await tab("planet")
        mods = await pg.inner_text("#planet-modifiers")
        check("modifiers panel lists edicts", all(x in mods for x in ["Forge Subsidies", "Information Quarantine", "Tracking Implants"]), mods[-600:])

        # 10. P10.2: Ecumenopolis districts (Residential Arcology + 3 Unspecialized Arcology sets, specialization jobs x3, +20 % resources from jobs)
        await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        async def body(name):
            await tab("body")
            await pg.evaluate("(n)=>{const c=[...document.querySelectorAll('.celestial-type-card')].find(x=>x.innerText.trim()===n);if(!c.classList.contains('is-selected'))c.click()}", name)
            await tab("planet")
            await pg.click("#planet-tab-districts")
        await body("Ecumenopolis")
        names = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card-header span')].map(e=>e.innerText)")
        check("ecumenopolis district cards", names == ["Residential Arcology ×2 built", "Unspecialized Arcology 1", "Unspecialized Arcology 2", "Unspecialized Arcology 3"], names)
        opts = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card')[1].querySelectorAll('option')].map(o=>o.value)")
        check("arcology specializations include research, no resource ones", "researchEnclave" in opts and "heavyIndustry" in opts and "energyGeneration" not in opts, opts)
        await pg.evaluate("""()=>{const c=document.querySelectorAll('.planet-district-card')[1];const s=c.querySelector('select');s.value='heavyIndustry';s.dispatchEvent(new Event('change'))}""")
        for _ in range(2):
            await pg.evaluate("""()=>{const c=document.querySelectorAll('.planet-district-card')[1];[...c.querySelectorAll('.planet-count-btn')].find(b=>b.textContent==='+').click()}""")
        mini = await pg.evaluate("()=>document.querySelectorAll('.planet-district-card')[1].querySelector('.planet-district-spec-row').innerText")
        check("Heavy Industry on an arcology: +300 Metallurgists per copy (x3)", "300" in mini, mini)
        housing = await pg.evaluate("()=>document.querySelector('#planet-stat-housing').closest('.planet-header-stat').title")
        check("housing: Residential Arcology 2 x 1500, arcology set 2 x (1500 - 600)", "Residential Arcology ×2 +3000" in housing and "Unspecialized Arcology 1 ×2 +1800" in housing, housing)
        mods = await pg.inner_text("#planet-modifiers")
        check("modifiers panel: Ecumenopolis +20 % and Clerk trade", "Ecumenopolis" in mods and "Clerk" in mods, mods[-600:])
        await body("Continental")
        notice = await pg.evaluate("()=>document.querySelector('#planet-sim-notice')?.innerText||''")
        names = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card-header span')].map(e=>e.innerText)")
        check("back to a regular planet: resource districts and the arcology specialization reset", names[1:] == ["Generator district", "Mining district", "Agriculture district"] and "Heavy Industry" in notice, (names, notice))

        # 11. P10.3: Ring World (City Segment primary, fixed size 10, Unspecialized Segment sets, specialization jobs x5, housing loss x5)
        await body("Ringworld")
        names = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card-header span')].map(e=>e.innerText)")
        check("ring world district cards", names == ["City Segment ×2 built", "Unspecialized Segment 1", "Unspecialized Segment 2", "Unspecialized Segment 3"], names)
        size = await pg.evaluate("()=>{const i=document.querySelector('#planet-size-input');return [i.value,i.disabled]}")
        check("ring world: size fixed at 10, input disabled", size == ["10", True], size)
        opts = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card')[1].querySelectorAll('option')].map(o=>o.value)")
        check("segment specializations: urban + Energy Generation + Agricultural Focus, no Mineral Extraction", "energyGeneration" in opts and "agriculturalFocus" in opts and "mineralExtraction" not in opts and "heavyIndustry" in opts, opts)
        await pg.evaluate("""()=>{const c=document.querySelectorAll('.planet-district-card')[1];const s=c.querySelector('select');s.value='agriculturalFocus';s.dispatchEvent(new Event('change'))}""")
        await pg.evaluate("""()=>{const c=document.querySelectorAll('.planet-district-card')[1];[...c.querySelectorAll('.planet-count-btn')].find(b=>b.textContent==='+').click()}""")
        mini = await pg.evaluate("()=>document.querySelectorAll('.planet-district-card')[1].querySelector('.planet-district-spec-row').innerText")
        check("Agricultural Focus on a segment: +500 Farmers per copy (x5)", "500" in mini, mini)
        housing = await pg.evaluate("()=>document.querySelector('#planet-stat-housing').closest('.planet-header-stat').title")
        check("housing: City Segment 2 x 2500, segment 2500 - 5 x 200", "City Segment ×2 +5000" in housing and "Unspecialized Segment 1 ×3 +4500" in housing and "Weather Control Systems +2500" in housing, housing)
        await body("Continental")
        size = await pg.evaluate("()=>{const i=document.querySelector('#planet-size-input');return [i.value,i.disabled]}")
        check("back to a regular planet: the user's size is restored", size == ["20", False], size)

        # 12. P10.4: Habitat (Habitation District primary, Reactor District / Astro-Mining Bay / Research District, fixed size 6, manual caps)
        await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        await body("Habitat")
        names = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card-header span')].map(e=>e.innerText)")
        check("habitat district cards", names == ["Habitation District ×2 built", "Reactor District", "Astro-Mining Bay", "Research District"], names)
        size = await pg.evaluate("()=>{const i=document.querySelector('#planet-size-input');return [i.value,i.disabled]}")
        check("habitat: size fixed at 6", size == ["6", True], size)
        opts = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card')[1].querySelectorAll('option')].map(o=>o.value)")
        check("Reactor District: generator specializations incl. Solar Farming Bays", "energyGeneration" in opts and "solarFarmingBays" in opts, opts)
        research = await pg.evaluate("()=>{const c=document.querySelectorAll('.planet-district-card')[3];return [c.querySelector('select')===null,c.innerText]}")
        check("Research District: no specializations", research[0] and "no specializations" in research[1], research)
        primary = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card')[0].querySelectorAll('option')].filter(o=>o.disabled).map(o=>o.value)")
        check("habitat primary: research specializations disabled", "researchEnclave" in primary, primary)
        await pg.evaluate("""()=>{const i=document.querySelectorAll('.planet-district-card')[2].querySelector('.planet-district-cap-input');i.value='1';i.dispatchEvent(new Event('change'))}""")
        await pg.evaluate("""()=>{const c=document.querySelectorAll('.planet-district-card')[2];[...c.querySelectorAll('.planet-count-btn')].find(b=>b.textContent==='+').click()}""")
        plus = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card')[2].querySelectorAll('.planet-count-btn')].find(b=>b.textContent==='+').disabled")
        check("Astro-Mining Bay capped at 1 (orbital deposits)", plus, plus)
        await pg.evaluate("""()=>{const c=document.querySelectorAll('.planet-district-card')[3];[...c.querySelectorAll('.planet-count-btn')].find(b=>b.textContent==='+').click()}""")
        housing = await pg.evaluate("()=>document.querySelector('#planet-stat-housing').closest('.planet-header-stat').title")
        check("housing: Habitation District 2 x 1000, Astro-Mining Bay +300", "Habitation District ×2 +2000" in housing and "Astro-Mining Bay ×1 +300" in housing, housing)
        cap = await pg.evaluate("()=>[document.querySelector('#planet-capital-name')?.innerText,document.querySelector('#planet-capital-tier')?.innerText]")
        check("habitat capital: Habitat Administration, tier II", cap == ["Habitat Administration", "2 / 5"], cap)
        jobs = await pg.inner_text("#planet-summary")
        check("Research District jobs: 30 of each researcher", "Physicist" in jobs and "Biologist" in jobs, jobs[:400])
        des = await pg.evaluate("()=>[...document.querySelectorAll('#planet-designation-select option')].map(o=>[o.value,o.disabled])")
        ids = [d[0] for d in des]
        check("habitat designations only (stations, no unity designations)", "miningStation" in ids and "tradeStation" in ids and "unificationCenter" not in ids and "miningWorld" not in ids, ids)
        await pg.evaluate("""()=>{const i=document.querySelectorAll('.planet-district-card')[3].querySelector('.planet-district-cap-input');i.value='0';i.dispatchEvent(new Event('change'))}""")
        des = dict(await pg.evaluate("()=>[...document.querySelectorAll('#planet-designation-select option')].map(o=>[o.value,o.disabled])"))
        await pg.evaluate("""()=>{const i=document.querySelectorAll('.planet-district-card')[2].querySelector('.planet-district-cap-input');i.value='0';i.dispatchEvent(new Event('change'))}""")
        des = dict(await pg.evaluate("()=>[...document.querySelectorAll('#planet-designation-select option')].map(o=>[o.value,o.disabled])"))
        check("Astro-Mining Bay cap 0: Mining Station locked, Research Station available", des.get("miningStation") is True and des.get("researchStation") is False, des)
        txt = await pg.evaluate("()=>[...document.querySelectorAll('#planet-designation-select option')].find(o=>o.value==='researchStation').textContent")
        check("Research Station shows its unmodelled requirement", "Requirement not modelled: Can build Zero-G Research Districts" in txt, txt)
        mopts = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card')[2].querySelectorAll('option')].map(o=>[o.value,o.disabled,o.textContent])")
        grav = [o for o in mopts if o[0] == "gravitonicMines"]
        check("Gravitonic Mines available with its unmodelled requirement", bool(grav) and grav[0][1] is False and "Mountains in the Sky" in grav[0][2], mopts)
        await body("Continental")
        cap = await pg.evaluate("()=>document.querySelector('#planet-capital-name')?.innerText")
        check("back to a regular planet: tier II kept (Planetary Administration)", cap == "Planetary Administration", cap)

        # 13. P10.5: Hive / Machine / Nanite Worlds (Unspecialized Cluster / Nexus sets, machine pop housing usage -10 %)
        await body("Hive World")
        names = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card-header span')].map(e=>e.innerText)")
        check("hive world: Unspecialized Cluster sets", names[1:] == ["Unspecialized Cluster 1", "Unspecialized Cluster 2", "Unspecialized Cluster 3"], names)
        opts = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card')[1].querySelectorAll('option')].map(o=>o.value)")
        check("cluster specializations: urban + the three resource ones", all(x in opts for x in ["energyGeneration", "mineralExtraction", "agriculturalFocus", "heavyIndustry"]), opts)
        await body("Machine World")
        names = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card-header span')].map(e=>e.innerText)")
        check("machine world: Unspecialized Nexus sets", names[1:] == ["Unspecialized Nexus 1", "Unspecialized Nexus 2", "Unspecialized Nexus 3"], names)
        opts = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card')[1].querySelectorAll('option')].map(o=>o.value)")
        check("nexus specializations: no Agricultural Focus", "energyGeneration" in opts and "mineralExtraction" in opts and "agriculturalFocus" not in opts, opts)
        await pg.evaluate("""()=>{const c=document.querySelectorAll('.planet-district-card')[1];[...c.querySelectorAll('.planet-count-btn')].find(b=>b.textContent==='+').click()}""")
        housing = await pg.evaluate("()=>document.querySelector('#planet-stat-housing').closest('.planet-header-stat').title")
        check("housing: Unspecialized Nexus 1 x 1000", "Unspecialized Nexus 1 ×1 +1000" in housing, housing)
        rows = await pg.evaluate("()=>[...document.querySelectorAll('[data-condition]')].map(r=>r.dataset.condition)")
        check("machine world: housing used by pops row (-10 %)", "housingUsage" in rows, rows)
        await body("Continental")
        rows = await pg.evaluate("()=>[...document.querySelectorAll('[data-condition]')].map(r=>r.dataset.condition)")
        check("regular planet: no housing usage row", "housingUsage" not in rows, rows)

        # 14. P10.5: Synaptic Lathe (Neural Gate + Ampliative Speculator, no specializations, 2 + capital Max Districts, Processing Unit capitals)
        await body("Synaptic Lathe")
        names = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card-header span')].map(e=>e.innerText)")
        check("lathe district cards: Neural Gate and Ampliative Speculator only", len(names) == 2 and names[0].startswith("Neural Gate") and names[1] == "Ampliative Speculator", names)
        selects = await pg.evaluate("()=>document.querySelectorAll('.planet-district-card select').length")
        check("lathe districts: no specializations", selects == 0, selects)
        cap = await pg.evaluate("()=>[document.querySelector('#planet-capital-name')?.innerText,document.querySelector('#planet-capital-tier')?.innerText]")
        check("lathe capital: Processing Unit, tier II", cap == ["Processing Unit", "2 / 5"], cap)
        size = await pg.evaluate("()=>{const i=document.querySelector('#planet-size-input');return [i.value,i.disabled]}")
        check("lathe: 2 district slots with the Processing Unit", size == ["2", True], size)
        await pg.click("#planet-capital-upgrade")
        size = await pg.evaluate("()=>document.querySelector('#planet-size-input').value")
        check("lathe: Parallelized capital +2 Max Districts", size == "4", size)
        cap = await pg.evaluate("()=>document.querySelector('#planet-capital-name').innerText")
        check("Parallelized capital shows the Cosmogenesis requirement", "Processing Unit: Parallelized" in cap and "Cosmogenesis" in cap, cap)
        rows = await pg.evaluate("()=>[...document.querySelectorAll('[data-condition]')].map(r=>r.dataset.condition)")
        check("lathe: Neural Chips row instead of civilians", "neuralChips" in rows and "civilians" not in rows, rows)
        await pg.evaluate("""()=>{const i=document.querySelector('[data-condition=neuralChips] input');i.value='2000';i.dispatchEvent(new Event('change'))}""")
        n = await net()
        # 2000 chips = 20 chip jobs: 0.375 x 20 x (2000/2000) physics + 2 Neural Gates x 0.75 x 20 = 37.5 before the stability effect
        check("Neural Chips: research and Advanced Logic", n.get("Advanced Logic", 0) > 0 and n.get("Physics", 0) > 30, n)
        # Synaptic Lathe designation: +15 % resources from jobs, -5 % job upkeep (chips: -4.5 x 20 x 2000/4000 = -45 -> -42.75), -10 % pop housing usage
        async def designation(value):
            await pg.evaluate("(v)=>{const s=document.querySelector('#planet-designation-select');s.value=v;s.dispatchEvent(new Event('change'))}", value)
        await designation("synapticLathe")
        n2 = await net()
        check("Lathe designation: -5 % job upkeep on the chips", approx(n2.get("Energy", 0) - n.get("Energy", 0), 2.25), (n.get("Energy"), n2.get("Energy")))
        rows = await pg.evaluate("()=>[...document.querySelectorAll('[data-condition]')].map(r=>r.dataset.condition)")
        check("Lathe designation: housing used by pops row (-10 %)", "housingUsage" in rows, rows)
        mods = await pg.evaluate("()=>document.querySelector('#planet-modifiers').innerText")
        check("Lathe designation: +15 % resources from jobs in the modifiers", "Synaptic Lathe" in mods and "15" in mods, mods[:300])
        await designation("")
        # Synaptic Lathe buildings: own set only, one slot per Lathe district (3 here), two per building, Expanded Reactor
        # (-15 % job / building / district energy upkeep: +1.2 capital, +22.5 districts, +6.75 chips = +30.45 energy), Neural Stabilizer +15 stability
        await pg.click("#planet-tab-buildings")
        cats = await pg.evaluate("()=>[...document.querySelectorAll('.planet-catalog-category summary')].map(e=>e.innerText)")
        items = await pg.evaluate("()=>document.querySelectorAll('.planet-catalog-item').length")
        check("lathe catalog: only the Synaptic Lathe buildings", cats == ["Synaptic Lathe"] and items == 8, (cats, items))
        slots = await pg.evaluate("()=>[document.querySelectorAll('.planet-base-grid .planet-slot.is-empty').length,document.querySelectorAll('.planet-base-grid .planet-slot.is-locked').length]")
        check("lathe: one building slot per district (3 of 5)", slots == [3, 2], slots)
        async def build(name):
            return await pg.evaluate("(n)=>{const b=[...document.querySelectorAll('.planet-catalog-item')].find(x=>x.querySelector('.planet-catalog-name').innerText.startsWith(n));if(!b||b.disabled)return false;b.click();return true}", name)
        e0 = (await net()).get("Energy", 0)
        check("build Expanded Reactor", await build("Expanded Reactor"))
        n3 = await net()
        check("Expanded Reactor: -15 % upkeep (jobs, buildings, district energy)", approx(n3.get("Energy", 0) - e0, 30.45) and approx(n3.get("Exotic gases", 0), -3.4), (e0, n3))
        check("build Neural Stabilizer", await build("Neural Stabilizer"))
        check("second Neural Stabilizer", await build("Neural Stabilizer"))
        st = await pg.evaluate("()=>document.querySelector('[data-condition=stabilityBuildings] .planet-resource-value')?.innerText")
        check("Neural Stabilizer x2: +30 stability row", st == "+30", st)
        check("lathe: two per building and slots full", not await build("Neural Stabilizer") and not await build("Synaptic Validator"))
        title = await pg.evaluate("()=>[...document.querySelectorAll('.planet-catalog-item')].find(x=>x.querySelector('.planet-catalog-name').textContent.startsWith('Synaptic Cogitator')).title")
        check("Synaptic Cogitator tooltip: unmodelled effects and technology", "Naval capacity" in title and "Synaptic Cogitator technology" in title, title)
        await body("Continental")
        await pg.click("#planet-tab-buildings")
        cats = await pg.evaluate("()=>[...document.querySelectorAll('.planet-catalog-category summary')].map(e=>e.innerText)")
        check("regular planet: no Synaptic Lathe buildings", "Synaptic Lathe" not in cats and len(cats) > 3, cats)
        inactive = await pg.evaluate("()=>document.querySelectorAll('.planet-base-grid .planet-slot.is-inactive').length")
        check("lathe buildings stay inactive on a regular planet", inactive == 3, inactive)
        await body("Synaptic Lathe")
        await body("Continental")
        names = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card-header span')].map(e=>e.innerText)")
        check("back to a regular planet: four district groups", len(names) == 4, names)

        # 15. P10.6: Volcanic World (Geothermal Powerplant / Magma Conduit / Thermotechnic Forum, Miner -> Thermoforger swap,
        # Thermotechnic Mentor workforce bonuses, +5 % alloys from jobs)
        await body("Volcanic")
        names = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card-header span')].map(e=>e.innerText)")
        check("volcanic district cards", names[1:] == ["Geothermal Powerplant", "Magma Conduit", "Thermotechnic Forum"], names)
        opts = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card')[2].querySelectorAll('option')].map(o=>o.value)")
        check("Magma Conduit: mining specializations", "mineralExtraction" in opts, opts)
        forum = await pg.evaluate("()=>{const c=document.querySelectorAll('.planet-district-card')[3];return [c.querySelector('select')===null,c.querySelector('.planet-district-cap-input')===null]}")
        check("Thermotechnic Forum: no specializations, no manual cap", forum == [True, True], forum)
        for i in (2, 3):
            await pg.evaluate("""(i)=>{const c=document.querySelectorAll('.planet-district-card')[i];[...c.querySelectorAll('.planet-count-btn')].find(b=>b.textContent==='+').click()}""", i)
        await pg.evaluate("""()=>{const c=document.querySelectorAll('.planet-district-card')[2];const s=c.querySelector('select');s.value='mineralExtraction';s.dispatchEvent(new Event('change'))}""")
        jobs = await pg.inner_text("#planet-summary")
        check("volcanic jobs: Thermoforgers and Thermotechnic Mentors, no Miners", "Thermoforger" in jobs and "Thermotechnic Mentor" in jobs and "Miner · created" not in jobs, jobs[:500])
        # P21.5: a swapped job inherits its base job's modifiers (Mining Subsidies: +20 % Miner efficiency, −0.5 trade per Miner)
        row_pills = "(n)=>{const r=[...document.querySelectorAll('.planet-job-row')].find(x=>x.innerText.startsWith(n+' ·'));return r?[...r.querySelectorAll('.planet-job-output-pill')].map(p=>p.innerText.trim()):[]}"
        before = await pg.evaluate(row_pills, "Thermoforger")
        await tab("edicts"); await pg.click(".edict-card[data-edict-id=miningSubsidies]"); await tab("planet")
        after = await pg.evaluate(row_pills, "Thermoforger")
        num = lambda v: float(v.replace("−", "-").replace("+", "")) if v else None
        check("swap inherits: Mining Subsidies raises Thermoforger minerals and adds trade upkeep",
              bool(before) and bool(after) and num(after[0]) > num(before[0]) and len(after) == len(before) + 1, (before, after))
        await tab("edicts"); await pg.click(".edict-card[data-edict-id=miningSubsidies]"); await tab("planet")
        housing = await pg.evaluate("()=>document.querySelector('#planet-stat-housing').closest('.planet-header-stat').title")
        check("housing: Magma Conduit +200, Thermotechnic Forum +200", "Magma Conduit ×1 +200" in housing and "Thermotechnic Forum ×1 +200" in housing, housing)
        mods = await pg.evaluate("()=>document.querySelector('#planet-modifiers').innerText")
        check("volcanic: +5 % alloys from jobs in the modifiers", "Volcanic" in mods and "Alloys" in mods, mods[:400])
        await pg.evaluate("()=>[...document.querySelectorAll('#planet-production-net .planet-resource-row')].find(r=>/^Unity/.test(r.innerText))?.click()")
        bd = await pg.evaluate("()=>document.querySelector('#planet-production-net')?.innerText")
        # 3 Thermoforgers produce minerals and alloys: +0.15 unity and +0.15 engineering per mentor (2 mentors).
        check("breakdown: mentor bonuses per producing workforce", "bonuses per producing workforce" in (bd or ""), bd)
        await body("Continental")
        jobs = await pg.inner_text("#planet-summary")
        check("back to a regular planet: Miners again", "Miner" in jobs and "Thermoforger" not in jobs, jobs[:500])

        # 16. P10.6: Gaia World (+10 happiness row, none in gestalt) and Relic World (Central Spire: first slot only, +15 % research)
        await body("Gaia")

        hrow = await pg.evaluate("()=>document.querySelector('[data-condition=happinessBody] .planet-resource-value')?.innerText")
        check("Gaia: +10 happiness row", hrow == "+10", hrow)
        await tab("empire"); await ethic("Gestalt Consciousness")
        hrow = await pg.evaluate("()=>document.querySelector('[data-condition=happinessBody]')")
        check("Gaia gestalt: no happiness row", hrow is None, hrow)
        await tab("empire"); await ethic("Gestalt Consciousness")
        await body("Relic World")
        spire = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card')[0].querySelectorAll('select')].map(s=>[...s.options].filter(o=>o.value==='centralSpire').map(o=>[o.disabled,o.textContent]))")
        check("Relic: Central Spire only in the first slot, with its unmodelled requirement", len(spire) == 2 and len(spire[0]) == 1 and spire[0][0][0] is False and "Collapsed Spire" in spire[0][0][1] and spire[1] == [], spire)
        await pg.evaluate("""()=>{const s=document.querySelectorAll('.planet-district-card')[0].querySelector('select');s.value='centralSpire';s.dispatchEvent(new Event('change'))}""")
        jobs = await pg.inner_text("#planet-summary")
        check("Central Spire: researchers created", "Physicist" in jobs and "Engineer" in jobs, jobs[:400])
        mods = await pg.evaluate("()=>[...document.querySelectorAll('#planet-modifiers .planet-modifier-row')].map(r=>r.innerText)")
        check("Central Spire: +15 % research from jobs in the modifiers", any("Central Spire" in m and "district specialization" in m.lower() and "+15%" in m for m in mods), mods)
        await pg.evaluate("()=>[...document.querySelectorAll('#planet-production-net .planet-resource-row')].find(r=>/^Physics/.test(r.innerText))?.click()")
        bd = await pg.evaluate("()=>document.querySelector('#planet-production-net')?.innerText")
        check("breakdown: district specializations % line", "District specializations: % of job output" in (bd or ""), bd)
        await body("Continental")
        slot = await pg.evaluate("()=>document.querySelectorAll('.planet-district-card')[0].querySelector('select').value")
        check("Central Spire reset on a regular planet", slot == "", slot)

        # 17. P10.9: Administrative Hub (Administrator job by authority), Spiritual Enclave (Spiritualist), primary-only Archives and Urban Expansion
        async def primary_opts(card=0, sel=0):
            return await pg.evaluate("([c,i])=>Object.fromEntries([...document.querySelectorAll('.planet-district-card')[c].querySelectorAll('select')[i].options].map(o=>[o.value,o.disabled]))", [card, sel])
        async def pick_primary(value, sel=0):
            await pg.evaluate("([v,i])=>{const s=document.querySelectorAll('.planet-district-card')[0].querySelectorAll('select')[i];s.value=v;s.dispatchEvent(new Event('change'))}", [value, sel])
        opts = await primary_opts()
        check("primary: Administrative Hub, Archives and Urban Expansion offered", all(k in opts for k in ["administrativeHub", "archives", "urbanExpansion", "spiritualEnclave"]), opts)
        spiritualist = await pg.evaluate("()=>!!document.querySelector('#empire-ethics-wheel button.is-selected[title^=\"Spiritualist\"], #empire-ethics-wheel button.is-selected[title^=\"Fanatic Spiritualist\"]')")
        check("Spiritual Enclave needs Spiritualist / Administrative Hub not with it", opts["spiritualEnclave"] is (not spiritualist) and opts["administrativeHub"] is spiritualist, (spiritualist, opts))
        if not spiritualist:
            await pick_primary("archives", 0); await pick_primary("administrativeHub", 1)
            jobs = await pg.inner_text("#planet-summary")
            check("Archives + Administrative Hub: Bureaucrats and researchers", "Bureaucrat" in jobs and "Physicist" in jobs, jobs[:500])
            await tab("empire"); await ethic("Gestalt Consciousness")
            await pg.evaluate("()=>[...document.querySelectorAll('#empire-authority-list button')].find(b=>/Hive Mind/.test(b.innerText)).click()")
            await tab("planet")
            jobs = await pg.inner_text("#planet-summary")
            check("hive mind: Administrative Hub / Archives create Synapse Drones", "Synapse Drone" in jobs and "Bureaucrat" not in jobs, jobs[:500])
            await tab("empire"); await ethic("Gestalt Consciousness"); await tab("planet"); await pg.click("#planet-tab-districts")
        await pick_primary("urbanExpansion", 0)
        housing = await pg.evaluate("()=>document.querySelector('#planet-stat-housing').closest('.planet-header-stat').title")
        check("Urban Expansion selectable (housing tooltip still lists the 2 primary districts)", "×2" in housing, housing)
        await body("Ecumenopolis")
        sopts = await primary_opts(1)
        check("secondary urban: no Archives / Urban Expansion / Central Spire, Administrative Hub offered", "archives" not in sopts and "urbanExpansion" not in sopts and "centralSpire" not in sopts and "administrativeHub" in sopts, sopts)
        await body("Continental")

        # 18. P10.8: required deposit features (computed from the built resource districts), 4-15 warning, Relic agriculture blocked
        async def card_plus(i, times=1):
            for _ in range(times):
                await pg.evaluate("""(i)=>{const c=document.querySelectorAll('.planet-district-card')[i];[...c.querySelectorAll('.planet-count-btn')].find(b=>b.textContent==='+').click()}""", i)
        async def features():
            return await pg.evaluate("()=>({items:[...document.querySelectorAll('#celestial-deposit-features .celestial-feature')].map(e=>e.dataset.feature),count:document.querySelector('#celestial-deposit-features .celestial-feature-count')?.dataset.count,warning:document.querySelector('#celestial-feature-warning')?.innerText||null})")
        await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        await body("Continental")
        await card_plus(2, 5)
        f = await features()
        # Continental mining: Rich Mountain (+3) and Prosperous Mesa (+2) = 2 features
        check("Continental, 5 mining districts: Rich Mountain + Prosperous Mesa", sorted(f["items"]) == ["prosperousMesa", "richMountain"] and f["count"] == "2", f)
        check("fewer than 4 deposit features: warning", bool(f["warning"]) and "Fewer than 4" in f["warning"], f)
        await card_plus(1, 9)
        f = await features()
        check("5 mining + 9 generator: 5 features, no warning", f["count"] == "5" and f["warning"] is None, f)
        await body("Relic World")
        agri = await pg.evaluate("()=>{const c=document.querySelectorAll('.planet-district-card')[3];return [[...c.querySelectorAll('.planet-count-btn')].find(b=>b.textContent==='+').disabled,c.innerText]}")
        check("Relic World: no agriculture feature, + disabled with a note", agri[0] is True and "No deposit feature" in agri[1], agri)
        await body("Ecumenopolis")
        na = await pg.evaluate("()=>document.querySelector('#celestial-deposit-features').innerText")
        check("Ecumenopolis: deposit features not applicable", "no deposit features" in na, na)
        await body("Continental")

        # 19. P10.8: strategic deposits (worst by default, user choice, saved), Rare Crystal Extraction swaps Miners, Betharian Processing
        await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        await body("Continental")
        await card_plus(2, 2)
        await pg.evaluate("""()=>{const s=document.querySelectorAll('.planet-district-card')[2].querySelector('select');s.value='rareCrystalExtraction';s.dispatchEvent(new Event('change'))}""")
        jobs = await pg.inner_text("#planet-summary")
        check("Rare Crystal Extraction: Crystal Miners replace Miners", "Crystal Miner" in jobs and "\nMiner" not in jobs, jobs[:600])
        f = await features()
        check("strategic deposit: Crystalline Caverns (worst) covers 2 mining districts", f["items"] == ["crystallineCaverns"] and f["count"] == "1", f)
        rc0 = (await net()).get("Rare crystals", 0)
        await pg.evaluate("()=>{const s=document.querySelector('.celestial-strategic-select');s.value='crystalForest';s.dispatchEvent(new Event('change'))}")
        rc1 = (await net()).get("Rare crystals", 0)
        # 6 Crystal Miners (2 districts x (200 + 100 specialization)): +0.05 more each
        check("Crystal Forest: +0.05 rare crystals per Miner more", rc1 > rc0 and abs((rc1 - rc0) - 0.3) < 0.02, (rc0, rc1))
        await pg.fill("#planet-summary-name", "Deposit planet")
        await pg.evaluate("()=>document.querySelector('#planet-summary-save').click()")
        await pg.wait_for_timeout(300)
        await pg.evaluate("()=>[...document.querySelectorAll('.confirm-btn')].find(b=>/don't save/i.test(b.innerText))?.click()")
        await pg.wait_for_timeout(300)
        planets = await pg.evaluate("()=>JSON.parse(localStorage.getItem('codex-ignis-planets')||'[]')")
        dep = [p.get("strategicDeposits") for p in planets if p.get("name") == "Deposit planet"]
        check("strategic deposit choice saved with the planet", dep == [{"rareCrystalExtraction": "crystalForest"}], dep)
        await pg.evaluate("""()=>{const s=document.querySelectorAll('.planet-district-card')[2].querySelector('select');s.value='betharianProcessing';s.dispatchEvent(new Event('change'))}""")
        n = await net()
        f = await features()
        check("Betharian Processing: Betharian Fields, Miners back, energy from Miners", f["items"] == ["betharianFields"] and n.get("Energy", 0) > 0, (f, n))
        await body("Ecumenopolis")
        await body("Continental")

        # 20. P10.8: selectable blockers (Collapsed Spire locks the first slot, Blazing Scourge needs Fire Cult, Nanite Harvest Basin output)
        async def blocker(bid):
            await pg.evaluate("(b)=>document.querySelector(`#celestial-blockers [data-blocker=${b}] input`).click()", bid)
        await body("Relic World")
        await pg.evaluate("""()=>{const s=document.querySelectorAll('.planet-district-card')[0].querySelector('select');s.value='centralSpire';s.dispatchEvent(new Event('change'))}""")
        await blocker("collapsedSpire")
        slot = await pg.evaluate("()=>{const s=document.querySelectorAll('.planet-district-card')[0].querySelector('select');return [s.value,s.disabled]}")
        check("Collapsed Spire: first slot locked, Central Spire removed", slot == ["", True], slot)
        await blocker("collapsedSpire")
        await blocker("naniteHarvestBasin")
        n = await net()
        check("Nanite Harvest Basin: +0.5 nanites", approx(n.get("Nanites"), 0.5), n)
        await blocker("chargedAtmosphere")
        txt = await pg.evaluate("()=>document.querySelector('#celestial-blockers [data-blocker=chargedAtmosphere]').innerText")
        check("Charged Atmosphere without Fire Cult: no effect, reason shown", "No effect" in txt and "Fire Cult" in txt, txt)
        await pg.fill("#planet-summary-name", "Blocker planet")
        await pg.evaluate("()=>document.querySelector('#planet-summary-save').click()")
        await pg.wait_for_timeout(300)
        await pg.evaluate("()=>[...document.querySelectorAll('.confirm-btn')].find(b=>/don't save/i.test(b.innerText))?.click()")
        await pg.wait_for_timeout(300)
        planets = await pg.evaluate("()=>JSON.parse(localStorage.getItem('codex-ignis-planets')||'[]')")
        saved_b = [p.get("blockerIds") for p in planets if p.get("name") == "Blocker planet"]
        check("blockers saved with the planet", bool(saved_b) and saved_b[0] is not None and sorted(saved_b[0]) == ["chargedAtmosphere", "naniteHarvestBasin"], saved_b)
        await blocker("naniteHarvestBasin"); await blocker("chargedAtmosphere")
        await body("Continental")

        # 21. P10.8: planet modifiers (max districts change the required features, % from jobs, conditions rows, exclusions, saved)
        async def pmod(mid):
            await pg.evaluate("(m)=>document.querySelector(`#celestial-planet-modifiers [data-modifier=${m}] input`).click()", mid)
        await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        await body("Continental")
        await card_plus(2, 5)
        m0 = (await net()).get("Minerals", 0)
        await pmod("highQualityMinerals")
        f = await features()
        check("High Quality Minerals (+4 mining): 1 feature for 5 mining districts", f["count"] == "1" and f["items"] == ["oreVeinedCliffs"], f)
        m1 = (await net()).get("Minerals", 0)
        check("High Quality Minerals: +15 % minerals from jobs", m1 > m0, (m0, m1))
        await pmod("weakMagneticField")
        dis = await pg.evaluate("()=>document.querySelector('#celestial-planet-modifiers [data-modifier=strongMagneticField] input').disabled")
        check("Weak Magnetic Field excludes Strong Magnetic Field", dis is True, dis)
        await pmod("localMycelialNetwork")
        crime = await pg.evaluate("()=>document.querySelector('#planet-conditions [data-condition=crimePlanetModifiers] .planet-resource-value')?.innerText")
        check("Local Mycelial Network: -25 crime row", crime is not None and "25" in crime, crime)
        await pmod("residentialMonument")
        housing = await pg.evaluate("()=>document.querySelector('#planet-stat-housing').closest('.planet-header-stat').title")
        check("Residential Monument: +800 housing in the tooltip", "Residential Monument +800" in housing, housing)
        await pg.fill("#planet-summary-name", "Modifier planet")
        await pg.evaluate("()=>document.querySelector('#planet-summary-save').click()")
        await pg.wait_for_timeout(300)
        await pg.evaluate("()=>[...document.querySelectorAll('.confirm-btn')].find(b=>/don't save/i.test(b.innerText))?.click()")
        await pg.wait_for_timeout(300)
        planets = await pg.evaluate("()=>JSON.parse(localStorage.getItem('codex-ignis-planets')||'[]')")
        saved_m = [p.get("planetModifierIds") for p in planets if p.get("name") == "Modifier planet"]
        check("planet modifiers saved with the planet", bool(saved_m) and saved_m[0] is not None and sorted(saved_m[0]) == ["highQualityMinerals", "localMycelialNetwork", "residentialMonument", "weakMagneticField"], saved_m)
        await body("Volcanic")
        vis = await pg.evaluate("()=>[!!document.querySelector('#celestial-planet-modifiers [data-modifier=lavafalls]'),!!document.querySelector('#celestial-planet-modifiers [data-modifier=lush]')]")
        check("Volcanic: Lavafalls listed, Lush (x0 on Volcanic) not", vis == [True, False], vis)
        await body("Continental")

        # P10.10: Anglers on a wet-climate world blocks Agricultural Focus and Agrarian Villages; other worlds keep them
        async def civic_toggle(label):
            await tab("empire")
            await pg.evaluate("(l)=>[...document.querySelectorAll('#empire-civics-list button')].find(b=>b.innerText.trim()===l).click()", label)
        async def agri_opts():
            return await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card')[3].querySelectorAll('option')].map(o=>[o.value,o.disabled,o.textContent])")
        await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        await tab("empire")
        await ethic("Gestalt Consciousness")
        await pg.evaluate("()=>[...document.querySelectorAll('#empire-authority-list button')].find(b=>b.innerText.startsWith('Machine Intelligence')).click()")
        await civic_toggle("Anglers / Marine Machines")
        await body("Ocean")
        ao = {v: (d, txt) for v, d, txt in await agri_opts()}
        check("Anglers on Ocean: Agricultural Focus disabled with the reason", ao.get("agriculturalFocus", (False, ""))[0] and "Not available with: Anglers" in ao["agriculturalFocus"][1] and "Ocean" in ao["agriculturalFocus"][1], ao.get("agriculturalFocus"))
        check("Anglers on Ocean: Aquaculture available", ao.get("aquaculture", (True, ""))[0] is False, ao.get("aquaculture"))
        await card_plus(3, 1)
        await pg.evaluate("""()=>{const s=document.querySelectorAll('.planet-district-card')[3].querySelector('select');s.value='aquaculture';s.dispatchEvent(new Event('change'))}""")
        jobs = await pg.inner_text("#planet-summary")
        check("Anglers on Ocean: Anglers and Pearl Divers replace Farmers", "Angler" in jobs and "Pearl Diver" in jobs and "\nFarmer" not in jobs, jobs[:600])
        await body("Arid")
        jobs = await pg.inner_text("#planet-summary")
        check("Anglers on Arid: Farmers again, Aquaculture dropped", "Farmer" in jobs and "Angler" not in jobs, jobs[:600])
        ao = {v: d for v, d, _ in await agri_opts()}
        check("Anglers on Arid: Agricultural Focus available", ao.get("agriculturalFocus") is False, ao)
        await civic_toggle("Anglers / Marine Machines")
        await body("Continental")

        # P10.10: building requirement columns (Experimental Sentencing family, not Materialist; Uplink Node not Rogue Servitor)
        breq = await pg.evaluate("""async()=>{const r=await import('./js/building-requirements.js');const d=await import('./js/planet-data.js');
            const b=(id)=>d.BUILDINGS.find(x=>x.id===id);const ok=(id,ctx)=>r.buildingRequirementsMet(b(id),ctx);
            return [ok('experimentation_chambers',{ethicIds:['materialist'],civicIds:[]}),ok('experimentation_chambers',{ethicIds:['authoritarian'],civicIds:['civicTwistedExperimenters']}),
              ok('uplink_node',{ethicIds:['gestaltConsciousness'],authorityId:'machineIntelligence',civicIds:['civicMachineServitor']}),ok('uplink_node',{ethicIds:['gestaltConsciousness'],authorityId:'machineIntelligence',civicIds:[]}),
              r.unmodelledRequirements(b('stronghold')).map(x=>x.i18nKey)]}""")
        check("Experimentation Chambers: needs Experimental Sentencing, not Materialist", breq[0] is False and breq[1] is True, breq)
        check("Uplink Node: not with Rogue Servitor", breq[2] is False and breq[3] is True, breq)
        check("Stronghold: not-Wilderness shown as unmodelled", breq[4] == ["reqNotWildernessOrigin"], breq)

        # P19.2: Sucursales tab (owner civics, legal/illegal, slots by capital tier, requirements, inactive buildings)
        await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        await tab("branches")
        await pg.evaluate("()=>document.querySelector('#branch-present-toggle').click()")
        slots_i = await pg.inner_text("#branch-slots-label")
        check("branch: tier I capital gives 0 slots", "Building slots: 0" in slots_i, slots_i)
        for _ in range(2): await pg.evaluate("()=>document.querySelector('#planet-capital-upgrade').click()")
        slots_iii = await pg.inner_text("#branch-slots-label")
        check("branch: tier III capital gives 2 slots", "Building slots: 2" in slots_iii, slots_iii)
        ill = await pg.evaluate("()=>document.querySelector('#branch-legality-select option[value=illegal]').disabled")
        check("branch: illegal needs Criminal Heritage", ill is True)
        await pg.evaluate("()=>document.querySelector('.branch-civic[data-civic=civicCriminalHeritage] input').click()")
        await pg.evaluate("()=>document.querySelector('.branch-civic[data-civic=civicTradingPosts] input').click()")
        await pg.select_option("#branch-legality-select", "illegal")
        await pg.select_option(".branch-slot[data-branch-slot='0'] select", "commercialForum")
        s0 = await pg.inner_text(".branch-slot[data-branch-slot='0']")
        check("branch: illegal Commercial Forum = Smuggler's Port, half Criminals, +25 crime, trade per Criminal with the owner civic",
              "Smuggler's Port" in s0 and "+100 Trader jobs" in s0 and "+100 Criminal jobs" in s0 and "+0.1 Trade per Criminal job" in s0 and "+25 Crime" in s0 and "paid by this planet" in s0, s0)
        opts = await pg.evaluate("()=>Object.fromEntries([...document.querySelectorAll('.branch-slot[data-branch-slot=\"1\"] option')].map(o=>[o.value,o.disabled]))")
        check("branch: illegal office blocks Industrial Subsidiary / Executive Retreat / Temple, allows Disinformation Center (tier III)",
              opts.get("industrialSubsidiary") and opts.get("executiveRetreat") and opts.get("templeOfProsperity") and opts.get("corporateEmbassy") is False, opts)
        await pg.select_option("#branch-legality-select", "legal")
        await pg.evaluate("()=>document.querySelector('.branch-civic[data-civic=civicGospelOfTheMasses] input').click()")
        await pg.select_option(".branch-slot[data-branch-slot='1'] select", "templeOfProsperity")
        conflict = await pg.evaluate("()=>document.querySelector('.branch-civic[data-civic=civicFranchising] input').disabled")
        check("branch: max 3 owner civics", conflict is True)
        await pg.evaluate("()=>document.querySelector('#planet-capital-downgrade').click()")
        s1 = await pg.evaluate("()=>{const c=document.querySelector('.branch-slot[data-branch-slot=\"1\"]');return [c.classList.contains('is-inactive'),c.innerText]}")
        check("branch: building in a slot the capital no longer unlocks stays, inactive", s1[0] and "Temple of Prosperity" in s1[1] and "Inactive" in s1[1], s1)
        # P19.4: branch office saved with the planet, restored on open; bogus ids dropped
        await pg.fill("#planet-summary-name", "Branch planet")
        await pg.evaluate("()=>document.querySelector('#planet-summary-save').click()")
        await pg.wait_for_timeout(300)
        await pg.evaluate("()=>[...document.querySelectorAll('.confirm-btn')].find(b=>/don't save/i.test(b.innerText))?.click()")
        await pg.wait_for_timeout(300)
        bp = await pg.evaluate("()=>(JSON.parse(localStorage.getItem('codex-ignis-planets')||'[]').find(p=>p.name==='Branch planet')||{}).branchOffice")
        check("branch office saved with the planet", bp == {"present": True, "illegal": False, "ownerCivicIds": ["civicCriminalHeritage", "civicTradingPosts", "civicGospelOfTheMasses"], "slots": ["commercialForum", "templeOfProsperity", None, None]}, bp)
        await pg.evaluate("""()=>{const a=JSON.parse(localStorage.getItem('codex-ignis-planets'));const p=a.find(x=>x.name==='Branch planet');
            p.branchOffice={present:true,illegal:true,ownerCivicIds:['civicNonsense','civicTradingPosts'],slots:['bogus','commercialForum',null,null]};localStorage.setItem('codex-ignis-planets',JSON.stringify(a))}""")
        await pg.reload(); await pg.wait_for_timeout(500)
        await tab("library")
        await pg.evaluate("()=>{const c=[...document.querySelectorAll('.library-card')].find(x=>x.innerText.includes('Branch planet'));[...c.querySelectorAll('button')].find(b=>/open/i.test(b.innerText)).click()}")
        await pg.wait_for_timeout(500)
        await pg.evaluate("()=>[...document.querySelectorAll('.confirm-btn')].find(b=>/don't save/i.test(b.innerText))?.click()")
        await pg.wait_for_timeout(300)
        await tab("branches")
        restored = await pg.evaluate("()=>[document.querySelector('#branch-present-toggle').checked,document.querySelector('#branch-legality-select').value,[...document.querySelectorAll('.branch-civic input:checked')].map(i=>i.closest('.branch-civic').dataset.civic),[...document.querySelectorAll('.branch-slot-select')].map(s=>s.value)]")
        check("branch office restored: unknown civic and building dropped, illegal without Criminal Heritage -> legal", restored == [True, "legal", ["civicTradingPosts"], ["", "commercialForum"]], restored)
        block_txt = await pg.evaluate("async()=>{const d=await import('./js/branch-office-data.js');return [d.branchHostBlockReason({celestialTypeId:'nanite'},false),d.branchHostBlockReason({celestialTypeId:'continental'},true),d.branchHostBlockReason({celestialTypeId:'continental',civicIds:['civicFanaticPurifiers']},false),d.branchHostBlockReason({celestialTypeId:'continental'},false)]}")
        check("branch: no branch offices on Nanite World / gestalt / Fanatic Purifiers hosts", block_txt == ["branchHostBlockedBody", "branchHostBlockedGestalt", "branchHostBlockedPurifiers", None], block_txt)

        # P19.3: branch office effects on the planet economy and conditions
        await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        for _ in range(2): await pg.evaluate("()=>document.querySelector('#planet-capital-upgrade').click()")
        await tab("branches")
        await pg.evaluate("()=>document.querySelector('#branch-present-toggle').click()")
        await pg.evaluate("()=>document.querySelector('.branch-civic[data-civic=civicTradingPosts] input').click()")
        await pg.evaluate("()=>document.querySelector('.branch-civic[data-civic=civicGospelOfTheMasses] input').click()")
        await pg.select_option(".branch-slot[data-branch-slot='0'] select", "commercialForum")
        await pg.select_option(".branch-slot[data-branch-slot='1'] select", "clearThoughtClinic")
        mods = await pg.evaluate("()=>[...document.querySelectorAll('#planet-modifiers .planet-modifier-row')].map(r=>r.innerText.replace(/\\n/g,' '))")
        check("branch: Commercial Forum +0.1 trade per Trader (0.05 + 0.05 Trading Posts)", any("Commercial Forum" in m and "Trader" in m and "+0.1" in m for m in mods), mods)
        check("branch: Clear Thought Clinic +10% trade from jobs and -5 happiness", any("Clear Thought Clinic" in m and "+10%" in m for m in mods) and any("Clear Thought Clinic" in m and "Happiness" in m and "−5" in m for m in mods), mods)
        cond = await pg.evaluate("()=>Object.fromEntries([...document.querySelectorAll('#planet-conditions [data-condition]')].map(r=>[r.dataset.condition,r.querySelector('.planet-resource-value')?.innerText]))")
        check("branch: happiness row from the branch office", cond.get("happinessBranchOffice") == "−5", cond)
        summ = await pg.inner_text("#planet-summary")
        check("branch: 400 Traders (capital tier III has none, the two buildings add 200 each)", "Trader" in summ, summ[:400])
        val = await pg.inner_text("#branch-value-line")
        check("branch: value line = 50% of the colony's trade", "Branch office value:" in val and "50%" in val, val)
        check("branch: economy consistent", not (await pg.inner_text("#planet-production-check")).strip())
        await pg.select_option(".branch-slot[data-branch-slot='1'] select", "templeOfProsperity")
        summ = await pg.inner_text("#planet-summary")
        check("branch: Temple of Prosperity adds Prosperity Preacher jobs", "Prosperity Preacher" in summ, summ[:500])
        await pg.evaluate("()=>document.querySelector('.branch-civic[data-civic=civicGospelOfTheMasses] input').click()")
        await pg.evaluate("()=>document.querySelector('.branch-civic[data-civic=civicCriminalHeritage] input').click()")
        await pg.select_option("#branch-legality-select", "illegal")
        cond = await pg.evaluate("()=>Object.fromEntries([...document.querySelectorAll('#planet-conditions [data-condition]')].map(r=>[r.dataset.condition,r.querySelector('.planet-resource-value')?.innerText]))")
        check("branch: illegal Smuggler's Port +25 crime; Temple inactive without Gospel", cond.get("crimeBranchOffice") == "+25", cond)
        mods = await pg.evaluate("()=>[...document.querySelectorAll('#planet-modifiers .planet-modifier-row')].map(r=>r.innerText.replace(/\\n/g,' '))")
        check("branch: illegal per-job trade on Criminals", any("Smuggler's Port" in m and "Criminal" in m and "+0.1" in m for m in mods) and not any("Temple of Prosperity" in m for m in mods), mods)
        val = await pg.inner_text("#branch-value-line")
        check("branch: illegal value shown as a 25-75% range", "25–75%" in val, val)
        await pg.evaluate("()=>document.querySelector('#branch-present-toggle').click()")
        mods = await pg.evaluate("()=>[...document.querySelectorAll('#planet-modifiers .planet-modifier-row')].map(r=>r.innerText)")
        check("branch: no branch office -> no branch modifiers", not any("Branch office" in m for m in mods), mods)
        # P21.3: branch office swaps — Disinformation Center (illegal) / Corporate Embassy (legal) turn every Politician into a Merchant
        await pg.evaluate("()=>document.querySelector('#branch-present-toggle').click()")
        await pg.select_option(".branch-slot[data-branch-slot='0'] select", "corporateEmbassy")
        summ = await pg.inner_text("#planet-summary")
        check("swap: Disinformation Center -> Merchants replace Politicians", "Merchant · created" in summ and "Politician · created" not in summ and "Branch office:" in summ and "Disinformation Center" in summ, summ[:400])
        await pg.select_option("#branch-legality-select", "legal")
        summ = await pg.inner_text("#planet-summary")
        check("swap: Corporate Embassy -> Merchants replace Politicians", "Merchant · created" in summ and "Politician · created" not in summ, summ[:400])
        mods = await pg.evaluate("()=>[...document.querySelectorAll('#planet-modifiers .planet-modifier-row')].map(r=>r.innerText.replace(/\\n/g,' '))")
        check("swap: Corporate Embassy per-Politician trade kept on the Merchants", any("Corporate Embassy" in m and "Politician" in m for m in mods), mods)
        check("swap: economy consistent with branch swaps", not (await pg.inner_text("#planet-production-check")).strip())
        await pg.evaluate("()=>document.querySelector('#branch-present-toggle').click()")
        summ = await pg.inner_text("#planet-summary")
        check("swap: no branch office -> Politicians back", "Politician · created" in summ and "Merchant · created" not in summ, summ[:400])

        # P21.2: generic job swaps — Politicians become Nobles (Aristocratic Elite), Merchants (Merchant Guilds), Patricians (both, weight 20)
        await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        await tab("empire")
        await ethic("Fanatic Authoritarian"); await ethic("Materialist")
        await pg.evaluate("()=>[...document.querySelectorAll('#empire-authority-list button')].find(b=>b.innerText.startsWith('Imperial')).click()")
        await pg.evaluate("()=>document.querySelector('#planet-capital-upgrade').click()")
        await civic_toggle("Aristocratic Elite")
        jobs = await pg.inner_text("#planet-summary")
        check("swap: Aristocratic Elite turns Politicians into Nobles", "Noble · created" in jobs and "Politician · created" not in jobs and "Replaces Politician" in jobs, jobs[:300])
        await civic_toggle("Merchant Guilds")
        jobs = await pg.inner_text("#planet-summary")
        check("swap: Noble + Merchant conditions -> Patrician (highest weight)", "Patrician · created" in jobs and "Noble · created" not in jobs and "Politician · created" not in jobs, jobs[:300])
        await civic_toggle("Aristocratic Elite")
        jobs = await pg.inner_text("#planet-summary")
        check("swap: Merchant Guilds alone -> Merchant", "Merchant · created" in jobs and "Patrician · created" not in jobs and "Requires civic: Merchant Guilds" in jobs, jobs[:300])
        await civic_toggle("Merchant Guilds")
        jobs = await pg.inner_text("#planet-summary")
        check("swap: no swap civics -> Politicians back", "Politician · created" in jobs and "Merchant · created" not in jobs, jobs[:300])
        unap = await pg.evaluate("()=>{const d=document.querySelector('.planet-job-swaps-unapplied');return d?d.innerText:''}")
        check("swap: not-applied list names the unmodelled origin (Politician -> Technophant)", "Job swaps not applied" in unap, unap)
        items = await pg.evaluate("()=>{const d=document.querySelector('.planet-job-swaps-unapplied');if(!d)return '';d.open=true;return d.innerText}")
        check("swap: Technophant listed with Cybernetic Creed", "Technophant" in items and "Cybernetic Creed" in items, items)

        # P21.5: job swap engine (js/job-swaps.js) — precedence, exclusions, stacking, gestalt upkeep, unmodelled conditions
        eng = await pg.evaluate("""async()=>{const m=await import('./js/job-swaps.js');
            const base={gestalt:false,ethicIds:[],civicIds:[],authorityId:'democratic',buildingIds:[],zoneIds:[],planetModifierIds:[],branchBuildingIds:[]};
            const ctx=(o)=>({...base,...o});const win=(c,j)=>m.resolveJobSwaps(c)[j]?.winner?.id||null;
            const stack=(id,c)=>m.stackedSwapChanges(id,c).map(x=>[x.id,x.output,x.effects]);
            return {
              manager: win(ctx({authorityId:'corporate'}),'bureaucrat'),
              steward: win(ctx({authorityId:'corporate',civicIds:['civicWorkerCoop']}),'bureaucrat'),
              preacher: win(ctx({authorityId:'corporate',civicIds:['civicWorkerCoop'],ethicIds:['spiritualist']}),'bureaucrat'),
              preacherStack: stack('prosperity_preacher',ctx({authorityId:'corporate',civicIds:['civicWorkerCoop'],ethicIds:['spiritualist']})),
              priest: win(ctx({ethicIds:['fanaticSpiritualist']}),'bureaucrat'),
              deathPriestStack: stack('death_priest',ctx({civicIds:['civicDeathCult']})),
              chronicler: win(ctx({civicIds:['civicMemorialist','civicDeathCult']}),'bureaucrat'),
              chroniclerStack: stack('death_chronicler',ctx({civicIds:['civicMemorialist','civicDeathCult']})),
              fireNoHabitability: win(ctx({civicIds:['civicPyrolatry']}),'politician'),
              warden: win(ctx({designationId:'penalColony'}),'politician'),
              thermo: win(ctx({celestialTypeId:'volcanic',gestalt:true,authorityId:'machineIntelligence'}),'miner'),
              crystalVsThermo: win(ctx({celestialTypeId:'volcanic',zoneIds:['rareCrystalExtraction']}),'miner'),
              anglerGas: [win(ctx({civicIds:['civicAnglers'],celestialTypeId:'ocean',zoneIds:['exoticGasCapture']}),'farmer'),stack('angler',ctx({zoneIds:['exoticGasCapture']}))],
              gestaltUpkeep: [m.swapGestaltUpkeep('astrometeorologist',ctx({gestalt:true,authorityId:'machineIntelligence'})),m.swapGestaltUpkeep('crystal_miner',ctx({gestalt:true,authorityId:'hiveMind'})),m.swapGestaltUpkeep('chronicle_drone',ctx({gestalt:true,authorityId:'hiveMind',speciesType:'lithoid'}))],
              gestaltNoIndividualist: win(ctx({gestalt:true,authorityId:'hiveMind',civicIds:['civicAristocraticElite']}),'politician'),
              technophantBlocked: [win(ctx({}),'politician'), m.blockedByUnmodelled(m.MODELLED_SWAPS.find(s=>s.id==='technophant'),ctx({}))]
            }}""")
        check("engine: Corporate -> Manager; with Worker Cooperative -> Steward", eng["manager"] == "manager" and eng["steward"] == "steward", eng)
        check("engine: Prosperity Preacher (15) beats Steward and stacks its +1 trade +1 amenity", eng["preacher"] == "prosperity_preacher" and eng["preacherStack"] == [["steward", {"trade": 1, "amenities": 1}, {}]], eng)
        check("engine: Fanatic Spiritualist -> Priest", eng["priest"] == "priest", eng)
        check("engine: Death Priest without Steward/Culture conditions stacks nothing", eng["deathPriestStack"] == [], eng)
        check("engine: Death Chronicler (200) wins and stacks the Death Priest changes", eng["chronicler"] == "death_chronicler" and eng["chroniclerStack"] == [["death_priest", {"unity": -1, "amenities": 2, "society": 0.5}, {}]], eng)
        check("engine: Fire Cult swaps need the (unmodelled) habitability -> no swap", eng["fireNoHabitability"] is None, eng)
        check("engine: Penal Colony -> Planetary Warden", eng["warden"] == "planetary_warden", eng)
        check("engine: Thermoforger for any empire; beats Crystal Miner (35 > 20)", eng["thermo"] == "thermoforger" and eng["crystalVsThermo"] == "thermoforger", eng)
        check("engine: Angler beats Gas Extractor and gets the zone change", eng["anglerGas"] == ["angler", [["exoticGasCapture", {"food": -3, "exotic_gases": 0.5}, {}]]], eng)
        check("engine: gestalt upkeep (own variant / inherited / per species extra)", eng["gestaltUpkeep"] == [{"replace": {"energy": -3}, "extra": False}, {"none": True}, {"replace": {"minerals": -2}, "extra": True}], eng)
        check("engine: individualist swaps never apply to gestalt", eng["gestaltNoIndividualist"] is None, eng)
        check("engine: Technophant not applied, listed as blocked by an unmodelled origin", eng["technophantBlocked"] == [None, True], eng)

        # P11.1: scenario A/B comparison — pin A, build Commercial Zones (B), changed rows highlighted with B − A
        await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        await tab("planet")
        empty = await pg.inner_text("#planet-compare")
        check("compare: no scenario A -> hint, no table", "Pin the current planet as scenario A" in empty and await pg.evaluate("()=>!document.querySelector('#planet-compare .planet-compare-table')"), empty)
        await pg.evaluate("()=>document.querySelector('.planet-compare-pin').click()")
        same = await pg.evaluate("()=>[document.querySelector('.planet-compare-summary').innerText,document.querySelectorAll('.planet-compare-row.is-changed').length]")
        check("compare: right after pinning nothing changes", same == ["0 values change", 0], same)
        await pg.evaluate("()=>{document.querySelectorAll('#planet-catalog details').forEach(d=>d.open=true);[...document.querySelectorAll('#planet-catalog button')].find(b=>/Commercial Zones/.test(b.innerText)).click()}")
        cmp = await pg.evaluate("""()=>Object.fromEntries([...document.querySelectorAll('.planet-compare-row')].map(r=>[r.dataset.id,[r.className,[...r.querySelectorAll('td')].map(td=>td.innerText.trim())]]))""")
        tr, cg = cmp.get("trade"), cmp.get("consumer_goods")
        check("compare: trade changed and better (+, green)", tr is not None and "is-changed" in tr[0] and "is-better" in tr[0] and tr[1][3].startswith("+"), cmp)
        check("compare: consumer goods changed and worse (Merchants' upkeep)", cg is not None and "is-worse" in cg[0] and cg[1][3] == "−2", cmp)
        first = await pg.evaluate("()=>document.querySelector('.planet-compare-row').classList.contains('is-changed')")
        check("compare: changed rows listed first", first)
        await pg.evaluate("()=>document.querySelector('.planet-compare-clear').click()")
        check("compare: clearing A hides the table", await pg.evaluate("()=>!document.querySelector('#planet-compare .planet-compare-table')"))
        pure = await pg.evaluate("""async()=>{const m=await import('./js/scenario-compare.js');
            const a={resources:{energy:5,minerals:2},conditions:{stability:50,happiness:null,crime:10,freeHousing:1,pops:3}};
            const b={resources:{energy:5,minerals:-1,food:4},conditions:{stability:55,happiness:null,crime:12,freeHousing:1,pops:3}};
            return m.compareSnapshots(a,b).map(r=>[r.id,r.delta,r.changed,r.better])}""")
        check("compare engine: order by change size, crime increase is worse, unchanged/not applicable after",
              pure[:4] == [["stability", 5, True, True], ["food", 4, True, True], ["minerals", -3, True, False], ["crime", 2, True, False]]
              and ["happiness", None, False, None] in pure and ["energy", 0, False, None] in pure, pure)

        # P11.2: monthly stockpile timeline — start + net x months at 1/12/60/120, never below 0; no research/amenities/trade
        async def timeline():
            return await pg.evaluate("""()=>Object.fromEntries([...document.querySelectorAll('.planet-timeline-row')].map(r=>[r.dataset.id,[...r.querySelectorAll('td')].slice(2).map(td=>td.innerText.trim())]))""")
        tl = await timeline()
        heads = await pg.evaluate("()=>[...document.querySelectorAll('.planet-timeline-table th')].map(th=>th.innerText.trim())")
        check("timeline: columns 1 / 12 / 60 / 120 months", heads[3:7] == ["1 month", "12 months", "60 months", "120 months"], heads)
        check("timeline: no research, amenities or trade rows", not any(k in tl for k in ["physics", "society", "engineering", "amenities", "trade"]), tl)
        cg = tl.get("consumer_goods")
        check("timeline: consumer goods -2/month from 0 stays at 0", cg is not None and cg[0] == "−2" and cg[1:5] == ["0", "0", "0", "0"], tl)
        # P11.3: deficit flags
        check("flags: consumer goods from 0 -> deficit, stockpile empty", cg is not None and cg[5] == "deficit: stockpile empty", cg)
        alert = await pg.evaluate("()=>{const a=document.querySelector('.planet-timeline-alert');return a?a.innerText:''}")
        check("flags: alert names the resources in deficit", "Resources in deficit: Consumer goods (deficit: stockpile empty)" in alert and "not modelled" in alert, alert)
        await pg.evaluate("()=>{const i=document.querySelector('.planet-timeline-row[data-id=consumer_goods] .planet-timeline-start');i.value='100';i.dispatchEvent(new Event('change'))}")
        cg = (await timeline()).get("consumer_goods")
        check("timeline: start 100 -> 98 / 76 / 0 / 0", cg is not None and cg[1:5] == ["98", "76", "0", "0"], cg)
        check("flags: start 100 at -2/month runs out in 50 months", cg is not None and cg[5] == "deficit: runs out in 50 months", cg)
        marks = await pg.evaluate("()=>[...document.querySelectorAll('.planet-timeline-row[data-id=consumer_goods] .planet-timeline-value')].map(c=>c.classList.contains('is-exhausted'))")
        check("flags: 60 and 120 months marked as exhausted", marks == [False, False, True, True], marks)
        pos = await pg.evaluate("()=>[...document.querySelectorAll('.planet-timeline-row:not(.is-deficit) .planet-timeline-flag')].every(c=>c.innerText.trim()==='')")
        check("flags: resources without deficit have no flag", pos)
        proj = await pg.evaluate("async()=>{const m=await import('./js/stockpile-timeline.js');return [m.projectStockpile(10,2.5,12),m.projectStockpile(10,-1,12),m.timelineRows({energy:3,physics:5,trade:2},{}).map(r=>[r.id,r.values]),m.exhaustionMonth(24,-2),m.exhaustionMonth(25,-2),m.exhaustionMonth(0,-1),m.exhaustionMonth(5,0),m.exhaustionMonth(5,3)]}")
        check("timeline engine: linear projection floored at 0, research/trade left out", proj[:3] == [40, 0, [["energy", [3, 36, 180, 360]]]], proj)
        check("flags engine: runs out after ceil(start / -net) months, 0 = empty, null = no deficit", proj[3:] == [12, 13, 0, None, None], proj)

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

        # P17.6: i18n key parity (es/en/jp) and every "i" button: has its panel, toggles with Enter and Space, aria-expanded in sync
        parity = await pg.evaluate("""async()=>{const src=await (await fetch('js/i18n.js')).text();
            const url=URL.createObjectURL(new Blob([src.replace('const strings =','export const strings =')],{type:'text/javascript'}));
            const m=await import(url);const k=(l)=>new Set(Object.keys(m.strings[l]));const es=k('es'),en=k('en'),jp=k('jp');
            const diff=(a,b)=>[...a].filter(x=>!b.has(x));return {enNotEs:diff(en,es),esNotEn:diff(es,en),enNotJp:diff(en,jp),jpNotEn:diff(jp,en)}}""")
        check("i18n key parity es/en/jp", not any(parity.values()), parity)
        # P13.2: same value type/arity and no empty text per language, and every key used by data-i18n* / t('key') exists
        deep = await pg.evaluate("""async()=>{const get=async(f)=>(await fetch(f)).text();
            const src=await get('js/i18n.js');
            const url=URL.createObjectURL(new Blob([src.replace('const strings =','export const strings =')],{type:'text/javascript'}));
            const s=(await import(url)).strings;const bad=[];
            for(const l of ['es','jp'])for(const k of Object.keys(s.en)){const a=s.en[k],b=s[l][k];
                if(typeof a!==typeof b)bad.push('type '+l+' '+k);
                else if(typeof b==='string'&&!b.trim())bad.push('empty '+l+' '+k);
                else if(typeof a==='function'&&a.length!==b.length)bad.push('arity '+l+' '+k)}
            const files=['planet-sim.html','index.html','js/planet-sim.js','js/app.js','js/empire.js','js/edicts-ui.js','js/branch-offices-ui.js','js/info-panels.js','js/stockpile-timeline.js','js/planet-library-ui.js','js/planet-summary.js','js/scenario-compare.js','js/job-swaps.js'];
            for(const f of files){const r=await fetch(f);if(!r.ok)continue;const t=await r.text();
                for(const x of t.matchAll(/data-i18n(?:-[a-z]+)?="([\\w.]+)"/g))if(!(x[1] in s.en))bad.push('missing '+x[1]+' @'+f);
                for(const x of t.matchAll(/\\bt\\(\\s*["'`](\\w+)["'`]/g))if(!(x[1] in s.en))bad.push('missing '+x[1]+' @'+f)}
            return bad}""")
        check("i18n values: same type/arity, none empty, used keys exist", not deep, deep)
        # P13.8: data files keep i18n keys, never shown text; every key they name exists in es/en/jp
        datakeys = await pg.evaluate("""async()=>{const src=await (await fetch('js/i18n.js')).text();
            const url=URL.createObjectURL(new Blob([src.replace('const strings =','export const strings =')],{type:'text/javascript'}));
            const s=(await import(url)).strings;const bad=[];let n=0;
            const mods=['planet-modifier-data','body-type-data','job-swap-data'];
            const keyField=/^(i18nKey|sourceKey|notModelledKeys|infoOnlyKeys)$/;
            const walk=(v,path)=>{if(Array.isArray(v))v.forEach((x,i)=>walk(x,path+'['+i+']'));else if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){
                if(/^(name|source|notModelled|infoOnly)$/.test(k))bad.push('raw text field '+path+'.'+k);
                if(keyField.test(k))for(const key of [].concat(x)){n++;for(const l of ['es','en','jp'])if(typeof s[l][key]!=='string')bad.push('missing '+l+' '+key+' @'+path)}
                else walk(x,path+'.'+k)}};
            for(const f of mods){const m=await import('./js/'+f+'.js');for(const [k,v] of Object.entries(m))walk(v,f+':'+k)}
            const swaps=(await import('./js/job-swap-data.js')).JOB_SWAPS;
            for(const w of swaps){n++;const key='job'+w.id.split('_').map(p=>p[0].toUpperCase()+p.slice(1)).join('');if(!(key in s.en)||!(key in s.es)||!(key in s.jp))bad.push('missing swap name '+key)}
            return {n,bad}}""")
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
        await pg.click(".lang-btn[data-lang=en]")
        check("planet modifier notes still resolve in Spanish (English text until P15)", "Day Farm Construction" in ptxt_es and "planetModifier" not in ptxt_es, ptxt_es[:300])
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
        # P12.2: UI icons by in-game meaning (no loose first-pass placements left)
        icons = await pg.evaluate("()=>{const t=(k)=>document.querySelector(`.planet-main-tab[data-main-tab=${k}] img`)?.getAttribute('src')||'';const h=(k)=>document.querySelector(`[data-i18n=${k}]`)?.parentElement.querySelector('img')?.getAttribute('src')||'';return {all:[...document.querySelectorAll('img.ui-icon')].map(i=>i.getAttribute('src')),branches:t('branches'),empire:t('empire'),species:h('empireSpeciesHeading'),ethics:h('empireEthicsHeading'),jobs:h('planetSimSummaryHeading')}}")
        loose = [s for s in icons["all"] if any(n in s for n in ("Faction_support", "Colony_type_automated", "Focus_core", "Menu_icon_traditions", "Menu_icon_leaders", "Job_clerk"))]
        check("icons: no loose first-pass placements left", not loose, loose)
        check("icons: branch offices / empire / species / ethics / jobs by meaning", icons["branches"].endswith("modifiers/mod_branch_office_value_mult.png") and icons["empire"].endswith("modifiers/mod_cat_government.png") and icons["species"] == "img/ui/Icon_pop.png" and icons["ethics"].endswith("modifiers/mod_ethic_attraction_mult.png") and icons["jobs"] == "img/ui/Pop_job.png", icons)
        # P12.3: empire-level tabs (Imperio, Edicts) marked as saved with the empire profile
        marked = await pg.evaluate("()=>[...document.querySelectorAll('.planet-main-tab')].filter(b=>b.classList.contains('is-empire-saved')).map(b=>[b.dataset.mainTab,b.title,getComputedStyle(b,'::before').backgroundImage.includes('mod_cat_government'),getComputedStyle(b).boxShadow!=='none'])")
        check("empire tabs: only Imperio and Edicts, tooltip, empire icon background, accent line", marked == [["empire", "Saved with the empire profile", True, True], ["edicts", "Saved with the empire profile", True, True]], marked)
        # P13.1: mobile layout — no tab may scroll the page sideways on a 320px screen
        overflow_js = "()=>{const w=document.documentElement.clientWidth;return {sw:document.documentElement.scrollWidth,w,over:[...document.querySelectorAll('body *')].filter(e=>{const out=(x)=>{const r=x.getBoundingClientRect();return r.width&&r.right>w+1};return out(e)&&![...e.children].some(out)&&!e.closest('#planet-compare,#planet-timeline')}).slice(0,8).map(e=>e.tagName+'.'+e.className+'#'+e.id)}}"
        await pg.set_viewport_size({"width": 320, "height": 800})
        for name in ("library", "planet", "empire", "body", "edicts", "branches"):
            await tab(name)
            wide = await pg.evaluate(overflow_js)
            check("mobile 320px: " + name + " tab has no horizontal overflow", wide["sw"] <= wide["w"] and not wide["over"], wide)
            if name == "planet":  # the Districts catalog too (the Buildings one is the default)
                await pg.evaluate("()=>document.querySelector('#planet-tab-districts').click()")
                wide = await pg.evaluate(overflow_js)
                check("mobile 320px: districts catalog has no horizontal overflow", wide["sw"] <= wide["w"] and not wide["over"], wide)
                await pg.evaluate("()=>document.querySelector('#planet-tab-buildings').click()")
        await pg.set_viewport_size({"width": 1280, "height": 900})
        await tab("planet")
        check("no page errors", not errors, errors)
        # P13.9: landmark aria-labels of the other pages follow the selected language
        labels_js = "()=>[...document.querySelectorAll('[aria-label]')].filter(e=>!e.classList.contains('lang-btn')&&!e.closest('#bingo-grid > *')).map(e=>e.getAttribute('aria-label'))"
        spanish = ("Cabecera", "inicio", "Proyectos", "Selector", "Sistema", "Explorador", "Navegación", "Número", "Espacio", "Información", "Cerrar", "Casillas")
        other = await ctx.new_page()
        for page_name in ("index.html", "bingo.html", "privacy.html", "cookies.html", "404.html", "tech-tree.html"):
            await other.goto("file://" + ROOT + "/" + page_name)
            await other.wait_for_timeout(300)
            await other.click(".lang-btn[data-lang=en]")
            en_labels = await other.evaluate(labels_js)
            await other.click(".lang-btn[data-lang=es]")
            es_labels = await other.evaluate(labels_js)
            await other.click(".lang-btn[data-lang=en]")
            check("aria-labels translated: " + page_name, en_labels and not any(w in l for l in en_labels for w in spanish) and en_labels != es_labels and "Proyectos del archivo" in es_labels, (en_labels, es_labels))
        await other.close()
        # P22.1: wiki QA — navigation, hashes, search, easter eggs, block types, languages, images
        wiki = await ctx.new_page()
        wiki_errors, wiki_missing = [], []
        wiki.on("pageerror", lambda e: wiki_errors.append(str(e)))
        wiki.on("requestfailed", lambda r: r.url.startswith("file:") and wiki_missing.append(r.url))
        await wiki.goto("file://" + ROOT + "/index.html")
        await wiki.wait_for_timeout(400)
        await wiki.click(".lang-btn[data-lang=en]")
        title_js = "()=>document.querySelector('#reader-title')?.textContent||''"
        buttons_js = "()=>[...document.querySelectorAll('#index-empty .entry-button')].map(b=>b.textContent)"
        kb = await wiki.evaluate("async()=>(await import('./js/content.js')).knowledgeBase.map(e=>({slug:e.slug,hidden:!!e.hidden}))")
        listed = await wiki.evaluate(buttons_js)
        count = await wiki.evaluate("()=>document.querySelector('#entry-count').textContent")
        visible_n = len([e for e in kb if not e["hidden"]])
        check("wiki: index lists every non-hidden entry and the count matches", len(listed) == visible_n and count == str(visible_n).zfill(2), (len(listed), count, visible_n))
        await wiki.click("#index-empty .entry-button >> nth=1")
        await wiki.wait_for_timeout(100)
        first = (await wiki.evaluate("()=>[location.hash,document.querySelector('#reader-title').textContent]"))
        check("wiki: clicking an entry opens it and sets #/slug", first[0] == "#/" + await wiki.evaluate("()=>encodeURIComponent('diseño-flotas-mecnicas')") and "Mechanical Fleet Design" in first[1], first)
        await wiki.click("#index-empty .entry-button >> nth=2")
        await wiki.wait_for_timeout(100)
        await wiki.go_back()
        await wiki.wait_for_timeout(150)
        check("wiki: browser back returns to the previous entry", "Mechanical Fleet Design" in await wiki.evaluate(title_js), await wiki.evaluate(title_js))
        await wiki.evaluate("()=>{location.hash='#archivo'}")
        await wiki.wait_for_timeout(100)
        check("wiki: the skip link anchor (#archivo) keeps the open entry", "Mechanical Fleet Design" in await wiki.evaluate(title_js), await wiki.evaluate(title_js))
        await wiki.evaluate("()=>{location.hash='#/no-such-entry'}")
        await wiki.wait_for_timeout(100)
        check("wiki: an unknown #/slug shows the empty reader", await wiki.evaluate("()=>!!document.querySelector('#reader-body .empty-state')"))
        await wiki.goto("file://" + ROOT + "/index.html#/MUGANI")
        await wiki.wait_for_timeout(300)
        check("wiki: a hidden entry opens from its URL", "MUGANI?" in await wiki.evaluate(title_js), await wiki.evaluate(title_js))

        async def search(q):
            await wiki.fill("#knowledge-search", q)
            await wiki.wait_for_timeout(80)
            return await wiki.evaluate(buttons_js)
        eggs = ("Wishlist", "Lista de deseos", "MUGANI", "Singularity", "特異点")
        short = [b for q in ("a", "s", "3", "mu") for b in await search(q) if any(x in b for x in eggs)]
        check("wiki: one/two-letter searches reveal no easter egg", not short, short)
        found = [await search("mugan"), await search("wishlist"), await search("clase 30")]
        check("wiki: easter eggs found by (partial) trigger", any("MUGANI" in b for b in found[0]) and any("Lista de deseos" in b for b in found[1]) and any("Singularity" in b for b in found[2]), found)
        await wiki.click(".lang-btn[data-lang=jp]")
        jp_egg = await search("特異点")
        await wiki.click(".lang-btn[data-lang=en]")
        check("wiki: a trigger of a translation (JP 特異点) reveals its entry", any("特異点" in b for b in jp_egg), jp_egg)
        await search("")
        await wiki.goto("file://" + ROOT + "/index.html#/" + "enlaces-utiles")
        await wiki.wait_for_timeout(300)
        bad_markup_js = "()=>[...document.querySelectorAll('#reader-body [href],#reader-body [style]')].filter(e=>/[<>]|mark|hl-/.test((e.getAttribute('href')||'')+(e.getAttribute('style')||''))).map(e=>e.outerHTML.slice(0,120))"
        for lang in ("es", "en", "jp"):
            await wiki.click(".lang-btn[data-lang=" + lang + "]")
            for q in ("https", "stellaris", "color", "amp"):
                await search(q)
                bad = await wiki.evaluate(bad_markup_js)
                hrefs = await wiki.evaluate("()=>[...document.querySelectorAll('#reader-body a')].map(a=>a.getAttribute('href')).filter(h=>!/^https:\\/\\/[^\\s<>\\[\\]]+$/.test(h))")
                check("wiki links (" + lang + ", search " + q + "): hrefs are clean URLs, no markup inside attributes", not bad and not hrefs, (bad, hrefs))
        await wiki.click(".lang-btn[data-lang=es]")
        await wiki.goto("file://" + ROOT + "/index.html#/" + "diseño-flotas-biologicas")
        await wiki.wait_for_timeout(300)
        await search("dano")
        marks = await wiki.evaluate("()=>[...document.querySelectorAll('#reader-body mark.hl-marker')].map(m=>m.textContent.toLowerCase())")
        check("wiki: search marker ignores accents (dano marks daño)", "daño" in marks, marks[:5])
        await search("")
        # every entry in every language: block types rendered, no raw markdown, no "undefined"
        seen, raw = set(), []
        for lang in ("es", "en", "jp"):
            await wiki.click(".lang-btn[data-lang=" + lang + "]")
            check("wiki: <html lang> follows the language (" + lang + ")", await wiki.evaluate("()=>document.documentElement.lang") == HTML_LANG[lang])
            for e in kb:
                await wiki.evaluate("(s)=>{location.hash='#/'+encodeURIComponent(s)}", e["slug"])
                await wiki.wait_for_timeout(40)
                r = await wiki.evaluate("""()=>{const b=document.querySelector('#reader-body');const sel={heading:'h3.entry-heading,h4,h5',list:'ul.entry-list',links:'ul.entry-links',image:'figure.entry-image',columns:'.entry-columns',note:'.entry-note',quote:'blockquote.entry-quote',divider:'hr',paragraph:'.entry-content > p'};
                    return {types:Object.entries(sel).filter(([k,s])=>b.querySelector(s)).map(([k])=>k),title:document.querySelector('#reader-title').textContent,text:b.innerText}}""")
                seen.update(r["types"])
                if "undefined" in r["text"] or "**" in r["text"] or "](" in r["text"] or not r["title"].strip():
                    raw.append(lang + "/" + e["slug"])
        check("wiki: every block type of content.js renders", seen >= {"heading", "list", "links", "image", "columns", "note", "quote", "divider", "paragraph"}, seen)
        check("wiki: no raw markdown, 'undefined' or empty titles in any entry/language", not raw, raw)
        local_imgs = await wiki.evaluate("""async()=>{const kb=(await import('./js/content.js')).knowledgeBase;const s=new Set();
            const walk=(bl)=>(bl||[]).forEach(x=>{if(x.src)s.add(x.src);if(x.portrait)s.add(x.portrait);if(x.columns)x.columns.forEach(walk)});
            kb.forEach(e=>{walk(e.blocks);Object.values(e.i18n||{}).forEach(t=>walk(t.blocks))});
            const missing=[];for(const src of s){if(/^https?:/.test(src))continue;try{const r=await fetch(src);if(!r.ok)missing.push(src)}catch(err){missing.push(src)}}return {n:s.size,missing}}""")
        known_missing = {"img/naves/Base estelar artillada.png", "img/naves/Base estelar portahangares.png"}  # T2210: screenshots pending
        check("wiki: every local image of content.js exists (except the pending T2210 ones)", local_imgs["n"] > 100 and set(local_imgs["missing"]) <= known_missing, local_imgs)
        await wiki.click(".lang-btn[data-lang=en]")
        await wiki.evaluate("()=>{location.hash='#/'+encodeURIComponent('diseño-naves-mecnicas')}")
        await wiki.wait_for_timeout(100)
        notice = await wiki.evaluate("()=>{const i=document.querySelector('#reader-body figure.entry-image img');const alt=i.alt,f=i.closest('figure');i.dispatchEvent(new Event('error'));const p=f.querySelector('.entry-image-missing');return [alt,p&&!f.querySelector('img')&&p.textContent]}")
        check("wiki: a missing image shows a notice with its alt text", notice[1] and notice[0] in notice[1] and "Image not available" in notice[1], notice)
        mug = await wiki.evaluate("async()=>{location.hash='#/MUGANI';await new Promise(r=>setTimeout(r,60));return !!document.querySelector('#reader-body .entry-quote-portrait')}")
        check("wiki: translated quotes keep their portrait", mug)
        check("wiki: no page errors", not wiki_errors, wiki_errors)
        check("wiki: no local resource failed to load", not [u for u in wiki_missing if "Base%20estelar" not in u], wiki_missing)
        await wiki.close()
        # P22.2: bingo QA — both bingos, marking, languages, missing icons, PNG download
        bingo = await ctx.new_page()
        bingo_errors, bingo_missing = [], []
        bingo.on("pageerror", lambda e: bingo_errors.append(str(e)))
        bingo.on("requestfailed", lambda r: r.url.startswith("file:") and bingo_missing.append(r.url))
        icon_png = open(os.path.join(ROOT, "img", "ui", "Icon_pop.png"), "rb").read()

        async def fake_assets(route):  # remote icons served with CORS (like GitHub Pages); one of them missing
            if route.request.url.endswith("GFX_origin_default.png"):
                await route.fulfill(status=404, body="")
            else:
                await route.fulfill(status=200, body=icon_png, headers={"Content-Type": "image/png", "Access-Control-Allow-Origin": "*"})
        await bingo.route("https://morteux.github.io/**", fake_assets)
        await bingo.goto("file://" + ROOT + "/bingo.html")
        await bingo.wait_for_timeout(400)
        await bingo.click(".lang-btn[data-lang=en]")
        sizes = await bingo.evaluate("async()=>{const m=await import('./js/bingo-data.js');return [m.ORIGIN_BINGO.length,m.PRINCIPLE_BINGO.length,m.ORIGIN_BINGO.map(e=>e.i18nKey).concat(m.PRINCIPLE_BINGO.map(e=>e.i18nKey))]}")
        cards_js = "()=>[...document.querySelectorAll('#bingo-grid .bingo-card')].map(c=>[c.getAttribute('aria-label'),c.getAttribute('aria-pressed'),c.classList.contains('is-marked'),c.querySelector('img').crossOrigin])"
        origins = await bingo.evaluate(cards_js)
        check("bingo: origins grid has one card per origin, named, CORS icons", len(origins) == sizes[0] and all(c[0] and c[0] not in sizes[2] and c[3] == "anonymous" for c in origins), (len(origins), origins[:3]))
        await bingo.click("#bingo-grid .bingo-card >> nth=1")
        await bingo.click("#bingo-grid .bingo-card >> nth=3")
        await bingo.click("#bingo-grid .bingo-card >> nth=3")
        marked = [i for i, c in enumerate(await bingo.evaluate(cards_js)) if c[2]]
        check("bingo: clicking marks a card, clicking again unmarks it (aria-pressed follows)", marked == [1] and (await bingo.evaluate(cards_js))[1][1] == "true", marked)
        await bingo.select_option("#bingo-type", "principles")
        principles = await bingo.evaluate(cards_js)
        check("bingo: principles grid has one card per principle, named", len(principles) == sizes[1] and all(c[0] and c[0] not in sizes[2] for c in principles) and not any(c[2] for c in principles), len(principles))
        await bingo.click("#bingo-grid .bingo-card >> nth=0")
        await bingo.select_option("#bingo-type", "origins")
        await bingo.click(".lang-btn[data-lang=jp]")
        jp_cards = await bingo.evaluate(cards_js)
        check("bingo: marks survive type and language switches", [i for i, c in enumerate(jp_cards) if c[2]] == [1] and jp_cards[1][1] == "true", [i for i, c in enumerate(jp_cards) if c[2]])
        check("bingo: names and <html lang> follow the language", await bingo.evaluate("()=>document.documentElement.lang") == "ja" and jp_cards[1][0] != origins[1][0] and await bingo.evaluate("()=>document.querySelector('#bingo-download').textContent") == "画像としてダウンロード", (jp_cards[1][0], origins[1][0]))
        await bingo.click(".lang-btn[data-lang=en]")
        await bingo.wait_for_timeout(300)
        missing_icon = await bingo.evaluate("()=>[...document.querySelectorAll('#bingo-grid .bingo-card.is-image-missing')].map(c=>c.getAttribute('aria-label'))")
        check("bingo: a missing icon is flagged on its card (only that one)", len(missing_icon) == 1, missing_icon)
        for kind in ("origins", "principles"):
            await bingo.select_option("#bingo-type", kind)
            async with bingo.expect_download() as dl_info:
                await bingo.click("#bingo-download")
            dl = await dl_info.value
            path = os.path.join(tempfile.gettempdir(), dl.suggested_filename)
            await dl.save_as(path)
            head = open(path, "rb").read(24)
            width, height = int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")
            status = await bingo.evaluate("()=>document.querySelector('#bingo-download-status').textContent")
            check("bingo: PNG download of " + kind + " (valid PNG, 9 columns, no error)", head[:8] == b"\x89PNG\r\n\x1a\n" and width == (24 * 2 + 9 * 150) * 2 and height > 0 and not status and dl.suggested_filename == "bingo-" + ("origenes" if kind == "origins" else "principios") + "-stellaris.png", (dl.suggested_filename, width, height, status))
            os.remove(path)
        await bingo.reload()
        await bingo.wait_for_timeout(300)
        check("bingo: after a reload the grid matches the selected type", len(await bingo.evaluate(cards_js)) == (sizes[1] if await bingo.evaluate("()=>document.querySelector('#bingo-type').value") == "principles" else sizes[0]))
        check("bingo: no page errors", not bingo_errors, bingo_errors)
        check("bingo: no local resource failed to load", not bingo_missing, bingo_missing)
        await bingo.close()
        # P22.3: legal pages, 404 and tech tree placeholder — links, languages, ads off, Vercel 404
        simple = await ctx.new_page()
        simple_errors, simple_missing, ad_requests = [], [], []
        simple.on("pageerror", lambda e: simple_errors.append(str(e)))
        simple.on("requestfailed", lambda r: r.url.startswith(("file:", "http://127.")) and simple_missing.append(r.url))
        simple.on("response", lambda r: r.status >= 400 and r.request.resource_type != "document" and r.url.startswith(("file:", "http://127.")) and simple_missing.append(r.url))
        simple.on("request", lambda r: any(h in r.url for h in ("googlesyndication", "doubleclick", "adservice", "googletagmanager")) and ad_requests.append(r.url))
        pages_texts = {}
        for page_name in ("privacy.html", "cookies.html", "404.html", "tech-tree.html"):
            await simple.goto("file://" + ROOT + "/" + page_name)
            await simple.wait_for_timeout(200)
            local_links = await simple.evaluate("()=>[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>!/^(https?:|mailto:|#)/.test(h))")
            broken = [h for h in local_links if h not in ("./", "/") and not os.path.isfile(os.path.join(ROOT, h.split("#")[0]))]
            check("simple pages: " + page_name + " local links point to existing pages", local_links and not broken, (local_links, broken))
            for lang in ("en", "jp", "es"):
                await simple.click(".lang-btn[data-lang=" + lang + "]")
                pages_texts[(page_name, lang)] = await simple.evaluate("()=>[document.documentElement.lang,document.title,document.querySelector('h1').textContent,document.querySelector('meta[name=description]')?.content||'',document.body.innerText]")
            en, jp, es = (pages_texts[(page_name, l)] for l in ("en", "jp", "es"))
            raw_keys = [x for x in (en, jp, es) if "undefined" in x[4] or "undefined" in x[1]]
            check("simple pages: " + page_name + " title, heading and text follow es/en/jp", [en[0], jp[0], es[0]] == ["en", "ja", "es"] and en[4] != es[4] and jp[4] != es[4] and not raw_keys and (page_name == "404.html" or (en[3] and en[3] != jp[3])), [en[:4], jp[:4], es[:4]])
        await simple.goto("file://" + ROOT + "/privacy.html")
        await simple.click(".lang-btn[data-lang=en]")
        await simple.goto("file://" + ROOT + "/cookies.html")
        await simple.wait_for_timeout(150)
        check("simple pages: the language chosen on one page is kept on the next", await simple.evaluate("()=>document.documentElement.lang") == "en")
        await simple.goto("file://" + ROOT + "/index.html")
        await simple.wait_for_timeout(300)
        ads = await simple.evaluate("async()=>{const c=(await import('./js/ads-config.js')).adsConfig;return [c.enabled,c.publisherId,[...document.querySelectorAll('[data-ad-slot]')].map(s=>s.hidden),document.querySelectorAll('ins.adsbygoogle,script[src*=googlesyndication]').length]}")
        check("ads: disabled in js/ads-config.js, slots hidden, no ad script or request", ads[0] is False and ads[1] == "" and ads[2] and all(ads[2]) and ads[3] == 0 and not ad_requests, (ads, ad_requests))
        consent = await simple.evaluate("async()=>(await (await fetch('js/ads.js')).text()).match(/function hasAdConsent\\(\\)\\s*\\{\\s*return (\\w+)/)?.[1]")
        check("ads: no consent without a CMP (hasAdConsent returns false)", consent == "false", consent)
        vercel = json.load(open(os.path.join(ROOT, "vercel.json"), encoding="utf-8"))
        check("vercel.json: clean URLs and no rewrite/route that would hide the 404 page", vercel.get("cleanUrls") is True and not vercel.get("rewrites") and not vercel.get("routes") and os.path.isfile(os.path.join(ROOT, "404.html")), vercel)
        # Vercel serves 404.html (keeping the URL) for any missing path: emulate it over http
        import http.server, threading, functools

        class Vercel404(http.server.SimpleHTTPRequestHandler):
            def send_error(self, code, message=None, explain=None):
                if code != 404:
                    return super().send_error(code, message, explain)
                body = open(os.path.join(ROOT, "404.html"), "rb").read()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *args):
                pass
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Vercel404, directory=ROOT))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base_url = "http://127.0.0.1:%d" % server.server_address[1]
        for path in ("/missing-page", "/a/b/c/missing"):
            simple_missing.clear()
            resp = await simple.goto(base_url + path)
            await simple.wait_for_timeout(300)
            await simple.click(".lang-btn[data-lang=en]")
            nf = await simple.evaluate("()=>[document.querySelector('h1').textContent,[...document.styleSheets].reduce((n,x)=>n+x.cssRules.length,0),[...document.querySelectorAll('a[href]')].map(a=>a.href)]")
            check("404 at " + path + ": status 404, styled, translated, links from the site root", resp.status == 404 and nf[0] != "Registro no encontrado." and nf[1] > 50 and all(h.startswith(base_url + "/") and "/a/b" not in h for h in nf[2]) and not simple_missing, (resp.status, nf, simple_missing))
        server.shutdown()
        check("simple pages: no page errors", not simple_errors, simple_errors)
        check("simple pages: no local resource failed to load", not simple_missing, simple_missing)
        await simple.close()
        # P22.4: every page in es/en/jp — no page/console errors, no local resource that fails to load
        site_pages = ("index.html", "bingo.html", "planet-sim.html", "tech-tree.html", "privacy.html", "cookies.html", "404.html")
        for lang in ("es", "en", "jp"):
            lctx = await browser.new_context(locale={"es": "es-ES", "en": "en-US", "jp": "ja-JP"}[lang])
            if os.environ.get("BLOCK_REMOTE"): await lctx.route("https://**/*", lambda r: r.abort())
            await lctx.add_init_script("localStorage.setItem('codex-ignis-lang', %s)" % json.dumps(lang))
            for page_name in site_pages:
                lpg = await lctx.new_page()  # one page each, so listeners do not pile up
                problems = []
                lpg.on("pageerror", lambda e, p=problems: p.append("pageerror: " + str(e)))
                # remote assets (blocked with BLOCK_REMOTE, or offline) are not local failures
                lpg.on("console", lambda m, p=problems: m.type == "error" and not (m.location or {}).get("url", "").startswith("https:") and not ("Failed to load resource" in m.text and "https:" in m.text) and p.append("console: " + m.text))
                lpg.on("requestfailed", lambda r, p=problems: r.url.startswith("file:") and p.append("missing: " + r.url))
                await lpg.goto("file://" + ROOT + "/" + page_name)
                await lpg.wait_for_timeout(500)
                await lpg.evaluate("async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,20))}scrollTo(0,0)}")  # lazy images too
                await lpg.wait_for_timeout(200)
                state = await lpg.evaluate("()=>[document.documentElement.lang,/\\bundefined\\b|\\[object /.test(document.body.innerText)]")
                check("all pages (" + lang + "): " + page_name + " loads with <html lang>, no errors, no missing local files", state == [HTML_LANG[lang], False] and not problems, (state, problems[:5]))
                await lpg.close()
            await lctx.close()
        # P22.5: mobile layout of the other pages at 320 and 375 px — no sideways scroll, usable controls
        mobile_js = """()=>{const w=document.documentElement.clientWidth;const out=(x)=>{const r=x.getBoundingClientRect();return r.width&&r.right>w+1};
            const over=[...document.querySelectorAll('body *')].filter(e=>out(e)&&![...e.children].some(out)&&!e.closest('.entry-columns figure,.lightbox')).slice(0,6).map(e=>e.tagName+'.'+e.className+' '+(e.textContent||'').trim().slice(0,30));
            const small=[...document.querySelectorAll('a,button,input,select')].filter(e=>{const r=e.getBoundingClientRect();const img=e.querySelector('img');return r.width&&r.height&&(r.height<24||r.width<24)&&!(img&&!img.naturalWidth)&&!e.closest('.reader-body p,.reader-body li,.legal-content p,.intro-copy,.skip-link')}).slice(0,6).map(e=>e.tagName+' '+(e.textContent||e.id).trim().slice(0,20)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height));
            return {sw:document.documentElement.scrollWidth,w,over,small}}"""
        mctx = await browser.new_context(locale="en-US", viewport={"width": 320, "height": 700}, has_touch=True, is_mobile=True)
        if os.environ.get("BLOCK_REMOTE"): await mctx.route("https://**/*", lambda r: r.abort())
        mpg = await mctx.new_page()
        for width in (320, 375):
            await mpg.set_viewport_size({"width": width, "height": 700})
            for lang in ("es", "en", "jp"):
                for page_name, setup in (("index.html", None), ("index.html#/" + "diseño-naves-mecnicas", None), ("index.html#/enlaces-utiles", None), ("index.html#/singularidad-clase-30", None),
                                         ("bingo.html", None), ("bingo.html", "principles"), ("privacy.html", None), ("cookies.html", None), ("404.html", None), ("tech-tree.html", None)):
                    await mpg.goto("file://" + ROOT + "/" + page_name)
                    await mpg.wait_for_timeout(250)
                    await mpg.click(".lang-btn[data-lang=" + lang + "]")
                    if setup:
                        await mpg.select_option("#bingo-type", setup)
                    await mpg.wait_for_timeout(100)
                    m = await mpg.evaluate(mobile_js)
                    check("mobile %dpx (%s): %s%s has no horizontal overflow and no tiny controls" % (width, lang, page_name, " " + setup if setup else ""), m["sw"] <= m["w"] and not m["over"] and not m["small"], m)
        await mpg.goto("file://" + ROOT + "/index.html")
        await mpg.wait_for_timeout(250)
        await mpg.tap("#index-empty .entry-button >> nth=5")
        await mpg.wait_for_timeout(300)
        top = await mpg.evaluate("()=>[document.querySelector('#reader-body').getBoundingClientRect().top,innerHeight,scrollY]")
        check("mobile: choosing an entry scrolls the article into view", 0 <= top[0] < top[1] / 2 and top[2] > 0, top)
        await mctx.close()
        # P22.6: accessibility of the other pages — landmarks, alt texts, keyboard focus, contrast, lightbox
        a11y = await ctx.new_page()
        structure_js = """()=>{const main=document.querySelectorAll('main');const bad=[];
            if(main.length!==1)bad.push('main x'+main.length);
            document.querySelectorAll('header,footer').forEach(e=>{if(e.closest('main,article,section,aside,nav'))bad.push(e.tagName+' inside '+e.parentElement.closest('main,article,section,aside,nav').tagName)});
            if(!document.querySelector('body > * header, body > header'))bad.push('no header');
            document.querySelectorAll('[aria-label]').forEach(e=>{if(/^(DIV|SPAN|P)$/.test(e.tagName)&&!e.getAttribute('role'))bad.push('aria-label on generic '+e.tagName+'#'+e.id+'.'+e.className)});
            document.querySelectorAll('img').forEach(i=>{if(!i.hasAttribute('alt'))bad.push('img without alt '+i.getAttribute('src'))});
            document.querySelectorAll('button,a[href]').forEach(b=>{if(b.offsetParent&&!(b.getAttribute('aria-label')||b.innerText.trim()||[...b.querySelectorAll('img')].some(i=>i.alt)))bad.push('unnamed '+b.tagName+'.'+b.className)});
            return bad}"""
        contrast_js = """()=>{const lum=(c)=>{const m=c.match(/[\\d.]+/g).map(Number);const f=(v)=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return [.2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]),m[3]===undefined?1:m[3]]};
            const bgOf=(e)=>{for(let x=e;x;x=x.parentElement){const b=getComputedStyle(x).backgroundColor;const a=b.match(/[\\d.]+/g).map(Number);if(a.length<4||a[3]>.5)return b}return 'rgb(7,17,12)'};
            const ratio=(a,b)=>{const x=lum(a)[0],y=lum(b)[0];return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};const out=[];
            const els=[...document.querySelectorAll('body *')].filter(e=>e.offsetParent&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&!e.closest('.hl-word,[aria-hidden=true]'));
            for(const e of els){const s=getComputedStyle(e);const big=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&+s.fontWeight>=700);const r=ratio(s.color,bgOf(e));if(r<(big?3:4.5))out.push(e.tagName+'.'+e.className+' '+e.textContent.trim().slice(0,20)+' '+r.toFixed(2))}
            const inp=document.querySelector('input[placeholder]');if(inp){const r=ratio(getComputedStyle(inp,'::placeholder').color,bgOf(inp));if(r<4.5)out.push('placeholder '+r.toFixed(2))}
            return [...new Set(out)].slice(0,10)}"""
        focus_js = """()=>{const e=document.activeElement;if(!e||e===document.body)return null;const s=getComputedStyle(e);const r=e.getBoundingClientRect();
            const ring=(x)=>{const t=getComputedStyle(x);return (t.outlineStyle!=='none'&&parseFloat(t.outlineWidth)>=1)||t.boxShadow!=='none'};
            return [e.tagName+'.'+e.className+' '+(e.textContent||e.id).trim().slice(0,16),ring(e)||(e.closest('.search-control')&&ring(e.closest('.search-control'))),r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight+2000]}"""
        for page_name in ("index.html#/MUGANI", "bingo.html", "privacy.html", "cookies.html", "404.html", "tech-tree.html"):
            await a11y.goto("file://" + ROOT + "/" + page_name)
            await a11y.wait_for_timeout(300)
            await a11y.click(".lang-btn[data-lang=en]")
            await a11y.evaluate("()=>document.activeElement.blur()")
            bad = await a11y.evaluate(structure_js)
            check("a11y: " + page_name + " one <main>, banner/footer outside it, named controls, alt on every image", not bad, bad)
            low = await a11y.evaluate(contrast_js)
            check("a11y: " + page_name + " text contrast >= 4.5:1 (3:1 large)", not low, low)
            no_ring, seen_focus = [], []
            await a11y.evaluate("()=>{document.activeElement&&document.activeElement.blur();window.scrollTo(0,0)}")
            for _ in range(40 if "bingo" not in page_name else 12):
                await a11y.keyboard.press("Tab")
                f = await a11y.evaluate(focus_js)
                if not f:
                    continue
                seen_focus.append(f[0])
                if not (f[1] and f[2]):
                    no_ring.append(f)
            check("a11y: " + page_name + " every Tab stop shows a visible focus ring", seen_focus and not no_ring, (no_ring[:5], seen_focus[:5]))
        await a11y.goto("file://" + ROOT + "/index.html#/MUGANI")
        await a11y.wait_for_timeout(300)
        await a11y.focus("#reader-body .entry-quote-zoom")
        await a11y.keyboard.press("Enter")
        lb = await a11y.evaluate("()=>[!document.querySelector('#image-lightbox').hidden,document.activeElement.id,document.querySelector('#image-lightbox').getAttribute('role'),document.querySelector('#image-lightbox').getAttribute('aria-modal')]")
        await a11y.keyboard.press("Tab")
        trapped = await a11y.evaluate("()=>document.activeElement.id")
        await a11y.keyboard.press("Escape")
        back = await a11y.evaluate("()=>[document.querySelector('#image-lightbox').hidden,document.activeElement.className]")
        check("a11y: wiki image zoom opens with Enter, focus on close, Tab stays, Escape returns focus", lb == [True, "lightbox-close", "dialog", "true"] and trapped == "lightbox-close" and back == [True, "entry-quote-zoom"], (lb, trapped, back))
        jp_lang = await a11y.evaluate("async()=>{const m=await import('./js/i18n.js');return m.htmlLangCode('jp')+','+m.htmlLangCode('es')}")
        check("a11y: <html lang> uses the BCP 47 tag ja for Japanese", jp_lang == "ja,es", jp_lang)
        await a11y.close()
        jctx = await browser.new_context(locale="ja-JP")
        jpg = await jctx.new_page()
        await jpg.goto("file://" + ROOT + "/privacy.html")
        await jpg.wait_for_timeout(200)
        check("i18n: a Japanese browser (ja-JP) opens the site in JP", await jpg.evaluate("()=>document.documentElement.lang") == "ja")
        await jctx.close()
        await browser.close()

asyncio.run(main())
print("\nFAILED: " + ", ".join(failures) if failures else "\nAll passed")
sys.exit(1 if failures else 0)
