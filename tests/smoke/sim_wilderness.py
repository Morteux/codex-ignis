"""Planet simulator: Wilderness origin (P10.6): origin card, Mutualistic Intelligence, districts, specializations, capitals, symbiont swaps."""
from smoke.common import check


async def run(t):
    pg, tab, ethic, body = t.pg, t.tab, t.ethic, t.body
    await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
    await tab("empire")
    card = "#empire-origin-list [data-origin-id=wilderness]"
    locked = await pg.evaluate(f"()=>{{const c=document.querySelector('{card}');return [c.disabled,c.innerText]}}")
    check("Wilderness origin: locked without the Hive Mind authority", locked[0] is True and "Requires the authority: Hive Mind" in locked[1], locked)
    await ethic("Gestalt Consciousness")
    await pg.evaluate("()=>document.querySelector('#empire-authority-list [data-authority-id=hiveMind]').click()")
    # civic_hive_catalytic_processing is named Organic Reprocessing in the game files
    await pg.evaluate("()=>[...document.querySelectorAll('#empire-civics-list button')].find(b=>b.innerText.trim()==='Organic Reprocessing').click()")
    blocked = await pg.evaluate(f"()=>{{const c=document.querySelector('{card}');return [c.disabled,c.innerText]}}")
    check("Wilderness origin: blocked by Organic Reprocessing", blocked[0] is True and "Blocked by: Organic Reprocessing" in blocked[1], blocked)
    await pg.evaluate("()=>[...document.querySelectorAll('#empire-civics-list button')].find(b=>b.innerText.trim()==='Organic Reprocessing').click()")
    await pg.evaluate(f"()=>document.querySelector('{card}').click()")
    auth = await pg.evaluate("()=>document.querySelector('#empire-authority-list [data-authority-id=hiveMind]').innerText")
    check("Hive Mind + Wilderness shows the Mutualistic Intelligence and its effects", "Mutualistic Intelligence" in auth and "+200% Empire size from districts" in auth, auth)
    civics = await pg.evaluate("()=>[...document.querySelectorAll('#empire-civics-list button')].map(b=>b.innerText.trim())")
    check("Wilderness: excluded civics are not offered", "Organic Reprocessing" not in civics and any(c.startswith("Devouring Swarm") for c in civics), civics[:5])

    await tab("planet")
    await pg.click("#planet-tab-districts")
    names = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card-header span')].map(e=>e.innerText)")
    check("Wilderness district cards", names[0].startswith("Communal Biome") and names[1:] == ["Photosynthesis Field", "Hollow Mountain", "Orchard Forest"], names)
    cost = await pg.evaluate("()=>document.querySelectorAll('.planet-district-card-header')[2].title")
    check("Hollow Mountain cost with Biomass", cost == "Cost: 300 Minerals, 50 Biomass", cost)
    opts = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card')[1].querySelectorAll('option')].map(o=>o.value)")
    check("Photosynthesis Field: Solar Mycolungs, no Energy Generation", "solarMycolungs" in opts and "energyGeneration" not in opts, opts)
    urban = await pg.evaluate("async()=>(await import('./js/planet-sim-rules.js')).primaryDistrictDef().specializationOptions.map(o=>o.id)")
    check("Communal Biome specializations", urban == ["heartgrove", "moltgut", "thinkstem", "singingCliffs", "harmonicCore", "threadway", "commandBulb"], urban)
    cap = await pg.evaluate("()=>document.querySelector('#planet-capital-name').innerText")
    check("Wilderness capital tier I: Planetary Tendrils", "Planetary Tendrils" in cap, cap)
    await pg.evaluate("()=>document.querySelector('#planet-capital-upgrade').click()")
    cap = await pg.evaluate("()=>[document.querySelector('#planet-capital-name').innerText,document.querySelector('#planet-capital-name').title]")
    check("Wilderness capital tier II: Planetary Root Bundle, food and Biomass cost", "Planetary Root Bundle" in cap[0] and "400 Food, 100 Biomass" in cap[1], cap)
    await pg.evaluate("""()=>{const c=document.querySelectorAll('.planet-district-card')[1];[...c.querySelectorAll('.planet-count-btn')].find(b=>b.textContent==='+').click()}""")
    await pg.evaluate("""()=>{const c=document.querySelectorAll('.planet-district-card')[1];const s=c.querySelector('select');s.value='solarMycolungs';s.dispatchEvent(new Event('change'))}""")
    jobs = await pg.inner_text("body")
    check("Photosynthesis Field + Solar Mycolungs: Technicians become Photosymbionts", "Photosymbiont" in jobs and "Replaces Technician" in jobs, "")
    housing = await pg.evaluate("()=>document.querySelector('#planet-stat-housing').closest('.planet-header-stat').title")
    check("housing: Communal Biome +100, Photosynthesis Field +100", "Communal Biome ×2 +2" in housing and "Photosynthesis Field ×1 +1" in housing, housing)
    req = await pg.evaluate("""async()=>{const r=await import('./js/building-requirements.js');const d=await import('./js/planet-data.js');
        const b=(id)=>d.BUILDINGS.find(x=>x.id===id);const w={ethicIds:['gestaltConsciousness'],authorityId:'hiveMind',originId:'wilderness',civicIds:[]};
        return [r.buildingRequirementsMet(b('alloy_foundries'),w),r.buildingRequirementsMet(b('alloy_foundries'),{...w,originId:null}),r.buildingRequirementsMet(b('synaptic_nodes'),w)]}""")
    check("Wilderness: buildings the game forbids (Alloy Foundries, Synaptic Nodes) are unavailable", req == [False, True, False], req)
    des = dict(await pg.evaluate("()=>[...document.querySelectorAll('#planet-designation-select option')].map(o=>[o.value,o.disabled])"))
    check("Wilderness designations available, not-Wilderness ones locked", des.get("photosynthesisWorld") is False and des.get("nestWorld") is True, des)

    await tab("empire")
    await pg.evaluate(f"()=>document.querySelector('{card}').click()")
    await tab("planet")
    names = await pg.evaluate("()=>[...document.querySelectorAll('.planet-district-card-header span')].map(e=>e.innerText)")
    cap = await pg.evaluate("()=>document.querySelector('#planet-capital-name').innerText")
    notice = await pg.evaluate("()=>document.querySelector('#planet-sim-notice')?.innerText||''")
    check("origin removed: regular districts and Hive capital back, Solar Mycolungs reset", names[1] == "Generator district" and "Hive Core" in cap and "Solar Mycolungs" in notice, (names, cap, notice))
    await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
