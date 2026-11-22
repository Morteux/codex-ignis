"""Planet simulator: Branch offices tab and job swaps (P19, P21)."""
from smoke.common import check


async def run(t):
    pg, tab, ethic, civic_toggle = t.pg, t.tab, t.ethic, t.civic_toggle
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
