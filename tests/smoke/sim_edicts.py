"""Planet simulator: Edicts tab and edict effects in the economy and the conditions (P18.3, P18.4)."""
from smoke.common import check, approx


async def run(t):
    pg, tab, net, ethic = t.pg, t.tab, t.net, t.ethic
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
