"""Planet simulator: deposit features, strategic deposits, blockers, planet modifiers, civic and building requirements (P10.8, P10.10)."""
from smoke.common import check, approx


async def run(t):
    pg, tab, net, ethic, body, civic_toggle = t.pg, t.tab, t.net, t.ethic, t.body, t.civic_toggle
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
          r.unmodelledRequirements(b('stronghold')).map(x=>x.i18nKey),(b('stronghold').requires||[]).filter(x=>x.type==='notOrigin').map(x=>x.ids.join())]}""")
    check("Experimentation Chambers: needs Experimental Sentencing, not Materialist", breq[0] is False and breq[1] is True, breq)
    check("Uplink Node: not with Rogue Servitor", breq[2] is False and breq[3] is True, breq)
    check("Stronghold: not Wilderness origin, now modelled (P10.6)", breq[4] == [] and breq[5] == ["wilderness"], breq)
