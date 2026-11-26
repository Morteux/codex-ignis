"""Planet simulator: total build time of the planet in the fixed planet summary (T2601).

Expected days are the game's base_buildtime of the 4.5.4 extractor data (js/build-time-data.js):
City District 480, Planetary Administration 480, Residential Arcology 600, Unspecialized Arcology 600,
zones 360.
"""
from smoke.common import check


async def run(t):
    pg, body = t.pg, t.body
    panel_text = lambda: pg.evaluate("()=>[...document.querySelectorAll('#planet-build-time-panel > *')].map(e=>e.textContent).join('\\n')")
    total =lambda: pg.evaluate("()=>Number(document.querySelector('#planet-build-time').dataset.totalDays)")
    await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)

    shown = await pg.evaluate("""()=>{const d=document.querySelector('#planet-build-time');return [d.dataset.totalDays,
        document.querySelector('#planet-build-time-total').innerText,document.querySelector('#planet-build-time-summary').getAttribute('aria-label'),
        !!document.querySelector('#planet-build-time-icon').getAttribute('src')]}""")
    check("build time: new planet = 2 City Districts x 480 days, shown in days and years",
          shown[0] == "960" and shown[1] == "960 d (2.7 y)" and "2 years and 240 days" in shown[2] and shown[3], shown)
    panel = await panel_text()
    check("build time: breakdown lists the districts, the capital tier with no game time and the notes",
          "City District ×2" in panel and "960 d" in panel and "No time in the game data" in panel and "Colony Shelter" in panel
          and "Build Queue Capacity" in panel and "No build speed modifier is applied" in panel and "stellaris-pc-4.5.4" in panel, panel)

    await pg.evaluate("()=>document.querySelector('#planet-capital-upgrade').click()"); await pg.wait_for_timeout(200)
    check("build time: upgrading the capital to Planetary Administration adds its 480 days", await total() == 1440, await total())

    await pg.evaluate("()=>{document.querySelectorAll('#planet-catalog details').forEach(d=>d.open=true);[...document.querySelectorAll('#planet-catalog button')].find(b=>/Commercial Zones/.test(b.innerText)).click()}")
    await pg.wait_for_timeout(200)
    expected = await pg.evaluate("async()=>{const m=await import('./js/build-time-data.js');return m.BUILDING_BUILD_TIMES.commercial_zones.days}")
    check("build time: a built building adds its game build time", await total() == 1440 + expected and expected == 360, [await total(), expected])

    # Ecumenopolis: primary Residential Arcology, secondary Unspecialized Arcology, and a chosen specialization (zone).
    await body("Ecumenopolis")
    await pg.evaluate("""()=>{const c=document.querySelectorAll('.planet-district-card')[1];const s=c.querySelector('select');s.value='heavyIndustry';s.dispatchEvent(new Event('change'))}""")
    for _ in range(2):
        await pg.evaluate("""()=>{const c=document.querySelectorAll('.planet-district-card')[1];[...c.querySelectorAll('.planet-count-btn')].find(b=>b.textContent==='+').click()}""")
    await pg.wait_for_timeout(200)
    days = await total()
    lines = await pg.evaluate("()=>[...document.querySelectorAll('#planet-build-time-panel .planet-build-time-list li')].map(li=>[li.dataset.kind,Number(li.dataset.days)])")
    by_kind = {}
    for kind, d in lines:
        by_kind[kind] = by_kind.get(kind, 0) + d
    check("build time: Ecumenopolis = capital 480 + 2 x 600 + 2 x 600 + Heavy Industry zone 360 (+ buildings still active)",
          by_kind.get("capital") == 480 and by_kind.get("district") == 2400 and by_kind.get("specialization") == 360
          and days == sum(d for _, d in lines), (days, lines))
    await body("Continental World")

    # Build speed of the current civics: listed, not applied.
    before = await total()
    await pg.evaluate("async()=>{const m=await import('./js/planet-state.js');m.updatePlanetState({civicIds:['civicFunctionalArchitecture']})}")
    await pg.wait_for_timeout(200)
    panel = await panel_text()
    check("build time: Functional Architecture listed as +15% Infrastructure Build Speed, total unchanged",
          "Functional Architecture: Infrastructure Build Speed +15%" in panel and await total() == before, panel[-500:])
    await pg.evaluate("async()=>{const m=await import('./js/planet-state.js');m.updatePlanetState({civicIds:[]})}")

    # Spanish and Japanese texts.
    for lang, want in (("es", " a)"), ("jp", "年）")):
        await pg.evaluate("(l)=>document.querySelector(`[data-lang=${l}]`)?.click()", lang); await pg.wait_for_timeout(200)
        text = await pg.inner_text("#planet-build-time-total")
        check(f"build time: {lang} compact text", text.endswith(want), text)
    await pg.evaluate("()=>document.querySelector('[data-lang=en]')?.click()"); await pg.wait_for_timeout(200)
