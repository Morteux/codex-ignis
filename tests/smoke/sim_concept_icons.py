"""Planet simulator: game icons of the concepts (ICONS.md) in the header stats, Conditions panel and jobs summary (T2605)."""
from smoke.common import check


async def run(t):
    pg, tab, ethic = t.pg, t.tab, t.ethic
    await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
    await tab("planet")

    # Header stats: housing and amenities game text icons, the short label stays visible.
    head = await pg.evaluate("""()=>['housing','amenities'].map(k=>{const i=document.querySelector(`#planet-stat-${k}-icon`);return [i.getAttribute('src'),i.alt,i.parentElement.innerText.trim()]})""")
    check("T2605: header housing / amenities show the game text icons, label kept",
          head[0][0].endswith("text_icons/tooltip_housing.png") and head[1][0].endswith("text_icons/tooltip_amenities.png")
          and head[0][2].lower() == "housing" and head[1][2].lower() == "amenities", head)

    # Conditions: every row of a concept starts with its icon; the word is the icon tooltip and the label stays.
    rows = await pg.evaluate("""()=>Object.fromEntries([...document.querySelectorAll('#planet-conditions .planet-resource-row[data-condition]')].map(r=>{const i=r.querySelector('img.planet-condition-icon');
        return [r.dataset.condition,i?[i.getAttribute('src').split('StellarisAssets/')[1],i.title,i.alt,r.querySelector('.planet-resource-name').innerText.trim()]:null]}))""")
    expected = {"civilians": "pop_categories/pop_cat_civilian.png", "pops": "text_icons/icon_text_pop.png", "housingProvided": "text_icons/tooltip_housing.png",
                "amenitiesAvailable": "text_icons/tooltip_amenities.png", "happiness": "text_icons/tooltip_happiness.png",
                "stability": "text_icons/tooltip_stability.png", "crime": "text_icons/tooltip_crime.png"}
    check("T2605: Conditions rows show the concept icons (pops, civilians, housing, amenities, happiness, stability, crime)",
          all(rows.get(k) and rows[k][0] == v for k, v in expected.items()) and rows["stability"][1] == "Stability" and rows["stability"][2] == ""
          and rows["stability"][3].startswith("Stability"), rows)

    # Jobs summary: stratum headings with the pop category icons, text kept.
    strata = await pg.evaluate("""()=>[...document.querySelectorAll('#planet-summary .planet-stratum-heading')].map(h=>[h.dataset.stratum,h.querySelector('img')?.getAttribute('src').split('StellarisAssets/')[1],h.innerText.trim()])""")
    check("T2605: stratum headings with the pop category icons",
          [s[1] for s in strata[:3]] == ["pop_categories/pop_cat_ruler.png", "pop_categories/pop_cat_specialist.png", "pop_categories/pop_cat_worker.png"]
          and strata[0][2].lower() == "rulers", strata)

    # Gestalt: amenities without happiness, drone strata, maintenance drones instead of civilians, no happiness rows.
    await tab("empire"); await ethic("Gestalt Consciousness"); await tab("planet"); await pg.wait_for_timeout(200)
    g = await pg.evaluate("""()=>({amen:document.querySelector('#planet-stat-amenities-icon').getAttribute('src'),
        strata:[...document.querySelectorAll('#planet-summary .planet-stratum-heading img')].map(i=>i.getAttribute('src').split('StellarisAssets/')[1]),
        cond:Object.fromEntries([...document.querySelectorAll('#planet-conditions .planet-resource-row[data-condition]')].map(r=>[r.dataset.condition,r.querySelector('img.planet-condition-icon')?.getAttribute('src').split('StellarisAssets/')[1]]))})""")
    check("T2605: gestalt uses the no-happiness amenities icon, drone strata and maintenance drones",
          g["amen"].endswith("text_icons/tooltip_amenities_no_happiness.png") and g["strata"][:3] == ["pop_categories/pop_cat_complex_drone.png"] * 2 + ["pop_categories/pop_cat_simple_drone.png"]
          and g["cond"].get("amenitiesAvailable") == "text_icons/tooltip_amenities_no_happiness.png" and g["cond"].get("civilians") == "pop_categories/pop_cat_maintenance_drone.png"
          and "happiness" not in g["cond"], g)
    await tab("empire"); await ethic("Gestalt Consciousness"); await tab("planet")

    # Other languages: the tooltip of the icon is translated.
    for lang, word in (("es", "Estabilidad"), ("jp", "安定度")):
        await pg.click(f".lang-btn[data-lang={lang}]"); await pg.wait_for_timeout(300)
        title = await pg.evaluate("()=>document.querySelector('#planet-conditions [data-condition=stability] img')?.title")
        check(f"T2605: {lang} Conditions icon tooltip", title == word, title)
    await pg.click(".lang-btn[data-lang=en]"); await pg.wait_for_timeout(300)

    # T2606: Active modifiers rows start with the game icon of their kind (stability effect, pop upkeep, resource bonus).
    mods = await pg.evaluate("""()=>[...document.querySelectorAll('#planet-modifiers .planet-modifier-row')].map(r=>{const i=r.querySelector('.planet-modifier-target img');
        return [r.querySelector('.planet-modifier-target').innerText,i&&i.getAttribute('src').split('StellarisAssets/')[1],i&&i.title,i&&i.alt]})""")
    srcs = [m[1] for m in mods]
    check("T2606: Active modifiers rows show their game icons (stability effect, pop upkeep, resource bonus), text kept",
          "text_icons/tooltip_stability.png" in srcs and "text_icons/pop_modifier.png" in srcs and "modifiers/mod_trade_produces_add.png" in srcs
          and all(m[3] == "" and m[2] for m in mods if m[1]), mods)

    # T2606: catalogue cards: upkeep per resource and build time (4.5.4 game data) pills; the words are tooltip and alt.
    cat = await pg.evaluate("""()=>Object.fromEntries([...document.querySelectorAll('#planet-catalog .planet-catalog-entry[data-building-id=voltaic_yard] .planet-catalog-stat-pill')].map(p=>[p.dataset.stat,[p.querySelector('img').getAttribute('src').split('StellarisAssets/')[1],p.title,p.querySelector('img').alt,p.textContent]]))""")
    check("T2606: building card shows energy upkeep and build time icons with their numbers",
          cat.get("upkeep-energy") == ["modifiers/mod_energy_upkeep_add.png", "Upkeep: 2 Energy Credits", "Upkeep: 2 Energy Credits", "2"]
          and cat.get("buildTime") == ["text_icons/time.png", "Build time: 360 days", "Build time: 360 days", "360 d"], cat)
    await pg.click("#planet-tab-districts"); await pg.wait_for_timeout(200)
    dist = await pg.evaluate("""()=>Object.fromEntries([...document.querySelectorAll('.planet-district-card')].map(c=>[c.dataset.districtGroup,[...c.querySelectorAll('.planet-catalog-stat-pill')].map(p=>p.dataset.stat+':'+p.textContent)]))""")
    check("T2606: district cards show upkeep and build time pills (City District 480 d, resource districts 240 d)",
          dist.get("urban") == ["upkeep-energy:2", "buildTime:480 d"] and dist.get("generator") == ["upkeep-energy:1", "buildTime:240 d"], dist)
    await pg.click("#planet-tab-buildings")

    # T2606: the capital shows housing / amenities (and upkeep, build time from tier II) pills.
    cap0 = await pg.evaluate("()=>[...document.querySelectorAll('.planet-capital-stats .planet-catalog-stat-pill')].map(p=>p.dataset.stat)")
    await pg.click("#planet-capital-upgrade"); await pg.wait_for_timeout(200)
    cap1 = await pg.evaluate("()=>[...document.querySelectorAll('.planet-capital-stats .planet-catalog-stat-pill')].map(p=>[p.dataset.stat,p.querySelector('img').getAttribute('src').split('StellarisAssets/')[1]])")
    await pg.click("#planet-capital-downgrade"); await pg.wait_for_timeout(200)
    check("T2606: capital pills (housing, amenities; upkeep and build time once upgraded)",
          cap0 == ["housing", "amenities"] and [c[0] for c in cap1] == ["housing", "amenities", "upkeep-energy", "buildTime"]
          and cap1[0][1] == "text_icons/tooltip_housing.png" and cap1[3][1] == "text_icons/time.png", [cap0, cap1])

    await pg.click(".lang-btn[data-lang=jp]"); await pg.wait_for_timeout(300)
    title = await pg.evaluate("()=>document.querySelector('#planet-catalog .planet-catalog-entry[data-building-id=voltaic_yard] .planet-catalog-stat-pill[data-stat=buildTime]')?.title")
    check("T2606: jp build time pill tooltip", title == "建造時間: 360日", title)
    await pg.click(".lang-btn[data-lang=en]"); await pg.wait_for_timeout(300)
