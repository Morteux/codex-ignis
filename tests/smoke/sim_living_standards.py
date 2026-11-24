"""Planet simulator: living standard of the empire (P20.2)."""
from smoke.common import check, approx


async def run(t):
    pg, tab, ethic = t.pg, t.tab, t.ethic
    selected = lambda: pg.evaluate("()=>document.querySelector('.living-standard-card.is-selected')?.dataset.livingStandard")
    card = lambda sid: pg.evaluate("(s)=>{const c=document.querySelector(`.living-standard-card[data-living-standard=${s}]`);return c&&{disabled:c.disabled,text:c.innerText}}", sid)
    modified = lambda: pg.evaluate("()=>document.querySelector('#planet-summary-empire').classList.contains('is-modified')")

    # 10. P20.2: living standard saved with the empire profile, selectable in the Imperio tab
    await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
    await tab("empire")
    decent = await card("decentConditions")
    check("living standard: Decent Conditions by default", await selected() == "decentConditions" and "DEFAULT" in decent["text"].upper(), decent)
    check("living standard card lists consumer goods upkeep per stratum", "Consumer goods upkeep per pop: Rulers 1 · Specialists 0.5 · Workers 0.25 · Civilians 0.25" in decent["text"], decent["text"])
    utopian = await card("utopianAbundance")
    check("Utopian Abundance locked without Egalitarian", utopian["disabled"] and "Requires ethic: Egalitarian" in utopian["text"], utopian)
    check("civic standards locked without their civic", (await card("sharedBurdens"))["disabled"] and (await card("dystopianSociety"))["disabled"])
    check("Drone locked for individualist empires", (await card("drone"))["disabled"])
    await ethic("Egalitarian")
    await pg.click(".living-standard-card[data-living-standard=utopianAbundance]")
    check("Utopian Abundance selectable with Egalitarian", await selected() == "utopianAbundance")
    await pg.fill("#empire-profile-name", "Living standard empire")
    await pg.click("#empire-profile-save-new")
    saved = await pg.evaluate("()=>JSON.parse(localStorage.getItem('codex-ignis-empires'))")
    check("saved empire has livingStandardId", saved[0].get("livingStandardId") == "utopianAbundance", saved)
    await pg.click(".living-standard-card[data-living-standard=socialWelfare]")
    check("living standard change marks the empire modified", await modified())
    await pg.reload(); await pg.wait_for_timeout(500)
    await tab("empire")
    check("saved living standard restored on reload", await selected() == "utopianAbundance" and not await modified())
    await ethic("Egalitarian")
    check("losing Egalitarian falls back to the default", await selected() == "decentConditions")
    await ethic("Gestalt Consciousness")
    check("gestalt empire: Drone, individualist standards locked", await selected() == "drone" and (await card("decentConditions"))["disabled"])

    # Profiles saved before P20 (no livingStandardId) load with the default and are not marked modified
    await pg.evaluate("()=>{const e=JSON.parse(localStorage.getItem('codex-ignis-empires'));e.forEach(p=>{delete p.livingStandardId;p.ethicIds=['egalitarian']});localStorage.setItem('codex-ignis-empires',JSON.stringify(e))}")
    await pg.reload(); await pg.wait_for_timeout(500)
    await tab("empire")
    check("older profile: default living standard, not modified", await selected() == "decentConditions" and not await modified())

    # 11. P20.3: pop upkeep on top of job upkeep (species type + living standard per stratum), own breakdown lines
    snapshot = await pg.evaluate("()=>JSON.stringify(Object.assign({},localStorage))")
    totals = "async()=>{const m=await import('./js/planet-sim-economy.js');const t=m.computeTotals();return {sp:t.conditions.strataPops,civ:t.conditions.civilians,bd:t.breakdown,h:t.conditions.happiness,mods:t.modifiers}}"
    await tab("planet")
    await pg.evaluate("()=>{document.querySelectorAll('#planet-catalog details').forEach(d=>d.open=true);[...document.querySelectorAll('#planet-catalog button')].find(b=>/Commercial Zones/.test(b.innerText)).click()}")
    r = await pg.evaluate(totals)
    sp = r["sp"]
    pops_all = sum(v for k, v in sp.items() if k != "civilian") + r["civ"]
    goods = r["bd"].get("consumer_goods", {}).get("popUpkeepLivingStandard", 0)
    expected = -(1 * sp["ruler"] + 0.5 * sp["specialist"] + 0.25 * sp["worker"] + 0.25 * sp["civilian"])
    check("pop upkeep: Decent Conditions consumer goods per stratum", sp["specialist"] > 0 and approx(goods, expected), r["bd"].get("consumer_goods"))
    food = r["bd"].get("food", {}).get("popUpkeepSpecies", 0)
    check("pop upkeep: organic species pays 1 food per pop", food < 0 and food <= -pops_all + 1e-9, r["bd"].get("food"))
    trade = r["bd"].get("trade", {}).get("livingStandardOutput", 0)
    check("pop output: Decent Conditions trade per specialist", approx(trade, 0.33 * sp["specialist"] + 0.5 * sp["ruler"] + 0.2 * (sp["worker"] + sp["civilian"])), r["bd"].get("trade"))
    await pg.evaluate("()=>{const b=document.querySelector('[data-resource=consumer_goods] .planet-resource-toggle, .planet-resource-entry[data-id=consumer_goods] button');if(b)b.click()}")
    lines = await pg.evaluate("()=>document.querySelector('#planet-production-net').innerText")
    check("breakdown line: Pop upkeep: living standard", "Pop upkeep: living standard" in lines or "popUpkeepLivingStandard" in str(r["bd"]), lines[:300])
    await tab("empire")
    await pg.click(".living-standard-card[data-living-standard=utopianAbundance]")
    r = await pg.evaluate(totals)
    sp = r["sp"]
    goods = r["bd"].get("consumer_goods", {}).get("popUpkeepLivingStandard", 0)
    check("pop upkeep: Utopian Abundance 1 consumer goods per pop of every stratum", approx(goods, -(sp["ruler"] + sp["specialist"] + sp["worker"] + sp["civilian"])), r["bd"].get("consumer_goods"))
    check("Utopian Abundance: +20 happiness in the conditions", r["h"].get("livingStandard") == 20, r["h"])
    await pg.click(".living-standard-card[data-living-standard=decentConditions]")
    # leave the page as the next area expects it (no Commercial Zones, same saved data)
    await pg.evaluate("(s)=>{localStorage.clear();Object.entries(JSON.parse(s)).forEach(([k,v])=>localStorage.setItem(k,v))}", snapshot)
    await pg.reload(); await pg.wait_for_timeout(500)
