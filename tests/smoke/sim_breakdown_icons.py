"""Planet simulator: game icons in the Net resource breakdown and their legend in the production info panel (T2603)."""
from smoke.common import check


async def run(t):
    pg, tab = t.pg, t.tab
    await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
    await tab("planet")
    # A worker building with energy upkeep and the default districts: Energy has job output, district and building upkeep.
    await pg.evaluate("()=>{document.querySelectorAll('#planet-catalog details').forEach(d=>d.open=true);[...document.querySelectorAll('#planet-catalog button')].find(b=>/Commercial Zones/.test(b.innerText)).click()}")
    await pg.wait_for_timeout(200)
    await pg.evaluate("()=>[...document.querySelectorAll('#planet-production-net .planet-resource-row')].find(r=>/^Energy/.test(r.innerText))?.click()")
    lines = await pg.evaluate("""()=>[...document.querySelectorAll('#planet-production-net .planet-resource-detail-line')].map(l=>{const i=l.querySelector('img.planet-breakdown-icon');
        return {kind:l.dataset.kind||null,title:l.title,text:l.querySelector('span').innerText,src:i&&i.getAttribute('src'),alt:i&&i.alt,aria:l.querySelector('[aria-label]')?.getAttribute('aria-label')||null}})""")
    upkeep = [l for l in lines if l["kind"] == "upkeep"]
    check("breakdown icons: upkeep lines show the energy upkeep icon, a short label, and keep the full name as tooltip and accessible name",
          upkeep and all(l["src"].endswith("modifiers/mod_energy_upkeep_add.png") and l["alt"] == "Upkeep" and l["aria"] == l["title"] and "(" not in l["text"] for l in upkeep)
          and any(l["title"] == "Districts (upkeep)" and l["text"] == "Districts" for l in upkeep), lines)
    totals = [l["text"] for l in lines if not l["kind"]]
    check("breakdown icons: Gross / Costs without the explanation in brackets", "Gross" in totals and "Costs" in totals and not any("sum of" in x for x in totals), totals)

    # The explanation is written once, in the production info panel, as a grouped legend of the icons.
    await pg.evaluate("()=>document.querySelector('#planet-production-info-btn')?.click()"); await pg.wait_for_timeout(200)
    legend = await pg.evaluate("()=>[...document.querySelectorAll('.planet-breakdown-legend li')].map(li=>[li.dataset.kind,li.querySelector('img')?.getAttribute('src')||'',li.innerText])")
    kinds = [k for k, _, _ in legend]
    check("production info: legend of the breakdown icons (upkeep, bonus, efficiency, upkeep change, pop upkeep)",
          kinds == ["upkeep", "bonus", "efficiency", "upkeepChange", "popUpkeep"] and legend[0][1].endswith("mod_energy_upkeep_add.png")
          and legend[4][1].endswith("text_icons/pop_modifier.png") and "Gross is the sum" in await pg.inner_text("#planet-production-info-slot"), legend)
    await pg.evaluate("()=>document.querySelector('#planet-production-info-btn')?.click()")

    # Other languages: kind names and short labels translated.
    for lang, alt, short in (("es", "Mantenimiento", "Distritos"), ("jp", "維持費", "区域")):
        await pg.click(f".lang-btn[data-lang={lang}]"); await pg.wait_for_timeout(300)
        got = await pg.evaluate("()=>[...document.querySelectorAll('#planet-production-net .planet-resource-detail-line[data-kind=upkeep]')].map(l=>[l.querySelector('img').alt,l.querySelector('span').innerText])")
        check(f"breakdown icons: {lang} kind name and short label", [alt, short] in got, got)
    await pg.click(".lang-btn[data-lang=en]"); await pg.wait_for_timeout(300)
