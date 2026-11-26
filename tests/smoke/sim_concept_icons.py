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
