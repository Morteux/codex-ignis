"""Planet simulator: living standard of the empire (P20.2)."""
from smoke.common import check


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
